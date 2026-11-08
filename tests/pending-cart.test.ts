import { afterEach, describe, expect, it, vi } from "vitest";
import { clearPendingCartItem, hasPendingCartItem, PENDING_CART_MAX_AGE_MS, savePendingCartItem, takePendingCartItem } from "@/lib/pending-cart";
import { defaultCardCustomization } from "@/lib/store";

// No IndexedDB in this environment: the same-tab fallback is exercised (same API).
const draft = () => ({ productId: "p1", productPriceCents: 1290, productName: "Tarjeta", card: { ...defaultCardCustomization(), message: "Feliz cumpleaños", photoDataUrls: ["data:image/jpeg;base64,AAAA", null] } });

afterEach(async () => { vi.useRealTimers(); await clearPendingCartItem(); });

describe("design saved before login", () => {
  it("is restored exactly once, with its photos, texts and a fixed cart id", async () => {
    const saved = await savePendingCartItem(draft());
    expect(saved.item.id).toMatch(/^cart-item-/);
    expect(await hasPendingCartItem()).toBe(true);
    const taken = await takePendingCartItem();
    expect(taken?.item).toEqual({ ...draft(), id: saved.item.id });
    expect(taken?.item.card.photoDataUrls[0]).toBe("data:image/jpeg;base64,AAAA");
    expect(await takePendingCartItem()).toBeNull();
    expect(await hasPendingCartItem()).toBe(false);
  });

  it("keeps only the latest design and an edited line's id", async () => {
    await savePendingCartItem(draft());
    await savePendingCartItem({ ...draft(), id: "cart-item-existing", quantity: 3 });
    expect((await takePendingCartItem())?.item).toMatchObject({ id: "cart-item-existing", quantity: 3 });
  });

  it("drops a design older than the limit", async () => {
    vi.useFakeTimers();
    await savePendingCartItem(draft());
    vi.advanceTimersByTime(PENDING_CART_MAX_AGE_MS + 1000);
    expect(await takePendingCartItem()).toBeNull();
  });
});
