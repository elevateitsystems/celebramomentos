"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { CardPreview, frameOpeningStyle, frameOverlayClass } from "./card-preview";
import { Icon } from "./icons";
import { designCategories, frames, templates } from "@/lib/data";
import type { RootState } from "@/lib/store";
import { MagazineInsideLeftView, MagazineInsideRightView } from "./magazine-card";

export type PostcardSide = "front" | "inside-left" | "inside-right" | "back";

const sides = (isPortuguese: boolean): { id: PostcardSide; label: string; description: string }[] => isPortuguese ? [
  { id: "front", label: "Capa", description: "A primeira impressão" },
  { id: "inside-left", label: "Interior esquerdo", description: "Ao abrir o cartão" },
  { id: "inside-right", label: "Interior direito", description: "A parte principal do interior" },
  { id: "back", label: "Contracapa", description: "A parte de trás" },
] : [
  { id: "front", label: "Portada", description: "La primera impresión" },
  { id: "inside-left", label: "Interior izquierdo", description: "Al abrir la tarjeta" },
  { id: "inside-right", label: "Interior derecho", description: "La parte principal interior" },
  { id: "back", label: "Contraportada", description: "La parte posterior" },
];

function SelectedFrameOverlay({ src, frameId }: { src: string; frameId: string }) {
  return <img src={src} alt="" aria-hidden="true" className={`pointer-events-none absolute inset-0 ${frameOverlayClass(frameId)} h-full w-full object-fill`} />;
}

export function PostcardPreviewWindow() {
  const card = useSelector((state: RootState) => state.cart.card);
  const isPortuguese = useSelector((state: RootState) => state.language.language === "pt");
  const [activeSide, setActiveSide] = useState<PostcardSide>("front");
  const template = templates.find((item) => item.id === card.templateId) || templates[0];
  const frame = frames.find((item) => item.id === card.frameId) || frames[0];
  const category = designCategories.find((item) => item.id === card.categoryId) || designCategories[0];
  const localizedSides = sides(isPortuguese);
  const active = localizedSides.find((item) => item.id === activeSide) || localizedSides[0];

  return <div className="mt-12">
    <section className="overflow-hidden rounded-[28px] bg-[#182443] p-4 shadow-2xl shadow-[#182443]/15 sm:p-7" aria-label="Ventana de vista previa de la tarjeta completa">
      <div className="mb-5 flex flex-col gap-3 text-white sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#f8c75e]">{isPortuguese ? "VISTA ATUAL" : "VISTA ACTUAL"} · {active.label}</p><p className="mt-1 text-sm text-white/60">{active.description}</p></div>
        <div className="flex flex-wrap gap-2 text-[10px] font-black"><span className="rounded-full bg-[#f8c75e] px-3 py-1.5 text-[#182443]">{isPortuguese ? category.namePt : category.name}</span><span className="rounded-full bg-white/10 px-3 py-1.5">{isPortuguese ? template.namePt || template.name : template.name}</span>{!template.magazineStyle && <span className="rounded-full bg-white/10 px-3 py-1.5">{isPortuguese ? "Moldura" : "Marco"}: {isPortuguese ? frame.namePt || frame.name : frame.name}</span>}<span className="rounded-full bg-white/10 px-3 py-1.5">{card.size}</span></div>
      </div>
      <div className="mx-auto max-w-[650px] rounded-[20px] bg-[#f5ece6] p-0 sm:p-2">
        <div className="overflow-hidden rounded-[14px]">
          <PostcardSideView side={activeSide} compact={false} />
        </div>
      </div>
      <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-white/55"><Icon name="check" size={14} /> {isPortuguese ? "Esta vista usa o teu modelo, moldura, fotografia, texto e emoji atuais." : "Esta vista usa tu plantilla, marco, foto, texto y emoji actuales."}</p>
    </section>

    <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4" role="list" aria-label={isPortuguese ? "Selecionar lado do cartão" : "Seleccionar lado de la tarjeta"}>
      {localizedSides.map((side, index) => {
        const selected = side.id === activeSide;
        return <button key={side.id} type="button" role="listitem" aria-pressed={selected} onClick={() => setActiveSide(side.id)} className={`focus-ring overflow-hidden rounded-[18px] border-2 bg-white p-2 text-left transition hover:-translate-y-0.5 hover:shadow-lg ${selected ? "border-[#ee5264] shadow-md" : "border-[#e4d8d1]"}`}>
          <span className="pointer-events-none block overflow-hidden rounded-[11px] bg-[#f8efe8]"><PostcardSideView side={side.id} compact /></span>
          <span className="flex items-center gap-2 px-2 pb-1 pt-3"><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${selected ? "bg-[#ee5264] text-white" : "bg-[#f1e7e0] text-[#786f79]"}`}>{index + 1}</span><span><span className="block text-xs font-black text-[#182443]">{side.label}</span><span className="mt-0.5 hidden text-[10px] text-[#7c8191] sm:block">{side.description}</span></span></span>
        </button>;
      })}
    </div>
  </div>;
}

export function PostcardSideView({ side, compact }: { side: PostcardSide; compact: boolean }) {
  const card = useSelector((state: RootState) => state.cart.card);
  const isPortuguese = useSelector((state: RootState) => state.language.language === "pt");
  const template = templates.find((item) => item.id === card.templateId) || templates[0];
  const frame = frames.find((item) => item.id === card.frameId) || frames[0];
  const image = card.photoDataUrls[0] || card.photoDataUrl || "/images/sticker-family.jpg";
  const surfaceClass = compact ? "aspect-[.9/1]" : card.size === "A3" ? "aspect-[.78/1]" : "aspect-[.82/1]";
  const imageStyle = { objectPosition: card.photoPosition, transform: `scale(${card.photoZoom})` };
  const messageClass = compact ? "text-[10px] leading-tight" : "text-[clamp(18px,3.5vw,42px)] leading-[1.02]";
  const isTraditional = Boolean(template.longText);
  const isCollage = template.id === "template-2";
  const accent = template.magazineStyle ? "#e51f2a" : "#ee5264";

  if (side === "front") {
    return <CardPreview compact={compact} templateId={template.id} message={card.frontHeadline || card.message} emojiElements={card.emojiElements} photoDataUrl={card.photoDataUrl} photoDataUrls={card.photoDataUrls} photoZoom={card.photoZoom} photoPosition={card.photoPosition} size={card.size} />;
  }

  if (side === "back") {
    return <div className={`relative overflow-hidden bg-[#fffdf9] ${surfaceClass}`}>
      {!template.magazineStyle && <SelectedFrameOverlay src={frame.image} frameId={frame.id} />}
      {template.magazineStyle && <div className="absolute inset-x-0 top-0 h-[14%] bg-[#e51f2a]" />}
      <div style={template.magazineStyle ? { top: "10%", right: "10%", bottom: "10%", left: "10%" } : frameOpeningStyle(frame.id)} className="absolute z-10 flex flex-col items-center justify-center text-center">
        <img src="/images/logo.png" alt="Celebra Momentos" className={compact ? "h-14 w-14 object-contain" : "h-32 w-32 object-contain sm:h-40 sm:w-40"} />
        <p className={`font-black text-[#182443] ${compact ? "mt-1 text-[7px]" : "mt-3 text-lg"}`}>Celebra Momentos</p>
        <p className={`rounded-[7px] bg-[#f8c75e] px-[5%] py-[3%] font-serif font-bold text-[#182443] ${compact ? "mt-1 text-[7px]" : "mt-3 text-lg"}`}>{card.backText || (isPortuguese ? "Um cartão criado especialmente para alguém especial." : "Una tarjeta creada especialmente para alguien especial.")}</p>
      </div>
    </div>;
  }

  if (template.magazineStyle && side === "inside-left") {
    return <MagazineInsideLeftView compact={compact} surfaceClass={surfaceClass} photoDataUrl={card.photoDataUrls[1]} text={card.insideLeftText} />;
  }

  if (template.magazineStyle && side === "inside-right") {
    return <MagazineInsideRightView compact={compact} surfaceClass={surfaceClass} photoDataUrls={card.photoDataUrls.slice(2, 4)} text={card.insideRightText} />;
  }

  if (side === "inside-left") {
    const leftPhoto = card.photoDataUrls[1] || image;
    const leftText = card.insideLeftText || card.message || (isPortuguese ? "A tua mensagem aqui" : "Tu mensaje aquí");
    return <div className={`relative overflow-hidden bg-[#fffdf9] ${surfaceClass}`}>
      <SelectedFrameOverlay src={frame.image} frameId={frame.id} />
      <div style={frameOpeningStyle(frame.id)} className={`absolute z-10 flex flex-col justify-between ${compact ? "rounded-md p-[7%]" : "rounded-xl p-[8%]"}`}>
        {isTraditional ? <div><p className={`serif whitespace-pre-line break-words font-bold text-[#182443] ${messageClass}`}>{leftText}</p><div className={compact ? "mt-2 h-0.5 w-8" : "mt-5 h-1 w-16"} style={{ backgroundColor: accent }} /></div> : <>
          <div className={`grid min-h-0 gap-[3%] ${isCollage ? "grid-rows-2" : "grid-rows-1"} ${compact ? "my-1 flex-1" : "my-[6%] flex-1"}`}><div className="relative overflow-hidden rounded-lg bg-[#f4ebe5]"><img src={leftPhoto} alt={isPortuguese ? "A tua fotografia no interior esquerdo" : "Tu foto en el interior izquierdo"} className="absolute inset-0 h-full w-full object-cover" style={imageStyle} /></div>{isCollage && <div className="relative overflow-hidden rounded-lg bg-[#f4ebe5]"><img src={card.photoDataUrls[2] || "/images/sticker-baby.jpg"} alt={isPortuguese ? "A tua segunda fotografia no interior esquerdo" : "Tu segunda foto en el interior izquierdo"} className="absolute inset-0 h-full w-full object-cover" style={imageStyle} /></div>}</div>
          <p className={`serif line-clamp-3 font-bold text-[#182443] ${compact ? "text-[7px]" : "text-xl sm:text-2xl"}`}>{leftText}</p>
        </>}
      </div>
    </div>;
  }

  const rightPhoto = card.photoDataUrls[isTraditional ? 1 : 3] || image;
  const rightText = card.insideRightText || card.message || (isPortuguese ? "A tua mensagem aqui" : "Tu mensaje aquí");
  return <div className={`relative overflow-hidden bg-[#fffdf9] ${surfaceClass}`}>
    <SelectedFrameOverlay src={frame.image} frameId={frame.id} />
    <div style={frameOpeningStyle(frame.id)} className={`absolute z-10 flex flex-col ${compact ? "gap-1 rounded-md p-[6%]" : "gap-[5%] rounded-xl p-[7%]"}`}>
      <div className={`relative overflow-hidden rounded-lg bg-[#f4ebe5] ${isTraditional ? "flex-[1.5]" : "flex-1"}`}><img src={rightPhoto} alt={isPortuguese ? "A tua fotografia no interior direito" : "Tu foto en el interior derecho"} className="absolute inset-0 h-full w-full object-cover" style={imageStyle} /></div>
      <div className="flex items-start gap-2"><p className={`serif flex-1 whitespace-pre-line break-words font-bold text-[#182443] ${compact ? "line-clamp-2 text-[7px] leading-tight" : "text-xl leading-tight sm:text-2xl"}`}>{rightText}</p></div>
    </div>
  </div>;
}
