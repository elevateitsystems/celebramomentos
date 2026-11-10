import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import type { z } from "zod";
import { describeProductSelection } from "@/lib/cart";
import { DELIVERY_METHOD, cardSizeText } from "@/lib/data";
import { toCartItem } from "./cart";
import { deliveryCents, ensureCatalog, resolveCartLine } from "./catalog";
import { evaluateDiscount, normalizeDiscountCode } from "./discounts";
import { CatalogError } from "./errors";
import { prisma } from "./prisma";
import type { customerCheckoutSchema } from "./validation";
import { siteUrl } from "./site-url";

type CheckoutInput = z.infer<typeof customerCheckoutSchema>;

export type CheckoutLine = { name: string; quantity: number; unitPriceCents: number };

// Creates a PENDING order (with one PENDING payment for the given provider) from
// the customer's server-side cart. Every line is re-priced from the database, so
// edited prices apply and deleted/inactive products cannot be bought.
export async function createPendingOrder({ customerId, input, idempotencyKey, provider }: { customerId: string; input: CheckoutInput; idempotencyKey: string; provider: "stripe" | "paypal" }) {
  await ensureCatalog();
  const cartLines = await prisma.cartLine.findMany({ where: { customerId }, orderBy: { createdAt: "asc" } });
  if (!cartLines.length) throw new CatalogError("Tu cesta está vacía. Añade un producto antes de pagar.", 400);
  const priced = await Promise.all(cartLines.map(async (line) => {
    const item = toCartItem(line);
    return { line, item, resolved: await resolveCartLine(item) };
  }));
  const subtotalCents = priced.reduce((sum, { line, resolved }) => sum + resolved.unitPriceCents * line.quantity, 0);
  // A single delivery option: whatever an old cart line says, new orders use (and pay for) it.
  const deliveryMethod = DELIVERY_METHOD;
  const shippingCents = await deliveryCents(deliveryMethod, subtotalCents);
  const requestedCode = normalizeDiscountCode(input.discountCode);
  const templateSlugs = priced.map(({ resolved }) => resolved.templateSlug).filter((slug): slug is string => Boolean(slug));
  const templates = await prisma.postcardTemplate.findMany({ where: { slug: { in: templateSlugs } } });
  const templateBySlug = Object.fromEntries(templates.map((template) => [template.slug, template]));
  const lineName = (row: (typeof priced)[number]) => {
    const { resolved } = row;
    if (resolved.product) { const described = describeProductSelection(resolved.product); return `${described.name} · ${described.detail}`; }
    const name = resolved.productName || (resolved.templateSlug && templateBySlug[resolved.templateSlug]?.name) || "Producto personalizado";
    return `${name} · ${cardSizeText(row.item.card.size)}`;
  };
  const shippingAddress = { name: input.name.trim(), phone: input.phone.trim(), recipient: input.recipient.trim(), address: input.address.trim(), city: input.city.trim(), postalCode: input.postalCode.trim(), country: input.country, billingAddress: input.billingAddress?.trim() };
  // The discount is decided here, from the database, at the moment the order is written (inside a
  // transaction, so a code with a usage limit cannot be used past it by simultaneous checkouts).
  // An unknown, disabled, expired or used-up code stops the checkout with a clear message: it is
  // never silently dropped, and nothing the browser sends can set an amount.
  const place = async (db: Prisma.TransactionClient | typeof prisma) => {
    const verdict = requestedCode ? await evaluateDiscount(db, requestedCode, { subtotalCents, shippingCents, customerId }) : null;
    if (verdict && !verdict.ok) throw new CatalogError(verdict.message, 400);
    const discount = verdict?.ok ? verdict.discount : null;
    const discountCents = verdict?.ok ? verdict.discountCents : 0;
    const totalCents = Math.max(0, subtotalCents + shippingCents - discountCents);
    const order = await db.order.create({
    data: {
      number: `CM-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`,
      checkoutIdempotencyKey: idempotencyKey,
      customerId,
      email: input.email.trim().toLowerCase(),
      subtotalCents,
      shippingCents,
      discountCents,
      totalCents,
      shippingAddress,
      items: { create: priced.map((row) => {
        const { line, item, resolved } = row;
        const productLink = resolved.productId ? { productId: resolved.productId } : {};
        if (resolved.product) {
          const variantLink = resolved.product.kind === "CATALOG" && resolved.product.variantId ? { variantId: resolved.product.variantId } : {};
          return { ...productLink, ...variantLink, name: lineName(row), quantity: line.quantity, unitPriceCents: resolved.unitPriceCents, personalization: { product: resolved.product, delivery: deliveryMethod } as Prisma.InputJsonValue };
        }
        const template = resolved.templateSlug ? templateBySlug[resolved.templateSlug] : null;
        return { ...productLink, ...(template ? { templateId: template.id } : {}), name: lineName(row), quantity: line.quantity, unitPriceCents: resolved.unitPriceCents, personalization: { templateSlug: item.card.templateId, card: item.card, cardSize: item.card.size, provider: "PRODIGI", sku: resolved.cardSizeSku, delivery: deliveryMethod } as Prisma.InputJsonValue };
      }) },
      payments: { create: { amountCents: totalCents, currency: "eur", provider } },
      ...(discount ? { discountUsages: { create: { discountId: discount.id } } } : {}),
    },
    include: { payments: true },
    });
    return { order, discountCents, totalCents, discountCode: discount?.code ?? null };
  };
  let placed: Awaited<ReturnType<typeof place>>;
  try {
    placed = requestedCode ? await prisma.$transaction(place, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }) : await place(prisma);
  } catch (reason) {
    // Two checkouts raced for the same limited code and the database kept only one.
    if (reason instanceof Prisma.PrismaClientKnownRequestError && reason.code === "P2034") throw new CatalogError("No hemos podido aplicar el código de descuento. Inténtalo de nuevo.", 409);
    throw reason;
  }
  const { order, discountCents, totalCents, discountCode } = placed;
  const lines: CheckoutLine[] = priced.map((row) => ({ name: lineName(row), quantity: row.line.quantity, unitPriceCents: row.resolved.unitPriceCents }));
  return { order, lines, subtotalCents, shippingCents, discountCents, discountCode, totalCents, deliveryMethod };
}

export async function markOrderFailed(orderId: string, status: "FAILED" | "CANCELLED", detail: string) {
  await prisma.$transaction([
    prisma.order.updateMany({ where: { id: orderId, status: "PENDING" }, data: { status: "CANCELLED" } }),
    prisma.payment.updateMany({ where: { orderId, status: "PENDING" }, data: { status, raw: { error: detail } } }),
  ]);
}

// Base URL for Stripe / PayPal return and cancel URLs (see lib/server/site-url.ts).
export function checkoutOrigin(requestOrigin: string) {
  return siteUrl(requestOrigin);
}
