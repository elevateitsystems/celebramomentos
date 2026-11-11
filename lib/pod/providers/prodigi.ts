// Prodigi Print API v4 — https://www.prodigi.com/print-api/docs/
// Auth: X-API-Key. Live: api.prodigi.com/v4.0, sandbox: api.sandbox.prodigi.com/v4.0.
// Order creation is idempotent through `idempotencyKey`; status changes are pushed
// to the per-order `callbackUrl` (we re-read the order instead of trusting the push).
import { prodigiConfig, webhookUrl } from "../config";
import { PodApiError, podRequest, type FetchLike } from "../http";
import { httpsLink, isoDate, primaryShipment, type Shipment, type TrackingInfo } from "../tracking";
import type { PodAdapter, PodFulfillmentStatus, PodMode, ProviderOrderState, SubmissionInput } from "../types";

type ProdigiShipment = {
  id?: string; status?: string; cancelled?: boolean; dispatchDate?: string; carrier?: { name?: string; service?: string }; tracking?: { number?: string; url?: string };
  fulfillmentLocation?: { countryCode?: string; labCode?: string }; items?: { itemId?: string }[];
};
type ProdigiIssue = { objectId?: string; errorCode?: string; description?: string };
type ProdigiOrder = { id: string; merchantReference?: string; status?: { stage?: string; details?: Record<string, string>; issues?: ProdigiIssue[] }; shipments?: ProdigiShipment[]; items?: { id?: string; merchantReference?: string }[] };

// Prodigi shipments (v4 Order.shipments[]): status Processing / Shipped / Cancelled, the lab's dispatch date,
// carrier, tracking and the order items it contains (Prodigi item ids, mapped back to our line references).
// Prodigi reports no delivery date, delivery estimate or carrier events, so a Prodigi shipment ends at
// "shipped"; its tracking link opens the carrier's own page.
export function prodigiTracking(order: ProdigiOrder): TrackingInfo {
  const lineRef = new Map((order.items || []).filter((item) => item.id).map((item) => [item.id!, item.merchantReference || null]));
  const shipments: Shipment[] = (order.shipments || []).map((shipment, index) => {
    const status = shipment.cancelled || /cancel/i.test(shipment.status || "") ? "cancelled" : /shipped/i.test(shipment.status || "") || shipment.tracking?.number ? "shipped" : "pending";
    const shippedAt = isoDate(shipment.dispatchDate);
    const origin = shipment.fulfillmentLocation?.countryCode || null;
    return {
      id: shipment.id || `prodigi-${shipment.tracking?.number || index}`,
      carrier: shipment.carrier?.name || null,
      service: shipment.carrier?.service || null,
      trackingNumber: shipment.tracking?.number || null,
      trackingUrl: httpsLink(shipment.tracking?.url),
      status,
      shippedAt: status === "shipped" ? shippedAt : null,
      deliveredAt: null,
      estimatedDelivery: null,
      location: origin && status === "shipped" ? `Dispatched from ${origin}` : null,
      items: (shipment.items || []).map((item) => ({ itemId: (item.itemId && lineRef.get(item.itemId)) || null, quantity: null })),
      events: status === "shipped" && shippedAt ? [{ at: shippedAt, description: `Dispatched by the Prodigi lab${shipment.fulfillmentLocation?.labCode ? ` ${shipment.fulfillmentLocation.labCode}` : ""}`, location: origin }] : [],
    };
  });
  return { shipments, estimatedDelivery: null, expectedDispatch: null };
}

// Prodigi stages: InProgress, Complete (every shipment sent), Cancelled (details tell where in production it is).
export function parseProdigiOrder(order: ProdigiOrder): ProviderOrderState {
  const stage = order.status?.stage || "InProgress";
  const details = order.status?.details || {};
  const tracking = prodigiTracking(order);
  const live = tracking.shipments.filter((shipment) => shipment.status !== "cancelled");
  const sent = live.filter((shipment) => shipment.status === "shipped");
  // Partially shipped: one parcel left while another is still being made.
  const partial = sent.length > 0 && sent.length < live.length;
  let status: PodFulfillmentStatus = "SUBMITTED";
  if (/cancel/i.test(stage)) status = "CANCELLED";
  else if (/complete/i.test(stage) || (sent.length && !partial)) status = "SHIPPED";
  else if (partial || /inprogress|complete/i.test(details.inProduction || "") || /inprogress/i.test(details.shipping || "")) status = "IN_PRODUCTION";
  // Problems Prodigi reports (e.g. an asset it could not download) and production steps in "Error".
  const issues = (order.status?.issues || []).map((issue) => [issue.errorCode, issue.description].filter(Boolean).join(": ")).filter(Boolean);
  const failedSteps = Object.entries(details).filter(([, value]) => /error/i.test(value)).map(([step]) => step);
  const problem = issues.length || failedSteps.length ? `Prodigi reports: ${[...issues, ...failedSteps.map((step) => `${step} failed`)].join(" · ")}`.slice(0, 600) : null;
  const main = primaryShipment(tracking);
  return {
    providerOrderId: order.id,
    providerStatus: partial && status === "IN_PRODUCTION" ? `${stage} · partially shipped (${sent.length} of ${live.length})` : stage,
    status,
    problem,
    carrier: main && main.status !== "pending" ? [main.carrier, main.service].filter(Boolean).join(" · ") || null : null,
    trackingNumber: main?.trackingNumber || null,
    trackingUrl: main?.trackingUrl || null,
    tracking,
  };
}

export function buildProdigiOrder(input: SubmissionInput) {
  // Only a public https address is given to Prodigi (a local one could never be reached).
  const callbackUrl = /^https:\/\/(?!localhost|127\.)/.test(webhookUrl("prodigi")) ? webhookUrl("prodigi") : null;
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
      // outcome: Created, CreatedWithIssues (created, but Prodigi found a problem: see status.issues) or
      // AlreadyExists (the same idempotencyKey was sent before: the existing order is returned).
      const { body } = await request<{ outcome?: string; order?: ProdigiOrder }>(input.mode, "/Orders", { method: "POST", body: JSON.stringify(buildProdigiOrder(input)) });
      if (!body.order?.id) throw new Error(`Prodigi did not return an order (${body.outcome || "no outcome"})`);
      return { ...parseProdigiOrder(body.order), raw: { outcome: body.outcome, id: body.order.id, status: body.order.status } };
    },
    // The idempotencyKey already stops a repeated POST from creating a second order; this lookup by our
    // reference (GET /Orders?merchantReferences=) recovers an interrupted submission without sending again.
    async findByReference(reference, mode) {
      const { body } = await request<{ orders?: ProdigiOrder[] }>(mode, `/Orders?merchantReferences=${encodeURIComponent(reference)}&top=5`);
      const match = (body.orders || []).find((order) => order.merchantReference === reference);
      return match ? { ...parseProdigiOrder(match), raw: { id: match.id, status: match.status } } : null;
    },
    // POST /Orders/{id}/actions/cancel. Prodigi only cancels before production starts; otherwise it answers
    // with another outcome (e.g. FailedToCancel / ActionNotAvailable) and the order goes on.
    async cancel(providerOrderId, mode) {
      const { body } = await request<{ outcome?: string; order?: ProdigiOrder }>(mode, `/Orders/${encodeURIComponent(providerOrderId)}/actions/cancel`, { method: "POST" });
      // Already cancelled (e.g. a second click): Prodigi answers ActionNotAvailable with the cancelled order.
      const cancelled = /^cancelled$/i.test(body.outcome || "") || /cancel/i.test(body.order?.status?.stage || "");
      if (!cancelled || !body.order) throw new PodApiError("PRODIGI", 409, `Prodigi did not cancel the order (${body.outcome || "no outcome"}${body.order?.status?.stage ? `, stage ${body.order.status.stage}` : ""}): production has probably started`, false, { outcome: body.outcome });
      return { ...parseProdigiOrder(body.order), status: "CANCELLED", raw: { outcome: body.outcome, status: body.order.status } };
    },
    async fetchStatus(providerOrderId, mode) {
      const { body } = await request<{ order?: ProdigiOrder }>(mode, `/Orders/${encodeURIComponent(providerOrderId)}`);
      return body.order ? { ...parseProdigiOrder(body.order), raw: { status: body.order.status, shipments: body.order.shipments } } : null;
    },
  };
}
