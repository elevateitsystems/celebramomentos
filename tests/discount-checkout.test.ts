import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma, type Discount } from "@prisma/client";

const store = { discounts: [] as Discount[], live: 0, created: [] as Record<string, unknown>[], txRuns: 0, serializationFailure: false };
const base: Discount = { id: "d1", code: "VERANO10", percentage: 10, amountCents: null, minOrderCents: null, maxUses: null, usedCount: 0, active: true, expiresAt: null, createdAt: new Date(), updatedAt: new Date() };

const db = {
  discount: { findUnique: async ({ where }: { where: { code: string } }) => store.discounts.find((item) => item.code === where.code) ?? null },
  discountUsage: { count: async () => store.live },
  order: { create: async ({ data }: { data: Record<string, unknown> }) => { store.created.push(data); return { id: "o1", number: "CM-1", payments: [{ id: "p1" }], ...data }; } },
};
const prismaMock = {
  ...db,
  cartLine: { findMany: async () => [{ id: "l1", quantity: 2 }] },
  postcardTemplate: { findMany: async () => [] },
  $transaction: async (work: (tx: typeof db) => unknown, options?: { isolationLevel?: string }) => {
    store.txRuns += 1;
    expect(options?.isolationLevel).toBe("Serializable");
    if (store.serializationFailure) throw new Prisma.PrismaClientKnownRequestError("conflict", { code: "P2034", clientVersion: "x" });
    return work(db);
  },
};
vi.mock("@/lib/server/prisma", () => ({ get prisma() { return prismaMock; } }));
vi.mock("@/lib/server/cart", () => ({ toCartItem: (line: { id: string; quantity: number }) => ({ id: line.id, quantity: line.quantity, card: { delivery: "standard", size: "5x7", templateId: "template-3" } }) }));
vi.mock("@/lib/server/catalog", () => ({
  ensureCatalog: async () => undefined,
  // two lines of €10.00 → €20.00 products; €5.00 delivery
  resolveCartLine: async () => ({ unitPriceCents: 1000, productId: null, product: null, productName: "Tarjeta", templateSlug: null, cardSizeSku: null }),
  deliveryCents: async () => 500,
}));

import { createPendingOrder } from "@/lib/server/checkout";
import { CatalogError } from "@/lib/server/errors";

const input = (discountCode?: string) => ({ name: "Ana", email: "ana@example.org", phone: "600111222", recipient: "Ana", address: "Calle Mayor 1", city: "Madrid", postalCode: "28013", country: "ES" as const, payment: "card" as const, discountCode });
const place = (code?: string) => createPendingOrder({ customerId: "c1", input: input(code), idempotencyKey: "k1", provider: "stripe" });

beforeEach(() => { store.discounts = [base]; store.live = 0; store.created = []; store.txRuns = 0; store.serializationFailure = false; });

describe("checkout validates the code and prices the order itself", () => {
  it("stops the checkout for a code the owner never created, and creates no order", async () => {
    await expect(place("HACKEADO")).rejects.toMatchObject({ name: "CatalogError", status: 400, message: "Este código de descuento no es válido." });
    expect(store.created).toHaveLength(0);
  });

  it("stops the checkout for disabled, expired and used-up codes", async () => {
    store.discounts = [{ ...base, active: false }];
    await expect(place("VERANO10")).rejects.toBeInstanceOf(CatalogError);
    store.discounts = [{ ...base, expiresAt: new Date(Date.now() - 1000) }];
    await expect(place("VERANO10")).rejects.toMatchObject({ message: expect.stringContaining("caducado") });
    store.discounts = [{ ...base, maxUses: 1, usedCount: 1 }];
    await expect(place("VERANO10")).rejects.toMatchObject({ message: expect.stringContaining("límite de usos") });
    expect(store.created).toHaveLength(0);
  });

  it("applies a valid code: the order total is products + delivery − the server's discount, and the usage is recorded", async () => {
    const result = await place(" verano10 ");
    expect(result).toMatchObject({ subtotalCents: 2000, shippingCents: 500, discountCents: 250, totalCents: 2250, discountCode: "VERANO10" });
    expect(store.created[0]).toMatchObject({ subtotalCents: 2000, shippingCents: 500, discountCents: 250, totalCents: 2250, discountUsages: { create: { discountId: "d1" } }, payments: { create: { amountCents: 2250 } } });
    expect(store.txRuns).toBe(1);
  });

  it("without a code nothing is discounted and no transaction is needed", async () => {
    const result = await place();
    expect(result).toMatchObject({ discountCents: 0, totalCents: 2500, discountCode: null });
    expect(store.created[0]).not.toHaveProperty("discountUsages");
    expect(store.txRuns).toBe(0);
  });

  it("ignores any discount amount the browser might add to the request", async () => {
    const result = await createPendingOrder({ customerId: "c1", input: { ...input("VERANO10"), discountCents: 99999, totalCents: 1, discountValue: 99999 } as never, idempotencyKey: "k1", provider: "stripe" });
    expect(result.discountCents).toBe(250);
    expect(result.totalCents).toBe(2250);
  });

  it("asks the customer to retry when two checkouts race for the last use of a limited code", async () => {
    store.serializationFailure = true;
    await expect(place("VERANO10")).rejects.toMatchObject({ name: "CatalogError", status: 409, message: expect.stringContaining("Inténtalo de nuevo") });
    expect(store.created).toHaveLength(0);
  });
});
