"use client";

import { Provider } from "react-redux";
import { useEffect, useRef, useState } from "react";
import { hydrateCart, hydrateLanguage, store } from "@/lib/store";
import { CART_STORAGE_KEY, LANGUAGE_STORAGE_KEY, persistCart, readPersistedCart } from "@/lib/mock-store";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [pendingRequests, setPendingRequests] = useState(0);
  const wroteInitialState = useRef(false);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (...args: Parameters<typeof window.fetch>) => {
      setPendingRequests((count) => count + 1);
      try {
        return await originalFetch(...args);
      } finally {
        setPendingRequests((count) => Math.max(0, count - 1));
      }
    };
    return () => { window.fetch = originalFetch; };
  }, []);

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

  return <Provider store={store}>
    {children}
    {pendingRequests > 0 && <div className="pointer-events-none fixed inset-0 z-[200] flex items-center justify-center bg-white/90 backdrop-blur-sm" role="status" aria-live="polite">
      <div className="absolute inset-x-0 top-0 h-1 overflow-hidden bg-[#f8c75e]/30"><div className="h-full w-1/3 animate-[loading-bar_1.1s_ease-in-out_infinite] rounded-full bg-[#ee5264]" /></div>
      <div className="flex min-w-[150px] flex-col items-center gap-3 rounded-2xl border border-[#eadbd3] bg-white px-7 py-5 text-center text-xs font-black text-[#182443] shadow-[0_18px_50px_rgba(24,36,67,.16)]"><span className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#eadbd3] border-t-[#ee5264]" />Cargando…</div>
    </div>}
  </Provider>;
}
