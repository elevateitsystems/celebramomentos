import type { DeliveryMethod } from "./data";

export const FREE_SHIPPING_THRESHOLD = 35;

export const DELIVERY_PRICES: Record<DeliveryMethod, number> = {
  standard: 5,
  express: 8,
};

export function qualifiesForFreeShipping(merchandiseTotal: number) {
  return merchandiseTotal >= FREE_SHIPPING_THRESHOLD;
}

export function getDeliveryPrice(method: DeliveryMethod, merchandiseTotal: number) {
  if (qualifiesForFreeShipping(merchandiseTotal)) return 0;
  return DELIVERY_PRICES[method];
}

export function amountUntilFreeShipping(merchandiseTotal: number) {
  return Math.max(0, FREE_SHIPPING_THRESHOLD - merchandiseTotal);
}
