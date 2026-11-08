import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Discount } from "@prisma/client";
import { resetDiscountAttempts } from "@/lib/server/discounts";

const base: Discount = { id: "d1", code: "VERANO10", percentage: 10, amountCents: null, minOrderCents: null, maxUses: null, usedCount: 0, active: true, expiresAt: null, createdAt: new Date(), updatedAt: new Date() };
let discounts: Discount[] = [base];
vi.mock("@/lib/server/prisma", () => ({ prisma: { discount: { findUnique: async ({ where }: { where: { code: string } }) => discounts.find((item) => item.code === where.code) ?? null }, discountUsage: { count: async () => 0 } } }));
vi.mock("@/lib/server/auth", () => ({ getCustomerSession: async () => null }));
vi.mock("@/lib/server/catalog", () => ({ ensureCatalog: async () => undefined, resolveCartLine: async () => ({ unitPriceCents: 1000, productName: "Tarjeta", product: null }), deliveryCents: async () => 500 }));
vi.mock("@/lib/server/validation", async () => { const { z } = await import("zod"); return { cartLineSchema: z.object({ id: z.string().optional(), quantity: z.number().int().default(1), card: z.object({ delivery: z.string().optional() }).passthrough().optional(), product: z.any().optional() }) }; });

import { POST } from "@/app/api/catalog/quote/route";

const quote = (body: unknown, ip = "203.0.113.5") => POST(new Request("https://shop.test/api/catalog/quote", { method: "POST", headers: { "Content-Type": "application/json", "x-forwarded-for": ip }, body: JSON.stringify(body) }));
const cart = { items: [{ id: "a", quantity: 2, card: { delivery: "standard" } }] };

beforeEach(() => { discounts = [base]; resetDiscountAttempts(); });

describe("quote endpoint: the server's verdict on a code", () => {
  it("returns no verdict when no code is sent", async () => {
    expect(await (await quote(cart)).json()).not.toHaveProperty("discount");
  });

  it("accepts a real code and returns the amount it calculated (2 × €10 + €5 delivery → 10%)", async () => {
    const body = await (await quote({ ...cart, discountCode: "verano10" })).json();
    expect(body.discount).toEqual({ code: "VERANO10", valid: true, discountCents: 250, percentage: 10, amountCents: null });
  });

  it("rejects random text, with a message", async () => {
    const body = await (await quote({ ...cart, discountCode: "cualquier cosa" })).json();
    expect(body.discount).toMatchObject({ valid: false, reason: "not_found", message: "Este código de descuento no es válido." });
  });

  it("does not use a discount amount sent by the browser", async () => {
    const body = await (await quote({ ...cart, discountCode: "VERANO10", discountCents: 99999 })).json();
    expect(body.discount.discountCents).toBe(250);
  });

  it("reports codes that stopped being valid", async () => {
    discounts = [{ ...base, expiresAt: new Date(Date.now() - 1000) }];
    expect((await (await quote({ ...cart, discountCode: "VERANO10" })).json()).discount).toMatchObject({ valid: false, reason: "expired" });
  });

  it("slows down guessing: after 10 unknown codes the client is asked to wait, even for a real code", async () => {
    for (let i = 0; i < 10; i += 1) await quote({ ...cart, discountCode: `X${i}ABC` });
    expect((await (await quote({ ...cart, discountCode: "VERANO10" })).json()).discount).toMatchObject({ valid: false, reason: "rate_limited" });
    // another client is unaffected
    expect((await (await quote({ ...cart, discountCode: "VERANO10" }, "198.51.100.7")).json()).discount).toMatchObject({ valid: true });
  });
});
