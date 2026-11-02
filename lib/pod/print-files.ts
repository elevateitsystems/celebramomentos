// Final print files: the customer's design rendered at the exact size the print shop
// needs and stored as its own file, separate from the customer's original upload.
// Server only.
import { cloudinaryObjectKey, uploadRemoteImageToCloudinary } from "@/lib/server/cloudinary";
import { prisma } from "@/lib/server/prisma";
import { printFileUrl, type PrintSpec } from "./artwork";

export type StoredFile = { url: string; width: number; height: number };
export type UploadedFile = { width: number; height: number; mimeType: string; kind: string };

// Renders one print file from the customer's photo (crop / fit with Cloudinary) and
// saves it under a fixed name per order item, unit and area, so a re-check replaces it.
export async function renderPrintFile(input: { orderId: string; itemId: string; unit: number; area: string; sourceUrl: string; spec: Extract<PrintSpec, { kind: "photo" }> }): Promise<StoredFile> {
  const name = `${input.itemId}-${input.unit + 1}-${input.area}`;
  const uploaded = await uploadRemoteImageToCloudinary({ url: printFileUrl(input.sourceUrl, input.spec), folder: `celebramomentos/print_file/${input.orderId}`, publicId: name });
  if (!uploaded.width || !uploaded.height) throw new Error("Cloudinary did not report the file's pixel size");
  const objectKey = cloudinaryObjectKey(uploaded.publicId);
  const data = {
    bucket: "cloudinary",
    url: uploaded.secureUrl,
    kind: "PRINT_FILE" as const,
    mimeType: uploaded.format === "png" ? "image/png" : "image/jpeg",
    sizeBytes: uploaded.bytes,
    originalName: `${name}.${uploaded.format || input.spec.format}`,
    metadata: { provider: "cloudinary", publicId: uploaded.publicId, version: uploaded.version, width: uploaded.width, height: uploaded.height, role: "print_file", orderItemId: input.itemId, source: input.sourceUrl },
  };
  await prisma.asset.upsert({ where: { objectKey }, create: { objectKey, ...data }, update: data });
  return { url: uploaded.secureUrl, width: uploaded.width, height: uploaded.height };
}

// Files uploaded through this site, by URL, with the pixel size Cloudinary reported on upload.
export async function uploadedFiles(urls: (string | null | undefined)[]) {
  const wanted = Array.from(new Set(urls.filter((url): url is string => Boolean(url))));
  const assets = wanted.length ? await prisma.asset.findMany({ where: { url: { in: wanted } }, select: { url: true, kind: true, mimeType: true, metadata: true } }) : [];
  return new Map(assets.map((asset) => {
    const meta = asset.metadata && typeof asset.metadata === "object" && !Array.isArray(asset.metadata) ? (asset.metadata as Record<string, unknown>) : {};
    return [asset.url!, { width: Number(meta.width) || 0, height: Number(meta.height) || 0, mimeType: asset.mimeType, kind: asset.kind } satisfies UploadedFile];
  }));
}
