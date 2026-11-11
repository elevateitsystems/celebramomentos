import { OrderStatus } from "@prisma/client";
import { STAGE_LABEL, orderStage } from "@/lib/order-progress";
import { podMode } from "@/lib/pod/config";
import { readTracking } from "@/lib/pod/tracking";
import type { PodMode } from "@/lib/pod/types";

const asObject = (value: unknown) => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {});
const httpsUrl = (value: unknown) => (typeof value === "string" && /^https:\/\//.test(value) ? value : null);

// The picture of what the customer designed, saved with the order item: the studio preview of a
// product, or the front page of a card exactly as it was rendered for printing.
export function itemPreview(personalization: unknown) {
  const data = asObject(personalization);
  const fromProduct = httpsUrl(asObject(data.product).preview);
  if (fromProduct) return fromProduct;
  const panels = asObject(asObject(data.card).design).panels;
  const front = Array.isArray(panels) ? panels.map(asObject).find((panel) => panel.side === "front") : null;
  return httpsUrl(front?.url);
}

type PrintTracking = { status: string; carrier: string | null; trackingNumber: string | null; trackingUrl: string | null; tracking?: unknown };

// What the customer sees of each parcel: carrier, number, link, where it is and the latest carrier event.
export type CustomerParcel = { carrier: string | null; number: string | null; url: string | null; status: string | null; shippedAt: string | null; deliveredAt: string | null; latestEvent: { at: string | null; description: string } | null };

export function customerTracking(prints: PrintTracking[]): CustomerParcel[] {
  return prints.filter((item) => item.status !== "CANCELLED").flatMap((item): CustomerParcel[] => {
    const shipments = readTracking(item.tracking).shipments.filter((shipment) => shipment.status !== "cancelled" && shipment.status !== "pending" && (shipment.trackingNumber || shipment.trackingUrl));
    if (!shipments.length) return item.trackingNumber || item.trackingUrl ? [{ carrier: item.carrier, number: item.trackingNumber, url: httpsUrl(item.trackingUrl), status: null, shippedAt: null, deliveredAt: null, latestEvent: null }] : [];
    return shipments.map((shipment) => {
      const event = shipment.events[shipment.events.length - 1];
      return { carrier: shipment.carrier, number: shipment.trackingNumber, url: httpsUrl(shipment.trackingUrl), status: shipment.status, shippedAt: shipment.shippedAt, deliveredAt: shipment.deliveredAt, latestEvent: event ? { at: event.at, description: event.description } : null };
    });
  });
}

// The latest delivery date any print shop estimates for the order (the order arrives when its last parcel does).
export function estimatedDelivery(prints: PrintTracking[]) {
  const ranges = prints.filter((item) => item.status !== "CANCELLED").map((item) => readTracking(item.tracking).estimatedDelivery).filter(Boolean) as { from: string | null; to: string | null }[];
  if (!ranges.length) return null;
  const to = ranges.map((range) => range.to || range.from).filter(Boolean).sort().pop() ?? null;
  const from = ranges.map((range) => range.from || range.to).filter(Boolean).sort().pop() ?? null;
  return { from, to };
}

export function serializeOrder(order: {
  id: string;
  number: string;
  email: string;
  status: OrderStatus;
  totalCents: number;
  createdAt: Date;
  shippingAddress: unknown;
  items: { name: string; quantity: number; personalization?: unknown }[];
  // Print orders (status and shipments). Only those of the shop's current environment are used: real ones
  // when the shop is live, test ones while it is being tested, so a test never changes a real order.
  fulfillments?: { mode: string; status: string; carrier: string | null; trackingNumber: string | null; trackingUrl: string | null; tracking?: unknown; deliveredAt?: Date | null }[];
}, mode: PodMode = podMode()) {
  const prints = (order.fulfillments || []).filter((item) => item.mode === mode);
  const stage = orderStage(order.status, prints);
  const shipping = (order.shippingAddress && typeof order.shippingAddress === "object" ? order.shippingAddress : {}) as Record<string, string>;
  return {
    id: order.number,
    dbId: order.id,
    userId: "",
    email: order.email,
    date: order.createdAt.toISOString(),
    item: order.items.map((item) => item.name + (item.quantity > 1 ? ` × ${item.quantity}` : "")).join(" · "),
    previews: order.items.map((item) => ({ name: item.name, preview: itemPreview(item.personalization) })).filter((item) => item.preview),
    amount: order.totalCents / 100,
    // What the customer sees: the real progress (received → in preparation → shipped → delivered).
    status: STAGE_LABEL[stage],
    stage,
    orderStatus: order.status,
    // Every parcel with tracking (an order can leave in several), from the print orders' shipments.
    tracking: customerTracking(prints),
    estimatedDelivery: stage === "delivered" ? null : estimatedDelivery(prints),
    deliveredAt: stage === "delivered" ? prints.map((item) => item.deliveredAt?.toISOString()).filter(Boolean).sort().pop() ?? null : null,
    shipping: {
      name: shipping.name || "",
      phone: shipping.phone || "",
      recipient: shipping.recipient || "",
      address: shipping.address || "",
      city: shipping.city || "",
      postalCode: shipping.postalCode || "",
      country: shipping.country || "ES",
      billingAddress: shipping.billingAddress,
    },
  };
}
