"use client";

import { useEffect, useState } from "react";
import { DEFAULT_WALL_ART_PRICES, SOCIAL_LINK_DEFAULTS, type SocialLinkKey, type WallArtSizeId } from "./data";

export type PublicSettings = {
  social: Record<SocialLinkKey, string>;
  wallArtPrices: Record<WallArtSizeId, number>;
};

export const FALLBACK_PUBLIC_SETTINGS: PublicSettings = { social: { ...SOCIAL_LINK_DEFAULTS }, wallArtPrices: { ...DEFAULT_WALL_ART_PRICES } };

// One request per page load, shared by every component that needs settings.
let request: Promise<PublicSettings> | null = null;
let resolved: PublicSettings | null = null;

function loadPublicSettings() {
  if (!request) {
    request = fetch("/api/settings")
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load settings");
        const body = await response.json() as Partial<PublicSettings>;
        resolved = { social: { ...SOCIAL_LINK_DEFAULTS, ...body.social }, wallArtPrices: { ...DEFAULT_WALL_ART_PRICES, ...body.wallArtPrices } };
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
