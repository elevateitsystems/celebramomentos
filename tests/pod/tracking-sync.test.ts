import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The whole tracking path with an in-memory database: a shop's webhook → our handler → the shop's API (here a
// recorded response) → the adapter → the merged tracking saved on the print order → the order's status.
const db = vi.hoisted(() => {
  type Row = Record<string, any>;
  const state = { orders: new Map<string, Row>(), fulfillments: new Map<string, Row>(), events: new Set<string>() };
  const withItems = (row: Row) => ({ ...row, items: row.items.map((item: Row) => ({ id: item.id, podProductRef: item.podProductRef })) });
  const prisma = {
    order: {
      findUnique: async ({ where }: Row) => { const order = state.orders.get(where.id); return order ? { ...order, fulfillments: [...state.fulfillments.values()].filter((row) => row.orderId === order.id) } : null; },
      update: async ({ where, data }: Row) => Object.assign(state.orders.get(where.id)!, data),
    },
    podFulfillment: {
      findFirst: async ({ where }: Row) => [...state.fulfillments.values()].find((row) => row.provider === where.provider && where.OR.some((condition: Row) => Object.entries(condition).every(([key, value]) => row[key] === value))) ?? null,
      findUnique: async ({ where }: Row) => state.fulfillments.get(where.id) ?? null,
      findUniqueOrThrow: async ({ where }: Row) => withItems(state.fulfillments.get(where.id)!),
      update: async ({ where, data }: Row) => Object.assign(state.fulfillments.get(where.id)!, data, { updatedAt: new Date() }),
    },
    podWebhookEvent: {
      create: async ({ data }: Row) => {
        if (state.events.has(data.id)) { const { Prisma } = await import("@prisma/client"); throw new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "6" }); }
        state.events.add(data.id); return data;
      },
      delete: async ({ where }: Row) => { state.events.delete(where.id); return {}; },
    },
  };
  return { state, prisma };
});
vi.mock("@/lib/server/prisma", () => ({ prisma: db.prisma }));

import { handlePodWebhook } from "@/lib/pod/webhooks";
import { syncFulfillment } from "@/lib/pod/fulfillment";
import { readTracking } from "@/lib/pod/tracking";
import { customerTracking, serializeOrder } from "@/lib/server/orders";

// Real Prodigi sandbox response (GET /v4.0/Orders/ord_1198751, 2026-11-11, recipient removed).
const PRODIGI_ORDER = {
  id: "ord_1198751", merchantReference: "CM-1-PRD",
  status: { stage: "Complete", issues: [], details: { downloadAssets: "Complete", printReadyAssetsPrepared: "Complete", allocateProductionLocation: "Complete", inProduction: "Complete", shipping: "Complete" } },
  shipments: [{ id: "shp_755964", dispatchDate: "2026-11-11T06:02:02.26Z", carrier: { name: "Guernsey Post", service: "Guernsey Post International" }, fulfillmentLocation: { countryCode: "GB", labCode: "uk7" }, tracking: { number: "PH000000000GB", url: "https://www.royalmail.com/portal/rm/track?trackNumber=PH000000000GB" }, items: [{ itemId: "ori_1685822" }], status: "Shipped" }],
  items: [{ id: "ori_1685822", merchantReference: "item1" }],
};

let apiCalls: string[] = [];
const saved = { ...process.env };
beforeEach(() => {
  Object.assign(process.env, { PRODIGI_SANDBOX_API_KEY: "sandbox-key" });
  delete process.env.POD_ORDER_MODE; delete process.env.POD_WEBHOOK_SECRET;
  db.state.orders.clear(); db.state.fulfillments.clear(); db.state.events.clear();
  db.state.orders.set("o1", { id: "o1", number: "CM-1", status: "PROCESSING", email: "a@b.c", totalCents: 2000, createdAt: new Date(), shippingAddress: {}, items: [{ name: "Póster", quantity: 1 }] });
  db.state.fulfillments.set("f1", { id: "f1", orderId: "o1", provider: "PRODIGI", mode: "draft", status: "IN_PRODUCTION", reference: "CM-1-PRD", providerOrderId: "ord_1198751", providerStatus: "InProgress", carrier: null, trackingNumber: null, trackingUrl: null, tracking: null, shippedAt: null, deliveredAt: null, lastSyncedAt: null, items: [{ id: "item1", podProductRef: "GLOBAL-FAP-8x10" }] });
  apiCalls = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string) => { apiCalls.push(String(url)); return new Response(JSON.stringify({ order: PRODIGI_ORDER }), { status: 200 }); }));
});
afterEach(() => { process.env = { ...saved }; vi.unstubAllGlobals(); });

// Prodigi callback (CloudEvents), as the v4 docs describe it.
const callback = (id: string) => new Request("https://www.celebra-momentos.com/api/webhooks/prodigi", { method: "POST", body: JSON.stringify({ specversion: "1.0", type: "com.prodigi.order.shipments.shipment#Complete", source: "https://api.sandbox.prodigi.com/v4.0/Orders/", id, subject: "ord_1198751", datacontenttype: "application/json", data: { order: { id: "ord_1198751", merchantReference: "CM-1-PRD" } } }) });

describe("a Prodigi shipment webhook", () => {
  it("reads the order from the API and saves the shipment, dates, history and order status", async () => {
    const response = await handlePodWebhook("PRODIGI", callback("evt_1"));
    expect(await response.json()).toMatchObject({ matched: true, status: "SHIPPED" });
    expect(apiCalls).toEqual(["https://api.sandbox.prodigi.com/v4.0/Orders/ord_1198751"]);
    const row = db.state.fulfillments.get("f1")!;
    expect(row).toMatchObject({ status: "SHIPPED", providerStatus: "Complete", trackingNumber: "PH000000000GB", carrier: "Guernsey Post · Guernsey Post International" });
    // The lab's dispatch date, not the time we happened to read it.
    expect(row.shippedAt.toISOString()).toBe("2026-11-11T06:02:02.260Z");
    const tracking = readTracking(row.tracking);
    expect(tracking.shipments).toHaveLength(1);
    expect(tracking.shipments[0]).toMatchObject({ id: "shp_755964", items: [{ itemId: "item1" }] });
    expect(tracking.history!.map((event) => event.description)).toEqual(["Prodigi: Complete"]);
    expect(db.state.orders.get("o1")!.status).toBe("SHIPPED");
  });

  it("the same event delivered twice is handled once; a scheduled check adds no duplicate events", async () => {
    // With a token the event is trusted (not throttled), so the event-id check is what stops the repeat.
    process.env.POD_WEBHOOK_SECRET = "t".repeat(32);
    const signed = (id: string) => new Request(`${callback(id).url}?token=${"t".repeat(32)}`, { method: "POST", body: callback(id).body, duplex: "half" } as RequestInit);
    await handlePodWebhook("PRODIGI", signed("evt_2"));
    const first = JSON.stringify(db.state.fulfillments.get("f1")!.tracking);
    expect(await (await handlePodWebhook("PRODIGI", signed("evt_2"))).json()).toMatchObject({ duplicate: true });
    expect(apiCalls).toHaveLength(1);
    // Without a token, a repeat within a minute is throttled before anything is read.
    delete process.env.POD_WEBHOOK_SECRET;
    expect(await (await handlePodWebhook("PRODIGI", callback("evt_9"))).json()).toMatchObject({ throttled: true });
    expect(apiCalls).toHaveLength(1);
    await syncFulfillment("f1");
    expect(apiCalls).toHaveLength(2);
    expect(JSON.stringify(db.state.fulfillments.get("f1")!.tracking)).toBe(first);
  });

  it("a failed API read answers 503 (the shop retries) and lets the same event through again", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("down", { status: 502 })));
    expect((await handlePodWebhook("PRODIGI", callback("evt_3"))).status).toBe(503);
    expect(db.state.events.has("PRODIGI:evt_3")).toBe(false);
    expect(db.state.fulfillments.get("f1")!.status).toBe("IN_PRODUCTION");
  });

  it("the customer sees the parcel and the shipped stage", async () => {
    await handlePodWebhook("PRODIGI", callback("evt_4"));
    const prints = [...db.state.fulfillments.values()];
    expect(customerTracking(prints as never)).toEqual([{ carrier: "Guernsey Post", number: "PH000000000GB", url: "https://www.royalmail.com/portal/rm/track?trackNumber=PH000000000GB", status: "shipped", shippedAt: "2026-11-11T06:02:02.260Z", deliveredAt: null, latestEvent: { at: "2026-11-11T06:02:02.260Z", description: "Dispatched by the Prodigi lab uk7" } }]);
    const order = serializeOrder({ ...db.state.orders.get("o1")!, fulfillments: prints } as never, "draft");
    expect(order).toMatchObject({ stage: "shipped", status: "Enviado", estimatedDelivery: null, deliveredAt: null });
  });
});

describe("events that are not about one of our orders", () => {
  it("a Printful test or stock event is acknowledged without reading anything", async () => {
    const response = await handlePodWebhook("PRINTFUL", new Request("https://www.celebra-momentos.com/api/webhooks/printful", { method: "POST", body: JSON.stringify({ type: "stock_updated", created: 1794300000, retries: 0, store: 1, data: {} }) }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ matched: false, ignored: "stock_updated" });
    expect(apiCalls).toEqual([]);
  });

  it("the Printful simulator's sample order (not ours) is acknowledged", async () => {
    const response = await handlePodWebhook("PRINTFUL", new Request("https://www.celebra-momentos.com/api/webhooks/printful", { method: "POST", body: JSON.stringify({ type: "package_shipped", created: 1794300000, retries: 0, store: 1, data: { shipment: { id: 10, tracking_number: "0" }, order: { id: 13, external_id: "4235234213" } } }) }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ matched: false });
    expect(apiCalls).toEqual([]);
  });
});
