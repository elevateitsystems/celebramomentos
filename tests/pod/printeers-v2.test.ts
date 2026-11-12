import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { printeersAdapter, printeersIdentifier, printeersV2State } from "@/lib/pod/providers/printeers";
import { phoneModel, phoneModels, productgroups, v2Detail } from "@/lib/pod/printeers/catalog";
import { printeersApiVersion } from "@/lib/pod/config";
import type { V2Order, V2Product, V2Shipment } from "@/lib/pod/printeers/api-v2";
import type { SubmissionInput } from "@/lib/pod/types";

// Printeers API v2 with a fake server: answers are shaped like the v2 OpenAPI spec (v2.8.0) and the
// production responses read on 2026-11-12. No real order is ever created here.
type Route = { method: string; path: RegExp; status?: number | (() => number); body: unknown | ((url: string, init: RequestInit) => unknown) };
let routes: Route[] = [];
let calls: { method: string; url: string; init: RequestInit }[] = [];
const fakeFetch = vi.fn(async (url: string, init: RequestInit = {}) => {
  const method = (init.method || "GET").toUpperCase();
  calls.push({ method, url, init });
  const route = routes.find((entry) => entry.method === method && entry.path.test(url));
  if (!route) return new Response(JSON.stringify({ code: "resource_not_found", message: "The requested resource was not found" }), { status: 404 });
  const status = typeof route.status === "function" ? route.status() : route.status ?? 200;
  const body = typeof route.body === "function" ? (route.body as (url: string, init: RequestInit) => unknown)(url, init) : route.body;
  return new Response(status === 204 ? null : JSON.stringify(body), { status });
});

const saved = { ...process.env };
beforeEach(() => {
  delete process.env.PRINTEERS_TEST_STORE_REFERENCE;
  Object.assign(process.env, { PRINTEERS_API_VERSION: "v2", PRINTEERS_TEST_API_KEY: "Secret_Key_test", PRINTEERS_SHIPPING_LEVEL: "tracked" });
  routes = [{ method: "GET", path: /\/v2\/stores$/, body: { stores: [{ reference: "Store_abc", name: "Celebra Momentos", archived: null }] } }];
  calls = [];
  vi.stubGlobal("fetch", fakeFetch);
});
afterEach(() => { process.env = { ...saved }; vi.unstubAllGlobals(); });

const input: SubmissionInput = {
  reference: "CM-1-PRT", orderNumber: "CM-1", mode: "draft", shipping: "standard",
  recipient: { name: "Ana María López", email: "ana@example.com", phone: "600000000", address1: "Calle Mayor, 12, 3ºB", address2: null, city: "Madrid", postalCode: "28013", countryCode: "ES", state: null },
  lines: [{ itemId: "item1", productRef: "B67760000", quantity: 1, name: "Funda", files: [{ area: "default", url: "https://res.cloudinary.com/x/image/upload/print.png", source: "design" }] }],
};
const order = (patch: Partial<V2Order> = {}): V2Order => ({
  reference: "Order_1", storeReference: "Store_abc", customIdentifier: printeersIdentifier("CM-1-PRT"), created: "2026-11-12T10:00:00Z",
  status: { open: true, code: "pending", expectedShipping: "2026-11-14T00:00:00Z" }, onHold: null,
  orderlines: [{ index: 0, productReference: "Product_rn9", legacySku: "B67760000", quantity: 2, canceledQuantity: 0, shippedQuantity: 0 }], shipments: [], ...patch,
});
const shipment: V2Shipment = { reference: "Shipment_1", kind: "dropship", created: "2026-11-13T09:00:00Z", shippingLevel: "tracked", carrier: "PostNL", trackingNumber: "3SABC", trackingUrl: "https://jouw.postnl.nl/track-and-trace/3SABC", orders: [{ orderReference: "Order_1", orderlines: [{ orderlineIndex: 0, quantity: 1 }] }] };

describe("which API", () => {
  it("v2 only when switched on AND the environment has its v2 key; otherwise v1", () => {
    expect(printeersApiVersion("draft")).toBe("v2");
    delete process.env.PRINTEERS_TEST_API_KEY;
    expect(printeersApiVersion("draft")).toBe("v1");
    // A v2 key alone (even the live one) never switches anything.
    Object.assign(process.env, { PRINTEERS_TEST_API_KEY: "Secret_Key_test", PRINTEERS_API_KEY: "Secret_Key_live" });
    delete process.env.PRINTEERS_API_VERSION;
    expect(printeersApiVersion("draft")).toBe("v1");
    expect(printeersApiVersion("live")).toBe("v1");
  });
});

describe("sending an order (v2)", () => {
  it("uploads the print file, finds the product and creates a dropship order with our identifier", async () => {
    routes.push(
      { method: "GET", path: /lookup-order-reference-by-custom-identifier/, status: 404, body: { code: "resource_not_found" } },
      { method: "GET", path: /res\.cloudinary\.com/, body: "PNGDATA" },
      { method: "POST", path: /\/v2\/images$/, body: { image: { reference: "Image_1" } } },
      { method: "GET", path: /lookup-product-reference-by-legacy-sku\?legacyItemSku=B67760000/, body: { productReference: "Product_rn9" } },
      { method: "POST", path: /\/v2\/orders$/, status: 201, body: { order: { reference: "Order_1" } } },
    );
    const state = await printeersAdapter().submit(input);
    expect(state).toMatchObject({ providerOrderId: "Order_1", status: "SUBMITTED" });
    const upload = calls.find((call) => call.url.endsWith("/v2/images"))!;
    expect((upload.init.headers as Record<string, string>)["Content-Type"]).toBe("application/octet-stream");
    expect((upload.init.headers as Record<string, string>)["X-Printeers-Secret-Key"]).toBe("Secret_Key_test");
    const created = JSON.parse(String(calls.find((call) => call.method === "POST" && call.url.endsWith("/v2/orders"))!.init.body));
    expect(created).toEqual({ order: {
      shippingKind: "dropship", storeReference: "Store_abc", customIdentifier: printeersIdentifier("CM-1-PRT"), dropshipMinimalShippingLevel: "tracked",
      dropshipAddress: { company: "", firstname: "Ana", lastname: "María López", streetname: "Calle Mayor", housenumber: "12", housenumberAddition: "3ºB", additionalInfo: "", state: "", zipcode: "28013", city: "Madrid", countryCode: "ES", phonenumber: "+34600000000", email: "ana@example.com" },
      orderlines: [{ productReference: "Product_rn9", imageReference: "Image_1", quantity: 1 }],
    } });
    expect(calls.find((call) => call.url.includes("lookup-order-reference-by-custom-identifier"))!.url).toContain("storeReference=Store_abc");
  });

  it("never creates a second order: an identifier already used returns that order", async () => {
    routes.push(
      { method: "GET", path: /lookup-order-reference-by-custom-identifier/, body: { orderReference: "Order_1" } },
      { method: "GET", path: /\/v2\/orders\/Order_1$/, body: { order: order() } },
    );
    const state = await printeersAdapter().submit(input);
    expect(state.providerOrderId).toBe("Order_1");
    expect(calls.some((call) => call.method === "POST")).toBe(false);
  });

  it("a 409 on create (a parallel attempt got there first) is resolved to the existing order", async () => {
    let lookups = 0;
    const found = () => lookups++ > 0;
    routes.push(
      { method: "GET", path: /lookup-order-reference-by-custom-identifier/, status: () => (found() ? 200 : 404), body: () => (lookups > 1 ? { orderReference: "Order_1" } : { code: "resource_not_found" }) },
      { method: "GET", path: /res\.cloudinary\.com/, body: "PNG" },
      { method: "POST", path: /\/v2\/images$/, body: { image: { reference: "Image_1" } } },
      { method: "POST", path: /\/v2\/orders$/, status: 409, body: { code: "conflict", message: "customIdentifier already used" } },
      { method: "GET", path: /\/v2\/orders\/Order_1$/, body: { order: order() } },
    );
    // The product is already a v2 reference (the v2 catalog's model), so no SKU lookup is needed.
    const state = await printeersAdapter().submit({ ...input, lines: [{ ...input.lines[0], productRef: "Product_rn9" }] });
    expect(state.providerOrderId).toBe("Order_1");
    expect(calls.filter((call) => call.method === "POST" && call.url.endsWith("/v2/orders"))).toHaveLength(1);
    expect(calls.some((call) => call.url.includes("legacy-sku"))).toBe(false);
  });
});

describe("status and tracking (v2)", () => {
  it("reads each shipment: carrier, tracking, items; open with a shipment = partially shipped", async () => {
    routes.push(
      { method: "GET", path: /\/v2\/orders\/Order_1$/, body: { order: order({ status: { open: true, code: "in_production", expectedShipping: null }, shipments: [{ reference: "Shipment_1" }] }) } },
      { method: "GET", path: /\/v2\/shipments\/Shipment_1$/, body: { shipment } },
    );
    const state = await printeersAdapter().fetchStatus("Order_1", "draft");
    expect(state).toMatchObject({ status: "IN_PRODUCTION", providerStatus: "in_production · partially shipped", carrier: "PostNL · tracked", trackingNumber: "3SABC", trackingUrl: "https://jouw.postnl.nl/track-and-trace/3SABC" });
    expect(state!.tracking!.shipments[0]).toMatchObject({ id: "Shipment_1", status: "shipped", shippedAt: "2026-11-13T09:00:00.000Z", items: [{ itemId: null, sku: "Product_rn9", quantity: 1 }] });
  });

  it("completed → shipped; on hold → a problem for the admin; expected dispatch kept", () => {
    expect(printeersV2State(order({ status: { open: false, code: "completed", expectedShipping: null }, shipments: [{ reference: "Shipment_1" }] }), [shipment]).status).toBe("SHIPPED");
    const held = printeersV2State(order({ onHold: { reason: "Image could not be printed" } }));
    expect(held).toMatchObject({ status: "SUBMITTED", problem: "Printeers put the order on hold: Image could not be printed" });
    expect(held.tracking!.expectedDispatch).toBe("2026-11-14T00:00:00.000Z");
  });

  it("an order created through v1 (STORECODE-12) is found by its legacy code", async () => {
    routes.push(
      { method: "GET", path: /lookup-order-reference-by-legacy-code\?legacyOrderCode=S00103767A-3/, body: { orderReference: "Order_1" } },
      { method: "GET", path: /\/v2\/orders\/Order_1$/, body: { order: order() } },
    );
    expect((await printeersAdapter().fetchStatus("S00103767A-3", "draft"))!.providerOrderId).toBe("Order_1");
  });
});

describe("cancelling (v2)", () => {
  it("sets every unshipped line's total canceled quantity, then confirms it is cancelled", async () => {
    let cancelled = false;
    routes.push(
      { method: "GET", path: /\/v2\/orders\/Order_1$/, body: () => ({ order: order(cancelled ? { status: { open: false, code: "canceled", expectedShipping: null }, orderlines: [{ index: 0, productReference: "Product_rn9", quantity: 2, canceledQuantity: 2, shippedQuantity: 0 }] } : {}) }) },
      { method: "POST", path: /\/v2\/orders\/Order_1\/cancel$/, status: 204, body: () => { cancelled = true; return null; } },
    );
    const state = await printeersAdapter().cancel("Order_1", "draft");
    expect(state.status).toBe("CANCELLED");
    expect(JSON.parse(String(calls.find((call) => call.method === "POST")!.init.body))).toEqual({ orderlines: [{ index: 0, canceledQuantity: 2 }] });
    // A second cancel sends nothing more.
    calls = [];
    expect((await printeersAdapter().cancel("Order_1", "draft")).status).toBe("CANCELLED");
    expect(calls.some((call) => call.method === "POST")).toBe(false);
  });

  it("refused when production started (409) or everything shipped", async () => {
    routes.push(
      { method: "GET", path: /\/v2\/orders\/Order_1$/, body: { order: order({ status: { open: true, code: "in_production", expectedShipping: null } }) } },
      { method: "POST", path: /\/v2\/orders\/Order_1\/cancel$/, status: 409, body: { code: "order_in_production", message: "Order is in production" } },
    );
    await expect(printeersAdapter().cancel("Order_1", "draft")).rejects.toThrow(/production has probably started/);
    routes[1] = { method: "GET", path: /\/v2\/orders\/Order_1$/, body: { order: order({ orderlines: [{ index: 0, productReference: "Product_rn9", quantity: 1, canceledQuantity: 0, shippedQuantity: 1 }] }) } };
    await expect(printeersAdapter().cancel("Order_1", "draft")).rejects.toThrow(/everything in it has shipped/);
  });
});

describe("phone case catalog (v2)", () => {
  const product = (patch: Partial<V2Product> = {}): V2Product => ({
    reference: "Product_rn9", productgroupReference: "Productgroup_soft", name: "Apple iPhone XR Soft case (back printed, transparent)", legacyItemSKU: "B67760000", status: "launched", availableQuantity: 396, isAddon: false,
    print: { widthMm: 70, heightMm: 150 },
    layers: { top: "https://files.printeers.com/layers/Product_rn9/top.png", mask: "https://files.printeers.com/layers/Product_rn9/mask.png", bottom: "https://files.printeers.com/layers/Product_rn9/bottom.png", mockup: "https://files.printeers.com/layers/Product_rn9/mockup.png", maskWidthPx: 732, maskHeightPx: 1566, maskOffsetXPx: 534, maskOffsetYPx: 117, ppmm: 10.44 },
    availability: { quantity: 396, expectedAvailableDate: null, canBackorder: true }, ...patch,
  });

  it("lists phone case groups only, and each group's sellable models (backorders checked, ended ones hidden)", async () => {
    routes.push(
      { method: "GET", path: /\/v2\/productgroups$/, body: { productgroups: [{ reference: "Productgroup_soft", name: "Phone Soft cases (back printed, transparent)", private: false, suggestedRetailPrice: 1999, price: 553 }, { reference: "Productgroup_pods", name: "AirPods Soft cases (front printed, transparent)", private: false, suggestedRetailPrice: 999, price: 530 }] } },
      { method: "GET", path: /\/v2\/products\?productgroupReference=Productgroup_soft$/, body: { products: [
        { reference: "Product_rn9", productgroupReference: "Productgroup_soft", name: "Apple iPhone XR Soft case (back printed, transparent)", legacyItemSKU: "B67760000", status: "launched", availableQuantity: 396 },
        { reference: "Product_bo", productgroupReference: "Productgroup_soft", name: "Apple iPhone 8 Soft case (back printed, transparent)", legacyItemSKU: "B1", status: "launched", availableQuantity: 0 },
        { reference: "Product_no", productgroupReference: "Productgroup_soft", name: "Apple iPhone 7 Soft case (back printed, transparent)", legacyItemSKU: "B2", status: "launched", availableQuantity: 0 },
        { reference: "Product_end", productgroupReference: "Productgroup_soft", name: "Apple iPhone 6 Soft case (back printed, transparent)", legacyItemSKU: "B3", status: "ended", availableQuantity: 50 },
      ], nextCursor: "" } },
      { method: "GET", path: /\/v2\/products\/Product_bo$/, body: { product: product({ reference: "Product_bo", availableQuantity: 0, availability: { quantity: 0, expectedAvailableDate: null, canBackorder: true } }) } },
      { method: "GET", path: /\/v2\/products\/Product_no$/, body: { product: product({ reference: "Product_no", availableQuantity: 0, availability: { quantity: 0, expectedAvailableDate: null, canBackorder: false } }) } },
    );
    process.env.PRINTEERS_TEST_API_KEY = "Secret_Key_catalog";
    expect(await productgroups("draft")).toEqual([{ reference: "Productgroup_soft", name: "Phone Soft cases (back printed, transparent)", private: false, suggestedRetailPrice: 1999, price: 553 }]);
    expect(await phoneModels("Productgroup_soft", "draft")).toEqual([
      { reference: "Product_bo", name: "Apple iPhone 8", available: true, backorder: true },
      { reference: "Product_rn9", name: "Apple iPhone XR", available: true, backorder: false },
    ]);
  });

  it("a model's print size and full-canvas mockup layers; refused when it is not in the group", async () => {
    routes.push({ method: "GET", path: /\/v2\/products\/Product_rn9$/, body: { product: product() } });
    expect(v2Detail(product())).toMatchObject({ reference: "Product_rn9", name: "Apple iPhone XR", available: true, printMm: { width: 70, height: 150 }, layers: { maskWidthPx: 732, maskHeightPx: 1566, maskOffsetXPx: 534, maskOffsetYPx: 117, maskCanvas: true } });
    const found = await phoneModel("Productgroup_soft", "Product_rn9", "draft");
    expect(found?.layers.mask).toBe("https://files.printeers.com/layers/Product_rn9/mask.png");
    expect(await phoneModel("Productgroup_other", "Product_rn9", "draft")).toBeNull();
    expect(await phoneModel("Productgroup_soft", "B67760000", "draft")).toBeNull();
  });
});
