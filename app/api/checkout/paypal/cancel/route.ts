import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCustomer } from "@/lib/server/auth";
import { handleApiError, jsonError } from "@/lib/server/http";
import { PayPalError } from "@/lib/server/paypal";
import { cancelPayPalPayment } from "@/lib/server/paypal-checkout";

export const runtime = "nodejs";

const bodySchema = z.object({ paypalOrderId: z.string().trim().min(5).max(64).regex(/^[A-Z0-9]+$/i) });

export async function POST(request: NextRequest) {
  const { error, customer } = await requireCustomer();
  if (error) return error;
  try {
    const { paypalOrderId } = bodySchema.parse(await request.json());
    const result = await cancelPayPalPayment(customer.id, paypalOrderId);
    if (!result) return jsonError("Pedido no encontrado", 404);
    return NextResponse.json(result);
  } catch (reason) {
    if (reason instanceof Error && reason.message === "PayPal is not configured") return jsonError("PayPal no está configurado todavía.", 503);
    if (reason instanceof PayPalError) {
      console.error("PayPal cancel error", { status: reason.status, issue: reason.issue, debugId: reason.debugId });
      return jsonError("No se pudo verificar el pago con PayPal. Inténtalo de nuevo en unos segundos.", 502);
    }
    return handleApiError(reason);
  }
}
