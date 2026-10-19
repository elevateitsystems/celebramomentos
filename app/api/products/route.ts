import { NextResponse } from "next/server";
import { handleApiError, jsonError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";

const productKinds = ["POSTCARD", "CALENDAR", "WALL_ART", "MAGNET", "PHONE_CASE", "MUG", "STICKER"] as const;

export async function GET(request: Request) {
  try {
    const kind = new URL(request.url).searchParams.get("kind");
    if (kind && !productKinds.includes(kind as (typeof productKinds)[number])) return jsonError("Invalid product type", 400);
    const products = await prisma.product.findMany({ where: { active: true, ...(kind ? { kind: kind as (typeof productKinds)[number] } : {}) }, include: { category: true, images: { include: { asset: true }, orderBy: { sortOrder: "asc" } }, variants: { where: { active: true } } }, orderBy: [{ featured: "desc" }, { createdAt: "desc" }] });
    return NextResponse.json({ products });
  } catch (error) {
    return handleApiError(error);
  }
}
