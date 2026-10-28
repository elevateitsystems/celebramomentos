// Shared (client + server) definitions for the database-backed product catalog.
// ProductKind is the category: there is no separate Category row per product type.

// STICKER still exists in the Prisma enum for old rows but is no longer sold.
export const PRODUCT_KINDS = ["POSTCARD", "WALL_ART", "MAGNET", "PHONE_CASE", "MUG", "CALENDAR"] as const;
export type ProductKind = (typeof PRODUCT_KINDS)[number];
// Kinds sold through a product studio page (everything except Cards).
export type StudioProductKind = Exclude<ProductKind, "POSTCARD">;

export function isProductKind(value: unknown): value is ProductKind {
  return typeof value === "string" && (PRODUCT_KINDS as readonly string[]).includes(value);
}

export const PRODUCT_KIND_INFO: Record<ProductKind, { admin: string; es: string; pt: string; path: string }> = {
  POSTCARD: { admin: "Cards (Tarjetas)", es: "Tarjetas", pt: "Cartões", path: "/templates" },
  WALL_ART: { admin: "Wall Art (Arte de pared)", es: "Arte de pared", pt: "Arte de parede", path: "/wall-art" },
  MAGNET: { admin: "Magnets (Imanes)", es: "Imanes", pt: "Ímanes", path: "/magnets" },
  PHONE_CASE: { admin: "Phone Cases (Fundas de móvil)", es: "Fundas de móvil", pt: "Capas de telemóvel", path: "/phone-cases" },
  MUG: { admin: "Mugs (Tazas)", es: "Tazas", pt: "Canecas", path: "/mugs" },
  CALENDAR: { admin: "Calendars (Calendarios)", es: "Calendarios", pt: "Calendários", path: "/calendars" },
};

// Tradicional, Collage and Magazine are Card designs only. No other product
// kind may reference them.
export const CARD_TEMPLATE_SLUGS = ["template-3", "template-2", "template-magazine"] as const;
export type CardTemplateSlug = (typeof CARD_TEMPLATE_SLUGS)[number];
export const DEFAULT_CARD_TEMPLATE: CardTemplateSlug = "template-3";

export function isCardTemplateSlug(value: unknown): value is CardTemplateSlug {
  return typeof value === "string" && (CARD_TEMPLATE_SLUGS as readonly string[]).includes(value);
}

// Calendars take one photo per month.
export const MAX_PRODUCT_PHOTOS = 12;

// Print-on-demand shops that fulfil each product (feedback 26 Oct / PRODUCTS.pdf).
export const POD_PROVIDERS = ["PRODIGI", "PRINTFUL", "GELATO", "ALERIO_PRINT"] as const;
export type PodProvider = (typeof POD_PROVIDERS)[number];
export const POD_PROVIDER_LABELS: Record<PodProvider, string> = { PRODIGI: "Prodigi", PRINTFUL: "Printful", GELATO: "Gelato", ALERIO_PRINT: "Alerio Print" };
export const DEFAULT_POD_PROVIDER: Record<ProductKind, PodProvider> = { POSTCARD: "PRODIGI", MAGNET: "PRODIGI", MUG: "PRINTFUL", PHONE_CASE: "ALERIO_PRINT", CALENDAR: "GELATO", WALL_ART: "GELATO" };
export function isPodProvider(value: unknown): value is PodProvider {
  return typeof value === "string" && (POD_PROVIDERS as readonly string[]).includes(value);
}

export type ProductOptionConfig = { choices: string[] };

// Print shop's recommended file for the customer photo, in pixels at 300 dpi
// (e.g. Alerio Print clear case 750 × 1590). transparentPng: clear cases show
// the case through transparent areas of a PNG.
export type PrintFile = { width: number; height: number; transparentPng?: boolean };

export function productPrintFile(metadata: unknown): PrintFile | null {
  const value = metadata && typeof metadata === "object" && !Array.isArray(metadata) ? (metadata as { printFile?: unknown }).printFile : null;
  if (!value || typeof value !== "object") return null;
  const { width, height, transparentPng } = value as Record<string, unknown>;
  if (!Number.isInteger(width) || !Number.isInteger(height) || Number(width) < 1 || Number(height) < 1) return null;
  return { width: Number(width), height: Number(height), ...(transparentPng === true ? { transparentPng: true } : {}) };
}

// Option choices are labels only; a price written into one ("3 (24.99 €)") is
// never charged. Packs and sizes with their own price must be variants.
export const PRICE_IN_TEXT = /€|\beur\b|\d+[.,]\d{2}\b/i;

// Shape returned by GET /api/products.
export type CatalogProduct = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  kind: ProductKind;
  featured: boolean;
  basePriceCents: number;
  metadata: { templateSlug?: string; photoCount?: number; provider?: string; printFile?: PrintFile | null } | null;
  images: { asset: { url: string | null } }[];
  // photoCount overrides the product's photo count for this size (e.g. a pack of 3 magnets).
  variants: { id: string; name: string; priceCents: number; photoCount: number | null }[];
  options: { id: string; key: string; name: string; required: boolean; config: ProductOptionConfig | null }[];
};

export function productPhotoCount(product: Pick<CatalogProduct, "metadata">) {
  const count = Number(product.metadata?.photoCount);
  return Number.isInteger(count) && count >= 1 ? Math.min(count, MAX_PRODUCT_PHOTOS) : 1;
}

export function requiredPhotoCount(product: Pick<CatalogProduct, "metadata">, variant: { photoCount: number | null } | null) {
  const count = Number(variant?.photoCount);
  return Number.isInteger(count) && count >= 1 ? Math.min(count, MAX_PRODUCT_PHOTOS) : productPhotoCount(product);
}

// Reads the photo count / POD fields stored in ProductVariant.attributes.
export function variantAttributes(attributes: unknown) {
  const value = (attributes && typeof attributes === "object" && !Array.isArray(attributes) ? attributes : {}) as { photoCount?: unknown; podSku?: unknown; provider?: unknown };
  const photoCount = Number(value.photoCount);
  return {
    photoCount: Number.isInteger(photoCount) && photoCount >= 1 ? Math.min(photoCount, MAX_PRODUCT_PHOTOS) : null,
    podSku: typeof value.podSku === "string" && value.podSku ? value.podSku : null,
    provider: isPodProvider(value.provider) ? value.provider : null,
  };
}

export function productCardTemplate(product: Pick<CatalogProduct, "metadata">): CardTemplateSlug {
  const slug = product.metadata?.templateSlug;
  return isCardTemplateSlug(slug) ? slug : DEFAULT_CARD_TEMPLATE;
}

export function productHref(product: Pick<CatalogProduct, "id" | "kind" | "metadata">) {
  if (product.kind === "POSTCARD") return `/customize?template=${productCardTemplate(product)}&product=${encodeURIComponent(product.id)}`;
  return `${PRODUCT_KIND_INFO[product.kind].path}?product=${encodeURIComponent(product.id)}`;
}

export function optionKey(name: string) {
  return name.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "option";
}
