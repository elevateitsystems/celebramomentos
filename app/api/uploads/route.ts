import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getCustomerSession } from "@/lib/server/auth";
import { handleApiError, jsonError } from "@/lib/server/http";
import { cloudinaryObjectKey, uploadImageToCloudinary } from "@/lib/server/cloudinary";
import { prisma } from "@/lib/server/prisma";
import { uploadSchema } from "@/lib/server/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const kind = String(form.get("kind") || "CUSTOMER_UPLOAD");
    if (!(file instanceof File)) return jsonError("An image file is required");

    const input = uploadSchema.parse({
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      kind,
    });

    const admin = await requireAdmin(["OWNER", "ADMIN", "EDITOR"]);
    const customer = await getCustomerSession();
    if ((input.kind === "PRODUCT_IMAGE" || input.kind === "TEMPLATE_IMAGE" || input.kind === "BANNER") && admin.error) return admin.error;
    if (input.kind === "CUSTOMER_UPLOAD" && !customer && admin.error) return jsonError("Unauthorized", 401);

    const body = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadImageToCloudinary({ body, fileName: input.fileName, mimeType: input.mimeType, kind: input.kind });
    const asset = await prisma.asset.create({ data: { objectKey: cloudinaryObjectKey(uploaded.publicId), bucket: "cloudinary", url: uploaded.secureUrl, kind: input.kind, mimeType: input.mimeType, sizeBytes: uploaded.bytes, originalName: input.fileName, metadata: { provider: "cloudinary", publicId: uploaded.publicId, version: uploaded.version, assetId: uploaded.assetId, width: uploaded.width, height: uploaded.height } } });
    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
