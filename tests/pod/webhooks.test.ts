import { describe, expect, it } from "vitest";
import { parseWebhook, validWebhookToken } from "@/lib/pod/webhooks";

describe("webhook authentication", () => {
  it("accepts only the exact secret", () => {
    const secret = "a".repeat(48);
    expect(validWebhookToken(secret, secret)).toBe(true);
    expect(validWebhookToken("a".repeat(47), secret)).toBe(false);
    expect(validWebhookToken(`${"a".repeat(47)}b`, secret)).toBe(false);
    expect(validWebhookToken(null, secret)).toBe(false);
    expect(validWebhookToken(secret, null)).toBe(false);
  });
});

describe("webhook payloads", () => {
  it("reads Prodigi CloudEvents", () => {
    expect(parseWebhook("PRODIGI", { id: "evt_1", type: "com.prodigi.order.status.stage.changed#Complete", data: { order: { id: "ord_9", merchantReference: "CM-1-PRD" } } })).toEqual({ eventId: "evt_1", type: "com.prodigi.order.status.stage.changed#Complete", providerOrderId: "ord_9", reference: "CM-1-PRD" });
  });

  it("reads Gelato order status events", () => {
    expect(parseWebhook("GELATO", { id: "os_1", event: "order_status_updated", orderId: "g-1", orderReferenceId: "CM-1-GEL", fulfillmentStatus: "shipped" })).toEqual({ eventId: "os_1", type: "order_status_updated", providerOrderId: "g-1", reference: "CM-1-GEL" });
  });

  it("builds a stable id for Printful events, which have none", () => {
    const event = { type: "package_shipped", created: 1700000000, data: { order: { id: 77, external_id: "CM-1-PF" }, shipment: { id: 5 } } };
    const parsed = parseWebhook("PRINTFUL", event);
    expect(parsed).toMatchObject({ providerOrderId: "77", reference: "CM-1-PF", type: "package_shipped" });
    expect(parseWebhook("PRINTFUL", event).eventId).toBe(parsed.eventId);
  });

  it("returns nothing usable for unrelated payloads", () => {
    expect(parseWebhook("GELATO", { hello: "world" })).toMatchObject({ providerOrderId: null, reference: null });
  });
});
