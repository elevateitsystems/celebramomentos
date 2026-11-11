import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Database and status sync are mocked: these tests cover what the webhook handler and the adapters send.
const db = vi.hoisted(() => ({ fulfillment: null as null | { id: string; lastSyncedAt: Date | null }, events: new Set<string>(), syncs: 0 }));
vi.mock("@/lib/server/prisma", () => ({ prisma: {
  podFulfillment: { findFirst: async () => db.fulfillment },
  podWebhookEvent: {
    create: async ({ data }: { data: { id: string } }) => { if (db.events.has(data.id)) { const { Prisma } = await import("@prisma/client"); throw new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "6" }); } db.events.add(data.id); return data; },
    delete: async () => ({}),
  },
} }));
vi.mock("@/lib/pod/fulfillment", () => ({ logPod: () => undefined, syncFulfillment: async () => { db.syncs += 1; return { ok: true, status: "SHIPPED" }; } }));

import { handlePodWebhook } from "@/lib/pod/webhooks";
import { gelatoAdapter } from "@/lib/pod/providers/gelato";
import { printeersAdapter } from "@/lib/pod/providers/printeers";
import { printfulAdapter } from "@/lib/pod/providers/printful";
import { prodigiAdapter } from "@/lib/pod/providers/prodigi";

type Call = { url: string; init: RequestInit };
function fakeFetch(responses: { status: number; body: unknown }[]) {
  const calls: Call[] = [];
  const impl = vi.fn(async (url: string, init: RequestInit = {}) => { calls.push({ url, init }); const next = responses.shift() || { status: 200, body: {} }; return new Response(JSON.stringify(next.body), { status: next.status }); });
  return { impl, calls };
}

const saved = { ...process.env };
beforeEach(() => {
  Object.assign(process.env, { POD_WEBHOOK_SECRET: "s".repeat(32), PRODIGI_SANDBOX_API_KEY: "sb", GELATO_API_KEY: "g", PRINTFUL_PRIVATE_TOKEN: "pf", PRINTEERS_V1_TEST_API_KEY: "k", PRINTEERS_V1_TEST_PARTNER_CODE: "TESTCODE" });
  db.fulfillment = { id: "f1", lastSyncedAt: null }; db.events.clear(); db.syncs = 0;
});
afterEach(() => { process.env = { ...saved }; });

const event = (id: string) => JSON.stringify({ id, event: "order_status_updated", orderId: "g-1", orderReferenceId: "CM-1-GEL" });
const post = (query: string, body: string) => handlePodWebhook("GELATO", new Request(`https://www.celebra-momentos.com/api/webhooks/gelato${query}`, { method: "POST", body }));

describe("webhooks registered without a token (Gelato / Prodigi dashboards)", () => {
  it("accept the event as a hint and re-read the order", async () => {
    const response = await post("", event("e1"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ matched: true, status: "SHIPPED" });
    expect(db.syncs).toBe(1);
  });

  it("re-read an order at most once a minute", async () => {
    db.fulfillment = { id: "f1", lastSyncedAt: new Date(Date.now() - 10_000) };
    expect(await (await post("", event("e2"))).json()).toMatchObject({ throttled: true });
    expect(db.syncs).toBe(0);
  });

  it("ignore orders that are not from this site and repeated events", async () => {
    db.fulfillment = null;
    expect(await (await post("", event("e3"))).json()).toMatchObject({ matched: false });
    db.fulfillment = { id: "f1", lastSyncedAt: null };
    await post("", event("e4"));
    expect(await (await post("", event("e4"))).json()).toMatchObject({ duplicate: true });
    expect(db.syncs).toBe(1);
  });

  it("still refuse a wrong token, and never throttle the right one", async () => {
    expect((await post("?token=wrong", event("e5"))).status).toBe(401);
    db.fulfillment = { id: "f1", lastSyncedAt: new Date() };
    expect(await (await post(`?token=${"s".repeat(32)}`, event("e6"))).json()).toMatchObject({ status: "SHIPPED" });
  });
});

describe("cancelling at each print shop", () => {
  it("Prodigi: POST /Orders/{id}/actions/cancel, refused when Prodigi does not cancel", async () => {
    const { impl, calls } = fakeFetch([{ status: 200, body: { outcome: "Cancelled", order: { id: "ord_1", status: { stage: "Cancelled" } } } }, { status: 200, body: { outcome: "FailedToCancel", order: { id: "ord_1", status: { stage: "InProgress" } } } }]);
    expect(await prodigiAdapter(impl).cancel("ord_1", "draft")).toMatchObject({ status: "CANCELLED" });
    expect(calls[0]).toMatchObject({ url: "https://api.sandbox.prodigi.com/v4.0/Orders/ord_1/actions/cancel", init: { method: "POST" } });
    await expect(prodigiAdapter(impl).cancel("ord_1", "draft")).rejects.toThrow(/FailedToCancel/);
  });

  it("Gelato: deletes a draft, cancels a real order with :cancel", async () => {
    const draft = fakeFetch([{ status: 200, body: { id: "g1", orderType: "draft" } }, { status: 200, body: {} }]);
    expect(await gelatoAdapter(draft.impl).cancel("g1", "draft")).toMatchObject({ status: "CANCELLED", providerStatus: "draft deleted" });
    expect(draft.calls[1]).toMatchObject({ url: "https://order.gelatoapis.com/v4/orders/g1", init: { method: "DELETE" } });
    const real = fakeFetch([{ status: 200, body: { id: "g2", orderType: "order", fulfillmentStatus: "created" } }, { status: 200, body: {} }, { status: 200, body: { id: "g2", orderType: "order", fulfillmentStatus: "canceled" } }]);
    expect(await gelatoAdapter(real.impl).cancel("g2", "live")).toMatchObject({ status: "CANCELLED" });
    expect(real.calls[1]).toMatchObject({ url: "https://order.gelatoapis.com/v4/orders/g2:cancel", init: { method: "POST" } });
  });

  it("Printful: DELETE /orders/{id}", async () => {
    const { impl, calls } = fakeFetch([{ status: 200, body: { result: { id: 77, status: "canceled" } } }]);
    expect(await printfulAdapter(impl).cancel("77", "draft")).toMatchObject({ status: "CANCELLED" });
    expect(calls[0]).toMatchObject({ url: "https://api.printful.com/orders/77", init: { method: "DELETE" } });
  });

  it("Printeers: cancel-all-lines, then confirms the order is cancelled", async () => {
    const { impl, calls } = fakeFetch([{ status: 200, body: {} }, { status: 200, body: { reference: "TESTCODE-7", status: "closed", status_code: "canceled" } }]);
    expect(await printeersAdapter(impl).cancel("TESTCODE-7", "draft")).toMatchObject({ status: "CANCELLED" });
    expect(calls[0].url).toBe("https://api.test-printeers.com/orders/TESTCODE-7/cancel-all-lines");
  });
});
