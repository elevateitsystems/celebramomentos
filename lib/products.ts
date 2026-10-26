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

export const MAX_PRODUCT_PHOTOS = 9;

export type ProductOptionConfig = { choices: string[] };

// Shape returned by GET /api/products.
export type CatalogProduct = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  kind: ProductKind;
  featured: boolean;
  basePriceCents: number;
  metadata: { templateSlug?: string; photoCount?: number } | null;
  images: { asset: { url: string | null } }[];
  variants: { id: string; name: string; priceCents: number }[];
  options: { id: string; key: string; name: string; required: boolean; config: ProductOptionConfig | null }[];
};

export function productPhotoCount(product: Pick<CatalogProduct, "metadata">) {
  const count = Number(product.metadata?.photoCount);
  return Number.isInteger(count) && count >= 1 ? Math.min(count, MAX_PRODUCT_PHOTOS) : 1;
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
