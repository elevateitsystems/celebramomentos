// How a customer's photo is framed inside a print area. Shared by the storefront editor
// (preview) and the server (print file), so what the customer sees is what is printed.
//
// zoom 1 = the largest crop of the print area's shape that fits in the photo ("cover");
// higher zoom = a smaller crop. x / y say where that crop sits in the room left over:
// 0 = left / top edge, 0.5 = centred, 1 = right / bottom edge.
export type ImageCrop = { zoom: number; x: number; y: number };
export const DEFAULT_CROP: ImageCrop = { zoom: 1, x: 0.5, y: 0.5 };
export const CROP_LIMITS = { minZoom: 1, maxZoom: 4 } as const;

const unit = (value: number) => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0.5);

export function normalizeCrop(crop: Partial<ImageCrop> | null | undefined): ImageCrop {
  const zoom = Number(crop?.zoom);
  return { zoom: Number.isFinite(zoom) ? Math.min(CROP_LIMITS.maxZoom, Math.max(CROP_LIMITS.minZoom, zoom)) : 1, x: unit(Number(crop?.x ?? 0.5)), y: unit(Number(crop?.y ?? 0.5)) };
}

// The part of the photo (in its own pixels) that fills an area of shape `aspect` (width / height).
export function cropRect(source: { width: number; height: number }, aspect: number, crop: Partial<ImageCrop> | null | undefined) {
  const { zoom, x, y } = normalizeCrop(crop);
  let width = source.width;
  let height = width / aspect;
  if (height > source.height) { height = source.height; width = height * aspect; }
  width /= zoom;
  height /= zoom;
  return { left: (source.width - width) * x, top: (source.height - height) * y, width, height };
}

// Print size in pixels for a print area in millimetres, at 300 dpi.
export const PRINT_DPI = 300;
export const mmToPx = (mm: number) => Math.round((mm / 25.4) * PRINT_DPI);
