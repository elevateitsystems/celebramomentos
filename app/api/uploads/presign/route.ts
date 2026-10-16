import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { minio, minioBucket, publicAssetUrl } from "@/lib/server/minio";
import { prisma } from "@/lib/server/prisma";
import { uploadSchema } from "@/lib/server/validation";

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin(["OWNER", "ADMIN", "EDITOR"]);
  if (error) return error;
  try {
    const input = uploadSchema.parse(await request.json());
    const extension = input.mimeType.split("/")[1];
    const objectKey = `uploads/${input.kind.toLowerCase()}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${extension}`;
    const exists = await minio.bucketExists(minioBucket);
    if (!exists) await minio.makeBucket(minioBucket);
    const uploadUrl = await minio.presignedPutObject(minioBucket, objectKey, 15 * 60);
    const asset = await prisma.asset.create({ data: { objectKey, bucket: minioBucket, url: publicAssetUrl(objectKey), kind: input.kind, mimeType: input.mimeType, sizeBytes: input.sizeBytes, originalName: input.fileName } });
    return NextResponse.json({ asset, uploadUrl, expiresIn: 900 });
  } catch (error) {
    return handleApiError(error);
  }
}
