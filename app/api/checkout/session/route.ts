import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireCustomer } from "@/lib/server/auth";
import { toCartItem } from "@/lib/server/cart";
import { deliveryCents, ensureCatalog } from "@/lib/server/catalog";
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

    await ensureCatalog();
    const lines = await prisma.cartLine.findMany({ where: { customerId: customer.id }, orderBy: { createdAt: "asc" } });
    if (!lines.length) return jsonError("Tu cesta está vacía. Añade un producto antes de pagar.");
    const items = lines.map(toCartItem);
    const subtotalCents = lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);
    const deliveryMethod = items[0].card.delivery;
    const shippingCents = deliveryCents(deliveryMethod, subtotalCents);
    const discountCode = (input.discountCode || "").trim().toUpperCase();
    const discount = discountCode ? await prisma.discount.findFirst({ where: { code: discountCode, active: true } }) : null;
    const discountValid = Boolean(discount && (!discount.expiresAt || discount.expiresAt > new Date()) && (!discount.minOrderCents || subtotalCents >= discount.minOrderCents) && (!discount.maxUses || discount.usedCount < discount.maxUses));
    const discountCents = discountValid && discount ? discount.percentage ? Math.floor((subtotalCents + shippingCents) * discount.percentage / 100) : Math.min(discount.amountCents || 0, subtotalCents) : 0;
    const totalCents = Math.max(0, subtotalCents + shippingCents - discountCents);
    const templates = await prisma.postcardTemplate.findMany({ where: { slug: { in: lines.map((line) => line.templateSlug).filter((slug): slug is string => Boolean(slug)) } } });
    const templateBySlug = Object.fromEntries(templates.map((template) => [template.slug, template]));
    const shippingAddress = { name: input.name.trim(), phone: input.phone.trim(), recipient: input.recipient.trim(), address: input.address.trim(), city: input.city.trim(), postalCode: input.postalCode.trim(), country: input.country, billingAddress: input.billingAddress?.trim() };
    const order = await prisma.order.create({
      data: {
        number: `CM-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`,
        checkoutIdempotencyKey: idempotencyKey,
        customerId: customer.id,
        email: input.email.trim().toLowerCase(),
        subtotalCents,
        shippingCents,
        discountCents,
        totalCents,
        shippingAddress,
        items: { create: lines.map((line) => { const item = toCartItem(line); const template = item.card.templateId ? templateBySlug[item.card.templateId] : null; return { ...(line.productId ? { productId: line.productId } : {}), ...(template ? { templateId: template.id } : {}), name: template?.name || "Producto personalizado", quantity: line.quantity, unitPriceCents: line.unitPriceCents, personalization: { templateSlug: item.card.templateId, card: item.card, stickerQuantity: item.stickerQuantity, envelopeText: item.envelopeText, envelopeTextAdded: item.envelopeTextAdded, delivery: item.card.delivery } as Prisma.InputJsonValue }; }) },
        payments: { create: { amountCents: totalCents, currency: "eur", provider: "stripe" } },
        ...(discountValid && discount ? { discountUsages: { create: { discountId: discount.id } } } : {}),
      },
      include: { payments: true },
    });

    try {
      const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: input.email.trim().toLowerCase(),
        line_items: [
          ...lines.map((line) => ({ price_data: { currency: "eur", product_data: { name: toCartItem(line).card.templateId || "Producto personalizado" }, unit_amount: line.unitPriceCents }, quantity: line.quantity })),
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
      await prisma.$transaction([
        prisma.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } }),
        prisma.payment.updateMany({ where: { orderId: order.id, status: "PENDING" }, data: { status: "FAILED", raw: { error: reason instanceof Error ? reason.message : "Stripe checkout failed" } } }),
      ]);
      throw reason;
    }
  } catch (reason) {
    if (reason instanceof Error && reason.message === "Stripe is not configured") return jsonError(reason.message, 503);
    return handleApiError(reason);
  }
}
