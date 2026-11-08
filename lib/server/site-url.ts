// The public base URL of the shop, for links that leave the site and come back: Stripe
// success/cancel URLs, PayPal return/cancel URLs and the webhook URLs given to print shops.
//
// Why this exists: checkout used `process.env.NEXT_PUBLIC_APP_URL || requestOrigin`, so an
// APP URL left at the local value ("http://localhost:3000", as in .env.example and
// .env.local) sent production customers back to http://localhost:3000/checkout/success
// after paying. The rules below never let a localhost value leave a deployed site.
//
// Order of precedence:
// 1. APP_URL (server-only, read at runtime) or NEXT_PUBLIC_APP_URL, unless it points to
//    localhost while the site is not running on localhost (a leftover local value);
// 2. on Vercel production (VERCEL_ENV=production): https://www.celebra-momentos.com — always the
//    www host, because the customer's session cookie lives there and /checkout/success needs it;
// 3. the origin of the current request (local development, Vercel previews);
// 4. http://localhost:3000.
export const PRODUCTION_SITE_URL = "https://www.celebra-momentos.com";

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/i;

// "https://www.celebra-momentos.com/" → "https://www.celebra-momentos.com"; null when not an http(s) URL.
export function normalizeOrigin(value: string | null | undefined) {
  const text = value?.trim();
  if (!text) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    return url.protocol === "http:" || url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

export const isLocalOrigin = (origin: string) => LOCAL_HOST.test(new URL(origin).hostname);

let warned = false;

export function siteUrl(requestOrigin?: string | null, env: Record<string, string | undefined> = process.env) {
  const request = normalizeOrigin(requestOrigin);
  const onVercelProduction = env.VERCEL_ENV === "production";
  const runningLocally = request ? isLocalOrigin(request) : !onVercelProduction && !env.VERCEL;
  // Bracket access: Next.js would otherwise inline NEXT_PUBLIC_APP_URL at build time.
  const configured = normalizeOrigin(env["APP_URL"]) || normalizeOrigin(env["NEXT_PUBLIC_APP_URL"]);

  if (configured && (!isLocalOrigin(configured) || runningLocally)) return configured;
  if (configured && !warned) {
    warned = true;
    console.warn(`[site-url] Ignoring ${configured} (a localhost URL) on a deployed site. Set APP_URL / NEXT_PUBLIC_APP_URL to the public domain.`);
  }
  if (onVercelProduction) return PRODUCTION_SITE_URL;
  if (request) return request;
  return normalizeOrigin(env.VERCEL_URL) || "http://localhost:3000";
}
