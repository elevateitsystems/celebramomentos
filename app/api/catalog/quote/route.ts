import { NextResponse } from "next/server";
import { z } from "zod";
import { describeProductSelection } from "@/lib/cart";
import { getCustomerSession } from "@/lib/server/auth";
import { ensureCatalog, deliveryCents, resolveCartLine } from "@/lib/server/catalog";
import { DISCOUNT_MESSAGES, clientKey, discountAttemptsBlocked, evaluateDiscount, normalizeDiscountCode, publicVerdict, recordDiscountFailure } from "@/lib/server/discounts";
import { CatalogError } from "@/lib/server/errors";
import { handleApiError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
import { cartLineSchema } from "@/lib/server/validation";
import type { CartItem } from "@/lib/store";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ items: z.array(z.unknown()).max(50), discountCode: z.string().max(60).optional().nullable() });

// Prices cart lines from the database without saving anything, so the cart and
// checkout show the same prices the payment will use. Each line is checked on
// its own so one unavailable product does not hide the others.
// With `discountCode` it also returns the server's verdict on the code (see
// lib/server/discounts.ts): the amount the page shows is never calculated in the browser.
export async function POST(request: Request) {
  try {
    const { items, discountCode } = bodySchema.parse(await request.json());
    await ensureCatalog();
    const lines = await Promise.all(items.map(async (raw, index) => {
      const id = raw && typeof raw === "object" && typeof (raw as { id?: unknown }).id === "string" ? (raw as { id: string }).id : String(index);
      const parsed = cartLineSchema.safeParse(raw);
      if (!parsed.success) return { id, error: "Este producto ya no está disponible. Elimínalo de tu cesta para continuar." };
      try {
        const resolved = await resolveCartLine({ ...parsed.data, id, product: parsed.data.product ?? null } as CartItem);
        const described = resolved.product ? describeProductSelection(resolved.product) : null;
        return { id, unitPriceCents: resolved.unitPriceCents, name: described?.name ?? resolved.productName ?? undefined, detail: described?.detail };
      } catch (reason) {
        if (reason instanceof CatalogError) return { id, error: reason.message };
        throw reason;
      }
    }));
    const code = normalizeDiscountCode(discountCode);
    if (!code) return NextResponse.json({ lines });
    const key = clientKey(request);
    if (discountAttemptsBlocked(key)) return NextResponse.json({ lines, discount: publicVerdict({ ok: false, code, reason: "rate_limited", message: DISCOUNT_MESSAGES.rate_limited }) });
    const priced = lines.filter((line) => line.unitPriceCents !== undefined);
    const quantities = new Map(items.map((raw, index) => [raw && typeof raw === "object" && typeof (raw as { id?: unknown }).id === "string" ? (raw as { id: string }).id : String(index), Number((raw as { quantity?: unknown })?.quantity) || 1]));
    const subtotalCents = priced.reduce((sum, line) => sum + (line.unitPriceCents ?? 0) * Math.max(1, Math.min(99, quantities.get(line.id) ?? 1)), 0);
    const firstCard = (items[0] as { card?: { delivery?: unknown } } | undefined)?.card;
    const shippingCents = priced.length ? await deliveryCents(firstCard?.delivery === "express" ? "express" : "standard", subtotalCents) : 0;
    const customer = await getCustomerSession().catch(() => null);
    const verdict = await evaluateDiscount(prisma, code, { subtotalCents, shippingCents, customerId: customer?.id });
    if (!verdict.ok && verdict.reason === "not_found") recordDiscountFailure(key);
    return NextResponse.json({ lines, discount: publicVerdict(verdict) });
  } catch (reason) {
    return handleApiError(reason);
  }
}
