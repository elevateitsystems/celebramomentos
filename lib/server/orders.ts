import { OrderStatus } from "@prisma/client";
import { STAGE_LABEL, orderStage } from "@/lib/order-progress";
import { podMode } from "@/lib/pod/config";
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
  fulfillments?: { mode: string; status: string; carrier: string | null; trackingNumber: string | null; trackingUrl: string | null }[];
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
    tracking: prints
      .filter((item) => item.trackingNumber || item.trackingUrl)
      .map((item) => ({ carrier: item.carrier, number: item.trackingNumber, url: item.trackingUrl && /^https:\/\//.test(item.trackingUrl) ? item.trackingUrl : null })),
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
