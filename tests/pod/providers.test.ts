import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PodApiError, podRequest, redact } from "@/lib/pod/http";
import { alerioAdapter } from "@/lib/pod/providers/alerioprint";
import { gelatoAdapter, parseGelatoOrder } from "@/lib/pod/providers/gelato";
import { parsePrintfulOrder, printfulAdapter } from "@/lib/pod/providers/printful";
import { parseProdigiOrder, prodigiAdapter } from "@/lib/pod/providers/prodigi";
import type { SubmissionInput } from "@/lib/pod/types";

type Call = { url: string; init: RequestInit };
function fakeFetch(responses: { status: number; body: unknown }[]) {
  const calls: Call[] = [];
  const impl = vi.fn(async (url: string, init: RequestInit = {}) => {
    calls.push({ url, init });
    const next = responses.shift() || { status: 200, body: {} };
    return new Response(typeof next.body === "string" ? next.body : JSON.stringify(next.body), { status: next.status, headers: { "content-type": "application/json" } });
  });
  return { impl, calls };
}
const headersOf = (call: Call) => new Headers(call.init.headers);
const bodyOf = (call: Call) => JSON.parse(String(call.init.body));

const input = (mode: "draft" | "live", productRef = "M-MAG-FRI-3X2"): SubmissionInput => ({
  reference: "CM-1-ABC-PRD",
  orderNumber: "CM-1-ABC",
  mode,
  shipping: "standard",
  recipient: { name: "Ana García López", email: "ana@example.com", phone: "600000000", address1: "Calle Mayor 1", address2: null, city: "Madrid", postalCode: "28001", countryCode: "ES", state: null },
  lines: [{ itemId: "item1", productRef, quantity: 2, name: "Imanes", files: [{ area: "default", url: "https://res.cloudinary.com/x/image/upload/a.jpg", source: "customer" }] }],
});

const saved = { ...process.env };
beforeEach(() => {
  Object.assign(process.env, { PRODIGI_API_KEY: "live-key", PRODIGI_SANDBOX_API_KEY: "", GELATO_API_KEY: "gelato-key", PRINTFUL_PRIVATE_TOKEN: "pf-token", PRINTFUL_STORE_ID: "18975889", ALERIOPRINT_API_KEY: "alerio-key", POD_WEBHOOK_SECRET: "s".repeat(32), NEXT_PUBLIC_APP_URL: "https://www.celebra-momentos.com" });
});
afterEach(() => { process.env = { ...saved }; });

describe("HTTP layer", () => {
  it("treats 5xx and 429 as retryable and 4xx as a request problem", async () => {
    const { impl } = fakeFetch([{ status: 503, body: { message: "down" } }, { status: 400, body: { message: "bad sku" } }, { status: 429, body: {} }]);
    await expect(podRequest("GELATO", "https://x", { fetchImpl: impl })).rejects.toMatchObject({ status: 503, retryable: true });
    await expect(podRequest("GELATO", "https://x", { fetchImpl: impl })).rejects.toMatchObject({ status: 400, retryable: false, message: expect.stringContaining("bad sku") });
    await expect(podRequest("GELATO", "https://x", { fetchImpl: impl })).rejects.toMatchObject({ status: 429, retryable: true });
  });

  it("times out slow providers as a retryable error", async () => {
    const slow = vi.fn((_url: string, init?: RequestInit) => new Promise<Response>((_, reject) => init?.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })))));
    await expect(podRequest("PRINTFUL", "https://x", { fetchImpl: slow, timeoutMs: 20 })).rejects.toMatchObject({ retryable: true, message: expect.stringContaining("did not answer") });
  });

  it("redacts credentials and personal data before logging", () => {
    expect(redact({ apiKey: "k", recipient: { email: "a@b.c", address1: "x", city: "Madrid" }, items: [{ sku: "M" }] })).toEqual({ apiKey: "[redacted]", recipient: { email: "[redacted]", address1: "[redacted]", city: "Madrid" }, items: [{ sku: "M" }] });
  });
});

describe("Prodigi", () => {
  it("refuses draft mode without a sandbox key (the configured key is live)", () => {
    expect(prodigiAdapter().configurationProblem("draft")).toMatch(/PRODIGI_SANDBOX_API_KEY/);
    expect(prodigiAdapter().configurationProblem("live")).toBeNull();
  });

  it("creates the order with X-API-Key, an idempotency key and the callback URL", async () => {
    const { impl, calls } = fakeFetch([{ status: 200, body: { outcome: "Created", order: { id: "ord_1", status: { stage: "InProgress" } } } }]);
    const state = await prodigiAdapter(impl).submit(input("live"));
    expect(calls[0].url).toBe("https://api.prodigi.com/v4.0/Orders");
    expect(headersOf(calls[0]).get("X-API-Key")).toBe("live-key");
    const body = bodyOf(calls[0]);
    expect(body).toMatchObject({ idempotencyKey: "CM-1-ABC-PRD", merchantReference: "CM-1-ABC-PRD", shippingMethod: "Standard", items: [{ sku: "M-MAG-FRI-3X2", copies: 2, assets: [{ printArea: "default" }] }] });
    expect(body.callbackUrl).toMatch(/^https:\/\/www\.celebra-momentos\.com\/api\/webhooks\/prodigi\?token=/);
    expect(body.recipient.address).toMatchObject({ countryCode: "ES", postalOrZipCode: "28001", townOrCity: "Madrid" });
    expect(state).toMatchObject({ providerOrderId: "ord_1", status: "SUBMITTED" });
  });

  it("reads production and tracking from the order", () => {
    expect(parseProdigiOrder({ id: "o", status: { stage: "InProgress", details: { inProduction: "InProgress" } } }).status).toBe("IN_PRODUCTION");
    expect(parseProdigiOrder({ id: "o", status: { stage: "Complete" }, shipments: [{ status: "Shipped", carrier: { name: "royalmail", service: "Tracked" }, tracking: { number: "RM1", url: "https://track/RM1" } }] })).toMatchObject({ status: "SHIPPED", trackingNumber: "RM1", trackingUrl: "https://track/RM1", carrier: "royalmail · Tracked" });
    expect(parseProdigiOrder({ id: "o", status: { stage: "Cancelled" } }).status).toBe("CANCELLED");
  });
});

describe("Gelato", () => {
  it("creates drafts in draft mode and real orders in live mode", async () => {
    const { impl, calls } = fakeFetch([{ status: 200, body: { id: "g1", orderType: "draft", fulfillmentStatus: "draft" } }, { status: 200, body: { id: "g2", orderType: "order", fulfillmentStatus: "created" } }]);
    await gelatoAdapter(impl).submit(input("draft", "wall_hanging_poster_x"));
    await gelatoAdapter(impl).submit(input("live", "wall_hanging_poster_x"));
    expect(calls[0].url).toBe("https://order.gelatoapis.com/v4/orders");
    expect(headersOf(calls[0]).get("X-API-KEY")).toBe("gelato-key");
    expect(bodyOf(calls[0])).toMatchObject({ orderType: "draft", orderReferenceId: "CM-1-ABC-PRD", currency: "EUR", items: [{ productUid: "wall_hanging_poster_x", quantity: 2, files: [{ type: "default" }] }], shippingAddress: { firstName: "Ana", lastName: "García López", country: "ES", postCode: "28001" } });
    expect(bodyOf(calls[1]).orderType).toBe("order");
  });

  it("finds an order only by its exact reference", async () => {
    const { impl } = fakeFetch([{ status: 200, body: { orders: [{ id: "other", orderReferenceId: "CM-9" }, { id: "g1", orderReferenceId: "CM-1-ABC-PRD", fulfillmentStatus: "created" }] } }]);
    expect(await gelatoAdapter(impl).findByReference("CM-1-ABC-PRD", "draft")).toMatchObject({ providerOrderId: "g1" });
  });

  it("maps fulfilment statuses and tracking", () => {
    expect(parseGelatoOrder({ id: "g", fulfillmentStatus: "in_production" }).status).toBe("IN_PRODUCTION");
    expect(parseGelatoOrder({ id: "g", fulfillmentStatus: "shipped", items: [{ fulfillments: [{ trackingCode: "T1", trackingUrl: "https://t/1", shipmentMethodName: "DHL" }] }] })).toMatchObject({ status: "SHIPPED", trackingNumber: "T1", carrier: "DHL" });
    expect(parseGelatoOrder({ id: "g", fulfillmentStatus: "delivered" }).status).toBe("DELIVERED");
    expect(parseGelatoOrder({ id: "g", fulfillmentStatus: "canceled" }).status).toBe("CANCELLED");
    expect(parseGelatoOrder({ id: "g", orderType: "draft", fulfillmentStatus: "draft" }).status).toBe("SUBMITTED");
  });
});

describe("Printful", () => {
  it("creates an unconfirmed order in draft mode with the store header", async () => {
    const { impl, calls } = fakeFetch([{ status: 200, body: { result: { id: 77, external_id: "CM-1-ABC-PRD", status: "draft" } } }]);
    const state = await printfulAdapter(impl).submit(input("draft", "11051"));
    expect(calls[0].url).toBe("https://api.printful.com/orders?confirm=false");
    expect(headersOf(calls[0]).get("Authorization")).toBe("Bearer pf-token");
    expect(headersOf(calls[0]).get("X-PF-Store-Id")).toBe("18975889");
    expect(bodyOf(calls[0])).toMatchObject({ external_id: "CM-1-ABC-PRD", shipping: "STANDARD", items: [{ variant_id: 11051, quantity: 2, files: [{ type: "default" }] }], recipient: { country_code: "ES", zip: "28001" } });
    expect(state).toMatchObject({ providerOrderId: "77", status: "SUBMITTED" });
  });

  it("returns the existing order when the external id was already used", async () => {
    const { impl, calls } = fakeFetch([{ status: 409, body: { error: { message: "Order with this external_id already exists" } } }, { status: 200, body: { result: { id: 77, status: "pending" } } }]);
    expect(await printfulAdapter(impl).submit(input("live", "11051"))).toMatchObject({ providerOrderId: "77" });
    expect(calls[1].url).toBe("https://api.printful.com/orders/@CM-1-ABC-PRD");
  });

  it("maps shipments to tracking", () => {
    expect(parsePrintfulOrder({ id: 1, status: "fulfilled", shipments: [{ carrier: "GLS", service: "Standard", tracking_number: "G1", tracking_url: "https://gls/G1" }] })).toMatchObject({ status: "SHIPPED", trackingNumber: "G1", carrier: "GLS · Standard" });
    expect(parsePrintfulOrder({ id: 1, status: "inprocess" }).status).toBe("IN_PRODUCTION");
    expect(parsePrintfulOrder({ id: 1, status: "canceled" }).status).toBe("CANCELLED");
  });
});

describe("AlerioPrint", () => {
  it("is not used in draft mode because it has no test environment", () => {
    expect(alerioAdapter().configurationProblem("draft")).toMatch(/no test mode/);
    expect(alerioAdapter().configurationProblem("live")).toBeNull();
  });

  it("uploads the design, then adds the order with the model id and tracked delivery", async () => {
    const { impl, calls } = fakeFetch([{ status: 200, body: "PNGDATA" }, { status: 200, body: { success: true, data: { id: 901 } } }, { status: 200, body: { success: true, data: { cart: {}, order: { id: 55, name: "CM-1-ABC-PRD", status: { name: "Cart" } } } } }]);
    const state = await alerioAdapter(impl).submit(input("live", "102:4321"));
    expect(calls[1].url).toBe("https://create.alerioprint.com/backend/api/external/designs");
    expect(headersOf(calls[1]).get("X-API-KEY")).toBe("alerio-key");
    expect((calls[1].init.body as FormData).get("productId")).toBe("102");
    expect(bodyOf(calls[2])).toMatchObject({ orderName: "CM-1-ABC-PRD", orders: [{ productId: 102, productAssetId: 4321, designId: 901, count: 2 }], deliveryData: { country: "ES", zipCode: "28001", deliveryOption: 2 } });
    expect(state).toMatchObject({ providerOrderId: "55", status: "SUBMITTED" });
  });

  it("treats a duplicate order name as already sent", async () => {
    const { impl } = fakeFetch([{ status: 200, body: "PNG" }, { status: 200, body: { success: true, data: { id: 1 } } }, { status: 409, body: { success: false, message: "exists" } }]);
    expect(await alerioAdapter(impl).submit(input("live", "102:1"))).toMatchObject({ status: "SUBMITTED", providerStatus: "already in Alerio cart" });
  });

  it("surfaces a provider error as PodApiError", async () => {
    const { impl } = fakeFetch([{ status: 200, body: "PNG" }, { status: 400, body: { success: false, message: "Wrong items" } }]);
    await expect(alerioAdapter(impl).submit(input("live", "102:1"))).rejects.toBeInstanceOf(PodApiError);
  });
});
