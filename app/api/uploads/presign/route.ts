import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { cloudinaryUploadParams, cloudinaryUploadUrl } from "@/lib/server/cloudinary";
import { uploadSchema } from "@/lib/server/validation";

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin(["OWNER", "ADMIN", "EDITOR"]);
  if (error) return error;
  try {
    const input = uploadSchema.parse(await request.json());
    const params = cloudinaryUploadParams(input.kind);
    return NextResponse.json({ provider: "cloudinary", uploadUrl: cloudinaryUploadUrl(), objectKey: `cloudinary:${params.folder}/${params.publicId}`, expiresIn: 900, uploadParams: { api_key: params.apiKey, timestamp: params.timestamp, folder: params.folder, public_id: params.publicId, signature: params.signature }, message: "Upload the file to Cloudinary, then complete the asset through /api/uploads/complete." });
  } catch (error) {
    return handleApiError(error);
  }
}
