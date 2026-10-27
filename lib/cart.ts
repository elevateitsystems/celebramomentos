import { getProductPreviewImage, type CardSize } from "./data";
import { PRODUCT_KIND_INFO } from "./products";
import type { CartItem, ProductSelection } from "./store";

// Local estimate of a line's unit price, used until the server quote arrives.
// Cards: template (or Card product) price + the card size price from Settings.
export function getCartItemUnitTotal(item: CartItem, templatePrice: number, cardSizePrices?: Record<CardSize, number>) {
  if (item.product) return item.product.priceCents / 100;
  const basePrice = item.productPriceCents != null ? item.productPriceCents / 100 : templatePrice;
  return basePrice + (cardSizePrices?.[item.card.size] ?? 0) / 100;
}

export function describeProductSelection(product: ProductSelection, es = true) {
  const info = PRODUCT_KIND_INFO[product.productKind] ?? PRODUCT_KIND_INFO.POSTCARD;
  return {
    eyebrow: (es ? info.es : info.pt).toUpperCase(),
    name: product.name,
    detail: product.detail,
    image: product.photos.find(Boolean) || product.image || getProductPreviewImage(product.productKind),
    editHref: `${info.path}?product=${encodeURIComponent(product.productId)}`,
  };
}
