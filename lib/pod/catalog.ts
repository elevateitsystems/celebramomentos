// Product mapping: internal product + size + options → the print shop's product
// reference and print files. Only ids verified against each shop's API are used
// (see gelato-catalog.ts and the notes below). An admin
// "Print shop SKU" on a size always wins, so any mapping can be corrected without code.
//
// Verified 2026-11-01:
// - Prodigi GET /v4.0/products/{sku}: CLASSIC-GRE-FEDR-7X5-BLA print area "default"
//   6120 × 2160 px, CLASSIC-GRE-FEDR-A5-BLA 7086 × 2526 px, M-MAG-FRI-3X2 850 × 566 px.
// - Printful GET /products/403 "White Ceramic Mug with Color Inside" and
//   /mockup-generator/printfiles/403: placement "default", 11 oz 2700 × 1050 px, 15 oz 2700 × 1140 px.
// - Gelato Product API catalogs poster-hangers, calendars, phone-cases.
// - Printeers (5 Nov 2026): product references and print areas come from the Printeers
//   API per order item (chosen by the customer from the live catalog), not from this file.
import type { PodProvider } from "@prisma/client";
import { mmToPx, type ImageCrop } from "@/lib/crop";
import { POSTER_DPI } from "@/lib/print-quality";
import { gelatoFormatMm, type PrintSpec } from "./artwork";
import { GELATO_CALENDAR_UIDS, GELATO_POSTER_HANGER_UIDS, GELATO_TOUGH_CASE_UIDS } from "./gelato-catalog";
import type { PodIssue } from "./types";

export type ItemContext = {
  kind: string; // ProductKind of the ordered product ("POSTCARD" for cards)
  provider: PodProvider;
  productName: string;
  variantName: string | null;
  podSku: string | null; // admin override (ProductVariant.attributes.podSku)
  options: Record<string, string>;
  photoCount: number;
  cardSize: string | null;
  cardSku: string | null;
  // Phone cases: the Printeers product (phone model) the customer chose, its print area
  // and how the photo was framed, all checked against the Printeers API at checkout.
  printeers?: { productReference: string; printMm: { width: number; height: number } | null; crop: ImageCrop | null } | null;
};

// One print shop line. Magnet packs become one line per photo (each magnet has its own picture).
export type MappedUnit = { productRef: string | null; specs: PrintSpec[]; label?: string };
export type ItemMapping = { units: MappedUnit[]; issues: PodIssue[] };

const blocker = (code: string, message: string): PodIssue => ({ code, severity: "blocker", message });

const optionValue = (options: Record<string, string>, key: RegExp) => Object.entries(options).find(([name]) => key.test(name))?.[1] ?? null;

// ── Prodigi ──────────────────────────────────────────────────────────────────
export const PRODIGI_MAGNET_SKU = "M-MAG-FRI-3X2";
// Prodigi greeting cards: one print area ("default") holding the 4 card pages side by side.
// - width × height: the print area size Prodigi's API gives for the SKU (GET /v4.0/products/{sku},
//   variants[].printAreaSizes.default, read from the sandbox on 2026-11-09).
// - pages: which card page goes in each quarter, left to right. Prodigi does not publish this in its
//   API or public docs (checked 2026-11-09); this is the usual folded-card layout (outside spread:
//   back | front, then inside spread: inside left | inside right). CONFIRM IT WITH PRODIGI'S
//   TEMPLATE FOR THE SKU before sending live orders, and change only this list if it differs.
// A new card product only needs an entry here.
export const CARD_STRIP_ORDER = ["back", "front", "inside-left", "inside-right"] as const;
export const PRODIGI_CARD_LAYOUTS: Record<string, { width: number; height: number; pages: readonly string[] }> = {
  "CLASSIC-GRE-FEDR-7X5-BLA": { width: 6120, height: 2160, pages: CARD_STRIP_ORDER },
  "CLASSIC-GRE-FEDR-A5-BLA": { width: 7086, height: 2526, pages: CARD_STRIP_ORDER },
};

function mapProdigi(ctx: ItemContext): ItemMapping {
  if (ctx.kind === "MAGNET") {
    const sku = ctx.podSku || PRODIGI_MAGNET_SKU;
    if (!ctx.photoCount) return { units: [], issues: [blocker("missing_photos", "The order has no magnet photos")] };
    return { units: Array.from({ length: ctx.photoCount }, (_, index) => ({ productRef: sku, label: `Magnet ${index + 1}`, specs: [{ area: "default", kind: "photo", photoIndex: index, fit: "fill", width: 850, height: 566, format: "jpg" }] })), issues: [] };
  }
  if (ctx.kind === "POSTCARD") {
    const sku = ctx.podSku || ctx.cardSku;
    const layout = sku ? PRODIGI_CARD_LAYOUTS[sku] : null;
    if (!sku) return { units: [], issues: [blocker("unmapped", `Card size ${ctx.cardSize || "?"} has no Prodigi SKU`)] };
    // The customer's 4 card pages are rendered in the browser at checkout; the print file is composed
    // from them automatically, at the SKU's exact print size and page order (see PRODIGI_CARD_LAYOUTS).
    if (layout) return { units: [{ productRef: sku, specs: [{ area: "default", kind: "pages", pages: [...layout.pages], width: layout.width, height: layout.height, format: "jpg", description: `The 4 card pages side by side (${layout.pages.join(" | ")}), ${layout.width} × ${layout.height} px` }] }], issues: [] };
    // An unknown card SKU has no known layout: it cannot be sent automatically.
    return { units: [{ productRef: sku, specs: [{ area: "default", kind: "admin", description: "Print-ready card file (no layout is configured for this Prodigi SKU)" }] }], issues: [] };
  }
  return { units: [], issues: [blocker("unmapped", `Prodigi does not make ${ctx.kind} products in this shop`)] };
}

// ── Printful ─────────────────────────────────────────────────────────────────
// Product 403, variant ids per size and colour (only the colours sold on the storefront).
export const PRINTFUL_MUG_VARIANTS: Record<"11" | "15", Record<string, number>> = {
  "11": { black: 11051, red: 11049, orange: 12579, blue: 11050, pink: 12578, yellow: 11048 },
  "15": { black: 17196, navy: 22373, red: 17200, blue: 17197, pink: 17199 },
};
const PRINTFUL_MUG_FILE = { "11": { width: 2700, height: 1050 }, "15": { width: 2700, height: 1140 } } as const;

export function mugColorKey(value: string | null) {
  const text = (value || "").toLowerCase();
  if (/marin|navy|dark blue/.test(text)) return "navy";
  if (/negr|black|pret/.test(text)) return "black";
  if (/roj|red|verm/.test(text)) return "red";
  if (/naranj|orange|laranj/.test(text)) return "orange";
  if (/azul|blue/.test(text)) return "blue";
  if (/ros|pink/.test(text)) return "pink";
  if (/amarill|yellow|amarel/.test(text)) return "yellow";
  return null;
}

function mapPrintful(ctx: ItemContext): ItemMapping {
  if (ctx.kind !== "MUG") return { units: [], issues: [blocker("unmapped", `Printful is only set up for mugs (got ${ctx.kind})`)] };
  const size = /15/.test(ctx.variantName || "") ? "15" : "11";
  const color = mugColorKey(optionValue(ctx.options, /^colou?r$|^cor$/i));
  const variantId = ctx.podSku || (color ? PRINTFUL_MUG_VARIANTS[size][color] : undefined);
  if (!variantId) return { units: [], issues: [blocker("unmapped", `No Printful variant for the ${size} oz mug in colour "${optionValue(ctx.options, /^colou?r$|^cor$/i) || "?"}"`)] };
  if (!ctx.photoCount) return { units: [], issues: [blocker("missing_photos", "The order has no mug photo")] };
  return { units: [{ productRef: String(variantId), specs: [{ area: "default", kind: "photo", photoIndex: 0, fit: "pad", ...PRINTFUL_MUG_FILE[size], format: "jpg" }] }], issues: [] };
}

// ── Gelato ───────────────────────────────────────────────────────────────────
const GELATO_FORMATS = Array.from(new Set(Object.keys(GELATO_POSTER_HANGER_UIDS).map((key) => key.split("|")[0])));

// Storefront size name ("30 x 40 cm", "A3 (29.7 x 42 cm)") → Gelato poster format uid.
export function gelatoPosterFormat(sizeName: string | null) {
  const name = (sizeName || "").trim();
  const iso = name.match(/^A([0-3])\b/i);
  if (iso) return `A${iso[1]}`;
  if (/^A4\b/i.test(name)) return "A4-8x12-inch";
  const cm = name.match(/(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*cm/i);
  if (!cm) return null;
  const [a, b] = [Number(cm[1].replace(",", ".")) * 10, Number(cm[2].replace(",", ".")) * 10].sort((x, y) => x - y);
  if (!Number.isInteger(a) || !Number.isInteger(b)) return null;
  return GELATO_FORMATS.find((format) => format.startsWith(`${a}x${b}-mm`)) || null;
}

export function gelatoHangerColor(value: string | null) {
  const text = (value || "").toLowerCase();
  if (/blanc|white|branc/.test(text)) return "white";
  if (/negr|black|pret/.test(text)) return "black";
  if (/oscur|dark|escur/.test(text)) return "dark-wood";
  return "natural-wood";
}

// Storefront phone model ("iPhone 15 Pro Max", "Samsung S23 Ultra 5G") → Gelato PhoneModel.
export function gelatoPhoneModel(model: string | null) {
  const text = (model || "").toLowerCase().replace(/\b5g\b/g, "").replace(/\s+/g, " ").trim();
  const iphone = text.match(/^iphone (.+)$/);
  if (iphone) return `iphone-${iphone[1].replace(/\s+/g, "")}`;
  const galaxy = text.match(/^(?:samsung )?(?:galaxy )?(s\d+.*)$/);
  if (galaxy) return `galaxy-${galaxy[1].replace(/\s+/g, "")}`;
  return null;
}

const CALENDAR_FORMATS: [RegExp, string][] = [[/\bA4\b/i, "a4-lt"], [/\bA3\b/i, "a3-11x16-5-inch"], [/14[.,]8\s*[x×]\s*40|148\s*[x×]\s*400/i, "148x400-mm-5-5x16-5-inch"]];

function mapGelato(ctx: ItemContext): ItemMapping {
  if (ctx.kind === "WALL_ART") {
    const format = gelatoPosterFormat(ctx.variantName);
    const orientation = /horiz|paisaj|landscape/i.test(optionValue(ctx.options, /orienta/i) || "") ? "hor" : "ver";
    const color = gelatoHangerColor(optionValue(ctx.options, /marco|frame|colgador|hanger|moldura|suporte/i));
    const uid = ctx.podSku || (format ? GELATO_POSTER_HANGER_UIDS[`${format}|${orientation}|${color}`] : undefined);
    if (!uid) return { units: [], issues: [blocker("unmapped", format ? `Gelato has no ${format} poster in ${orientation === "hor" ? "landscape" : "portrait"} with a ${color} hanger` : `Size "${ctx.variantName}" has no Gelato poster format`)] };
    if (!ctx.photoCount) return { units: [], issues: [blocker("missing_photos", "The order has no poster photo")] };
    const mm = format ? gelatoFormatMm(format) : null;
    const [shortMm, longMm] = mm ? [Math.min(...mm), Math.max(...mm)] : [0, 0];
    const [widthMm, heightMm] = orientation === "hor" ? [longMm, shortMm] : [shortMm, longMm];
    const spec: PrintSpec = mm
      ? { area: "default", kind: "photo", photoIndex: 0, fit: "aspect", width: widthMm, height: heightMm, format: "jpg", minDpiSize: { widthMm, heightMm } }
      : { area: "default", kind: "photo", photoIndex: 0, fit: "original", width: 0, height: 0, format: "jpg" };
    return { units: [{ productRef: uid, specs: [spec] }], issues: [] };
  }
  if (ctx.kind === "CALENDAR") {
    const format = CALENDAR_FORMATS.find(([pattern]) => pattern.test(ctx.variantName || ""))?.[1];
    const uid = ctx.podSku || (format ? GELATO_CALENDAR_UIDS[format] : undefined);
    if (!uid) return { units: [], issues: [blocker("unmapped", `Calendar size "${ctx.variantName}" has no Gelato calendar`)] };
    // Gelato prints calendars from one 14-page PDF; the month layout is drawn in the browser.
    return { units: [{ productRef: uid, specs: [{ area: "default", kind: "admin", description: "Print-ready 14-page calendar PDF (cover + 12 months + back) at the calendar size" }] }], issues: [] };
  }
  if (ctx.kind === "PHONE_CASE") {
    const tough = /tough|rígida|rigida|resistente/i.test(`${ctx.productName} ${ctx.variantName || ""}`);
    const model = optionValue(ctx.options, /modelo|model|movil|móvil|telem/i);
    const key = gelatoPhoneModel(model);
    const uid = ctx.podSku || (tough && key ? GELATO_TOUGH_CASE_UIDS[key] : undefined);
    if (!uid) return { units: [], issues: [blocker("unmapped", tough ? `Gelato has no tough case for "${model || "?"}"` : "Only tough cases are mapped to Gelato")] };
    if (!ctx.photoCount) return { units: [], issues: [blocker("missing_photos", "The order has no case photo")] };
    return { units: [{ productRef: uid, specs: [{ area: "default", kind: "photo", photoIndex: 0, fit: "original", width: 0, height: 0, format: "jpg" }] }], issues: [] };
  }
  return { units: [], issues: [blocker("unmapped", `Gelato is not set up for ${ctx.kind}`)] };
}

// ── Printeers (phone cases) ──────────────────────────────────────────────────
// One line per case: the Printeers product reference is the exact phone model and case,
// and the print file is the customer's framed photo at the product's print area (300 dpi).
// Printeers takes no crop or placement on an order line, so the file must be final.
function mapPrinteers(ctx: ItemContext): ItemMapping {
  if (ctx.kind !== "PHONE_CASE") return { units: [], issues: [blocker("unmapped", `Printeers is only set up for phone cases (got ${ctx.kind})`)] };
  const productRef = ctx.podSku || ctx.printeers?.productReference || null;
  const area = ctx.printeers?.printMm;
  if (!productRef) return { units: [], issues: [blocker("printeers_product_missing", `No Printeers product for "${optionValue(ctx.options, /modelo|model|movil|móvil|telem/i) || ctx.productName}": the case was ordered before its product was linked to Printeers. It cannot be made automatically: delete the order (and refund it if it was paid for real), or handle it by hand.`)] };
  if (!area?.width || !area.height) return { units: [], issues: [blocker("printeers_print_area_missing", `Printeers did not give a print area for ${productRef}`)] };
  if (!ctx.photoCount) return { units: [], issues: [blocker("missing_photos", "The order has no case photo")] };
  const spec: PrintSpec = { area: "default", kind: "photo", photoIndex: 0, fit: "fill", width: mmToPx(area.width), height: mmToPx(area.height), format: "jpg", crop: ctx.printeers?.crop || null };
  return { units: [{ productRef, specs: [spec] }], issues: [] };
}

export function mapOrderItem(ctx: ItemContext): ItemMapping {
  switch (ctx.provider) {
    case "PRODIGI": return mapProdigi(ctx);
    case "PRINTFUL": return mapPrintful(ctx);
    case "GELATO": return mapGelato(ctx);
    case "PRINTEERS": return mapPrinteers(ctx);
    default: return { units: [], issues: [blocker("provider_inactive", "This print shop is no longer used and receives no orders")] };
  }
}

// The size (px) a customer photo is checked against in the product studio, from the same mapping the server
// uses to make the print file: the exact file for fill products (magnets), the poster's printed size at the
// recommended dpi. Null when there is nothing meaningful to compare (mug wraps are padded, not cropped).
export function studioPhotoTarget(ctx: ItemContext): { width: number; height: number } | null {
  const spec = mapOrderItem(ctx).units[0]?.specs.find((item) => item.kind === "photo");
  if (!spec || spec.kind !== "photo") return null;
  if (spec.fit === "fill" && spec.width && spec.height) return { width: spec.width, height: spec.height };
  if (spec.fit === "aspect" && spec.minDpiSize) return { width: Math.round((spec.minDpiSize.widthMm / 25.4) * POSTER_DPI), height: Math.round((spec.minDpiSize.heightMm / 25.4) * POSTER_DPI) };
  return null;
}

// A size/option combination its print shop cannot make (e.g. a poster size Gelato does not offer, or offers
// in one orientation only). Checked when the customer adds it and again at checkout, so an order that could
// never be produced is not paid for. Phone cases and cards are checked against their own catalogues.
export type UnavailableCombination = { reason: "orientation"; available: string } | { reason: "size" };
export function unavailableCombination(ctx: ItemContext): UnavailableCombination | null {
  if (ctx.kind === "PHONE_CASE" || ctx.kind === "POSTCARD") return null;
  const unmapped = (context: ItemContext) => mapOrderItem(context).issues.some((issue) => issue.code === "unmapped");
  if (!unmapped(ctx)) return null;
  if (ctx.kind === "WALL_ART") {
    const key = Object.keys(ctx.options).find((name) => /orienta/i.test(name));
    const other = key ? (/horiz|paisaj|landscape/i.test(ctx.options[key]) ? "Vertical" : "Horizontal") : null;
    if (key && other && !unmapped({ ...ctx, options: { ...ctx.options, [key]: other } })) return { reason: "orientation", available: other };
  }
  return { reason: "size" };
}
