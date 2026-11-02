// Gelato Order API v4 — https://dashboard.gelato.com/docs/
// Auth: X-API-KEY. Base: https://order.gelatoapis.com. Draft mode creates
// `orderType: "draft"` orders, which Gelato neither produces nor charges.
import { gelatoConfig } from "../config";
import { podRequest, type FetchLike } from "../http";
import type { PodAdapter, PodFulfillmentStatus, ProviderOrderState, SubmissionInput } from "../types";

type GelatoFulfillment = { trackingCode?: string; trackingUrl?: string; shipmentMethodName?: string; fulfillmentStatus?: string };
type GelatoOrder = {
  id: string;
  orderReferenceId?: string;
  orderType?: string;
  fulfillmentStatus?: string;
  financialStatus?: string;
  items?: { fulfillments?: GelatoFulfillment[] | null }[];
  shipment?: { shipmentMethodName?: string; packages?: { trackingCode?: string; trackingUrl?: string }[] } | null;
};

const STATUS: [RegExp, PodFulfillmentStatus][] = [
  [/cancel/, "CANCELLED"],
  [/^failed$/, "FAILED"],
  [/delivered/, "DELIVERED"],
  [/shipped|in_transit/, "SHIPPED"],
  [/printed|in_production|production/, "IN_PRODUCTION"],
];

export function parseGelatoOrder(order: GelatoOrder): ProviderOrderState {
  const raw = (order.fulfillmentStatus || order.orderType || "created").toLowerCase();
  const status = STATUS.find(([pattern]) => pattern.test(raw))?.[1] ?? "SUBMITTED";
  const fulfillment = (order.items || []).flatMap((item) => item.fulfillments || []).find((item) => item.trackingCode || item.trackingUrl);
  const pkg = order.shipment?.packages?.find((item) => item.trackingCode || item.trackingUrl);
  return {
    providerOrderId: order.id,
    providerStatus: raw,
    status,
    carrier: fulfillment?.shipmentMethodName || order.shipment?.shipmentMethodName || null,
    trackingNumber: fulfillment?.trackingCode || pkg?.trackingCode || null,
    trackingUrl: fulfillment?.trackingUrl || pkg?.trackingUrl || null,
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
    async fetchStatus(providerOrderId) {
      const { body } = await request<GelatoOrder>(`/v4/orders/${encodeURIComponent(providerOrderId)}`);
      return body?.id ? { ...parseGelatoOrder(body), raw: { fulfillmentStatus: body.fulfillmentStatus, financialStatus: body.financialStatus } } : null;
    },
  };
}
