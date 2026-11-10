"use client";

// Which cart lines went into which order. Saved when the customer is sent to pay, so that once the
// payment is confirmed exactly those lines leave the cart — never before, never lines added later,
// and never when the payment fails or is abandoned (the cart is then kept as it was).
const KEY = "celebra-momentos-checkout-v1";
// An unpaid checkout older than this is forgotten (the payment page has expired by then).
export const CHECKOUT_MAX_AGE_MS = 6 * 60 * 60 * 1000;

export type PendingCheckout = { orderId: string; itemIds: string[]; startedAt: number };

export function rememberCheckout(orderId: string, itemIds: string[]) {
  try { window.localStorage.setItem(KEY, JSON.stringify({ orderId, itemIds, startedAt: Date.now() } satisfies PendingCheckout)); } catch { /* storage blocked: the success page then clears the cart as a whole */ }
}

export function pendingCheckout(): PendingCheckout | null {
  try {
    const value = JSON.parse(window.localStorage.getItem(KEY) || "null") as PendingCheckout | null;
    return value && typeof value.orderId === "string" && Array.isArray(value.itemIds) ? value : null;
  } catch { return null; }
}

export function forgetCheckout() {
  try { window.localStorage.removeItem(KEY); } catch { /* storage blocked */ }
}

// Cart lines to remove after the order `orderId` was paid: the ones saved for it, or — when nothing
// was saved on this device (older checkout, storage blocked) — null, meaning "the whole cart".
export function purchasedItemIds(orderId: string | null | undefined) {
  const pending = pendingCheckout();
  return pending && (!orderId || pending.orderId === orderId) ? pending.itemIds : null;
}
