import { NextRequest, NextResponse } from "next/server";
import { createCustomerSession, setCustomerCookie, verifyPassword } from "@/lib/server/auth";
import { publicCustomer } from "@/lib/server/cart";
import { handleApiError, jsonError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
import { customerLoginSchema } from "@/lib/server/validation";

export async function POST(request: NextRequest) {
  try {
    const input = customerLoginSchema.parse(await request.json());
    const customer = await prisma.customer.findUnique({ where: { email: input.email.trim().toLowerCase() } });
    if (!customer?.passwordHash || !(await verifyPassword(input.password, customer.passwordHash))) {
      return jsonError("Email o contraseña incorrectos.", 401);
    }
    const response = NextResponse.json({ user: publicCustomer(customer) });
    setCustomerCookie(response, await createCustomerSession(customer.id));
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
