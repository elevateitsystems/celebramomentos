"use client";

import { configureStore, createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { CardSize, DeliveryMethod, RecipientMode } from "./data";

export type CartState = {
  card: { templateId: string; message: string; emoji: string; photoDataUrl: string | null; photoZoom: number; photoPosition: "center" | "top" | "bottom" | "left" | "right"; size: CardSize; delivery: DeliveryMethod; recipientMode: RecipientMode };
  stickerQuantity: 0 | 1 | 2 | 3;
  stickerImage: string | null;
  chocolates: Record<string, number>;
  discountCode: string;
};

export type LanguageState = { language: "es" | "pt" };

const initialState: CartState = {
  card: { templateId: "confetti", message: "Feliz vuelta al sol, Ana ✨", emoji: "✨", photoDataUrl: null, photoZoom: 1, photoPosition: "center", size: "A4", delivery: "standard", recipientMode: "recipient" },
  stickerQuantity: 0,
  stickerImage: null,
  chocolates: {},
  discountCode: "",
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    setTemplate: (state, action: PayloadAction<string>) => { state.card.templateId = action.payload; },
    setMessage: (state, action: PayloadAction<string>) => { state.card.message = action.payload; },
    setEmoji: (state, action: PayloadAction<string>) => { state.card.emoji = action.payload; },
    setPhoto: (state, action: PayloadAction<string | null>) => { state.card.photoDataUrl = action.payload; },
    setPhotoZoom: (state, action: PayloadAction<number>) => { state.card.photoZoom = action.payload; },
    setPhotoPosition: (state, action: PayloadAction<"center" | "top" | "bottom" | "left" | "right">) => { state.card.photoPosition = action.payload; },
    setSize: (state, action: PayloadAction<CardSize>) => { state.card.size = action.payload; },
    setDelivery: (state, action: PayloadAction<DeliveryMethod>) => { state.card.delivery = action.payload; },
    setRecipientMode: (state, action: PayloadAction<RecipientMode>) => { state.card.recipientMode = action.payload; },
    setStickerQuantity: (state, action: PayloadAction<0 | 1 | 2 | 3>) => { state.stickerQuantity = action.payload; },
    setStickerImage: (state, action: PayloadAction<string | null>) => { state.stickerImage = action.payload; },
    setChocolateQuantity: (state, action: PayloadAction<{ id: string; quantity: number }>) => { state.chocolates[action.payload.id] = action.payload.quantity; },
    setDiscountCode: (state, action: PayloadAction<string>) => { state.discountCode = action.payload; },
    resetCart: () => initialState,
  },
});

const languageSlice = createSlice({
  name: "language",
  initialState: { language: "es" } as LanguageState,
  reducers: { setLanguage: (state, action: PayloadAction<"es" | "pt">) => { state.language = action.payload; } },
});

export const { setTemplate, setMessage, setEmoji, setPhoto, setPhotoZoom, setPhotoPosition, setSize, setDelivery, setRecipientMode, setStickerQuantity, setStickerImage, setChocolateQuantity, setDiscountCode, resetCart } = cartSlice.actions;
export const { setLanguage } = languageSlice.actions;
export const store = configureStore({ reducer: { cart: cartSlice.reducer, language: languageSlice.reducer } });
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
