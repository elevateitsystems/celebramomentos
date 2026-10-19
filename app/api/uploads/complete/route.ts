import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { handleApiError, jsonError } from "@/lib/server/http";
import { cloudinaryObjectKey, verifyCloudinaryUpload } from "@/lib/server/cloudinary";
import { prisma } from "@/lib/server/prisma";
import { uploadSchema } from "@/lib/server/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin(["OWNER", "ADMIN", "EDITOR"]);
  if (error) return error;
  try {
    const payload = await request.json() as { publicId?: string; secureUrl?: string; version?: number; signature?: string; fileName: string; mimeType: string; sizeBytes: number; kind: string };
    const input = uploadSchema.parse(payload);
    if (!payload.publicId || !payload.secureUrl || !payload.version || !payload.signature) return jsonError("Cloudinary upload details are required");
    try {
      verifyCloudinaryUpload({ publicId: payload.publicId, version: payload.version, signature: payload.signature, secureUrl: payload.secureUrl });
    } catch (reason) {
      return jsonError(reason instanceof Error ? reason.message : "Invalid Cloudinary upload", 400);
    }
    const objectKey = cloudinaryObjectKey(payload.publicId);
    const asset = await prisma.asset.upsert({ where: { objectKey }, update: { url: payload.secureUrl, sizeBytes: input.sizeBytes }, create: { objectKey, bucket: "cloudinary", url: payload.secureUrl, kind: input.kind, mimeType: input.mimeType, sizeBytes: input.sizeBytes, originalName: input.fileName, metadata: { provider: "cloudinary", publicId: payload.publicId, version: payload.version } } });
    return NextResponse.json({ asset });
  } catch (reason) { return handleApiError(reason); }
}
