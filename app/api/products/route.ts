import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const products = await prisma.product.findMany({ where: { active: true }, include: { category: true, images: { include: { asset: true }, orderBy: { sortOrder: "asc" } }, variants: { where: { active: true } } }, orderBy: [{ featured: "desc" }, { createdAt: "desc" }] });
  return NextResponse.json({ products });
}
