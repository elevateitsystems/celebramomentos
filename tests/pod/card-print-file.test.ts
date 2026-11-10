import { describe, expect, it } from "vitest";
import { cloudinaryPublicId, compositeFileUrl, pageSlots } from "@/lib/pod/artwork";
import { CARD_SIZES } from "@/lib/data";
import { PRODIGI_CARD_LAYOUTS } from "@/lib/pod/catalog";

const base = "https://res.cloudinary.com/celebra/image/upload/";
const page = (name: string) => `${base}v1731000000/celebramomentos/customer_upload/${name}.jpg`;
const spec = (width: number, height: number) => ({ area: "default", kind: "pages" as const, pages: ["back", "front", "inside-left", "inside-right"], width, height, format: "jpg" as const, description: "" });

describe("card print file layout (Prodigi greeting cards)", () => {
  it("splits the print area into 4 page slots that cover it exactly, with no gap or overlap", () => {
    for (const [sku, layout] of Object.entries(PRODIGI_CARD_LAYOUTS)) {
      const slots = pageSlots(layout.width, layout.pages.length);
      expect(slots[0].left).toBe(0);
      for (let i = 1; i < slots.length; i += 1) expect(slots[i].left).toBe(slots[i - 1].left + slots[i - 1].width);
      expect(slots.at(-1)!.left + slots.at(-1)!.width, sku).toBe(layout.width);
    }
    expect(pageSlots(6120, 4).map((slot) => slot.width)).toEqual([1530, 1530, 1530, 1530]);
    // A5: 7086 / 4 = 1771.5 — integer slots that still add up exactly.
    expect(pageSlots(7086, 4).map((slot) => slot.width)).toEqual([1772, 1771, 1772, 1771]);
  });

  it("matches the page size the checkout renders: 4 × 1530 × 2160 = 6120 × 2160 for 5 × 7", () => {
    const panel = CARD_SIZES.find((size) => size.sku === "CLASSIC-GRE-FEDR-7X5-BLA")!.panel;
    const layout = PRODIGI_CARD_LAYOUTS["CLASSIC-GRE-FEDR-7X5-BLA"];
    expect(panel.width * 4).toBe(layout.width);
    expect(panel.height).toBe(layout.height);
  });

  it("builds one Cloudinary file: page 1 padded to the full canvas, the others laid in their slots, in template order", () => {
    const url = compositeFileUrl([page("back"), page("front"), page("in-left"), page("in-right")], spec(6120, 2160))!;
    expect(url).toBe(`${base}c_fill,g_center,w_1530,h_2160/c_pad,g_west,b_white,w_6120,h_2160/`
      + "l_celebramomentos:customer_upload:front,c_fill,g_center,w_1530,h_2160/fl_layer_apply,g_north_west,x_1530,y_0/"
      + "l_celebramomentos:customer_upload:in-left,c_fill,g_center,w_1530,h_2160/fl_layer_apply,g_north_west,x_3060,y_0/"
      + "l_celebramomentos:customer_upload:in-right,c_fill,g_center,w_1530,h_2160/fl_layer_apply,g_north_west,x_4590,y_0/"
      + "q_95,f_jpg/celebramomentos/customer_upload/back.jpg");
  });

  it("refuses pages that are not uploads of the shop's own image storage, or a missing page", () => {
    expect(compositeFileUrl([page("a"), page("b"), page("c"), "https://evil.example/d.jpg"], spec(6120, 2160))).toBeNull();
    expect(compositeFileUrl([page("a"), page("b"), page("c"), "https://res.cloudinary.com/other/image/upload/d.jpg"], spec(6120, 2160))).toBeNull();
    expect(compositeFileUrl([page("a"), page("b"), page("c")], spec(6120, 2160))).toBeNull();
  });

  it("reads Cloudinary public ids with or without a version or transformation", () => {
    expect(cloudinaryPublicId(`${base}v123/folder/sub/name.jpg`)).toBe("folder/sub/name");
    expect(cloudinaryPublicId(`${base}folder/name.png`)).toBe("folder/name");
    expect(cloudinaryPublicId("https://example.com/a.jpg")).toBeNull();
  });
});
