// Printful API (v1) — https://developers.printful.com/docs/
// Auth: Authorization: Bearer <private token>; X-PF-Store-Id selects the store
// ("Celebra Momentos Store"). Draft mode creates orders with confirm=false: Printful
// neither produces nor charges a draft until it is confirmed.
import { printfulConfig } from "../config";
import { PodApiError, podRequest, type FetchLike } from "../http";
import { httpsLink, isoDate, primaryShipment, type Shipment, type ShipmentStatus, type TrackingInfo } from "../tracking";
import type { PodAdapter, PodFulfillmentStatus, ProviderOrderState, SubmissionInput } from "../types";

type PrintfulShipment = { id?: number; carrier?: string; service?: string; tracking_number?: string | number; tracking_url?: string; status?: string; ship_date?: string; shipped_at?: number; created?: number; reshipment?: boolean; items?: { item_id?: number; quantity?: number }[] };
type PrintfulOrder = { id: number; external_id?: string; status?: string; shipments?: PrintfulShipment[]; items?: { id?: number; external_id?: string | null }[] };
// GET /v2/orders/{id}/shipments (same token as v1). Field names from the v2 reference; the ones it may
// leave out are read defensively.
export type PrintfulV2Shipment = {
  id?: number; carrier?: string | null; service?: string | null; tracking_number?: string | null; tracking_url?: string | null;
  shipment_status?: string | null; shipped_at?: string | null; delivery_status?: string | null; delivered_at?: string | null;
  departure_address?: { country_name?: string; country_code?: string; state_code?: string } | null;
  tracking_events?: { triggered_at?: string; description?: string }[] | null;
  estimated_delivery?: { from_date?: string | null; to_date?: string | null } | null;
  shipment_items?: { order_item_id?: number; order_item_external_id?: string | null; quantity?: number }[] | null;
  is_reshipment?: boolean;
};

const STATUS: Record<string, PodFulfillmentStatus> = {
  draft: "SUBMITTED",
  pending: "SUBMITTED",
  onhold: "IN_PRODUCTION",
  inprocess: "IN_PRODUCTION",
  // Some items shipped, others still being made.
  partial: "IN_PRODUCTION",
  fulfilled: "SHIPPED",
  canceled: "CANCELLED",
  failed: "FAILED",
};

// Order states that need someone to look at the order in Printful.
const PROBLEM: Record<string, string> = {
  failed: "Printful reports the order failed (often a print file or address problem): open it in the Printful dashboard",
  onhold: "Printful put the order on hold: open it in the Printful dashboard to see why",
};

function v2State(shipment: PrintfulV2Shipment | undefined): ShipmentStatus | null {
  const delivery = (shipment?.delivery_status || "").toLowerCase();
  const state = (shipment?.shipment_status || "").toLowerCase();
  if (/cancel/.test(state)) return "cancelled";
  if (/return/.test(delivery) || /return/.test(state)) return "returned";
  if (/delivered/.test(delivery) || shipment?.delivered_at) return "delivered";
  if (/transit|out_for_delivery|available_for_pickup/.test(delivery)) return "in_transit";
  if (/shipped|sent/.test(state) || shipment?.shipped_at) return "shipped";
  return null;
}

// Printful shipments: v1 `order.shipments[]` (carrier, service, tracking, ship date, Printful item ids),
// completed from the v2 shipments list when it could be read (delivery status, delivered date, estimate,
// carrier events, departure country).
export function printfulTracking(order: PrintfulOrder, v2: PrintfulV2Shipment[] = []): TrackingInfo {
  const externalOf = new Map((order.items || []).filter((item) => item.id).map((item) => [item.id!, item.external_id || null]));
  const byId = new Map(v2.filter((item) => item.id).map((item) => [item.id!, item]));
  const shipment = (base: PrintfulShipment | null, extra: PrintfulV2Shipment | undefined, index: number): Shipment => {
    const number = extra?.tracking_number || (base?.tracking_number !== undefined && base.tracking_number !== 0 ? String(base.tracking_number) : null);
    const from = extra?.departure_address?.country_code || null;
    const estimate = extra?.estimated_delivery && (extra.estimated_delivery.from_date || extra.estimated_delivery.to_date) ? { from: isoDate(extra.estimated_delivery.from_date), to: isoDate(extra.estimated_delivery.to_date) } : null;
    const events = (extra?.tracking_events || []).filter((event) => event.description).map((event) => ({ at: isoDate(event.triggered_at), description: String(event.description), location: null }));
    const items = extra?.shipment_items?.length
      ? extra.shipment_items.map((line) => ({ itemId: line.order_item_external_id || (line.order_item_id ? externalOf.get(line.order_item_id) || null : null), quantity: line.quantity ?? null }))
      : (base?.items || []).map((line) => ({ itemId: line.item_id ? externalOf.get(line.item_id) || null : null, quantity: line.quantity ?? null }));
    return {
      id: String(base?.id ?? extra?.id ?? `printful-${number || index}`),
      carrier: extra?.carrier || base?.carrier || null,
      service: extra?.service || base?.service || null,
      trackingNumber: number ? String(number) : null,
      trackingUrl: httpsLink(extra?.tracking_url || base?.tracking_url),
      status: v2State(extra) ?? (base ? "shipped" : "pending"),
      shippedAt: isoDate(extra?.shipped_at) || isoDate(base?.shipped_at) || isoDate(base?.ship_date),
      deliveredAt: isoDate(extra?.delivered_at),
      estimatedDelivery: estimate,
      location: events.length ? null : from ? `Dispatched from ${from}` : null,
      items,
      events,
    };
  };
  const shipments = (order.shipments || []).map((base, index) => shipment(base, base.id ? byId.get(base.id) : undefined, index));
  // Shipments only the v2 list knows (e.g. created after the v1 order was read).
  for (const [index, extra] of v2.entries()) if (!extra.id || !(order.shipments || []).some((base) => base.id === extra.id)) shipments.push(shipment(null, extra, index));
  const estimates = shipments.map((item) => item.estimatedDelivery).filter(Boolean) as { from: string | null; to: string | null }[];
  return { shipments, estimatedDelivery: estimates[estimates.length - 1] ?? null, expectedDispatch: null };
}

export function parsePrintfulOrder(order: PrintfulOrder, v2: PrintfulV2Shipment[] = []): ProviderOrderState {
  const raw = (order.status || "draft").toLowerCase();
  const tracking = printfulTracking(order, v2);
  const sent = tracking.shipments.filter((item) => item.status !== "cancelled" && item.status !== "pending");
  let status = STATUS[raw] ?? "SUBMITTED";
  // Fulfilled and every parcel delivered (only the v2 shipments say so).
  if (status === "SHIPPED" && sent.length && sent.every((item) => item.status === "delivered")) status = "DELIVERED";
  const main = primaryShipment(tracking);
  return {
    providerOrderId: String(order.id),
    providerStatus: raw === "partial" ? `partial · ${sent.length} shipment${sent.length === 1 ? "" : "s"} sent, more to come` : raw,
    status,
    problem: PROBLEM[raw] ?? null,
    carrier: main ? [main.carrier, main.service].filter(Boolean).join(" · ") || null : null,
    trackingNumber: main?.trackingNumber || null,
    trackingUrl: main?.trackingUrl || null,
    tracking,
  };
}

export function buildPrintfulOrder(input: SubmissionInput) {
  return {
    external_id: input.reference,
    // STANDARD is the only rate Printful offers for Spain (shipping/rates checked 2026-11-01).
    shipping: "STANDARD",
    recipient: {
      name: input.recipient.name,
      address1: input.recipient.address1,
      ...(input.recipient.address2 ? { address2: input.recipient.address2 } : {}),
      city: input.recipient.city,
      ...(input.recipient.state ? { state_code: input.recipient.state } : {}),
      country_code: input.recipient.countryCode,
      zip: input.recipient.postalCode,
      email: input.recipient.email,
      ...(input.recipient.phone ? { phone: input.recipient.phone } : {}),
    },
    items: input.lines.map((line) => ({
      external_id: line.itemId,
      variant_id: Number(line.productRef),
      quantity: line.quantity,
      name: line.name,
      files: line.files.map((file) => ({ type: file.area, url: file.url })),
    })),
  };
}

export function printfulAdapter(fetchImpl?: FetchLike): PodAdapter & { shipments(providerOrderId: string): Promise<PrintfulV2Shipment[]> } {
  const request = <T>(path: string, init: RequestInit = {}) => {
    const { token, storeId, baseUrl } = printfulConfig();
    return podRequest<T>("PRINTFUL", `${baseUrl}${path}`, { ...init, fetchImpl, headers: { Authorization: `Bearer ${token || ""}`, ...(storeId ? { "X-PF-Store-Id": storeId } : {}), "Content-Type": "application/json", Accept: "application/json" } });
  };
  const byExternalId = async (reference: string) => {
    try {
      const { body } = await request<{ result?: PrintfulOrder }>(`/orders/@${encodeURIComponent(reference)}`);
      return body.result ? parsePrintfulOrder(body.result) : null;
    } catch (reason) {
      if (reason instanceof PodApiError && reason.status === 404) return null;
      throw reason;
    }
  };
  return {
    provider: "PRINTFUL",
    configurationProblem: () => (printfulConfig().token ? null : "PRINTFUL_PRIVATE_TOKEN is not set"),
    async submit(input) {
      try {
        const { body } = await request<{ result?: PrintfulOrder }>(`/orders?confirm=${input.mode === "live" ? "true" : "false"}`, { method: "POST", body: JSON.stringify(buildPrintfulOrder(input)) });
        if (!body.result?.id) throw new Error("Printful did not return an order id");
        return { ...parsePrintfulOrder(body.result), raw: { id: body.result.id, status: body.result.status } };
      } catch (reason) {
        // external_id is unique per store: an order that already exists is ours, not a failure.
        if (reason instanceof PodApiError && (reason.status === 409 || /already exists|external.?id/i.test(reason.message))) {
          const existing = await byExternalId(input.reference);
          if (existing) return existing;
        }
        throw reason;
      }
    },
    findByReference: (reference) => byExternalId(reference),
    // Confirms the draft for fulfilment (Printful then produces and charges it).
    async confirmDraft(providerOrderId) {
      const { body } = await request<{ result?: PrintfulOrder }>(`/orders/${encodeURIComponent(providerOrderId)}/confirm`, { method: "POST" });
      if (!body.result) throw new Error("Printful did not confirm the order");
      return parsePrintfulOrder(body.result);
    },
    // DELETE /orders/{id}: cancels a draft or a confirmed order that is not in production yet (Printful refuses
    // once production has started).
    async cancel(providerOrderId) {
      const { body } = await request<{ result?: PrintfulOrder }>(`/orders/${encodeURIComponent(providerOrderId)}`, { method: "DELETE" });
      if (!body.result) throw new Error("Printful did not return the cancelled order");
      const state = parsePrintfulOrder(body.result);
      if (state.status !== "CANCELLED") throw new PodApiError("PRINTFUL", 409, `Printful did not cancel the order (status: ${state.providerStatus})`, false);
      return { ...state, raw: { id: body.result.id, status: body.result.status } };
    },
    // The v1 order (status, shipments) and, for orders that have shipments, the v2 shipments list (delivery
    // status, estimate, carrier events). A failed v2 read never hides the v1 status.
    async fetchStatus(providerOrderId) {
      const id = encodeURIComponent(providerOrderId);
      const { body } = await request<{ result?: PrintfulOrder }>(`/orders/${id}`);
      if (!body.result) return null;
      let v2: PrintfulV2Shipment[] = [];
      let v2Error: string | null = null;
      if ((body.result.shipments || []).length || /partial|fulfilled/i.test(body.result.status || "")) {
        try {
          v2 = (await request<{ data?: PrintfulV2Shipment[] }>(`/v2/orders/${id}/shipments?limit=100`)).body.data || [];
        } catch (reason) {
          v2Error = reason instanceof Error ? reason.message.slice(0, 200) : "v2 shipments could not be read";
        }
      }
      return { ...parsePrintfulOrder(body.result, v2), raw: { status: body.result.status, shipments: body.result.shipments, v2Shipments: v2.length, ...(v2Error ? { v2Error } : {}) } };
    },
    // Shipments of an order from the v2 API (also used to check the v2 endpoint with draft orders).
    async shipments(providerOrderId: string) {
      return (await request<{ data?: PrintfulV2Shipment[] }>(`/v2/orders/${encodeURIComponent(providerOrderId)}/shipments?limit=100`)).body.data || [];
    },
  };
}

// ── Webhooks ─────────────────────────────────────────────────────────────────
// Printful pushes order events to ONE URL per store, set through its API (GET / POST /webhooks).
// Our handler re-reads the order from the API on every event (lib/pod/webhooks.ts).
export const PRINTFUL_WEBHOOK_TYPES = ["package_shipped", "package_returned", "order_updated", "order_failed", "order_canceled", "order_put_hold", "order_remove_hold"] as const;

function printfulRequest<T>(path: string, init: RequestInit = {}, fetchImpl?: FetchLike) {
  const { token, storeId, baseUrl } = printfulConfig();
  return podRequest<T>("PRINTFUL", `${baseUrl}${path}`, { ...init, fetchImpl, timeoutMs: 8_000, headers: { Authorization: `Bearer ${token || ""}`, ...(storeId ? { "X-PF-Store-Id": storeId } : {}), "Content-Type": "application/json", Accept: "application/json" } });
}

// The store's webhook as Printful has it: the URL (never returned to the browser; see webhookSetupState) and event types.
export async function printfulWebhook(fetchImpl?: FetchLike) {
  const { body } = await printfulRequest<{ result?: { url?: string | null; types?: string[] } }>("/webhooks", {}, fetchImpl);
  return { url: body.result?.url || null, types: body.result?.types || [] };
}

// Points the store's webhook at this site, for the order events we handle.
export async function registerPrintfulWebhook(url: string, fetchImpl?: FetchLike) {
  const { body } = await printfulRequest<{ result?: { url?: string | null; types?: string[] } }>("/webhooks", { method: "POST", body: JSON.stringify({ url, types: PRINTFUL_WEBHOOK_TYPES, params: [] }) }, fetchImpl);
  return { url: body.result?.url || null, types: body.result?.types || [] };
}
