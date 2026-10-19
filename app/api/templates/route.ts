import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
import { ensureCatalog } from "@/lib/server/catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureCatalog();
    const templates = await prisma.postcardTemplate.findMany({ where: { active: true }, include: { images: { include: { asset: true }, orderBy: { sortOrder: "asc" } } }, orderBy: { createdAt: "asc" } });
    return NextResponse.json({ templates });
  } catch (error) { return handleApiError(error); }
}
