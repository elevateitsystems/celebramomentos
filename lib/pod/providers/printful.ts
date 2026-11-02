// Printful API (v1) — https://developers.printful.com/docs/
// Auth: Authorization: Bearer <private token>; X-PF-Store-Id selects the store
// ("Celebra Momentos Store"). Draft mode creates orders with confirm=false: Printful
// neither produces nor charges a draft until it is confirmed.
import { printfulConfig } from "../config";
import { PodApiError, podRequest, type FetchLike } from "../http";
import type { PodAdapter, PodFulfillmentStatus, ProviderOrderState, SubmissionInput } from "../types";

type PrintfulShipment = { carrier?: string; service?: string; tracking_number?: string; tracking_url?: string; status?: string };
type PrintfulOrder = { id: number; external_id?: string; status?: string; shipments?: PrintfulShipment[] };

const STATUS: Record<string, PodFulfillmentStatus> = {
  draft: "SUBMITTED",
  pending: "SUBMITTED",
  onhold: "IN_PRODUCTION",
  inprocess: "IN_PRODUCTION",
  partial: "SHIPPED",
  fulfilled: "SHIPPED",
  canceled: "CANCELLED",
  failed: "FAILED",
};

export function parsePrintfulOrder(order: PrintfulOrder): ProviderOrderState {
  const raw = (order.status || "draft").toLowerCase();
  const shipment = (order.shipments || []).find((item) => item.tracking_number || item.tracking_url);
  return {
    providerOrderId: String(order.id),
    providerStatus: raw,
    status: STATUS[raw] ?? "SUBMITTED",
    carrier: shipment ? [shipment.carrier, shipment.service].filter(Boolean).join(" · ") || null : null,
    trackingNumber: shipment?.tracking_number || null,
    trackingUrl: shipment?.tracking_url || null,
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

export function printfulAdapter(fetchImpl?: FetchLike): PodAdapter {
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
    async fetchStatus(providerOrderId) {
      const { body } = await request<{ result?: PrintfulOrder }>(`/orders/${encodeURIComponent(providerOrderId)}`);
      return body.result ? { ...parsePrintfulOrder(body.result), raw: { status: body.result.status, shipments: body.result.shipments } } : null;
    },
  };
}
