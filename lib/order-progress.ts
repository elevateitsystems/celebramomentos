// Where an order really is, for the customer and for the stored order status. Pure (no I/O).
//
// The stored status only says paid / cancelled; the real progress lives in the print orders the print
// shops report on (sent → in production → shipped → delivered). The customer's stage is the furthest of
// the two, so an order never shows "received" while its print shop already shipped it.
export type OrderStage = "pending" | "received" | "preparing" | "shipped" | "delivered" | "cancelled";

export const STAGE_LABEL: Record<OrderStage, string> = {
  pending: "Pendiente de pago",
  received: "Pedido recibido",
  preparing: "En preparación",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

// Stored order status → stage (PAID is "received": paid, not in production yet).
const FROM_STORED: Record<string, OrderStage> = { PENDING: "pending", PAID: "received", PROCESSING: "preparing", SHIPPED: "shipped", DELIVERED: "delivered", CANCELLED: "cancelled", REFUNDED: "cancelled" };
const RANK: Record<OrderStage, number> = { pending: 0, received: 1, preparing: 2, shipped: 3, delivered: 4, cancelled: -1 };

// Stored order status that records a stage (the stages before production have none to add).
export const STORED_STATUS: Partial<Record<OrderStage, "PROCESSING" | "SHIPPED" | "DELIVERED">> = { preparing: "PROCESSING", shipped: "SHIPPED", delivered: "DELIVERED" };

// Stage reached by a set of print orders (cancelled ones do not count): received until one is sent to the
// print shop, preparing while they are made, shipped when all left the shop, delivered when all arrived.
export function printStage(prints: { status: string }[]): OrderStage {
  const active = prints.filter((item) => item.status !== "CANCELLED");
  if (!active.length) return "received";
  if (active.every((item) => item.status === "DELIVERED")) return "delivered";
  if (active.every((item) => item.status === "SHIPPED" || item.status === "DELIVERED")) return "shipped";
  if (active.some((item) => ["SUBMITTED", "IN_PRODUCTION", "SHIPPED", "DELIVERED"].includes(item.status))) return "preparing";
  return "received";
}

export function orderStage(status: string, prints: { status: string }[] = []): OrderStage {
  const stored = FROM_STORED[status] ?? "received";
  // Unpaid and cancelled orders are never moved by print orders.
  if (stored === "pending" || stored === "cancelled") return stored;
  const printed = printStage(prints);
  return RANK[printed] > RANK[stored] ? printed : stored;
}
