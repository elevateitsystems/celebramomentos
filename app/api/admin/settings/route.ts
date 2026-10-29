import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { handleApiError, jsonError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
import { HOMEPAGE_IMAGES_KEY } from "@/lib/homepage-images";
import { CARD_SIZE_PRICES_KEY, isSocialLinkKey, parseCardSizePrices, validSocialUrl } from "@/lib/server/settings";
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
    // Managed only through /api/admin/homepage-images, which validates the uploaded image.
    if (input.key === HOMEPAGE_IMAGES_KEY) return jsonError("Homepage images are managed in Homepage images", 400);
    if (input.isSecret && !admin!.role.includes("OWNER")) return jsonError("Only the owner can change secret settings", 403);
    if (isSocialLinkKey(input.key)) {
      input.value = input.value.trim();
      if (input.value && !validSocialUrl(input.value)) return jsonError("Social links must be full https:// URLs", 400);
      input.isSecret = false;
    }
    if (input.key === CARD_SIZE_PRICES_KEY) {
      if (!parseCardSizePrices(input.value)) return jsonError("Card size prices must be whole, non-negative cent values for known sizes", 400);
      input.isSecret = false;
    }
    const setting = await prisma.siteSetting.upsert({ where: { key: input.key }, update: { value: input.value, ...(input.isSecret !== undefined ? { isSecret: input.isSecret } : {}) }, create: input });
    return NextResponse.json({ setting: { ...setting, value: setting.isSecret ? undefined : setting.value } });
  } catch (reason) { return handleApiError(reason); }
}
