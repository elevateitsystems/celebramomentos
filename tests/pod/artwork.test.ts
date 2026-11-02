import { describe, expect, it } from "vitest";
import { checkPhotoResolution, checkPrintFileSize, gelatoFormatMm, printFileUrl, type PrintSpec } from "@/lib/pod/artwork";
import { CARD_SIZES } from "@/lib/data";

const upload = "https://res.cloudinary.com/demo/image/upload/v1793/celebramomentos/customer_upload/2026-11-01/abc.jpg";
const photo = (spec: Partial<Extract<PrintSpec, { kind: "photo" }>>) => ({ area: "default", kind: "photo" as const, photoIndex: 0, fit: "fill" as const, width: 850, height: 566, format: "jpg" as const, ...spec });

describe("print file URLs", () => {
  it("crops to the exact print size at full quality", () => {
    expect(printFileUrl(upload, photo({}))).toBe("https://res.cloudinary.com/demo/image/upload/c_fill,g_center,w_850,h_566,q_100,f_jpg/v1793/celebramomentos/customer_upload/2026-11-01/abc.jpg");
  });

  it("pads the whole photo on white for mugs", () => {
    expect(printFileUrl(upload, photo({ fit: "pad", width: 2700, height: 1050 }))).toContain("/upload/c_pad,b_white,w_2700,h_1050,q_100,f_jpg/");
  });

  it("only crops to the shape for posters, keeping every original pixel", () => {
    expect(printFileUrl(upload, photo({ fit: "aspect", width: 300, height: 400 }))).toContain("/upload/c_crop,g_center,ar_300:400,q_100,f_jpg/");
  });

  it("keeps PNG for clear cases and leaves other hosts untouched", () => {
    expect(printFileUrl(upload, photo({ width: 750, height: 1590, format: "png" }))).toContain(",f_png/");
    expect(printFileUrl("https://example.com/file.jpg", photo({}))).toBe("https://example.com/file.jpg");
    expect(printFileUrl(upload, photo({ fit: "original" }))).toBe(upload);
  });
});

describe("artwork validation", () => {
  it("accepts photos large enough and warns about strongly enlarged ones", () => {
    expect(checkPhotoResolution(photo({}), { width: 1200, height: 900 })).toBeNull();
    expect(checkPhotoResolution(photo({ width: 2700, height: 1050, fit: "pad" }), { width: 640, height: 480 })).toMatchObject({ code: "low_resolution", severity: "warning" });
  });

  it("checks posters in dpi at their printed size", () => {
    const poster = photo({ fit: "aspect", width: 420, height: 594, minDpiSize: { widthMm: 420, heightMm: 594 } });
    expect(checkPhotoResolution(poster, { width: 3024, height: 4032 })).toBeNull();
    expect(checkPhotoResolution(poster, { width: 800, height: 1100 })?.message).toMatch(/dpi/);
  });

  it("does not guess when the photo size is unknown", () => {
    expect(checkPhotoResolution(photo({}), null)).toBeNull();
  });

  it("reads paper sizes from Gelato formats", () => {
    expect(gelatoFormatMm("300x400-mm-12x16-inch")).toEqual([300, 400]);
    expect(gelatoFormatMm("A2")).toEqual([420, 594]);
    expect(gelatoFormatMm("280x430-mm-XL")).toEqual([280, 430]);
  });
});

describe("print file size check", () => {
  it("accepts a file of exactly the size the shop needs", () => {
    expect(checkPrintFileSize({ fit: "fill", width: 750, height: 1590 }, { width: 750, height: 1590 })).toBeNull();
  });

  it("blocks a file of any other size (e.g. the case file reused for another product)", () => {
    expect(checkPrintFileSize({ fit: "pad", width: 2700, height: 1050 }, { width: 750, height: 1590 })).toMatchObject({ code: "print_file_invalid", severity: "blocker" });
    expect(checkPrintFileSize({ width: 6120, height: 2160 }, { width: 1530, height: 2160 })?.message).toContain("exactly 6120 × 2160");
  });

  it("checks only the shape for posters, which the shop scales", () => {
    expect(checkPrintFileSize({ fit: "aspect", width: 300, height: 400 }, { width: 3000, height: 4000 })).toBeNull();
    expect(checkPrintFileSize({ fit: "aspect", width: 300, height: 400 }, { width: 4000, height: 3000 })?.code).toBe("print_file_invalid");
  });

  it("holds a file whose size is unknown for an admin to check", () => {
    expect(checkPrintFileSize({ fit: "fill", width: 850, height: 566 }, null)).toMatchObject({ code: "print_file_unverified", severity: "warning" });
  });

  it("does not check files with no fixed size", () => {
    expect(checkPrintFileSize({ fit: "original", width: 0, height: 0 }, null)).toBeNull();
    expect(checkPrintFileSize({}, null)).toBeNull();
  });

  it("uses card pages that are a quarter of Prodigi's print area", () => {
    expect(CARD_SIZES.map((size) => [size.panel.width * 4, size.panel.height])).toEqual([[6120, 2160], [7088, 2526]]);
  });
});
