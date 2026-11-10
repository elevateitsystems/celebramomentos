import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireCustomer } from "@/lib/server/auth";
import { checkoutOrigin, createPendingOrder, markOrderFailed } from "@/lib/server/checkout";
import { handleApiError, jsonError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
import { assertStripeConfigured, stripe } from "@/lib/server/stripe";
import { stripeCustomerFor } from "@/lib/server/stripe-customer";
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

    const { order, lines, shippingCents, discountCents, discountCode } = await createPendingOrder({ customerId: customer.id, input, idempotencyKey, provider: "stripe" });
    let couponId: string | null = null;
    try {
      const origin = checkoutOrigin(request.nextUrl.origin);
      // The discount decided by the server (lib/server/discounts.ts) is given to Stripe as a
      // one-time coupon for exactly that amount, so Stripe charges order.totalCents. Without it Stripe
      // would charge the full price and the paid order would never match its total.
      if (discountCents > 0) {
        couponId = (await stripe.coupons.create({ amount_off: discountCents, currency: "eur", duration: "once", max_redemptions: 1, name: `Descuento ${discountCode}`.slice(0, 40), metadata: { orderId: order.id, code: discountCode || "" } }, { idempotencyKey: `coupon-${idempotencyKey}` })).id;
      }
      // Prefill Stripe Checkout with the details already given on our checkout page. If the
      // Customer cannot be prepared the payment still goes ahead with just the email.
      const stripeCustomer = await stripeCustomerFor(stripe, customer.id, input).catch((reason) => {
        console.error("[stripe] customer prefill failed; continuing with email only", { orderId: order.id, message: reason instanceof Error ? reason.message.slice(0, 200) : "unknown" });
        return null;
      });
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        ...(couponId ? { discounts: [{ coupon: couponId }] } : {}),
        ...(stripeCustomer
          // Changes the customer makes on Stripe's page are saved back to the Customer.
          ? { customer: stripeCustomer, customer_update: { name: "auto", address: "auto" } }
          : { customer_email: input.email.trim().toLowerCase() }),
        line_items: [
          ...lines.map((line) => ({ price_data: { currency: "eur", product_data: { name: line.name }, unit_amount: line.unitPriceCents }, quantity: line.quantity })),
          ...(shippingCents ? [{ price_data: { currency: "eur", product_data: { name: "Entrega normal" }, unit_amount: shippingCents }, quantity: 1 }] : []),
        ],
        metadata: { orderId: order.id, orderNumber: order.number, customerId: customer.id },
        success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/checkout?payment=cancelled`,
      }, { idempotencyKey: `checkout-${idempotencyKey}` });
      if (!session.url) throw new Error("Stripe did not return a checkout URL");
      await prisma.payment.update({ where: { id: order.payments[0].id }, data: { stripeCheckoutId: session.id, raw: { sessionId: session.id } } });
      return NextResponse.json({ orderId: order.id, orderNumber: order.number, checkoutUrl: session.url });
    } catch (reason) {
      if (couponId) await stripe.coupons.del(couponId).catch(() => undefined);
      await markOrderFailed(order.id, "FAILED", reason instanceof Error ? reason.message : "Stripe checkout failed");
      throw reason;
    }
  } catch (reason) {
    if (reason instanceof Error && reason.message === "Stripe is not configured") return jsonError(reason.message, 503);
    return handleApiError(reason);
  }
}
