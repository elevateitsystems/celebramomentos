import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/server/auth";
import { handleApiError, jsonError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
import { discountSchema } from "@/lib/server/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = await requireAdmin(["OWNER", "ADMIN", "EDITOR"]);
  if (error) return error;
  try { return NextResponse.json({ discounts: await prisma.discount.findMany({ orderBy: { createdAt: "desc" } }) }); }
  catch (reason) { return handleApiError(reason); }
}

export async function POST(request: NextRequest) {
  const { error, admin } = await requireAdmin(["OWNER", "ADMIN"]);
  if (error) return error;
  try {
    const input = discountSchema.parse(await request.json());
    const discount = await prisma.discount.create({ data: { ...input, code: input.code.toUpperCase(), expiresAt: input.expiresAt ? new Date(input.expiresAt) : null } });
    await prisma.auditLog.create({ data: { adminUserId: admin!.id.startsWith("local") ? null : admin!.id, action: "CREATE", entity: "Discount", entityId: discount.id } });
    return NextResponse.json({ discount }, { status: 201 });
  } catch (reason) { return handleApiError(reason); }
}

export async function PATCH(request: NextRequest) {
  const { error, admin } = await requireAdmin(["OWNER", "ADMIN"]);
  if (error) return error;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return jsonError("Discount id is required");
  try {
    const input = z.object({ code: z.string().trim().min(3).max(40).regex(/^[a-zA-Z0-9_-]+$/).optional(), percentage: z.number().int().min(1).max(100).nullable().optional(), amountCents: z.number().int().nonnegative().nullable().optional(), minOrderCents: z.number().int().nonnegative().nullable().optional(), maxUses: z.number().int().positive().nullable().optional(), expiresAt: z.string().datetime().nullable().optional(), active: z.boolean().optional() }).parse(await request.json());
    const discount = await prisma.discount.update({ where: { id }, data: { ...input, ...(input.code ? { code: input.code.toUpperCase() } : {}), ...(input.expiresAt !== undefined ? { expiresAt: input.expiresAt ? new Date(input.expiresAt) : null } : {}) } });
    await prisma.auditLog.create({ data: { adminUserId: admin!.id.startsWith("local") ? null : admin!.id, action: "UPDATE", entity: "Discount", entityId: id } });
    return NextResponse.json({ discount });
  } catch (reason) { return handleApiError(reason); }
}

export async function DELETE(request: NextRequest) {
  const { error, admin } = await requireAdmin(["OWNER"]);
  if (error) return error;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return jsonError("Discount id is required");
  try { await prisma.discount.update({ where: { id }, data: { active: false } }); await prisma.auditLog.create({ data: { adminUserId: admin!.id.startsWith("local") ? null : admin!.id, action: "ARCHIVE", entity: "Discount", entityId: id } }); return NextResponse.json({ ok: true }); }
  catch (reason) { return handleApiError(reason); }
}
