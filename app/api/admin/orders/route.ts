import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { handleApiError, jsonError } from "@/lib/server/http";
import { serializeOrder } from "@/lib/server/orders";
import { prisma } from "@/lib/server/prisma";
import { syncStaleFulfillments } from "@/lib/pod/fulfillment";

export const dynamic = "force-dynamic";

// Orders with their payment and print statuses. Print statuses not read from the print shop for a few
// minutes are refreshed first, so the page shows the latest without any button.
export async function GET() {
  const { error } = await requireAdmin(["OWNER", "ADMIN", "EDITOR"]);
  if (error) return error;
  try {
    const orders = await prisma.order.findMany({
      include: { items: true, customer: true, payments: { orderBy: { createdAt: "desc" }, take: 1, select: { provider: true, status: true } }, _count: { select: { fulfillments: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    await syncStaleFulfillments({ orderIds: orders.filter((order) => order._count.fulfillments).map((order) => order.id) });
    const fulfillments = await prisma.podFulfillment.findMany({ where: { orderId: { in: orders.map((order) => order.id) } }, select: { orderId: true, provider: true, mode: true, status: true, providerStatus: true, carrier: true, trackingNumber: true, trackingUrl: true, lastSyncedAt: true } });
    return NextResponse.json({
      orders: orders.map(({ _count: _ignored, ...order }) => ({
        ...serializeOrder(order),
        payment: order.payments[0] ? { provider: order.payments[0].provider, status: order.payments[0].status } : null,
        fulfillments: fulfillments.filter((item) => item.orderId === order.id).map(({ orderId: _orderId, ...item }) => item),
      })),
    });
  } catch (reason) {
    return handleApiError(reason);
  }
}

// Order statuses are set only by the payment and print-shop integrations; they cannot be edited.
export async function PATCH() {
  const { error } = await requireAdmin(["OWNER", "ADMIN", "EDITOR"]);
  if (error) return error;
  return NextResponse.json({ error: "Order statuses are updated automatically by the payment and print-shop integrations and cannot be changed by hand." }, { status: 405, headers: { Allow: "GET, DELETE" } });
}

// Deleting removes the order and what belongs only to it (items, payments, print orders, discount
// usages: onDelete Cascade in the schema). Customers, products and uploaded files are kept.
export async function DELETE(request: NextRequest) {
  const { error, admin } = await requireAdmin(["OWNER"]);
  if (error) return error;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return jsonError("Order id is required");
  try {
    await prisma.order.delete({ where: { id } });
    await prisma.auditLog.create({ data: { adminUserId: admin!.id.startsWith("local") ? null : admin!.id, action: "DELETE", entity: "Order", entityId: id } });
    return NextResponse.json({ ok: true });
  } catch (reason) {
    return handleApiError(reason);
  }
}
