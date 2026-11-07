import type { PodMode } from "./types";

// All provider credentials are server-only environment variables (never NEXT_PUBLIC_).
const env = (name: string) => {
  const value = process.env[name]?.trim();
  return value && !/replace|changeme/i.test(value) ? value : null;
};

// POD_ORDER_MODE=live sends real production orders. Anything else is "draft".
export function podMode(): PodMode {
  return process.env.POD_ORDER_MODE?.trim().toLowerCase() === "live" ? "live" : "draft";
}

// Paid orders are sent automatically unless POD_AUTO_SUBMIT=false (then an admin sends them).
export function podAutoSubmit() {
  return process.env.POD_AUTO_SUBMIT?.trim().toLowerCase() !== "false";
}

export function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "");
}

// Shared secret appended to the webhook URLs we register with each shop.
export function webhookSecret() {
  const value = env("POD_WEBHOOK_SECRET");
  return value && value.length >= 24 ? value : null;
}

export function webhookUrl(provider: "prodigi" | "gelato" | "printful" | "printeers") {
  const secret = webhookSecret();
  return secret ? `${appUrl()}/api/webhooks/${provider}?token=${encodeURIComponent(secret)}` : null;
}

export const prodigiConfig = (mode: PodMode) => ({
  // The live key is rejected by the sandbox, so draft mode needs its own sandbox key.
  apiKey: mode === "live" ? env("PRODIGI_API_KEY") : env("PRODIGI_SANDBOX_API_KEY"),
  baseUrl: (mode === "live" ? env("PRODIGI_BASE_URL") || "https://api.prodigi.com/v4.0" : env("PRODIGI_SANDBOX_BASE_URL") || "https://api.sandbox.prodigi.com/v4.0").replace(/\/+$/, ""),
});

export const gelatoConfig = () => ({
  apiKey: env("GELATO_API_KEY"),
  baseUrl: (env("GELATO_BASE_URL") || "https://order.gelatoapis.com").replace(/\/+$/, ""),
});

export const printfulConfig = () => ({
  token: env("PRINTFUL_PRIVATE_TOKEN"),
  storeId: env("PRINTFUL_STORE_ID"),
  baseUrl: (env("PRINTFUL_BASE_URL") || "https://api.printful.com").replace(/\/+$/, ""),
});

// Printeers (phone cases), API v1: https://api-docs.printeers.com/reference/v1 (legacy; Printeers
// announced on 2026-05-08 that V1 is retired one year after that date).
// Draft mode uses the Printeers TEST environment, where orders are never produced or
// invoiced; live mode uses production. A V1 credential is a partner code (the store code,
// e.g. "TESTCODE") plus an API key, sent as X-IPP-PARTNERCODE / X-IPP-APIKEY. Test and
// production credentials are different, so each mode has its own pair.
// V1 paths have no version prefix (https://api.test-printeers.com/stock, checked 2026-11-07).
export const PRINTEERS_SHIPPING_LEVELS = ["normal", "tracked", "premium"] as const;
export type PrinteersShippingLevel = (typeof PRINTEERS_SHIPPING_LEVELS)[number];
// Older names ("basic", "express") still work in PRINTEERS_SHIPPING_LEVEL.
const SHIPPING_LEVEL_ALIASES: Record<string, PrinteersShippingLevel> = { basic: "normal", express: "premium" };

export const printeersConfig = (mode: PodMode) => {
  const live = mode === "live";
  const level = (env("PRINTEERS_SHIPPING_LEVEL") || "").toLowerCase();
  const resolved = SHIPPING_LEVEL_ALIASES[level] || level;
  return {
    environment: live ? "production" : "test",
    apiKey: env(live ? "PRINTEERS_V1_API_KEY" : "PRINTEERS_V1_TEST_API_KEY"),
    partnerCode: env(live ? "PRINTEERS_V1_PARTNER_CODE" : "PRINTEERS_V1_TEST_PARTNER_CODE"),
    baseUrl: (env(live ? "PRINTEERS_BASE_URL" : "PRINTEERS_TEST_BASE_URL") || (live ? "https://api.printeers.com" : "https://api.test-printeers.com")).replace(/\/+$/, ""),
    // Minimal dropship level; "normal" has no tracking, so "tracked" is the default.
    shippingLevel: ((PRINTEERS_SHIPPING_LEVELS as readonly string[]).includes(resolved) ? resolved : "tracked") as PrinteersShippingLevel,
    brandReference: env(live ? "PRINTEERS_BRAND_REFERENCE" : "PRINTEERS_TEST_BRAND_REFERENCE"),
    // Signing secret ("whsec_…", Standard Webhooks) of the Printeers webhook endpoint (Dashboard → Settings).
    webhookSecret: env(live ? "PRINTEERS_WEBHOOK_SECRET" : "PRINTEERS_TEST_WEBHOOK_SECRET"),
  };
};
