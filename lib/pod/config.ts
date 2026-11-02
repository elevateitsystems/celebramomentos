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

export function webhookUrl(provider: "prodigi" | "gelato" | "printful") {
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

export const alerioConfig = () => ({
  apiKey: env("ALERIOPRINT_API_KEY"),
  baseUrl: (env("ALERIOPRINT_BASE_URL") || "https://create.alerioprint.com/backend/api/external").replace(/\/+$/, ""),
  // Delivery service id from GET /deliveries; 2 = "DHL Global Mail [with tracking]" (ships to ES and PT).
  deliveryOption: Number(env("ALERIOPRINT_DELIVERY_OPTION") || 2),
});
