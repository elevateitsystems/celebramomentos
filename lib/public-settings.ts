"use client";

import { useEffect, useState } from "react";
import { DEFAULT_CARD_SIZE_PRICES, SOCIAL_LINK_DEFAULTS, type CardSize, type SocialLinkKey } from "./data";
import { DEFAULT_DELIVERY_RATES, type DeliveryRates } from "./shipping";

export type PublicSettings = {
  social: Record<SocialLinkKey, string>;
  cardSizePrices: Record<CardSize, number>;
  delivery: DeliveryRates;
};

export const FALLBACK_PUBLIC_SETTINGS: PublicSettings = { social: { ...SOCIAL_LINK_DEFAULTS }, cardSizePrices: { ...DEFAULT_CARD_SIZE_PRICES }, delivery: DEFAULT_DELIVERY_RATES };

// One request per page load, shared by every component that needs settings.
let request: Promise<PublicSettings> | null = null;
let resolved: PublicSettings | null = null;

function loadPublicSettings() {
  if (!request) {
    request = fetch("/api/settings", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load settings");
        const body = await response.json() as Partial<PublicSettings>;
        resolved = { social: { ...SOCIAL_LINK_DEFAULTS, ...body.social }, cardSizePrices: { ...DEFAULT_CARD_SIZE_PRICES, ...body.cardSizePrices }, delivery: { ...DEFAULT_DELIVERY_RATES, ...body.delivery } };
        return resolved;
      })
      .catch(() => {
        request = null;
        return FALLBACK_PUBLIC_SETTINGS;
      });
  }
  return request;
}

export function invalidatePublicSettings() {
  request = null;
  resolved = null;
}

// `loading` is true only until the first response; callers render the
// fallback values meanwhile so static content never disappears.
export function usePublicSettings() {
  const [settings, setSettings] = useState<PublicSettings>(resolved || FALLBACK_PUBLIC_SETTINGS);
  const [loading, setLoading] = useState(!resolved);
  useEffect(() => {
    let active = true;
    void loadPublicSettings().then((value) => {
      if (!active) return;
      setSettings(value);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);
  return { settings, loading };
}
