import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import Providers from "./providers";
import { CookieConsent } from "@/components/cookie-consent";
import { GoogleTagManager } from "@/components/google-tag-manager";
import { MetaPixel } from "@/components/meta-pixel";

// The Pixel id is public (it appears in the page anyway) but is read on the server
// so it is configured with the other environment variables.
const pixelId = /^\d{8,20}$/.test(process.env.META_PIXEL_ID?.trim() || "") ? process.env.META_PIXEL_ID!.trim() : null;
// Google Tag Manager container, and the GA4 measurement id the container reports to.
// Both ids are public; they are read here so every tracking id is configured in one place.
const env = (name: string, pattern: RegExp) => { const value = process.env[name]?.trim() || ""; return pattern.test(value) ? value : null; };
const gtmId = env("GTM_CONTAINER_ID", /^GTM-[A-Z0-9]{4,10}$/);
const ga4Id = env("GA4_MEASUREMENT_ID", /^G-[A-Z0-9]{6,12}$/);

export const metadata: Metadata = {
  title: "Celebra Momentos — tarjetas que llegan al corazón",
  description: "Diseña y envía tarjetas personalizadas a España y Portugal.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body><Providers>{children}<CookieConsent /><Suspense fallback={null}>{pixelId && <MetaPixel pixelId={pixelId} />}{gtmId && <GoogleTagManager containerId={gtmId} measurementId={ga4Id} />}</Suspense></Providers></body>
    </html>
  );
}
