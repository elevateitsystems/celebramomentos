// Phone case catalog from Printeers (API v1). Server only.
//
// V1 has no product groups: its only catalog call is GET /stock, a flat list of SKUs. A
// "product group" is therefore derived from the stock attributes: case type + print side +
// case colour (e.g. "Soft case · Back printed · Transparent"). Each phone case product in
// admin is linked to one such group per environment (admin → Products, saved in
// Product.metadata.printeers); the phone models are the group's SKUs. Nothing here is a
// hardcoded SKU, model or price. The stock list is cached for a few minutes so the
// storefront does not download it on every page view.
import { podMode, printeersConfig } from "../config";
import type { PodMode } from "../types";
import { printeersApi, type PrinteersStockItem } from "./api";

const TTL_MS = 10 * 60_000;
const cache = new Map<string, { at: number; value: Promise<unknown> }>();

function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value as Promise<T>;
  const value = load();
  cache.set(key, { at: Date.now(), value });
  // A failed call is not remembered, so the next request tries again.
  value.catch(() => { if (cache.get(key)?.value === value) cache.delete(key); });
  return value;
}

export const printeersEnvironment = (mode: PodMode = podMode()) => (mode === "live" ? "live" : "test");

// The Printeers product group linked to an admin product in the current environment.
export function linkedProductgroup(metadata: unknown, mode: PodMode = podMode()): string | null {
  const value = metadata && typeof metadata === "object" ? (metadata as { printeers?: Record<string, unknown> }).printeers : null;
  const reference = value?.[printeersEnvironment(mode)];
  return typeof reference === "string" && reference ? reference : null;
}

// Usable when the current environment has a partner code and API key.
export const printeersCatalogReady = (mode: PodMode = podMode()) => {
  const config = printeersConfig(mode);
  return Boolean(config.apiKey && config.partnerCode);
};

// "Apple iPhone 15 Pro Soft case (back printed, transparent)" → "Apple iPhone 15 Pro": the
// case type is already the product the customer picked, so only the phone model is shown.
export function phoneModelName(name: string) {
  // The optional word before "case" is limited to case types, so "Pro Max case (…)" keeps "Max";
  // the bracket must start with a print description, so a year such as "(2016)" stays. Some
  // names lack the word "case" or the closing bracket, which is tolerated.
  return name
    .replace(/\s+(?:(?:soft|hard|wallet|tough|hybrid|bumper|crossbody|biodegradable|smart|back)\s+)?(?:cases?\s*)?\((?:back|front|fully|white|black|transparent)[^)]*\)?\s*$/i, "")
    // "Apple iPhone 15 Hybrid case with MagSafe": the MagSafe case type is the product already chosen.
    .replace(/\s+(?:(?:soft|hard|tough|hybrid|clear)\s+)?case\s+with\s+magsafe\s*$/i, "")
    .replace(/\s+/g, " ").trim() || name.trim();
}

// ── Stock → phone cases ──
// Not phone cases: earbud cases, laptop sleeves and the catch-all "Other" (case types), and tablet
// cases that share a case type with phones (iPad, Galaxy Tab…).
const NOT_PHONE_CASE = /airpods|macbook|sleeve|^other$/i;
const TABLET = /\bipad\b|galaxy tab|\btab [a-z]?\d|\btablet\b|matepad|\bpad\b/i;

const slug = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

type StockCase = { item: PrinteersStockItem; group: string };

// Group reference of a stock item, or null when it is not a printable phone case.
export function stockGroup(item: PrinteersStockItem): { reference: string; name: string } | null {
  const attributes = item.attributes;
  if (item.kind !== "print" || !attributes?.case_type || !attributes.device_models?.length || NOT_PHONE_CASE.test(attributes.case_type)) return null;
  if (attributes.device_models.some((model) => TABLET.test(model)) || TABLET.test(item.name)) return null;
  const parts = [attributes.case_type, attributes.print_side, attributes.case_colour].filter((part): part is string => Boolean(part));
  return { reference: slug(parts.join(" ")).slice(0, 80), name: parts.join(" · ") };
}

// Can be ordered now: in stock, or out of stock but open to backorders.
export const orderable = (item: PrinteersStockItem) => Boolean(item.availability && (item.availability.status !== "out-of-stock" || item.availability.can_backorder));
// Out of stock but Printeers takes the order and makes it when the blank case is back: still sold
// (never shown as "sold out"); the customer is told it may take a few more days.
export const backordered = (item: PrinteersStockItem) => Boolean(item.availability && item.availability.status === "out-of-stock" && item.availability.can_backorder);

const euroCents = (value: string | null | undefined) => {
  const amount = Number(value);
  return value != null && value !== "" && Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) : null;
};

function stockCases(mode: PodMode) {
  return cached(`${mode}:stock`, async () => {
    const items = await printeersApi.stock({ mode });
    const cases: StockCase[] = [];
    for (const item of items) {
      const group = stockGroup(item);
      if (group && group.reference) cases.push({ item, group: group.reference });
    }
    return cases;
  });
}

export type PrinteersProductgroup = { reference: string; name: string; private: boolean; suggestedRetailPrice: number | null; price: number | null };

// Groups with at least one orderable model. Prices are the lowest of the group's SKUs (EUR cents).
export async function productgroups(mode: PodMode = podMode()): Promise<PrinteersProductgroup[]> {
  const groups = new Map<string, PrinteersProductgroup>();
  for (const { item, group } of await stockCases(mode)) {
    if (!orderable(item)) continue;
    const info = stockGroup(item)!;
    const price = euroCents(item.price);
    const srp = euroCents(item.suggested_retail_price);
    const current = groups.get(group) ?? { reference: group, name: info.name, private: false, suggestedRetailPrice: null, price: null };
    current.price = price != null && (current.price == null || price < current.price) ? price : current.price;
    current.suggestedRetailPrice = srp != null && (current.suggestedRetailPrice == null || srp < current.suggestedRetailPrice) ? srp : current.suggestedRetailPrice;
    groups.set(group, current);
  }
  return Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name, "es", { numeric: true }));
}

// available: can be ordered now (in stock or on backorder); backorder: it may ship a few days later.
export type PhoneModel = { reference: string; name: string; available: boolean; backorder: boolean };

// Models of a group; the reference of a model is its Printeers SKU. Printeers sometimes lists one phone
// under two SKUs (e.g. "Samsung Galaxy J3 (2016)" twice): the customer sees each phone once, preferring
// a SKU in stock over one on backorder.
export async function phoneModels(productgroupReference: string, mode: PodMode = podMode()): Promise<PhoneModel[]> {
  const byName = new Map<string, PhoneModel>();
  for (const { item, group } of await stockCases(mode)) {
    if (group !== productgroupReference || !orderable(item)) continue;
    const model = { reference: item.sku, name: phoneModelName(item.name), available: orderable(item), backorder: backordered(item) };
    const kept = byName.get(model.name);
    if (!kept || (kept.backorder && !model.backorder)) byName.set(model.name, model);
  }
  return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name, "es", { numeric: true }));
}

export type PhoneModelDetail = {
  reference: string;
  name: string;
  available: boolean;
  backorder: boolean;
  // Print area of the case back, in mm; the print file is made at this shape.
  printMm: { width: number; height: number } | null;
  // Mockup layers (bottom → photo through mask → top) for the live preview. In V1 every layer
  // image is the same square canvas: the mask is a full-canvas image and the print area sits
  // at (maskOffsetXPx, maskOffsetYPx) inside it (`maskCanvas`).
  layers: { top: boolean; mask: boolean; bottom: boolean; mockup: boolean; maskWidthPx: number; maskHeightPx: number; maskOffsetXPx: number; maskOffsetYPx: number; ppmm: number; maskCanvas: true } | null;
};

const layerImages = (item: PrinteersStockItem) => item.rendering_layers;

function detailOf(item: PrinteersStockItem): PhoneModelDetail {
  const width = item.dimension_width_mm;
  const height = item.dimension_height_mm;
  const layers = layerImages(item);
  const usable = layers && layers.ppmm && layers.ppmm > 0 && width && height && Number.isFinite(layers.offset_x) && Number.isFinite(layers.offset_y) && (layers.bottom_url || layers.mockup_url);
  return {
    reference: item.sku,
    name: phoneModelName(item.name),
    available: orderable(item),
    backorder: backordered(item),
    printMm: width && height ? { width, height } : null,
    layers: usable ? {
      top: Boolean(layers.top_url), mask: Boolean(layers.mask_url), bottom: Boolean(layers.bottom_url), mockup: Boolean(layers.mockup_url),
      // The print area is width × height mm at ppmm pixels per millimetre.
      maskWidthPx: Math.round(width * layers.ppmm!), maskHeightPx: Math.round(height * layers.ppmm!),
      maskOffsetXPx: layers.offset_x!, maskOffsetYPx: layers.offset_y!, ppmm: layers.ppmm!, maskCanvas: true,
    } : null,
  };
}

// A model of the group, or null when the SKU is not part of it or cannot be ordered (never trust the browser).
export async function phoneModel(productgroupReference: string, sku: string, mode: PodMode = podMode()): Promise<{ detail: PhoneModelDetail; item: PrinteersStockItem } | null> {
  if (!/^[A-Za-z0-9_-]{3,80}$/.test(sku)) return null;
  const found = (await stockCases(mode)).find(({ item }) => item.sku === sku);
  if (!found || found.group !== productgroupReference || !orderable(found.item)) return null;
  return { item: found.item, detail: detailOf(found.item) };
}

// Mockup layer images are public files on Printeers' own file hosts.
const LAYER_HOST = /^files\.(?:test-)?printeers\.com$/;

// URL of one mockup layer image, as given by Printeers for this SKU (https and a Printeers file host only).
export async function layerUrl(productgroupReference: string, sku: string, layer: "top" | "mask" | "bottom" | "mockup", mode: PodMode = podMode()) {
  const found = await phoneModel(productgroupReference, sku, mode);
  const url = found?.item.rendering_layers?.[`${layer}_url` as const];
  if (typeof url !== "string") return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && LAYER_HOST.test(parsed.hostname) ? parsed.toString() : null;
  } catch {
    return null;
  }
}
