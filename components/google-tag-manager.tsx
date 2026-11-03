"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { onConsentChange, readConsent } from "@/lib/consent";

declare global {
  interface Window { dataLayer?: unknown[] }
}

const dataLayer = () => (window.dataLayer = window.dataLayer || []);

// Google's own consent commands are pushed as the `arguments` object, not as a plain
// array, so this mirrors the gtag() shim from Google's snippet.
const gtag: (...args: unknown[]) => void = function () {
  // eslint-disable-next-line prefer-rest-params
  dataLayer().push(arguments);
};

// Consent Mode v2. Everything starts denied, so a tag added in the GTM dashboard later
// still cannot store anything until the visitor accepts.
const CONSENT_KEYS = ["ad_storage", "ad_user_data", "ad_personalization", "analytics_storage"] as const;
const consentState = (granted: boolean) => Object.fromEntries(CONSENT_KEYS.map((key) => [key, granted ? "granted" : "denied"]));

// Google Tag Manager's standard snippet.
function loadGtm(containerId: string) {
  if (document.getElementById("gtm-script")) return;
  dataLayer().push({ "gtm.start": Date.now(), event: "gtm.js" });
  const script = document.createElement("script");
  script.id = "gtm-script";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(containerId)}`;
  document.head.appendChild(script);
}

// Loads GTM once marketing cookies are accepted, and reports each App Router
// navigation as a `page_view` dataLayer event. The first page is left to the Google tag
// inside GTM, which sends its own page view when the container loads, so nothing is
// counted twice. GA4 itself is configured in the GTM dashboard: no gtag.js is loaded
// here, so there is only ever one measurement path.
export function GoogleTagManager({ containerId, measurementId }: { containerId: string; measurementId?: string | null }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [granted, setGranted] = useState(false);
  const lastTracked = useRef<string | null>(null);
  // The last consent state pushed, so accepting never pushes the same update twice.
  const pushedConsent = useRef<boolean | null>(null);
  const updateConsent = (value: boolean) => {
    if (pushedConsent.current === value) return;
    pushedConsent.current = value;
    gtag("consent", "update", consentState(value));
  };

  useEffect(() => {
    // The measurement id is published to the dataLayer so the Google tag in GTM can read
    // it from a variable instead of having it typed into the dashboard.
    if (measurementId) dataLayer().push({ ga4_measurement_id: measurementId });
    gtag("consent", "default", { ...consentState(false), wait_for_update: 500 });
    setGranted(readConsent() === "granted");
    return onConsentChange((choice) => {
      setGranted(choice === "granted");
      // A withdrawn consent stops Google's tags from storing anything further.
      updateConsent(choice === "granted");
    });
  }, [measurementId]);

  useEffect(() => {
    // The admin area is never tracked.
    if (!granted || pathname.startsWith("/admin")) return;
    const query = searchParams.toString();
    const page = `${pathname}${query ? `?${query}` : ""}`;
    const first = lastTracked.current === null;
    if (lastTracked.current === page) return;
    lastTracked.current = page;
    if (first) {
      updateConsent(true);
      loadGtm(containerId);
      return; // the container's own Google tag reports this first page
    }
    dataLayer().push({ event: "page_view", page_path: page, page_location: window.location.href, page_title: document.title });
  }, [granted, containerId, pathname, searchParams]);

  return null;
}
