import { describe, expect, it } from "vitest";
import { checkPhotoResolution } from "@/lib/pod/artwork";
import { studioPhotoTarget, type ItemContext } from "@/lib/pod/catalog";
import { MAX_ENLARGEMENT, minimumPhotoSize, photoEnlargement, photoQuality } from "@/lib/print-quality";

const caseSpec = { area: "default", kind: "photo" as const, photoIndex: 0, fit: "fill" as const, width: 827, height: 1724, format: "jpg" as const };

describe("photo size against its print file", () => {
  it("measures the reported case: 427 × 585 px into an iPhone XR case (827 × 1724 px) is 2.9×", () => {
    expect(photoEnlargement({ width: 427, height: 585 }, { width: 827, height: 1724 })).toBeCloseTo(2.947, 2);
    expect(photoEnlargement({ width: 427, height: 585 }, { width: 827, height: 1724 })).toBeGreaterThan(MAX_ENLARGEMENT);
  });

  it("measures a sideways photo as it is cut (never rotated), and counts the customer's zoom", () => {
    // A landscape photo on a portrait case only uses its middle strip: 1724 px tall from 827 px.
    expect(photoEnlargement({ width: 1724, height: 827 }, { width: 827, height: 1724 })).toBeCloseTo(2.085, 2);
    expect(photoEnlargement({ width: 827, height: 1724 }, { width: 827, height: 1724 }, 2)).toBe(2);
  });

  it("matches the server for the held Printeers order (1280 × 769 px landscape photo, 839 × 1736 px case)", () => {
    const studio = photoEnlargement({ width: 1280, height: 769 }, { width: 839, height: 1736 });
    const server = checkPhotoResolution({ ...caseSpec, width: 839, height: 1736, crop: { zoom: 1, x: 0.5, y: 0.5 } }, { width: 1280, height: 769 });
    expect(studio).toBeCloseTo(2.257, 2);
    expect(server?.message).toContain("enlarged 2.3×");
    expect(photoQuality(photoEnlargement({ width: 1280, height: 769 }, { width: 839, height: 1736 }, 2.26))).toBe("too_small");
  });

  it("sorts photos into good, soft, low (orderable after confirming) and too small (not orderable)", () => {
    const print = { width: 827, height: 1724 };
    expect(photoQuality(photoEnlargement({ width: 827, height: 1724 }, print))).toBe("good");
    expect(photoQuality(photoEnlargement({ width: 500, height: 1000 }, print))).toBe("soft");
    // The reported photo: can be ordered once the customer accepts a less sharp print.
    expect(photoQuality(photoEnlargement({ width: 427, height: 585 }, print))).toBe("low");
    // The same photo zoomed in 1.5× is over 4×: too small.
    expect(photoQuality(photoEnlargement({ width: 427, height: 585 }, print, 1.5))).toBe("too_small");
    expect(photoQuality(photoEnlargement({ width: 181, height: 238 }, print))).toBe("too_small");
  });

  it("recommends at least half the print size", () => {
    expect(minimumPhotoSize({ width: 827, height: 1724 })).toEqual({ width: 414, height: 862 });
    expect(photoEnlargement({ width: 414, height: 862 }, { width: 827, height: 1724 })).toBeLessThanOrEqual(MAX_ENLARGEMENT);
  });
});

describe("print-file check on the server", () => {
  it("never holds an order for a small photo: the admin gets a note on how it will print", () => {
    expect(checkPhotoResolution(caseSpec, { width: 427, height: 585 })).toMatchObject({ code: "low_resolution", severity: "info", message: expect.stringContaining("visibly softer") });
    expect(checkPhotoResolution(caseSpec, { width: 427, height: 585 }, { accepted: true })).toMatchObject({ severity: "info", message: expect.stringContaining("the customer saw the warning") });
    expect(checkPhotoResolution(caseSpec, { width: 181, height: 238 })).toMatchObject({ severity: "info", message: expect.stringContaining("pixelated") });
  });

  it("only notes slightly soft photos (1.5× to 2×): the order is sent automatically", () => {
    expect(checkPhotoResolution(caseSpec, { width: 500, height: 1000 })).toMatchObject({ code: "low_resolution", severity: "info" });
  });

  it("says nothing about good photos", () => {
    expect(checkPhotoResolution(caseSpec, { width: 700, height: 1500 })).toBeNull();
  });
});

describe("posters are judged in dpi with the same limits", () => {
  // The reported order: a 1024 × 819 px photo on a 250 × 200 mm Gelato poster is about 104 dpi.
  const poster = { area: "default", kind: "photo" as const, photoIndex: 0, fit: "aspect" as const, width: 250, height: 200, format: "jpg" as const, minDpiSize: { widthMm: 250, heightMm: 200 } };

  it("no longer holds the reported 104 dpi poster", () => {
    expect(checkPhotoResolution(poster, { width: 1024, height: 819 })).toBeNull();
  });

  it("notes 75–100 dpi and sends it", () => {
    expect(checkPhotoResolution(poster, { width: 800, height: 640 })).toMatchObject({ code: "low_resolution", severity: "info", message: expect.stringContaining("81 dpi") });
  });

  it("notes low-dpi posters for the admin but always sends them", () => {
    expect(checkPhotoResolution(poster, { width: 400, height: 320 })).toMatchObject({ severity: "info", message: expect.stringContaining("visibly softer") });
    expect(checkPhotoResolution(poster, { width: 150, height: 120 }, { accepted: true })).toMatchObject({ severity: "info", message: expect.stringContaining("pixelated") });
  });
});

describe("what the studio checks a photo against", () => {
  const ctx = (changes: Partial<ItemContext>): ItemContext => ({ kind: "WALL_ART", provider: "GELATO", productName: "Póster", variantName: "20 x 25 cm", podSku: null, options: {}, photoCount: 1, cardSize: null, cardSku: null, ...changes });

  it("uses the poster's printed size at 150 dpi, turned for landscape", () => {
    expect(studioPhotoTarget(ctx({}))).toEqual({ width: 1181, height: 1476 });
    expect(studioPhotoTarget(ctx({ options: { orientacion: "Horizontal" } }))).toEqual({ width: 1476, height: 1181 });
  });

  it("uses the exact file of a magnet, and nothing for products that are padded or not mapped", () => {
    expect(studioPhotoTarget(ctx({ kind: "MAGNET", provider: "PRODIGI", variantName: "1 imán" }))).toEqual({ width: 850, height: 566 });
    expect(studioPhotoTarget(ctx({ kind: "MUG", provider: "PRINTFUL", variantName: "11 oz (325 mL)" }))).toBeNull();
    expect(studioPhotoTarget(ctx({ variantName: "unknown size" }))).toBeNull();
  });
});
