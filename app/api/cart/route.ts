import { NextRequest, NextResponse } from "next/server";
import { requireCustomer } from "@/lib/server/auth";
import { getCustomerCart, upsertCartLine } from "@/lib/server/cart";
import { handleApiError, jsonError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
import { cartLineSchema, cartQuantitySchema } from "@/lib/server/validation";
import type { CartItem } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error, customer } = await requireCustomer();
  if (error) return error;
  try {
    return NextResponse.json(await getCustomerCart(customer.id));
  } catch (reason) {
    return handleApiError(reason);
  }
}

export async function POST(request: NextRequest) {
  const { error, customer } = await requireCustomer();
  if (error) return error;
  try {
    const input = cartLineSchema.parse(await request.json());
    const item: CartItem = {
      id: input.id || "",
      quantity: input.quantity,
      productId: input.productId || null,
      product: input.product ?? null,
      productPriceCents: input.productPriceCents ?? null,
      productName: input.productName ?? null,
      card: input.card as CartItem["card"],
      stickerQuantity: input.stickerQuantity,
      stickerImage: input.stickerImage,
      envelopeText: input.envelopeText,
      envelopeTextAdded: input.envelopeTextAdded,
    };
    const saved = await upsertCartLine(customer.id, item);
    return NextResponse.json({ item: saved }, { status: item.id ? 200 : 201 });
  } catch (reason) {
    return handleApiError(reason);
  }
}

export async function PATCH(request: NextRequest) {
  const { error, customer } = await requireCustomer();
  if (error) return error;
  try {
    const input = cartQuantitySchema.parse(await request.json());
    const existing = await prisma.cartLine.findFirst({ where: { id: input.id, customerId: customer.id } });
    if (!existing) return jsonError("Cart item not found", 404);
    await prisma.cartLine.update({ where: { id: existing.id }, data: { quantity: input.quantity } });
    return NextResponse.json(await getCustomerCart(customer.id));
  } catch (reason) {
    return handleApiError(reason);
  }
}

export async function DELETE(request: NextRequest) {
  const { error, customer } = await requireCustomer();
  if (error) return error;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return jsonError("Cart item id is required");
  await prisma.cartLine.deleteMany({ where: { id, customerId: customer.id } });
  return NextResponse.json(await getCustomerCart(customer.id));
}
