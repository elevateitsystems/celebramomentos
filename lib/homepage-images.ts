// Every image of the home page that the admin can replace (admin → Homepage).
// A slot's `fallback` is the built-in image: it is shown until the admin
// uploads another one, and again when the custom image is removed. Custom
// images are stored as one JSON map { slotId: url } in SiteSetting.
import { PRODUCT_KIND_INFO } from "./products";

export const HOMEPAGE_IMAGES_KEY = "homepage_images";

export type HomepageSectionId = "hero" | "categories" | "how" | "moments" | "inspire" | "transformations" | "made";

export const HOMEPAGE_SECTIONS: readonly { id: HomepageSectionId; title: string; where: string }[] = [
  { id: "hero", title: "Hero banner", where: "The big picture at the top of the home page, next to “Hazlo personal”." },
  { id: "categories", title: "Product cards", where: "“¿Qué puedes crear?” — one card per product category. The price badge sits on the top right corner, so keep it free." },
  { id: "how", title: "3 steps", where: "“Así de fácil” / “É assim tão fácil” — the photo behind each step. The text sits at the bottom, so calm pictures read best." },
  { id: "moments", title: "Moments", where: "“Hecho para emocionar” / “Feito para emocionar” (Handmade to move) — one photo per occasion; the title sits at the bottom." },
  { id: "inspire", title: "Gift ideas", where: "“Inspírate” / “Inspira-te” (Get inspired) — three tall cards with the title at the bottom." },
  { id: "transformations", title: "Before and after", where: "“Tu foto. Tus palabras. Tu historia.” — each pair shows the customer's photo and the finished product." },
  { id: "made", title: "Customer creations", where: "“Hecho por vosotros” / “Feito por vocês” — the photo inside each example card (the card frame, text and stickers stay as they are)." },
];

type Ratio = readonly [number, number];

// `crop`: the built-in image is a part of a larger picture, so the admin
// preview shows that part instead of the whole file.
const slot = <const Id extends string>(id: Id, section: HomepageSectionId, label: string, fallback: string, ratio: Ratio, size: string, crop = false) => ({ id, section, label, fallback, ratio, size, crop });

export const HOMEPAGE_IMAGE_SLOTS = [
  slot("hero", "hero", "Hero banner", "/images/hero-products-overview.jpg", [3, 2], "1500 × 1000 px (3:2)"),

  slot("category.POSTCARD", "categories", PRODUCT_KIND_INFO.POSTCARD.admin, "/images/ljVw4.jpg", [4, 3], "1200 × 900 px (4:3)"),
  slot("category.CALENDAR", "categories", PRODUCT_KIND_INFO.CALENDAR.admin, "/images/calendar-product.png", [4, 3], "1200 × 900 px (4:3)"),
  slot("category.WALL_ART", "categories", PRODUCT_KIND_INFO.WALL_ART.admin, "/images/client-wall-art-trio.jpg", [4, 3], "1200 × 900 px (4:3)"),
  slot("category.MAGNET", "categories", PRODUCT_KIND_INFO.MAGNET.admin, "/images/magnet-single.jpg", [4, 3], "1200 × 900 px (4:3)"),
  slot("category.PHONE_CASE", "categories", PRODUCT_KIND_INFO.PHONE_CASE.admin, "/images/personalised-phone-cases.png", [4, 3], "1200 × 900 px (4:3)"),
  slot("category.MUG", "categories", PRODUCT_KIND_INFO.MUG.admin, "/images/mug-child-beach.jpg", [4, 3], "1200 × 900 px (4:3)"),

  slot("how.1", "how", "Step 1 · Elige tu producto", "/images/hero-products-overview.jpg", [11, 10], "1100 × 1000 px"),
  slot("how.2", "how", "Step 2 · Añade fotos y palabras", "/images/step-add-photos.jpg", [11, 10], "1100 × 1000 px"),
  slot("how.3", "how", "Step 3 · Previsualiza y pide", "/images/step-preview-delivery.jpg", [11, 10], "1100 × 1000 px"),

  slot("moments.birthday", "moments", "Cumpleaños", "/images/birthday-family-celebration.jpg", [6, 5], "1200 × 1000 px (6:5)"),
  slot("moments.family", "moments", "Recuerdos familiares", "/images/moment-family-memories.jpg", [6, 5], "1200 × 1000 px (6:5)"),
  slot("moments.anniversary", "moments", "Aniversarios", "/images/romantic-couple.png", [6, 5], "1200 × 1000 px (6:5)"),
  slot("moments.holidays", "moments", "Navidad y celebraciones", "/images/moment-celebration-holidays.jpg", [9, 5], "1800 × 1000 px (wide, 9:5)"),
  slot("moments.home", "moments", "Para tu hogar", "/images/client-wall-art-trio.jpg", [9, 5], "1800 × 1000 px (wide, 9:5)"),

  slot("inspire.single", "inspire", "Arte de pared · tus fotos enmarcadas", "/images/client-wall-art-single.jpg", [3, 4], "900 × 1200 px (portrait, 3:4)"),
  slot("inspire.sizes", "inspire", "Diferentes tamaños", "/images/client-wall-art-trio.jpg", [3, 4], "900 × 1200 px (portrait, 3:4)"),
  slot("inspire.gifts", "inspire", "Regalos · mucho más que una foto", "/images/hero-products-overview.jpg", [3, 4], "900 × 1200 px (portrait, 3:4)"),

  slot("transform.wall-before", "transformations", "Wall art · customer photo", "/images/vDyvv.jpg", [1, 1], "800 × 800 px (square)"),
  slot("transform.wall-after", "transformations", "Wall art · finished product", "/images/1Q9OC.jpg", [1, 1], "800 × 800 px (square)"),
  slot("transform.card-before", "transformations", "Card · customer photo", "/images/birthday-celebration.png", [1, 1], "800 × 800 px (square)"),
  slot("transform.card-after", "transformations", "Card · finished product", "/images/uVWMM.jpg", [1, 1], "800 × 800 px (square)"),

  slot("made.graduation", "made", "Floral birthday card · photo", "/images/graduation-celebration.png", [1, 1], "800 × 800 px (square)"),
  slot("made.romantic", "made", "Heart frame card · photo", "/images/romantic-couple.png", [1, 1], "800 × 800 px (square)"),
  slot("made.magazine", "made", "Magazine card · cover photo", "/images/roberto-match-contact-sheet.png", [148, 100], "1200 × 810 px (landscape)", true),
] as const;

export type HomepageImageSlot = (typeof HOMEPAGE_IMAGE_SLOTS)[number];
export type HomepageImageId = HomepageImageSlot["id"];
export type HomepageImages = Partial<Record<HomepageImageId, string>>;

export const HOMEPAGE_IMAGE_IDS = HOMEPAGE_IMAGE_SLOTS.map((item) => item.id) as [HomepageImageId, ...HomepageImageId[]];
export const HOMEPAGE_IMAGE_DEFAULTS = Object.fromEntries(HOMEPAGE_IMAGE_SLOTS.map((item) => [item.id, item.fallback])) as Record<HomepageImageId, string>;

export function isHomepageImageId(value: unknown): value is HomepageImageId {
  return typeof value === "string" && (HOMEPAGE_IMAGE_IDS as string[]).includes(value);
}

// Keeps only known slots with an https image URL; anything else is dropped.
export function parseHomepageImages(value: string | null | undefined): HomepageImages {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const images: HomepageImages = {};
    for (const [id, url] of Object.entries(parsed)) {
      if (isHomepageImageId(id) && typeof url === "string" && url.startsWith("https://")) images[id] = url;
    }
    return images;
  } catch {
    return {};
  }
}
