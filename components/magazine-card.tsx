"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";

export const magazineHeadline = "¡Atención! Hoy se celebra en todo el país el primer gol de temporada de Roberto García!";
export const magazineSubheadline = "Roberto García del equipo de Los Salesianos ha metido gol a los de Escolapios!";
export const magazineInsideLeft = "Tus abuelos, tu hermana, papá, mamá y Rocky te queremos mucho.";
export const magazineInsideRight = "¡Sigue así campeón!!";

const contactSheet = "/images/roberto-match-contact-sheet.png";

type PhotoQuadrant = "hero" | "action" | "team" | "family";

const quadrantPosition: Record<PhotoQuadrant, string> = {
  hero: "0% 0%",
  action: "100% 0%",
  team: "0% 100%",
  family: "100% 100%",
};

function MagazinePhoto({
  quadrant,
  className = "",
  alt,
  photoDataUrl,
  photoPosition = "center",
  photoZoom = 1,
}: {
  quadrant: PhotoQuadrant;
  className?: string;
  alt: string;
  photoDataUrl?: string | null;
  photoPosition?: "center" | "top" | "bottom" | "left" | "right";
  photoZoom?: number;
}) {
  if (photoDataUrl) {
    return <div className={`overflow-hidden bg-[#dfe5e8] ${className}`}><img src={photoDataUrl} alt={alt} className="h-full w-full object-cover" style={{ objectPosition: photoPosition, transform: `scale(${photoZoom})` }} /></div>;
  }

  const style: CSSProperties = {
    backgroundImage: `url(${contactSheet})`,
    backgroundPosition: quadrantPosition[quadrant],
    backgroundSize: "200% 200%",
    backgroundRepeat: "no-repeat",
  };
  return <div role="img" aria-label={alt} className={`bg-[#dfe5e8] ${className}`} style={style} />;
}

export function MagazineFront({
  compact,
  message,
  headline,
  subheadline,
  photoDataUrl,
  photoPosition,
  photoZoom,
}: {
  compact: boolean;
  message?: string;
  headline?: string;
  subheadline?: string;
  photoDataUrl?: string | null;
  photoPosition?: "center" | "top" | "bottom" | "left" | "right";
  photoZoom?: number;
}) {
  const displayHeadline = headline || message || magazineHeadline;
  const displaySubheadline = subheadline || magazineSubheadline;

  return <div className="relative h-full w-full overflow-hidden border-[clamp(2px,.45vw,5px)] border-[#db1822] bg-[#fffdf8] font-sans text-[#101828]">
    <div className="absolute inset-x-0 top-0 flex h-[13%] items-center justify-between bg-[#df1923] px-[4%] text-white">
      <span className={`font-black uppercase leading-[.8] tracking-[-.06em] ${compact ? "text-[9px]" : "text-[clamp(22px,5vw,52px)]"}`}>Últimas<br />Noticias</span>
      <span className={`border-l border-white/40 pl-[4%] text-right font-bold uppercase tracking-[.12em] ${compact ? "text-[3px]" : "text-[clamp(6px,1.2vw,12px)]"}`}>Edición<br />especial</span>
    </div>

    <div className="absolute inset-x-[4%] top-[15.5%] flex items-center justify-between border-b border-[#101828]/25 pb-[1.5%]">
      <span className={`font-black uppercase tracking-[.14em] text-[#df1923] ${compact ? "text-[3px]" : "text-[clamp(6px,1.15vw,11px)]"}`}>La noticia del día</span>
      <span className={`font-bold text-[#5f6672] ${compact ? "text-[3px]" : "text-[clamp(6px,1.05vw,10px)]"}`}>26 SEPTIEMBRE 2026 · Nº 01</span>
    </div>

    <MagazinePhoto quadrant="hero" alt="Roberto celebra su primer gol de la temporada" photoDataUrl={photoDataUrl} photoPosition={photoPosition} photoZoom={photoZoom} className="absolute inset-x-[4%] top-[20%] h-[43%] border border-[#101828]/20 bg-cover" />
    <span className={`absolute left-[4%] top-[20%] bg-[#f7c92d] px-[2.2%] py-[1%] font-black uppercase tracking-[.08em] text-[#101828] ${compact ? "text-[3px]" : "text-[clamp(6px,1.15vw,11px)]"}`}>¡Gol histórico! ⚽</span>

    <div className="absolute inset-x-[4%] top-[65%]">
      <h2 className={`font-black leading-[.94] tracking-[-.055em] text-[#111827] ${compact ? "text-[7px]" : "text-[clamp(16px,3.5vw,36px)]"}`}>{displayHeadline}</h2>
      <div className="mt-[3%] grid grid-cols-[5px_1fr] gap-[2.5%] border-t-2 border-[#df1923] pt-[2.5%] sm:grid-cols-[8px_1fr]">
        <span className="h-full bg-[#df1923]" />
        <p className={`font-bold leading-[1.15] text-[#263247] ${compact ? "line-clamp-3 text-[4px]" : "text-[clamp(8px,1.65vw,16px)]"}`}>{displaySubheadline}</p>
      </div>
    </div>
    <div className={`absolute inset-x-[4%] bottom-[2.5%] flex items-center justify-between border-t border-[#101828]/25 pt-[1.5%] font-black uppercase tracking-[.12em] ${compact ? "text-[3px]" : "text-[clamp(6px,1vw,10px)]"}`}><span className="text-[#df1923]">Exclusiva</span><span>Los Salesianos celebra</span><span className="text-[#737b90]">Pág. 6</span></div>
  </div>;
}

export function MagazineInsideLeftView({ compact, surfaceClass, photoDataUrl, text }: { compact: boolean; surfaceClass: string; photoDataUrl?: string | null; text?: string }) {
  return <div className={`relative overflow-hidden border-[clamp(2px,.45vw,5px)] border-[#db1822] bg-[#fffdf8] ${surfaceClass}`}>
    <MagazinePageHeader compact={compact} page="02" label="Desde la banda" />
    <MagazinePhoto quadrant="action" alt="Roberto corre con el balón durante el partido" photoDataUrl={photoDataUrl} className="absolute inset-x-[8%] top-[17%] h-[47%] bg-cover" />
    <div className="absolute inset-x-[8%] bottom-[8%] border-l-[clamp(3px,.7vw,7px)] border-[#f1c62d] pl-[5%]">
      <span className={`font-black uppercase tracking-[.13em] text-[#db1822] ${compact ? "text-[4px]" : "text-[clamp(7px,1.3vw,12px)]"}`}>Siempre a tu lado</span>
      <p className={`mt-[3%] font-serif font-bold leading-[1.08] tracking-[-.025em] text-[#182443] ${compact ? "text-[7px]" : "text-[clamp(17px,3.2vw,32px)]"}`}>{text || magazineInsideLeft}</p>
    </div>
  </div>;
}

export function MagazineInsideRightView({ compact, surfaceClass, photoDataUrls = [], text }: { compact: boolean; surfaceClass: string; photoDataUrls?: (string | null)[]; text?: string }) {
  return <div className={`relative overflow-hidden border-[clamp(2px,.45vw,5px)] border-[#db1822] bg-[#fffdf8] ${surfaceClass}`}>
    <MagazinePageHeader compact={compact} page="03" label="La celebración" />
    <MagazinePhoto quadrant="team" alt="Roberto celebra el gol junto a sus compañeros" photoDataUrl={photoDataUrls[0]} className="absolute left-[7%] top-[17%] h-[32%] w-[56%] bg-cover" />
    <MagazinePhoto quadrant="family" alt="Roberto con su familia y Rocky después del partido" photoDataUrl={photoDataUrls[1]} className="absolute right-[7%] top-[17%] h-[32%] w-[27%] bg-cover" />
    <div className="absolute inset-x-[7%] top-[53%] border-y-2 border-[#182443] py-[5%] text-center">
      <span className={`font-black uppercase tracking-[.15em] text-[#db1822] ${compact ? "text-[4px]" : "text-[clamp(7px,1.25vw,12px)]"}`}>Mensaje para Roberto</span>
      <p className={`mt-[3%] font-serif font-black italic leading-none tracking-[-.04em] text-[#182443] ${compact ? "text-[11px]" : "text-[clamp(27px,5vw,52px)]"}`}>{text || magazineInsideRight}</p>
    </div>
    <div className="absolute inset-x-[7%] bottom-[6%] flex items-end justify-between">
      <p className={`max-w-[72%] font-bold leading-snug text-[#5f6672] ${compact ? "text-[4px]" : "text-[clamp(7px,1.35vw,13px)]"}`}>Un recuerdo de ese primer gol que toda la familia guardará para siempre.</p>
      <span className={`font-black text-[#f1c62d] ${compact ? "text-lg" : "text-[clamp(34px,7vw,68px)]"}`}>★</span>
    </div>
  </div>;
}

function MagazinePageHeader({ compact, page, label }: { compact: boolean; page: string; label: string }) {
  return <div className="absolute inset-x-[7%] top-[6%] flex items-center justify-between border-b-2 border-[#db1822] pb-[2%]">
    <span className={`font-black uppercase tracking-[.15em] text-[#db1822] ${compact ? "text-[4px]" : "text-[clamp(7px,1.3vw,13px)]"}`}>Últimas Noticias · {label}</span>
    <span className={`font-black text-[#182443] ${compact ? "text-[4px]" : "text-[clamp(7px,1.2vw,12px)]"}`}>{page}</span>
  </div>;
}

export function MagazineCardShowcase() {
  const [activeTab, setActiveTab] = useState<"front" | "inside">("front");

  return (
    <section id="magazine-example" className="border-b border-[#ebdfd6] bg-[#fffaf5] py-20 md:py-24">
      <div className="container">
        <div className="mx-auto max-w-[760px] text-center">
          <p className="text-[10px] font-black tracking-[.2em] text-[#db1822]">
            EJEMPLO REAL · ESTILO REVISTA
          </p>
          <h2 className="serif mt-3 text-3xl font-bold tracking-[-.04em] text-[#182443] sm:text-5xl">
            Ejemplo de tarjeta personalizada
          </h2>
          <p className="mt-4 text-sm leading-6 text-[#737b90] sm:text-base">
            Descubre cómo queda una tarjeta completamente personalizada con nuestra Plantilla 1 estilo periódico / revista. Combina 1 gran fotografía principal con 3 fotos interiores y textos a medida.
          </p>
          <div className="mt-7 inline-flex rounded-full border border-[#eadbd3] bg-white p-1.5 shadow-sm">
            <button
              type="button"
              onClick={() => setActiveTab("front")}
              className={`rounded-full px-5 py-2 text-xs font-black transition ${
                activeTab === "front"
                  ? "bg-[#db1822] text-white shadow"
                  : "text-[#59627b] hover:text-[#182443]"
              }`}
            >
              1. Portada principal (Frente)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("inside")}
              className={`rounded-full px-5 py-2 text-xs font-black transition ${
                activeTab === "inside"
                  ? "bg-[#db1822] text-white shadow"
                  : "text-[#59627b] hover:text-[#182443]"
              }`}
            >
              2. Interior desplegado (2 caras)
            </button>
          </div>
        </div>

        <div className="mt-12">
          {activeTab === "front" ? (
            <div className="mx-auto max-w-[540px]">
              <div className="rounded-[28px] bg-[#182443] p-4 shadow-2xl shadow-[#182443]/15 sm:p-6">
                <div className="mb-3 flex items-center justify-between text-white text-xs">
                  <span className="font-black uppercase tracking-wider text-[#f8c75e]">Lado 1 · Portada</span>
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-black">1 Gran Foto Protagonista</span>
                </div>
                <div className="aspect-[.82/1] w-full overflow-hidden rounded-[16px] shadow-lg">
                  <MagazineFront compact={false} />
                </div>
              </div>
              <div className="mt-5 text-center text-xs text-[#737b90]">
                <p className="font-bold text-[#182443]">“¡atención! Hoy se celebra en todo el país el primer gol de temporada de Roberto García!”</p>
                <p className="mt-1">Roberto García del equipo de Los Salesianos ha metido gol a los de Escolapios!</p>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-[1040px]">
              <div className="rounded-[28px] bg-[#182443] p-4 shadow-2xl shadow-[#182443]/15 sm:p-7">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-white text-xs">
                  <span className="font-black uppercase tracking-wider text-[#f8c75e]">Interior Completo Desplegado</span>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black">3 Fotos adicionales repartidas en 2 páginas</span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 text-center text-[11px] font-black uppercase tracking-wider text-white/70">Página 2 · Interior Izquierdo</p>
                    <div className="aspect-[.82/1] w-full overflow-hidden rounded-[16px] shadow-lg">
                      <MagazineInsideLeftView compact={false} surfaceClass="h-full w-full" />
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-center text-[11px] font-black uppercase tracking-wider text-white/70">Página 3 · Interior Derecho</p>
                    <div className="aspect-[.82/1] w-full overflow-hidden rounded-[16px] shadow-lg">
                      <MagazineInsideRightView compact={false} surfaceClass="h-full w-full" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 grid gap-4 text-xs text-[#737b90] sm:grid-cols-2">
                <div className="rounded-2xl border border-[#eadbd3] bg-white p-4">
                  <span className="font-black uppercase text-[#db1822]">Texto Interior Izquierdo:</span>
                  <p className="mt-1 font-bold text-[#182443]">“{magazineInsideLeft}”</p>
                </div>
                <div className="rounded-2xl border border-[#eadbd3] bg-white p-4">
                  <span className="font-black uppercase text-[#db1822]">Texto Interior Derecho:</span>
                  <p className="mt-1 font-bold text-[#182443]">“{magazineInsideRight}”</p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/customize"
              className="focus-ring inline-flex items-center gap-2 rounded-full bg-[#db1822] px-7 py-3.5 text-sm font-black text-white shadow-lg shadow-[#db1822]/20 transition hover:-translate-y-0.5 hover:bg-[#b8121a]"
            >
              Personalizar esta plantilla revista (Plantilla 1) →
            </Link>
            <Link
              href="/templates"
              className="focus-ring inline-flex items-center rounded-full border border-[#d9cbc4] bg-white px-6 py-3.5 text-sm font-black text-[#182443] transition hover:border-[#ee5264]"
            >
              Ver las 3 plantillas
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
