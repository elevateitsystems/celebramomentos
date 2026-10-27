"use client";

import { useEffect, useMemo, useState } from "react";
import type { CartItem } from "./store";

export type CartQuoteLine = { id: string; unitPriceCents?: number; name?: string; detail?: string; error?: string };

// Photos and long texts do not affect the price; they are replaced with
// placeholders so the quote request stays small.
function quotePayload(item: CartItem) {
  return {
    ...item,
    product: item.product ? { ...item.product, photos: item.product.photos.map((photo) => (photo ? "photo" : null)), image: null } : null,
    card: { ...item.card, photoDataUrl: null, photoDataUrls: [], emojiElements: [] },
  };
}

// Current server prices and availability for the cart lines (admin price
// changes, removed sizes, deleted or hidden products).
export function useCartQuote(items: CartItem[]) {
  const key = useMemo(() => JSON.stringify(items.map(quotePayload)), [items]);
  const [quote, setQuote] = useState<{ key: string; lines: Record<string, CartQuoteLine> } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!items.length) return;
    let active = true;
    setFailed(false);
    fetch("/api/catalog/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: `{"items":${key}}`, cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Unable to check prices");
        if (active) setQuote({ key, lines: Object.fromEntries((body.lines as CartQuoteLine[]).map((line) => [line.id, line])) });
      })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  // `key` captures every price-relevant field of `items`.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const current = quote?.key === key ? quote.lines : null;
  return { lines: current, loading: Boolean(items.length) && !current && !failed, failed };
}
