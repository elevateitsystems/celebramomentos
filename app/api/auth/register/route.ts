import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { createCustomerSession, hashPassword, setCustomerCookie } from "@/lib/server/auth";
import { publicCustomer } from "@/lib/server/cart";
import { handleApiError, jsonError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
import { customerRegisterSchema } from "@/lib/server/validation";

export async function POST(request: NextRequest) {
  try {
    const input = customerRegisterSchema.parse(await request.json());
    const email = input.email.trim().toLowerCase();
    const customer = await prisma.customer.create({
      data: { name: input.name.trim(), email, passwordHash: await hashPassword(input.password) },
      select: { id: true, name: true, email: true, phone: true, createdAt: true },
    });
    const response = NextResponse.json({ user: publicCustomer(customer) }, { status: 201 });
    setCustomerCookie(response, await createCustomerSession(customer.id));
    return response;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError("Ya existe una cuenta con ese email.", 409);
    }
    return handleApiError(error);
  }
}
