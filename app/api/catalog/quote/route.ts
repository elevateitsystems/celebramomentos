import { NextResponse } from "next/server";
import { z } from "zod";
import { describeProductSelection } from "@/lib/cart";
import { ensureCatalog, resolveCartLine } from "@/lib/server/catalog";
import { CatalogError } from "@/lib/server/errors";
import { handleApiError } from "@/lib/server/http";
import { cartLineSchema } from "@/lib/server/validation";
import type { CartItem } from "@/lib/store";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ items: z.array(z.unknown()).max(50) });

// Prices cart lines from the database without saving anything, so the cart and
// checkout show the same prices the payment will use. Each line is checked on
// its own so one unavailable product does not hide the others.
export async function POST(request: Request) {
  try {
    const { items } = bodySchema.parse(await request.json());
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
    return NextResponse.json({ lines });
  } catch (reason) {
    return handleApiError(reason);
  }
}
