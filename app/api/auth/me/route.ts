import { NextRequest, NextResponse } from "next/server";
import { hashPassword, requireCustomer } from "@/lib/server/auth";
import { publicCustomer } from "@/lib/server/cart";
import { handleApiError, jsonError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
import { customerProfileSchema } from "@/lib/server/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error, customer } = await requireCustomer();
  if (error) return NextResponse.json({ user: null });
  return NextResponse.json({ user: publicCustomer(customer) });
}

export async function PATCH(request: NextRequest) {
  const { error, customer } = await requireCustomer();
  if (error) return error;
  try {
    const input = customerProfileSchema.parse(await request.json());
    const email = input.email?.trim().toLowerCase();
    if (email && email !== customer.email) {
      const taken = await prisma.customer.findUnique({ where: { email }, select: { id: true } });
      if (taken) return jsonError("Ya existe una cuenta con ese email.", 409);
    }
    const updated = await prisma.customer.update({
      where: { id: customer.id },
      data: {
        ...(input.name ? { name: input.name.trim() } : {}),
        ...(email ? { email } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.password ? { passwordHash: await hashPassword(input.password) } : {}),
      },
      select: { id: true, name: true, email: true, phone: true, createdAt: true },
    });
    return NextResponse.json({ user: publicCustomer(updated) });
  } catch (reason) {
    return handleApiError(reason);
  }
}
