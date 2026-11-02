"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { onConsentChange, readConsent } from "@/lib/consent";

// Meta's standard base code, loaded once and only after consent.
function loadPixel(pixelId: string) {
  if (typeof window.fbq === "function") return;
  /* eslint-disable */
  (function (f: any, b: Document, e: string, v: string) {
    if (f.fbq) return;
    const n: any = (f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); });
    if (!f._fbq) f._fbq = n;
    n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
    const t = b.createElement(e) as HTMLScriptElement; t.async = true; t.src = v;
    const s = b.getElementsByTagName(e)[0]; s.parentNode!.insertBefore(t, s);
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  /* eslint-enable */
  window.fbq!("consent", "grant");
  window.fbq!("init", pixelId);
}

// Loads the Pixel when marketing cookies are accepted and sends one PageView per
// page: the first on load, then one per App Router navigation.
export function MetaPixel({ pixelId }: { pixelId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [granted, setGranted] = useState(false);
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    setGranted(readConsent() === "granted");
    return onConsentChange((choice) => {
      setGranted(choice === "granted");
      // A withdrawn consent stops the Pixel from sending anything further.
      if (choice === "denied" && typeof window.fbq === "function") window.fbq("consent", "revoke");
      if (choice === "granted" && typeof window.fbq === "function") window.fbq("consent", "grant");
    });
  }, []);

  useEffect(() => {
    // The admin area is never tracked.
    if (!granted || pathname.startsWith("/admin")) return;
    loadPixel(pixelId);
    const page = `${pathname}?${searchParams.toString()}`;
    if (lastTracked.current === page) return;
    lastTracked.current = page;
    window.fbq!("track", "PageView");
  }, [granted, pixelId, pathname, searchParams]);

  return null;
}
