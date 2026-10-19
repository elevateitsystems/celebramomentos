import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/server/auth";
import { handleApiError, jsonError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
import { templateSchema } from "@/lib/server/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = await requireAdmin(["OWNER", "ADMIN", "EDITOR"]);
  if (error) return error;
  try { return NextResponse.json({ templates: await prisma.postcardTemplate.findMany({ include: { images: { include: { asset: true }, orderBy: { sortOrder: "asc" } } }, orderBy: { createdAt: "desc" } }) }); }
  catch (reason) { return handleApiError(reason); }
}

export async function POST(request: NextRequest) {
  const { error, admin } = await requireAdmin(["OWNER", "ADMIN"]);
  if (error) return error;
  try {
    const input = templateSchema.parse(await request.json());
    const template = await prisma.$transaction(async (tx) => {
      const created = await tx.postcardTemplate.create({ data: { ...input, metadata: input.metadata as Prisma.InputJsonValue } });
      await tx.auditLog.create({ data: { adminUserId: admin!.id, action: "CREATE", entity: "PostcardTemplate", entityId: created.id, metadata: { slug: created.slug } } });
      return created;
    });
    return NextResponse.json({ template }, { status: 201 });
  } catch (reason) { return handleApiError(reason); }
}

export async function PATCH(request: NextRequest) {
  const { error, admin } = await requireAdmin(["OWNER", "ADMIN"]);
  if (error) return error;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return jsonError("Template id is required");
  try {
    const input = templateSchema.partial().parse(await request.json());
    const data: Prisma.PostcardTemplateUncheckedUpdateInput = {
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.imageCount !== undefined ? { imageCount: input.imageCount } : {}),
      ...(input.priceCents !== undefined ? { priceCents: input.priceCents } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
      ...(input.metadata !== undefined ? { metadata: input.metadata === null ? Prisma.JsonNull : input.metadata as Prisma.InputJsonValue } : {}),
    };
    const template = await prisma.$transaction(async (tx) => {
      const updated = await tx.postcardTemplate.update({ where: { id }, data });
      await tx.auditLog.create({ data: { adminUserId: admin!.id, action: "UPDATE", entity: "PostcardTemplate", entityId: id } });
      return updated;
    });
    return NextResponse.json({ template });
  } catch (reason) { return handleApiError(reason); }
}

export async function DELETE(request: NextRequest) {
  const { error, admin } = await requireAdmin(["OWNER"]);
  if (error) return error;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return jsonError("Template id is required");
  try { await prisma.$transaction([prisma.postcardTemplate.update({ where: { id }, data: { active: false } }), prisma.auditLog.create({ data: { adminUserId: admin!.id, action: "ARCHIVE", entity: "PostcardTemplate", entityId: id } })]); return NextResponse.json({ ok: true }); }
  catch (reason) { return handleApiError(reason); }
}
