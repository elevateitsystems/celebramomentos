import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import type { z } from "zod";
import { prisma } from "@/lib/server/prisma";
import { requireAdmin } from "@/lib/server/auth";
import { handleApiError, jsonError } from "@/lib/server/http";
import { productSchema } from "@/lib/server/validation";
import { DEFAULT_CARD_TEMPLATE, DEFAULT_POD_PROVIDER, PRODUCT_KIND_INFO, PRODUCT_KINDS, isPodProvider, isProductKind, optionKey, type ProductKind } from "@/lib/products";

export const dynamic = "force-dynamic";

type ProductInput = z.infer<typeof productSchema>;
type ProductPatch = Partial<ProductInput>;

const adminInclude = {
  category: true,
  images: { include: { asset: true }, orderBy: { sortOrder: "asc" } },
  variants: { where: { active: true }, orderBy: { createdAt: "asc" } },
  options: { orderBy: { key: "asc" } },
} satisfies Prisma.ProductInclude;

// Storefront pages read products through /api/products at request time; this
// also drops any cached render of the affected category pages.
function revalidateStorefront(kinds: string[]) {
  revalidatePath("/");
  for (const kind of new Set(kinds)) if (isProductKind(kind)) revalidatePath(PRODUCT_KIND_INFO[kind].path);
}

// Card templates belong to Cards only; sizes and options belong to studio products only.
function normalizeForKind(kind: ProductKind, data: ProductPatch, currentMetadata: Prisma.JsonValue | null) {
  const current = (currentMetadata && typeof currentMetadata === "object" && !Array.isArray(currentMetadata) ? currentMetadata : {}) as { templateSlug?: string; photoCount?: number; provider?: string };
  const merged = { ...current, ...(data.metadata || {}) };
  const provider = isPodProvider(merged.provider) ? merged.provider : DEFAULT_POD_PROVIDER[kind];
  if (kind === "POSTCARD") {
    // Card sizes (5x7 / A5) and their prices are shared by every card and set in admin Settings.
    if (data.variants?.length || data.options?.length) return { error: "Cards use the card sizes from Settings; sizes and options are not available for Card products." };
    return { metadata: { templateSlug: merged.templateSlug || DEFAULT_CARD_TEMPLATE, provider }, variants: [], options: [] };
  }
  if (data.metadata?.templateSlug) return { error: "Card templates (Tradicional, Collage, Magazine) can only be used by Cards." };
  return { metadata: { ...(merged.photoCount ? { photoCount: merged.photoCount } : {}), provider }, variants: data.variants, options: data.options };
}

async function validateReferences(data: ProductPatch) {
  if (data.categoryId) {
    const category = await prisma.category.findFirst({ where: { id: data.categoryId, active: true }, select: { id: true } });
    if (!category) return "The selected category is invalid";
  }
  if (data.imageAssetId) {
    const asset = await prisma.asset.findUnique({ where: { id: data.imageAssetId }, select: { kind: true } });
    if (!asset || asset.kind !== "PRODUCT_IMAGE") return "The selected image is invalid";
  }
  const names = data.options?.map((option) => optionKey(option.name)) || [];
  if (new Set(names).size !== names.length) return "Each option needs a different name";
  return null;
}

// ProductVariant.sku is our own unique id; the print shop's SKU can repeat across sizes
// (e.g. every magnet pack uses M-MAG-FRI-3X2), so it lives in attributes.
function variantAttributesInput(variant: NonNullable<ProductInput["variants"]>[number]) {
  return { size: variant.name, ...(variant.photoCount ? { photoCount: variant.photoCount } : {}), ...(variant.podSku ? { podSku: variant.podSku } : {}), ...(variant.provider ? { provider: variant.provider } : {}) };
}

async function syncVariants(tx: Prisma.TransactionClient, productId: string, slug: string, variants: NonNullable<ProductInput["variants"]>) {
  const existing = await tx.productVariant.findMany({ where: { productId }, select: { id: true } });
  const existingIds = new Set(existing.map((variant) => variant.id));
  const keep = new Set<string>();
  for (const variant of variants) {
    if (variant.id && existingIds.has(variant.id)) {
      keep.add(variant.id);
      await tx.productVariant.update({ where: { id: variant.id }, data: { name: variant.name, priceCents: variant.priceCents, attributes: variantAttributesInput(variant), active: true } });
    } else {
      await tx.productVariant.create({ data: { productId, sku: `${slug}-${randomUUID().slice(0, 8)}`, name: variant.name, priceCents: variant.priceCents, attributes: variantAttributesInput(variant) } });
    }
  }
  // Removed sizes are deactivated rather than deleted so past orders keep their reference.
  const removed = existing.filter((variant) => !keep.has(variant.id)).map((variant) => variant.id);
  if (removed.length) await tx.productVariant.updateMany({ where: { id: { in: removed } }, data: { active: false } });
}

async function syncOptions(tx: Prisma.TransactionClient, productId: string, options: NonNullable<ProductInput["options"]>) {
  await tx.personalizationOption.deleteMany({ where: { productId } });
  if (!options.length) return;
  await tx.personalizationOption.createMany({ data: options.map((option) => ({ productId, name: option.name, key: optionKey(option.name), type: "select", required: option.required ?? true, config: { choices: Array.from(new Set(option.choices)) } })) });
}

const auditUserId = (admin: { id: string }) => (admin.id.startsWith("local-") ? null : admin.id);

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(["OWNER", "ADMIN", "EDITOR"]);
  if (error) return error;
  const params = request.nextUrl.searchParams;
  const search = params.get("search")?.trim();
  const kindParam = params.get("kind");
  if (kindParam && !isProductKind(kindParam)) return jsonError("Invalid product type", 400);
  const kind = isProductKind(kindParam) ? kindParam : null;
  const page = Math.max(1, Number(params.get("page") || 1));
  const limit = Math.min(100, Math.max(1, Number(params.get("limit") || 25)));
  // Only the categories that are still sold (old STICKER rows stay hidden).
  const where: Prisma.ProductWhereInput = {
    kind: kind ?? { in: [...PRODUCT_KINDS] },
    ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { slug: { contains: search, mode: "insensitive" } }] } : {}),
  };
  try {
    const [products, total, counts] = await prisma.$transaction([
      prisma.product.findMany({ where, include: adminInclude, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
      prisma.product.count({ where }),
      prisma.product.groupBy({ by: ["kind"], where: { kind: { in: [...PRODUCT_KINDS] } }, orderBy: { kind: "asc" }, _count: { _all: true } }),
    ]);
    const countByKind = Object.fromEntries(PRODUCT_KINDS.map((item) => [item, 0])) as Record<ProductKind, number>;
    for (const row of counts) if (isProductKind(row.kind)) countByKind[row.kind] = typeof row._count === "object" && row._count ? row._count._all ?? 0 : 0;
    return NextResponse.json({ products, counts: countByKind, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  const { error, admin } = await requireAdmin(["OWNER", "ADMIN"]);
  if (error) return error;
  try {
    const data = productSchema.parse(await request.json());
    const referenceError = await validateReferences(data);
    if (referenceError) return jsonError(referenceError, 400);
    const normalized = normalizeForKind(data.kind, data, null);
    if ("error" in normalized) return jsonError(normalized.error as string, 400);
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          slug: data.slug,
          name: data.name,
          kind: data.kind,
          basePriceCents: data.basePriceCents,
          description: data.description ?? null,
          metadata: normalized.metadata as Prisma.InputJsonValue,
          ...(data.categoryId ? { categoryId: data.categoryId } : {}),
          ...(data.active !== undefined ? { active: data.active } : {}),
          ...(data.featured !== undefined ? { featured: data.featured } : {}),
        },
      });
      if (data.imageAssetId) await tx.productImage.create({ data: { productId: created.id, assetId: data.imageAssetId, alt: created.name, sortOrder: 0 } });
      if (normalized.variants?.length) await syncVariants(tx, created.id, created.slug, normalized.variants);
      if (normalized.options?.length) await syncOptions(tx, created.id, normalized.options);
      await tx.auditLog.create({ data: { adminUserId: auditUserId(admin!), action: "CREATE", entity: "Product", entityId: created.id, metadata: { slug: created.slug, kind: created.kind } } });
      return tx.product.findUniqueOrThrow({ where: { id: created.id }, include: adminInclude });
    });
    revalidateStorefront([product.kind]);
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
    const current = await prisma.product.findFirst({ where: { id, kind: { in: [...PRODUCT_KINDS] } }, select: { kind: true, metadata: true } });
    if (!current || !isProductKind(current.kind)) return jsonError("The requested record was not found", 404);
    const referenceError = await validateReferences(data);
    if (referenceError) return jsonError(referenceError, 400);
    const kind: ProductKind = data.kind ?? current.kind;
    const normalized = normalizeForKind(kind, data, current.metadata);
    if ("error" in normalized) return jsonError(normalized.error as string, 400);
    const kindChanged = kind !== current.kind;
    const productData: Prisma.ProductUncheckedUpdateInput = {
      ...(data.slug !== undefined ? { slug: data.slug } : {}),
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.kind !== undefined ? { kind: data.kind } : {}),
      ...(data.basePriceCents !== undefined ? { basePriceCents: data.basePriceCents } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.categoryId !== undefined ? { categoryId: data.categoryId } : {}),
      ...(data.active !== undefined ? { active: data.active } : {}),
      ...(data.featured !== undefined ? { featured: data.featured } : {}),
      ...(data.metadata !== undefined || kindChanged ? { metadata: normalized.metadata as Prisma.InputJsonValue } : {}),
    };
    const product = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({ where: { id }, data: productData });
      if (data.imageAssetId !== undefined) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        if (data.imageAssetId) await tx.productImage.create({ data: { productId: id, assetId: data.imageAssetId, alt: updated.name, sortOrder: 0 } });
      }
      // Moving a product to Cards drops its sizes/options; otherwise they are replaced only when sent.
      if (normalized.variants !== undefined) await syncVariants(tx, id, updated.slug, normalized.variants);
      if (normalized.options !== undefined) await syncOptions(tx, id, normalized.options);
      await tx.auditLog.create({ data: { adminUserId: auditUserId(admin!), action: "UPDATE", entity: "Product", entityId: id, metadata: { fields: Object.keys(data) } } });
      return tx.product.findUniqueOrThrow({ where: { id }, include: adminInclude });
    });
    revalidateStorefront([current.kind, product.kind]);
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
    const kind = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id }, select: { id: true, name: true, kind: true } });
      if (!product) throw new Prisma.PrismaClientKnownRequestError("Product not found", { code: "P2025", clientVersion: Prisma.prismaVersion.client });
      // Product images must be detached before deleting the product because the asset relation is restricted.
      // Orders and cart lines retain their history through their SetNull product relations,
      // and cart lines referencing a deleted product are rejected at checkout.
      await tx.productImage.deleteMany({ where: { productId: id } });
      await tx.product.delete({ where: { id } });
      await tx.auditLog.create({ data: { adminUserId: auditUserId(admin!), action: "DELETE", entity: "Product", entityId: id, metadata: { name: product.name, kind: product.kind } } });
      return product.kind;
    });
    revalidateStorefront([kind]);
    return NextResponse.json({ ok: true, deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
