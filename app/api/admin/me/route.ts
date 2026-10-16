import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/server/auth";

export async function GET() {
  const admin = await getAdminSession();
  return admin ? NextResponse.json({ admin }) : NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
