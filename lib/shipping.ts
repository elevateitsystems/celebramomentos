import type { DeliveryMethod } from "./data";

// Delivery rates are stored in the ShippingMethod table and edited in admin
// Settings. These defaults only apply until the stored rates have loaded.
export type DeliveryRate = { priceCents: number; freeFromCents: number | null };
export type DeliveryRates = Record<DeliveryMethod, DeliveryRate>;

export const DEFAULT_DELIVERY_RATES: DeliveryRates = {
  standard: { priceCents: 500, freeFromCents: 3500 },
  express: { priceCents: 800, freeFromCents: 3500 },
};

export function qualifiesForFreeShipping(rates: DeliveryRates, method: DeliveryMethod, merchandiseCents: number) {
  const threshold = rates[method].freeFromCents;
  return threshold !== null && merchandiseCents >= threshold;
}

export function getDeliveryPriceCents(rates: DeliveryRates, method: DeliveryMethod, merchandiseCents: number) {
  return qualifiesForFreeShipping(rates, method, merchandiseCents) ? 0 : rates[method].priceCents;
}

export function amountUntilFreeShippingCents(rates: DeliveryRates, method: DeliveryMethod, merchandiseCents: number) {
  const threshold = rates[method].freeFromCents;
  return threshold === null ? null : Math.max(0, threshold - merchandiseCents);
}
