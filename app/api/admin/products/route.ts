import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/server/prisma";
import { requireAdmin } from "@/lib/server/auth";
import { handleApiError, jsonError } from "@/lib/server/http";
import { productSchema } from "@/lib/server/validation";

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(["OWNER", "ADMIN", "EDITOR"]);
  if (error) return error;
  const params = request.nextUrl.searchParams;
  const search = params.get("search")?.trim();
  const page = Math.max(1, Number(params.get("page") || 1));
  const limit = Math.min(100, Math.max(1, Number(params.get("limit") || 25)));
  const where = search ? { OR: [{ name: { contains: search, mode: "insensitive" as const } }, { slug: { contains: search, mode: "insensitive" as const } }] } : undefined;
  const [products, total] = await prisma.$transaction([prisma.product.findMany({ where, include: { category: true, images: { include: { asset: true }, orderBy: { sortOrder: "asc" } }, variants: true }, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }), prisma.product.count({ where })]);
  return NextResponse.json({ products, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}

export async function POST(request: NextRequest) {
  const { error, admin } = await requireAdmin(["OWNER", "ADMIN"]);
  if (error) return error;
  try {
    const data = productSchema.parse(await request.json());
    const productData: Prisma.ProductUncheckedCreateInput = {
      slug: data.slug,
      name: data.name,
      kind: data.kind,
      basePriceCents: data.basePriceCents,
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.categoryId ? { categoryId: data.categoryId } : {}),
      ...(data.active !== undefined ? { active: data.active } : {}),
      ...(data.featured !== undefined ? { featured: data.featured } : {}),
      ...(data.metadata !== undefined ? { metadata: data.metadata as Prisma.InputJsonValue } : {}),
    };
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({ data: productData });
      await tx.auditLog.create({ data: { adminUserId: admin!.id, action: "CREATE", entity: "Product", entityId: created.id, metadata: { slug: created.slug } } });
      return created;
    });
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  const { error, admin } = await requireAdmin(["OWNER", "ADMIN"]);
  if (error) return error;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return jsonError("Product id is required");
  try {
    const data = productSchema.partial().parse(await request.json());
    const productData: Prisma.ProductUncheckedUpdateInput = {
      ...(data.slug !== undefined ? { slug: data.slug } : {}),
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.kind !== undefined ? { kind: data.kind } : {}),
      ...(data.basePriceCents !== undefined ? { basePriceCents: data.basePriceCents } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.categoryId !== undefined ? { categoryId: data.categoryId } : {}),
      ...(data.active !== undefined ? { active: data.active } : {}),
      ...(data.featured !== undefined ? { featured: data.featured } : {}),
      ...(data.metadata !== undefined ? { metadata: data.metadata as Prisma.InputJsonValue } : {}),
    };
    const product = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({ where: { id }, data: productData });
      await tx.auditLog.create({ data: { adminUserId: admin!.id, action: "UPDATE", entity: "Product", entityId: id } });
      return updated;
    });
    return NextResponse.json({ product });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  const { error, admin } = await requireAdmin(["OWNER"]);
  if (error) return error;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return jsonError("Product id is required");
  try {
    await prisma.$transaction(async (tx) => {
      await tx.product.update({ where: { id }, data: { active: false } });
      await tx.auditLog.create({ data: { adminUserId: admin!.id, action: "ARCHIVE", entity: "Product", entityId: id } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
