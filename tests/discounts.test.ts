import { beforeEach, describe, expect, it } from "vitest";
import type { Discount } from "@prisma/client";
import { MIN_CHARGE_CENTS, clientKey, discountAmountCents, discountAttemptsBlocked, evaluateDiscount, publicVerdict, recordDiscountFailure, resetDiscountAttempts } from "@/lib/server/discounts";

const base: Discount = { id: "d1", code: "VERANO10", percentage: 10, amountCents: null, minOrderCents: null, maxUses: null, usedCount: 0, active: true, expiresAt: null, createdAt: new Date(), updatedAt: new Date() };

// A fake database holding the Discount table and the usage count the live check reads.
const dbWith = (discounts: Partial<Discount>[], liveUses = 0) => ({
  discount: { findUnique: async ({ where }: { where: { code: string } }) => { const found = discounts.find((item) => item.code === where.code); return found ? { ...base, ...found } : null; } },
  discountUsage: { count: async () => liveUses },
}) as never;
const order = { subtotalCents: 2000, shippingCents: 500 };

describe("discount codes are accepted only when the owner created them", () => {
  it("rejects text that is not a code in the database", async () => {
    const verdict = await evaluateDiscount(dbWith([base]), "asdfgh", order);
    expect(verdict).toMatchObject({ ok: false, reason: "not_found", message: "Este código de descuento no es válido." });
    expect(await evaluateDiscount(dbWith([base]), "   ", order)).toMatchObject({ ok: false, reason: "not_found" });
  });

  it("rejects a disabled code with the same answer as an unknown one (codes cannot be probed)", async () => {
    const disabled = await evaluateDiscount(dbWith([{ ...base, active: false }]), "VERANO10", order);
    const unknown = await evaluateDiscount(dbWith([]), "VERANO10", order);
    expect(disabled).toMatchObject({ ok: false, reason: "not_found" });
    expect(disabled.ok === false && disabled.message).toBe(unknown.ok === false && unknown.message);
  });

  it("rejects expired codes and accepts ones that expire later", async () => {
    expect(await evaluateDiscount(dbWith([{ ...base, expiresAt: new Date(Date.now() - 1000) }]), "VERANO10", order)).toMatchObject({ ok: false, reason: "expired", message: "Este código de descuento ha caducado." });
    expect(await evaluateDiscount(dbWith([{ ...base, expiresAt: new Date(Date.now() + 86_400_000) }]), "VERANO10", order)).toMatchObject({ ok: true });
  });

  it("enforces the minimum order on products", async () => {
    const db = dbWith([{ ...base, minOrderCents: 3000 }]);
    expect(await evaluateDiscount(db, "VERANO10", order)).toMatchObject({ ok: false, reason: "min_order", message: expect.stringContaining("30,00 €") });
    expect(await evaluateDiscount(db, "VERANO10", { ...order, subtotalCents: 3000 })).toMatchObject({ ok: true });
  });

  it("enforces the usage limit, counting paid orders and recent unpaid ones", async () => {
    expect(await evaluateDiscount(dbWith([{ ...base, maxUses: 5, usedCount: 5 }]), "VERANO10", order)).toMatchObject({ ok: false, reason: "exhausted" });
    // used counter low, but live orders (paid + held pending) already reach the limit
    expect(await evaluateDiscount(dbWith([{ ...base, maxUses: 5, usedCount: 1 }], 5), "VERANO10", order)).toMatchObject({ ok: false, reason: "exhausted" });
    expect(await evaluateDiscount(dbWith([{ ...base, maxUses: 5, usedCount: 4 }], 4), "VERANO10", order)).toMatchObject({ ok: true });
  });

  it("is not case sensitive and ignores spaces", async () => {
    expect(await evaluateDiscount(dbWith([base]), "  verano10 ", order)).toMatchObject({ ok: true, code: "VERANO10" });
  });

  it("will not take an order below the €0.50 Stripe minimum", async () => {
    const free = await evaluateDiscount(dbWith([{ ...base, percentage: 100 }]), "VERANO10", order);
    expect(free).toMatchObject({ ok: false, reason: "too_small" });
    expect(await evaluateDiscount(dbWith([{ ...base, percentage: null, amountCents: 1000 }]), "VERANO10", { subtotalCents: 1000, shippingCents: 0 })).toMatchObject({ ok: false, reason: "too_small" });
    expect(MIN_CHARGE_CENTS).toBe(50);
  });
});

describe("the amount is calculated by the server", () => {
  it("percentage codes apply to products + delivery, fixed codes to products, never beyond what is paid", () => {
    expect(discountAmountCents({ percentage: 10, amountCents: null }, 2000, 500)).toBe(250);
    expect(discountAmountCents({ percentage: 33, amountCents: null }, 999, 0)).toBe(329);
    expect(discountAmountCents({ percentage: null, amountCents: 500 }, 2000, 500)).toBe(500);
    expect(discountAmountCents({ percentage: null, amountCents: 9000 }, 2000, 500)).toBe(2000);
    expect(discountAmountCents({ percentage: null, amountCents: null }, 2000, 500)).toBe(0);
  });

  it("returns the amount in the verdict, and hides counters and limits from the browser", async () => {
    const verdict = await evaluateDiscount(dbWith([{ ...base, maxUses: 3, usedCount: 1 }]), "VERANO10", order);
    expect(publicVerdict(verdict)).toEqual({ code: "VERANO10", valid: true, discountCents: 250, percentage: 10, amountCents: null });
  });
});

describe("guessing codes is slowed down", () => {
  beforeEach(() => resetDiscountAttempts());
  it("blocks a client after repeated unknown codes, for a minute", () => {
    const key = clientKey(new Request("https://x", { headers: { "x-forwarded-for": "203.0.113.9" } }));
    const t0 = 1_000_000;
    for (let i = 0; i < 10; i += 1) { expect(discountAttemptsBlocked(key, t0)).toBe(false); recordDiscountFailure(key, t0); }
    expect(discountAttemptsBlocked(key, t0 + 1000)).toBe(true);
    expect(discountAttemptsBlocked(key, t0 + 61_000)).toBe(false);
    expect(discountAttemptsBlocked(clientKey(new Request("https://x", { headers: { "x-forwarded-for": "198.51.100.1" } })), t0 + 1000)).toBe(false);
  });
});
