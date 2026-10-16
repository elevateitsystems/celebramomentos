import { z } from "zod";

export const adminLoginSchema = z.object({ email: z.string().email(), password: z.string().min(8).max(200) });
export const productSchema = z.object({
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),
  name: z.string().min(2).max(160),
  description: z.string().max(5000).optional().nullable(),
  kind: z.enum(["POSTCARD", "CALENDAR", "WALL_ART", "MAGNET", "PHONE_CASE", "MUG", "STICKER"]),
  basePriceCents: z.number().int().nonnegative(),
  categoryId: z.string().cuid().optional().nullable(),
  active: z.boolean().optional(),
  featured: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional().nullable(),
});
export const checkoutSchema = z.object({
  email: z.string().email(),
  currency: z.string().length(3).default("eur"),
  shippingAddress: z.object({ name: z.string().min(2), phone: z.string().min(7), address: z.string().min(5), city: z.string().min(2), postalCode: z.string().min(4), country: z.enum(["ES", "PT"]) }),
  items: z.array(z.object({ productId: z.string().cuid().optional(), variantId: z.string().cuid().optional(), templateId: z.string().cuid().optional(), quantity: z.number().int().min(1).max(99), personalization: z.record(z.unknown()).optional() })).min(1),
  shippingMethodId: z.string().cuid().optional(),
  discountCode: z.string().max(40).optional(),
});
export const uploadSchema = z.object({ fileName: z.string().min(1).max(255), mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]), sizeBytes: z.number().int().positive().max(10 * 1024 * 1024), kind: z.enum(["PRODUCT_IMAGE", "TEMPLATE_IMAGE", "CUSTOMER_UPLOAD", "BANNER", "OTHER"]) });
