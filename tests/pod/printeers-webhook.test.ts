import { createHmac } from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const events = new Set<string>();
let fulfillments: { id: string; providerOrderId: string; status: string; mode: string }[] = [];
const sync = vi.fn(async (_id: string) => ({ ok: true, status: "IN_PRODUCTION" }));
let findManyArgs: unknown = null;

vi.mock("@/lib/pod/fulfillment", () => ({ syncFulfillment: (id: string) => sync(id) }));
vi.mock("@/lib/server/prisma", () => ({
  prisma: {
    podWebhookEvent: {
      create: async ({ data }: { data: { id: string } }) => { if (events.has(data.id)) { const { Prisma } = await import("@prisma/client"); throw new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "x" }); } events.add(data.id); },
      delete: async ({ where }: { where: { id: string } }) => { events.delete(where.id); },
    },
    podFulfillment: {
      findMany: async (args: unknown) => { findManyArgs = args; return fulfillments.filter((item) => ["SUBMITTED", "IN_PRODUCTION"].includes(item.status)).map(({ id }) => ({ id })); },
      findFirst: async ({ where }: { where: { providerOrderId: { in: string[] }; mode: string } }) => fulfillments.find((item) => where.providerOrderId.in.includes(item.providerOrderId) && item.mode === where.mode) ?? null,
    },
  },
}));

import { handlePrinteersCallback, handlePrinteersWebhook } from "@/lib/pod/printeers/webhook";

const key = Buffer.from("printeers-test-signing-key-32byt");
const secret = `whsec_${key.toString("base64")}`;
const sign = (id: string, timestamp: string, body: string) => `v1,${createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64")}`;
const signed = (id: string, body: string, patch: { signature?: string; timestamp?: string } = {}) => {
  const timestamp = patch.timestamp ?? String(Math.floor(Date.now() / 1000));
  return new Request("https://shop.test/api/webhooks/printeers", { method: "POST", body, headers: { "webhook-id": id, "webhook-timestamp": timestamp, "webhook-signature": patch.signature ?? sign(id, timestamp, body) } });
};
const event = JSON.stringify({ reference: "Event_1", kind: "shipment.created", subject: { shipment: { reference: "Shipment_1" } } });

beforeEach(() => {
  events.clear(); sync.mockClear(); sync.mockResolvedValue({ ok: true, status: "IN_PRODUCTION" }); findManyArgs = null;
  fulfillments = [{ id: "f1", providerOrderId: "TESTCODE-1", status: "SUBMITTED", mode: "draft" }, { id: "f2", providerOrderId: "TESTCODE-2", status: "SHIPPED", mode: "draft" }];
  Object.assign(process.env, { POD_ORDER_MODE: "draft", PRINTEERS_TEST_WEBHOOK_SECRET: secret, POD_WEBHOOK_SECRET: "t".repeat(32) });
});

describe("signed Printeers webhooks (Standard Webhooks)", () => {
  it("rejects a missing, forged or stale signature without touching anything", async () => {
    expect((await handlePrinteersWebhook(new Request("https://shop.test/x", { method: "POST", body: event }))).status).toBe(401);
    expect((await handlePrinteersWebhook(signed("Event_1", event, { signature: "v1,AAAA" }))).status).toBe(401);
    expect((await handlePrinteersWebhook(signed("Event_1", event, { timestamp: String(Math.floor(Date.now() / 1000) - 3600) }))).status).toBe(401);
    expect(sync).not.toHaveBeenCalled();
    expect(events.size).toBe(0);
  });

  it("accepts a valid event once, refreshing only the open Printeers orders of the current environment", async () => {
    const first = await handlePrinteersWebhook(signed("Event_1", event));
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({ received: true, refreshed: 1 });
    expect(sync.mock.calls.map((call) => call[0])).toEqual(["f1"]);
    expect(findManyArgs).toMatchObject({ where: { provider: "PRINTEERS", mode: "draft" }, take: 25 });
  });

  it("treats a repeated delivery (same webhook-id) as already processed", async () => {
    await handlePrinteersWebhook(signed("Event_1", event));
    const again = await handlePrinteersWebhook(signed("Event_1", event));
    expect(await again.json()).toMatchObject({ duplicate: true });
    expect(sync).toHaveBeenCalledTimes(1);
  });

  it("answers 503 and forgets the event when an order cannot be re-read, so Printeers retries", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    sync.mockResolvedValueOnce({ ok: false, status: "SUBMITTED" } as never);
    expect((await handlePrinteersWebhook(signed("Event_2", event))).status).toBe(503);
    expect(events.has("PRINTEERS:Event_2")).toBe(false);
    expect((await handlePrinteersWebhook(signed("Event_2", event))).status).toBe(200);
  });
});

describe("legacy Printeers order-updated callback (unsigned GET)", () => {
  const callback = (query: string) => new Request(`https://shop.test/api/webhooks/printeers?${query}`);
  const token = "t".repeat(32);

  it("refuses a wrong token; without a token it is only a hint (the order is re-read from the API)", async () => {
    expect((await handlePrinteersCallback(callback(`token=wrong&order_reference=TESTCODE-1&environment=test`))).status).toBe(401);
    expect(sync).not.toHaveBeenCalled();
    const response = await handlePrinteersCallback(callback("order_reference=TESTCODE-1&environment=test"));
    expect(await response.json()).toMatchObject({ received: true, matched: true });
    expect(sync.mock.calls.map((item) => item[0])).toEqual(["f1"]);
  });

  it("re-reads the order it names, as many times as it is called (idempotent)", async () => {
    for (let call = 0; call < 2; call += 1) {
      const response = await handlePrinteersCallback(callback(`token=${token}&order_reference=TESTCODE-1&environment=test&store_code=TESTCODE&custom_reference=P1`));
      expect(await response.json()).toMatchObject({ received: true, matched: true });
    }
    expect(sync.mock.calls.map((item) => item[0])).toEqual(["f1", "f1"]);
  });

  it("acknowledges unknown orders and other environments without syncing, and rejects odd references", async () => {
    expect(await (await handlePrinteersCallback(callback(`token=${token}&order_reference=OTHER-9&environment=test`))).json()).toMatchObject({ matched: false });
    expect(await (await handlePrinteersCallback(callback(`token=${token}&order_reference=TESTCODE-1&environment=prod`))).json()).toMatchObject({ ignored: "other environment" });
    expect((await handlePrinteersCallback(callback(`token=${token}&order_reference=../../x`))).status).toBe(400);
    expect(sync).not.toHaveBeenCalled();
  });

  it("answers 503 when the order cannot be re-read, so Printeers retries in 5 minutes", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    sync.mockResolvedValueOnce({ ok: false, status: "SUBMITTED", message: "down" } as never);
    expect((await handlePrinteersCallback(callback(`token=${token}&order_reference=TESTCODE-1&environment=test`))).status).toBe(503);
  });
});
