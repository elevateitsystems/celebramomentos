// Prodigi Print API v4 — https://www.prodigi.com/print-api/docs/
// Auth: X-API-Key. Live: api.prodigi.com/v4.0, sandbox: api.sandbox.prodigi.com/v4.0.
// Order creation is idempotent through `idempotencyKey`; status changes are pushed
// to the per-order `callbackUrl` (we re-read the order instead of trusting the push).
import { prodigiConfig, webhookUrl } from "../config";
import { podRequest, type FetchLike } from "../http";
import type { PodAdapter, PodFulfillmentStatus, PodMode, ProviderOrderState, SubmissionInput } from "../types";

type ProdigiShipment = { status?: string; carrier?: { name?: string; service?: string }; tracking?: { number?: string; url?: string } };
type ProdigiOrder = { id: string; status?: { stage?: string; details?: Record<string, string> }; shipments?: ProdigiShipment[] };

// Prodigi stages: InProgress, Complete, Cancelled (details tell where in production it is).
export function parseProdigiOrder(order: ProdigiOrder): ProviderOrderState {
  const stage = order.status?.stage || "InProgress";
  const details = order.status?.details || {};
  const shipped = (order.shipments || []).find((shipment) => /shipped/i.test(shipment.status || "") || shipment.tracking?.number);
  let status: PodFulfillmentStatus = "SUBMITTED";
  if (/cancel/i.test(stage)) status = "CANCELLED";
  else if (/complete/i.test(stage) || shipped) status = "SHIPPED";
  else if (/inprogress|complete/i.test(details.inProduction || "") || /inprogress/i.test(details.shipping || "")) status = "IN_PRODUCTION";
  return {
    providerOrderId: order.id,
    providerStatus: stage,
    status,
    carrier: shipped ? [shipped.carrier?.name, shipped.carrier?.service].filter(Boolean).join(" · ") || null : null,
    trackingNumber: shipped?.tracking?.number || null,
    trackingUrl: shipped?.tracking?.url || null,
  };
}

export function buildProdigiOrder(input: SubmissionInput) {
  const callbackUrl = webhookUrl("prodigi");
  return {
    merchantReference: input.reference,
    idempotencyKey: input.reference,
    // Express is not offered for Spain/Portugal on the products we sell (quotes checked 2026-11-01).
    shippingMethod: "Standard",
    ...(callbackUrl ? { callbackUrl } : {}),
    recipient: {
      name: input.recipient.name,
      email: input.recipient.email,
      ...(input.recipient.phone ? { phoneNumber: input.recipient.phone } : {}),
      address: {
        line1: input.recipient.address1,
        ...(input.recipient.address2 ? { line2: input.recipient.address2 } : {}),
        postalOrZipCode: input.recipient.postalCode,
        countryCode: input.recipient.countryCode,
        townOrCity: input.recipient.city,
        ...(input.recipient.state ? { stateOrCounty: input.recipient.state } : {}),
      },
    },
    items: input.lines.map((line) => ({
      merchantReference: line.itemId,
      sku: line.productRef,
      copies: line.quantity,
      sizing: "fillPrintArea",
      assets: line.files.map((file) => ({ printArea: file.area, url: file.url })),
    })),
  };
}

export function prodigiAdapter(fetchImpl?: FetchLike): PodAdapter {
  const request = <T>(mode: PodMode, path: string, init: RequestInit = {}) => {
    const { apiKey, baseUrl } = prodigiConfig(mode);
    return podRequest<T>("PRODIGI", `${baseUrl}${path}`, { ...init, fetchImpl, headers: { "X-API-Key": apiKey || "", "Content-Type": "application/json", Accept: "application/json" } });
  };
  return {
    provider: "PRODIGI",
    configurationProblem(mode) {
      if (prodigiConfig(mode).apiKey) return null;
      return mode === "live" ? "PRODIGI_API_KEY is not set" : "Draft mode sends Prodigi orders to the sandbox, which needs PRODIGI_SANDBOX_API_KEY (the configured PRODIGI_API_KEY is a live key)";
    },
    async submit(input) {
      const { body } = await request<{ outcome?: string; order?: ProdigiOrder }>(input.mode, "/Orders", { method: "POST", body: JSON.stringify(buildProdigiOrder(input)) });
      if (!body.order?.id) throw new Error(`Prodigi did not return an order (${body.outcome || "no outcome"})`);
      return { ...parseProdigiOrder(body.order), raw: { outcome: body.outcome, id: body.order.id, status: body.order.status } };
    },
    // idempotencyKey makes a repeated POST return the same order, so no lookup is needed.
    async findByReference() { return null; },
    async fetchStatus(providerOrderId, mode) {
      const { body } = await request<{ order?: ProdigiOrder }>(mode, `/Orders/${encodeURIComponent(providerOrderId)}`);
      return body.order ? { ...parseProdigiOrder(body.order), raw: { status: body.order.status, shipments: body.order.shipments } } : null;
    },
  };
}
