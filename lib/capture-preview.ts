"use client";

// Takes a picture of what the product studio shows (the mug, the phone case, the magnets…) so the
// cart, checkout and order pages show the customer's finished design and not just an uploaded photo.
// Best effort: when the picture cannot be made (blocked image, old browser) the item is still
// added and shows its first photo as before.
const TARGET_SIDE = 720;

// Crops the empty margin around the design: the studios draw the mug, the case… in the middle of a
// larger, mostly empty panel. "Empty" means close to the colour of the top-left corner.
function trimMargin(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context || canvas.width < 40 || canvas.height < 40) return canvas;
  const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height);
  const [r0, g0, b0] = [data[0], data[1], data[2]];
  const differs = (index: number) => Math.abs(data[index] - r0) + Math.abs(data[index + 1] - g0) + Math.abs(data[index + 2] - b0) > 36;
  let left = width, right = -1, top = height, bottom = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!differs((y * width + x) * 4)) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }
  if (right < left || bottom < top) return canvas;
  const pad = Math.round(Math.max(width, height) * 0.03);
  const x = Math.max(0, left - pad), y = Math.max(0, top - pad);
  const w = Math.min(width, right + pad + 1) - x, h = Math.min(height, bottom + pad + 1) - y;
  // Do not crop to a sliver (a mostly empty panel): keep the whole picture then.
  if (w < width * 0.2 || h < height * 0.2) return canvas;
  const cropped = document.createElement("canvas");
  cropped.width = w; cropped.height = h;
  const target = cropped.getContext("2d");
  if (!target) return canvas;
  target.fillStyle = "#ffffff";
  target.fillRect(0, 0, w, h);
  target.drawImage(canvas, x, y, w, h, 0, 0, w, h);
  return cropped;
}

export async function captureStudioPreview(): Promise<string | null> {
  if (typeof document === "undefined") return null;
  const node = document.querySelector<HTMLElement>("[data-studio-preview]");
  if (!node || !node.offsetWidth || !node.offsetHeight) return null;
  try {
    const { toCanvas } = await import("html-to-image");
    const pixelRatio = Math.min(2, TARGET_SIDE / Math.max(node.offsetWidth, node.offsetHeight));
    const options = { pixelRatio, backgroundColor: "#ffffff", cacheBust: false };
    // The first pass loads the images into the SVG (Safari paints them only from the second).
    await toCanvas(node, options);
    const canvas = await toCanvas(node, options);
    const url = trimMargin(canvas).toDataURL("image/jpeg", 0.86);
    return url.length > 2000 ? url : null;
  } catch (reason) {
    console.warn("[celebra] the design preview could not be captured", reason);
    return null;
  }
}
