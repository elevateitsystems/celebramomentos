import type { DeliveryMethod } from "./data";

export const FREE_SHIPPING_THRESHOLD = 35;

export const DELIVERY_PRICES_WITHOUT_CHOCOLATE: Record<DeliveryMethod, number> = {
  standard: 5,
  express: 8,
};

export const DELIVERY_PRICES_WITH_CHOCOLATE: Record<DeliveryMethod, number> = {
  standard: 7,
  express: 8,
};

export function qualifiesForFreeShipping(merchandiseTotal: number) {
  return merchandiseTotal >= FREE_SHIPPING_THRESHOLD;
}

export function getDeliveryPrice(method: DeliveryMethod, merchandiseTotal: number, hasChocolate: boolean = false) {
  if (qualifiesForFreeShipping(merchandiseTotal)) return 0;
  const table = hasChocolate ? DELIVERY_PRICES_WITH_CHOCOLATE : DELIVERY_PRICES_WITHOUT_CHOCOLATE;
  return table[method];
}

export function amountUntilFreeShipping(merchandiseTotal: number) {
  return Math.max(0, FREE_SHIPPING_THRESHOLD - merchandiseTotal);
}
