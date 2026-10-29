import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/server/auth";
import { handleApiError, jsonError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
import { getHomepageImages } from "@/lib/server/settings";
import { HOMEPAGE_IMAGES_KEY, HOMEPAGE_IMAGE_IDS, isHomepageImageId, type HomepageImages } from "@/lib/homepage-images";

export const dynamic = "force-dynamic";

const setSchema = z.object({ slot: z.enum(HOMEPAGE_IMAGE_IDS), assetId: z.string().cuid() });

async function writeImages(images: HomepageImages) {
  const value = JSON.stringify(images);
  await prisma.siteSetting.upsert({ where: { key: HOMEPAGE_IMAGES_KEY }, update: { value }, create: { key: HOMEPAGE_IMAGES_KEY, value } });
  // The home page is rendered on the server with these images; drop its cached copy.
  revalidatePath("/");
}

const auditUserId = (admin: { id: string }) => (admin.id.startsWith("local-") ? null : admin.id);

// The custom image of every home page slot that has one (see lib/homepage-images.ts).
export async function GET() {
  const { error } = await requireAdmin(["OWNER", "ADMIN", "EDITOR"]);
  if (error) return error;
  try {
    return NextResponse.json({ images: await getHomepageImages() });
  } catch (reason) {
    return handleApiError(reason);
  }
}

// Add or change the image of one slot. The image must be a banner uploaded
// through /api/uploads, so the home page can only show images stored in Cloudinary.
export async function PUT(request: NextRequest) {
  const { error, admin } = await requireAdmin(["OWNER", "ADMIN"]);
  if (error) return error;
  try {
    const input = setSchema.parse(await request.json());
    const asset = await prisma.asset.findUnique({ where: { id: input.assetId }, select: { kind: true, url: true } });
    if (!asset || asset.kind !== "BANNER" || !asset.url?.startsWith("https://")) return jsonError("The selected image is invalid", 400);
    const images = { ...(await getHomepageImages()), [input.slot]: asset.url };
    await writeImages(images);
    await prisma.auditLog.create({ data: { adminUserId: auditUserId(admin!), action: "UPDATE", entity: "HomepageImage", entityId: input.slot, metadata: { url: asset.url } } });
    return NextResponse.json({ images });
  } catch (reason) {
    return handleApiError(reason);
  }
}

// Remove the custom image of one slot; it goes back to its built-in image.
export async function DELETE(request: NextRequest) {
  const { error, admin } = await requireAdmin(["OWNER", "ADMIN"]);
  if (error) return error;
  const slot = request.nextUrl.searchParams.get("slot");
  if (!isHomepageImageId(slot)) return jsonError("Invalid image slot", 400);
  try {
    const { [slot]: removed, ...images } = await getHomepageImages();
    if (!removed) return jsonError("This image has no custom version", 404);
    await writeImages(images);
    await prisma.auditLog.create({ data: { adminUserId: auditUserId(admin!), action: "DELETE", entity: "HomepageImage", entityId: slot, metadata: { url: removed } } });
    return NextResponse.json({ images });
  } catch (reason) {
    return handleApiError(reason);
  }
}
