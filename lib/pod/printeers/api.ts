// Printeers API v1 client (legacy). Server only. Shapes follow the published OpenAPI spec
// (https://api-docs.printeers.com/static/printeers-api-v1.openapi.json, v1.19.0) and were
// checked against the TEST API (https://api.test-printeers.com) on 2026-11-07:
// - auth: two headers, `X-IPP-PARTNERCODE` (the store code) and `X-IPP-APIKEY`;
//   a wrong key answers 401 "invalid authentication"; V2 secret keys do not work here;
// - paths have no version prefix (`/stock`, `/orders`); the `/v1` of the docs answers 404;
// - snake_case fields, resources at the top level of the body, errors `{ code, message }`;
// - there is no quote endpoint, no product groups, no per-order annotations and no
//   shipments endpoint: shipments (with tracking) come inside GET /orders/{reference}.
import { printeersConfig } from "../config";
import { PodApiError, podRequest, type FetchLike } from "../http";
import type { PodMode } from "../types";

export type PrinteersStockItem = {
  sku: string;
  name: string;
  kind: "print" | "distribution";
  dimension_width_mm: number | null;
  dimension_height_mm: number | null;
  availability: { status: "in-stock" | "low-stock" | "out-of-stock"; amount_left?: number; can_backorder?: boolean; expected_available_date?: string } | null;
  suggested_retail_price: string | null;
  price: string | null;
  attributes: { print_side: string | null; case_type: string | null; case_colour: string | null; device_brand: string | null; device_models: string[] } | null;
  // Documented: mask_url, mockup_url, top_url, bottom_url, ppmm. offset_x / offset_y (the place of the
  // print area inside the layer canvas, in px) are returned by the API but not documented.
  rendering_layers: { mask_url?: string; mockup_url?: string; top_url?: string; bottom_url?: string; ppmm?: number; offset_x?: number; offset_y?: number } | null;
};

// Address of a dropship order (country_code is ISO alpha-2).
export type PrinteersAddress = {
  company: string; firstname: string; lastname: string; streetname: string; housenumber: string; housenumber_addition: string;
  additional_info: string; state: string; zipcode: string; city: string; country_code: string; phonenumber: string; email: string;
};
export type PrinteersOrderLine = { item_sku: string; image_reference?: string; quantity: number };
export type PrinteersOrderStatusCode = "pending" | "backorder" | "in_production" | "printed" | "partially_shipped" | "completed" | "canceled";
export type PrinteersShipment = { created?: string; shipper?: string; shipping_method?: string; track_and_trace_code?: string; track_and_trace_url?: string; lines?: { linenumber: number; quantity: number }[] };
export type PrinteersOrder = {
  reference: string;
  custom_reference: string | null;
  status: "open" | "closed";
  status_code: PrinteersOrderStatusCode;
  status_human_readable?: string;
  in_production?: boolean;
  expected_shipping?: string | null;
  dashboard_url?: string;
  lines?: { linenumber: number; item_sku: string; image_reference?: string; quantity: number; canceled_quantity: number; shipped_quantity: number }[];
  shipments?: PrinteersShipment[];
};

type Options = { mode: PodMode; fetchImpl?: FetchLike };

function connection(mode: PodMode) {
  const config = printeersConfig(mode);
  const live = mode === "live";
  if (!config.apiKey || !config.partnerCode) {
    const missing = [!config.partnerCode && (live ? "PRINTEERS_V1_PARTNER_CODE" : "PRINTEERS_V1_TEST_PARTNER_CODE"), !config.apiKey && (live ? "PRINTEERS_V1_API_KEY" : "PRINTEERS_V1_TEST_API_KEY")].filter(Boolean);
    throw new PodApiError("PRINTEERS", null, `${missing.join(" and ")} not set`, false);
  }
  return config as typeof config & { apiKey: string; partnerCode: string };
}

// V1 reports most business errors as HTTP 200 with `{ errorMessage, errorCode }` (verified on the test
// API for a duplicate partner_reference, an unknown SKU and an unknown order); other failures use a
// 4xx/5xx with `{ code, message }`. Both are turned into a PodApiError, so a rejected order can never
// be mistaken for a created one. Only `system_shutting_down` is worth retrying.
const RETRYABLE_CODES = new Set(["system_shutting_down"]);

function rejection(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const value = body as { errorCode?: unknown; errorMessage?: unknown };
  return typeof value.errorCode === "string" && value.errorCode ? { code: value.errorCode, message: typeof value.errorMessage === "string" ? value.errorMessage.slice(0, 300) : "" } : null;
}

async function call<T>({ mode, fetchImpl }: Options, path: string, init: RequestInit & { timeoutMs?: number } = {}) {
  const config = connection(mode);
  const { status, body } = await podRequest<T>("PRINTEERS", `${config.baseUrl}${path}`, {
    ...init,
    fetchImpl,
    headers: { "X-IPP-PARTNERCODE": config.partnerCode, "X-IPP-APIKEY": config.apiKey, Accept: "application/json", ...(typeof init.body === "string" ? { "Content-Type": "application/json" } : {}), ...(init.headers || {}) },
  });
  const rejected = rejection(body);
  // 422: the status Printeers' 200 would have carried had it used HTTP semantics.
  if (rejected) throw new PodApiError("PRINTEERS", 422, `PRINTEERS rejected the request (${rejected.code})${rejected.message ? `: ${rejected.message}` : ""}`, RETRYABLE_CODES.has(rejected.code), { code: rejected.code, message: rejected.message, httpStatus: status });
  return body;
}

// Error code of a Printeers failure: `errorCode` of a 200 body (kept as `code` by call()) or `code` of a 4xx body.
export const printeersErrorCode = (reason: unknown) => (reason instanceof PodApiError && reason.body && typeof reason.body === "object" && typeof (reason.body as { code?: unknown }).code === "string" ? (reason.body as { code: string }).code : null);

export const printeersApi = {
  // V1 has no "validate" call: the cheapest authenticated GET proves the partner code and key.
  validate: async (options: Options) => { await call<unknown>(options, "/stock-attributes"); return { message: "Authentication is valid" }; },

  // ── Catalog: the complete stock list (about 1.2 MB in test), so callers cache it ──
  stock: async (options: Options) => (await call<{ items: PrinteersStockItem[] }>(options, "/stock", { timeoutMs: 45_000 })).items || [],

  // ── Images: base64-encoded PNG or JPG in a JSON body. Returns the image reference. ──
  uploadImage: async (options: Options, bytes: Uint8Array) =>
    (await call<{ reference: string }>(options, "/images", { method: "POST", body: JSON.stringify({ image: Buffer.from(bytes).toString("base64") }), timeoutMs: 60_000 })).reference,

  // ── Orders ──
  // Dropship order: Printeers ships to the customer. partner_reference (^[a-zA-Z0-9_-]{1,20}$) must never
  // have been used in the store, which is what stops a retried request from creating a second order.
  createOrder: async (options: Options, order: { partner_reference: string; brand_reference?: string | null; address: PrinteersAddress; shipping_minimal_level: string; lines: PrinteersOrderLine[] }) => {
    const { brand_reference, ...rest } = order;
    return (await call<{ reference: string }>(options, "/orders", { method: "POST", body: JSON.stringify({ shipping_kind: "dropship", ...rest, ...(brand_reference ? { brand_reference } : {}) }) })).reference;
  },
  order: (options: Options, reference: string) => call<PrinteersOrder>(options, `/orders/${encodeURIComponent(reference)}`),
  orderByPartnerReference: async (options: Options, partnerReference: string) => {
    try {
      return await call<PrinteersOrder>(options, `/orders/by-partner-reference/${encodeURIComponent(partnerReference)}`);
    } catch (reason) {
      // Unknown reference: HTTP 200 with errorCode reference_not_found (a plain 404 is handled as well).
      if (printeersErrorCode(reason) === "reference_not_found" || (reason instanceof PodApiError && reason.status === 404)) return null;
      throw reason;
    }
  },
};
