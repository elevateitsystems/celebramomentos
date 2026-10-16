import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "./prisma";

export const ADMIN_COOKIE = "celebra_admin_session";

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error("AUTH_SECRET must be at least 32 characters");
  return new TextEncoder().encode(value);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createAdminSession(adminId: string, role: string, local = false) {
  return new SignJWT({ role, local, ...(local ? { email: process.env.ADMIN_EMAIL } : {}) })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(adminId)
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret());
}

export async function getAdminSession() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    if (payload.local === true && process.env.NODE_ENV !== "production" && payload.email === process.env.ADMIN_EMAIL) {
      return { id: "local-owner", email: process.env.ADMIN_EMAIL, name: "Local owner", role: "OWNER" as const };
    }
    const admin = await prisma.adminUser.findFirst({ where: { id: payload.sub, active: true }, select: { id: true, email: true, name: true, role: true } });
    return admin;
  } catch {
    return null;
  }
}

export async function requireAdmin(roles?: string[]) {
  const admin = await getAdminSession();
  if (!admin || (roles && !roles.includes(admin.role))) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), admin: null };
  }
  return { error: null, admin };
}

export function setAdminCookie(response: NextResponse, token: string) {
  response.cookies.set(ADMIN_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 });
}

export function clearAdminCookie(response: NextResponse) {
  response.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
}
