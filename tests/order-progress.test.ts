import { describe, expect, it } from "vitest";
import { orderStage, printStage } from "@/lib/order-progress";
import { serializeOrder } from "@/lib/server/orders";

const order = (status: string, fulfillments: { mode: string; status: string; carrier?: string | null; trackingNumber?: string | null; trackingUrl?: string | null }[] = []) => ({
  id: "o1", number: "CM-1", email: "a@b.c", status: status as never, totalCents: 2999, createdAt: new Date("2026-11-10T10:00:00Z"), shippingAddress: {}, items: [{ name: "Imanes", quantity: 1 }],
  fulfillments: fulfillments.map((item) => ({ carrier: null, trackingNumber: null, trackingUrl: null, ...item })),
});

describe("order stage", () => {
  it("is received while the print order is not sent, or no print order exists", () => {
    expect(orderStage("PAID", [])).toBe("received");
    expect(orderStage("PAID", [{ status: "READY" }, { status: "NEEDS_ATTENTION" }])).toBe("received");
  });

  it("follows the print shops: sent / in production → preparing, shipped → shipped, delivered → delivered", () => {
    expect(orderStage("PAID", [{ status: "SUBMITTED" }])).toBe("preparing");
    expect(orderStage("PAID", [{ status: "IN_PRODUCTION" }])).toBe("preparing");
    expect(orderStage("PAID", [{ status: "SHIPPED" }])).toBe("shipped");
    expect(orderStage("PAID", [{ status: "DELIVERED" }])).toBe("delivered");
  });

  it("is shipped only when every print order left the shop (partial shipments are still preparing)", () => {
    expect(orderStage("PAID", [{ status: "SHIPPED" }, { status: "IN_PRODUCTION" }])).toBe("preparing");
    expect(orderStage("PAID", [{ status: "SHIPPED" }, { status: "DELIVERED" }])).toBe("shipped");
    expect(printStage([{ status: "SHIPPED" }, { status: "CANCELLED" }])).toBe("shipped");
  });

  it("never goes back below the stored status, and never moves unpaid or cancelled orders", () => {
    expect(orderStage("SHIPPED", [{ status: "READY" }])).toBe("shipped");
    expect(orderStage("DELIVERED", [])).toBe("delivered");
    expect(orderStage("PENDING", [{ status: "SHIPPED" }])).toBe("pending");
    expect(orderStage("CANCELLED", [{ status: "SHIPPED" }])).toBe("cancelled");
    expect(orderStage("REFUNDED", [])).toBe("cancelled");
  });
});

describe("what the customer's order list shows", () => {
  it("shows the real progress from the print shop (test environment)", () => {
    const shipped = serializeOrder(order("PAID", [{ mode: "draft", status: "SHIPPED", carrier: "Royal Mail", trackingNumber: "PH0", trackingUrl: "https://www.royalmail.com/track?n=PH0" }]), "draft");
    expect(shipped).toMatchObject({ status: "Enviado", stage: "shipped", orderStatus: "PAID", tracking: [{ carrier: "Royal Mail", number: "PH0", url: "https://www.royalmail.com/track?n=PH0" }] });
    expect(serializeOrder(order("PAID", [{ mode: "draft", status: "IN_PRODUCTION" }]), "draft")).toMatchObject({ status: "En preparación", stage: "preparing" });
    expect(serializeOrder(order("PAID", [{ mode: "draft", status: "DELIVERED" }]), "draft")).toMatchObject({ status: "Entregado", stage: "delivered" });
    expect(serializeOrder(order("PAID", [{ mode: "draft", status: "NEEDS_ATTENTION" }]), "draft")).toMatchObject({ status: "Pedido recibido", stage: "received" });
  });

  it("ignores print orders of the other environment: a test never changes a real order", () => {
    const live = serializeOrder(order("PAID", [{ mode: "draft", status: "SHIPPED", trackingNumber: "PH0" }]), "live");
    expect(live).toMatchObject({ status: "Pedido recibido", stage: "received", tracking: [] });
  });

  it("labels unpaid and cancelled orders clearly", () => {
    expect(serializeOrder(order("PENDING"), "draft")).toMatchObject({ status: "Pendiente de pago", stage: "pending" });
    expect(serializeOrder(order("CANCELLED"), "draft")).toMatchObject({ status: "Cancelado", stage: "cancelled" });
  });
});
