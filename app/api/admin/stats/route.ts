import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = await requireAdmin(["OWNER", "ADMIN", "EDITOR"]);
  if (error) return error;
  try {
    const [orders, customers, products, revenue] = await Promise.all([
      prisma.order.count(),
      prisma.customer.count(),
      prisma.product.count({ where: { active: true } }),
      prisma.order.aggregate({ _sum: { totalCents: true }, where: { status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] } } }),
    ]);
    const recent = await prisma.order.findMany({ include: { items: true }, orderBy: { createdAt: "desc" }, take: 5 });
    return NextResponse.json({
      orders,
      customers,
      products,
      revenueCents: revenue._sum.totalCents || 0,
      recent: recent.map((order) => ({ id: order.number, dbId: order.id, email: order.email, amount: order.totalCents / 100, status: order.status })),
    });
  } catch (reason) {
    return handleApiError(reason);
  }
}
