import type { Prisma } from "@prisma/client";
import type { CartItem } from "@/lib/store";
import { prisma } from "./prisma";
import { ensureCatalog, resolveUnitPriceCents } from "./catalog";

export function publicCustomer(customer: { id: string; name: string; email: string; phone: string | null; createdAt: Date }) {
  return { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone, createdAt: customer.createdAt.toISOString() };
}

export function toCartItem(line: { id: string; quantity: number; productId?: string | null; payload: Prisma.JsonValue }): CartItem {
  const payload = (line.payload && typeof line.payload === "object" ? line.payload : {}) as Partial<CartItem>;
  return {
    id: line.id,
    quantity: line.quantity,
    productId: line.productId || null,
    card: payload.card as CartItem["card"],
    stickerQuantity: payload.stickerQuantity ?? 0,
    stickerImage: payload.stickerImage ?? null,
    envelopeText: payload.envelopeText ?? "",
    envelopeTextAdded: Boolean(payload.envelopeTextAdded),
  };
}

export async function getCustomerCart(customerId: string) {
  await ensureCatalog();
  const lines = await prisma.cartLine.findMany({ where: { customerId }, orderBy: { createdAt: "asc" } });
  return { items: lines.map(toCartItem) };
}

export async function upsertCartLine(customerId: string, item: CartItem, productId?: string | null) {
  await ensureCatalog();
  const unitPriceCents = await resolveUnitPriceCents({ templateSlug: item.card.templateId, productId, item });
  const payload = {
    card: item.card,
    stickerQuantity: item.stickerQuantity,
    stickerImage: item.stickerImage,
    envelopeText: item.envelopeText,
    envelopeTextAdded: item.envelopeTextAdded,
  } satisfies Omit<CartItem, "id" | "quantity">;
  const data = {
    customerId,
    templateSlug: item.card.templateId,
    productId: productId || null,
    quantity: item.quantity,
    unitPriceCents,
    payload: payload as Prisma.InputJsonValue,
  };
  const existing = item.id ? await prisma.cartLine.findFirst({ where: { id: item.id, customerId } }) : null;
  const line = existing
    ? await prisma.cartLine.update({ where: { id: existing.id }, data })
    : await prisma.cartLine.create({ data });
  return toCartItem(line);
}
