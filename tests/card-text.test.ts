import { describe, expect, it } from "vitest";
import { cartLineSchema } from "@/lib/server/validation";
import { FRONT_TEXT_SCALE, createCardStore, defaultCardCustomization, setFrontTextAlign, setFrontTextPosition, setFrontTextScale } from "@/lib/store";

const card = (extra: Record<string, unknown> = {}) => ({ ...defaultCardCustomization(), ...extra });
const parse = (extra: Record<string, unknown>) => cartLineSchema.safeParse({ quantity: 1, card: card(extra) });

describe("cover text settings in the cart", () => {
  it("are kept by the server schema (unknown keys would be stripped)", () => {
    const result = parse({ frontTextScale: 1.4, frontTextAlign: "right", frontTextPosition: { x: 0.3, y: 0.8, w: 60 } });
    expect(result.success && result.data.card).toMatchObject({ frontTextScale: 1.4, frontTextAlign: "right", frontTextPosition: { x: 0.3, y: 0.8, w: 60 } });
  });

  it("still accepts designs saved before the settings existed", () => {
    const { frontTextScale, frontTextAlign, frontTextPosition, ...old } = card();
    expect(frontTextScale && frontTextAlign !== undefined && frontTextPosition === null).toBeTruthy();
    expect(cartLineSchema.safeParse({ quantity: 1, card: old }).success).toBe(true);
  });

  it("rejects values that could push the text out of the card or make it unreadable", () => {
    expect(parse({ frontTextAlign: "justify" }).success).toBe(false);
    expect(parse({ frontTextScale: 9 }).success).toBe(false);
    expect(parse({ frontTextPosition: { x: 1.5, y: 0.2, w: 50 } }).success).toBe(false);
    expect(parse({ frontTextPosition: { x: 0.5, y: 0.5, w: 5 } }).success).toBe(false);
  });
});

describe("cover text in the store", () => {
  it("starts at the template's own size, centred, in its own place", () => {
    const { frontTextScale, frontTextAlign, frontTextPosition } = defaultCardCustomization();
    expect([frontTextScale, frontTextAlign, frontTextPosition]).toEqual([1, "center", null]);
  });

  it("keeps the size within its limits", () => {
    const store = createCardStore(defaultCardCustomization(), "es");
    store.dispatch(setFrontTextScale(50));
    expect(store.getState().cart.card.frontTextScale).toBe(FRONT_TEXT_SCALE.max);
    store.dispatch(setFrontTextScale(0));
    expect(store.getState().cart.card.frontTextScale).toBe(FRONT_TEXT_SCALE.min);
  });

  it("stores alignment and position, and can return to the original place", () => {
    const store = createCardStore(defaultCardCustomization(), "es");
    store.dispatch(setFrontTextAlign("left"));
    store.dispatch(setFrontTextPosition({ x: 0.2, y: 0.9, w: 50 }));
    expect(store.getState().cart.card).toMatchObject({ frontTextAlign: "left", frontTextPosition: { x: 0.2, y: 0.9, w: 50 } });
    store.dispatch(setFrontTextPosition(null));
    expect(store.getState().cart.card.frontTextPosition).toBeNull();
  });
});
