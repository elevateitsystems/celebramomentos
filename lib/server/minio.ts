import * as Minio from "minio";

const endpoint = process.env.MINIO_ENDPOINT || "localhost";
const port = Number(process.env.MINIO_PORT || 9000);
const useSSL = process.env.MINIO_USE_SSL === "true";

export const minio = new Minio.Client({
  endPoint: endpoint,
  port,
  useSSL,
  accessKey: process.env.MINIO_ACCESS_KEY || "",
  secretKey: process.env.MINIO_SECRET_KEY || "",
});

export const minioBucket = process.env.MINIO_BUCKET_NAME || "celebramomentos";
export const minioPublicUrl = (process.env.MINIO_PUBLIC_URL || `http://${endpoint}:${port}`).replace(/\/$/, "");

export function publicAssetUrl(objectKey: string) {
  return `${minioPublicUrl}/${minioBucket}/${objectKey}`;
}
