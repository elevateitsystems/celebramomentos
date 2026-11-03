import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { handleApiError, jsonError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
import { templateImageSchema } from "@/lib/server/validation";

export const dynamic = "force-dynamic";

const withImages = { images: { include: { asset: true }, orderBy: { sortOrder: "asc" } } } as const;

// Sets the cover image of a template (admin → Templates). The file is uploaded through
// /api/uploads with kind=TEMPLATE_IMAGE first; this attaches the stored asset, replacing
// whatever the template had. The asset itself is kept in the library.
export async function POST(request: NextRequest) {
  const { error, admin } = await requireAdmin(["OWNER", "ADMIN"]);
  if (error) return error;
  try {
    const input = templateImageSchema.parse(await request.json());
    const asset = await prisma.asset.findUnique({ where: { id: input.assetId }, select: { id: true, kind: true, url: true } });
    if (!asset || !asset.url) return jsonError("That image was not found", 404);
    if (asset.kind !== "TEMPLATE_IMAGE") return jsonError("Only template images can be used here", 400);
    const template = await prisma.$transaction(async (tx) => {
      const found = await tx.postcardTemplate.findUnique({ where: { id: input.templateId }, select: { id: true, slug: true } });
      if (!found) return null;
      await tx.templateImage.deleteMany({ where: { templateId: found.id } });
      await tx.templateImage.create({ data: { templateId: found.id, assetId: asset.id, alt: input.alt ?? null, sortOrder: 0 } });
      await tx.auditLog.create({ data: { adminUserId: admin!.id.startsWith("local") ? null : admin!.id, action: "UPDATE", entity: "PostcardTemplate", entityId: found.id, metadata: { image: "set", slug: found.slug } } });
      return tx.postcardTemplate.findUnique({ where: { id: found.id }, include: withImages });
    });
    if (!template) return jsonError("Template not found", 404);
    return NextResponse.json({ template });
  } catch (reason) { return handleApiError(reason); }
}

// Removes the cover image; the template falls back to its built-in preview.
export async function DELETE(request: NextRequest) {
  const { error, admin } = await requireAdmin(["OWNER", "ADMIN"]);
  if (error) return error;
  const templateId = request.nextUrl.searchParams.get("templateId");
  if (!templateId) return jsonError("Template id is required");
  try {
    const found = await prisma.postcardTemplate.findUnique({ where: { id: templateId }, select: { id: true, slug: true } });
    if (!found) return jsonError("Template not found", 404);
    await prisma.$transaction([
      prisma.templateImage.deleteMany({ where: { templateId: found.id } }),
      prisma.auditLog.create({ data: { adminUserId: admin!.id.startsWith("local") ? null : admin!.id, action: "UPDATE", entity: "PostcardTemplate", entityId: found.id, metadata: { image: "removed", slug: found.slug } } }),
    ]);
    return NextResponse.json({ template: await prisma.postcardTemplate.findUnique({ where: { id: found.id }, include: withImages }) });
  } catch (reason) { return handleApiError(reason); }
}
