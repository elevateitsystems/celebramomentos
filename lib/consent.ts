"use client";

// Cookie consent for optional cookies (analytics: Google Analytics via Google Tag
// Manager; marketing: the Meta Pixel). Technical cookies
// (session, cart, language) do not need consent. The choice lives in this
// browser only; nothing optional loads until the visitor accepts.
const KEY = "celebra-cookie-consent-v1";
const EVENT = "celebra:consent";
export const OPEN_SETTINGS_EVENT = "celebra:cookie-settings";

export type ConsentChoice = "granted" | "denied";

export function readConsent(): ConsentChoice | null {
  try {
    const value = JSON.parse(window.localStorage.getItem(KEY) || "null") as { marketing?: boolean } | null;
    return value && typeof value.marketing === "boolean" ? (value.marketing ? "granted" : "denied") : null;
  } catch {
    return null;
  }
}

export function saveConsent(choice: ConsentChoice) {
  try { window.localStorage.setItem(KEY, JSON.stringify({ marketing: choice === "granted", at: new Date().toISOString() })); } catch { /* storage blocked: the choice applies to this page only */ }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: choice }));
}

export function onConsentChange(listener: (choice: ConsentChoice) => void) {
  const handler = (event: Event) => listener((event as CustomEvent<ConsentChoice>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT));
}
