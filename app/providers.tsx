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
    const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (savedCart) store.dispatch(hydrateCart(savedCart));
    if (savedLanguage === "es" || savedLanguage === "pt") store.dispatch(hydrateLanguage(savedLanguage));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!wroteInitialState.current) { wroteInitialState.current = true; }
    persistCart(store.getState().cart);
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, store.getState().language.language);
    return store.subscribe(() => {
      persistCart(store.getState().cart);
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, store.getState().language.language);
    });
  }, [hydrated]);

  return <Provider store={store}>{children}</Provider>;
}
