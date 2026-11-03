"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { OPEN_SETTINGS_EVENT, readConsent, saveConsent } from "@/lib/consent";
import type { RootState } from "@/lib/store";

// Consent banner for optional cookies (Google Analytics via GTM, and the Meta Pixel). Shown until the visitor
// chooses; "Preferencias de cookies" in the footer opens it again.
export function CookieConsent() {
  const es = useSelector((state: RootState) => state.language.language) === "es";
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(readConsent() === null);
    const reopen = () => setOpen(true);
    window.addEventListener(OPEN_SETTINGS_EVENT, reopen);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, reopen);
  }, []);

  // The admin area is not tracked, so it needs no banner.
  if (!open || pathname.startsWith("/admin")) return null;
  const choose = (granted: boolean) => { saveConsent(granted ? "granted" : "denied"); setOpen(false); };

  return <div role="dialog" aria-live="polite" aria-label={es ? "Preferencias de cookies" : "Preferências de cookies"} className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-[720px] rounded-2xl border border-[#eadbd3] bg-white p-4 shadow-2xl shadow-[#8a564c]/20 sm:inset-x-6 sm:p-5">
    <p className="text-sm font-black text-[#182443]">{es ? "Tu privacidad" : "A tua privacidade"}</p>
    <p className="mt-1 text-xs leading-5 text-[#59627b]">
      {es
        ? "Usamos cookies técnicas para que la web funcione. Con tu permiso, usamos también Google Analytics (a través de Google Tag Manager) para entender cómo se usa la web y el píxel de Meta para medir nuestros anuncios. Puedes cambiar tu elección cuando quieras."
        : "Usamos cookies técnicos para que o site funcione. Com a tua autorização, usamos também o Google Analytics (através do Google Tag Manager) para perceber como o site é usado e o píxel da Meta para medir os nossos anúncios. Podes mudar a tua escolha quando quiseres."}{" "}
      <Link href="/cookies" className="font-black text-[#182443] underline underline-offset-2">{es ? "Política de cookies" : "Política de cookies"}</Link>
    </p>
    <div className="mt-3 flex flex-wrap justify-end gap-2">
      <button type="button" onClick={() => choose(false)} className="focus-ring rounded-full border border-[#dfd3cc] px-4 py-2 text-xs font-black text-[#182443] hover:border-[#182443]">{es ? "Rechazar" : "Rejeitar"}</button>
      <button type="button" onClick={() => choose(true)} className="focus-ring rounded-full bg-[#ee5264] px-4 py-2 text-xs font-black text-white hover:bg-[#d83d54]">{es ? "Aceptar" : "Aceitar"}</button>
    </div>
  </div>;
}
