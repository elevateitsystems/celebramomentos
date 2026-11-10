import { beforeEach, describe, expect, it, vi } from "vitest";

// The server re-checks a phone case cart line against Printeers before any price or order.
const { product, catalog } = vi.hoisted(() => ({
  product: { current: null as Record<string, unknown> | null },
  catalog: { ready: true, model: null as unknown, fail: false },
}));
vi.mock("@/lib/server/prisma", () => ({ prisma: { product: { findFirst: vi.fn(async () => product.current) } } }));
vi.mock("@/lib/pod/printeers/catalog", async () => {
  const { PodApiError } = await import("@/lib/pod/http");
  return {
    linkedProductgroup: (metadata: { printeers?: { test?: string } } | null) => metadata?.printeers?.test || null,
    printeersCatalogReady: () => catalog.ready,
    phoneModel: vi.fn(async () => { if (catalog.fail) throw new PodApiError("PRINTEERS", 503, "down", true); return catalog.model; }),
  };
});

import { resolveCartLine } from "@/lib/server/catalog";
import { defaultCardCustomization, type CartItem } from "@/lib/store";

const soft = { id: "cmvrppz42000ht6jqldnsmj2f", name: "Funda Soft TPU", basePriceCents: 2199, metadata: { photoCount: 1, provider: "ALERIO_PRINT", printeers: { test: "Productgroup_soft" } }, variants: [], images: [], options: [{ key: "modelo", name: "Modelo", required: true, config: { choices: ["iPhone 15"] } }] };
const line = (printeers: unknown, options: Record<string, string> = {}): CartItem => ({ id: "l1", quantity: 1, card: defaultCardCustomization(), product: { kind: "CATALOG", productKind: "PHONE_CASE", productId: soft.id, variantId: null, options, photos: ["https://res.cloudinary.com/x/image/upload/a.jpg"], name: "x", detail: "", image: null, priceCents: 1, printeers } as CartItem["product"] });
const model = (changes: Record<string, unknown> = {}) => ({ detail: { reference: "Product_b", name: "iPhone 15 Pro Max", available: true, printMm: { width: 77, height: 160 }, layers: null, ...changes } });

beforeEach(() => { product.current = soft; catalog.ready = true; catalog.fail = false; catalog.model = model(); });

describe("phone case cart lines linked to Printeers", () => {
  it("keeps the shop's price, routes to Printeers and records the model and print area checked on the server", async () => {
    const resolved = await resolveCartLine(line({ productReference: "Product_b", crop: { zoom: 1.4, x: 0.3, y: 0.6 } }));
    expect(resolved.unitPriceCents).toBe(2199);
    expect(resolved.product).toMatchObject({ provider: "PRINTEERS", options: { modelo: "iPhone 15 Pro Max" }, printeers: { productReference: "Product_b", crop: { zoom: 1.4, x: 0.3, y: 0.6 }, printMm: { width: 77, height: 160 } } });
  });

  it("refuses a missing, foreign, sold-out or unprintable model", async () => {
    await expect(resolveCartLine(line(null))).rejects.toThrow(/modelo de tu móvil/);
    catalog.model = null;
    await expect(resolveCartLine(line({ productReference: "Product_other", crop: { zoom: 1, x: 0.5, y: 0.5 } }))).rejects.toThrow(/ya no está disponible/);
    catalog.model = model({ available: false });
    await expect(resolveCartLine(line({ productReference: "Product_b", crop: { zoom: 1, x: 0.5, y: 0.5 } }))).rejects.toThrow(/agotada/);
    catalog.model = model({ printMm: null });
    await expect(resolveCartLine(line({ productReference: "Product_b", crop: { zoom: 1, x: 0.5, y: 0.5 } }))).rejects.toThrow(/no se puede personalizar/);
  });

  it("asks to try again later when Printeers cannot be reached, instead of selling blind", async () => {
    catalog.fail = true;
    await expect(resolveCartLine(line({ productReference: "Product_b", crop: { zoom: 1, x: 0.5, y: 0.5 } }))).rejects.toMatchObject({ status: 503 });
  });

  it("refuses a phone case that is not linked to Printeers (it could never be produced), whatever model name is typed", async () => {
    catalog.ready = false;
    await expect(resolveCartLine(line({ productReference: "Product_b", crop: { zoom: 2, x: 0, y: 0 } }, { modelo: "iPhone 15" }))).rejects.toMatchObject({ status: 409, message: expect.stringContaining("no está disponible") });
    await expect(resolveCartLine(line(null, { modelo: "Google Pixel 11 Pro XL" }))).rejects.toMatchObject({ status: 409 });
  });
});
