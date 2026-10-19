import { createHash, randomUUID } from "crypto";

export type CloudinaryUploadInput = {
  body: Buffer;
  fileName: string;
  mimeType: string;
  kind: string;
};

export type CloudinaryUploadResult = {
  publicId: string;
  secureUrl: string;
  bytes: number;
  version?: number;
  assetId?: string;
  width?: number;
  height?: number;
};

function config() {
  const urlValue = process.env.CLOUDINARY_URL;
  let url: URL | null = null;
  if (urlValue) {
    try { url = new URL(urlValue); } catch { url = null; }
  }
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || url?.hostname;
  const apiKey = process.env.CLOUDINARY_API_KEY || (url?.username && !url.username.includes("<") ? decodeURIComponent(url.username) : undefined);
  const apiSecret = process.env.CLOUDINARY_API_SECRET || (url?.password && !url.password.includes("<") ? decodeURIComponent(url.password) : undefined);
  const missing = [
    !cloudName ? "CLOUDINARY_CLOUD_NAME" : null,
    !apiKey ? "CLOUDINARY_API_KEY" : null,
    !apiSecret ? "CLOUDINARY_API_SECRET" : null,
  ].filter((value): value is string => Boolean(value));
  if (missing.length) throw new Error(`Cloudinary storage is not configured. Missing: ${missing.join(", ")}.`);
  return { cloudName: cloudName!, apiKey: apiKey!, apiSecret: apiSecret! };
}

export function cloudinaryUploadUrl() {
  return `https://api.cloudinary.com/v1_1/${config().cloudName}/image/upload`;
}

export function cloudinaryAssetUrl(publicId: string, version?: number) {
  const versionPart = version ? `/v${version}` : "";
  return `https://res.cloudinary.com/${config().cloudName}/image/upload${versionPart}/${publicId}`;
}

export function cloudinaryObjectKey(publicId: string) {
  return `cloudinary:${publicId}`;
}

export function signCloudinaryParams(params: Record<string, string | number>) {
  const { apiSecret } = config();
  const serialized = Object.entries(params)
    .filter(([, value]) => value !== "" && value !== undefined && value !== null)
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return createHash("sha1").update(`${serialized}${apiSecret}`).digest("hex");
}

export function cloudinaryUploadParams(kind: string) {
  const { cloudName, apiKey } = config();
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `celebramomentos/${kind.toLowerCase()}/${new Date().toISOString().slice(0, 10)}`;
  const publicId = randomUUID();
  const signed = { folder, public_id: publicId, timestamp };
  return { cloudName, apiKey, timestamp, folder, publicId, signature: signCloudinaryParams(signed) };
}

export async function uploadImageToCloudinary(input: CloudinaryUploadInput): Promise<CloudinaryUploadResult> {
  const { apiKey } = config();
  const params = cloudinaryUploadParams(input.kind);
  const form = new FormData();
  const binary = new Uint8Array(input.body.length);
  binary.set(input.body);
  form.append("file", new Blob([binary.buffer], { type: input.mimeType }), input.fileName);
  form.append("api_key", apiKey);
  form.append("timestamp", String(params.timestamp));
  form.append("folder", params.folder);
  form.append("public_id", params.publicId);
  form.append("signature", params.signature);

  const response = await fetch(cloudinaryUploadUrl(), { method: "POST", body: form });
  const body = await response.json().catch(() => ({})) as { public_id?: string; secure_url?: string; bytes?: number; version?: number; asset_id?: string; width?: number; height?: number; error?: { message?: string } };
  if (!response.ok || !body.public_id || !body.secure_url) throw new Error(body.error?.message || "Cloudinary image upload failed");
  return { publicId: body.public_id, secureUrl: body.secure_url, bytes: body.bytes || input.body.length, version: body.version, assetId: body.asset_id, width: body.width, height: body.height };
}

export function verifyCloudinaryUpload(input: { publicId: string; version: number; signature: string; secureUrl: string }) {
  const { cloudName } = config();
  const expected = signCloudinaryParams({ public_id: input.publicId, version: input.version });
  if (expected !== input.signature) throw new Error("Cloudinary upload signature is invalid");
  const allowedPrefix = `https://res.cloudinary.com/${cloudName}/image/upload/`;
  if (!input.secureUrl.startsWith(allowedPrefix)) throw new Error("Cloudinary asset URL is invalid");
}

export function cloudinaryConfigStatus() {
  try { config(); return { configured: true }; } catch (error) { return { configured: false, error: error instanceof Error ? error.message : "Cloudinary is not configured" }; }
}
