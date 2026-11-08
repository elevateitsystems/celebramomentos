"use client";

// First: makes React tolerate DOM changes made by browser translators (see the file).
import "@/lib/translation-safe-dom";
import { Provider } from "react-redux";
import { useEffect, useState } from "react";
import { PendingCartResumer } from "@/components/pending-cart-resumer";
import { hydrateCart, hydrateLanguage, store } from "@/lib/store";
import { LANGUAGE_STORAGE_KEY, persistCart, readPersistedCartAsync } from "@/lib/mock-store";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    let savedLanguage: string | null = null;
    try { savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY); } catch { /* storage blocked */ }
    if (savedLanguage === "es" || savedLanguage === "pt") store.dispatch(hydrateLanguage(savedLanguage));
    // The cart may live in IndexedDB when its photos were too large for localStorage.
    void readPersistedCartAsync().catch(() => null).then((savedCart) => {
      if (!active) return;
      if (savedCart) store.dispatch(hydrateCart(savedCart));
      setHydrated(true);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    persistCart(store.getState().cart);
    const persistLanguage = () => { try { window.localStorage.setItem(LANGUAGE_STORAGE_KEY, store.getState().language.language); } catch { /* storage blocked */ } };
    persistLanguage();
    return store.subscribe(() => {
      persistCart(store.getState().cart);
      persistLanguage();
    });
  }, [hydrated]);

  return <Provider store={store}>{children}{hydrated && <PendingCartResumer />}</Provider>;
}
