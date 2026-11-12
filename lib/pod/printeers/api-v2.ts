// Printeers API v2 client. Server only. Shapes follow the published OpenAPI spec
// (https://api-docs.printeers.com/static/printeers-api-v2.openapi.json, v2.8.0) and were checked against
// the production API with read-only calls on 2026-11-12 (/auth/validate, /stores, /brands, /productgroups,
// /products, /products/{ref}, /utilities/lookup-product-reference-by-legacy-sku):
// - auth: header `X-Printeers-Secret-Key` ("Secret_Key_…"); test and production keys are different
//   (a production key answers 401 invalid_secret_key on the test API);
// - base https://api.printeers.com/v2 (test: https://api.test-printeers.com/v2), camelCase fields, every
//   resource wrapped (`{ order }`, `{ shipment }`…), errors `{ code, message }` with a real HTTP status;
// - orders are looked up by our own `customIdentifier` (unique per store), shipments have their own
//   endpoint with carrier and tracking, cancellation sets the total canceled quantity per line (idempotent).
import { printeersConfig } from "../config";
import { PodApiError, podRequest, type FetchLike } from "../http";
import type { PodMode } from "../types";

export type V2Address = {
  company: string; firstname: string; lastname: string; streetname: string; housenumber: string; housenumberAddition: string;
  additionalInfo: string; state: string; zipcode: string; city: string; countryCode: string; phonenumber: string; email: string;
};
export type V2ShippingLevel = "basic" | "tracked" | "express";
export type V2OrderStatusCode = "pending" | "backorder" | "in_production" | "printed" | "completed" | "canceled";
export type V2Order = {
  reference: string;
  storeReference: string;
  legacyOrderCode?: string;
  customIdentifier: string | null;
  created: string;
  dashboardUrl?: string;
  status: { open: boolean; code: V2OrderStatusCode; expectedShipping: string | null };
  onHold: { reason: string } | null;
  orderlines: { index: number; productReference: string; legacySku?: string; imageReference?: string | null; quantity: number; canceledQuantity: number; shippedQuantity: number }[];
  shipments: { reference: string }[];
};
export type V2Shipment = {
  reference: string;
  kind: "dropship" | "combined";
  created: string;
  shippingLevel: V2ShippingLevel;
  carrier: string;
  trackingNumber: string | null;
  trackingUrl: string;
  orders: { orderReference: string; orderlines: { orderlineIndex: number; quantity: number }[] }[];
};
export type V2Productgroup = { reference: string; name: string; private: boolean; suggestedRetailPrice: number | null; price: number | null };
export type V2ProductSummary = { reference: string; productgroupReference: string; name: string; legacyItemSKU: string; status: string; availableQuantity: number };
export type V2Product = V2ProductSummary & {
  print: { widthMm: number; heightMm: number } | null;
  isAddon: boolean;
  layers: { top?: string; mask?: string; bottom?: string; mockup?: string; maskWidthPx: number; maskHeightPx: number; maskOffsetXPx: number; maskOffsetYPx: number; ppmm: number } | null;
  availability: { quantity: number; expectedAvailableDate: string | null; canBackorder: boolean } | null;
};

type Options = { mode: PodMode; fetchImpl?: FetchLike };

function connection(mode: PodMode) {
  const config = printeersConfig(mode);
  if (!config.secretKey) throw new PodApiError("PRINTEERS", null, `${mode === "live" ? "PRINTEERS_API_KEY" : "PRINTEERS_TEST_API_KEY"} is not set`, false);
  return config as typeof config & { secretKey: string };
}

async function call<T>({ mode, fetchImpl }: Options, path: string, init: RequestInit & { timeoutMs?: number } = {}) {
  const config = connection(mode);
  const { body } = await podRequest<T>("PRINTEERS", `${config.v2BaseUrl}${path}`, {
    ...init,
    fetchImpl,
    headers: { "X-Printeers-Secret-Key": config.secretKey, Accept: "application/json", ...(typeof init.body === "string" ? { "Content-Type": "application/json" } : {}), ...(init.headers || {}) },
  });
  return body;
}

const notFound = (reason: unknown) => reason instanceof PodApiError && reason.status === 404;

// The store of this key: PRINTEERS_STORE_REFERENCE, else the key's only (non-archived) store. Cached.
const stores = new Map<string, Promise<string>>();
export function storeReference(options: Options) {
  const config = connection(options.mode);
  if (config.storeReference) return Promise.resolve(config.storeReference);
  const key = `${options.mode}:${config.secretKey.slice(-6)}`;
  if (!stores.has(key)) {
    const lookup = call<{ stores: { reference: string; archived: string | null }[] }>(options, "/stores").then(({ stores: list }) => {
      const open = list.filter((store) => !store.archived);
      if (open.length !== 1) throw new PodApiError("PRINTEERS", null, `The Printeers key has ${open.length} stores: set ${options.mode === "live" ? "PRINTEERS_STORE_REFERENCE" : "PRINTEERS_TEST_STORE_REFERENCE"}`, false);
      return open[0].reference;
    });
    lookup.catch(() => stores.delete(key));
    stores.set(key, lookup);
  }
  return stores.get(key)!;
}

export const printeersV2 = {
  validate: (options: Options) => call<{ message: string }>(options, "/auth/validate"),

  // ── Catalog ──
  productgroups: async (options: Options) => (await call<{ productgroups: V2Productgroup[] }>(options, "/productgroups")).productgroups || [],
  products: async (options: Options, productgroupReference: string) => {
    const all: V2ProductSummary[] = [];
    let cursor: string | null = null;
    // Pages of 100; a group has a few hundred models at most.
    for (let page = 0; page < 20; page += 1) {
      const query: string = `productgroupReference=${encodeURIComponent(productgroupReference)}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
      const body: { products: V2ProductSummary[]; nextCursor?: string | null } = await call(options, `/products?${query}`, { timeoutMs: 30_000 });
      all.push(...(body.products || []));
      cursor = body.nextCursor || null;
      if (!cursor) break;
    }
    return all;
  },
  product: async (options: Options, productReference: string) => (await call<{ product: V2Product }>(options, `/products/${encodeURIComponent(productReference)}`)).product,
  productByLegacySku: async (options: Options, sku: string) => {
    try {
      return (await call<{ productReference: string }>(options, `/utilities/lookup-product-reference-by-legacy-sku?legacyItemSku=${encodeURIComponent(sku)}`)).productReference;
    } catch (reason) {
      if (notFound(reason)) return null;
      throw reason;
    }
  },

  // ── Images: the raw JPEG/PNG bytes (deduplicated by Printeers: the same image gives the same reference). ──
  uploadImage: async (options: Options, bytes: Uint8Array) =>
    (await call<{ image: { reference: string } }>(options, "/images", { method: "POST", body: bytes as unknown as BodyInit, headers: { "Content-Type": "application/octet-stream" }, timeoutMs: 60_000 })).image.reference,

  // ── Orders ──
  createOrder: async (options: Options, order: { storeReference: string; customIdentifier: string; brandReference?: string | null; dropshipAddress: V2Address; dropshipMinimalShippingLevel: V2ShippingLevel; orderlines: { productReference: string; imageReference: string; quantity: number }[] }) => {
    const { brandReference, ...rest } = order;
    return (await call<{ order: { reference: string } }>(options, "/orders", { method: "POST", body: JSON.stringify({ order: { shippingKind: "dropship", ...rest, ...(brandReference ? { brandReference } : {}) } }) })).order.reference;
  },
  order: async (options: Options, reference: string) => (await call<{ order: V2Order }>(options, `/orders/${encodeURIComponent(reference)}`)).order,
  orderByCustomIdentifier: async (options: Options, customIdentifier: string) => {
    try {
      const store = await storeReference(options);
      return (await call<{ orderReference: string }>(options, `/utilities/lookup-order-reference-by-custom-identifier?storeReference=${encodeURIComponent(store)}&customIdentifier=${encodeURIComponent(customIdentifier)}`)).orderReference;
    } catch (reason) {
      if (notFound(reason)) return null;
      throw reason;
    }
  },
  // v2 reference of an order created through v1 ("STORECODE-12"); v2 references ("Order_…") as they are.
  orderReference: async (options: Options, reference: string) => {
    if (/^Order_/.test(reference)) return reference;
    try {
      return (await call<{ orderReference: string }>(options, `/utilities/lookup-order-reference-by-legacy-code?legacyOrderCode=${encodeURIComponent(reference)}`)).orderReference;
    } catch (reason) {
      if (notFound(reason)) throw new PodApiError("PRINTEERS", 404, `Printeers has no order ${reference}`, false);
      throw reason;
    }
  },
  // Sets the total canceled quantity of each line (repeating it cancels nothing more). Answers 204.
  cancel: (options: Options, reference: string, orderlines: { index: number; canceledQuantity: number }[]) =>
    call<unknown>(options, `/orders/${encodeURIComponent(reference)}/cancel`, { method: "POST", body: JSON.stringify({ orderlines }) }),
  shipment: async (options: Options, reference: string) => (await call<{ shipment: V2Shipment }>(options, `/shipments/${encodeURIComponent(reference)}`)).shipment,
};
