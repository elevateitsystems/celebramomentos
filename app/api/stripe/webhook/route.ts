import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/server/prisma";
import { stripe } from "@/lib/server/stripe";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret || secret.includes("replace")) return NextResponse.json({ error: "Webhook is not configured" }, { status: 400 });
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }
  if (!event.type.startsWith("checkout.session.")) return NextResponse.json({ received: true });
  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = session.metadata?.orderId;
  if (!orderId) return NextResponse.json({ received: true });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.stripeEvent.create({ data: { id: event.id, type: event.type } });
      const order = await tx.order.findUnique({ where: { id: orderId }, include: { payments: true, discountUsages: true } });
      if (!order) return;
      const payment = order.payments.find((item) => item.stripeCheckoutId === session.id) || order.payments[0];
      if (!payment) return;
      if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
        const paid = session.payment_status === "paid" && session.amount_total === order.totalCents && session.currency === order.currency;
        if (!paid || order.status !== "PENDING") return;
        await tx.order.update({ where: { id: order.id, status: "PENDING" }, data: { status: "PAID" } });
        await tx.payment.update({ where: { id: payment.id }, data: { status: "SUCCEEDED", stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : undefined, raw: { eventId: event.id, type: event.type } } });
        if (order.discountUsages.length) await tx.discount.update({ where: { id: order.discountUsages[0].discountId }, data: { usedCount: { increment: 1 } } });
        if (order.customerId) await tx.cartLine.deleteMany({ where: { customerId: order.customerId } });
      } else if (event.type === "checkout.session.async_payment_failed" || event.type === "checkout.session.expired") {
        if (order.status !== "PENDING") return;
        await tx.order.update({ where: { id: order.id, status: "PENDING" }, data: { status: "CANCELLED" } });
        await tx.payment.update({ where: { id: payment.id }, data: { status: event.type.endsWith("expired") ? "CANCELLED" : "FAILED", raw: { eventId: event.id, type: event.type } } });
      }
    });
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
    // A duplicate event is already fully processed and is safe to acknowledge.
    if (error instanceof Error && error.message.includes("Unique constraint")) return NextResponse.json({ received: true });
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
