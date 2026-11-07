import { createHmac } from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cropRect, mmToPx, normalizeCrop } from "@/lib/crop";
import { printFileUrl } from "@/lib/pod/artwork";
import { verifyStandardWebhook } from "@/lib/pod/printeers/webhook";
import { podProviderFor } from "@/lib/products";

vi.mock("@/lib/server/prisma", () => ({ prisma: {} }));

describe("photo framing (shared by the editor preview and the print file)", () => {
  const photo = { width: 4000, height: 3000 };
  const caseShape = 70 / 150;

  it("starts with the largest centred crop of the case's shape", () => {
    const rect = cropRect(photo, caseShape, { zoom: 1, x: 0.5, y: 0.5 });
    expect(rect.height).toBe(3000);
    expect(rect.width).toBeCloseTo(1400, 5);
    expect(rect.left).toBeCloseTo(1300, 5);
    expect(rect.top).toBe(0);
  });

  it("zooms in and moves the crop without ever leaving the photo", () => {
    const rect = cropRect(photo, caseShape, { zoom: 2, x: 1, y: 0 });
    expect(rect.width).toBeCloseTo(700, 5);
    expect(rect.left + rect.width).toBeCloseTo(4000, 5);
    expect(rect.top).toBe(0);
    expect(normalizeCrop({ zoom: 9, x: -3, y: 7 })).toEqual({ zoom: 4, x: 0, y: 1 });
  });

  it("cuts exactly the framed part, then scales it to the print size", () => {
    const spec = { area: "default", kind: "photo" as const, photoIndex: 0, fit: "fill" as const, width: mmToPx(70), height: mmToPx(150), format: "jpg" as const, crop: { zoom: 2, x: 1, y: 0 } };
    expect(printFileUrl("https://res.cloudinary.com/demo/image/upload/v1/a.jpg", spec, photo)).toBe("https://res.cloudinary.com/demo/image/upload/c_crop,x_3300,y_0,w_700,h_1500/c_scale,w_827,h_1772,q_100,f_jpg/v1/a.jpg");
  });
});

describe("Printeers webhook signatures (Standard Webhooks)", () => {
  const key = Buffer.from("printeers-test-signing-key-32byt");
  const secret = `whsec_${key.toString("base64")}`;
  const body = JSON.stringify({ kind: "shipment.created", subject: { shipment: { reference: "Shipment_1" } } });
  const now = Date.UTC(2026, 10, 5, 12, 0, 0);
  const timestamp = String(now / 1000);
  const sign = (content: string) => `v1,${createHmac("sha256", key).update(content).digest("base64")}`;

  it("accepts a correctly signed event", () => {
    expect(verifyStandardWebhook({ id: "msg_1", timestamp, signature: sign(`msg_1.${timestamp}.${body}`), body, secret, now })).toBe(true);
    // During a secret rotation several signatures are sent; one valid is enough.
    expect(verifyStandardWebhook({ id: "msg_1", timestamp, signature: `v1,AAAA ${sign(`msg_1.${timestamp}.${body}`)}`, body, secret, now })).toBe(true);
  });

  it("rejects a changed body, another id, a stale timestamp or a missing secret", () => {
    const signature = sign(`msg_1.${timestamp}.${body}`);
    expect(verifyStandardWebhook({ id: "msg_1", timestamp, signature, body: body.replace("Shipment_1", "Shipment_2"), secret, now })).toBe(false);
    expect(verifyStandardWebhook({ id: "msg_2", timestamp, signature, body, secret, now })).toBe(false);
    expect(verifyStandardWebhook({ id: "msg_1", timestamp, signature, body, secret, now: now + 10 * 60_000 })).toBe(false);
    expect(verifyStandardWebhook({ id: "msg_1", timestamp, signature, body, secret: null, now })).toBe(false);
  });
});

describe("routing", () => {
  it("sends every phone case to Printeers, even products saved with a former print shop", () => {
    expect(podProviderFor("PHONE_CASE", "ALERIO_PRINT")).toBe("PRINTEERS");
    expect(podProviderFor("PHONE_CASE", undefined)).toBe("PRINTEERS");
  });

  it("leaves every other product with its own print shop", () => {
    expect(podProviderFor("MUG", "PRINTFUL")).toBe("PRINTFUL");
    expect(podProviderFor("WALL_ART", undefined)).toBe("GELATO");
    expect(podProviderFor("MAGNET", undefined)).toBe("PRODIGI");
    expect(podProviderFor("CALENDAR", "ALERIO_PRINT")).toBe("GELATO");
  });
});

describe("phone case catalog from the v1 stock list", () => {
  const saved = { ...process.env };
  beforeEach(() => { Object.assign(process.env, { POD_ORDER_MODE: "draft", PRINTEERS_V1_TEST_API_KEY: "prt-test-key", PRINTEERS_V1_TEST_PARTNER_CODE: "TESTCODE" }); });
  afterEach(() => { process.env = { ...saved }; vi.unstubAllGlobals(); vi.resetModules(); });

  const attributes = (case_type: string, device: string, extra: Record<string, unknown> = {}) => ({ print_side: "Back printed", case_type, case_colour: "Transparent", device_brand: "Apple", device_models: [device], ...extra });
  const stock = [
    { sku: "E15110000", name: "Apple iPhone 15 Soft case (back printed, transparent)", kind: "print", dimension_width_mm: 71, dimension_height_mm: 147, availability: { status: "in-stock", can_backorder: true }, suggested_retail_price: "19.95", price: "8.40", attributes: attributes("Soft case", "Apple iPhone 15"),
      rendering_layers: { mask_url: "https://files.test-printeers.com/layers/P/mask.png", mockup_url: "https://files.test-printeers.com/layers/P/mockup.png", top_url: "https://files.test-printeers.com/layers/P/top.png", bottom_url: "https://evil.example/bottom.png", ppmm: 5, offset_x: 240, offset_y: 57 } },
    { sku: "E15110001", name: "Samsung Galaxy S24 Soft case (back printed, transparent)", kind: "print", dimension_width_mm: 70, dimension_height_mm: 150, availability: { status: "out-of-stock", can_backorder: false }, suggested_retail_price: "19.95", price: null, attributes: attributes("Soft case", "Samsung Galaxy S24", { device_brand: "Samsung" }), rendering_layers: null },
    { sku: "E15110002", name: "Apple iPhone 8 Soft case (back printed, transparent)", kind: "print", dimension_width_mm: 67, dimension_height_mm: 138, availability: { status: "out-of-stock", can_backorder: true }, suggested_retail_price: "19.95", price: "7.00", attributes: attributes("Soft case", "Apple iPhone 8"), rendering_layers: null },
    { sku: "E15120000", name: "Apple iPhone 15 Wallet case (back printed, black)", kind: "print", dimension_width_mm: 71, dimension_height_mm: 147, availability: { status: "low-stock", amount_left: 3 }, suggested_retail_price: "24.95", price: null, attributes: attributes("Wallet case", "Apple iPhone 15", { case_colour: "Black" }), rendering_layers: null },
    { sku: "E15130000", name: "Apple AirPods 3 Soft case (front printed, transparent)", kind: "print", dimension_width_mm: 40, dimension_height_mm: 40, availability: { status: "in-stock" }, suggested_retail_price: "10.00", price: null, attributes: attributes("AirPods Hard case", "AirPods 3"), rendering_layers: null },
    { sku: "E15140000", name: "Screen protector", kind: "distribution", dimension_width_mm: null, dimension_height_mm: null, availability: { status: "in-stock" }, suggested_retail_price: null, price: null, attributes: { print_side: null, case_type: null, case_colour: null, device_brand: null, device_models: [] }, rendering_layers: null },
  ];
  const stubStock = () => {
    const calls: { url: string; headers: Headers }[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => { calls.push({ url, headers: new Headers(init.headers) }); return new Response(JSON.stringify(url.endsWith("/stock") ? { items: stock } : {}), { status: 200 }); }));
    return calls;
  };

  it("builds product groups from case type, print side and colour, hiding earbud cases and non-printable items", async () => {
    const calls = stubStock();
    const { productgroups } = await import("@/lib/pod/printeers/catalog");
    const groups = await productgroups("draft");
    expect(groups.map((group) => group.name)).toEqual(["Soft case · Back printed · Transparent", "Wallet case · Back printed · Black"]);
    expect(groups[0]).toMatchObject({ reference: "soft-case-back-printed-transparent", private: false, suggestedRetailPrice: 1995, price: 700 });
    expect(groups.every((group) => /^[A-Za-z0-9_-]{3,80}$/.test(group.reference))).toBe(true);
    expect(calls[0].url).toBe("https://api.test-printeers.com/stock");
    expect(calls[0].headers.get("X-IPP-PARTNERCODE")).toBe("TESTCODE");
    expect(calls[0].headers.get("X-IPP-APIKEY")).toBe("prt-test-key");
  });

  it("lists a group's models by SKU, keeps backorderable ones, hides ones that cannot be ordered, and refuses SKUs of other groups", async () => {
    stubStock();
    const { phoneModels, phoneModel } = await import("@/lib/pod/printeers/catalog");
    expect(await phoneModels("soft-case-back-printed-transparent", "draft")).toEqual([{ reference: "E15110002", name: "Apple iPhone 8", available: false }, { reference: "E15110000", name: "Apple iPhone 15", available: true }]);
    expect((await phoneModel("soft-case-back-printed-transparent", "E15110000", "draft"))?.detail).toMatchObject({ reference: "E15110000", name: "Apple iPhone 15", available: true, printMm: { width: 71, height: 147 } });
    // Another group's SKU (a tampered cart), an out-of-stock one, a non-case and a malformed one are refused.
    expect(await phoneModel("soft-case-back-printed-transparent", "E15120000", "draft")).toBeNull();
    expect(await phoneModel("soft-case-back-printed-transparent", "E15110001", "draft")).toBeNull();
    expect(await phoneModel("soft-case-back-printed-transparent", "E15140000", "draft")).toBeNull();
    expect(await phoneModel("soft-case-back-printed-transparent", "E15110000; drop", "draft")).toBeNull();
  });

  it("derives the mockup geometry from ppmm and the print size, and only serves layers from Printeers' file hosts", async () => {
    stubStock();
    const { phoneModel, layerUrl } = await import("@/lib/pod/printeers/catalog");
    expect((await phoneModel("soft-case-back-printed-transparent", "E15110000", "draft"))?.detail.layers).toMatchObject({ maskCanvas: true, maskWidthPx: 355, maskHeightPx: 735, maskOffsetXPx: 240, maskOffsetYPx: 57, top: true, mask: true });
    expect(await layerUrl("soft-case-back-printed-transparent", "E15110000", "mask", "draft")).toBe("https://files.test-printeers.com/layers/P/mask.png");
    expect(await layerUrl("soft-case-back-printed-transparent", "E15110000", "bottom", "draft")).toBeNull();
  });
});

describe("phone model names", () => {
  it("drops the case type Printeers appends, for every product family seen in production", async () => {
    const { phoneModelName } = await import("@/lib/pod/printeers/catalog");
    expect(phoneModelName("Apple iPhone 15 Pro Soft case (back printed, transparent)")).toBe("Apple iPhone 15 Pro");
    expect(phoneModelName("Samsung Galaxy S27 Plus Hard case (back printed, transparent)  ")).toBe("Samsung Galaxy S27 Plus");
    expect(phoneModelName("Apple iPhone 15 Pro Max Wallet case (fully printed)")).toBe("Apple iPhone 15 Pro Max");
    expect(phoneModelName("Apple iPhone 12 Pro Max case (back printed, white)")).toBe("Apple iPhone 12 Pro Max");
    expect(phoneModelName("Samsung Galaxy A72 / Galaxy A72 5G Hard case (back printed, black)")).toBe("Samsung Galaxy A72 / Galaxy A72 5G");
    expect(phoneModelName("Apple iPhone 5 / 5s / SE (2016) Hard case (back printed, black)")).toBe("Apple iPhone 5 / 5s / SE (2016)");
    // Irregular names seen in production.
    expect(phoneModelName("Oppo Find X9 Pro Soft case (back printed, transparent")).toBe("Oppo Find X9 Pro");
    expect(phoneModelName("Oppo Reno11 F (back printed, transparent)")).toBe("Oppo Reno11 F");
  });
});
