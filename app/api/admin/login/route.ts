import { NextRequest, NextResponse } from "next/server";
import { createAdminSession, hashPassword, setAdminCookie, verifyPassword } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { adminLoginSchema } from "@/lib/server/validation";
import { handleApiError, jsonError } from "@/lib/server/http";

export async function POST(request: NextRequest) {
  try {
    const input = adminLoginSchema.parse(await request.json());
    const isConfiguredOwner = input.email.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase() && input.password === process.env.ADMIN_PASSWORD;
    try {
      let admin = await prisma.adminUser.findUnique({ where: { email: input.email.toLowerCase() } });
      if (isConfiguredOwner && !admin) {
        admin = await prisma.adminUser.create({ data: { email: input.email.toLowerCase(), name: "Owner", role: "OWNER", passwordHash: await hashPassword(input.password) } });
      } else if (isConfiguredOwner && admin && (!admin.active || !(await verifyPassword(input.password, admin.passwordHash)))) {
        admin = await prisma.adminUser.update({ where: { id: admin.id }, data: { passwordHash: await hashPassword(input.password), active: true, role: "OWNER" } });
      }
      if (!admin || !admin.active || !(await verifyPassword(input.password, admin.passwordHash))) return jsonError("Invalid credentials", 401);
      const response = NextResponse.json({ admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role } });
      setAdminCookie(response, await createAdminSession(admin.id, admin.role));
      return response;
    } catch (error) {
      if (process.env.NODE_ENV !== "production" && isConfiguredOwner) {
        const response = NextResponse.json({ admin: { id: "local-owner", email: input.email.toLowerCase(), name: "Local owner", role: "OWNER" }, warning: "Using local admin session because the database is unavailable." });
        setAdminCookie(response, await createAdminSession("local-owner", "OWNER", true));
        return response;
      }
      throw error;
    }
  } catch (error) {
    const response = handleApiError(error);
    return response;
  }
}
