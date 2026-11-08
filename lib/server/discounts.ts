// The single authority on discount codes. Only codes that exist in the Discount table (created
// and managed in the admin dashboard) are accepted, and every amount is calculated here, on the
// server, from the database: the browser only ever sends the code text.
//
// Used by the quote endpoint (what the cart and checkout pages show), by the order creation
// (what is charged, inside a transaction) and, through the order, by Stripe and PayPal.
import { createHash } from "crypto";
import type { Discount, Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

// Stripe cannot charge less than €0.50, so a code may not bring an order below it.
export const MIN_CHARGE_CENTS = 50;
// An unpaid order holds a usage of a limited code for this long (abandoned checkouts free it).
const PENDING_HOLD_MS = 60 * 60 * 1000;
const COUNTED_STATUSES = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as const;

export type DiscountFailure = "not_found" | "expired" | "min_order" | "exhausted" | "too_small" | "rate_limited";
export type DiscountVerdict =
  | { ok: true; code: string; discount: Discount; discountCents: number }
  | { ok: false; code: string; reason: DiscountFailure; message: string };

export const normalizeDiscountCode = (value: string | null | undefined) => (value || "").trim().toUpperCase();
const euros = (cents: number) => `${(cents / 100).toFixed(2).replace(".", ",")} €`;

const fail = (code: string, reason: DiscountFailure, message: string): DiscountVerdict => ({ ok: false, code, reason, message });

// Disabled and unknown codes get the same answer, so codes cannot be probed.
export const DISCOUNT_MESSAGES = {
  not_found: "Este código de descuento no es válido.",
  expired: "Este código de descuento ha caducado.",
  exhausted: "Este código de descuento ya ha alcanzado su límite de usos.",
  rate_limited: "Demasiados intentos. Espera un minuto antes de probar otro código.",
} as const;

// Amount taken off. Percentage codes apply to products + delivery; fixed codes to products only
// (as the shop has always done). Never more than what is being paid.
export function discountAmountCents(discount: Pick<Discount, "percentage" | "amountCents">, subtotalCents: number, shippingCents: number) {
  const payable = subtotalCents + shippingCents;
  const raw = discount.percentage ? Math.floor((payable * discount.percentage) / 100) : Math.min(discount.amountCents || 0, subtotalCents);
  return Math.max(0, Math.min(raw, payable));
}

// How many times a code counts as used right now: paid orders, plus recent unpaid ones from
// other customers (a customer retrying their own checkout does not block themselves).
async function usesOf(db: Db, discount: Discount, customerId?: string | null) {
  const live = await db.discountUsage.count({
    where: {
      discountId: discount.id,
      order: { OR: [
        { status: { in: [...COUNTED_STATUSES] } },
        { status: "PENDING", createdAt: { gte: new Date(Date.now() - PENDING_HOLD_MS) }, ...(customerId ? { NOT: { customerId } } : {}) },
      ] },
    },
  });
  return Math.max(discount.usedCount, live);
}

export async function evaluateDiscount(db: Db, input: string | null | undefined, order: { subtotalCents: number; shippingCents: number; customerId?: string | null }): Promise<DiscountVerdict> {
  const code = normalizeDiscountCode(input);
  if (!code) return fail(code, "not_found", DISCOUNT_MESSAGES.not_found);
  const discount = await db.discount.findUnique({ where: { code } });
  if (!discount || !discount.active || (!discount.percentage && !discount.amountCents)) return fail(code, "not_found", DISCOUNT_MESSAGES.not_found);
  if (discount.expiresAt && discount.expiresAt <= new Date()) return fail(code, "expired", DISCOUNT_MESSAGES.expired);
  if (discount.minOrderCents && order.subtotalCents < discount.minOrderCents) return fail(code, "min_order", `Este código requiere un pedido mínimo de ${euros(discount.minOrderCents)} en productos.`);
  if (discount.maxUses && (await usesOf(db, discount, order.customerId)) >= discount.maxUses) return fail(code, "exhausted", DISCOUNT_MESSAGES.exhausted);
  const discountCents = discountAmountCents(discount, order.subtotalCents, order.shippingCents);
  if (order.subtotalCents + order.shippingCents - discountCents < MIN_CHARGE_CENTS) return fail(code, "too_small", `Este código no se puede aplicar a este pedido: el total no puede ser inferior a ${euros(MIN_CHARGE_CENTS)}.`);
  return { ok: true, code, discount, discountCents };
}

// What the browser may know about a verdict (never the usage counters or limits).
export function publicVerdict(verdict: DiscountVerdict) {
  return verdict.ok
    ? { code: verdict.code, valid: true as const, discountCents: verdict.discountCents, percentage: verdict.discount.percentage, amountCents: verdict.discount.amountCents }
    : { code: verdict.code, valid: false as const, reason: verdict.reason, message: verdict.message };
}

// ── Guessing protection ──
// Failed lookups are limited per client. Best effort: the counters live in this server
// instance's memory (on serverless each instance counts separately), which still stops a
// script hammering one instance; codes also cannot be told apart from disabled ones.
const FAILURE_LIMIT = 10;
const FAILURE_WINDOW_MS = 60_000;
const failures = new Map<string, { count: number; resetAt: number }>();

export const clientKey = (request: Request) => createHash("sha256").update(request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown").digest("hex").slice(0, 16);
export function discountAttemptsBlocked(key: string, now = Date.now()) {
  const entry = failures.get(key);
  return Boolean(entry && entry.resetAt > now && entry.count >= FAILURE_LIMIT);
}
export function recordDiscountFailure(key: string, now = Date.now()) {
  if (failures.size > 5000) for (const [stored, entry] of failures) if (entry.resetAt <= now) failures.delete(stored);
  const entry = failures.get(key);
  if (!entry || entry.resetAt <= now) failures.set(key, { count: 1, resetAt: now + FAILURE_WINDOW_MS });
  else entry.count += 1;
}
export const resetDiscountAttempts = () => failures.clear();
