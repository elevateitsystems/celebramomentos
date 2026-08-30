export type Language = "es" | "pt";
export type CardSize = "A4" | "A3";
export type DeliveryMethod = "standard" | "express";
export type RecipientMode = "recipient" | "customer";

export type Template = {
  id: string;
  name: string;
  namePt?: string;
  eyebrow: string;
  description: string;
  descriptionPt?: string;
  image: string;
  price: number;
};

export type AddOn = {
  id: string;
  name: string;
  namePt: string;
  description: string;
  descriptionPt: string;
  price: number;
  image?: string;
  kind: "sticker" | "chocolate";
};

export const templates: Template[] = [
  { id: "floral", name: "Flores para ti", namePt: "Flores para ti", eyebrow: "GRACIAS", description: "Un rincón bonito para decir todo eso que a veces cuesta.", descriptionPt: "Um cantinho bonito para dizer tudo o que às vezes custa.", image: "/images/floral.jpg", price: 8.9 },
  { id: "frame", name: "Siempre contigo", namePt: "Sempre contigo", eyebrow: "MOMENTOS", description: "Una foto, unas palabras y un recuerdo que dura mucho más.", descriptionPt: "Uma fotografia, algumas palavras e uma recordação que dura.", image: "/images/frame.jpg", price: 8.9 },
  { id: "romantic-red", name: "Un corazón para ti", namePt: "Um coração para ti", eyebrow: "AMOR", description: "Un marco rojo lleno de cariño para escribir algo inolvidable.", descriptionPt: "Uma moldura vermelha cheia de carinho para escrever algo inesquecível.", image: "/images/romantic-red.jpg", price: 8.9 },
];

export const addOns: AddOn[] = [
  { id: "sticker", name: "Sticker personalizado", namePt: "Sticker personalizado", description: "Círculo de 7,62 cm con tu fotografía favorita.", descriptionPt: "Círculo de 7,62 cm com a tua fotografia favorita.", price: 1.5, image: "/images/sticker-dog.jpg", kind: "sticker" },
  { id: "small-chocolate", name: "Bombones surtidos Artesanía de Trapa · 72 g", namePt: "Bombons sortidos Artesanía de Trapa · 72 g", description: "Una selección de bombones surtidos Artesanía de Trapa de 72 g para acompañar tu mensaje.", descriptionPt: "Uma seleção de bombons sortidos Artesanía de Trapa de 72 g para acompanhar a tua mensagem.", price: 5.9, image: "/images/chocolate-small.jpg", kind: "chocolate" },
  { id: "heart-chocolate", name: "Bombones de corazón Celebra Momentos", namePt: "Bombons em forma de coração Celebra Momentos", description: "Cuatro bombones de chocolate con forma de corazón, presentados con nuestro toque especial.", descriptionPt: "Quatro bombons de chocolate em forma de coração, apresentados com o nosso toque especial.", price: 7, image: "/images/chocolate-hearts.jpg", kind: "chocolate" },
  { id: "big-chocolate", name: "Caja grande de bombones artesanos", namePt: "Caixa grande de bombons artesanais", description: "Una caja grande de chocolates artesanos para compartir y celebrar sin prisa.", descriptionPt: "Uma caixa grande de chocolates artesanais para partilhar e celebrar sem pressa.", price: 7.5, image: "/images/chocolate-small.jpg", kind: "chocolate" },
];

export const stickerGallery = [
  { id: "family", image: "/images/sticker-family.jpg", label: "Familia" },
  { id: "baby", image: "/images/sticker-baby.jpg", label: "Pequeños momentos" },
  { id: "dog", image: "/images/sticker-dog.jpg", label: "Tu compañero" },
  { id: "sports", image: "/images/sticker-lifestyle-sports.jpg", label: "Tus pasiones" },
];

export const mockOrders = [
  { id: "CM-10482", date: "18 Jun 2026", item: "", amount: "18,40 €", payment: "Pagado", status: "En camino", statusTone: "amber", delivery: "Express" },
  { id: "CM-10291", date: "04 May 2026", item: "Siempre contigo", amount: "15,90 €", payment: "Pagado", status: "Entregado", statusTone: "green", delivery: "Estándar" },
  { id: "CM-09844", date: "14 Feb 2026", item: "Flores para ti + chocolates", amount: "23,40 €", payment: "Pagado", status: "Entregado", statusTone: "green", delivery: "Estándar" },
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
