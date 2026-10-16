import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

const COOKIE = "celebra_admin_session";

async function validSession(token: string | undefined) {
  const secret = process.env.AUTH_SECRET;
  if (!token || !secret || secret.length < 32) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const isApi = request.nextUrl.pathname.startsWith("/api/admin");
  const isLogin = request.nextUrl.pathname === "/admin/login" || request.nextUrl.pathname === "/api/admin/login";
  if (isLogin) return NextResponse.next();
  if (await validSession(request.cookies.get(COOKIE)?.value)) return NextResponse.next();
  if (isApi) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const login = new URL("/admin/login", request.url);
  login.searchParams.set("returnTo", request.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
