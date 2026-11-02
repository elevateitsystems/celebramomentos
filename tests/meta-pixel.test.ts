// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readConsent, saveConsent } from "@/lib/consent";
import { trackPixel, trackPurchaseOnce } from "@/lib/meta-pixel";

beforeEach(() => {
  window.localStorage.clear();
  window.fbq = undefined;
});

describe("Meta Pixel events", () => {
  it("sends nothing without consent, even if the Pixel is present", () => {
    window.fbq = vi.fn();
    expect(trackPixel("ViewContent", { content_ids: ["p1"] })).toBe(false);
    saveConsent("denied");
    expect(trackPixel("ViewContent", { content_ids: ["p1"] })).toBe(false);
    expect(window.fbq).not.toHaveBeenCalled();
  });

  it("sends nothing before the Pixel has loaded", () => {
    saveConsent("granted");
    expect(trackPixel("AddToCart", { value: 10 })).toBe(false);
  });

  it("tracks standard events after consent with rounded euro values", () => {
    saveConsent("granted");
    window.fbq = vi.fn();
    expect(trackPixel("AddToCart", { content_ids: ["p1"], currency: "EUR", value: 12.999 })).toBe(true);
    expect(window.fbq).toHaveBeenCalledWith("track", "AddToCart", { content_ids: ["p1"], currency: "EUR", value: 13 });
  });

  it("sends Purchase once per order with an eventID for deduplication", () => {
    saveConsent("granted");
    window.fbq = vi.fn();
    expect(trackPurchaseOnce("CM-123", 34.99, ["p1"])).toBe(true);
    expect(trackPurchaseOnce("CM-123", 34.99, ["p1"])).toBe(false);
    expect(window.fbq).toHaveBeenCalledTimes(1);
    expect(window.fbq).toHaveBeenCalledWith("track", "Purchase", { currency: "EUR", value: 34.99, content_type: "product", content_ids: ["p1"] }, { eventID: "purchase-CM-123" });
  });

  it("refuses a Purchase without a real order number or amount", () => {
    saveConsent("granted");
    window.fbq = vi.fn();
    expect(trackPurchaseOnce("", 10)).toBe(false);
    expect(trackPurchaseOnce("CM-1", Number.NaN)).toBe(false);
    expect(trackPurchaseOnce("CM-1", 0)).toBe(false);
    expect(window.fbq).not.toHaveBeenCalled();
  });

  it("remembers the visitor's choice", () => {
    expect(readConsent()).toBeNull();
    saveConsent("granted");
    expect(readConsent()).toBe("granted");
  });
});
