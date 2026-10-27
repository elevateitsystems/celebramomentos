import { CARD_SIZE_IDS, DEFAULT_CARD_SIZE_PRICES, SOCIAL_LINK_DEFAULTS, SOCIAL_LINK_KEYS, type CardSize, type SocialLinkKey } from "@/lib/data";
import { DEFAULT_DELIVERY_RATES, type DeliveryRates } from "@/lib/shipping";
import { prisma } from "./prisma";

export const CARD_SIZE_PRICES_KEY = "card_size_prices";

export type PublicSettings = {
  social: Record<SocialLinkKey, string>;
  cardSizePrices: Record<CardSize, number>;
  delivery: DeliveryRates;
};

export function isSocialLinkKey(key: string): key is SocialLinkKey {
  return (SOCIAL_LINK_KEYS as string[]).includes(key);
}

export function validSocialUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

// Returns a complete card size price table (cents added to the template price),
// or null when the stored value is not a usable map of known sizes to cents.
export function parseCardSizePrices(value: string | null | undefined): Record<CardSize, number> | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const prices = { ...DEFAULT_CARD_SIZE_PRICES };
    for (const [key, cents] of Object.entries(parsed)) {
      if (!(CARD_SIZE_IDS as string[]).includes(key)) return null;
      if (typeof cents !== "number" || !Number.isInteger(cents) || cents < 0 || cents > 1_000_000) return null;
      prices[key as CardSize] = cents;
    }
    return prices;
  } catch {
    return null;
  }
}

export async function getCardSizePrices() {
  const row = await prisma.siteSetting.findUnique({ where: { key: CARD_SIZE_PRICES_KEY }, select: { value: true } });
  return parseCardSizePrices(row?.value) || { ...DEFAULT_CARD_SIZE_PRICES };
}

// Standard and express delivery, as edited in admin Settings.
export async function getDeliveryRates(): Promise<DeliveryRates> {
  const rows = await prisma.shippingMethod.findMany({ where: { slug: { in: ["standard", "express"] } }, select: { slug: true, priceCents: true, freeFromCents: true } });
  const rates: DeliveryRates = { standard: { ...DEFAULT_DELIVERY_RATES.standard }, express: { ...DEFAULT_DELIVERY_RATES.express } };
  for (const row of rows) rates[row.slug as keyof DeliveryRates] = { priceCents: row.priceCents, freeFromCents: row.freeFromCents };
  return rates;
}

export async function getPublicSettings(): Promise<PublicSettings> {
  const [rows, delivery] = await Promise.all([
    prisma.siteSetting.findMany({ where: { key: { in: [...SOCIAL_LINK_KEYS, CARD_SIZE_PRICES_KEY] }, isSecret: false }, select: { key: true, value: true } }),
    getDeliveryRates(),
  ]);
  const byKey = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  const social = Object.fromEntries(SOCIAL_LINK_KEYS.map((key) => {
    const stored = byKey[key]?.trim();
    // Never configured → official default; saved empty → hidden; invalid → default.
    if (stored === undefined) return [key, SOCIAL_LINK_DEFAULTS[key]];
    return [key, stored === "" ? "" : validSocialUrl(stored) ? stored : SOCIAL_LINK_DEFAULTS[key]];
  })) as Record<SocialLinkKey, string>;
  return { social, cardSizePrices: parseCardSizePrices(byKey[CARD_SIZE_PRICES_KEY]) || { ...DEFAULT_CARD_SIZE_PRICES }, delivery };
}
