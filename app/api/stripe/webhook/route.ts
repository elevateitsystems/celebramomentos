import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/server/prisma";
import { stripe } from "@/lib/server/stripe";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET.includes("replace")) return NextResponse.json({ error: "Webhook is not configured" }, { status: 400 });
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }
  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = session.metadata?.orderId;
  if (!orderId) return NextResponse.json({ received: true });
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId }, include: { payments: true } });
      if (!order || order.status === "PAID") return;
      await tx.order.update({ where: { id: orderId }, data: { status: "PAID" } });
      await tx.payment.updateMany({ where: { orderId }, data: { status: "SUCCEEDED", stripeCheckoutId: session.id, stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : undefined, raw: { eventId: event.id, type: event.type } } });
    });
  } else if (event.type === "checkout.session.async_payment_failed" || event.type === "checkout.session.expired") {
    await prisma.$transaction([prisma.order.updateMany({ where: { id: orderId, status: "PENDING" }, data: { status: "CANCELLED" } }), prisma.payment.updateMany({ where: { orderId, status: "PENDING" }, data: { status: "FAILED", raw: { eventId: event.id, type: event.type } } })]);
  }
  return NextResponse.json({ received: true });
}
