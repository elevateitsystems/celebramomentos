// Shipment tracking, the same shape for every print shop. Pure (no I/O), unit tested.
//
// Each shop reports shipments differently (Prodigi `shipments[]`, Gelato `shipment.packages[]` and item
// fulfillments, Printful `/v2/orders/{id}/shipments`, Printeers `shipments[]` inside the order); the
// adapters turn them into `Shipment`s, and `mergeTracking` folds every new reading into what is stored
// (PodFulfillment.tracking), so:
// - an order can have several shipments (partial shipments, several parcels, a reshipment), each with
//   its own tracking number, carrier and items;
// - tracking events are kept once each (a webhook and a scheduled check reading the same event store it
//   once), oldest first, and an event never disappears because a later reading left it out;
// - a value a shop stops sending (e.g. no tracking URL in a later reading) keeps the last known value.

// One step in a shipment's history as the carrier / print shop reports it.
export type TrackingEvent = { at: string | null; description: string; location: string | null };

// Delivery state of one shipment, as far as the shop tells it.
export type ShipmentStatus = "pending" | "shipped" | "in_transit" | "delivered" | "returned" | "cancelled" | "unknown";

export type ShipmentItem = {
  // Our OrderItem id when the shop echoes our line reference back (Prodigi merchantReference, Printful
  // external_id, Gelato itemReferenceId); otherwise null and matched by `sku` (Printeers).
  itemId: string | null;
  sku?: string | null;
  quantity: number | null;
};

export type Shipment = {
  // The shop's shipment / package id, or a stable id made from the tracking number.
  id: string;
  carrier: string | null;
  service: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  status: ShipmentStatus;
  shippedAt: string | null;
  deliveredAt: string | null;
  estimatedDelivery: { from: string | null; to: string | null } | null;
  // Where it is now (latest event location) or, when the shop only says that, where it left from.
  location: string | null;
  items: ShipmentItem[];
  events: TrackingEvent[];
};

export type TrackingInfo = {
  shipments: Shipment[];
  // The shop's delivery estimate for the whole order (Gelato, Printful), and when it expects to dispatch it
  // (Printeers expected_shipping, Gelato expectedDispatchDate).
  estimatedDelivery: { from: string | null; to: string | null } | null;
  expectedDispatch: string | null;
  // Status changes of the print order as our syncs saw them (time of the reading, the shop's status), so
  // shops that report no carrier events still have a history. Kept by us, never sent by a shop.
  history?: TrackingEvent[];
};

export const EMPTY_TRACKING: TrackingInfo = { shipments: [], estimatedDelivery: null, expectedDispatch: null, history: [] };

const obj = (value: unknown) => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null);
const str = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : typeof value === "number" && Number.isFinite(value) ? String(value) : null);

// A date as ISO 8601, from an ISO string, a date-only string or UNIX seconds (Printful v1); null otherwise.
export function isoDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "" || value === 0) return null;
  const date = typeof value === "number" ? new Date(value < 1e12 ? value * 1000 : value) : typeof value === "string" ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) && date.getUTCFullYear() > 2000 ? date.toISOString() : null;
}

// Only https links are kept (they are shown to admins and customers as links).
export const httpsLink = (value: unknown) => {
  const text = str(value);
  return text && /^https:\/\//i.test(text) ? text.slice(0, 1000) : null;
};

const STATUS_RANK: Record<ShipmentStatus, number> = { unknown: 0, pending: 1, shipped: 2, in_transit: 3, returned: 4, delivered: 5, cancelled: 6 };

function range(value: unknown) {
  const item = obj(value);
  if (!item) return null;
  const from = isoDate(item.from);
  const to = isoDate(item.to);
  return from || to ? { from, to } : null;
}

function readEvent(value: unknown): TrackingEvent | null {
  const item = obj(value);
  const description = str(item?.description);
  return item && description ? { at: isoDate(item.at), description: description.slice(0, 300), location: str(item.location)?.slice(0, 120) ?? null } : null;
}

function readShipment(value: unknown): Shipment | null {
  const item = obj(value);
  const id = str(item?.id);
  if (!item || !id) return null;
  const status = str(item.status) as ShipmentStatus | null;
  return {
    id,
    carrier: str(item.carrier),
    service: str(item.service),
    trackingNumber: str(item.trackingNumber),
    trackingUrl: httpsLink(item.trackingUrl),
    status: status && status in STATUS_RANK ? status : "unknown",
    shippedAt: isoDate(item.shippedAt),
    deliveredAt: isoDate(item.deliveredAt),
    estimatedDelivery: range(item.estimatedDelivery),
    location: str(item.location),
    items: (Array.isArray(item.items) ? item.items : []).map(obj).filter(Boolean).map((line) => ({ itemId: str(line!.itemId), sku: str(line!.sku), quantity: typeof line!.quantity === "number" ? line!.quantity : null })),
    events: (Array.isArray(item.events) ? item.events : []).map(readEvent).filter((event): event is TrackingEvent => Boolean(event)),
  };
}

// Reads what is stored in PodFulfillment.tracking (anything malformed is dropped, never thrown).
export function readTracking(value: unknown): TrackingInfo {
  const item = obj(value);
  if (!item) return { ...EMPTY_TRACKING, shipments: [], history: [] };
  return {
    shipments: (Array.isArray(item.shipments) ? item.shipments : []).map(readShipment).filter((shipment): shipment is Shipment => Boolean(shipment)),
    estimatedDelivery: range(item.estimatedDelivery),
    expectedDispatch: isoDate(item.expectedDispatch),
    history: (Array.isArray(item.history) ? item.history : []).map(readEvent).filter((event): event is TrackingEvent => Boolean(event)),
  };
}

const eventKey = (event: TrackingEvent) => `${event.at ?? ""}|${event.description.toLowerCase().replace(/\s+/g, " ")}`;

// Events of both readings, each once, oldest first (events without a time keep their order, last).
export function mergeEvents(previous: TrackingEvent[], next: TrackingEvent[]) {
  const seen = new Map<string, TrackingEvent>();
  for (const event of [...previous, ...next]) {
    const key = eventKey(event);
    const known = seen.get(key);
    seen.set(key, known ? { ...known, location: event.location ?? known.location } : event);
  }
  const events = Array.from(seen.values());
  const timed = events.filter((event) => event.at).sort((a, b) => a.at!.localeCompare(b.at!));
  return [...timed, ...events.filter((event) => !event.at)].slice(-100);
}

function mergeShipment(previous: Shipment, next: Shipment): Shipment {
  const events = mergeEvents(previous.events, next.events);
  // A shipment never goes back (e.g. "delivered" is not undone by a late "in transit" reading), except to
  // cancelled / returned, which the shop reports explicitly.
  const status = STATUS_RANK[next.status] >= STATUS_RANK[previous.status] || next.status === "returned" ? next.status : previous.status;
  return {
    id: previous.id,
    carrier: next.carrier ?? previous.carrier,
    service: next.service ?? previous.service,
    trackingNumber: next.trackingNumber ?? previous.trackingNumber,
    trackingUrl: next.trackingUrl ?? previous.trackingUrl,
    status,
    shippedAt: next.shippedAt ?? previous.shippedAt,
    deliveredAt: next.deliveredAt ?? previous.deliveredAt,
    estimatedDelivery: next.estimatedDelivery ?? previous.estimatedDelivery,
    location: next.location ?? (events[events.length - 1]?.location || previous.location),
    items: next.items.length ? next.items : previous.items,
    events,
  };
}

// Same shipment in two readings: same shop id, or (for shops whose ids we make up) the same tracking number.
const sameShipment = (a: Shipment, b: Shipment) => a.id === b.id || Boolean(a.trackingNumber && a.trackingNumber === b.trackingNumber);

export function mergeTracking(previous: TrackingInfo, next: TrackingInfo): TrackingInfo {
  const shipments = previous.shipments.map((shipment) => ({ ...shipment }));
  for (const incoming of next.shipments) {
    const index = shipments.findIndex((shipment) => sameShipment(shipment, incoming));
    if (index >= 0) shipments[index] = mergeShipment(shipments[index], incoming);
    else shipments.push({ ...incoming, events: mergeEvents([], incoming.events) });
  }
  return {
    shipments: shipments.slice(-20),
    estimatedDelivery: next.estimatedDelivery ?? previous.estimatedDelivery,
    expectedDispatch: next.expectedDispatch ?? previous.expectedDispatch,
    history: mergeEvents(previous.history || [], next.history || []).slice(-50),
  };
}

// Records a status change seen by a sync (nothing when the status did not change).
export function withStatusChange(info: TrackingInfo, previousStatus: string | null, nextStatus: string, label: string, at = new Date()): TrackingInfo {
  if (!nextStatus || previousStatus === nextStatus) return info;
  return { ...info, history: mergeEvents(info.history || [], [{ at: at.toISOString(), description: `${label}: ${nextStatus}`, location: null }]).slice(-50) };
}

// The shipment shown first: the latest one that has tracking, else the latest one.
export function primaryShipment(info: TrackingInfo) {
  const live = info.shipments.filter((shipment) => shipment.status !== "cancelled");
  const tracked = live.filter((shipment) => shipment.trackingNumber || shipment.trackingUrl);
  const byDate = (list: Shipment[]) => [...list].sort((a, b) => (a.shippedAt || "").localeCompare(b.shippedAt || ""));
  return byDate(tracked).pop() || byDate(live).pop() || null;
}

export function latestEvent(info: TrackingInfo) {
  const events = info.shipments.flatMap((shipment) => shipment.events.map((event) => ({ ...event, shipmentId: shipment.id })));
  return events.filter((event) => event.at).sort((a, b) => a.at!.localeCompare(b.at!)).pop() || events.pop() || null;
}

// Dates for the PodFulfillment columns: first dispatch, and the last delivery once every shipment that
// left arrived.
export function trackingDates(info: TrackingInfo) {
  const live = info.shipments.filter((shipment) => shipment.status !== "cancelled");
  const shipped = live.map((shipment) => shipment.shippedAt).filter(Boolean).sort() as string[];
  const sent = live.filter((shipment) => shipment.status !== "pending");
  const delivered = sent.length && sent.every((shipment) => shipment.status === "delivered") ? (sent.map((shipment) => shipment.deliveredAt).filter(Boolean).sort().pop() as string | undefined) ?? null : null;
  return { shippedAt: shipped[0] ?? null, deliveredAt: delivered };
}

// Our line reference → OrderItem id: an item made of several print units is sent as "<item id>-<unit>".
export const baseItemId = (reference: string | null, itemIds: string[]) => {
  if (!reference) return null;
  if (itemIds.includes(reference)) return reference;
  const base = reference.replace(/-\d+$/, "");
  return itemIds.includes(base) ? base : null;
};

// Fills in our item ids (from the line reference, or the shop SKU for shops that do not echo our ids).
export function resolveItems(info: TrackingInfo, items: { id: string; podProductRef: string | null }[]): TrackingInfo {
  const ids = items.map((item) => item.id);
  return {
    ...info,
    shipments: info.shipments.map((shipment) => ({
      ...shipment,
      items: shipment.items.map((line) => ({ ...line, itemId: baseItemId(line.itemId, ids) ?? (line.sku ? items.find((item) => item.podProductRef === line.sku)?.id ?? null : null) })),
    })),
  };
}

// Per order item: has it left the shop / arrived, and in which shipment(s). Items no shipment mentions
// are "pending" (still being made) unless the shop gave no item breakdown at all, in which case every
// item shares the order's shipments.
export type ItemShipping = { itemId: string; state: "pending" | "shipped" | "delivered"; shipmentIds: string[] };

export function itemShipping(info: TrackingInfo, itemIds: string[]): ItemShipping[] {
  const live = info.shipments.filter((shipment) => shipment.status !== "cancelled" && shipment.status !== "pending");
  const itemised = live.some((shipment) => shipment.items.some((line) => line.itemId));
  return itemIds.map((itemId) => {
    const mine = itemised ? live.filter((shipment) => shipment.items.some((line) => line.itemId === itemId)) : live;
    const state = !mine.length ? "pending" : mine.every((shipment) => shipment.status === "delivered") ? "delivered" : "shipped";
    return { itemId, state, shipmentIds: mine.map((shipment) => shipment.id) };
  });
}
