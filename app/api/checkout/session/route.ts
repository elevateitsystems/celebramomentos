import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/server/prisma";
import { stripe, assertStripeConfigured } from "@/lib/server/stripe";
import { checkoutSchema } from "@/lib/server/validation";
import { handleApiError, jsonError } from "@/lib/server/http";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    assertStripeConfigured();
    const input = checkoutSchema.parse(await request.json());
    const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const idempotencyKey = request.headers.get("idempotency-key") || undefined;
    const resolved = await Promise.all(input.items.map(async (item) => {
      const product = item.productId ? await prisma.product.findFirst({ where: { id: item.productId, active: true } }) : null;
      const variant = item.variantId ? await prisma.productVariant.findFirst({ where: { id: item.variantId, active: true, product: { active: true } } }) : null;
      const template = item.templateId ? await prisma.postcardTemplate.findFirst({ where: { id: item.templateId, active: true } }) : null;
      const priceCents = variant?.priceCents ?? product?.basePriceCents ?? template?.priceCents;
      if (!priceCents) throw new Error("A cart item has no valid active price");
      return { input: item, product, variant, template, priceCents, name: variant?.name || product?.name || template?.name || "Personalized product" };
    }));
    const subtotalCents = resolved.reduce((sum, item) => sum + item.priceCents * item.input.quantity, 0);
    const shipping = input.shippingMethodId ? await prisma.shippingMethod.findFirst({ where: { id: input.shippingMethodId, active: true } }) : null;
    const shippingCents = shipping && (!shipping.freeFromCents || subtotalCents < shipping.freeFromCents) ? shipping.priceCents : 0;
    let discountCents = 0;
    const discount = input.discountCode ? await prisma.discount.findFirst({ where: { code: input.discountCode.toUpperCase(), active: true } }) : null;
    if (discount && (!discount.expiresAt || discount.expiresAt > new Date()) && (!discount.minOrderCents || subtotalCents >= discount.minOrderCents) && (!discount.maxUses || discount.usedCount < discount.maxUses)) {
      discountCents = discount.percentage ? Math.floor(subtotalCents * discount.percentage / 100) : Math.min(discount.amountCents || 0, subtotalCents);
    }
    const totalCents = Math.max(0, subtotalCents + shippingCents - discountCents);
    const order = await prisma.order.create({
      data: {
        number: `CM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        email: input.email.toLowerCase(), status: "PENDING", subtotalCents, shippingCents, discountCents, totalCents,
        shippingAddress: input.shippingAddress,
        items: { create: resolved.map((item) => ({
          ...(item.product ? { productId: item.product.id } : {}),
          ...(item.variant ? { variantId: item.variant.id } : {}),
          ...(item.template ? { templateId: item.template.id } : {}),
          name: item.name,
          quantity: item.input.quantity,
          unitPriceCents: item.priceCents,
          ...(item.input.personalization ? { personalization: item.input.personalization as Prisma.InputJsonValue } : {}),
        })) },
        payments: { create: { amountCents: totalCents, currency: input.currency.toLowerCase() } },
      }, include: { items: true },
    });
    try {
      const session = await stripe.checkout.sessions.create({
        mode: "payment", customer_email: input.email, currency: input.currency.toLowerCase(),
        line_items: resolved.map((item) => ({ price_data: { currency: input.currency.toLowerCase(), product_data: { name: item.name }, unit_amount: item.priceCents }, quantity: item.input.quantity })),
        discounts: discountCents ? [] : undefined,
        metadata: { orderId: order.id, orderNumber: order.number },
        success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/cart?payment=cancelled`,
      }, idempotencyKey ? { idempotencyKey } : undefined);
      await prisma.payment.updateMany({ where: { orderId: order.id }, data: { stripeCheckoutId: session.id, raw: { sessionId: session.id } } });
      return NextResponse.json({ orderId: order.id, checkoutUrl: session.url });
    } catch (error) {
      await prisma.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
      throw error;
    }
  } catch (error) {
    if (error instanceof Error && error.message === "Stripe is not configured") return jsonError(error.message, 503);
    return handleApiError(error);
  }
}
