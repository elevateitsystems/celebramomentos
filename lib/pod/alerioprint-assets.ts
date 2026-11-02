// AlerioPrint products (GET /api/external/products, checked 2026-11-01) and their
// phone model ("asset") ids.
//
// TODO(AlerioPrint): every order line needs `productAssetId` — the id of the phone
// model inside the product — but the documented External API
// (https://create.alerioprint.com/backend/api/docs/external-api.yaml) has no endpoint
// that lists asset ids (`/products` only returns `assetCount`, `/price-check` matches
// assets by title). Ask AlerioPrint for the asset id list (or an endpoint) and fill the
// maps below, keyed by the exact model name the storefront sells (the "Modelo" choices).
// Until a model is listed here its orders stop with "AlerioPrint model id missing" in
// admin → Print orders instead of being sent.
export const ALERIO_PRODUCTS = {
  clear: { productId: 102, title: "TPU / Gel Phone Case", printWidth: 750, printHeight: 1590 },
  magsafe: { productId: 338, title: "MagSafe Clear Case", printWidth: 750, printHeight: 1589 },
  tough: { productId: 332, title: "Tough Case", printWidth: 2000, printHeight: 3400 },
} as const;

export type AlerioCaseType = keyof typeof ALERIO_PRODUCTS;

export const ALERIO_ASSET_IDS: Record<AlerioCaseType, Record<string, number>> = {
  clear: {},
  magsafe: {},
  tough: {},
};
