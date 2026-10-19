import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { handleApiError, jsonError } from "@/lib/server/http";
import { serializeOrder } from "@/lib/server/orders";
import { prisma } from "@/lib/server/prisma";
import { adminOrderStatusSchema } from "@/lib/server/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = await requireAdmin(["OWNER", "ADMIN", "EDITOR"]);
  if (error) return error;
  try {
    const orders = await prisma.order.findMany({ include: { items: true, customer: true }, orderBy: { createdAt: "desc" }, take: 200 });
    return NextResponse.json({ orders: orders.map(serializeOrder) });
  } catch (reason) {
    return handleApiError(reason);
  }
}

export async function PATCH(request: NextRequest) {
  const { error, admin } = await requireAdmin(["OWNER", "ADMIN"]);
  if (error) return error;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return jsonError("Order id is required");
  try {
    const input = adminOrderStatusSchema.parse(await request.json());
    const order = await prisma.order.update({ where: { id }, data: { status: input.status }, include: { items: true } });
    await prisma.auditLog.create({ data: { adminUserId: admin!.id.startsWith("local") ? null : admin!.id, action: "UPDATE", entity: "Order", entityId: id, metadata: { status: input.status } } });
    return NextResponse.json({ order: serializeOrder(order) });
  } catch (reason) {
    return handleApiError(reason);
  }
}

export async function DELETE(request: NextRequest) {
  const { error, admin } = await requireAdmin(["OWNER"]);
  if (error) return error;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return jsonError("Order id is required");
  try {
    await prisma.order.delete({ where: { id } });
    await prisma.auditLog.create({ data: { adminUserId: admin!.id.startsWith("local") ? null : admin!.id, action: "DELETE", entity: "Order", entityId: id } });
    return NextResponse.json({ ok: true });
  } catch (reason) {
    return handleApiError(reason);
  }
}
