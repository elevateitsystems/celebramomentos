import { beforeEach, describe, expect, it, vi } from "vitest";

const CLOUD = "https://res.cloudinary.com/celebra/image/upload/";
const pageUrl = (side: string) => `${CLOUD}v1/celebramomentos/customer_upload/${side}.jpg`;
const state = vi.hoisted(() => ({ uploads: [] as { url: string; publicId: string }[], reportSize: { width: 6120, height: 2160 }, failUpload: false }));

vi.mock("@/lib/server/prisma", () => ({ prisma: {
  productVariant: { findUnique: async () => null },
  // Pages saved at checkout: customer uploads of 1530 × 2160 px.
  asset: {
    findMany: async ({ where }: { where: { url: { in: string[] } } }) => where.url.in.filter((url) => url.includes("customer_upload")).map((url) => ({ url, kind: "CUSTOMER_UPLOAD", mimeType: "image/jpeg", metadata: { width: 1530, height: 2160 } })),
    upsert: async () => ({}),
  },
} }));
vi.mock("@/lib/server/cloudinary", () => ({
  cloudinaryObjectKey: (id: string) => `cloudinary:${id}`,
  uploadRemoteImageToCloudinary: async ({ url, publicId }: { url: string; publicId: string }) => {
    if (state.failUpload) throw new Error("Cloudinary is unavailable");
    state.uploads.push({ url, publicId });
    return { secureUrl: `${CLOUD}v2/celebramomentos/print_file/o1/${publicId}.jpg`, publicId: `celebramomentos/print_file/o1/${publicId}`, width: state.reportSize.width, height: state.reportSize.height, bytes: 4_000_000, format: "jpg", version: 2 };
  },
}));

import { planItem } from "@/lib/pod/fulfillment";

const sides = ["front", "inside-left", "inside-right", "back"];
const cardItem = (panels = sides) => ({
  id: "item1", orderId: "o1", name: "Magazine · 5 × 7\"", quantity: 1, variantId: null, productId: null, templateId: null, unitPriceCents: 890, createdAt: new Date(),
  podFulfillmentId: null, podProvider: null, podProductRef: null, podArtwork: null, podIssues: null,
  personalization: { templateSlug: "template-magazine", cardSize: "5x7", provider: "PRODIGI", sku: "CLASSIC-GRE-FEDR-7X5-BLA", card: { size: "5x7", design: { panels: panels.map((side) => ({ side, url: pageUrl(side), width: 1530, height: 2160 })) } } },
}) as never;

beforeEach(() => { state.uploads = []; state.reportSize = { width: 6120, height: 2160 }; state.failUpload = false; });

describe("Prodigi card print file, made automatically from the customer's saved design", () => {
  it("composes the 4 saved pages into one 6120 × 2160 file in template order, verified, with nothing for an admin to do", async () => {
    const plan = await planItem(cardItem(), []);
    expect(plan.provider).toBe("PRODIGI");
    expect(plan.issues).toEqual([]);
    expect(plan.artwork).toHaveLength(1);
    expect(plan.artwork[0]).toMatchObject({ kind: "pages", source: "design", width: 6120, height: 2160, verified: { width: 6120, height: 2160 }, url: expect.stringContaining("print_file/o1/item1-1-default") });
    // The file Cloudinary rendered: page order back | front | inside-left | inside-right.
    const composite = state.uploads[0].url;
    expect(composite.indexOf("celebramomentos/customer_upload/back.jpg")).toBeGreaterThan(0);
    expect(composite.indexOf("customer_upload:front")).toBeLessThan(composite.indexOf("customer_upload:inside-left"));
    expect(composite.indexOf("customer_upload:inside-left")).toBeLessThan(composite.indexOf("customer_upload:inside-right"));
    expect(composite).toContain("w_6120,h_2160");
  });

  it("does not generate the file again when the order is checked again (same pages)", async () => {
    const first = await planItem(cardItem(), []);
    const second = await planItem(cardItem(), first.artwork);
    expect(state.uploads).toHaveLength(1);
    expect(second.artwork[0].url).toBe(first.artwork[0].url);
    expect(second.issues).toEqual([]);
  });

  it("blocks sending when the stored file is not exactly 6120 × 2160 (e.g. 3260 × 2160)", async () => {
    state.reportSize = { width: 3260, height: 2160 };
    const plan = await planItem(cardItem(), []);
    expect(plan.issues).toEqual([expect.objectContaining({ severity: "blocker", code: "print_file_invalid", message: expect.stringContaining("3260 × 2160 px; the print shop needs exactly 6120 × 2160 px") })]);
  });

  it("holds the order (and retries automatically) when the file cannot be made right now", async () => {
    state.failUpload = true;
    const plan = await planItem(cardItem(), []);
    expect(plan.artwork[0].url).toBeNull();
    expect(plan.issues).toEqual([expect.objectContaining({ severity: "blocker", code: "print_file_render_failed" })]);
  });

  it("never sends a placeholder: a missing page blocks the order", async () => {
    const plan = await planItem(cardItem(["front", "inside-left", "back"]), []);
    expect(state.uploads).toHaveLength(0);
    expect(plan.issues).toEqual([expect.objectContaining({ severity: "blocker", code: "design_missing", message: expect.stringContaining("inside-right") })]);
  });
});
