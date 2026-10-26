import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireCustomer } from "@/lib/server/auth";
import { checkoutOrigin, createPendingOrder, markOrderFailed } from "@/lib/server/checkout";
import { handleApiError, jsonError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
import { assertStripeConfigured, stripe } from "@/lib/server/stripe";
import { customerCheckoutSchema } from "@/lib/server/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { error, customer } = await requireCustomer();
  if (error) return error;
  try {
    assertStripeConfigured();
    const input = customerCheckoutSchema.parse(await request.json());
    if (input.payment !== "card") return jsonError("Only Stripe card test payments are enabled.", 400);
    const idempotencyKey = request.headers.get("idempotency-key")?.trim() || randomUUID();
    const existing = await prisma.order.findUnique({ where: { checkoutIdempotencyKey: idempotencyKey }, include: { payments: true } });
    if (existing?.payments[0]?.stripeCheckoutId) {
      const session = await stripe.checkout.sessions.retrieve(existing.payments[0].stripeCheckoutId);
      return NextResponse.json({ orderId: existing.id, orderNumber: existing.number, checkoutUrl: session.url });
    }

    const { order, lines, shippingCents, deliveryMethod } = await createPendingOrder({ customerId: customer.id, input, idempotencyKey, provider: "stripe" });
    try {
      const origin = checkoutOrigin(request.nextUrl.origin);
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: input.email.trim().toLowerCase(),
        line_items: [
          ...lines.map((line) => ({ price_data: { currency: "eur", product_data: { name: line.name }, unit_amount: line.unitPriceCents }, quantity: line.quantity })),
          ...(shippingCents ? [{ price_data: { currency: "eur", product_data: { name: deliveryMethod === "express" ? "Entrega express" : "Entrega normal" }, unit_amount: shippingCents }, quantity: 1 }] : []),
        ],
        metadata: { orderId: order.id, orderNumber: order.number, customerId: customer.id },
        success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/checkout?payment=cancelled`,
      }, { idempotencyKey: `checkout-${idempotencyKey}` });
      if (!session.url) throw new Error("Stripe did not return a checkout URL");
      await prisma.payment.update({ where: { id: order.payments[0].id }, data: { stripeCheckoutId: session.id, raw: { sessionId: session.id } } });
      return NextResponse.json({ orderId: order.id, orderNumber: order.number, checkoutUrl: session.url });
    } catch (reason) {
      await markOrderFailed(order.id, "FAILED", reason instanceof Error ? reason.message : "Stripe checkout failed");
      throw reason;
    }
  } catch (reason) {
    if (reason instanceof Error && reason.message === "Stripe is not configured") return jsonError(reason.message, 503);
    return handleApiError(reason);
  }
}
