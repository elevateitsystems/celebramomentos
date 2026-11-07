import { describe, expect, it } from "vitest";
import { gelatoPhoneModel, gelatoPosterFormat, mapOrderItem, mugColorKey, type ItemContext } from "@/lib/pod/catalog";
import { GELATO_POSTER_HANGER_UIDS, GELATO_TOUGH_CASE_UIDS } from "@/lib/pod/gelato-catalog";

const ctx = (overrides: Partial<ItemContext>): ItemContext => ({ kind: "WALL_ART", provider: "GELATO", productName: "Póster", variantName: null, podSku: null, options: {}, photoCount: 1, cardSize: null, cardSku: null, ...overrides });

describe("Prodigi mapping", () => {
  it("sends a magnet pack as one magnet per photo with the verified SKU and 850 × 566 px files", () => {
    const result = mapOrderItem(ctx({ kind: "MAGNET", provider: "PRODIGI", variantName: "3 imanes", photoCount: 3 }));
    expect(result.issues).toEqual([]);
    expect(result.units).toHaveLength(3);
    expect(result.units.every((unit) => unit.productRef === "M-MAG-FRI-3X2")).toBe(true);
    expect(result.units[2].specs[0]).toMatchObject({ area: "default", kind: "photo", photoIndex: 2, fit: "fill", width: 850, height: 566 });
  });

  it("maps both card sizes to their SKUs and asks an admin for the print-ready spread", () => {
    const small = mapOrderItem(ctx({ kind: "POSTCARD", provider: "PRODIGI", cardSize: "5x7", cardSku: "CLASSIC-GRE-FEDR-7X5-BLA" }));
    const a5 = mapOrderItem(ctx({ kind: "POSTCARD", provider: "PRODIGI", cardSize: "A5", cardSku: "CLASSIC-GRE-FEDR-A5-BLA" }));
    expect(small.units[0].productRef).toBe("CLASSIC-GRE-FEDR-7X5-BLA");
    expect(small.units[0].specs[0]).toMatchObject({ kind: "admin", area: "default" });
    expect(small.units[0].specs[0].kind === "admin" && small.units[0].specs[0].description).toContain("6120 × 2160");
    expect(a5.units[0].specs[0].kind === "admin" && a5.units[0].specs[0].description).toContain("7086 × 2526");
    // The required size is checked against the attached file.
    expect(small.units[0].specs[0]).toMatchObject({ width: 6120, height: 2160 });
    expect(a5.units[0].specs[0]).toMatchObject({ width: 7086, height: 2526 });
  });

  it("reports magnets without photos instead of sending an empty order", () => {
    expect(mapOrderItem(ctx({ kind: "MAGNET", provider: "PRODIGI", photoCount: 0 })).issues[0].code).toBe("missing_photos");
  });
});

describe("Printful mug mapping", () => {
  it("uses the verified variant ids of the colour-inside mug", () => {
    expect(mapOrderItem(ctx({ kind: "MUG", provider: "PRINTFUL", variantName: "11 oz (325 mL)", options: { color: "Negro" } })).units[0].productRef).toBe("11051");
    expect(mapOrderItem(ctx({ kind: "MUG", provider: "PRINTFUL", variantName: "15 oz (444 mL)", options: { color: "Azul marino" } })).units[0].productRef).toBe("22373");
    expect(mapOrderItem(ctx({ kind: "MUG", provider: "PRINTFUL", variantName: "11 oz", options: { color: "Amarillo" } })).units[0].productRef).toBe("11048");
  });

  it("uses the 11 oz and 15 oz print file sizes", () => {
    expect(mapOrderItem(ctx({ kind: "MUG", provider: "PRINTFUL", variantName: "11 oz", options: { color: "Rojo" } })).units[0].specs[0]).toMatchObject({ fit: "pad", width: 2700, height: 1050 });
    expect(mapOrderItem(ctx({ kind: "MUG", provider: "PRINTFUL", variantName: "15 oz", options: { color: "Rojo" } })).units[0].specs[0]).toMatchObject({ width: 2700, height: 1140 });
  });

  it("blocks a colour Printful does not make in that size", () => {
    expect(mapOrderItem(ctx({ kind: "MUG", provider: "PRINTFUL", variantName: "15 oz", options: { color: "Naranja" } })).issues[0].code).toBe("unmapped");
  });

  it("recognises Spanish and Portuguese colour names", () => {
    expect(mugColorKey("Azul-marinho")).toBe("navy");
    expect(mugColorKey("Preto")).toBe("black");
    expect(mugColorKey("Vermelho")).toBe("red");
  });
});

describe("Gelato mapping", () => {
  it("maps storefront poster sizes to Gelato formats", () => {
    expect(gelatoPosterFormat("30 x 40 cm")).toBe("300x400-mm-12x16-inch");
    expect(gelatoPosterFormat("28 x 43 cm")).toBe("280x430-mm-XL");
    expect(gelatoPosterFormat("A3 (29.7 x 42 cm)")).toBe("A3");
    expect(gelatoPosterFormat("21 x 21.97 cm")).toBeNull();
  });

  it("picks the poster with the chosen orientation and hanger colour", () => {
    const portrait = mapOrderItem(ctx({ variantName: "30 x 40 cm", options: { orientacion: "Vertical" } }));
    const landscape = mapOrderItem(ctx({ variantName: "30 x 40 cm", options: { orientacion: "Horizontal", colgador: "Negro" } }));
    expect(portrait.units[0].productRef).toBe(GELATO_POSTER_HANGER_UIDS["300x400-mm-12x16-inch|ver|natural-wood"]);
    expect(landscape.units[0].productRef).toBe(GELATO_POSTER_HANGER_UIDS["300x400-mm-12x16-inch|hor|black"]);
    expect(landscape.units[0].productRef).toMatch(/^wall_hanging_poster_.*black.*_hor$/);
    expect(landscape.units[0].specs[0]).toMatchObject({ fit: "aspect", width: 400, height: 300 });
  });

  it("supports all four hanger colours", () => {
    for (const [name, color] of [["Blanco", "white"], ["Madera natural", "natural-wood"], ["Madera oscura", "dark-wood"], ["Negro", "black"]]) {
      expect(mapOrderItem(ctx({ variantName: "50 x 70 cm", options: { colgador: name } })).units[0].productRef).toBe(GELATO_POSTER_HANGER_UIDS[`500x700-mm-20x28-inch|ver|${color}`]);
    }
  });

  it("blocks sizes or orientations Gelato does not make", () => {
    expect(mapOrderItem(ctx({ variantName: "21 x 21.97 cm" })).issues[0].code).toBe("unmapped");
    expect(mapOrderItem(ctx({ variantName: "A1 (59.4 x 84.1 cm)", options: { orientacion: "Horizontal" } })).issues[0].code).toBe("unmapped");
    expect(mapOrderItem(ctx({ variantName: "A1 (59.4 x 84.1 cm)", options: { orientacion: "Vertical" } })).issues).toEqual([]);
  });

  it("maps the three calendar sizes and asks for the 14-page PDF", () => {
    for (const size of ["A4 (21 x 29.7 cm)", "A3 (29.7 x 42 cm)", "14.8 x 40 cm"]) {
      const result = mapOrderItem(ctx({ kind: "CALENDAR", variantName: size }));
      expect(result.units[0].productRef).toMatch(/^wall_calendar_unified_/);
      expect(result.units[0].specs[0].kind).toBe("admin");
    }
  });

  it("maps tough cases only for models Gelato makes", () => {
    expect(gelatoPhoneModel("iPhone 15 Pro Max")).toBe("iphone-15promax");
    expect(gelatoPhoneModel("Samsung S23 Ultra 5G")).toBe("galaxy-s23ultra");
    const supported = mapOrderItem(ctx({ kind: "PHONE_CASE", productName: "Funda rígida Tough", options: { modelo: "iPhone 15 Pro Max" } }));
    expect(supported.units[0].productRef).toBe(GELATO_TOUGH_CASE_UIDS["iphone-15promax"]);
    expect(mapOrderItem(ctx({ kind: "PHONE_CASE", productName: "Funda rígida Tough", options: { modelo: "iPhone 17 Pro" } })).issues[0].code).toBe("unmapped");
  });
});

describe("Printeers mapping (phone cases)", () => {
  const printeers = { productReference: "Product_soft_iphone15", printMm: { width: 71.5, height: 147.6 }, crop: { zoom: 1.5, x: 0.2, y: 0.8 } };

  it("sends the chosen Printeers product with the customer's framed photo at 300 dpi of its print area", () => {
    const result = mapOrderItem(ctx({ kind: "PHONE_CASE", provider: "PRINTEERS", productName: "Funda Soft TPU", options: { modelo: "iPhone 15" }, printeers }));
    expect(result.issues).toEqual([]);
    expect(result.units).toEqual([{ productRef: "Product_soft_iphone15", specs: [{ area: "default", kind: "photo", photoIndex: 0, fit: "fill", width: 844, height: 1743, format: "jpg", crop: { zoom: 1.5, x: 0.2, y: 0.8 } }] }]);
  });

  it("holds cases ordered before their product was linked to Printeers", () => {
    expect(mapOrderItem(ctx({ kind: "PHONE_CASE", provider: "PRINTEERS", productName: "Funda transparente", options: { modelo: "iPhone 15" } })).issues[0].code).toBe("printeers_product_missing");
  });

  it("does not guess a print size Printeers did not give", () => {
    expect(mapOrderItem(ctx({ kind: "PHONE_CASE", provider: "PRINTEERS", printeers: { ...printeers, printMm: null } })).issues[0].code).toBe("printeers_print_area_missing");
  });

  it("never prepares anything for a print shop that is no longer used", () => {
    expect(mapOrderItem(ctx({ kind: "PHONE_CASE", provider: "ALERIO_PRINT", productName: "Funda transparente", options: { modelo: "iPhone 15" } }))).toMatchObject({ units: [], issues: [{ code: "provider_inactive", severity: "blocker" }] });
  });
});

describe("admin override", () => {
  it("lets a size's Print shop SKU replace the built-in mapping", () => {
    expect(mapOrderItem(ctx({ kind: "PHONE_CASE", provider: "PRINTEERS", podSku: "Product_override", printeers: { productReference: "Product_chosen", printMm: { width: 70, height: 150 }, crop: null } })).units[0].productRef).toBe("Product_override");
    expect(mapOrderItem(ctx({ variantName: "21 x 21.97 cm", podSku: "custom_uid" })).units[0].productRef).toBe("custom_uid");
  });
});
