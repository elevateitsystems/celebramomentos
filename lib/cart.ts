import { ENVELOPE_TEXT_PRICE, MAGNET_SAMPLE_PHOTOS, PACKAGING_PRICES, SIZE_PRICES, STICKER_PRICES, WALL_ART_IMAGE, WALL_ART_SIZES, getProductPreviewImage, wallArtSizeText } from "./data";
import { PRODUCT_KIND_INFO } from "./products";
import type { CartItem, ProductSelection } from "./store";

export function getCartItemExtrasTotal(item: CartItem) {
  if (item.product) return 0;
  return PACKAGING_PRICES[item.card.packaging] + SIZE_PRICES[item.card.size] + STICKER_PRICES[item.stickerQuantity] + (item.envelopeTextAdded ? ENVELOPE_TEXT_PRICE : 0);
}

export function getCartItemUnitTotal(item: CartItem, templatePrice: number) {
  if (item.product) return item.product.priceCents / 100;
  const basePrice = item.productPriceCents != null ? item.productPriceCents / 100 : templatePrice;
  return basePrice + getCartItemExtrasTotal(item);
}

export function getCartItemMerchandiseTotal(item: CartItem, templatePrice: number) {
  return getCartItemUnitTotal(item, templatePrice) * item.quantity;
}

export function describeProductSelection(product: ProductSelection, es = true) {
  if (product.kind === "CATALOG") {
    const info = PRODUCT_KIND_INFO[product.productKind];
    return {
      eyebrow: (es ? info.es : info.pt).toUpperCase(),
      name: product.name,
      detail: product.detail,
      image: product.photos.find(Boolean) || product.image || getProductPreviewImage(product.productKind),
      editHref: `${info.path}?product=${encodeURIComponent(product.productId)}`,
    };
  }
  if (product.kind === "WALL_ART") {
    const size = WALL_ART_SIZES.find((option) => option.id === product.sizeId);
    return {
      eyebrow: es ? "ARTE DE PARED" : "ARTE DE PAREDE",
      name: es ? "Arte de pared enmarcado" : "Arte de parede emoldurado",
      detail: size ? wallArtSizeText(size) : product.sizeId,
      image: product.photos[0] || WALL_ART_IMAGE,
      editHref: "/wall-art",
    };
  }
  const shape = product.shape === "round" ? (es ? "redondos" : "redondos") : (es ? "cuadrados" : "quadrados");
  return {
    eyebrow: es ? "IMANES" : "ÍMANES",
    name: es ? `Imanes personalizados (${product.packSize})` : `Ímanes personalizados (${product.packSize})`,
    detail: `${product.packSize} × 6 cm · ${shape}`,
    image: product.photos.find(Boolean) || MAGNET_SAMPLE_PHOTOS[0],
    editHref: "/magnets",
  };
}
