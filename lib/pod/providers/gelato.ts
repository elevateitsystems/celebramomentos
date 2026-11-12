// Gelato Order API v4 — https://dashboard.gelato.com/docs/
// Auth: X-API-KEY. Base: https://order.gelatoapis.com. Draft mode creates
// `orderType: "draft"` orders, which Gelato neither produces nor charges.
import { gelatoConfig } from "../config";
import { PodApiError, podRequest, type FetchLike } from "../http";
import { httpsLink, isoDate, primaryShipment, type Shipment, type ShipmentStatus, type TrackingInfo } from "../tracking";
import type { PodAdapter, PodFulfillmentStatus, ProviderOrderState, SubmissionInput } from "../types";

type GelatoFulfillment = { trackingCode?: string; trackingUrl?: string; shipmentMethodName?: string; fulfillmentStatus?: string; fulfillmentCountry?: string };
type GelatoPackage = { id?: string; trackingCode?: string; trackingUrl?: string; orderItemIds?: string[] };
type GelatoOrder = {
  id: string;
  orderReferenceId?: string;
  orderType?: string;
  fulfillmentStatus?: string;
  financialStatus?: string;
  shippedAt?: string | null;
  expectedDispatchDate?: string | null;
  items?: { id?: string; itemReferenceId?: string; fulfillmentStatus?: string; fulfillments?: GelatoFulfillment[] | null }[];
  shipment?: { id?: string; shipmentMethodName?: string | null; minDeliveryDate?: string | null; maxDeliveryDate?: string | null; fulfillmentCountry?: string | null; packages?: GelatoPackage[] | null } | null;
};

const STATUS: [RegExp, PodFulfillmentStatus][] = [
  [/cancel/, "CANCELLED"],
  [/^failed$/, "FAILED"],
  [/delivered/, "DELIVERED"],
  [/partial/, "IN_PRODUCTION"],
  [/shipped|in_transit/, "SHIPPED"],
  [/printed|in_production|production/, "IN_PRODUCTION"],
];

// Order states that need someone to look at the order in Gelato.
const PROBLEM: Record<string, string> = {
  failed: "Gelato reports the order failed: open it in the Gelato dashboard to see why",
  on_hold: "Gelato put the order on hold: open it in the Gelato dashboard to see why",
  not_connected: "Gelato could not route the order to a production partner",
  returned: "Gelato reports the parcel was returned to sender",
};

const shipmentState = (value: string | undefined): ShipmentStatus | null => {
  const text = (value || "").toLowerCase();
  if (/cancel/.test(text)) return "cancelled";
  if (/returned/.test(text)) return "returned";
  if (/delivered/.test(text)) return "delivered";
  if (/in_transit/.test(text)) return "in_transit";
  if (/shipped/.test(text)) return "shipped";
  return null;
};

// Gelato shipments: the order's `shipment` (method, delivery window, packages with tracking and the Gelato
// item ids they hold) and, in webhook-shaped orders, item `fulfillments` with their own tracking. Gelato
// gives no carrier events; the delivery window is its estimate, updated by order_delivery_estimate_updated.
export function gelatoTracking(order: GelatoOrder): TrackingInfo {
  const ref = new Map((order.items || []).filter((item) => item.id).map((item) => [item.id!, item.itemReferenceId || null]));
  const itemStatus = new Map((order.items || []).filter((item) => item.id).map((item) => [item.id!, item.fulfillmentStatus]));
  const orderState = shipmentState(order.fulfillmentStatus) ?? "shipped";
  const window = order.shipment && (order.shipment.minDeliveryDate || order.shipment.maxDeliveryDate) ? { from: isoDate(order.shipment.minDeliveryDate), to: isoDate(order.shipment.maxDeliveryDate) } : null;
  const origin = order.shipment?.fulfillmentCountry || null;
  const shipments: Shipment[] = [];
  const add = (shipment: Shipment) => { if (!shipments.some((known) => known.trackingNumber && known.trackingNumber === shipment.trackingNumber)) shipments.push(shipment); };
  (order.shipment?.packages || []).filter((pkg) => pkg.trackingCode || pkg.trackingUrl).forEach((pkg, index) => {
    const states = (pkg.orderItemIds || []).map((id) => shipmentState(itemStatus.get(id))).filter(Boolean) as ShipmentStatus[];
    add({
      id: pkg.id || `gelato-${pkg.trackingCode || index}`,
      carrier: order.shipment?.shipmentMethodName || null,
      service: null,
      trackingNumber: pkg.trackingCode || null,
      trackingUrl: httpsLink(pkg.trackingUrl),
      status: states.length && states.every((state) => state === "delivered") ? "delivered" : states[0] && states.every((state) => state === states[0]) ? states[0] : orderState,
      shippedAt: isoDate(order.shippedAt),
      deliveredAt: null,
      estimatedDelivery: window,
      location: origin ? `Dispatched from ${origin}` : null,
      items: (pkg.orderItemIds || []).map((id) => ({ itemId: ref.get(id) || null, quantity: null })),
      events: [],
    });
  });
  for (const item of order.items || []) {
    for (const [index, fulfillment] of (item.fulfillments || []).entries()) {
      if (!fulfillment.trackingCode && !fulfillment.trackingUrl) continue;
      add({
        id: `gelato-${fulfillment.trackingCode || `${item.id}-${index}`}`,
        carrier: fulfillment.shipmentMethodName || order.shipment?.shipmentMethodName || null,
        service: null,
        trackingNumber: fulfillment.trackingCode || null,
        trackingUrl: httpsLink(fulfillment.trackingUrl),
        status: shipmentState(fulfillment.fulfillmentStatus || item.fulfillmentStatus) ?? orderState,
        shippedAt: isoDate(order.shippedAt),
        deliveredAt: null,
        estimatedDelivery: window,
        location: fulfillment.fulfillmentCountry || origin ? `Dispatched from ${fulfillment.fulfillmentCountry || origin}` : null,
        items: [{ itemId: item.itemReferenceId || null, quantity: null }],
        events: [],
      });
    }
  }
  return { shipments, estimatedDelivery: window, expectedDispatch: isoDate(order.expectedDispatchDate) };
}

export function parseGelatoOrder(order: GelatoOrder): ProviderOrderState {
  const raw = (order.fulfillmentStatus || order.orderType || "created").toLowerCase();
  const status = STATUS.find(([pattern]) => pattern.test(raw))?.[1] ?? "SUBMITTED";
  const tracking = gelatoTracking(order);
  const main = primaryShipment(tracking);
  return {
    providerOrderId: order.id,
    providerStatus: raw,
    status,
    problem: PROBLEM[raw] ?? null,
    carrier: main?.carrier || order.shipment?.shipmentMethodName || null,
    trackingNumber: main?.trackingNumber || null,
    trackingUrl: main?.trackingUrl || null,
    tracking,
  };
}

export function buildGelatoOrder(input: SubmissionInput) {
  const [firstName, ...rest] = input.recipient.name.trim().split(/\s+/);
  return {
    orderType: input.mode === "live" ? "order" : "draft",
    orderReferenceId: input.reference,
    customerReferenceId: input.orderNumber,
    currency: "EUR",
    items: input.lines.map((line) => ({
      itemReferenceId: line.itemId,
      productUid: line.productRef,
      quantity: line.quantity,
      ...(line.pageCount ? { pageCount: line.pageCount } : {}),
      files: line.files.map((file) => ({ type: file.area, url: file.url })),
    })),
    shippingAddress: {
      firstName: firstName || input.recipient.name,
      lastName: rest.join(" ") || firstName || input.recipient.name,
      addressLine1: input.recipient.address1,
      ...(input.recipient.address2 ? { addressLine2: input.recipient.address2 } : {}),
      city: input.recipient.city,
      postCode: input.recipient.postalCode,
      country: input.recipient.countryCode,
      ...(input.recipient.state ? { state: input.recipient.state } : {}),
      email: input.recipient.email,
      ...(input.recipient.phone ? { phone: input.recipient.phone } : {}),
    },
  };
}

export function gelatoAdapter(fetchImpl?: FetchLike): PodAdapter {
  const request = <T>(path: string, init: RequestInit = {}) => {
    const { apiKey, baseUrl } = gelatoConfig();
    return podRequest<T>("GELATO", `${baseUrl}${path}`, { ...init, fetchImpl, headers: { "X-API-KEY": apiKey || "", "Content-Type": "application/json", Accept: "application/json" } });
  };
  // Gelato answers 404 for an order that no longer exists: a draft deleted (by us or in the Gelato dashboard).
  const orderOrGone = async (providerOrderId: string) => {
    try {
      return (await request<GelatoOrder>(`/v4/orders/${encodeURIComponent(providerOrderId)}`)).body;
    } catch (reason) {
      if (reason instanceof PodApiError && reason.status === 404) return null;
      throw reason;
    }
  };
  const gone = (providerOrderId: string): ProviderOrderState => ({ providerOrderId, providerStatus: "deleted at Gelato", status: "CANCELLED", problem: null });
  return {
    provider: "GELATO",
    configurationProblem: () => (gelatoConfig().apiKey ? null : "GELATO_API_KEY is not set"),
    async submit(input) {
      const { body } = await request<GelatoOrder>("/v4/orders", { method: "POST", body: JSON.stringify(buildGelatoOrder(input)) });
      if (!body?.id) throw new Error("Gelato did not return an order id");
      return { ...parseGelatoOrder(body), raw: { id: body.id, orderType: body.orderType, fulfillmentStatus: body.fulfillmentStatus, financialStatus: body.financialStatus } };
    },
    // Gelato has no idempotency key; before re-sending an order whose result is unknown we look it up.
    async findByReference(reference) {
      const { body } = await request<{ orders?: GelatoOrder[] }>("/v4/orders:search", { method: "POST", body: JSON.stringify({ orderReferenceIds: [reference], limit: 10 }) });
      const match = (body.orders || []).find((order) => order.orderReferenceId === reference);
      return match ? parseGelatoOrder(match) : null;
    },
    // Converts the draft into a real order (Gelato then produces and charges it).
    async confirmDraft(providerOrderId) {
      const { body } = await request<GelatoOrder>(`/v4/orders/${encodeURIComponent(providerOrderId)}`, { method: "PATCH", body: JSON.stringify({ orderType: "order" }) });
      return parseGelatoOrder(body);
    },
    // A draft is deleted (DELETE /v4/orders/{id}); a real order is cancelled (POST /v4/orders/{id}:cancel),
    // which Gelato only allows before it is passed to production.
    async cancel(providerOrderId) {
      const id = encodeURIComponent(providerOrderId);
      const current = await orderOrGone(providerOrderId);
      if (!current) return gone(providerOrderId);
      if ((current.orderType || "").toLowerCase() === "draft") {
        await request<unknown>(`/v4/orders/${id}`, { method: "DELETE" });
        return { providerOrderId, providerStatus: "draft deleted", status: "CANCELLED", problem: null, raw: { deleted: true } };
      }
      await request<unknown>(`/v4/orders/${id}:cancel`, { method: "POST" });
      const { body } = await request<GelatoOrder>(`/v4/orders/${id}`);
      const state = parseGelatoOrder(body);
      if (state.status !== "CANCELLED") throw new PodApiError("GELATO", 409, `Gelato did not cancel the order (status: ${state.providerStatus})`, false);
      return { ...state, raw: { fulfillmentStatus: body.fulfillmentStatus } };
    },
    async fetchStatus(providerOrderId) {
      const body = await orderOrGone(providerOrderId);
      if (!body) return gone(providerOrderId);
      return body?.id ? { ...parseGelatoOrder(body), raw: { fulfillmentStatus: body.fulfillmentStatus, financialStatus: body.financialStatus } } : null;
    },
  };
}
