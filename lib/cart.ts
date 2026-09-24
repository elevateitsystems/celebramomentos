import { ENVELOPE_TEXT_PRICE, PACKAGING_PRICES, SIZE_PRICES, STICKER_PRICES } from "./data";
import type { CartItem } from "./store";

export function getCartItemExtrasTotal(item: CartItem) {
  return PACKAGING_PRICES[item.card.packaging] + SIZE_PRICES[item.card.size] + STICKER_PRICES[item.stickerQuantity] + (item.envelopeTextAdded ? ENVELOPE_TEXT_PRICE : 0);
}

export function getCartItemUnitTotal(item: CartItem, templatePrice: number) {
  return templatePrice + getCartItemExtrasTotal(item);
}

export function getCartItemMerchandiseTotal(item: CartItem, templatePrice: number) {
  return getCartItemUnitTotal(item, templatePrice) * item.quantity;
}
