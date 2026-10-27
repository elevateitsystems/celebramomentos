export type Language = "es" | "pt";
export type CardSize = "5x7" | "A5";
export type DeliveryMethod = "standard" | "express";
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


// Products created from the admin catalog do not necessarily have an uploaded
// ProductImage yet. Keep their storefront cards visual and consistent with the
// built-in catalog until a product-specific image is assigned.
export function getProductPreviewImage(kind?: string | null, category?: string | null) {
  const value = `${kind || ""} ${category || ""}`.toLowerCase();
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

// Card sizes sold through Prodigi (PRODUCTS.pdf). The price added to the
// template price for each size is set in admin Settings (SiteSetting
// "card_size_prices", size id → cents).
export const CARD_SIZES = [
  { id: "5x7", label: "5 × 7\"", dimensions: "12,7 × 17,8 cm", sku: "CLASSIC-GRE-FEDR-7X5-BLA" },
  { id: "A5", label: "A5", dimensions: "14,8 × 21 cm", sku: "CLASSIC-GRE-FEDR-A5-BLA" },
] as const satisfies readonly { id: CardSize; label: string; dimensions: string; sku: string }[];
export const CARD_SIZE_IDS = CARD_SIZES.map((size) => size.id) as [CardSize, ...CardSize[]];
export const DEFAULT_CARD_SIZE: CardSize = "5x7";
export const DEFAULT_CARD_SIZE_PRICES: Record<CardSize, number> = { "5x7": 0, A5: 0 };
export function cardSizeText(id: string) {
  const size = CARD_SIZES.find((item) => item.id === id);
  return size ? `${size.label} · ${size.dimensions}` : id;
}

// Sample photos shown on empty magnet slots until the customer uploads their own.
export const MAGNET_SAMPLE_PHOTOS = Array.from({ length: 9 }, (_, index) => `/images/magnet-photo-${index + 1}.jpg`);


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
