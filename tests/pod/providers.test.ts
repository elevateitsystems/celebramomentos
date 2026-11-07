import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PodApiError, podRequest, redact } from "@/lib/pod/http";
import { INACTIVE_PROVIDER, podAdapter } from "@/lib/pod/providers";
import { internationalPhone, printeersAdapter, printeersIdentifier, printeersStatus, splitName, splitStreet } from "@/lib/pod/providers/printeers";
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
  Object.assign(process.env, { PRODIGI_API_KEY: "live-key", PRODIGI_SANDBOX_API_KEY: "", GELATO_API_KEY: "gelato-key", PRINTFUL_PRIVATE_TOKEN: "pf-token", PRINTFUL_STORE_ID: "18975889", PRINTEERS_V1_TEST_API_KEY: "prt-test-key", PRINTEERS_V1_TEST_PARTNER_CODE: "TESTCODE", PRINTEERS_V1_API_KEY: "prt-live-key", PRINTEERS_V1_PARTNER_CODE: "LIVECODE", POD_WEBHOOK_SECRET: "s".repeat(32), NEXT_PUBLIC_APP_URL: "https://www.celebra-momentos.com" });
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

describe("print shops that are no longer used", () => {
  it("never send or sync an order kept from them", async () => {
    const kept = podAdapter("ALERIO_PRINT");
    expect(kept.configurationProblem("draft")).toBe(INACTIVE_PROVIDER);
    expect(kept.configurationProblem("live")).toBe(INACTIVE_PROVIDER);
    await expect(kept.submit(input("live", "x"))).rejects.toThrow(/no longer used/);
    expect(await kept.fetchStatus("1", "live")).toBeNull();
  });
});

describe("Printeers (API v1)", () => {
  const caseInput = (mode: "draft" | "live") => ({ ...input(mode, "B61010000"), reference: "CM-1793533878346-8B7AC74C-PRT", recipient: { ...input(mode).recipient, address1: "Calle de la Paz, 12, 3ºB", phone: "600 000 000" } });
  const identifier = printeersIdentifier("CM-1793533878346-8B7AC74C-PRT");
  const order = (patch: Record<string, unknown> = {}) => ({ reference: "TESTCODE-7", custom_reference: identifier, status: "open", status_code: "pending", status_human_readable: "Created", shipments: [], ...patch });

  it("needs a partner code and an API key for the environment in use", () => {
    expect(printeersAdapter().configurationProblem("draft")).toBeNull();
    delete process.env.PRINTEERS_V1_TEST_PARTNER_CODE;
    expect(printeersAdapter().configurationProblem("draft")).toMatch(/PRINTEERS_V1_TEST_PARTNER_CODE is not set \(Printeers test environment, API v1\)/);
    delete process.env.PRINTEERS_V1_API_KEY;
    expect(printeersAdapter().configurationProblem("live")).toMatch(/PRINTEERS_V1_API_KEY is not set/);
  });

  it("in draft mode uploads the print file and creates a dropship order in the test environment", async () => {
    const { impl, calls } = fakeFetch([{ status: 200, body: "JPEGBYTES" }, { status: 201, body: { reference: "TESTCODE-img-1" } }, { status: 201, body: { reference: "TESTCODE-7" } }]);
    const state = await printeersAdapter(impl).submit(caseInput("draft"));
    expect(calls[0].url).toBe("https://res.cloudinary.com/x/image/upload/a.jpg");
    expect(calls[1].url).toBe("https://api.test-printeers.com/images");
    expect(headersOf(calls[1]).get("X-IPP-PARTNERCODE")).toBe("TESTCODE");
    expect(headersOf(calls[1]).get("X-IPP-APIKEY")).toBe("prt-test-key");
    expect(headersOf(calls[1]).get("X-Printeers-Secret-Key")).toBeNull();
    expect(bodyOf(calls[1])).toEqual({ image: Buffer.from("JPEGBYTES").toString("base64") });
    expect(calls[2].url).toBe("https://api.test-printeers.com/orders");
    expect(bodyOf(calls[2])).toEqual({
      shipping_kind: "dropship",
      partner_reference: identifier,
      address: { company: "", firstname: "Ana", lastname: "García López", streetname: "Calle de la Paz", housenumber: "12", housenumber_addition: "3ºB", additional_info: "", state: "", zipcode: "28001", city: "Madrid", country_code: "ES", phonenumber: "+34600000000", email: "ana@example.com" },
      shipping_minimal_level: "tracked",
      lines: [{ item_sku: "B61010000", image_reference: "TESTCODE-img-1", quantity: 2 }],
    });
    expect(state).toMatchObject({ providerOrderId: "TESTCODE-7", status: "SUBMITTED" });
  });

  it("uses production, its own partner code and key, in live mode", async () => {
    const { impl, calls } = fakeFetch([{ status: 200, body: "JPEG" }, { status: 201, body: { reference: "LIVECODE-img-1" } }, { status: 201, body: { reference: "LIVECODE-2" } }]);
    await printeersAdapter(impl).submit(caseInput("live"));
    expect(calls[2].url).toBe("https://api.printeers.com/orders");
    expect(headersOf(calls[2]).get("X-IPP-PARTNERCODE")).toBe("LIVECODE");
    expect(headersOf(calls[2]).get("X-IPP-APIKEY")).toBe("prt-live-key");
  });

  it("asks for premium shipping on express orders and honours PRINTEERS_SHIPPING_LEVEL", async () => {
    const express = fakeFetch([{ status: 200, body: "JPEG" }, { status: 201, body: { reference: "i" } }, { status: 201, body: { reference: "TESTCODE-8" } }]);
    await printeersAdapter(express.impl).submit({ ...caseInput("draft"), shipping: "express" });
    expect(bodyOf(express.calls[2]).shipping_minimal_level).toBe("premium");
    process.env.PRINTEERS_SHIPPING_LEVEL = "basic";
    const basic = fakeFetch([{ status: 200, body: "JPEG" }, { status: 201, body: { reference: "i" } }, { status: 201, body: { reference: "TESTCODE-9" } }]);
    await printeersAdapter(basic.impl).submit(caseInput("draft"));
    expect(bodyOf(basic.calls[2]).shipping_minimal_level).toBe("normal");
  });

  it("returns the existing order when the reference was already used (no duplicate)", async () => {
    // Printeers answers HTTP 200 with errorCode for this (checked on the test API on 2026-11-07).
    const { impl, calls } = fakeFetch([
      { status: 200, body: "JPEG" }, { status: 201, body: { reference: "TESTCODE-img-1" } },
      { status: 200, body: { errorMessage: "custom identifier is not unique", errorCode: "non_unique_partner_reference" } },
      { status: 200, body: order({ status_code: "in_production" }) },
    ]);
    const state = await printeersAdapter(impl).submit(caseInput("draft"));
    expect(calls[3].url).toBe(`https://api.test-printeers.com/orders/by-partner-reference/${identifier}`);
    expect(state).toMatchObject({ providerOrderId: "TESTCODE-7", status: "IN_PRODUCTION" });
    expect(calls.filter((call) => call.init.method === "POST" && call.url.endsWith("/orders"))).toHaveLength(1);
  });

  it("never mistakes a rejected order (HTTP 200 + errorCode) for a created one", async () => {
    const { impl } = fakeFetch([{ status: 200, body: "JPEG" }, { status: 201, body: { reference: "TESTCODE-img-1" } }, { status: 200, body: { errorMessage: "product not found by item sku", errorCode: "invalid_item_sku" } }]);
    await expect(printeersAdapter(impl).submit(caseInput("draft"))).rejects.toMatchObject({ retryable: false, message: expect.stringContaining("invalid_item_sku") });
    const shutdown = fakeFetch([{ status: 200, body: "JPEG" }, { status: 200, body: { errorMessage: "shutting down", errorCode: "system_shutting_down" } }]);
    await expect(printeersAdapter(shutdown.impl).submit(caseInput("draft"))).rejects.toMatchObject({ retryable: true });
  });

  it("looks an order up by its reference; an unknown one is null (HTTP 200 + reference_not_found)", async () => {
    const found = fakeFetch([{ status: 200, body: order() }]);
    expect(await printeersAdapter(found.impl).findByReference("CM-1793533878346-8B7AC74C-PRT", "draft")).toMatchObject({ providerOrderId: "TESTCODE-7" });
    const unknown = fakeFetch([{ status: 200, body: { errorMessage: "Provided reference does not match an order.", errorCode: "reference_not_found" } }]);
    expect(await printeersAdapter(unknown.impl).findByReference("CM-1793533878346-8B7AC74C-PRT", "draft")).toBeNull();
  });

  it("reads status and tracking from the order's latest shipment", async () => {
    // The shipment shape follows the v1 OpenAPI spec; the test environment never ships, so it has not been seen live.
    const { impl, calls } = fakeFetch([{ status: 200, body: order({ status: "closed", status_code: "completed", status_human_readable: "Fully shipped", shipments: [
      { shipper: "B2C", shipping_method: "ParcelPlus", track_and_trace_code: "OLD1", track_and_trace_url: "https://track.example/OLD1" },
      { shipper: "PostNL", shipping_method: "ParcelPremium", track_and_trace_code: "3S123", track_and_trace_url: "https://track.example/3S123" },
    ] }) }]);
    expect(await printeersAdapter(impl).fetchStatus("TESTCODE-7", "draft")).toMatchObject({ status: "SHIPPED", carrier: "PostNL · ParcelPremium", trackingNumber: "3S123", trackingUrl: "https://track.example/3S123" });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://api.test-printeers.com/orders/TESTCODE-7");
  });

  it("maps every documented status code", () => {
    const code = (value: string) => printeersStatus({ status_code: value as never });
    expect(["pending", "backorder", "in_production", "printed", "partially_shipped", "completed", "canceled"].map((value) => code(value).status)).toEqual(["SUBMITTED", "SUBMITTED", "IN_PRODUCTION", "IN_PRODUCTION", "IN_PRODUCTION", "SHIPPED", "CANCELLED"]);
    expect(printeersStatus({ status_code: "pending", status_human_readable: "Created" }).label).toBe("pending · Created");
  });

  it("surfaces HTTP failures as errors, and rate limits as retryable", async () => {
    const rejected = fakeFetch([{ status: 200, body: "JPEG" }, { status: 201, body: { reference: "TESTCODE-img-1" } }, { status: 400, body: { code: "invalid_address", message: "phonenumber is invalid" } }]);
    await expect(printeersAdapter(rejected.impl).submit(caseInput("draft"))).rejects.toMatchObject({ status: 400, retryable: false });
    const limited = fakeFetch([{ status: 200, body: "JPEG" }, { status: 429, body: { code: "rate_limited", message: "Rate limit exceeded" } }]);
    await expect(printeersAdapter(limited.impl).submit(caseInput("draft"))).rejects.toMatchObject({ status: 429, retryable: true });
    const unauthorised = fakeFetch([{ status: 401, body: "invalid authentication" }]);
    await expect(printeersAdapter(unauthorised.impl).fetchStatus("TESTCODE-7", "draft")).rejects.toMatchObject({ status: 401, retryable: false });
  });

  it("formats identifiers, names, street numbers and phone numbers as Printeers expects", () => {
    // partner_reference must match ^[a-zA-Z0-9_-]{1,20}$; it is a stable hash of our (longer) reference.
    expect(identifier).toMatch(/^[a-zA-Z0-9_-]{1,20}$/);
    expect(printeersIdentifier("CM-1793533878346-8B7AC74C-PRT")).toBe(identifier);
    expect(printeersIdentifier("CM-1793533878346-8B7AC74D-PRT")).not.toBe(identifier);
    expect(splitName("Ana")).toEqual({ firstname: "Ana", lastname: "" });
    expect(splitStreet("Rua Augusta 274")).toEqual({ streetname: "Rua Augusta", housenumber: "274", housenumberAddition: "" });
    expect(splitStreet("Avenida da Liberdade, nº 10 - 2º Esq")).toEqual({ streetname: "Avenida da Liberdade", housenumber: "10", housenumberAddition: "2º Esq" });
    expect(splitStreet("Lugar de Abaixo")).toEqual({ streetname: "Lugar de Abaixo", housenumber: "", housenumberAddition: "" });
    expect(internationalPhone("912 345 678", "PT")).toBe("+351912345678");
    expect(internationalPhone("0034 600 111 222", "ES")).toBe("+34600111222");
    expect(internationalPhone("+34 600 111 222", "ES")).toBe("+34600111222");
    expect(internationalPhone(null, "ES")).toBe("");
  });
});
