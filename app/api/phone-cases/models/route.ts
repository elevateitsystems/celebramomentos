import { NextRequest, NextResponse } from "next/server";
import { PodApiError } from "@/lib/pod/http";
import { linkedProductgroup, phoneModel, phoneModels, printeersCatalogReady } from "@/lib/pod/printeers/catalog";
import { handleApiError, jsonError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Phone models of a phone case product, from Printeers.
// ?productId=…           → { source: "printeers", models } or { source: "admin" } when the
//                          product is not linked to Printeers yet (the studio then keeps
//                          using the model list typed in admin).
// ?productId=…&model=…   → { model } with the print area and mockup layers of one model.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const productId = params.get("productId") || "";
  try {
    const product = await prisma.product.findFirst({ where: { id: productId, active: true, kind: "PHONE_CASE" }, select: { metadata: true } });
    if (!product) return jsonError("Producto no encontrado", 404);
    const group = linkedProductgroup(product.metadata);
    if (!group || !printeersCatalogReady()) return NextResponse.json({ source: "admin" });
    const reference = params.get("model");
    if (reference) {
      const found = await phoneModel(group, reference);
      if (!found) return jsonError("Este modelo ya no está disponible", 404);
      return NextResponse.json({ source: "printeers", model: found.detail }, { headers: { "Cache-Control": "private, max-age=300" } });
    }
    return NextResponse.json({ source: "printeers", models: await phoneModels(group) }, { headers: { "Cache-Control": "private, max-age=300" } });
  } catch (reason) {
    if (reason instanceof PodApiError) {
      console.error("[printeers] catalog unavailable", { status: reason.status, message: reason.message.slice(0, 200) });
      return jsonError("Los modelos de funda no se pueden cargar ahora. Inténtalo de nuevo en unos minutos.", 503);
    }
    return handleApiError(reason);
  }
}
