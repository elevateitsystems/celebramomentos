import { z } from "zod";
import { CARD_SIZE_IDS } from "@/lib/data";
import { CARD_TEMPLATE_SLUGS, MAX_PRODUCT_PHOTOS, POD_PROVIDERS, PRODUCT_KINDS } from "@/lib/products";

export const adminLoginSchema = z.object({ email: z.string().email(), password: z.string().min(8).max(200) });
export const customerRegisterSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().email().max(160),
  password: z.string().min(6).max(200),
});
export const customerLoginSchema = z.object({
  email: z.string().email().max(160),
  password: z.string().min(6).max(200),
});
export const customerProfileSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  email: z.string().email().max(160).optional(),
  phone: z.string().min(7).max(40).optional().nullable(),
  password: z.string().min(6).max(200).optional(),
});
export const cartLineSchema = z.object({
  id: z.string().min(1).max(80).optional(),
  quantity: z.number().int().min(1).max(99).default(1),
  productId: z.string().cuid().optional().nullable(),
  // Admin-created catalog products. Name, detail and price are display snapshots that the server recomputes.
  // Unknown keys (e.g. the retired sticker/envelope/packaging extras) are stripped by zod.
  product: z.object({
      kind: z.literal("CATALOG"),
      productKind: z.enum(["WALL_ART", "MAGNET", "PHONE_CASE", "MUG", "CALENDAR"]),
      productId: z.string().cuid(),
      variantId: z.string().cuid().nullable(),
      options: z.record(z.string().max(40), z.string().max(160)).refine((value) => Object.keys(value).length <= 20, "Too many options"),
      photos: z.array(z.string().nullable()).max(MAX_PRODUCT_PHOTOS),
      name: z.string().max(200),
      detail: z.string().max(400),
      image: z.string().max(2000).nullable(),
      priceCents: z.number().int().nonnegative(),
  }).optional().nullable(),
  productPriceCents: z.number().int().nonnegative().optional().nullable(),
  productName: z.string().max(200).optional().nullable(),
  card: z.object({
    categoryId: z.string(),
    templateId: z.string().min(1).max(100),
    frameId: z.string().nullable(),
    message: z.string().max(4000),
    frontHeadline: z.string().max(4000),
    frontSubheadline: z.string().max(4000),
    insideLeftText: z.string().max(8000),
    insideRightText: z.string().max(8000),
    backText: z.string().max(4000),
    emoji: z.string().max(32),
    emojiTone: z.string(),
    emojiSize: z.number(),
    emojiPosition: z.record(z.unknown()),
    emojiElements: z.array(z.unknown()),
    photoDataUrl: z.string().nullable(),
    photoDataUrls: z.array(z.string().nullable()),
    photoZoom: z.number(),
    photoPosition: z.string(),
    size: z.enum(CARD_SIZE_IDS),
    delivery: z.enum(["standard", "express"]),
    recipientMode: z.enum(["recipient", "customer"]),
    magazineDate: z.string().optional(),
    magazineCategory: z.string().optional(),
    magazineBadge: z.string().optional(),
    magazineHeadlineTag: z.string().optional(),
    magazineFooter: z.string().optional(),
  }),
});
export const cartQuantitySchema = z.object({ id: z.string().min(1), quantity: z.number().int().min(1).max(99) });
export const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().email().max(160),
  subject: z.string().trim().min(3).max(200),
  message: z.string().trim().min(10).max(600),
});
export const customerCheckoutSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().min(7).max(40),
  recipient: z.string().min(2).max(120),
  address: z.string().min(5).max(300),
  city: z.string().min(2).max(120),
  postalCode: z.string().min(4).max(20),
  country: z.enum(["ES", "PT"]),
  billingAddress: z.string().max(300).optional(),
  payment: z.enum(["card", "paypal"]),
  discountCode: z.string().max(40).optional(),
});
export const adminOrderStatusSchema = z.object({ status: z.enum(["PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"]) });
export const adminMessageReplySchema = z.object({ text: z.string().trim().min(1).max(2000) });
export const productVariantSchema = z.object({
  id: z.string().cuid().optional(),
  name: z.string().trim().min(1).max(80),
  priceCents: z.number().int().nonnegative(),
  // Photos the customer uploads for this size (e.g. 3 for a pack of 3 magnets).
  photoCount: z.number().int().min(1).max(MAX_PRODUCT_PHOTOS).nullable().optional(),
  // Print shop SKU and provider for fulfilment.
  podSku: z.string().trim().max(120).nullable().optional(),
  provider: z.enum(POD_PROVIDERS).nullable().optional(),
});
export const productOptionSchema = z.object({
  name: z.string().trim().min(1).max(60),
  choices: z.array(z.string().trim().min(1).max(80)).min(1).max(30),
  required: z.boolean().optional(),
});
export const productSchema = z.object({
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),
  name: z.string().trim().min(2).max(160),
  description: z.string().max(5000).optional().nullable(),
  kind: z.enum(PRODUCT_KINDS),
  basePriceCents: z.number().int().nonnegative(),
  categoryId: z.string().cuid().optional().nullable(),
  active: z.boolean().optional(),
  featured: z.boolean().optional(),
  imageAssetId: z.string().cuid().nullable().optional(),
  metadata: z.object({
    // Cards only: which of the three Card templates the product opens in.
    templateSlug: z.enum(CARD_TEMPLATE_SLUGS).optional(),
    // Non-card products: how many customer photos the product needs.
    photoCount: z.number().int().min(1).max(MAX_PRODUCT_PHOTOS).optional(),
    // Print shop that fulfils the product (Prodigi, Printful, Gelato, Alerio Print).
    provider: z.enum(POD_PROVIDERS).optional(),
  }).strict().optional().nullable(),
  variants: z.array(productVariantSchema).max(30).optional(),
  options: z.array(productOptionSchema).max(10).optional(),
});
export const templateSchema = z.object({
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),
  name: z.string().trim().min(2).max(160),
  type: z.string().min(2).max(40),
  description: z.string().max(5000).nullable().optional(),
  imageCount: z.number().int().min(0).max(20),
  priceCents: z.number().int().nonnegative(),
  active: z.boolean().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
});
export const settingSchema = z.object({ key: z.string().trim().min(1).max(120), value: z.string().max(5000), isSecret: z.boolean().optional() });
export const discountSchema = z.object({ code: z.string().trim().min(3).max(40).regex(/^[a-zA-Z0-9_-]+$/), percentage: z.number().int().min(1).max(100).optional().nullable(), amountCents: z.number().int().nonnegative().optional().nullable(), minOrderCents: z.number().int().nonnegative().optional().nullable(), maxUses: z.number().int().positive().optional().nullable(), expiresAt: z.string().datetime().optional().nullable(), active: z.boolean().optional() }).refine((data) => Boolean(data.percentage) !== Boolean(data.amountCents), { message: "Set either percentage or amountCents" });
export const checkoutSchema = z.object({
  email: z.string().email(),
  currency: z.string().length(3).default("eur"),
  shippingAddress: z.object({ name: z.string().min(2), phone: z.string().min(7), address: z.string().min(5), city: z.string().min(2), postalCode: z.string().min(4), country: z.enum(["ES", "PT"]) }),
  items: z.array(z.object({ productId: z.string().cuid().optional(), variantId: z.string().cuid().optional(), templateId: z.string().cuid().optional(), quantity: z.number().int().min(1).max(99), personalization: z.record(z.unknown()).optional() })).min(1),
  shippingMethodId: z.string().cuid().optional(),
  discountCode: z.string().max(40).optional(),
});
export const uploadSchema = z.object({ fileName: z.string().min(1).max(255), mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]), sizeBytes: z.number().int().positive().max(10 * 1024 * 1024), kind: z.enum(["PRODUCT_IMAGE", "TEMPLATE_IMAGE", "CUSTOMER_UPLOAD", "BANNER", "OTHER"]) });
const deliveryRateSchema = z.object({ priceCents: z.number().int().min(0).max(100_000), freeFromCents: z.number().int().min(0).max(10_000_000).nullable() });
export const deliveryRatesSchema = z.object({ standard: deliveryRateSchema, express: deliveryRateSchema });
