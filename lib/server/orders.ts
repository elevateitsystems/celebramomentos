import { OrderStatus } from "@prisma/client";

export const storefrontStatus: Record<OrderStatus, string> = {
  PENDING: "Pedido recibido",
  PAID: "Pedido recibido",
  PROCESSING: "En preparación",
  SHIPPED: "Enviado",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
  REFUNDED: "Cancelado",
};

export function serializeOrder(order: {
  id: string;
  number: string;
  email: string;
  status: OrderStatus;
  totalCents: number;
  createdAt: Date;
  shippingAddress: unknown;
  items: { name: string; quantity: number }[];
  // Print shop shipments; only live (real) print orders are shown to customers.
  fulfillments?: { mode: string; status: string; carrier: string | null; trackingNumber: string | null; trackingUrl: string | null }[];
}) {
  const shipping = (order.shippingAddress && typeof order.shippingAddress === "object" ? order.shippingAddress : {}) as Record<string, string>;
  return {
    id: order.number,
    dbId: order.id,
    userId: "",
    email: order.email,
    date: order.createdAt.toISOString(),
    item: order.items.map((item) => item.name + (item.quantity > 1 ? ` × ${item.quantity}` : "")).join(" · "),
    amount: order.totalCents / 100,
    status: storefrontStatus[order.status],
    orderStatus: order.status,
    tracking: (order.fulfillments || [])
      .filter((item) => item.mode === "live" && (item.trackingNumber || item.trackingUrl))
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
