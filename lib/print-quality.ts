// How much a customer photo is enlarged to fill its print file, and the limits the shop applies.
// Shared by the product studios (browser) and the print-file checks (server), so the customer and the
// admin see the same rule.
//
// - up to 1.5×: fine;
// - 1.5× to 2×: prints slightly soft — the customer is told, the order is sent automatically;
// - 2× to 4×: prints visibly softer — the customer is warned and can only order it after confirming
//   they accept it; the order is then sent automatically (a note is left for the admin);
// - over 4×: far too small (it would print pixelated) — it cannot be ordered, the customer is asked
//   for a larger photo. An order that still has one (placed before these rules) is held for an admin.
export const SOFT_ENLARGEMENT = 1.5;
export const MAX_ENLARGEMENT = 2;
export const HARD_ENLARGEMENT = 4;
// Posters are judged in dpi at their printed size: this is the print shop's recommended resolution.
export const POSTER_DPI = 150;

export type PhotoQuality = "good" | "soft" | "low" | "too_small";

export function photoQuality(enlargement: number): PhotoQuality {
  if (!(enlargement > SOFT_ENLARGEMENT)) return "good";
  if (enlargement <= MAX_ENLARGEMENT) return "soft";
  return enlargement <= HARD_ENLARGEMENT ? "low" : "too_small";
}

// How much the photo is enlarged when the print is cut from it, as the server makes the print file: the
// photo is never rotated, so a landscape photo on a portrait print only uses its middle strip. `zoom` (the
// customer's crop zoom) uses even fewer of the photo's pixels.
export function photoEnlargement(photo: { width: number; height: number }, print: { width: number; height: number }, zoom = 1) {
  if (!photo.width || !photo.height || !print.width || !print.height) return 0;
  return Math.max(print.width / photo.width, print.height / photo.height) * Math.max(1, zoom);
}

// Smallest photo (same orientation as the print) that prints sharp, i.e. within MAX_ENLARGEMENT.
export function minimumPhotoSize(print: { width: number; height: number }) {
  return { width: Math.ceil(print.width / MAX_ENLARGEMENT), height: Math.ceil(print.height / MAX_ENLARGEMENT) };
}
