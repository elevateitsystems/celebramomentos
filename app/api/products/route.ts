import { NextResponse } from "next/server";
import { handleApiError, jsonError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
import { PRODUCT_KINDS, isProductKind, variantAttributes } from "@/lib/products";

export const dynamic = "force-dynamic";

// Public catalog: only active products, their active sizes and their options.
export async function GET(request: Request) {
  try {
    const kind = new URL(request.url).searchParams.get("kind");
    if (kind && !isProductKind(kind)) return jsonError("Invalid product type", 400);
    const products = await prisma.product.findMany({
      where: { active: true, kind: isProductKind(kind) ? kind : { in: [...PRODUCT_KINDS] } },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        kind: true,
        featured: true,
        basePriceCents: true,
        metadata: true,
        images: { select: { asset: { select: { url: true } } }, orderBy: { sortOrder: "asc" } },
        variants: { where: { active: true }, select: { id: true, name: true, priceCents: true, attributes: true }, orderBy: { createdAt: "asc" } },
        options: { select: { id: true, key: true, name: true, required: true, config: true }, orderBy: { key: "asc" } },
      },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    });
    // Expose only the per-size photo count from the stored attributes.
    const catalog = products.map((product) => ({ ...product, variants: product.variants.map(({ attributes, ...variant }) => ({ ...variant, photoCount: variantAttributes(attributes).photoCount })) }));
    return NextResponse.json({ products: catalog }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error);
  }
}
