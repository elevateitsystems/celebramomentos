"use client";

// Meta Pixel events. Every call is a no-op until the visitor has accepted marketing
// cookies and the Pixel has loaded (components/meta-pixel.tsx). Only product and
// order data is sent — never names, emails, addresses or phone numbers.
import { readConsent } from "./consent";

type Fbq = ((...args: unknown[]) => void) & { loaded?: boolean };
declare global {
  interface Window { fbq?: Fbq }
}

export type PixelEvent = "PageView" | "ViewContent" | "AddToCart" | "InitiateCheckout" | "AddPaymentInfo" | "Purchase";
export type PixelParams = { content_ids?: string[]; content_name?: string; content_type?: "product"; contents?: { id: string; quantity: number }[]; currency?: "EUR"; value?: number; num_items?: number; payment_type?: string };

export const pixelReady = () => typeof window !== "undefined" && typeof window.fbq === "function" && readConsent() === "granted";

const euros = (value: number) => Math.round(value * 100) / 100;

export function trackPixel(event: PixelEvent, params?: PixelParams, eventId?: string) {
  if (!pixelReady()) return false;
  const clean = params ? { ...params, ...(params.value !== undefined ? { value: euros(params.value) } : {}) } : undefined;
  window.fbq!("track", event, ...(clean ? [clean] : [{}]), ...(eventId ? [{ eventID: eventId }] : []));
  return true;
}

const PURCHASES_KEY = "celebra-pixel-purchases-v1";

// Purchase is sent once per order, only with the server-confirmed total, and with
// eventID "purchase-<order number>" so Meta can also deduplicate it.
export function trackPurchaseOnce(orderNumber: string, value: number, contentIds: string[] = []) {
  if (!orderNumber || !Number.isFinite(value) || value <= 0 || !pixelReady()) return false;
  let sent: string[] = [];
  try { sent = JSON.parse(window.localStorage.getItem(PURCHASES_KEY) || "[]"); } catch { sent = []; }
  if (sent.includes(orderNumber)) return false;
  const tracked = trackPixel("Purchase", { currency: "EUR", value, content_type: "product", ...(contentIds.length ? { content_ids: contentIds } : {}) }, `purchase-${orderNumber}`);
  if (tracked) {
    try { window.localStorage.setItem(PURCHASES_KEY, JSON.stringify([...sent, orderNumber].slice(-50))); } catch { /* best effort */ }
  }
  return tracked;
}
