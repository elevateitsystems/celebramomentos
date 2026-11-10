import { beforeEach, describe, expect, it, vi } from "vitest";

// A Printeers phone case ordered with a small photo (427 × 585 px, the reported case): it is held for an
// admin unless the customer confirmed the quality warning in the studio, in which case it is sent.
const CLOUD = "https://res.cloudinary.com/celebra/image/upload/";
const PHOTO = `${CLOUD}v1/celebramomentos/customer_upload/photo.jpg`;
const state = vi.hoisted(() => ({ photo: { width: 427, height: 585 } }));

vi.mock("@/lib/server/prisma", () => ({ prisma: {
  productVariant: { findUnique: async () => null },
  asset: {
    findMany: async ({ where }: { where: { url: { in: string[] } } }) => where.url.in.filter((url) => url === PHOTO).map((url) => ({ url, kind: "CUSTOMER_UPLOAD", mimeType: "image/jpeg", metadata: state.photo })),
    upsert: async () => ({}),
  },
} }));
vi.mock("@/lib/server/cloudinary", () => ({
  cloudinaryObjectKey: (id: string) => `cloudinary:${id}`,
  uploadRemoteImageToCloudinary: async ({ publicId }: { publicId: string }) => ({ secureUrl: `${CLOUD}v2/celebramomentos/print_file/o1/${publicId}.jpg`, publicId: `celebramomentos/print_file/o1/${publicId}`, width: 827, height: 1724, bytes: 400_000, format: "jpg", version: 2 }),
}));

import { planItem } from "@/lib/pod/fulfillment";
import { cartLineSchema } from "@/lib/server/validation";
import { defaultCardCustomization } from "@/lib/store";

const caseItem = (qualityAccepted?: boolean) => ({
  id: "item1", orderId: "o1", name: "Funda transparente · Apple iPhone XR", quantity: 1, variantId: null, productId: null, templateId: null, unitPriceCents: 2199, createdAt: new Date(),
  podFulfillmentId: null, podProvider: null, podProductRef: null, podArtwork: null, podIssues: null,
  personalization: { product: { kind: "CATALOG", productKind: "PHONE_CASE", provider: "PRINTEERS", name: "Funda transparente", photos: [PHOTO], options: {}, printeers: { productReference: "B12340000", printMm: { width: 70, height: 146 }, crop: { zoom: 1, x: 0.5, y: 0.5 } }, ...(qualityAccepted === undefined ? {} : { qualityAccepted }) } },
}) as never;

beforeEach(() => { state.photo = { width: 427, height: 585 }; });

describe("Printeers phone case with a small photo", () => {
  it("is held for an admin when the customer did not confirm the quality warning", async () => {
    const plan = await planItem(caseItem(), []);
    expect(plan.provider).toBe("PRINTEERS");
    expect(plan.issues).toEqual([expect.objectContaining({ code: "low_resolution", severity: "warning" })]);
  });

  it("is sent automatically (only a note for the admin) when the customer confirmed it", async () => {
    const plan = await planItem(caseItem(true), []);
    expect(plan.issues).toEqual([expect.objectContaining({ code: "low_resolution", severity: "info" })]);
    expect(plan.artwork[0]).toMatchObject({ source: "design", width: 827, height: 1724, verified: { width: 827, height: 1724 } });
  });

  it("is still held when the photo is far too small, whatever the browser sent", async () => {
    state.photo = { width: 181, height: 238 };
    const plan = await planItem(caseItem(true), []);
    expect(plan.issues).toEqual([expect.objectContaining({ code: "low_resolution", severity: "warning" })]);
  });

  it("keeps the confirmation through the checkout schema (and only as a boolean)", () => {
    const line = (qualityAccepted: unknown) => ({ quantity: 1, card: defaultCardCustomization(), product: { kind: "CATALOG", productKind: "PHONE_CASE", productId: "cmvrppz42000ht6jqldnsmj2f", variantId: null, options: {}, photos: [PHOTO], name: "Funda", detail: "", image: null, priceCents: 2199, qualityAccepted } });
    const parsed = cartLineSchema.safeParse(line(true));
    expect(parsed.success && parsed.data.product?.qualityAccepted).toBe(true);
    expect(cartLineSchema.safeParse(line("yes")).success).toBe(false);
  });
});
