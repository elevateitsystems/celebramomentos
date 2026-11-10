// Print files: what each shop needs and how a customer photo becomes one. Pure
// functions (no I/O) so they can be unit tested.
import { cropRect, type ImageCrop } from "@/lib/crop";
import { HARD_ENLARGEMENT, MAX_ENLARGEMENT, POSTER_DPI, SOFT_ENLARGEMENT } from "@/lib/print-quality";
import type { PodIssue } from "./types";

// How a customer photo is turned into the shop's print file:
// - fill: crop to the exact size (like the storefront preview, centred)
// - pad: fit the whole photo on a white canvas of the exact size (mug wrap)
// - aspect: crop to the product's shape only, keeping every original pixel (the shop scales it)
// - original: send the upload as it is (the shop positions it)
export type PhotoFit = "fill" | "pad" | "aspect" | "original";

export type PrintSpec =
  // crop: how the customer framed the photo in the editor (fit "fill" only).
  | { area: string; kind: "photo"; photoIndex: number; fit: PhotoFit; width: number; height: number; format: "jpg" | "png"; minDpiSize?: { widthMm: number; heightMm: number }; crop?: ImageCrop | null }
  // A strip of the customer's card pages side by side (greeting cards): the pages rendered at
  // checkout are composed in `pages` order (the product template's order, left to right) into one
  // file of exactly width × height px. Each page gets an equal slot; nothing is stretched.
  | { area: string; kind: "pages"; pages: string[]; width: number; height: number; format: "jpg" | "png"; description: string }
  // No automatic file exists (e.g. a 14-page calendar): an admin attaches it.
  // width/height: the file's required pixel size, when the shop gives one.
  | { area: string; kind: "admin"; description: string; width?: number; height?: number };

const CLOUDINARY_UPLOAD = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/;

export function isCloudinaryUrl(url: string) {
  return CLOUDINARY_UPLOAD.test(url);
}

// Builds the print file URL with a Cloudinary transformation. q_100 keeps full
// quality; nothing is applied to files that are not stored in Cloudinary.
// A "fill" spec with the customer's crop (and the photo's size) cuts exactly the framed part
// out first, then scales it to the print size.
export function printFileUrl(sourceUrl: string, spec: Extract<PrintSpec, { kind: "photo" }>, sourceSize?: { width: number; height: number } | null) {
  const match = sourceUrl.match(CLOUDINARY_UPLOAD);
  if (!match || spec.fit === "original") return sourceUrl;
  if (spec.fit === "fill" && spec.crop && sourceSize?.width && sourceSize.height) {
    const rect = cropRect(sourceSize, spec.width / spec.height, spec.crop);
    const crop = `c_crop,x_${Math.round(rect.left)},y_${Math.round(rect.top)},w_${Math.max(1, Math.round(rect.width))},h_${Math.max(1, Math.round(rect.height))}`;
    return `${match[1]}${crop}/c_scale,w_${spec.width},h_${spec.height},q_100,f_${spec.format}/${match[2]}`;
  }
  const transformation = spec.fit === "fill" ? `c_fill,g_center,w_${spec.width},h_${spec.height}`
    : spec.fit === "pad" ? `c_pad,b_white,w_${spec.width},h_${spec.height}`
    : `c_crop,g_center,ar_${spec.width}:${spec.height}`;
  return `${match[1]}${transformation},q_100,f_${spec.format}/${match[2]}`;
}

// Public id of a Cloudinary upload URL: ".../image/upload/v123/folder/name.jpg" → "folder/name".
export function cloudinaryPublicId(url: string) {
  const match = url.match(CLOUDINARY_UPLOAD);
  if (!match) return null;
  return match[2].replace(/^(?:[a-z]_[^/]*\/)*/, "").replace(/^v\d+\//, "").replace(/\.[a-z0-9]+$/i, "") || null;
}

// Left edge and width of each of `count` equal slots across `width` px. Integer edges that add up
// exactly (7086 / 4 = 1771.5 → 1772, 1771, 1772, 1771), so the file is exactly `width` wide.
export function pageSlots(width: number, count: number) {
  return Array.from({ length: count }, (_, index) => {
    const left = Math.round((index * width) / count);
    return { left, width: Math.round(((index + 1) * width) / count) - left };
  });
}

// One Cloudinary URL that draws the pages side by side at the exact print size: the first page
// scaled into slot 1 and padded (white) to the full canvas, then each other page laid over its own
// slot. c_fill keeps each page's proportions (a slot that is a fraction of a pixel narrower than
// the page loses that fraction at the edge instead of being squeezed). Null when a page is not a
// Cloudinary upload of the same account.
export function compositeFileUrl(pageUrls: string[], spec: Extract<PrintSpec, { kind: "pages" }>) {
  if (pageUrls.length !== spec.pages.length || !pageUrls.length) return null;
  const matches = pageUrls.map((url) => url.match(CLOUDINARY_UPLOAD));
  if (matches.some((match) => !match) || new Set(matches.map((match) => match![1])).size !== 1) return null;
  const ids = pageUrls.map(cloudinaryPublicId);
  if (ids.some((id) => !id)) return null;
  const slots = pageSlots(spec.width, pageUrls.length);
  const base = `c_fill,g_center,w_${slots[0].width},h_${spec.height}/c_pad,g_west,b_white,w_${spec.width},h_${spec.height}`;
  const layers = slots.slice(1).map((slot, index) => `l_${ids[index + 1]!.replace(/\//g, ":")},c_fill,g_center,w_${slot.width},h_${spec.height}/fl_layer_apply,g_north_west,x_${slot.left},y_0`);
  return `${matches[0]![1]}${[base, ...layers, `q_95,f_${spec.format}`].join("/")}/${ids[0]}.${spec.format}`;
}

// Resolution check of a customer photo against its print spec. Returns a warning
// (the order is held for an admin) when the photo would print visibly soft.
// `accepted`: the customer was shown the quality warning in the studio and chose to order anyway.
export function checkPhotoResolution(spec: Extract<PrintSpec, { kind: "photo" }>, source: { width: number; height: number } | null, { accepted = false }: { accepted?: boolean } = {}): PodIssue | null {
  if (!source || !source.width || !source.height || spec.fit === "original") return null;
  if (spec.fit === "aspect" && spec.minDpiSize) {
    // Pixels left after cropping to the product's shape, spread over its printed size.
    const ratio = spec.width / spec.height;
    const croppedWidth = Math.min(source.width, source.height * ratio);
    const dpi = croppedWidth / (spec.minDpiSize.widthMm / 25.4);
    // 150 dpi is the print shop's recommendation, so the same limits apply to how far below it the photo is:
    // up to 1.5× below (100 dpi) is fine, up to 2× (75 dpi) is sent with a note, up to 4× (37 dpi) is sent
    // once the customer accepted the warning, anything lower is held for an admin.
    const scale = POSTER_DPI / dpi;
    if (scale <= SOFT_ENLARGEMENT) return null;
    const sent = scale <= MAX_ENLARGEMENT || (accepted && scale <= HARD_ENLARGEMENT);
    const note = scale <= MAX_ENLARGEMENT ? "" : sent ? " — the customer saw the quality warning and chose to order it" : " — likely to print blurry";
    return { code: "low_resolution", severity: sent ? "info" : "warning", message: `Photo gives about ${Math.round(dpi)} dpi at ${spec.minDpiSize.widthMm} × ${spec.minDpiSize.heightMm} mm (${POSTER_DPI} dpi recommended)${note}` };
  }
  // fill crops to cover, pad fits inside: the upscale factor needed to reach the print size.
  // A zoomed-in crop uses fewer of the photo's pixels, so it is measured on the crop itself.
  const framed = spec.fit === "fill" && spec.crop ? cropRect(source, spec.width / spec.height, spec.crop) : null;
  const scale = framed ? spec.width / framed.width : spec.fit === "fill" ? Math.max(spec.width / source.width, spec.height / source.height) : Math.min(spec.width / source.width, spec.height / source.height);
  if (scale <= SOFT_ENLARGEMENT) return null;
  // Slightly soft prints go out automatically (noted for the admin), and so do softer ones the customer
  // accepted in the studio (up to HARD_ENLARGEMENT); anything else is held for an admin.
  const sent = scale <= MAX_ENLARGEMENT || (accepted && scale <= HARD_ENLARGEMENT);
  const note = scale <= MAX_ENLARGEMENT ? "" : sent ? " — the customer saw the quality warning and chose to order it" : " — likely to print blurry";
  return { code: "low_resolution", severity: sent ? "info" : "warning", message: `Photo is ${source.width} × ${source.height} px; the print file is ${spec.width} × ${spec.height} px (enlarged ${scale.toFixed(1)}×)${note}` };
}

// ISO 216 sizes in mm, for formats named only "A0"…"A4".
const ISO_A: Record<string, [number, number]> = { A0: [841, 1189], A1: [594, 841], A2: [420, 594], A3: [297, 420], A4: [210, 297] };

// Paper size in mm of a Gelato format uid such as "300x400-mm-12x16-inch", "A3" or "280x430-mm-XL".
export function gelatoFormatMm(format: string): [number, number] | null {
  const mm = format.match(/(\d{2,4})x(\d{2,4})-mm/);
  if (mm) return [Number(mm[1]), Number(mm[2])];
  const iso = format.match(/^(A[0-4])\b/i) || format.match(/\b(A[0-4])$/i);
  return iso ? ISO_A[iso[1].toUpperCase()] : null;
}

// Checks a print file's real pixel size against the shop's requirement. fill/pad and
// admin files with a known size must match exactly; "aspect" files only need the
// product's shape (the shop scales them); "original" files have no fixed size.
export function checkPrintFileSize(required: { fit?: PhotoFit; width?: number; height?: number }, actual: { width: number; height: number } | null, label = "Print file"): PodIssue | null {
  if (required.fit === "original" || !required.width || !required.height) return null;
  if (!actual || !actual.width || !actual.height) return { code: "print_file_unverified", severity: "warning", message: `${label}: its pixel size could not be checked (needs ${required.width} × ${required.height} px); open it before sending` };
  if (required.fit === "aspect") {
    const off = Math.abs(actual.width / actual.height - required.width / required.height) / (required.width / required.height);
    return off > 0.01 ? { code: "print_file_invalid", severity: "blocker", message: `${label} is ${actual.width} × ${actual.height} px, which is not the product's shape (${required.width} × ${required.height})` } : null;
  }
  return actual.width === required.width && actual.height === required.height ? null
    : { code: "print_file_invalid", severity: "blocker", message: `${label} is ${actual.width} × ${actual.height} px; the print shop needs exactly ${required.width} × ${required.height} px` };
}
