"use client";

import { configureStore, createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { CardSize, DeliveryMethod, DesignCategoryId, RecipientMode } from "./data";
import { defaultEmojiPosition, type EmojiElement, type EmojiPosition, type EmojiTone } from "./emojis";

export type CartState = {
  card: {
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
  };
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
    emoji: "🎓",
    emojiTone: "natural",
    emojiSize: 32,
    emojiPosition: defaultEmojiPosition,
    emojiElements: [{ id: "emoji-initial", emoji: "🎓", tone: "natural", size: 32, position: defaultEmojiPosition }],
    photoDataUrl: null,
    photoDataUrls: [null, null, null, null],
    photoZoom: 1,
    photoPosition: "center",
    size: "A4",
    delivery: "standard",
    recipientMode: "recipient",
  },
  stickerQuantity: 0,
  stickerImage: null,
  envelopeText: "",
  envelopeTextAdded: false,
  discountCode: "",
};

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
    setStickerQuantity: (state, action: PayloadAction<0 | 1 | 2 | 3>) => { state.stickerQuantity = action.payload; },
    setStickerImage: (state, action: PayloadAction<string | null>) => { state.stickerImage = action.payload; },
    setEnvelopeText: (state, action: PayloadAction<string>) => { state.envelopeText = action.payload.slice(0, 80); },
    setEnvelopeTextAdded: (state, action: PayloadAction<boolean>) => { state.envelopeTextAdded = action.payload; },
    setDiscountCode: (state, action: PayloadAction<string>) => { state.discountCode = action.payload; },
    resetCart: () => initialState,
  },
});

const languageSlice = createSlice({
  name: "language",
  initialState: { language: "es" } as LanguageState,
  reducers: { setLanguage: (state, action: PayloadAction<"es" | "pt">) => { state.language = action.payload; } },
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
  setRecipientMode,
  setStickerQuantity,
  setStickerImage,
  setEnvelopeText,
  setEnvelopeTextAdded,
  setDiscountCode,
  resetCart,
} = cartSlice.actions;
export const { setLanguage } = languageSlice.actions;
export const store = configureStore({ reducer: { cart: cartSlice.reducer, language: languageSlice.reducer } });
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
