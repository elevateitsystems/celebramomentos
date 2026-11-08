"use client";

// A design a guest finished but could not add to the cart, because adding requires an
// account. It is saved here (IndexedDB, so photos fit) before the customer is sent to log
// in, and added to the cart once — by PendingCartResumer — as soon as a session exists.
//
// - One slot: a newer design replaces an older unfinished one.
// - The item gets its final cart id when it is saved, and saveCartItem upserts by id, so even
//   a repeated restore can never create a second cart line.
// - Taking it reads and deletes in one transaction (two open tabs cannot both restore it).
// - Kept for 3 days; an older one is dropped.
import { browserStore } from "./browser-store";
import type { CartItemDraft } from "./store";

const KEY = "pending-cart-item";
export const PENDING_CART_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;

export type PendingCartItem = { item: CartItemDraft & { id: string }; savedAt: number };

// Same-tab fallback when IndexedDB is unavailable (the in-memory store survives a client-side login).
let memory: PendingCartItem | null = null;

export async function savePendingCartItem(draft: CartItemDraft): Promise<PendingCartItem> {
  const entry: PendingCartItem = { item: { ...draft, id: draft.id || `cart-item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` }, savedAt: Date.now() };
  memory = entry;
  await browserStore.set(KEY, entry);
  return entry;
}

const fresh = (entry: PendingCartItem | null) => (entry && entry.item && Date.now() - entry.savedAt < PENDING_CART_MAX_AGE_MS ? entry : null);

export async function hasPendingCartItem() {
  return Boolean(fresh(memory) || fresh(await browserStore.get<PendingCartItem>(KEY)));
}

export async function takePendingCartItem(): Promise<PendingCartItem | null> {
  const stored = await browserStore.take<PendingCartItem>(KEY);
  const local = memory;
  memory = null;
  return fresh(stored) || fresh(local);
}

export async function clearPendingCartItem() {
  memory = null;
  await browserStore.delete(KEY);
}
