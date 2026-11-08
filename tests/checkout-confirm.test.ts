import { beforeEach, describe, expect, it, vi } from "vitest";

const state = { claims: [] as number[], background: 0, email: 0, discountIncrements: 0, status: "PENDING" };
const order = { id: "o1", number: "CM-1", email: "a@example.org", totalCents: 2250, currency: "eur", customerId: "c1", createdAt: new Date(), shippingAddress: {}, items: [{ name: "Tarjeta", quantity: 1 }], payments: [{ id: "p1", stripeCheckoutId: "cs_1" }], discountUsages: [{ discountId: "d1" }] };

const tx = {
  order: { updateMany: async () => { const count = state.claims.shift() ?? 0; if (count) state.status = "PAID"; return { count }; } },
  payment: { updateMany: async () => ({ count: 1 }) },
  discount: { update: async () => { state.discountIncrements += 1; } },
  cartLine: { deleteMany: async () => ({ count: 1 }) },
};
vi.mock("@/lib/server/prisma", () => ({ prisma: {
  // A stale read: both requests still see the order as PENDING when they start.
  order: { findFirst: async () => ({ ...order, status: "PENDING" }), findUniqueOrThrow: async () => ({ ...order, status: state.status }) },
  $transaction: async (work: (client: typeof tx) => unknown) => work(tx),
} }));
vi.mock("@/lib/server/auth", () => ({ requireCustomer: async () => ({ error: null, customer: { id: "c1" } }) }));
vi.mock("@/lib/server/stripe", () => ({ stripe: { checkout: { sessions: { retrieve: async () => ({ id: "cs_1", metadata: { orderId: "o1" }, payment_status: "paid", amount_total: 2250, currency: "eur", status: "complete", payment_intent: "pi_1" }) } } } }));
vi.mock("@/lib/pod/fulfillment", () => ({ handlePaidOrderInBackground: () => { state.background += 1; } }));
vi.mock("@/lib/server/order-email", () => ({ sendOrderConfirmationInBackground: () => { state.email += 1; } }));

import { POST } from "@/app/api/checkout/confirm/route";
const confirm = () => POST(new Request("https://shop.test/api/checkout/confirm", { method: "POST", body: JSON.stringify({ sessionId: "cs_1" }) }) as never);

beforeEach(() => { state.claims = []; state.background = 0; state.email = 0; state.discountIncrements = 0; state.status = "PENDING"; });

describe("confirming a Stripe payment is safe to repeat and to race", () => {
  it("claims the order once: payment bookkeeping, print shops and the email happen exactly once", async () => {
    state.claims = [1];
    const response = await confirm();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ paid: true });
    expect(state.background).toBe(1); expect(state.email).toBe(1); expect(state.discountIncrements).toBe(1);
  });

  it("a second request that loses the race still answers paid (it used to fail with 'record not found') and does nothing twice", async () => {
    state.claims = [1, 0];
    const results = await Promise.all([confirm(), confirm()]);
    expect(results.map((response) => response.status)).toEqual([200, 200]);
    expect((await Promise.all(results.map((response) => response.json()))).map((body) => body.paid)).toEqual([true, true]);
    expect(state.background).toBe(1); expect(state.email).toBe(1); expect(state.discountIncrements).toBe(1);
  });

  it("answers paid when the webhook already took the order before this request wrote anything", async () => {
    state.claims = [0]; state.status = "PAID";
    const body = await (await confirm()).json();
    expect(body.paid).toBe(true);
    expect(state.background).toBe(0); expect(state.discountIncrements).toBe(0);
  });
});
