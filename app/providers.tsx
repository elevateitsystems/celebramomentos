"use client";

import { Provider } from "react-redux";
import { useEffect, useRef, useState } from "react";
import { hydrateCart, hydrateLanguage, store } from "@/lib/store";
import { CART_STORAGE_KEY, LANGUAGE_STORAGE_KEY, persistCart, readPersistedCart } from "@/lib/mock-store";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const wroteInitialState = useRef(false);

  useEffect(() => {
    const savedCart = readPersistedCart();
    let savedLanguage: string | null = null;
    try { savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY); } catch { /* storage blocked */ }
    if (savedCart) store.dispatch(hydrateCart(savedCart));
    if (savedLanguage === "es" || savedLanguage === "pt") store.dispatch(hydrateLanguage(savedLanguage));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!wroteInitialState.current) { wroteInitialState.current = true; }
    persistCart(store.getState().cart);
    const persistLanguage = () => { try { window.localStorage.setItem(LANGUAGE_STORAGE_KEY, store.getState().language.language); } catch { /* storage blocked */ } };
    persistLanguage();
    return store.subscribe(() => {
      persistCart(store.getState().cart);
      persistLanguage();
    });
  }, [hydrated]);

  return <Provider store={store}>{children}</Provider>;
}
