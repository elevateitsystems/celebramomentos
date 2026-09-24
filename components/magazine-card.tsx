"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";

export const magazineHeadline = "Hoy se celebra el 13 cumpleaños de Roberto García";
export const magazineSubheadline = "¡Que tengas un día tan increíble como tú, Roberto! 🎉 ⚽ 💙";
export const magazineInsideLeft = "Tus abuelos, tu hermana, papá, mamá y Rocky te queremos mucho.";
export const magazineInsideRight = "¡Sigue así campeón!!";

const contactSheet = "/images/roberto-match-contact-sheet.png";
type PhotoQuadrant = "hero" | "action" | "team" | "family";
const quadrantPosition: Record<PhotoQuadrant, string> = { hero: "0% 0%", action: "100% 0%", team: "0% 100%", family: "100% 100%" };

function MagazinePhoto({ quadrant, className = "", alt, photoDataUrl, photoPosition = "center", photoZoom = 1 }: { quadrant: PhotoQuadrant; className?: string; alt: string; photoDataUrl?: string | null; photoPosition?: "center" | "top" | "bottom" | "left" | "right"; photoZoom?: number }) {
  if (photoDataUrl) return <div className={`overflow-hidden bg-[#dfe5e8] ${className}`}><img src={photoDataUrl} alt={alt} className="h-full w-full object-cover" style={{ objectPosition: photoPosition, transform: `scale(${photoZoom})` }} /></div>;
  const style: CSSProperties = { backgroundImage: `url(${contactSheet})`, backgroundPosition: quadrantPosition[quadrant], backgroundSize: "200% 200%", backgroundRepeat: "no-repeat" };
  return <div role="img" aria-label={alt} className={`bg-[#dfe5e8] ${className}`} style={style} />;
}

export function MagazineFront({ compact, message, photoDataUrl, photoPosition, photoZoom }: { compact: boolean; message?: string; headline?: string; subheadline?: string; photoDataUrl?: string | null; photoPosition?: "center" | "top" | "bottom" | "left" | "right"; photoZoom?: number; highlightText?: string; footerText?: string }) {
  const displayMessage = message || "Feliz aniversário";
  return <div className="relative h-full w-full overflow-hidden rounded-[clamp(6px,1.2vw,18px)] border-[clamp(2px,.45vw,5px)] border-[#d91b2a] bg-[#fffdf8] font-sans text-[#102044]">
    <div className="absolute inset-x-0 top-0 h-[10%] bg-[#d90619]" />
    <div className="absolute inset-x-[5%] top-[12.5%] h-[1.5%] border-y border-[#d90619]" />
    <MagazinePhoto quadrant="hero" alt="Fotografía principal de la tarjeta Magazine" photoDataUrl={photoDataUrl} photoPosition={photoPosition} photoZoom={photoZoom} className="absolute inset-x-[5%] top-[17%] h-[57%] rounded-[clamp(4px,.8vw,12px)] border border-[#102044]/20 bg-cover" />
    <span className={`absolute left-[8%] top-[20%] z-10 max-w-[44%] -rotate-3 rounded-[5px] bg-[#f8c927] px-[2.5%] py-[1.8%] text-center font-black leading-[.95] tracking-[-.04em] text-[#102044] shadow-sm line-clamp-3 break-words ${compact ? "text-[7px]" : "text-[clamp(12px,2vw,24px)]"}`}>{displayMessage} <span className={compact ? "text-[8px]" : "text-[clamp(13px,2.1vw,25px)]"}>🎂</span></span>
    <span className={`absolute right-[8%] top-[40%] z-10 rotate-12 drop-shadow-[0_1px_2px_rgba(0,0,0,.45)] ${compact ? "text-[14px]" : "text-[clamp(22px,4vw,44px)]"}`}>⚽</span>
    <div className="absolute inset-x-[7%] bottom-[8%] flex items-center gap-[3%] border-t-2 border-[#d90619] pt-[3%]"><span className="h-[clamp(6px,1.2vw,14px)] w-[26%] bg-[#f8c927]" /><span className="h-[clamp(4px,.8vw,9px)] flex-1 bg-[#102044]" /><span className="h-[clamp(6px,1.2vw,14px)] w-[12%] bg-[#d90619]" /></div>
  </div>;
}

export function MagazineInsideLeftView({ compact, surfaceClass, photoDataUrl, text }: { compact: boolean; surfaceClass: string; photoDataUrl?: string | null; text?: string }) {
  return <div className={`relative overflow-hidden border-[clamp(2px,.45vw,5px)] border-[#db1822] bg-[#fffdf8] ${surfaceClass}`}>
    <MagazinePhoto quadrant="action" alt="Fotografía interior izquierda" photoDataUrl={photoDataUrl} className="absolute inset-x-[8%] top-[8%] h-[56%] rounded-lg bg-cover" />
    <div className="absolute inset-x-[8%] bottom-[9%] rounded-[6px] border-l-[clamp(3px,.7vw,7px)] border-[#f1c62d] bg-[#f8c927] px-[5%] py-[4%]">
      <p className={`font-serif font-bold leading-[1.08] tracking-[-.025em] text-[#182443] ${compact ? "text-[7px]" : "text-[clamp(14px,2.7vw,28px)]"}`}>{text || magazineInsideLeft}</p>
    </div>
  </div>;
}

export function MagazineInsideRightView({ compact, surfaceClass, photoDataUrls = [], text }: { compact: boolean; surfaceClass: string; photoDataUrls?: (string | null)[]; text?: string }) {
  return <div className={`relative overflow-hidden border-[clamp(2px,.45vw,5px)] border-[#db1822] bg-[#fffdf8] ${surfaceClass}`}>
    <MagazinePhoto quadrant="team" alt="Fotografía interior derecha" photoDataUrl={photoDataUrls[0]} className="absolute left-[7%] top-[8%] h-[41%] w-[56%] rounded-lg bg-cover" />
    <MagazinePhoto quadrant="family" alt="Segunda fotografía interior derecha" photoDataUrl={photoDataUrls[1]} className="absolute right-[7%] top-[8%] h-[41%] w-[27%] rounded-lg bg-cover" />
    <div className="absolute inset-x-[7%] top-[55%] rounded-[6px] bg-[#f8c927] px-[5%] py-[5%] text-center">
      <p className={`font-serif font-black italic leading-none tracking-[-.04em] text-[#182443] ${compact ? "text-[10px]" : "text-[clamp(18px,3.4vw,36px)]"}`}>{text || magazineInsideRight}</p>
    </div>
    <span className={`absolute bottom-[7%] right-[8%] font-black text-[#f1c62d] ${compact ? "text-xl" : "text-[clamp(28px,6vw,60px)]"}`}>★</span>
  </div>;
}

export function MagazineCardShowcase() {
  const [activeTab, setActiveTab] = useState<"front" | "inside">("front");
  return <section id="magazine-example" className="border-b border-[#ebdfd6] bg-[#fffaf5] py-20 md:py-24"><div className="container"><div className="mx-auto max-w-[760px] text-center"><p className="text-[10px] font-black tracking-[.2em] text-[#db1822]">EJEMPLO REAL · ESTILO REVISTA</p><h2 className="serif mt-3 text-3xl font-bold tracking-[-.04em] text-[#182443] sm:text-5xl">Ejemplo de tarjeta personalizada</h2><p className="mt-4 text-sm leading-6 text-[#737b90] sm:text-base">Una tercera plantilla editorial con una fotografía protagonista y tres fotos interiores.</p><div className="mt-7 inline-flex rounded-full border border-[#eadbd3] bg-white p-1.5 shadow-sm"><button type="button" onClick={() => setActiveTab("front")} className={`rounded-full px-5 py-2 text-xs font-black transition ${activeTab === "front" ? "bg-[#db1822] text-white shadow" : "text-[#59627b] hover:text-[#182443]"}`}>Portada</button><button type="button" onClick={() => setActiveTab("inside")} className={`rounded-full px-5 py-2 text-xs font-black transition ${activeTab === "inside" ? "bg-[#db1822] text-white shadow" : "text-[#59627b] hover:text-[#182443]"}`}>Interior</button></div></div><div className="mt-12">{activeTab === "front" ? <div className="mx-auto max-w-[540px]"><div className="rounded-[28px] bg-[#182443] p-4 shadow-2xl shadow-[#182443]/15 sm:p-6"><div className="aspect-[.82/1] w-full overflow-hidden rounded-[16px] shadow-lg"><MagazineFront compact={false} /></div></div></div> : <div className="mx-auto max-w-[1040px]"><div className="rounded-[28px] bg-[#182443] p-4 shadow-2xl shadow-[#182443]/15 sm:p-7"><div className="grid gap-4 sm:grid-cols-2"><div className="aspect-[.82/1] w-full overflow-hidden rounded-[16px] shadow-lg"><MagazineInsideLeftView compact={false} surfaceClass="h-full w-full" /></div><div className="aspect-[.82/1] w-full overflow-hidden rounded-[16px] shadow-lg"><MagazineInsideRightView compact={false} surfaceClass="h-full w-full" /></div></div></div></div>}</div><div className="mt-10 flex justify-center"><Link href="/templates" className="focus-ring inline-flex items-center rounded-full border border-[#d9cbc4] bg-white px-6 py-3.5 text-sm font-black text-[#182443] transition hover:border-[#ee5264]">Ver las 3 plantillas</Link></div></div></section>;
}
