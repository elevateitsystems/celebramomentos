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
  try {
    const [products, total, categories] = await prisma.$transaction([prisma.product.findMany({ where, include: { category: true, images: { include: { asset: true }, orderBy: { sortOrder: "asc" } }, variants: true }, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }), prisma.product.count({ where }), prisma.category.findMany({ where: { active: true }, select: { id: true, name: true, slug: true }, orderBy: { name: "asc" } })]);
    return NextResponse.json({ products, categories, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  const { error, admin } = await requireAdmin(["OWNER", "ADMIN"]);
  if (error) return error;
  try {
    const data = productSchema.parse(await request.json());
    if (data.categoryId) {
      const category = await prisma.category.findFirst({ where: { id: data.categoryId, active: true }, select: { id: true } });
      if (!category) return jsonError("The selected category is invalid", 400);
    }
    if (data.imageAssetId) {
      const asset = await prisma.asset.findUnique({ where: { id: data.imageAssetId }, select: { kind: true } });
      if (!asset || asset.kind !== "PRODUCT_IMAGE") return jsonError("The selected image is invalid", 400);
    }
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
      if (data.imageAssetId) {
        await tx.productImage.create({ data: { productId: created.id, assetId: data.imageAssetId, alt: created.name, sortOrder: 0 } });
      }
      await tx.auditLog.create({ data: { adminUserId: admin!.id.startsWith("local-") ? null : admin!.id, action: "CREATE", entity: "Product", entityId: created.id, metadata: { slug: created.slug } } });
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
    if (data.categoryId) {
      const category = await prisma.category.findFirst({ where: { id: data.categoryId, active: true }, select: { id: true } });
      if (!category) return jsonError("The selected category is invalid", 400);
    }
    if (data.imageAssetId) {
      const asset = await prisma.asset.findUnique({ where: { id: data.imageAssetId }, select: { kind: true } });
      if (!asset || asset.kind !== "PRODUCT_IMAGE") return jsonError("The selected image is invalid", 400);
    }
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
      if (data.imageAssetId !== undefined) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        if (data.imageAssetId) await tx.productImage.create({ data: { productId: id, assetId: data.imageAssetId, alt: updated.name, sortOrder: 0 } });
      }
      await tx.auditLog.create({ data: { adminUserId: admin!.id.startsWith("local-") ? null : admin!.id, action: "UPDATE", entity: "Product", entityId: id } });
      return updated;
    });
    return NextResponse.json({ product });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  const { error, admin } = await requireAdmin(["OWNER", "ADMIN"]);
  if (error) return error;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return jsonError("Product id is required");
  try {
    await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id }, select: { id: true, name: true } });
      if (!product) throw new Prisma.PrismaClientKnownRequestError("Product not found", { code: "P2025", clientVersion: Prisma.prismaVersion.client });
      // Product images must be detached before deleting the product because the asset relation is restricted.
      // Orders and cart lines retain their history through their SetNull product relations.
      await tx.productImage.deleteMany({ where: { productId: id } });
      await tx.product.delete({ where: { id } });
      await tx.auditLog.create({ data: { adminUserId: admin!.id.startsWith("local-") ? null : admin!.id, action: "DELETE", entity: "Product", entityId: id, metadata: { name: product.name } } });
    });
    return NextResponse.json({ ok: true, deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
