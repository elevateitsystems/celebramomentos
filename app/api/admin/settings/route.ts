import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { handleApiError, jsonError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
import { settingSchema } from "@/lib/server/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = await requireAdmin(["OWNER", "ADMIN", "EDITOR"]);
  if (error) return error;
  try { return NextResponse.json({ settings: await prisma.siteSetting.findMany({ where: { isSecret: false }, orderBy: { key: "asc" } }) }); }
  catch (reason) { return handleApiError(reason); }
}

export async function PUT(request: NextRequest) {
  const { error, admin } = await requireAdmin(["OWNER", "ADMIN"]);
  if (error) return error;
  try {
    const input = settingSchema.parse(await request.json());
    if (input.isSecret && !admin!.role.includes("OWNER")) return jsonError("Only the owner can change secret settings", 403);
    const setting = await prisma.siteSetting.upsert({ where: { key: input.key }, update: { value: input.value, ...(input.isSecret !== undefined ? { isSecret: input.isSecret } : {}) }, create: input });
    return NextResponse.json({ setting: { ...setting, value: setting.isSecret ? undefined : setting.value } });
  } catch (reason) { return handleApiError(reason); }
}
