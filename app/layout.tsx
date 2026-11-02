import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import Providers from "./providers";
import { CookieConsent } from "@/components/cookie-consent";
import { MetaPixel } from "@/components/meta-pixel";

// The Pixel id is public (it appears in the page anyway) but is read on the server
// so it is configured with the other environment variables.
const pixelId = /^\d{8,20}$/.test(process.env.META_PIXEL_ID?.trim() || "") ? process.env.META_PIXEL_ID!.trim() : null;

export const metadata: Metadata = {
  title: "Celebra Momentos — tarjetas que llegan al corazón",
  description: "Diseña y envía tarjetas personalizadas a España y Portugal.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body><Providers>{children}<CookieConsent />{pixelId && <Suspense fallback={null}><MetaPixel pixelId={pixelId} /></Suspense>}</Providers></body>
    </html>
  );
}
