import { NextResponse } from "next/server";
import { clearCustomerCookie } from "@/lib/server/auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearCustomerCookie(response);
  return response;
}
