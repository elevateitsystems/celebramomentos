"use client";

import { configureStore, createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { CardSize, DeliveryMethod, DesignCategoryId, Packaging, RecipientMode } from "./data";
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
    packaging: Packaging;
    recipientMode: RecipientMode;
};

export type CartItem = {
  id: string;
  quantity: number;
  card: CardCustomization;
  stickerQuantity: 0 | 1 | 2 | 3;
  stickerImage: string | null;
  envelopeText: string;
  envelopeTextAdded: boolean;
};

export type CartItemDraft = Omit<CartItem, "id" | "quantity"> & { id?: string; quantity?: number };

export type CartState = {
  card: CardCustomization;
  items: CartItem[];
  stickerQuantity: 0 | 1 | 2 | 3;
  stickerImage: string | null;
  envelopeText: string;
  envelopeTextAdded: boolean;
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
    size: "A4",
    delivery: "standard",
    packaging: "standard",
    recipientMode: "recipient",
  },
  items: [],
  stickerQuantity: 0,
  stickerImage: null,
  envelopeText: "",
  envelopeTextAdded: false,
  discountCode: "",
};

const cloneCard = (card: CardCustomization): CardCustomization => ({
  ...card,
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
    setPackaging: (state, action: PayloadAction<Packaging>) => { state.card.packaging = action.payload; },
    setRecipientMode: (state, action: PayloadAction<RecipientMode>) => { state.card.recipientMode = action.payload; },
    setStickerQuantity: (state, action: PayloadAction<0 | 1 | 2 | 3>) => { state.stickerQuantity = action.payload; },
    setStickerImage: (state, action: PayloadAction<string | null>) => { state.stickerImage = action.payload; },
    setEnvelopeText: (state, action: PayloadAction<string>) => { state.envelopeText = action.payload.slice(0, 80); },
    setEnvelopeTextAdded: (state, action: PayloadAction<boolean>) => { state.envelopeTextAdded = action.payload; },
    setDiscountCode: (state, action: PayloadAction<string>) => { state.discountCode = action.payload; },
    resetCurrentDraft: (state) => {
      state.card = cloneCard(initialState.card);
      state.stickerQuantity = 0;
      state.stickerImage = null;
      state.envelopeText = "";
      state.envelopeTextAdded = false;
    },
    saveCartItem: (state, action: PayloadAction<CartItemDraft>) => {
      const id = action.payload.id || `cart-item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const item: CartItem = {
        id,
        quantity: Math.max(1, action.payload.quantity || 1),
        card: cloneCard(action.payload.card),
        stickerQuantity: action.payload.stickerQuantity,
        stickerImage: action.payload.stickerImage,
        envelopeText: action.payload.envelopeText,
        envelopeTextAdded: action.payload.envelopeTextAdded,
      };
      const existingIndex = state.items.findIndex((current) => current.id === id);
      if (existingIndex >= 0) state.items[existingIndex] = item;
      else state.items.push(item);
    },
    loadCartItem: (state, action: PayloadAction<string>) => {
      const item = state.items.find((current) => current.id === action.payload);
      if (!item) return;
      state.card = cloneCard(item.card);
      state.stickerQuantity = item.stickerQuantity;
      state.stickerImage = item.stickerImage;
      state.envelopeText = item.envelopeText;
      state.envelopeTextAdded = item.envelopeTextAdded;
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
      const card = { ...state.card, ...savedCard, frameId: savedCard.frameId === "romantic-red" ? "geometric-heart" : savedCard.frameId, packaging: savedCard.packaging || "standard" };
      // Remove the old built-in graduation-cap emoji from carts saved before
      // emojis became optional. User-added emojis remain untouched.
      if (card.emoji === "🎓") card.emoji = "";
      card.emojiElements = (Array.isArray(card.emojiElements) ? card.emojiElements : []).filter((item) => !(item.id === "emoji-initial" && item.emoji === "🎓"));
      card.photoDataUrls = Array.isArray(card.photoDataUrls) ? card.photoDataUrls : [card.photoDataUrl || null];
      const items = Array.isArray(action.payload.items)
        ? action.payload.items.filter((item) => item && item.card).map((item) => ({ ...item, quantity: Math.max(1, item.quantity || 1), card: cloneCard({ ...state.card, ...item.card, frameId: item.card.frameId === "romantic-red" ? "geometric-heart" : item.card.frameId, packaging: item.card.packaging || "standard" }) }))
        : [];
      return { ...state, ...action.payload, items, card };
    },
    resetCart: () => initialState,
  },
});

const languageSlice = createSlice({
  name: "language",
  initialState: { language: "es" } as LanguageState,
  reducers: { setLanguage: (state, action: PayloadAction<"es" | "pt">) => { state.language = action.payload; }, hydrateLanguage: (_, action: PayloadAction<"es" | "pt">) => ({ language: action.payload }) },
});

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
  setPackaging,
  setRecipientMode,
  setStickerQuantity,
  setStickerImage,
  setEnvelopeText,
  setEnvelopeTextAdded,
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
