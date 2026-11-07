// Print files: what each shop needs and how a customer photo becomes one. Pure
// functions (no I/O) so they can be unit tested.
import { cropRect, type ImageCrop } from "@/lib/crop";
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
  // No automatic file exists (e.g. a greeting card layout or a 14-page calendar): an admin
  // attaches it. width/height: the file's required pixel size, when the shop gives one.
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

// Resolution check of a customer photo against its print spec. Returns a warning
// (the order is held for an admin) when the photo would print visibly soft.
export function checkPhotoResolution(spec: Extract<PrintSpec, { kind: "photo" }>, source: { width: number; height: number } | null): PodIssue | null {
  if (!source || !source.width || !source.height || spec.fit === "original") return null;
  if (spec.fit === "aspect" && spec.minDpiSize) {
    // Pixels left after cropping to the product's shape, spread over its printed size.
    const ratio = spec.width / spec.height;
    const croppedWidth = Math.min(source.width, source.height * ratio);
    const dpi = croppedWidth / (spec.minDpiSize.widthMm / 25.4);
    return dpi < 150 ? { code: "low_resolution", severity: "warning", message: `Photo gives about ${Math.round(dpi)} dpi at ${spec.minDpiSize.widthMm} × ${spec.minDpiSize.heightMm} mm (150 dpi minimum recommended)` } : null;
  }
  // fill crops to cover, pad fits inside: the upscale factor needed to reach the print size.
  // A zoomed-in crop uses fewer of the photo's pixels, so it is measured on the crop itself.
  const framed = spec.fit === "fill" && spec.crop ? cropRect(source, spec.width / spec.height, spec.crop) : null;
  const scale = framed ? spec.width / framed.width : spec.fit === "fill" ? Math.max(spec.width / source.width, spec.height / source.height) : Math.min(spec.width / source.width, spec.height / source.height);
  return scale > 1.5 ? { code: "low_resolution", severity: "warning", message: `Photo is ${source.width} × ${source.height} px; the print file is ${spec.width} × ${spec.height} px (enlarged ${scale.toFixed(1)}×)` } : null;
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
