import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

const ADMIN_COOKIE = "celebra_admin_session";
const CUSTOMER_COOKIE = "celebra_customer_session";

async function validToken(token: string | undefined, type?: "customer") {
  const secret = process.env.AUTH_SECRET;
  if (!token || !secret || secret.length < 32) return false;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    if (!payload.sub) return false;
    if (type === "customer") return payload.typ === "customer";
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminApi = pathname.startsWith("/api/admin");
  const isAdminPage = pathname.startsWith("/admin");
  const isAdminLogin = pathname === "/admin/login" || pathname === "/api/admin/login";
  if (isAdminLogin) return NextResponse.next();
  if (isAdminApi || isAdminPage) {
    if (await validToken(request.cookies.get(ADMIN_COOKIE)?.value)) return NextResponse.next();
    if (isAdminApi) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const login = new URL("/admin/login", request.url);
    login.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(login);
  }

  const needsCustomer = pathname.startsWith("/api/cart") || pathname.startsWith("/api/orders") || pathname === "/checkout" || pathname.startsWith("/checkout/");
  if (needsCustomer && pathname.startsWith("/checkout/success")) return NextResponse.next();
  if (needsCustomer && !(await validToken(request.cookies.get(CUSTOMER_COOKIE)?.value, "customer"))) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const login = new URL("/account", request.url);
    // Keep the query (e.g. PayPal's ?token=) so the customer lands back on the same step after signing in.
    login.searchParams.set("returnTo", pathname + request.nextUrl.search);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*", "/checkout", "/checkout/:path*", "/api/cart", "/api/cart/:path*", "/api/orders", "/api/orders/:path*"] };
