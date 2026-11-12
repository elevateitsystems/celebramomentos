// Printeers (phone cases), API v1. Draft mode sends to the Printeers test environment, where
// orders are never produced or invoiced; live mode sends real dropship orders.
//
// Sending an order:
// 1. the print file (already rendered at the product's print shape, see lib/pod/catalog.ts)
//    is uploaded with POST /images (base64) — Printeers takes no crop or placement on an
//    order line, so the uploaded image must be the final artwork;
// 2. POST /orders with `partner_reference` = a short hash of our reference, unique per
//    store, so a retry cannot create a second order (`non_unique_partner_reference` → the
//    existing order is looked up instead).
// Status and tracking both come from GET /orders/{reference} (shipments are part of the order).
import { createHash } from "crypto";
import { printeersApiVersion, printeersConfig, type PrinteersShippingLevel } from "../config";
import { PodApiError, type FetchLike } from "../http";
import { printeersApi, printeersErrorCode, type PrinteersAddress, type PrinteersOrder } from "../printeers/api";
import { printeersV2, storeReference, type V2Address, type V2Order, type V2Shipment, type V2ShippingLevel } from "../printeers/api-v2";
import { httpsLink, isoDate, primaryShipment, type Shipment, type TrackingInfo } from "../tracking";
import type { PodAdapter, PodFulfillmentStatus, PodMode, ProviderOrderState, Recipient, SubmissionInput } from "../types";

// Printeers' partner_reference allows ^[a-zA-Z0-9_-]{1,20}$. Our fulfilment reference
// ("CM-1762500000000-AB12CD34-PRT") is longer, so the identifier is "P" + 19 hex digits of its
// SHA-256: deterministic (the same reference always gives the same identifier) and collision
// free for any practical purpose (76 bits).
export function printeersIdentifier(reference: string) {
  return `P${createHash("sha256").update(reference).digest("hex").slice(0, 19)}`;
}

// "Ana María López" → first name "Ana", last name "María López".
export function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return { firstname: parts[0] || "", lastname: parts.slice(1).join(" ") };
}

// "Calle de la Paz, 12, 3ºB" → street "Calle de la Paz", number "12", addition "3ºB".
// Addresses without a recognisable number keep the whole line as the street.
export function splitStreet(line: string) {
  const text = line.trim().replace(/\s+/g, " ");
  const match = text.match(/^(.*?\D)[,\s]+(?:n[ºo°.]?\s*)?(\d{1,5}[a-zA-Z]?)(?:\s*[,\s-]\s*(.+))?$/i);
  if (!match || !match[1].trim()) return { streetname: text, housenumber: "", housenumberAddition: "" };
  return { streetname: match[1].replace(/[,\s]+$/, "").trim(), housenumber: match[2], housenumberAddition: (match[3] || "").trim() };
}

const COUNTRY_PREFIX: Record<string, string> = { ES: "+34", PT: "+351" };

// Printeers asks for an international number with a leading plus.
export function internationalPhone(phone: string | null, countryCode: string) {
  const digits = (phone || "").replace(/[^\d+]/g, "");
  if (!digits) return "";
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  const prefix = COUNTRY_PREFIX[countryCode];
  return prefix ? `${prefix}${digits.replace(/^0+/, "")}` : `+${digits}`;
}

export function printeersAddress(recipient: Recipient): PrinteersAddress {
  const { streetname, housenumber, housenumberAddition } = splitStreet(recipient.address1);
  return {
    company: "",
    ...splitName(recipient.name),
    streetname,
    housenumber,
    housenumber_addition: housenumberAddition,
    additional_info: recipient.address2 || "",
    // Only used for the US and Italy; this shop ships to Spain and Portugal.
    state: recipient.state || "",
    zipcode: recipient.postalCode,
    city: recipient.city,
    country_code: recipient.countryCode,
    phonenumber: internationalPhone(recipient.phone, recipient.countryCode),
    email: recipient.email,
  };
}

// Order status codes (V1): pending, backorder, in_production, printed, partially_shipped, completed, canceled.
export function printeersStatus(order: Pick<PrinteersOrder, "status_code" | "status_human_readable">): { status: PodFulfillmentStatus; label: string } {
  const code = order.status_code || "pending";
  const status: PodFulfillmentStatus = code === "canceled" ? "CANCELLED" : code === "completed" ? "SHIPPED" : code === "in_production" || code === "printed" || code === "partially_shipped" ? "IN_PRODUCTION" : "SUBMITTED";
  return { status, label: order.status_human_readable ? `${code} · ${order.status_human_readable}` : code };
}

// Printeers (v1) shipments live inside the order: when it was created (sent), shipper, method, track & trace
// and the order lines (with quantities) it holds. Lines are matched to our items by SKU. Printeers gives no
// delivery date, estimate or carrier events; expected_shipping is when it plans to dispatch.
export function printeersTracking(order: Pick<PrinteersOrder, "shipments" | "lines" | "expected_shipping">): TrackingInfo {
  const skuOf = new Map((order.lines || []).map((line) => [line.linenumber, line.item_sku]));
  const shipments: Shipment[] = (order.shipments || []).map((shipment, index) => {
    const shippedAt = isoDate(shipment.created);
    return {
      id: `printeers-${shipment.track_and_trace_code || shipment.created || index}`,
      carrier: shipment.shipper || null,
      service: shipment.shipping_method || null,
      trackingNumber: shipment.track_and_trace_code || null,
      trackingUrl: httpsLink(shipment.track_and_trace_url),
      status: "shipped",
      shippedAt,
      deliveredAt: null,
      estimatedDelivery: null,
      location: null,
      items: (shipment.lines || []).map((line) => ({ itemId: null, sku: skuOf.get(line.linenumber) || null, quantity: line.quantity })),
      events: shippedAt ? [{ at: shippedAt, description: `Shipped by Printeers${shipment.shipper ? ` with ${shipment.shipper}` : ""}`, location: null }] : [],
    };
  });
  return { shipments, estimatedDelivery: null, expectedDispatch: isoDate(order.expected_shipping) };
}

// ── API v2 ───────────────────────────────────────────────────────────────────
// Same flow as v1, in v2 terms: images are uploaded as raw bytes, the order carries our identifier as
// `customIdentifier` (unique per store: a retry finds the existing order instead of creating a second one),
// shipments are read from /shipments/{ref} (carrier, tracking, the order lines each holds) and a
// cancellation sets every unshipped line's canceled quantity (idempotent).
const V2_LEVEL: Record<PrinteersShippingLevel, V2ShippingLevel> = { normal: "basic", tracked: "tracked", premium: "express" };

export function printeersV2Address(recipient: Recipient): V2Address {
  const address = printeersAddress(recipient);
  return {
    company: address.company, firstname: address.firstname, lastname: address.lastname, streetname: address.streetname, housenumber: address.housenumber,
    housenumberAddition: address.housenumber_addition, additionalInfo: address.additional_info, state: address.state, zipcode: address.zipcode,
    city: address.city, countryCode: address.country_code, phonenumber: address.phonenumber, email: address.email,
  };
}

// v2 status codes: pending, backorder, in_production, printed, completed, canceled. An open order that
// already has a shipment is partially shipped (v2 has no code for it).
export function printeersV2Status(order: Pick<V2Order, "status" | "shipments">): { status: PodFulfillmentStatus; label: string } {
  const code = order.status?.code || "pending";
  const partial = order.status?.open && (order.shipments || []).length > 0 && code !== "canceled";
  const status: PodFulfillmentStatus = code === "canceled" ? "CANCELLED" : code === "completed" ? "SHIPPED" : partial || code === "in_production" || code === "printed" ? "IN_PRODUCTION" : "SUBMITTED";
  return { status, label: partial ? `${code} · partially shipped` : code };
}

export function printeersV2Tracking(order: Pick<V2Order, "reference" | "orderlines" | "status">, shipments: V2Shipment[]): TrackingInfo {
  const productOf = new Map((order.orderlines || []).map((line) => [line.index, line.productReference]));
  return {
    shipments: shipments.map((shipment) => {
      const shippedAt = isoDate(shipment.created);
      const mine = (shipment.orders || []).find((entry) => entry.orderReference === order.reference);
      return {
        id: shipment.reference,
        carrier: shipment.carrier || null,
        service: shipment.shippingLevel || null,
        trackingNumber: shipment.trackingNumber || null,
        trackingUrl: httpsLink(shipment.trackingUrl),
        status: "shipped" as const,
        shippedAt,
        deliveredAt: null,
        estimatedDelivery: null,
        location: null,
        items: (mine?.orderlines || []).map((line) => ({ itemId: null, sku: productOf.get(line.orderlineIndex) || null, quantity: line.quantity })),
        events: shippedAt ? [{ at: shippedAt, description: `Shipped by Printeers${shipment.carrier ? ` with ${shipment.carrier}` : ""}`, location: null }] : [],
      };
    }),
    estimatedDelivery: null,
    expectedDispatch: isoDate(order.status?.expectedShipping),
  };
}

export function printeersV2State(order: V2Order, shipments: V2Shipment[] = []): ProviderOrderState {
  const { status, label } = printeersV2Status(order);
  const tracking = printeersV2Tracking(order, shipments);
  const main = primaryShipment(tracking);
  return {
    providerOrderId: order.reference,
    providerStatus: label,
    status,
    problem: order.onHold?.reason ? `Printeers put the order on hold: ${order.onHold.reason}`.slice(0, 600) : null,
    carrier: main ? [main.carrier, main.service].filter(Boolean).join(" · ") || null : null,
    trackingNumber: main?.trackingNumber || null,
    trackingUrl: main?.trackingUrl || null,
    tracking,
    raw: { reference: order.reference, status: order.status, onHold: order.onHold, shipments: (order.shipments || []).length },
  };
}

export function printeersAdapter(fetchImpl?: FetchLike): PodAdapter {
  const api = (mode: PodMode) => ({ mode, fetchImpl });

  function stateOf(order: PrinteersOrder): ProviderOrderState {
    const { status, label } = printeersStatus(order);
    const tracking = printeersTracking(order);
    const main = primaryShipment(tracking);
    return {
      providerOrderId: order.reference,
      providerStatus: label,
      status,
      carrier: main ? [main.carrier, main.service].filter(Boolean).join(" · ") || null : null,
      trackingNumber: main?.trackingNumber || null,
      trackingUrl: main?.trackingUrl || null,
      tracking,
      raw: { reference: order.reference, status_code: order.status_code, expected_shipping: order.expected_shipping ?? null, shipments: (order.shipments || []).length },
    };
  }

  async function printFile(url: string) {
    const response = await (fetchImpl || fetch)(url, { cache: "no-store" });
    if (!response.ok) throw new PodApiError("PRINTEERS", null, `The print file could not be read (HTTP ${response.status})`, response.status >= 500);
    return new Uint8Array(await response.arrayBuffer());
  }

  const v2 = (mode: PodMode) => ({ mode, fetchImpl });

  // The order with every shipment read from /shipments (a shipment that cannot be read is left out of this
  // reading; the next one picks it up).
  async function v2State(mode: PodMode, reference: string) {
    const order = await printeersV2.order(v2(mode), await printeersV2.orderReference(v2(mode), reference));
    const shipments = await Promise.all((order.shipments || []).map((shipment) => printeersV2.shipment(v2(mode), shipment.reference).catch(() => null)));
    return printeersV2State(order, shipments.filter((shipment): shipment is V2Shipment => Boolean(shipment)));
  }

  // A catalog model is a v2 product reference; orders planned with a v1 SKU are looked up by that SKU.
  async function v2Product(mode: PodMode, productRef: string) {
    if (/^Product_/.test(productRef)) return productRef;
    const found = await printeersV2.productByLegacySku(v2(mode), productRef);
    if (!found) throw new PodApiError("PRINTEERS", null, `Printeers has no product for SKU ${productRef}`, false);
    return found;
  }

  async function submitV2(input: SubmissionInput): Promise<ProviderOrderState> {
    const config = printeersConfig(input.mode);
    const customIdentifier = printeersIdentifier(input.reference);
    // Sent before (e.g. the answer was lost): the existing order is used.
    const known = await printeersV2.orderByCustomIdentifier(v2(input.mode), customIdentifier);
    if (known) return v2State(input.mode, known);
    const orderlines = [];
    for (const line of input.lines) {
      const file = line.files[0];
      if (!line.productRef || !file) throw new PodApiError("PRINTEERS", null, `Item ${line.name} has no Printeers product or print file`, false);
      orderlines.push({ productReference: await v2Product(input.mode, line.productRef), imageReference: await printeersV2.uploadImage(v2(input.mode), await printFile(file.url)), quantity: line.quantity });
    }
    try {
      const reference = await printeersV2.createOrder(v2(input.mode), {
        storeReference: await storeReference(v2(input.mode)),
        customIdentifier,
        brandReference: config.brandReference,
        dropshipAddress: printeersV2Address(input.recipient),
        dropshipMinimalShippingLevel: input.shipping === "express" ? "express" : V2_LEVEL[config.shippingLevel],
        orderlines,
      });
      return { providerOrderId: reference, providerStatus: "pending", status: "SUBMITTED", raw: { reference, customIdentifier, environment: config.environment, api: "v2" } };
    } catch (reason) {
      // 409: this identifier already has an order (a parallel or earlier attempt reached Printeers).
      if (reason instanceof PodApiError && reason.status === 409) {
        const existing = await printeersV2.orderByCustomIdentifier(v2(input.mode), customIdentifier);
        if (existing) return v2State(input.mode, existing);
      }
      throw reason;
    }
  }

  async function cancelV2(mode: PodMode, providerOrderId: string): Promise<ProviderOrderState> {
    const reference = await printeersV2.orderReference(v2(mode), providerOrderId);
    const order = await printeersV2.order(v2(mode), reference);
    if (order.status?.code !== "canceled") {
      const lines = (order.orderlines || []).filter((line) => line.quantity - line.shippedQuantity > line.canceledQuantity).map((line) => ({ index: line.index, canceledQuantity: line.quantity - line.shippedQuantity }));
      if (!lines.length) throw new PodApiError("PRINTEERS", 409, "Printeers did not cancel the order: everything in it has shipped", false);
      try {
        await printeersV2.cancel(v2(mode), reference, lines);
      } catch (reason) {
        if (reason instanceof PodApiError && reason.status === 409) throw new PodApiError("PRINTEERS", 409, `Printeers did not cancel the order: production has probably started (${reason.message.slice(0, 160)})`, false);
        throw reason;
      }
    }
    const state = await v2State(mode, reference);
    if (state.status !== "CANCELLED") throw new PodApiError("PRINTEERS", 409, `Printeers did not cancel the order (status: ${state.providerStatus})`, false);
    return state;
  }

  return {
    provider: "PRINTEERS",
    configurationProblem(mode) {
      if (printeersApiVersion(mode) === "v2") return null;
      const config = printeersConfig(mode);
      const live = mode === "live";
      const missing = [!config.partnerCode && (live ? "PRINTEERS_V1_PARTNER_CODE" : "PRINTEERS_V1_TEST_PARTNER_CODE"), !config.apiKey && (live ? "PRINTEERS_V1_API_KEY" : "PRINTEERS_V1_TEST_API_KEY")].filter(Boolean);
      return missing.length ? `${missing.join(" and ")} ${missing.length > 1 ? "are" : "is"} not set (Printeers ${config.environment} environment, API v1)` : null;
    },
    async submit(input: SubmissionInput) {
      if (printeersApiVersion(input.mode) === "v2") return submitV2(input);
      const config = printeersConfig(input.mode);
      const partnerReference = printeersIdentifier(input.reference);
      const lines = [];
      for (const line of input.lines) {
        const file = line.files[0];
        if (!line.productRef || !file) throw new PodApiError("PRINTEERS", null, `Item ${line.name} has no Printeers product or print file`, false);
        const imageReference = await printeersApi.uploadImage(api(input.mode), await printFile(file.url));
        lines.push({ item_sku: line.productRef, image_reference: imageReference, quantity: line.quantity });
      }
      try {
        const reference = await printeersApi.createOrder(api(input.mode), {
          partner_reference: partnerReference,
          brand_reference: config.brandReference,
          address: printeersAddress(input.recipient),
          // V1 levels: normal (no tracking), tracked, premium. Express orders ask for premium.
          shipping_minimal_level: input.shipping === "express" ? "premium" : config.shippingLevel,
          lines,
        });
        return { providerOrderId: reference, providerStatus: "pending", status: "SUBMITTED", raw: { reference, partnerReference, environment: config.environment } };
      } catch (reason) {
        // This partner_reference already has an order (an earlier attempt reached Printeers).
        if (printeersErrorCode(reason) === "non_unique_partner_reference") {
          const existing = await printeersApi.orderByPartnerReference(api(input.mode), partnerReference);
          if (existing) return stateOf(existing);
        }
        throw reason;
      }
    },
    async findByReference(reference, mode) {
      if (printeersApiVersion(mode) === "v2") {
        const found = await printeersV2.orderByCustomIdentifier(v2(mode), printeersIdentifier(reference));
        return found ? v2State(mode, found) : null;
      }
      const existing = await printeersApi.orderByPartnerReference(api(mode), printeersIdentifier(reference));
      return existing ? stateOf(existing) : null;
    },
    async cancel(providerOrderId, mode) {
      if (printeersApiVersion(mode) === "v2") return cancelV2(mode, providerOrderId);
      await printeersApi.cancelOrder(api(mode), providerOrderId);
      const state = stateOf(await printeersApi.order(api(mode), providerOrderId));
      if (state.status !== "CANCELLED") throw new PodApiError("PRINTEERS", 409, `Printeers did not cancel the order (status: ${state.providerStatus})`, false);
      return state;
    },
    async fetchStatus(providerOrderId, mode) {
      if (printeersApiVersion(mode) === "v2") return v2State(mode, providerOrderId);
      return stateOf(await printeersApi.order(api(mode), providerOrderId));
    },
  };
}
