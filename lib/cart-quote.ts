"use client";

import { useEffect, useMemo, useState } from "react";
import type { CartItem } from "./store";

export type CartQuoteLine = { id: string; unitPriceCents?: number; name?: string; detail?: string; error?: string };
// The server's verdict on a discount code. `discountCents` is what the server will take off.
export type DiscountQuote = { code: string; valid: true; discountCents: number; percentage: number | null; amountCents: number | null } | { code: string; valid: false; reason: string; message: string };

// Photos and long texts do not affect the price; they are replaced with
// placeholders so the quote request stays small.
function quotePayload(item: CartItem) {
  return {
    ...item,
    product: item.product ? { ...item.product, photos: item.product.photos.map((photo) => (photo ? "photo" : null)), image: null, preview: null } : null,
    card: { ...item.card, photoDataUrl: null, photoDataUrls: [], emojiElements: [] },
  };
}

// Asks the server whether a code can be used on this cart. Resolves with the verdict; rejects only
// when the server cannot be reached (the code is then not applied).
export async function checkDiscountCode(items: CartItem[], code: string): Promise<DiscountQuote> {
  const response = await fetch("/api/catalog/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: items.map(quotePayload), discountCode: code }), cache: "no-store" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.discount) throw new Error(body.error || "No hemos podido comprobar el código. Inténtalo de nuevo.");
  return body.discount as DiscountQuote;
}

// Current server prices and availability for the cart lines (admin price
// changes, removed sizes, deleted or hidden products) and, when a code is applied,
// the server's verdict on it (it can stop being valid: expired, used up, cart changed).
export function useCartQuote(items: CartItem[], discountCode = "") {
  const code = discountCode.trim();
  const key = useMemo(() => JSON.stringify({ items: items.map(quotePayload), code }), [items, code]);
  const [quote, setQuote] = useState<{ key: string; lines: Record<string, CartQuoteLine>; discount: DiscountQuote | null } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!items.length) return;
    let active = true;
    setFailed(false);
    fetch("/api/catalog/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: items.map(quotePayload), discountCode: code || null }), cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Unable to check prices");
        if (active) setQuote({ key, lines: Object.fromEntries((body.lines as CartQuoteLine[]).map((line) => [line.id, line])), discount: (body.discount as DiscountQuote | undefined) ?? null });
      })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  // `key` captures every price-relevant field of `items`.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const current = quote?.key === key ? quote.lines : null;
  return { lines: current, discount: quote?.key === key ? quote.discount : null, loading: Boolean(items.length) && !current && !failed, failed };
}
