"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";

export const magazineHeadline = "Hoy se celebra el 13 cumpleaños de Roberto García";
export const magazineSubheadline = "¡Que tengas un día tan increíble como tú, Roberto! 🎉 ⚽ 💙";
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

  return <div className="relative h-full w-full overflow-hidden rounded-[clamp(6px,1.2vw,18px)] border-[clamp(2px,.45vw,5px)] border-[#d91b2a] bg-[#fffdf8] font-sans text-[#102044]">
    {/* Client reference masthead */}
    <div className="absolute inset-x-0 top-0 flex h-[14%] items-center justify-between gap-[3%] bg-[#d90619] px-[4%] text-white">
      <span className={`flex min-w-0 items-center gap-[3%] rounded-full bg-white px-[3%] py-[1.8%] font-black uppercase leading-none tracking-[.12em] text-[#102044] ${compact ? "text-[5px]" : "text-[clamp(9px,1.7vw,20px)]"}`}>
        <span className={`${compact ? "text-[8px]" : "text-[clamp(14px,2.4vw,30px)]"}`}>📣</span>
        <span className="truncate">Revista · 4 fotos</span>
      </span>
      <span className={`shrink-0 border-l-[clamp(1px,.2vw,3px)] border-white/80 pl-[4%] text-right font-black uppercase leading-[.95] tracking-[.1em] ${compact ? "text-[4px]" : "text-[clamp(7px,1.25vw,14px)]"}`}>Edición<br />especial <span className={`${compact ? "text-[7px]" : "text-[clamp(14px,2.2vw,26px)]"}`}>♡</span></span>
    </div>

    <div className="absolute inset-x-[4%] top-[15.8%] flex items-center gap-[4%] border-b-[clamp(1px,.18vw,2px)] border-[#c8192a] pb-[1.5%]">
      <span className={`shrink-0 font-black uppercase tracking-[.14em] text-[#c8192a] ${compact ? "text-[3px]" : "text-[clamp(6px,1.05vw,11px)]"}`}>La noticia del día</span>
      <span className="h-px flex-1 bg-[#c8192a]/75" />
      <span className={`shrink-0 font-black uppercase tracking-[.08em] text-[#102044] ${compact ? "text-[3px]" : "text-[clamp(6px,1.05vw,11px)]"}`}>26 septiembre 2026 · Nº 01</span>
    </div>

    <MagazinePhoto quadrant="hero" alt="Roberto celebra su cumpleaños" photoDataUrl={photoDataUrl} photoPosition={photoPosition} photoZoom={photoZoom} className="absolute inset-x-[4%] top-[20.5%] h-[37%] rounded-[clamp(4px,.8vw,12px)] border border-[#102044]/20 bg-cover" />
    <span className={`absolute left-[5.5%] top-[23%] max-w-[37%] -rotate-3 bg-[#f8c927] px-[2.5%] py-[1.5%] text-center font-black uppercase leading-[.9] tracking-[-.04em] text-[#102044] shadow-sm ${compact ? "text-[5px]" : "text-[clamp(9px,1.7vw,19px)]"}`}>¡Feliz<br />cumpleaños! <span className={`${compact ? "text-[6px]" : "text-[clamp(11px,1.9vw,22px)]"}`}>🎂</span></span>
    <span className={`absolute right-[7%] top-[36%] rotate-12 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,.45)] ${compact ? "text-[12px]" : "text-[clamp(22px,4vw,48px)]"}`}>⚽</span>
    <span className={`absolute bottom-[40%] left-[4%] -rotate-3 bg-[#d90619] px-[3%] py-[1%] font-black uppercase leading-none tracking-[.04em] text-white shadow-sm ${compact ? "text-[5px]" : "text-[clamp(10px,1.8vw,21px)]"}`}>¡Atención!</span>

    <div className="absolute inset-x-[7%] top-[59.5%] h-[20%] overflow-hidden">
      <h2 className={`line-clamp-2 break-words font-black leading-[.9] tracking-[-.06em] text-[#102044] ${compact ? "text-[8px]" : "text-[clamp(16px,3.15vw,38px)]"}`}>{displayHeadline}</h2>
      <div className={`absolute bottom-[5%] left-[18%] h-[clamp(2px,.35vw,5px)] w-[58%] -rotate-2 rounded-full bg-[#f2c521] ${compact ? "h-[2px]" : ""}`} />
      <span className={`absolute bottom-[5%] right-[4%] rotate-[-12deg] font-black text-[#d90619] ${compact ? "text-[11px]" : "text-[clamp(22px,4vw,45px)]"}`}>♡</span>
    </div>

    <div className="absolute inset-x-[7%] top-[81%] border-t-[clamp(1px,.2vw,2px)] border-[#c8192a] pt-[2%]">
      <div className="flex items-start gap-[3%]"><span className={`flex shrink-0 items-center justify-center rounded-[clamp(2px,.4vw,6px)] bg-[#d90619] text-white ${compact ? "h-[10px] w-[10px] text-[7px]" : "h-[clamp(18px,3vw,34px)] w-[clamp(18px,3vw,34px)] text-[clamp(10px,1.7vw,18px)]"}`}>★</span><p className={`max-w-[86%] font-bold leading-[1.05] text-[#102044] ${compact ? "line-clamp-2 text-[4px]" : "line-clamp-2 text-[clamp(8px,1.35vw,15px)]"}`}>{displaySubheadline}</p></div>
    </div>

    <div className={`absolute inset-x-[4%] bottom-[2.5%] flex items-center justify-between gap-2 border-t border-[#102044]/35 pt-[1.5%] font-black uppercase tracking-[.1em] ${compact ? "text-[3px]" : "text-[clamp(5px,1vw,10px)]"}`}><span className="text-[#d90619]">♥ Exclusiva</span><span className="truncate">Roberto García celebra con su familia</span><span className="shrink-0">Pág. 6 →</span></div>
  </div>;
}

export function MagazineInsideLeftView({ compact, surfaceClass, photoDataUrl, text }: { compact: boolean; surfaceClass: string; photoDataUrl?: string | null; text?: string }) {
  return <div className={`relative overflow-hidden border-[clamp(2px,.45vw,5px)] border-[#db1822] bg-[#fffdf8] ${surfaceClass}`}>
    <MagazinePhoto quadrant="action" alt="Roberto corre con el balón durante el partido" photoDataUrl={photoDataUrl} className="absolute inset-x-[8%] top-[8%] h-[56%] bg-cover" />
    <div className="absolute inset-x-[8%] bottom-[8%] border-l-[clamp(3px,.7vw,7px)] border-[#f1c62d] pl-[5%]">
      <span className={`font-black uppercase tracking-[.13em] text-[#db1822] ${compact ? "text-[4px]" : "text-[clamp(7px,1.3vw,12px)]"}`}>Siempre a tu lado</span>
      <p className={`mt-[3%] font-serif font-bold leading-[1.08] tracking-[-.025em] text-[#182443] ${compact ? "text-[7px]" : "text-[clamp(17px,3.2vw,32px)]"}`}>{text || magazineInsideLeft}</p>
    </div>
  </div>;
}

export function MagazineInsideRightView({ compact, surfaceClass, photoDataUrls = [], text }: { compact: boolean; surfaceClass: string; photoDataUrls?: (string | null)[]; text?: string }) {
  return <div className={`relative overflow-hidden border-[clamp(2px,.45vw,5px)] border-[#db1822] bg-[#fffdf8] ${surfaceClass}`}>
    <MagazinePhoto quadrant="team" alt="Roberto celebra el gol junto a sus compañeros" photoDataUrl={photoDataUrls[0]} className="absolute left-[7%] top-[8%] h-[41%] w-[56%] bg-cover" />
    <MagazinePhoto quadrant="family" alt="Roberto con su familia y Rocky después del partido" photoDataUrl={photoDataUrls[1]} className="absolute right-[7%] top-[8%] h-[41%] w-[27%] bg-cover" />
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
            Descubre cómo queda una tarjeta completamente personalizada con nuestra tercera plantilla, estilo periódico / revista. Combina 1 gran fotografía principal con 3 fotos interiores y textos a medida.
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
              Personalizar la plantilla Magazine →
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
