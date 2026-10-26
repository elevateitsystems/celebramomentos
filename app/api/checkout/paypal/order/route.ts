import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireCustomer } from "@/lib/server/auth";
import { checkoutOrigin, createPendingOrder, markOrderFailed } from "@/lib/server/checkout";
import { handleApiError, jsonError } from "@/lib/server/http";
import { PayPalError, approvalUrl, assertPayPalConfigured, createPayPalOrder, getPayPalOrder } from "@/lib/server/paypal";
import { prisma } from "@/lib/server/prisma";
import { customerCheckoutSchema } from "@/lib/server/validation";

export const runtime = "nodejs";

// Creates a pending order from the customer's cart and a matching PayPal order,
// then returns PayPal's approval URL. Nothing is charged until the server captures.
export async function POST(request: NextRequest) {
  const { error, customer } = await requireCustomer();
  if (error) return error;
  try {
    assertPayPalConfigured();
    const input = customerCheckoutSchema.parse(await request.json());
    if (input.payment !== "paypal") return jsonError("Selecciona PayPal como método de pago.", 400);
    const idempotencyKey = request.headers.get("idempotency-key")?.trim() || randomUUID();
    const existing = await prisma.order.findUnique({ where: { checkoutIdempotencyKey: idempotencyKey }, include: { payments: true } });
    if (existing) {
      const paypalOrderId = existing.customerId === customer.id ? existing.payments.find((payment) => payment.provider === "paypal")?.paypalOrderId : null;
      if (paypalOrderId && existing.status === "PENDING") {
        const url = approvalUrl(await getPayPalOrder(paypalOrderId));
        if (url) return NextResponse.json({ orderId: existing.id, orderNumber: existing.number, paypalOrderId, approvalUrl: url });
      }
      return jsonError("Este pago ya se ha iniciado. Recarga la página para empezar de nuevo.", 409);
    }

    const pending = await createPendingOrder({ customerId: customer.id, input, idempotencyKey, provider: "paypal" });
    const { order } = pending;
    if (pending.totalCents <= 0) {
      await markOrderFailed(order.id, "FAILED", "PayPal requires a positive amount");
      return jsonError("El total del pedido debe ser mayor que 0 €.", 400);
    }
    try {
      const origin = checkoutOrigin(request.nextUrl.origin);
      const paypalOrder = await createPayPalOrder({
        orderId: order.id,
        orderNumber: order.number,
        items: pending.lines,
        subtotalCents: pending.subtotalCents,
        shippingCents: pending.shippingCents,
        discountCents: pending.discountCents,
        totalCents: pending.totalCents,
        // PayPal appends ?token=<PayPal order id> (and PayerID on approval).
        returnUrl: `${origin}/checkout/paypal/return`,
        cancelUrl: `${origin}/checkout?payment=cancelled&provider=paypal`,
        requestId: `create-${order.id}`,
      });
      const url = approvalUrl(paypalOrder);
      if (!url) throw new Error("PayPal did not return an approval URL");
      await prisma.payment.update({ where: { id: order.payments[0].id }, data: { paypalOrderId: paypalOrder.id, raw: { paypalOrderId: paypalOrder.id, paypalStatus: paypalOrder.status } } });
      return NextResponse.json({ orderId: order.id, orderNumber: order.number, paypalOrderId: paypalOrder.id, approvalUrl: url });
    } catch (reason) {
      await markOrderFailed(order.id, "FAILED", reason instanceof Error ? reason.message : "PayPal order creation failed");
      throw reason;
    }
  } catch (reason) {
    if (reason instanceof Error && reason.message === "PayPal is not configured") return jsonError("PayPal no está configurado todavía.", 503);
    if (reason instanceof PayPalError) {
      console.error("PayPal order error", { status: reason.status, issue: reason.issue, debugId: reason.debugId });
      return jsonError("No se pudo iniciar el pago con PayPal. Inténtalo de nuevo.", 502);
    }
    return handleApiError(reason);
  }
}
