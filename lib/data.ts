export type Language = "es" | "pt";
export type CardSize = "A4" | "A3";
export type DeliveryMethod = "standard" | "express";
export type Packaging = "standard" | "gift";
export type RecipientMode = "recipient" | "customer";
export type DesignCategoryId = "especial" | "gracias" | "momentos" | "cumpleanos" | "confeti" | "enhorabuena";

export type DesignCategory = {
  id: DesignCategoryId;
  name: string;
  namePt: string;
  description: string;
  descriptionPt: string;
  symbol: string;
};

export type Template = {
  id: string;
  name: string;
  namePt?: string;
  eyebrow: string;
  description: string;
  descriptionPt?: string;
  image: string;
  price: number;
  imageCount: number;
  requiresFrame: boolean;
  longText?: boolean;
  magazineStyle?: boolean;
};

export type Frame = {
  id: string;
  name: string;
  namePt?: string;
  image: string;
};

export type AddOn = {
  id: string;
  name: string;
  namePt: string;
  description: string;
  descriptionPt: string;
  price: number;
  image?: string;
  kind: "sticker";
};

export const templates: Template[] = [
  { id: "template-3", name: "Tradicional", namePt: "Tradicional", eyebrow: "CLÁSICA · 2 FOTOS", description: "Una portada atemporal, dedicatoria interior y dos fotografías colocadas exactamente donde esperas.", descriptionPt: "Uma capa intemporal, dedicatória interior e duas fotografias colocadas exatamente onde esperas.", image: "/images/short-template.png", price: 8.9, imageCount: 2, requiresFrame: true, longText: true },
  { id: "template-2", name: "Collage", namePt: "Colagem", eyebrow: "COLLAGE · 4 FOTOS", description: "Cuatro recuerdos repartidos entre portada y páginas interiores, con el marco que elijas.", descriptionPt: "Quatro memórias distribuídas pela capa e páginas interiores, com a moldura escolhida.", image: "/images/customizable-template.png", price: 8.9, imageCount: 4, requiresFrame: true },
  { id: "template-magazine", name: "Magazine", namePt: "Magazine", eyebrow: "MAGAZINE · 4 FOTOS", description: "Una portada editorial con una fotografía protagonista y tres recuerdos en el interior.", descriptionPt: "Uma capa editorial com uma fotografia protagonista e três memórias no interior.", image: "/images/roberto-match-contact-sheet.png", price: 8.9, imageCount: 4, requiresFrame: false, magazineStyle: true },
];

export const designCategories: DesignCategory[] = [
  { id: "especial", name: "Especial", namePt: "Especial", description: "Para alguien que merece una tarjeta solo suya.", descriptionPt: "Para alguém que merece um cartão só seu.", symbol: "✦" },
  { id: "gracias", name: "Gracias", namePt: "Obrigado", description: "Una forma bonita de agradecer de corazón.", descriptionPt: "Uma forma bonita de agradecer de coração.", symbol: "♡" },
  { id: "momentos", name: "Momentos", namePt: "Momentos", description: "Recuerdos cotidianos que vale la pena guardar.", descriptionPt: "Recordações do dia a dia que vale a pena guardar.", symbol: "◉" },
  { id: "cumpleanos", name: "Cumpleaños", namePt: "Aniversário", description: "Para celebrar una nueva vuelta al sol.", descriptionPt: "Para celebrar mais uma volta ao sol.", symbol: "★" },
  { id: "confeti", name: "Confeti de alegría", namePt: "Confetes de alegria", description: "Color y energía para las grandes celebraciones.", descriptionPt: "Cor e energia para as grandes celebrações.", symbol: "✺" },
  { id: "enhorabuena", name: "Cumpleaños, enhorabuena", namePt: "Aniversário, parabéns", description: "Cumpleaños, logros y noticias que merecen un aplauso.", descriptionPt: "Aniversários, conquistas e notícias que merecem aplausos.", symbol: "☀" },
];

export const frames: Frame[] = [
  { id: "floral", name: "Flores para ti", namePt: "Flores para ti", image: "/images/floral-clean.png" },
  { id: "classic", name: "Siempre contigo", namePt: "Sempre contigo", image: "/images/frame.jpg" },
  { id: "geometric-heart", name: "Corazones geométricos", namePt: "Corações geométricos", image: "/images/geometric-heart-frame.png" },
  { id: "balloon-frame", name: "Marco de globos", namePt: "Moldura de balões", image: "/images/balloon-frame.png" },
  { id: "romantic-heart", name: "Corazón romántico", namePt: "Coração romântico", image: "/images/romantic-heart-frame.png" },
];

export const addOns: AddOn[] = [
  { id: "sticker", name: "Sticker personalizado", namePt: "Sticker personalizado", description: "Círculo de 7,62 cm (3 pulgadas) con tu fotografía favorita.", descriptionPt: "Círculo de 7,62 cm (3 polegadas) com a tua fotografia favorita.", price: 1.5, image: "/images/sticker-dog.jpg", kind: "sticker" },
];

// Products created from the admin catalog do not necessarily have an uploaded
// ProductImage yet. Keep their storefront cards visual and consistent with the
// built-in catalog until a product-specific image is assigned.
export function getProductPreviewImage(kind?: string | null, category?: string | null) {
  const value = `${kind || ""} ${category || ""}`.toLowerCase();
  if (value.includes("sticker")) return "/images/sticker-dog.jpg";
  if (value.includes("calendar")) return "/images/calendar-product.png";
  if (value.includes("wall")) return "/images/client-wall-art-single.jpg";
  if (value.includes("magnet")) return "/images/magnet-single.jpg";
  if (value.includes("phone")) return "/images/personalised-phone-cases.png";
  if (value.includes("mug")) return "/images/mug-child-beach.jpg";
  return "/images/customizable-template.png";
}

// Official client profiles. These are the fallbacks used until an admin
// overrides them in Settings (stored in SiteSetting under the same keys).
export const SOCIAL_LINK_DEFAULTS = {
  social_facebook: "https://www.facebook.com/profile.php?id=61594739557187",
  social_instagram: "https://www.instagram.com/celebramomentos2026",
  social_google_business: "https://maps.app.goo.gl/oQbnJJoXMmoRDdKh8",
} as const;
export type SocialLinkKey = keyof typeof SOCIAL_LINK_DEFAULTS;
export const SOCIAL_LINK_KEYS = Object.keys(SOCIAL_LINK_DEFAULTS) as SocialLinkKey[];

// Wall Art is a single framed product; customers only choose the size.
// Default prices are in cents and can be overridden from admin Settings
// (SiteSetting "wall_art_prices", a JSON map of size id → cents).
export const WALL_ART_SIZES = [
  { id: "6x4", label: "6 × 4\"", dimensions: "10 × 15 cm", widthCm: 10, heightCm: 15, defaultPriceCents: 1590 },
  { id: "7x5", label: "7 × 5\"", dimensions: "13 × 18 cm", widthCm: 13, heightCm: 18, defaultPriceCents: 1890 },
  { id: "A5", label: "A5", dimensions: "14,8 × 21 cm", widthCm: 14.8, heightCm: 21, defaultPriceCents: 2190 },
  { id: "8x10", label: "8 × 10\"", dimensions: "20 × 25 cm", widthCm: 20, heightCm: 25, defaultPriceCents: 2690 },
  { id: "A4", label: "A4", dimensions: "21 × 29,7 cm", widthCm: 21, heightCm: 29.7, defaultPriceCents: 2990 },
  { id: "30x40", label: "30 × 40", dimensions: "30 × 40 cm", widthCm: 30, heightCm: 40, defaultPriceCents: 4037 },
  { id: "A3", label: "A3", dimensions: "29,7 × 42 cm", widthCm: 29.7, heightCm: 42, defaultPriceCents: 4090 },
  { id: "40x50", label: "40 × 50", dimensions: "40 × 50 cm", widthCm: 40, heightCm: 50, defaultPriceCents: 4690 },
  { id: "A2", label: "A2", dimensions: "42 × 59,4 cm", widthCm: 42, heightCm: 59.4, defaultPriceCents: 4990 },
  { id: "50x70", label: "50 × 70", dimensions: "50 × 70 cm", widthCm: 50, heightCm: 70, defaultPriceCents: 5532 },
  { id: "A1", label: "A1", dimensions: "59,4 × 84,1 cm", widthCm: 59.4, heightCm: 84.1, defaultPriceCents: 6290 },
] as const;
export type WallArtSizeId = (typeof WALL_ART_SIZES)[number]["id"];
export const WALL_ART_SIZE_IDS = WALL_ART_SIZES.map((size) => size.id) as [WallArtSizeId, ...WallArtSizeId[]];
export const DEFAULT_WALL_ART_PRICES = Object.fromEntries(WALL_ART_SIZES.map((size) => [size.id, size.defaultPriceCents])) as Record<WallArtSizeId, number>;
export const WALL_ART_IMAGE = "/images/client-wall-art-single.jpg";
// Sample photo placed inside the frame preview until the customer uploads one.
export const WALL_ART_SAMPLE_PHOTO = "/images/moment-family-memories.jpg";
export function wallArtSizeText(size: { label: string; dimensions: string }) {
  return size.dimensions.startsWith(size.label) ? size.dimensions : `${size.label} · ${size.dimensions}`;
}

export const MAGNET_PACK_PRICES_CENTS: Record<4 | 9, number> = { 4: 990, 9: 1490 };
// One photo per magnet, cut from the client's pack photo, used until the
// customer uploads their own.
export const MAGNET_SAMPLE_PHOTOS = Array.from({ length: 9 }, (_, index) => `/images/magnet-photo-${index + 1}.jpg`);

export const STICKER_PRICES = [0, 1.5, 2.5, 3.5] as const;
export const ENVELOPE_TEXT_PRICE = 1;
export const PACKAGING_PRICES: Record<Packaging, number> = { standard: 0, gift: 2.5 };
export const SIZE_PRICES: Record<CardSize, number> = { A4: 0, A3: 3 };

export const stickerGallery = [
  { id: "family", image: "/images/sticker-family.jpg", label: "Familia" },
  { id: "baby", image: "/images/sticker-baby.jpg", label: "Pequeños momentos" },
  { id: "dog", image: "/images/sticker-dog.jpg", label: "Tu compañero" },
  { id: "sports", image: "/images/sticker-lifestyle-sports.jpg", label: "Tus pasiones" },
];

export const mockOrders = [
  { id: "CM-10482", date: "18 Jun 2026", item: "", amount: "18,40 €", payment: "Pagado", status: "En camino", statusTone: "amber", delivery: "Express" },
  { id: "CM-10291", date: "04 May 2026", item: "Siempre contigo", amount: "15,90 €", payment: "Pagado", status: "Entregado", statusTone: "green", delivery: "Estándar" },
  { id: "CM-09844", date: "14 Feb 2026", item: "Flores para ti + sticker", amount: "17,50 €", payment: "Pagado", status: "Entregado", statusTone: "green", delivery: "Estándar" },
];

export const mockCustomers = [
  { name: "María García", email: "maria.garcia@email.com", orders: 4, last: "18 Jun 2026", consent: true },
  { name: "João Pereira", email: "joao.pereira@email.com", orders: 2, last: "12 Jun 2026", consent: true },
  { name: "Lucía Romero", email: "lucia.romero@email.com", orders: 1, last: "04 Jun 2026", consent: false },
  { name: "Ana Silva", email: "ana.silva@email.com", orders: 6, last: "28 May 2026", consent: true },
];

export const mockDiscounts = [
  { code: "HOLA10", type: "percentage", value: "10%", expires: "30 Sep 2026", used: 48, active: true },
  { code: "MOMENTO5", type: "fixed", value: "5,00 €", expires: "31 Dec 2026", used: 19, active: true },
  { code: "PRIMERPEDIDO", type: "percentage", value: "15%", expires: "15 Aug 2026", used: 102, active: false },
];

export const translations = {
  es: { home: "Inicio", designs: "Diseños", how: "Cómo funciona", extras: "Extras", help: "Ayuda", account: "Mi cuenta", selection: "Mi selección", back: "Volver", continue: "Continuar", save: "Guardar cambios", cancel: "Cancelar", standard: "Estándar", express: "Express" },
  pt: { home: "Início", designs: "Designs", how: "Como funciona", extras: "Extras", help: "Ajuda", account: "A minha conta", selection: "A minha seleção", back: "Voltar", continue: "Continuar", save: "Guardar alterações", cancel: "Cancelar", standard: "Normal", express: "Expresso" },
} as const;
