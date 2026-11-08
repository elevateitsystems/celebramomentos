import { describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { stripeCustomerDetails, stripeCustomerFor } from "@/lib/server/stripe-customer";

const input = { name: " Ana García ", email: "Ana@Example.org ", phone: "600 111 222", recipient: "Luis García", address: "Calle Mayor 1", city: "Madrid", postalCode: "28013", country: "ES" as const };

describe("Stripe Checkout prefill", () => {
  it("maps what the customer typed on our checkout to the Stripe Customer", () => {
    expect(stripeCustomerDetails("c1", input)).toEqual({
      email: "ana@example.org", name: "Ana García", phone: "600 111 222",
      address: { line1: "Calle Mayor 1", city: "Madrid", postal_code: "28013", country: "ES" },
      shipping: { name: "Luis García", phone: "600 111 222", address: { line1: "Calle Mayor 1", city: "Madrid", postal_code: "28013", country: "ES" } },
      metadata: { appCustomerId: "c1" },
    });
  });

  it("does not guess a billing address typed as free text", () => {
    expect(stripeCustomerDetails("c1", { ...input, billingAddress: "Rua X 5, Lisboa" }).address).toBeUndefined();
  });

  it("reuses this account's Stripe Customer (updating it) instead of creating duplicates", async () => {
    const stripe = { customers: { list: vi.fn(async () => ({ data: [{ id: "cus_other", metadata: { appCustomerId: "someone-else" } }, { id: "cus_1", metadata: { appCustomerId: "c1" } }] })), update: vi.fn(async (id: string) => ({ id })), create: vi.fn() } };
    expect(await stripeCustomerFor(stripe as unknown as Stripe, "c1", input)).toBe("cus_1");
    expect(stripe.customers.create).not.toHaveBeenCalled();
    expect(stripe.customers.update).toHaveBeenCalledWith("cus_1", expect.not.objectContaining({ metadata: expect.anything() }));
  });

  it("creates one when none exists, with an idempotency key tied to the account and the details", async () => {
    const stripe = { customers: { list: vi.fn(async () => ({ data: [] })), update: vi.fn(), create: vi.fn(async () => ({ id: "cus_new" })) } };
    expect(await stripeCustomerFor(stripe as unknown as Stripe, "c1", input)).toBe("cus_new");
    const [, options] = stripe.customers.create.mock.calls[0] as unknown as [unknown, { idempotencyKey: string }];
    expect(options.idempotencyKey).toMatch(/^customer-c1-[0-9a-f]{24}$/);
    await stripeCustomerFor(stripe as unknown as Stripe, "c1", input);
    expect((stripe.customers.create.mock.calls[1] as unknown as [unknown, { idempotencyKey: string }])[1].idempotencyKey).toBe(options.idempotencyKey);
  });
});
