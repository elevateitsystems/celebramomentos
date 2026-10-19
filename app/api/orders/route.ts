import { NextResponse } from "next/server";
import { requireCustomer } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { serializeOrder } from "@/lib/server/orders";
import { prisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error, customer } = await requireCustomer();
  if (error) return error;
  try {
    const orders = await prisma.order.findMany({
      where: { customerId: customer.id },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ orders: orders.map(serializeOrder) });
  } catch (reason) {
    return handleApiError(reason);
  }
}
