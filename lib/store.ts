"use client";

import { configureStore, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { CARD_SIZE_IDS, DEFAULT_CARD_SIZE, type CardSize, type DeliveryMethod, type DesignCategoryId, type RecipientMode } from "./data";
import type { StudioProductKind } from "./products";
import { defaultEmojiPosition, type EmojiElement, type EmojiPosition, type EmojiTone } from "./emojis";

export type CardCustomization = {
    categoryId: DesignCategoryId;
    templateId: string;
    frameId: string | null;
    message: string;
    frontHeadline: string;
    frontSubheadline: string;
    insideLeftText: string;
    insideRightText: string;
    backText: string;
    emoji: string;
    emojiTone: EmojiTone;
    emojiSize: number;
    emojiPosition: EmojiPosition;
    emojiElements: EmojiElement[];
    photoDataUrl: string | null;
    photoDataUrls: (string | null)[];
    photoZoom: number;
    photoPosition: "center" | "top" | "bottom" | "left" | "right";
    size: CardSize;
    delivery: DeliveryMethod;
    recipientMode: RecipientMode;
    magazineDate?: string;
    magazineCategory?: string;
    magazineBadge?: string;
    magazineHeadlineTag?: string;
    magazineFooter?: string;
};

// Studio products (every category except Cards) are admin-created catalog
// products. They reuse the cart line but carry their own options instead of a
// postcard design.
// priceCents, name and detail are display snapshots only; the server always
// recalculates them from the database.
export type CatalogSelection = {
  kind: "CATALOG";
  productKind: StudioProductKind;
  productId: string;
  variantId: string | null;
  options: Record<string, string>;
  photos: (string | null)[];
  name: string;
  detail: string;
  image: string | null;
  priceCents: number;
  // Set by the server for fulfilment: the print shop and its SKU for the chosen size.
  provider?: string | null;
  sku?: string | null;
};
export type ProductSelection = CatalogSelection;

export type CartItem = {
  id: string;
  quantity: number;
  productId?: string | null;
  product?: ProductSelection | null;
  // Cards created from an admin product: display snapshot of the product price/name.
  productPriceCents?: number | null;
  productName?: string | null;
  card: CardCustomization;
};

export type CartItemDraft = Omit<CartItem, "id" | "quantity"> & { id?: string; quantity?: number };

export type CartState = {
  card: CardCustomization;
  items: CartItem[];
  discountCode: string;
};

export type LanguageState = { language: "es" | "pt" };

const initialState: CartState = {
  card: {
    categoryId: "especial",
    templateId: "template-3",
    frameId: "floral",
    message: "Enhorabuena",
    frontHeadline: "Enhorabuena",
    frontSubheadline: "",
    insideLeftText: "Escribe aquí tu dedicatoria personal.",
    insideRightText: "Con todo mi cariño.",
    backText: "Hecha especialmente para ti.",
    emoji: "",
    emojiTone: "natural",
    emojiSize: 32,
    emojiPosition: defaultEmojiPosition,
    emojiElements: [],
    photoDataUrl: null,
    photoDataUrls: [null, null, null, null],
    photoZoom: 1,
    photoPosition: "center",
    size: DEFAULT_CARD_SIZE,
    delivery: "standard",
    recipientMode: "recipient",
    magazineDate: "26 SEPTIEMBRE 2026 • Nº 01",
    magazineCategory: "LA NOTICIA DEL DÍA",
    magazineBadge: "¡FELIZ CUMPLEAÑOS!",
    magazineHeadlineTag: "¡Atención!",
    magazineFooter: "ROBERTO GARCÍA CELEBRA CON SU FAMILIA",
  },
  items: [],
  discountCode: "",
};

const cloneCard = (card: CardCustomization): CardCustomization => ({
  ...card,
  size: (CARD_SIZE_IDS as string[]).includes(card.size) ? card.size : DEFAULT_CARD_SIZE,
  emojiPosition: { ...(card.emojiPosition || defaultEmojiPosition) },
  emojiElements: Array.isArray(card.emojiElements) ? card.emojiElements.map((item) => ({ ...item, position: { ...item.position } })) : [],
  photoDataUrls: Array.isArray(card.photoDataUrls) ? [...card.photoDataUrls] : [],
});

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    setCardCategory: (state, action: PayloadAction<DesignCategoryId>) => { state.card.categoryId = action.payload; },
    setTemplate: (state, action: PayloadAction<string>) => { state.card.templateId = action.payload; },
    setFrame: (state, action: PayloadAction<string | null>) => { state.card.frameId = action.payload; },
    setMessage: (state, action: PayloadAction<string>) => {
      state.card.message = action.payload;
      state.card.frontHeadline = action.payload;
    },
    setFrontHeadline: (state, action: PayloadAction<string>) => {
      state.card.frontHeadline = action.payload;
      state.card.message = action.payload;
    },
    setFrontSubheadline: (state, action: PayloadAction<string>) => { state.card.frontSubheadline = action.payload; },
    setInsideLeftText: (state, action: PayloadAction<string>) => { state.card.insideLeftText = action.payload; },
    setInsideRightText: (state, action: PayloadAction<string>) => { state.card.insideRightText = action.payload; },
    setBackText: (state, action: PayloadAction<string>) => { state.card.backText = action.payload; },
    setEmoji: (state, action: PayloadAction<string>) => { state.card.emoji = action.payload; if (state.card.emojiElements[0]) state.card.emojiElements[0].emoji = action.payload; },
    setEmojiTone: (state, action: PayloadAction<EmojiTone>) => { state.card.emojiTone = action.payload; if (state.card.emojiElements[0]) state.card.emojiElements[0].tone = action.payload; },
    setEmojiSize: (state, action: PayloadAction<number>) => { const size = Math.min(96, Math.max(14, action.payload)); state.card.emojiSize = size; if (state.card.emojiElements[0]) state.card.emojiElements[0].size = size; },
    setEmojiPosition: (state, action: PayloadAction<EmojiPosition>) => { state.card.emojiPosition = action.payload; if (state.card.emojiElements[0]) state.card.emojiElements[0].position = action.payload; },
    addEmojiElement: (state, action: PayloadAction<EmojiElement>) => { state.card.emojiElements.push(action.payload); },
    setEmojiElements: (state, action: PayloadAction<EmojiElement[]>) => { state.card.emojiElements = action.payload; },
    updateEmojiElement: (state, action: PayloadAction<{ id: string; changes: Partial<Omit<EmojiElement, "id">> }>) => { const item = state.card.emojiElements.find((element) => element.id === action.payload.id); if (item) Object.assign(item, action.payload.changes); },
    removeEmojiElement: (state, action: PayloadAction<string>) => { state.card.emojiElements = state.card.emojiElements.filter((element) => element.id !== action.payload); },
    setPhoto: (state, action: PayloadAction<string | null>) => { state.card.photoDataUrl = action.payload; state.card.photoDataUrls[0] = action.payload; },
    setPhotoAt: (state, action: PayloadAction<{ index: number; dataUrl: string | null }>) => { state.card.photoDataUrls[action.payload.index] = action.payload.dataUrl; if (action.payload.index === 0) state.card.photoDataUrl = action.payload.dataUrl; },
    setPhotoSlots: (state, action: PayloadAction<number>) => { state.card.photoDataUrls = Array.from({ length: action.payload }, (_, index) => state.card.photoDataUrls[index] || null); state.card.photoDataUrl = state.card.photoDataUrls[0] || null; },
    setPhotoZoom: (state, action: PayloadAction<number>) => { state.card.photoZoom = action.payload; },
    setPhotoPosition: (state, action: PayloadAction<"center" | "top" | "bottom" | "left" | "right">) => { state.card.photoPosition = action.payload; },
    setSize: (state, action: PayloadAction<CardSize>) => { state.card.size = action.payload; },
    setDelivery: (state, action: PayloadAction<DeliveryMethod>) => { state.card.delivery = action.payload; },
    setRecipientMode: (state, action: PayloadAction<RecipientMode>) => { state.card.recipientMode = action.payload; },
    setMagazineDate: (state, action: PayloadAction<string>) => { state.card.magazineDate = action.payload; },
    setMagazineCategory: (state, action: PayloadAction<string>) => { state.card.magazineCategory = action.payload; },
    setMagazineBadge: (state, action: PayloadAction<string>) => { state.card.magazineBadge = action.payload; },
    setMagazineHeadlineTag: (state, action: PayloadAction<string>) => { state.card.magazineHeadlineTag = action.payload; },
    setMagazineFooter: (state, action: PayloadAction<string>) => { state.card.magazineFooter = action.payload; },
    setDiscountCode: (state, action: PayloadAction<string>) => { state.discountCode = action.payload; },
    resetCurrentDraft: (state) => {
      state.card = cloneCard(initialState.card);
    },
    saveCartItem: (state, action: PayloadAction<CartItemDraft>) => {
      const id = action.payload.id || `cart-item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const item: CartItem = {
        id,
        quantity: Math.max(1, action.payload.quantity || 1),
        productId: action.payload.productId || null,
        product: action.payload.product ? { ...action.payload.product, photos: [...action.payload.product.photos] } : null,
        productPriceCents: action.payload.productPriceCents ?? null,
        productName: action.payload.productName ?? null,
        card: cloneCard(action.payload.card),
      };
      const existingIndex = state.items.findIndex((current) => current.id === id);
      if (existingIndex >= 0) state.items[existingIndex] = item;
      else state.items.push(item);
    },
    loadCartItem: (state, action: PayloadAction<string>) => {
      const item = state.items.find((current) => current.id === action.payload);
      if (!item) return;
      state.card = cloneCard(item.card);
    },
    setCartItemQuantity: (state, action: PayloadAction<{ id: string; quantity: number }>) => {
      const item = state.items.find((current) => current.id === action.payload.id);
      if (item) item.quantity = Math.max(1, Math.min(99, action.payload.quantity));
    },
    removeCartItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((item) => item.id !== action.payload);
    },
    clearCartItems: (state) => { state.items = []; },
    setAllItemsDelivery: (state, action: PayloadAction<DeliveryMethod>) => {
      state.card.delivery = action.payload;
      state.items.forEach((item) => { item.card.delivery = action.payload; });
    },
    hydrateCart: (state, action: PayloadAction<CartState>) => {
      const savedCard = action.payload?.card || state.card;
      const card = cloneCard(cleanCard({ ...state.card, ...savedCard, frameId: savedCard.frameId === "romantic-red" ? "geometric-heart" : savedCard.frameId }));
      // Remove the old built-in graduation-cap emoji from carts saved before
      // emojis became optional. User-added emojis remain untouched.
      if (card.emoji === "🎓") card.emoji = "";
      card.emojiElements = (Array.isArray(card.emojiElements) ? card.emojiElements : []).filter((item) => !(item.id === "emoji-initial" && item.emoji === "🎓"));
      card.photoDataUrls = Array.isArray(card.photoDataUrls) ? card.photoDataUrls : [card.photoDataUrl || null];
      // Saved carts may come from older versions: drop retired extras (stickers,
      // envelope text, gift packaging) and the old built-in Wall Art/Magnet lines,
      // which are no longer sold.
      const items = Array.isArray(action.payload?.items)
        ? action.payload.items
          .filter((item) => item && item.card && (!item.product || item.product.kind === "CATALOG"))
          .map((item): CartItem => ({
            id: item.id,
            quantity: Math.max(1, item.quantity || 1),
            productId: item.productId ?? null,
            product: item.product ?? null,
            productPriceCents: item.productPriceCents ?? null,
            productName: item.productName ?? null,
            card: cloneCard(cleanCard({ ...state.card, ...item.card, frameId: item.card.frameId === "romantic-red" ? "geometric-heart" : item.card.frameId })),
          }))
        : [];
      return { card, items, discountCode: typeof action.payload?.discountCode === "string" ? action.payload.discountCode : "" };
    },
    resetCart: () => initialState,
  },
});

const languageSlice = createSlice({
  name: "language",
  initialState: { language: "es" } as LanguageState,
  reducers: { setLanguage: (state, action: PayloadAction<"es" | "pt">) => { state.language = action.payload; }, hydrateLanguage: (_, action: PayloadAction<"es" | "pt">) => ({ language: action.payload }) },
});

export const defaultCardCustomization = (): CardCustomization => cloneCard(initialState.card);

// Keeps only current CardCustomization fields (drops e.g. the retired "packaging").
function cleanCard(card: CardCustomization & Record<string, unknown>): CardCustomization {
  const keys = Object.keys(initialState.card).concat(["magazineDate", "magazineCategory", "magazineBadge", "magazineHeadlineTag", "magazineFooter"]);
  return Object.fromEntries(Object.entries(card).filter(([key]) => keys.includes(key))) as CardCustomization;
}

export const {
  setCardCategory,
  setTemplate,
  setFrame,
  setMessage,
  setFrontHeadline,
  setFrontSubheadline,
  setInsideLeftText,
  setInsideRightText,
  setBackText,
  setEmoji,
  setEmojiTone,
  setEmojiSize,
  setEmojiPosition,
  addEmojiElement,
  setEmojiElements,
  updateEmojiElement,
  removeEmojiElement,
  setPhoto,
  setPhotoAt,
  setPhotoSlots,
  setPhotoZoom,
  setPhotoPosition,
  setSize,
  setDelivery,
  setRecipientMode,
  setMagazineDate,
  setMagazineCategory,
  setMagazineBadge,
  setMagazineHeadlineTag,
  setMagazineFooter,
  setDiscountCode,
  resetCurrentDraft,
  saveCartItem,
  loadCartItem,
  setCartItemQuantity,
  removeCartItem,
  clearCartItems,
  setAllItemsDelivery,
  hydrateCart,
  resetCart,
} = cartSlice.actions;
export const { setLanguage, hydrateLanguage } = languageSlice.actions;
export const store = configureStore({ reducer: { cart: cartSlice.reducer, language: languageSlice.reducer } });
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
