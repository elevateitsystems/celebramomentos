"use client";

import Link from "next/link";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Icon } from "./icons";
import { translations } from "@/lib/data";
import { RootState, setLanguage } from "@/lib/store";

export function SiteHeader({ active = "" }: { active?: string }) {
  const dispatch = useDispatch();
  const language = useSelector((state: RootState) => state.language.language);
  const [mobileMenu, setMobileMenu] = useState(false);
  const t = translations[language];
  const links = language === "es"
    ? [["Tienda", "/#categories"], ["Productos", "/templates"], ["Cómo funciona", "/#how"], ["Nosotros", "/#story"], ["Ayuda", "/contact"]]
    : [["Loja", "/#categories"], ["Produtos", "/templates"], ["Como funciona", "/#how"], ["Sobre nós", "/#story"], ["Ajuda", "/contact"]];
  const mobileLinks = links;
  return <>
    <div className="bg-[#182443] px-4 py-2 text-center text-[11px] font-bold tracking-[.08em] text-white/90">{language === "es" ? "Envío gratis en pedidos de 35€ o más · Entregamos en España y Portugal" : "Envio grátis em pedidos de 35€ ou mais · Entregamos em Espanha e Portugal"}</div>
    <header className="sticky top-0 z-30 border-b border-[#ebdfd6]/80 bg-[#fffaf5]/90 backdrop-blur-md">
      <div className="container flex h-[84px] items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3.5 focus-ring rounded-xl py-1" aria-label="Celebra Momentos, inicio">
          <img src="/images/logo.png" alt="Celebra Momentos" className="h-14 w-14 sm:h-16 sm:w-16 object-contain shrink-0 transition-transform hover:scale-105" />
          <span className="text-[16px] font-black leading-tight tracking-[-.03em]">
            Celebra<br />
            <span className="text-[#ee5264]">Momentos</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-7 text-[13px] font-bold text-[#59627b] lg:flex">{links.map(([label, href]) => <Link key={label} href={href} className={`transition-colors hover:text-[#ee5264] ${active === label ? "text-[#ee5264]" : ""}`}>{label}</Link>)}</nav>
        <div className="flex items-center gap-2"><div className="hidden rounded-full border border-[#dfd3cc] bg-white p-1 text-[11px] font-black sm:flex"><button onClick={() => dispatch(setLanguage("es"))} className={`rounded-full px-3 py-1.5 ${language === "es" ? "bg-[#182443] text-white" : "text-[#7b8193]"}`}>ES</button><button onClick={() => dispatch(setLanguage("pt"))} className={`rounded-full px-3 py-1.5 ${language === "pt" ? "bg-[#182443] text-white" : "text-[#7b8193]"}`}>PT</button></div><Link href="/account" className="focus-ring hidden h-10 items-center gap-2 rounded-full border border-[#dfd3cc] bg-white px-3 text-[12px] font-bold text-[#182443] transition hover:border-[#ee5264] md:flex"><Icon name="user" size={17} />{t.account}</Link><Link href="/cart" className="focus-ring flex h-10 items-center gap-2 rounded-full bg-[#ee5264] px-3.5 text-[12px] font-bold text-white transition hover:bg-[#d83d54]"><Icon name="bag" size={17} /><span className="hidden md:inline">{t.selection}</span></Link><button onClick={() => setMobileMenu(!mobileMenu)} className="focus-ring flex h-10 w-10 items-center justify-center rounded-full border border-[#dfd3cc] bg-white lg:hidden" aria-label="Abrir menú"><Icon name="menu" size={18} /></button></div>
      </div>
      {mobileMenu && <div className="border-t border-[#ebdfd6] bg-white px-5 py-4 lg:hidden"><nav className="container flex flex-col gap-4 text-sm font-bold text-[#59627b]">{mobileLinks.map(([label, href]) => <Link key={label} href={href} onClick={() => setMobileMenu(false)}>{label}</Link>)}<div className="flex gap-2 pt-1"><button onClick={() => dispatch(setLanguage("es"))} className={`rounded-full border px-3 py-1 text-xs ${language === "es" ? "border-[#182443] bg-[#182443] text-white" : "border-[#dfd3cc]"}`}>Español</button><button onClick={() => dispatch(setLanguage("pt"))} className={`rounded-full border px-3 py-1 text-xs ${language === "pt" ? "border-[#182443] bg-[#182443] text-white" : "border-[#dfd3cc]"}`}>Português</button></div></nav></div>}
    </header>
  </>;
}

export function SiteFooter() {
  const isPortuguese = useSelector((state: RootState) => state.language.language === "pt");
  const tx = (es: string, pt: string) => isPortuguese ? pt : es;
  return <footer id="footer" className="border-t border-[#ebdfd6] bg-white py-12"><div className="container grid gap-10 md:grid-cols-[1.45fr_1fr_1fr] md:gap-16"><div><div className="flex items-center gap-3"><img src="/images/logo.png" alt="Celebra Momentos" className="h-14 w-14 object-contain" /><span className="text-[16px] font-black tracking-[-.03em]">Celebra<br /><span className="text-[#ee5264]">Momentos</span></span></div><p className="mt-5 max-w-[320px] text-sm leading-6 text-[#737b90]">{tx("Fotos que se convierten en detalles para regalar, compartir y recordar.", "Fotografias que se transformam em presentes para oferecer, partilhar e recordar.")}</p></div><div><p className="text-xs font-black uppercase tracking-[.15em] text-[#182443]">{tx("Productos", "Produtos")}</p><div className="mt-5 grid grid-cols-2 gap-3 text-sm text-[#737b90] md:grid-cols-1"><Link href="/templates" className="hover:text-[#ee5264]">{tx("Tarjetas", "Cartões")}</Link><Link href="/calendars" className="hover:text-[#ee5264]">{tx("Calendarios", "Calendários")}</Link><Link href="/wall-art" className="hover:text-[#ee5264]">{tx("Arte de pared", "Arte de parede")}</Link><Link href="/magnets" className="hover:text-[#ee5264]">{tx("Imanes", "Ímanes")}</Link><Link href="/phone-cases" className="hover:text-[#ee5264]">{tx("Fundas de móvil", "Capas de telemóvel")}</Link></div></div><div><p className="text-xs font-black uppercase tracking-[.15em] text-[#182443]">{tx("Información", "Informação")}</p><div className="mt-5 flex flex-col gap-3 text-sm text-[#737b90]"><Link href="/#story" className="hover:text-[#ee5264]">{tx("Nosotros", "Sobre nós")}</Link><Link href="/privacy" className="hover:text-[#ee5264]">{tx("Privacidad", "Privacidade")}</Link><Link href="/cookies" className="hover:text-[#ee5264]">Cookies</Link><Link href="/terms" className="hover:text-[#ee5264]">{tx("Términos", "Termos")}</Link><Link href="/contact" className="hover:text-[#ee5264]">{tx("Contacto", "Contacto")}</Link></div></div></div><div className="container mt-10 flex flex-col gap-3 border-t border-[#ebdfd6] pt-5 text-xs text-[#9297a4] sm:flex-row sm:items-center sm:justify-between"><span>© 2026 Celebra Momentos</span><span className="flex items-center gap-2"><Icon name="lock" size={13} /> {tx("Compra sencilla · Atención humana", "Compra simples · Atendimento humano")}</span></div></footer>;
}

export function PageIntro({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return <div className="mx-auto max-w-[710px] text-center"><p className="text-[10px] font-black tracking-[.2em] text-[#ee5264]">{eyebrow}</p><h1 className="serif mt-3 text-4xl font-bold tracking-[-.04em] sm:text-6xl">{title}</h1>{body && <p className="mx-auto mt-5 max-w-[560px] text-sm leading-7 text-[#737b90]">{body}</p>}</div>;
}

export function Toast({ message, tone = "success", onClose }: { message: string; tone?: "success" | "error" | "warning"; onClose: () => void }) {
  const colors = { success: "bg-[#182443]", error: "bg-[#b9384d]", warning: "bg-[#806723]" };
  return <div className={`fixed right-4 top-24 z-[70] flex max-w-[340px] items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-white shadow-2xl ${colors[tone]}`} role="status"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-[#f8c75e]"><Icon name={tone === "success" ? "check" : "spark"} size={15} /></span><span className="flex-1">{message}</span><button onClick={onClose} aria-label="Cerrar notificación" className="text-white/60 hover:text-white"><Icon name="close" size={15} /></button></div>;
}

export function Price({ value }: { value: number }) { return <span>{value.toFixed(2).replace(".", ",")} €</span>; }

export function StatusBadge({ children, tone = "green" }: { children: React.ReactNode; tone?: "green" | "amber" | "rose" | "slate" }) {
  const tones = { green: "bg-[#e8f5ed] text-[#24714b]", amber: "bg-[#fff4d7] text-[#896816]", rose: "bg-[#fff0e8] text-[#c94758]", slate: "bg-[#eef0f4] text-[#59627b]" };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black ${tones[tone]}`}>{children}</span>;
}
