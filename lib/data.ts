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
  { id: "template-1", name: "Magazine", namePt: "Revista", eyebrow: "REVISTA · 4 FOTOS", description: "Una portada de revista con una foto protagonista y tres fotografías en el interior. No necesita marco.", descriptionPt: "Uma capa de revista com uma fotografia principal e três fotografias no interior. Não precisa de moldura.", image: "/images/magazine-reference-preview.png", price: 8.9, imageCount: 4, requiresFrame: false, magazineStyle: true },
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
];

export const addOns: AddOn[] = [
  { id: "sticker", name: "Sticker personalizado", namePt: "Sticker personalizado", description: "Círculo de 7,62 cm (3 pulgadas) con tu fotografía favorita.", descriptionPt: "Círculo de 7,62 cm (3 polegadas) com a tua fotografia favorita.", price: 1.5, image: "/images/sticker-dog.jpg", kind: "sticker" },
];

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
