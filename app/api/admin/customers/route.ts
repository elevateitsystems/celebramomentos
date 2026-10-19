import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { handleApiError, jsonError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = await requireAdmin(["OWNER", "ADMIN", "EDITOR"]);
  if (error) return error;
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { orders: true } } },
      take: 500,
    });
    return NextResponse.json({
      customers: customers.map((customer) => ({
        id: customer.id,
        name: customer.name,
        email: customer.email,
        createdAt: customer.createdAt.toISOString(),
        orders: customer._count.orders,
      })),
    });
  } catch (reason) {
    return handleApiError(reason);
  }
}

export async function DELETE(request: NextRequest) {
  const { error, admin } = await requireAdmin(["OWNER"]);
  if (error) return error;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return jsonError("Customer id is required");
  try {
    await prisma.customer.delete({ where: { id } });
    await prisma.auditLog.create({ data: { adminUserId: admin!.id.startsWith("local") ? null : admin!.id, action: "DELETE", entity: "Customer", entityId: id } });
    return NextResponse.json({ ok: true });
  } catch (reason) {
    return handleApiError(reason);
  }
}
