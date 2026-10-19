import { templates, PACKAGING_PRICES, SIZE_PRICES, STICKER_PRICES, ENVELOPE_TEXT_PRICE } from "@/lib/data";
import { getDeliveryPrice } from "@/lib/shipping";
import type { CartItem } from "@/lib/store";
import { prisma } from "./prisma";

export async function ensureCatalog() {
  await Promise.all(templates.map((template) => prisma.postcardTemplate.upsert({
    where: { slug: template.id },
    update: {},
    create: { slug: template.id, name: template.name, type: template.magazineStyle ? "magazine" : template.longText ? "traditional" : "collage", description: template.description, imageCount: template.imageCount, priceCents: Math.round(template.price * 100), active: true },
  })));
  await prisma.shippingMethod.upsert({
    where: { slug: "standard" },
    update: {},
    create: { slug: "standard", name: "Entrega normal", priceCents: 500, freeFromCents: 3500, active: true },
  });
  await prisma.shippingMethod.upsert({
    where: { slug: "express" },
    update: {},
    create: { slug: "express", name: "Entrega express", priceCents: 800, freeFromCents: 3500, active: true },
  });
  await prisma.discount.upsert({
    where: { code: "HOLA10" },
    update: {},
    create: { code: "HOLA10", percentage: 10, active: true },
  });
}

export async function resolveUnitPriceCents(input: { templateSlug?: string | null; productId?: string | null; item: CartItem }) {
  let baseCents = Math.round((templates.find((template) => template.id === input.templateSlug)?.price ?? templates[0].price) * 100);
  if (input.productId) {
    const product = await prisma.product.findFirst({ where: { id: input.productId, active: true }, select: { basePriceCents: true } });
    if (product) baseCents = product.basePriceCents;
  } else if (input.templateSlug) {
    const template = await prisma.postcardTemplate.findFirst({ where: { slug: input.templateSlug, active: true }, select: { priceCents: true } });
    if (template) baseCents = template.priceCents;
  }
  const extras = PACKAGING_PRICES[input.item.card.packaging] + SIZE_PRICES[input.item.card.size] + STICKER_PRICES[input.item.stickerQuantity] + (input.item.envelopeTextAdded ? ENVELOPE_TEXT_PRICE : 0);
  return baseCents + Math.round(extras * 100);
}

export function deliveryCents(method: CartItem["card"]["delivery"], merchandiseCents: number) {
  return Math.round(getDeliveryPrice(method, merchandiseCents / 100) * 100);
}
