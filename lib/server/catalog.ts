import type { Prisma } from "@prisma/client";
import { CARD_SIZES, templates } from "@/lib/data";
import { DEFAULT_POD_PROVIDER, MAX_PRODUCT_PHOTOS, PRODUCT_KIND_INFO, isPodProvider, requiredPhotoCount, variantAttributes, type CatalogProduct } from "@/lib/products";
import { getDeliveryPriceCents } from "@/lib/shipping";
import type { CartItem, CatalogSelection, ProductSelection } from "@/lib/store";
import { prisma } from "./prisma";
import { CatalogError } from "./errors";
import { getCardSizePrices, getDeliveryRates } from "./settings";

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

const UNAVAILABLE_PRODUCT = "Este producto ya no está disponible. Elimínalo de tu cesta para continuar.";

function optionChoices(config: Prisma.JsonValue | null) {
  const choices = config && typeof config === "object" && !Array.isArray(config) ? (config as { choices?: unknown }).choices : null;
  return Array.isArray(choices) ? choices.filter((choice): choice is string => typeof choice === "string") : [];
}

async function resolveCatalogSelection(selection: CatalogSelection): Promise<CatalogSelection> {
  const product = await prisma.product.findFirst({
    where: { id: selection.productId, active: true, kind: selection.productKind },
    include: { variants: { where: { active: true } }, options: true, images: { include: { asset: true }, orderBy: { sortOrder: "asc" }, take: 1 } },
  });
  if (!product) throw new CatalogError(UNAVAILABLE_PRODUCT);
  let priceCents = product.basePriceCents;
  let variantName: string | null = null;
  let variant: { photoCount: number | null; podSku: string | null; provider: string | null } | null = null;
  if (product.variants.length) {
    const chosen = product.variants.find((item) => item.id === selection.variantId);
    if (!chosen) throw new CatalogError("Elige un tamaño disponible para este producto.", 400);
    priceCents = chosen.priceCents;
    variantName = chosen.name;
    variant = variantAttributes(chosen.attributes);
  } else if (selection.variantId) {
    throw new CatalogError("El tamaño elegido ya no está disponible.", 400);
  }
  // Admin-defined options must use one of their configured choices; the studio's
  // own customisation fields (phone model, finish, colour…) are recorded as given.
  const options: Record<string, string> = {};
  const adminKeys = new Set(product.options.map((option) => option.key));
  for (const option of product.options) {
    const value = selection.options[option.key]?.trim();
    if (!value) {
      if (option.required) throw new CatalogError(`Elige una opción para "${option.name}".`, 400);
      continue;
    }
    if (!optionChoices(option.config).includes(value)) throw new CatalogError(`La opción "${option.name}" ya no está disponible.`, 400);
    options[option.key] = value;
  }
  for (const [key, value] of Object.entries(selection.options)) {
    if (!adminKeys.has(key) && value.trim()) options[key] = value.trim();
  }
  const photos = selection.photos.slice(0, MAX_PRODUCT_PHOTOS);
  const metadata = product.metadata as CatalogProduct["metadata"];
  const requiredPhotos = requiredPhotoCount({ metadata }, variant);
  if (photos.filter(Boolean).length < requiredPhotos) throw new CatalogError(requiredPhotos === 1 ? "Sube tu fotografía para este producto." : `Sube ${requiredPhotos} fotografías para este producto.`, 400);
  return {
    ...selection,
    options,
    photos,
    priceCents,
    name: product.name,
    detail: [variantName, ...Object.values(options)].filter(Boolean).join(" · ") || PRODUCT_KIND_INFO[selection.productKind].es,
    image: product.images[0]?.asset.url || null,
    provider: variant?.provider || (isPodProvider(metadata?.provider) ? metadata.provider : DEFAULT_POD_PROVIDER[selection.productKind]),
    sku: variant?.podSku || null,
  };
}

export type ResolvedCartLine = {
  unitPriceCents: number;
  productId: string | null;
  templateSlug: string | null;
  product: ProductSelection | null;
  productPriceCents: number | null;
  productName: string | null;
  // Cards: Prodigi SKU of the chosen card size.
  cardSizeSku: string | null;
};

// Prices and validates a cart line from server-side data only; client snapshots are ignored.
export async function resolveCartLine(item: CartItem): Promise<ResolvedCartLine> {
  const selection = item.product;
  if (selection) {
    if (selection.kind !== "CATALOG") throw new CatalogError(UNAVAILABLE_PRODUCT);
    const product = await resolveCatalogSelection(selection);
    return { unitPriceCents: product.priceCents, productId: product.productId, templateSlug: null, product, productPriceCents: null, productName: null, cardSizeSku: null };
  }
  // Everything else is a Card: it must use an active Card template, a card
  // size from PRODUCTS.pdf, and an attached admin product must be an active Card product.
  const templateSlug = item.card?.templateId;
  const template = templateSlug ? await prisma.postcardTemplate.findFirst({ where: { slug: templateSlug, active: true }, select: { priceCents: true } }) : null;
  if (!templateSlug || !template) throw new CatalogError("Esta plantilla de tarjeta ya no está disponible.");
  const size = CARD_SIZES.find((option) => option.id === item.card.size);
  if (!size) throw new CatalogError("Elige un tamaño de tarjeta disponible.", 400);
  let baseCents = template.priceCents;
  let productName: string | null = null;
  if (item.productId) {
    const product = await prisma.product.findFirst({ where: { id: item.productId, active: true, kind: "POSTCARD" }, select: { basePriceCents: true, name: true } });
    if (!product) throw new CatalogError(UNAVAILABLE_PRODUCT);
    baseCents = product.basePriceCents;
    productName = product.name;
  }
  const sizeCents = (await getCardSizePrices())[size.id];
  return {
    unitPriceCents: baseCents + sizeCents,
    productId: item.productId || null,
    templateSlug,
    product: null,
    productPriceCents: item.productId ? baseCents : null,
    productName,
    cardSizeSku: size.sku,
  };
}

export async function deliveryCents(method: CartItem["card"]["delivery"], merchandiseCents: number) {
  return getDeliveryPriceCents(await getDeliveryRates(), method, merchandiseCents);
}
