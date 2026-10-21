import { DEFAULT_WALL_ART_PRICES, SOCIAL_LINK_DEFAULTS, SOCIAL_LINK_KEYS, WALL_ART_SIZE_IDS, type SocialLinkKey, type WallArtSizeId } from "@/lib/data";
import { prisma } from "./prisma";

export const WALL_ART_PRICES_KEY = "wall_art_prices";

export type PublicSettings = {
  social: Record<SocialLinkKey, string>;
  wallArtPrices: Record<WallArtSizeId, number>;
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

// Returns a complete price table, or null when the stored value is not a
// usable map of known sizes to non-negative integer cents.
export function parseWallArtPrices(value: string | null | undefined): Record<WallArtSizeId, number> | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const prices = { ...DEFAULT_WALL_ART_PRICES };
    for (const [key, cents] of Object.entries(parsed)) {
      if (!(WALL_ART_SIZE_IDS as string[]).includes(key)) return null;
      if (typeof cents !== "number" || !Number.isInteger(cents) || cents < 0 || cents > 1_000_000) return null;
      prices[key as WallArtSizeId] = cents;
    }
    return prices;
  } catch {
    return null;
  }
}

export async function getPublicSettings(): Promise<PublicSettings> {
  const rows = await prisma.siteSetting.findMany({ where: { key: { in: [...SOCIAL_LINK_KEYS, WALL_ART_PRICES_KEY] }, isSecret: false }, select: { key: true, value: true } });
  const byKey = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  const social = Object.fromEntries(SOCIAL_LINK_KEYS.map((key) => {
    const stored = byKey[key]?.trim();
    // Never configured → official default; saved empty → hidden; invalid → default.
    if (stored === undefined) return [key, SOCIAL_LINK_DEFAULTS[key]];
    return [key, stored === "" ? "" : validSocialUrl(stored) ? stored : SOCIAL_LINK_DEFAULTS[key]];
  })) as Record<SocialLinkKey, string>;
  return { social, wallArtPrices: parseWallArtPrices(byKey[WALL_ART_PRICES_KEY]) || { ...DEFAULT_WALL_ART_PRICES } };
}

export async function getWallArtPrices() {
  const row = await prisma.siteSetting.findUnique({ where: { key: WALL_ART_PRICES_KEY }, select: { value: true } });
  return parseWallArtPrices(row?.value) || { ...DEFAULT_WALL_ART_PRICES };
}
