import { beforeEach, describe, expect, it, vi } from "vitest";

// In-memory stand-in for the few Prisma calls the submission path makes.
const { db, adapter } = vi.hoisted(() => {
  type Row = Record<string, any>;
  const state = { orders: new Map<string, Row>(), fulfillments: new Map<string, Row>(), failNext: false };
  const apply = (row: Row, data: Row) => {
    for (const [key, value] of Object.entries(data)) row[key] = value && typeof value === "object" && "increment" in value ? (row[key] || 0) + value.increment : value;
    row.updatedAt = new Date();
    return row;
  };
  const prisma = {
    order: {
      findUnique: vi.fn(async ({ where, select, include }: Row) => {
        if (state.failNext) { state.failNext = false; throw new Error("database down"); }
        const order = state.orders.get(where.id);
        if (!order) return null;
        if (select?.payments) return { status: order.status, payments: order.payments.filter((payment: Row) => payment.status === "SUCCEEDED") };
        if (include?.fulfillments) return { ...order, fulfillments: [...state.fulfillments.values()].filter((item) => item.orderId === order.id) };
        return order;
      }),
      update: vi.fn(async ({ where, data }: Row) => apply(state.orders.get(where.id)!, data)),
    },
    podFulfillment: {
      findUnique: vi.fn(async ({ where, include }: Row) => {
        const row = state.fulfillments.get(where.id);
        if (!row) return null;
        return include ? { ...row, items: row.items, order: state.orders.get(row.orderId) } : row;
      }),
      findUniqueOrThrow: vi.fn(async ({ where }: Row) => state.fulfillments.get(where.id)),
      // Conditional update = the submission lock.
      updateMany: vi.fn(async ({ where, data }: Row) => {
        const row = state.fulfillments.get(where.id);
        if (!row || (where.status?.in && !where.status.in.includes(row.status))) return { count: 0 };
        apply(row, data);
        return { count: 1 };
      }),
      update: vi.fn(async ({ where, data }: Row) => apply(state.fulfillments.get(where.id)!, data)),
    },
  };
  const podAdapter = { provider: "GELATO", configurationProblem: vi.fn(() => null as string | null), submit: vi.fn(), findByReference: vi.fn(async (): Promise<unknown> => null), fetchStatus: vi.fn() };
  return { db: { state, prisma }, adapter: podAdapter };
});

vi.mock("@/lib/server/prisma", () => ({ prisma: db.prisma }));
vi.mock("@/lib/pod/providers", () => ({ podAdapter: () => adapter }));

import * as fulfillmentModule from "@/lib/pod/fulfillment";
import { artworkProblems, handlePaidOrder, submitFulfillment, syncOrderStatus } from "@/lib/pod/fulfillment";
import { PodApiError } from "@/lib/pod/http";

const item = { id: "item1", name: "Póster", quantity: 1, podIssues: [], podArtwork: [{ unit: 0, productRef: "wall_hanging_poster_x", area: "default", url: "https://res.cloudinary.com/x/image/upload/a.jpg", source: "customer" }] };

function seed({ paid = true, status = "READY", attempts = 0 } = {}) {
  db.state.orders.clear();
  db.state.fulfillments.clear();
  db.state.orders.set("o1", { id: "o1", number: "CM-1", status: paid ? "PAID" : "PENDING", email: "a@b.c", shippingAddress: { recipient: "Ana", address: "Calle 1", city: "Madrid", postalCode: "28001", country: "ES" }, payments: [{ status: paid ? "SUCCEEDED" : "PENDING" }] });
  db.state.fulfillments.set("f1", { id: "f1", orderId: "o1", provider: "GELATO", status, mode: "draft", reference: "CM-1-GEL", attempts, items: [item], shippingMethod: "standard" });
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.POD_ORDER_MODE;
  adapter.configurationProblem.mockReturnValue(null);
  adapter.findByReference.mockResolvedValue(null);
});

describe("payment verification", () => {
  it("never sends an order whose payment is not verified", async () => {
    seed({ paid: false });
    const result = await submitFulfillment("f1");
    expect(result).toMatchObject({ ok: false, message: expect.stringContaining("payment") });
    expect(adapter.submit).not.toHaveBeenCalled();
  });
});

describe("duplicate prevention", () => {
  it("sends one order even when two triggers run at the same time", async () => {
    seed();
    adapter.submit.mockImplementation(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); return { providerOrderId: "g1", providerStatus: "draft", status: "SUBMITTED" }; });
    const [first, second] = await Promise.all([submitFulfillment("f1"), submitFulfillment("f1")]);
    expect(adapter.submit).toHaveBeenCalledTimes(1);
    expect([first.ok, second.ok].sort()).toEqual([false, true]);
    expect(db.state.fulfillments.get("f1")).toMatchObject({ status: "SUBMITTED", providerOrderId: "g1", attempts: 1 });
  });

  it("does not send again once the order is with the print shop", async () => {
    seed({ status: "SUBMITTED" });
    expect((await submitFulfillment("f1")).ok).toBe(false);
    expect(adapter.submit).not.toHaveBeenCalled();
  });

  it("looks the order up before retrying, in case the last attempt reached the shop", async () => {
    seed({ status: "FAILED", attempts: 1 });
    adapter.findByReference.mockResolvedValue({ providerOrderId: "g-existing", providerStatus: "created", status: "SUBMITTED" });
    const result = await submitFulfillment("f1");
    expect(result.ok).toBe(true);
    expect(adapter.findByReference).toHaveBeenCalledWith("CM-1-GEL", "draft");
    expect(adapter.submit).not.toHaveBeenCalled();
    expect(db.state.fulfillments.get("f1")?.providerOrderId).toBe("g-existing");
  });
});

describe("failures", () => {
  it("keeps a temporarily failed order and schedules a retry", async () => {
    seed();
    adapter.submit.mockRejectedValue(new PodApiError("GELATO", 503, "GELATO answered HTTP 503", true));
    const result = await submitFulfillment("f1");
    const row = db.state.fulfillments.get("f1")!;
    expect(result).toMatchObject({ ok: false, status: "FAILED" });
    expect(row.lastError).toContain("503");
    expect(row.nextAttemptAt).toBeInstanceOf(Date);
  });

  it("does not retry automatically when the request itself is wrong", async () => {
    seed();
    adapter.submit.mockRejectedValue(new PodApiError("GELATO", 400, "GELATO answered HTTP 400: invalid productUid", false));
    await submitFulfillment("f1");
    expect(db.state.fulfillments.get("f1")).toMatchObject({ status: "FAILED", nextAttemptAt: null });
  });

  it("holds the order when the print shop is not configured", async () => {
    seed();
    adapter.configurationProblem.mockReturnValue("GELATO_API_KEY is not set");
    expect(await submitFulfillment("f1")).toMatchObject({ ok: false, status: "NEEDS_ATTENTION" });
    expect(adapter.submit).not.toHaveBeenCalled();
  });

  it("never throws into the payment flow", async () => {
    seed();
    db.state.failNext = true;
    await expect(handlePaidOrder("o1")).resolves.toBeUndefined();
  });
});

describe("order status", () => {
  it("ignores draft print orders (tests) when updating the customer's order", async () => {
    seed({ status: "SHIPPED" });
    await syncOrderStatus("o1");
    expect(db.state.orders.get("o1")?.status).toBe("PAID");
  });

  it("marks the order shipped when every live print order shipped", async () => {
    seed({ status: "SHIPPED" });
    db.state.fulfillments.get("f1")!.mode = "live";
    await syncOrderStatus("o1");
    expect(db.state.orders.get("o1")?.status).toBe("SHIPPED");
  });
});

describe("print files", () => {
  const card = (verified: { width: number; height: number } | null, url: string | null = "https://res.cloudinary.com/x/image/upload/strip.jpg") => ({ unit: 0, productRef: "CLASSIC-GRE-FEDR-7X5-BLA", area: "default", url, source: "design" as const, kind: "pages" as const, width: 6120, height: 2160, format: "jpg" as const, verified });

  it("never sends a card print file that is not exactly the size Prodigi requires", async () => {
    seed({ status: "READY" });
    db.state.fulfillments.get("f1")!.items = [{ ...item, podArtwork: [card({ width: 3260, height: 2160 })] }];
    const result = await submitFulfillment("f1");
    expect(result).toMatchObject({ ok: false, status: "NEEDS_ATTENTION", message: expect.stringContaining("3260 × 2160 px; 6120 × 2160 px is required") });
    expect(adapter.submit).not.toHaveBeenCalled();
    expect(db.state.fulfillments.get("f1")?.status).toBe("NEEDS_ATTENTION");
  });

  it("sends it when the verified size matches", async () => {
    seed({ status: "READY" });
    db.state.fulfillments.get("f1")!.items = [{ ...item, podArtwork: [card({ width: 6120, height: 2160 })] }];
    adapter.submit.mockResolvedValue({ providerOrderId: "ord_1", providerStatus: "InProgress", status: "SUBMITTED" });
    expect(await submitFulfillment("f1")).toMatchObject({ ok: true, status: "SUBMITTED" });
    expect(adapter.submit.mock.calls[0][0].lines[0].files).toEqual([{ area: "default", url: "https://res.cloudinary.com/x/image/upload/strip.jpg", source: "design" }]);
  });

  it("reports missing and unverified files", () => {
    expect(artworkProblems([card(null, null)])).toEqual(["Print file 1 (default) is missing"]);
    expect(artworkProblems([card(null)])).toEqual(["Print file 1 (default): its pixel size was not verified"]);
    expect(artworkProblems([card({ width: 6120, height: 2160 })])).toEqual([]);
    // A photo sent as the customer uploaded it has no fixed size.
    expect(artworkProblems([{ unit: 0, productRef: "x", area: "default", url: "https://x/a.jpg", source: "design", fit: "original", width: 10, height: 10, verified: null }])).toEqual([]);
  });

  it("has no way to set a print order's status by hand", () => {
    expect("markFulfillment" in fulfillmentModule).toBe(false);
  });
});
