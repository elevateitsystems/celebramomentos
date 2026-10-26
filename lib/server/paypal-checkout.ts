import { Prisma } from "@prisma/client";
import { markOrderFailed } from "./checkout";
import { serializeOrder } from "./orders";
import { PayPalError, approvalUrl, capturePayPalOrder, firstCapture, getPayPalOrder, toCents, type PayPalOrder } from "./paypal";
import { prisma } from "./prisma";

export type PayPalResult =
  | { status: "paid" | "pending" | "cancelled" | "failed"; order: ReturnType<typeof serializeOrder>; message?: string }
  | { status: "declined"; order: ReturnType<typeof serializeOrder>; approvalUrl: string | null }
  | { status: "not_approved"; order: ReturnType<typeof serializeOrder>; approvalUrl: string | null };

const PAID_STATUSES = new Set(["PAID", "PROCESSING", "SHIPPED", "DELIVERED"]);

async function findCustomerPayment(customerId: string, paypalOrderId: string) {
  const payment = await prisma.payment.findUnique({ where: { paypalOrderId }, include: { order: { include: { items: true, discountUsages: true } } } });
  if (!payment || payment.provider !== "paypal" || payment.order.customerId !== customerId) return null;
  return payment;
}

type CustomerPayment = NonNullable<Awaited<ReturnType<typeof findCustomerPayment>>>;

async function result(payment: CustomerPayment, status: PayPalResult["status"], extra: Record<string, unknown> = {}) {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: payment.orderId }, include: { items: true } });
  return { status, order: serializeOrder(order), ...extra } as PayPalResult;
}

function existingStatus(payment: CustomerPayment): PayPalResult["status"] | null {
  if (PAID_STATUSES.has(payment.order.status)) return "paid";
  if (payment.order.status === "CANCELLED" || payment.order.status === "REFUNDED") return payment.status === "FAILED" ? "failed" : "cancelled";
  return null;
}

// Applies a PayPal order state to our order. Only a COMPLETED capture whose
// amount, currency and order reference match is ever marked as paid, and the
// PENDING → PAID transition is conditional so it can only happen once.
async function applyPayPalOrder(payment: CustomerPayment, paypalOrder: PayPalOrder) {
  const order = payment.order;
  const capture = firstCapture(paypalOrder);
  const unit = paypalOrder.purchase_units?.[0];
  const raw = { paypalOrderId: paypalOrder.id, paypalStatus: paypalOrder.status, captureId: capture?.id, captureStatus: capture?.status, captureReason: capture?.status_details?.reason } as Prisma.InputJsonValue;
  if (!capture) return result(payment, "pending");
  const matches = (unit?.custom_id || unit?.reference_id) === order.id && capture.amount.currency_code.toUpperCase() === order.currency.toUpperCase() && toCents(capture.amount.value) === order.totalCents;
  if (!matches) {
    console.error("PayPal capture does not match order", { orderId: order.id, paypalOrderId: paypalOrder.id, captureId: capture.id });
    await prisma.payment.update({ where: { id: payment.id }, data: { raw: { ...(raw as object), mismatch: true } } });
    return result(payment, "pending", { message: "El pago necesita una revisión manual. Contacta con nosotros indicando tu número de pedido." });
  }
  if (capture.status === "COMPLETED") {
    await prisma.$transaction(async (tx) => {
      const updated = await tx.order.updateMany({ where: { id: order.id, status: "PENDING" }, data: { status: "PAID" } });
      if (updated.count !== 1) {
        // Already finalised elsewhere; still record a capture we have not stored yet.
        await tx.payment.updateMany({ where: { id: payment.id, paypalCaptureId: null }, data: { status: "SUCCEEDED", paypalCaptureId: capture.id, raw: { ...(raw as object), capturedAfterOrderClosed: true } } });
        return;
      }
      await tx.payment.update({ where: { id: payment.id }, data: { status: "SUCCEEDED", paypalCaptureId: capture.id, raw } });
      if (order.discountUsages.length) await tx.discount.update({ where: { id: order.discountUsages[0].discountId }, data: { usedCount: { increment: 1 } } });
      if (order.customerId) await tx.cartLine.deleteMany({ where: { customerId: order.customerId } });
    });
    const refreshed = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, select: { status: true } });
    if (PAID_STATUSES.has(refreshed.status)) return result(payment, "paid");
    console.error("PayPal capture completed for a closed order", { orderId: order.id, captureId: capture.id });
    return result(payment, "pending", { message: "Hemos recibido tu pago y lo estamos revisando. Contacta con nosotros indicando tu número de pedido." });
  }
  if (capture.status === "PENDING") {
    await prisma.payment.update({ where: { id: payment.id }, data: { paypalCaptureId: capture.id, raw } });
    return result(payment, "pending", { message: "PayPal está revisando el pago. Tu pedido se marcará como pagado cuando PayPal lo confirme." });
  }
  await markOrderFailed(order.id, "FAILED", `PayPal capture ${capture.status}`);
  return result(payment, "failed", { message: "PayPal no ha completado el pago. No se ha realizado ningún cargo." });
}

export async function finalizePayPalPayment(customerId: string, paypalOrderId: string): Promise<PayPalResult | null> {
  const payment = await findCustomerPayment(customerId, paypalOrderId);
  if (!payment) return null;
  const known = existingStatus(payment);
  // Already finalised: never capture twice.
  if (known) return result(payment, known);

  let paypalOrder = await getPayPalOrder(paypalOrderId);
  if (paypalOrder.status === "APPROVED") {
    try {
      paypalOrder = await capturePayPalOrder(paypalOrderId, `capture-${payment.id}`);
    } catch (reason) {
      if (!(reason instanceof PayPalError)) throw reason;
      if (reason.issue === "ORDER_ALREADY_CAPTURED") {
        paypalOrder = await getPayPalOrder(paypalOrderId);
      } else if (reason.issue === "INSTRUMENT_DECLINED") {
        // PayPal lets the buyer pick another funding source for the same order.
        return result(payment, "declined", { approvalUrl: approvalUrl(paypalOrder) });
      } else if (reason.status === 422) {
        console.error("PayPal capture rejected", { orderId: payment.orderId, issue: reason.issue, debugId: reason.debugId });
        await markOrderFailed(payment.orderId, "FAILED", reason.issue || reason.message);
        return result(payment, "failed", { message: "PayPal ha rechazado el pago. No se ha realizado ningún cargo." });
      } else {
        throw reason;
      }
    }
  }
  if (paypalOrder.status === "COMPLETED") return applyPayPalOrder(payment, paypalOrder);
  if (paypalOrder.status === "VOIDED") {
    await markOrderFailed(payment.orderId, "CANCELLED", "PayPal order voided");
    return result(payment, "cancelled");
  }
  return result(payment, "not_approved", { approvalUrl: approvalUrl(paypalOrder) });
}

export async function cancelPayPalPayment(customerId: string, paypalOrderId: string): Promise<PayPalResult | null> {
  const payment = await findCustomerPayment(customerId, paypalOrderId);
  if (!payment) return null;
  const known = existingStatus(payment);
  if (known) return result(payment, known);
  const paypalOrder = await getPayPalOrder(paypalOrderId);
  // An approved or completed order is reconciled instead of cancelled so a
  // payment that went through is never lost.
  if (paypalOrder.status === "APPROVED" || paypalOrder.status === "COMPLETED") return finalizePayPalPayment(customerId, paypalOrderId);
  await markOrderFailed(payment.orderId, "CANCELLED", "Cancelled by the customer at PayPal");
  return result(payment, "cancelled");
}
