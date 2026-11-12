// Final print files: the customer's design rendered at the exact size the print shop
// needs and stored as its own file, separate from the customer's original upload.
// Server only.
import { cloudinaryObjectKey, uploadFileToCloudinary, uploadRemoteImageToCloudinary } from "@/lib/server/cloudinary";
import { prisma } from "@/lib/server/prisma";
import { compositeFileUrl, isCloudinaryUrl, printFileUrl, type PrintSpec } from "./artwork";
import { boxPixels, buildCalendarPdf, calendarLayout, CALENDAR_PAGES, type Box, type CalendarLanguage } from "./calendar-pdf";

export type StoredFile = { url: string; width: number; height: number };
export type UploadedFile = { width: number; height: number; mimeType: string; kind: string };

// Renders one print file from the customer's photo (crop / fit with Cloudinary) and
// saves it under a fixed name per order item, unit and area, so a re-check replaces it.
export async function renderPrintFile(input: { orderId: string; itemId: string; unit: number; area: string; sourceUrl: string; sourceSize?: { width: number; height: number } | null; spec: Extract<PrintSpec, { kind: "photo" }> }): Promise<StoredFile> {
  const name = `${input.itemId}-${input.unit + 1}-${input.area}`;
  const uploaded = await uploadRemoteImageToCloudinary({ url: printFileUrl(input.sourceUrl, input.spec, input.sourceSize), folder: `celebramomentos/print_file/${input.orderId}`, publicId: name });
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

// The 4 card pages composed side by side at the exact print size (see compositeFileUrl), saved as
// this item's print file. The size Cloudinary reports is returned so the caller can verify it.
export async function renderCompositeFile(input: { orderId: string; itemId: string; unit: number; pageUrls: string[]; spec: Extract<PrintSpec, { kind: "pages" }> }): Promise<StoredFile> {
  const url = compositeFileUrl(input.pageUrls, input.spec);
  if (!url) throw new Error("The card pages are not uploads of this shop's image storage");
  const name = `${input.itemId}-${input.unit + 1}-${input.spec.area}`;
  const uploaded = await uploadRemoteImageToCloudinary({ url, folder: `celebramomentos/print_file/${input.orderId}`, publicId: name });
  if (!uploaded.width || !uploaded.height) throw new Error("Cloudinary did not report the file's pixel size");
  const objectKey = cloudinaryObjectKey(uploaded.publicId);
  const data = {
    bucket: "cloudinary",
    url: uploaded.secureUrl,
    kind: "PRINT_FILE" as const,
    mimeType: uploaded.format === "png" ? "image/png" : "image/jpeg",
    sizeBytes: uploaded.bytes,
    originalName: `${name}.${uploaded.format || input.spec.format}`,
    metadata: { provider: "cloudinary", publicId: uploaded.publicId, version: uploaded.version, width: uploaded.width, height: uploaded.height, role: "print_file", orderItemId: input.itemId, pages: input.pageUrls, order: input.spec.pages },
  };
  await prisma.asset.upsert({ where: { objectKey }, create: { objectKey, ...data }, update: data });
  return { url: uploaded.secureUrl, width: uploaded.width, height: uploaded.height };
}

// Whether a print file can be downloaded by the print shop (no credentials) and is really a PDF.
// Cloudinary blocks PDF delivery unless "Allow delivery of PDF and ZIP files" is on (answering 401).
export async function pdfDeliverable(url: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    const response = await fetch(url, { headers: { Range: "bytes=0-7" }, cache: "no-store", signal: AbortSignal.timeout(20_000) });
    const head = new TextDecoder().decode(new Uint8Array(await response.arrayBuffer()).slice(0, 5));
    if ((response.status === 200 || response.status === 206) && head === "%PDF-") return { ok: true };
    if (response.status === 401 && /res\.cloudinary\.com/.test(url)) return { ok: false, reason: "Cloudinary blocks downloading PDF files. In Cloudinary → Settings → Security, turn on “Allow delivery of PDF and ZIP files”, then press “Check again”" };
    return { ok: false, reason: `the PDF link answers HTTP ${response.status}${head === "%PDF-" ? "" : " and is not a PDF"}` };
  } catch (reason) {
    return { ok: false, reason: `the PDF link could not be read (${reason instanceof Error ? reason.message : "error"})` };
  }
}

// A customer photo cut to a calendar photo box at 300 dpi (Cloudinary does the cropping, centred like the
// studio preview), as JPEG bytes.
async function boxPhoto(url: string, box: Box) {
  const { width, height } = boxPixels(box);
  const source = url.match(/^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/);
  if (!source) throw new Error("A calendar photo is not an upload from this shop");
  const response = await fetch(`${source[1]}c_fill,g_center,w_${width},h_${height},q_90,f_jpg/${source[2]}`, { cache: "no-store", signal: AbortSignal.timeout(45_000) });
  if (!response.ok) throw new Error(`A calendar photo could not be read (HTTP ${response.status})`);
  return new Uint8Array(await response.arrayBuffer());
}

// The 14-page calendar PDF (cover, 12 months, back) made from the customer's month photos, saved as this
// item's print file. Photos that are not uploads from this site are left out (their month gets a plain page).
export async function renderCalendarFile(input: { orderId: string; itemId: string; unit: number; area: string; photos: (string | null)[]; year: number; language: CalendarLanguage; pageMm: { width: number; height: number } }) {
  const layout = calendarLayout(input.pageMm);
  const usable = input.photos.map((url) => (url && isCloudinaryUrl(url) ? url : null));
  const [monthPhotos, coverPhoto] = await Promise.all([
    Promise.all(usable.map((url) => (url ? boxPhoto(url, layout.month) : Promise.resolve(null)))),
    usable.find(Boolean) ? boxPhoto(usable.find(Boolean)!, layout.cover) : Promise.resolve(null),
  ]);
  const bytes = await buildCalendarPdf({ page: input.pageMm, year: input.year, language: input.language, monthPhotos, coverPhoto });
  const name = `${input.itemId}-${input.unit + 1}-${input.area}-calendar.pdf`;
  const uploaded = await uploadFileToCloudinary({ bytes, folder: `celebramomentos/print_file/${input.orderId}`, publicId: name, contentType: "application/pdf" });
  const objectKey = cloudinaryObjectKey(uploaded.publicId);
  const data = {
    bucket: "cloudinary",
    url: uploaded.secureUrl,
    kind: "PRINT_FILE" as const,
    mimeType: "application/pdf",
    sizeBytes: uploaded.bytes || bytes.byteLength,
    originalName: name,
    metadata: { provider: "cloudinary", resourceType: "raw", publicId: uploaded.publicId, version: uploaded.version, pages: CALENDAR_PAGES, pageMm: input.pageMm, year: input.year, language: input.language, role: "print_file", orderItemId: input.itemId, photos: usable.filter(Boolean).length },
  };
  await prisma.asset.upsert({ where: { objectKey }, create: { objectKey, ...data }, update: data });
  return { url: uploaded.secureUrl, pages: CALENDAR_PAGES, bytes: data.sizeBytes };
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
