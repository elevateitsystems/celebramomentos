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

export function MagazineFront({
  compact,
  message,
  headline,
  subheadline,
  photoDataUrl,
  photoPosition = "center",
  photoZoom = 1,
  category = "LA NOTICIA DEL DÍA",
  date = "26 SEPTIEMBRE 2026 • Nº 01",
  badge = "¡FELIZ CUMPLEAÑOS!",
  headlineTag = "¡Atención!",
  footerText = "ROBERTO GARCÍA CELEBRA CON SU FAMILIA",
}: {
  compact: boolean;
  message?: string;
  headline?: string;
  subheadline?: string;
  photoDataUrl?: string | null;
  photoPosition?: "center" | "top" | "bottom" | "left" | "right";
  photoZoom?: number;
  category?: string;
  date?: string;
  badge?: string;
  headlineTag?: string;
  footerText?: string;
}) {
  const displayHeadline = headline || message || magazineHeadline;
  const displaySubheadline = subheadline || magazineSubheadline;

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[clamp(6px,1.2vw,18px)] border-[clamp(2px,.45vw,5px)] border-[#d91b2a] bg-[#fffdfa] font-sans text-[#102044] select-none shadow-sm">
      {/* 1. Top Red Header Bar - "REVISTA • 4 FOTOS" REMOVED per client request */}
      <div className="flex h-[9%] w-full items-center justify-between bg-[#d71424] px-[4%] text-white">
        <div className="flex items-center gap-[6px]">
          <span className="flex h-[clamp(16px,2.2vw,28px)] w-[clamp(16px,2.2vw,28px)] items-center justify-center rounded-full bg-white text-[clamp(10px,1.4vw,17px)] shadow-sm">
            📣
          </span>
        </div>
        <div className="flex items-center gap-[6px] text-white font-black">
          <span className="h-[12px] w-[1px] bg-white/60" />
          <span className={`uppercase tracking-[.08em] ${compact ? "text-[6px]" : "text-[clamp(8px,1.15vw,13px)]"}`}>
            EDICIÓN ESPECIAL
          </span>
          <span className={`text-white ${compact ? "text-[7px]" : "text-[clamp(9px,1.2vw,14px)]"}`}>♡</span>
        </div>
      </div>

      {/* 2. Sub-bar: Category · Divider · Date & Issue (Customizable) */}
      <div className="relative flex h-[5.5%] w-full items-center justify-between border-y border-[#d71424] bg-white px-[4%]">
        <span className={`font-black uppercase tracking-wider text-[#d71424] ${compact ? "text-[5.5px]" : "text-[clamp(7.5px,1.05vw,12px)]"}`}>
          {category}
        </span>
        <span className="h-[1px] flex-1 mx-[2%] bg-[#d71424]/40" />
        <span className={`font-bold tracking-tight text-[#102044] ${compact ? "text-[5.5px]" : "text-[clamp(7px,1vw,11.5px)]"}`}>
          {date}
        </span>
      </div>

      {/* 3. Hero Photo Section with fun doodles and yellow speech bubble */}
      <div className="relative mx-[4%] mt-[2.5%] aspect-[1.48/1] overflow-hidden rounded-[clamp(6px,1vw,14px)] border border-[#102044]/15 bg-[#eef1f3] shadow-sm">
        {photoDataUrl ? (
          <img
            src={photoDataUrl}
            alt="Fotografía principal de la tarjeta Magazine"
            className="h-full w-full object-cover"
            style={{ objectPosition: photoPosition, transform: `scale(${photoZoom})` }}
          />
        ) : (
          <div
            role="img"
            aria-label="Fotografía principal de la tarjeta Magazine"
            className="h-full w-full bg-cover"
            style={{
              backgroundImage: `url(${contactSheet})`,
              backgroundPosition: "0% 0%",
              backgroundSize: "200% 200%",
              backgroundRepeat: "no-repeat",
              objectPosition: photoPosition,
              transform: `scale(${photoZoom})`,
            }}
          />
        )}

        {/* Overlaid Yellow Speech Bubble / Badge (Customizable) */}
        <div className="absolute left-[3%] top-[4%] z-10 -rotate-3 rounded-[6px] border border-[#d8a80a] bg-[#ffd128] px-[3%] py-[1.8%] shadow-md">
          <div className="flex items-center gap-[4px]">
            <span className={`font-black tracking-tight text-[#102044] ${compact ? "text-[6.5px]" : "text-[clamp(9.5px,1.4vw,17px)]"}`}>
              {badge}
            </span>
            <span className={compact ? "text-[7px]" : "text-[clamp(10px,1.4vw,18px)]"}>🎂</span>
          </div>
        </div>

        {/* Overlaid playful doodles matching reference */}
        <span className={`absolute left-[6%] bottom-[10%] z-10 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)] ${compact ? "text-[8px]" : "text-[clamp(14px,2.2vw,26px)]"}`}>♡</span>
        <span className={`absolute right-[5%] top-[12%] z-10 rotate-12 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] ${compact ? "text-[12px]" : "text-[clamp(20px,3.2vw,36px)]"}`}>⚽</span>
        <span className={`absolute right-[8%] bottom-[8%] z-10 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)] ${compact ? "text-[9px]" : "text-[clamp(13px,2vw,24px)]"}`}>★</span>
        <span className={`absolute left-[18%] bottom-[6%] z-10 text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] ${compact ? "text-[7px]" : "text-[clamp(10px,1.5vw,18px)]"}`}>✦</span>
      </div>

      {/* 4. Headline Area: Red Ribbon + Bold Title (Customizable) */}
      <div className="mx-[4%] mt-[2.5%]">
        <div className="inline-block -rotate-1 rounded-[4px] bg-[#d71424] px-[2.5%] py-[1%] shadow-sm">
          <span className={`font-black uppercase tracking-wide text-white ${compact ? "text-[6px]" : "text-[clamp(9px,1.3vw,15px)]"}`}>
            {headlineTag}
          </span>
        </div>
        <div className="relative mt-[1%]">
          <h3 className={`font-black leading-[1.08] tracking-[-.03em] text-[#102044] ${compact ? "text-[8.5px]" : "text-[clamp(13.5px,2.15vw,26px)]"}`}>
            {displayHeadline} <span className="text-[#d71424]">♡</span>
          </h3>
          <div className="mt-[2px] h-[3px] w-[55%] rounded-full bg-[#ffd128]/80" />
        </div>
      </div>

      {/* 5. Message / Quote Box (Customizable) */}
      <div className="mx-[4%] mt-[2%] flex items-center gap-[3%] rounded-[8px] border border-[#eadad0] bg-[#fff5f0]/70 p-[2.5%]">
        <span className={`flex shrink-0 items-center justify-center rounded-[5px] bg-[#d71424] text-white shadow-xs ${compact ? "h-3.5 w-3.5 text-[7px]" : "h-[clamp(18px,2.5vw,28px)] w-[clamp(18px,2.5vw,28px)] text-[clamp(10px,1.4vw,16px)]"}`}>
          ★
        </span>
        <p className={`font-bold leading-tight text-[#102044] line-clamp-2 ${compact ? "text-[6px]" : "text-[clamp(8.5px,1.2vw,14px)]"}`}>
          {displaySubheadline}
        </p>
      </div>

      {/* 6. Footer Bar: EXCLUSIVA · STORY TITLE · PÁG 6 (Customizable) */}
      <div className="absolute inset-x-[4%] bottom-[2.5%] flex items-center justify-between border-t border-[#d71424] pt-[1.8%]">
        <div className="flex items-center gap-[3px] font-black uppercase text-[#d71424]">
          <span className={compact ? "text-[6px]" : "text-[clamp(8px,1vw,12px)]"}>♥</span>
          <span className={`tracking-wider ${compact ? "text-[5.5px]" : "text-[clamp(7px,0.95vw,11px)]"}`}>
            EXCLUSIVA
          </span>
        </div>
        <span className="h-[1px] w-[6%] bg-[#d71424]" />
        <span className={`mx-[2%] flex-1 truncate text-center font-black uppercase tracking-tight text-[#102044] ${compact ? "text-[5.5px]" : "text-[clamp(7px,0.95vw,11px)]"}`}>
          {footerText}
        </span>
        <span className="h-[1px] w-[6%] bg-[#d71424]" />
        <span className={`font-black text-[#102044] ${compact ? "text-[5.5px]" : "text-[clamp(7px,0.95vw,11px)]"}`}>
          PÁG. 6 →
        </span>
      </div>
    </div>
  );
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
