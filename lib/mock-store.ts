"use client";

import { useEffect, useState } from "react";
import { templates, type Packaging } from "./data";
import type { CartState } from "./store";

export const MOCK_DB_KEY = "celebra-momentos-mock-db-v1";
export const CART_STORAGE_KEY = "celebra-momentos-cart-v1";
export const LANGUAGE_STORAGE_KEY = "celebra-momentos-language-v1";

export type MockUser = {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: string;
};

export type MockOrderStatus = "Pedido recibido" | "En preparación" | "Enviado" | "Entregado" | "Cancelado";

export type MockOrder = {
  id: string;
  userId: string;
  email: string;
  date: string;
  item: string;
  templateId: string;
  amount: number;
  payment: "card" | "paypal";
  status: MockOrderStatus;
  delivery: "standard" | "express";
  packaging: Packaging;
  card: CartState["card"];
  extras: { stickerQuantity: number; envelopeText: string; envelopeTextAdded: boolean };
  shipping: { name: string; phone: string; recipient: string; address: string; city: string; postalCode: string; country: "ES" | "PT"; billingAddress?: string };
};

export type MockMessage = {
  id: string;
  userId: string | null;
  name: string;
  email: string;
  subject: string;
  messages: { id: string; author: "customer" | "admin"; text: string; createdAt: string }[];
  status: "open" | "replied" | "closed";
  createdAt: string;
};

export type MockTemplate = {
  id: string;
  name: string;
  eyebrow: string;
  description: string;
  price: number;
  imageCount: number;
  active: boolean;
};

export type MockDb = {
  users: MockUser[];
  currentUserId: string | null;
  orders: MockOrder[];
  messages: MockMessage[];
  templates: MockTemplate[];
  templatePrices: Record<string, number>;
  packagingPrices: Record<Packaging, number>;
};

const now = () => new Date().toISOString();

function defaultDb(): MockDb {
  return {
    users: [{ id: "user-demo", name: "María García", email: "maria.garcia@email.com", password: "demo1234", createdAt: "2025-05-12T10:00:00.000Z" }],
    currentUserId: null,
    orders: [],
    messages: [],
    templates: templates.map((item) => ({ id: item.id, name: item.name, eyebrow: item.eyebrow, description: item.description, price: item.price, imageCount: item.imageCount, active: true })),
    templatePrices: Object.fromEntries(templates.map((item) => [item.id, item.price])),
    packagingPrices: { standard: 0, gift: 2.5 },
  };
}

let snapshot: MockDb | null = null;

function normalizeDb(value: Partial<MockDb>): MockDb {
  const base = defaultDb();
  return {
    ...base,
    ...value,
    users: value.users || base.users,
    orders: value.orders || base.orders,
    messages: value.messages || base.messages,
    templates: value.templates || base.templates,
    templatePrices: { ...base.templatePrices, ...(value.templatePrices || {}) },
    packagingPrices: { ...base.packagingPrices, ...(value.packagingPrices || {}) },
  };
}

export function getMockDb(): MockDb {
  if (typeof window === "undefined") return defaultDb();
  if (snapshot) return snapshot;
  try {
    const raw = window.localStorage.getItem(MOCK_DB_KEY);
    snapshot = raw ? normalizeDb(JSON.parse(raw) as Partial<MockDb>) : defaultDb();
  } catch {
    snapshot = defaultDb();
  }
  return snapshot;
}

export function saveMockDb(next: MockDb): MockDb {
  snapshot = normalizeDb(next);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(MOCK_DB_KEY, JSON.stringify(snapshot));
    window.dispatchEvent(new Event("celebra-mock-db-change"));
  }
  return snapshot;
}

export function updateMockDb(updater: (current: MockDb) => MockDb): MockDb {
  return saveMockDb(updater(getMockDb()));
}

export function getCurrentUser(db = getMockDb()): MockUser | null {
  return db.users.find((user) => user.id === db.currentUserId) || null;
}

export function setCurrentUser(userId: string | null): MockDb {
  return updateMockDb((db) => ({ ...db, currentUserId: userId }));
}

export function registerMockUser(name: string, email: string, password: string): { user?: MockUser; error?: string } {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = getMockDb().users.find((user) => user.email === normalizedEmail);
  if (existing) return { error: "Ya existe una cuenta con ese email." };
  const user: MockUser = { id: `user-${Date.now()}`, name: name.trim(), email: normalizedEmail, password, createdAt: now() };
  saveMockDb({ ...getMockDb(), users: [...getMockDb().users, user], currentUserId: user.id });
  return { user };
}

export function loginMockUser(email: string, password: string): { user?: MockUser; error?: string } {
  const user = getMockDb().users.find((item) => item.email === email.trim().toLowerCase() && item.password === password);
  if (!user) return { error: "Email o contraseña incorrectos. Prueba demo1234 con la cuenta demo." };
  setCurrentUser(user.id);
  return { user };
}

export function updateMockUser(userId: string, changes: Partial<Pick<MockUser, "name" | "email">>): MockUser | null {
  let updated: MockUser | null = null;
  updateMockDb((db) => ({ ...db, users: db.users.map((user) => { if (user.id !== userId) return user; updated = { ...user, ...changes, email: changes.email?.trim().toLowerCase() || user.email }; return updated; }) }));
  return updated;
}

export function createMockOrder(input: Omit<MockOrder, "id" | "date">): MockOrder {
  const order: MockOrder = { ...input, id: `CM-${Math.floor(10000 + Math.random() * 89999)}`, date: now() };
  updateMockDb((db) => ({ ...db, orders: [order, ...db.orders] }));
  return order;
}

export function updateMockOrderStatus(orderId: string, status: MockOrderStatus): MockOrder | null {
  let updated: MockOrder | null = null;
  updateMockDb((db) => ({ ...db, orders: db.orders.map((order) => { if (order.id !== orderId) return order; updated = { ...order, status }; return updated; }) }));
  return updated;
}

export function createMockMessage(input: { userId: string | null; name: string; email: string; subject: string; text: string }): MockMessage {
  const message: MockMessage = { id: `message-${Date.now()}`, userId: input.userId, name: input.name.trim(), email: input.email.trim().toLowerCase(), subject: input.subject.trim(), messages: [{ id: `message-entry-${Date.now()}`, author: "customer", text: input.text.trim(), createdAt: now() }], status: "open", createdAt: now() };
  updateMockDb((db) => ({ ...db, messages: [message, ...db.messages] }));
  return message;
}

export function replyToMockMessage(messageId: string, text: string): MockMessage | null {
  let updated: MockMessage | null = null;
  updateMockDb((db) => ({ ...db, messages: db.messages.map((message) => { if (message.id !== messageId) return message; updated = { ...message, status: "replied", messages: [...message.messages, { id: `message-entry-${Date.now()}`, author: "admin", text: text.trim(), createdAt: now() }] }; return updated; }) }));
  return updated;
}

export function getTemplatePrice(templateId: string, db = getMockDb()): number {
  return db.templatePrices[templateId] ?? templates.find((item) => item.id === templateId)?.price ?? templates[0].price;
}

export function persistCart(cart: CartState) {
  if (typeof window !== "undefined") window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

export function readPersistedCart(): CartState | null {
  if (typeof window === "undefined") return null;
  try { const raw = window.localStorage.getItem(CART_STORAGE_KEY); return raw ? JSON.parse(raw) as CartState : null; } catch { return null; }
}

export function useMockDb(): MockDb {
  const [db, setDb] = useState<MockDb>(() => getMockDb());
  useEffect(() => {
    const refresh = () => {
      snapshot = null;
      setDb(getMockDb());
    };
    window.addEventListener("celebra-mock-db-change", refresh);
    window.addEventListener("storage", refresh);
    return () => { window.removeEventListener("celebra-mock-db-change", refresh); window.removeEventListener("storage", refresh); };
  }, []);
  return db;
}
