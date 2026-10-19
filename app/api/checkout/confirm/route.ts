import { NextRequest, NextResponse } from "next/server";
import { requireCustomer } from "@/lib/server/auth";
import { handleApiError, jsonError } from "@/lib/server/http";
import { serializeOrder } from "@/lib/server/orders";
import { prisma } from "@/lib/server/prisma";
import { stripe } from "@/lib/server/stripe";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { error, customer } = await requireCustomer();
  if (error) return error;
  try {
    const body = await request.json() as { sessionId?: string };
    if (!body.sessionId) return jsonError("sessionId is required");
    const session = await stripe.checkout.sessions.retrieve(body.sessionId);
    const orderId = session.metadata?.orderId;
    if (!orderId) return jsonError("Order not found for this session", 404);
    const order = await prisma.order.findFirst({ where: { id: orderId, customerId: customer.id }, include: { items: true, payments: true, discountUsages: true } });
    if (!order) return jsonError("Order not found", 404);
    const payment = order.payments.find((item) => item.stripeCheckoutId === session.id) || order.payments[0];
    const paid = session.payment_status === "paid" && session.amount_total === order.totalCents && session.currency === order.currency;
    if (paid && order.status === "PENDING") {
      await prisma.$transaction(async (tx) => {
        await tx.order.update({ where: { id: order.id, status: "PENDING" }, data: { status: "PAID" } });
        await tx.payment.updateMany({ where: { orderId: order.id, status: "PENDING" }, data: { status: "SUCCEEDED", stripeCheckoutId: session.id, stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : undefined } });
        if (order.discountUsages.length) await tx.discount.update({ where: { id: order.discountUsages[0].discountId }, data: { usedCount: { increment: 1 } } });
        await tx.cartLine.deleteMany({ where: { customerId: customer.id } });
      });
    } else if (session.status === "expired" && order.status === "PENDING") {
      await prisma.$transaction([
        prisma.order.update({ where: { id: order.id, status: "PENDING" }, data: { status: "CANCELLED" } }),
        prisma.payment.updateMany({ where: { orderId: order.id, status: "PENDING" }, data: { status: "CANCELLED" } }),
      ]);
    }
    const refreshed = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { items: true } });
    return NextResponse.json({ order: serializeOrder(refreshed), paid: refreshed.status === "PAID" || refreshed.status === "PROCESSING" || refreshed.status === "SHIPPED" || refreshed.status === "DELIVERED" });
  } catch (reason) {
    return handleApiError(reason);
  }
}
