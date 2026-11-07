import { describe, expect, it } from "vitest";
import { discountPercent, SHARE_DISCOUNT_CODE } from "@/lib/data";

describe("storefront discount codes", () => {
  it("knows CELEBRA10 as a 10% code, case and space insensitive", () => {
    expect(SHARE_DISCOUNT_CODE).toBe("CELEBRA10");
    expect(discountPercent(" celebra10 ")).toBe(10);
    expect(discountPercent("HOLA10")).toBe(10);
    expect(discountPercent("OTRO")).toBe(0);
    expect(discountPercent("")).toBe(0);
  });
});
