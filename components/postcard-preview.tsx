"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { CardPreview } from "./card-preview";
import { Icon } from "./icons";
import { frames, templates } from "@/lib/data";
import { emojiToneFilters } from "@/lib/emojis";
import type { RootState } from "@/lib/store";

type PostcardSide = "front" | "inside-left" | "inside-right" | "back";

const sides: { id: PostcardSide; label: string; description: string }[] = [
  { id: "front", label: "Portada", description: "La primera impresión" },
  { id: "inside-left", label: "Interior izquierdo", description: "Al abrir la tarjeta" },
  { id: "inside-right", label: "Interior derecho", description: "La parte principal interior" },
  { id: "back", label: "Contraportada", description: "La parte posterior" },
];

export function PostcardPreviewWindow() {
  const card = useSelector((state: RootState) => state.cart.card);
  const [activeSide, setActiveSide] = useState<PostcardSide>("front");
  const template = templates.find((item) => item.id === card.templateId) || templates[0];
  const frame = frames.find((item) => item.id === card.frameId) || frames[0];
  const active = sides.find((item) => item.id === activeSide) || sides[0];

  return <div className="mt-12">
    <section className="overflow-hidden rounded-[28px] bg-[#182443] p-4 shadow-2xl shadow-[#182443]/15 sm:p-7" aria-label="Ventana de vista previa de la tarjeta completa">
      <div className="mb-5 flex flex-col gap-3 text-white sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#f8c75e]">VISTA ACTUAL · {active.label}</p><p className="mt-1 text-sm text-white/60">{active.description}</p></div>
        <div className="flex flex-wrap gap-2 text-[10px] font-black"><span className="rounded-full bg-white/10 px-3 py-1.5">{template.name}</span>{!template.magazineStyle && <span className="rounded-full bg-white/10 px-3 py-1.5">Marco: {frame.name}</span>}<span className="rounded-full bg-white/10 px-3 py-1.5">{card.size}</span></div>
      </div>
      <div className="mx-auto max-w-[650px] rounded-[20px] bg-[#f5ece6] p-3 sm:p-5">
        <div className="overflow-hidden rounded-[14px] bg-white shadow-xl shadow-black/10">
          <PostcardSideView side={activeSide} compact={false} />
        </div>
      </div>
      <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-white/55"><Icon name="check" size={14} /> Esta vista usa tu plantilla, marco, foto, texto y emoji actuales.</p>
    </section>

    <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4" role="list" aria-label="Seleccionar lado de la tarjeta">
      {sides.map((side, index) => {
        const selected = side.id === activeSide;
        return <button key={side.id} type="button" role="listitem" aria-pressed={selected} onClick={() => setActiveSide(side.id)} className={`focus-ring overflow-hidden rounded-[18px] border-2 bg-white p-2 text-left transition hover:-translate-y-0.5 hover:shadow-lg ${selected ? "border-[#ee5264] shadow-md" : "border-[#e4d8d1]"}`}>
          <span className="pointer-events-none block overflow-hidden rounded-[11px] bg-[#f8efe8]"><PostcardSideView side={side.id} compact /></span>
          <span className="flex items-center gap-2 px-2 pb-1 pt-3"><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${selected ? "bg-[#ee5264] text-white" : "bg-[#f1e7e0] text-[#786f79]"}`}>{index + 1}</span><span><span className="block text-xs font-black text-[#182443]">{side.label}</span><span className="mt-0.5 hidden text-[10px] text-[#7c8191] sm:block">{side.description}</span></span></span>
        </button>;
      })}
    </div>
  </div>;
}

function PostcardSideView({ side, compact }: { side: PostcardSide; compact: boolean }) {
  const card = useSelector((state: RootState) => state.cart.card);
  const template = templates.find((item) => item.id === card.templateId) || templates[0];
  const frame = frames.find((item) => item.id === card.frameId) || frames[0];
  const image = card.photoDataUrl || (template.magazineStyle ? template.image : frame.image);
  const surfaceClass = compact ? "aspect-[.9/1]" : card.size === "A3" ? "aspect-[.78/1]" : "aspect-[.82/1]";
  const imageStyle = { objectPosition: card.photoPosition, transform: `scale(${card.photoZoom})` };
  const emojiStyle = { filter: emojiToneFilters[card.emojiTone], fontSize: compact ? `${Math.max(11, card.emojiSize * .42)}px` : `${Math.max(18, card.emojiSize * .8)}px` };
  const messageClass = compact ? "text-[10px] leading-tight" : "text-[clamp(18px,3.5vw,42px)] leading-[1.02]";
  const isTemplateOne = template.id === "template-1";
  const accent = template.magazineStyle ? "#e51f2a" : "#ee5264";

  if (side === "front") {
    return <CardPreview compact={compact} templateId={template.id} message={card.message} emoji={card.emoji} emojiTone={card.emojiTone} emojiSize={card.emojiSize} emojiPosition={card.emojiPosition} photoDataUrl={card.photoDataUrl} photoZoom={card.photoZoom} photoPosition={card.photoPosition} size={card.size} />;
  }

  if (side === "back") {
    return <div className={`relative overflow-hidden bg-[#fffdf9] ${surfaceClass}`}>
      {!template.magazineStyle && <img src={frame.image} alt="" className="absolute inset-x-0 top-0 h-[14%] w-full object-cover opacity-80" />}
      {template.magazineStyle && <div className="absolute inset-x-0 top-0 h-[14%] bg-[#e51f2a]"><span className={`absolute left-[7%] top-1/2 -translate-y-1/2 font-black uppercase text-white ${compact ? "text-[6px]" : "text-sm"}`}>Últimas noticias</span></div>}
      <div className="absolute inset-[10%] flex flex-col items-center justify-center text-center">
        <img src="/images/logo.png" alt="Celebra Momentos" className={compact ? "h-12 w-12 object-contain" : "h-28 w-28 object-contain sm:h-36 sm:w-36"} />
        <p className={`font-black text-[#182443] ${compact ? "mt-1 text-[7px]" : "mt-3 text-lg"}`}>Celebra Momentos</p>
        <p className={`text-[#737b90] ${compact ? "mt-0.5 text-[5px]" : "mt-2 text-xs"}`}>Una tarjeta creada especialmente para alguien especial.</p>
        <div className={`border-t border-[#e8ddd6] text-[#9297a4] ${compact ? "mt-2 pt-1 text-[5px]" : "mt-7 pt-4 text-[11px]"}`}>{template.name}{!template.magazineStyle ? ` · ${frame.name}` : " · Edición especial"} · {card.size}</div>
      </div>
    </div>;
  }

  if (side === "inside-left") {
    return <div className={`relative overflow-hidden bg-[#fffdf9] ${surfaceClass}`}>
      {!template.magazineStyle && <img src={frame.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-[.16]" />}
      <div className={`absolute flex flex-col justify-between border bg-white/90 ${compact ? "inset-[7%] rounded-md p-[7%]" : "inset-[8%] rounded-xl p-[8%]"}`} style={{ borderColor: `${accent}55` }}>
        <div className="flex items-start justify-between gap-2"><span className={`font-black uppercase tracking-[.14em] ${compact ? "text-[5px]" : "text-[10px]"}`} style={{ color: accent }}>INTERIOR IZQUIERDO</span><span style={emojiStyle}>{card.emoji}</span></div>
        {isTemplateOne ? <div><p className={`serif whitespace-pre-line break-words font-bold text-[#182443] ${messageClass}`}>{card.message || "Tu mensaje aquí"}</p><div className={compact ? "mt-2 h-0.5 w-8" : "mt-5 h-1 w-16"} style={{ backgroundColor: accent }} /></div> : <>
          <div className={`relative overflow-hidden rounded-lg bg-[#f4ebe5] ${compact ? "my-1 flex-1" : "my-[6%] flex-1"}`}><img src={image} alt="Tu foto en el interior izquierdo" className="absolute inset-0 h-full w-full object-cover" style={imageStyle} /></div>
          <p className={`serif line-clamp-2 font-bold text-[#182443] ${compact ? "text-[7px]" : "text-xl sm:text-2xl"}`}>{card.message || "Tu mensaje aquí"}</p>
        </>}
      </div>
    </div>;
  }

  return <div className={`relative overflow-hidden bg-[#fffdf9] ${surfaceClass}`}>
    {!template.magazineStyle && <img src={frame.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-[.13]" />}
    <div className={`absolute flex flex-col border bg-white/90 ${compact ? "inset-[7%] gap-1 rounded-md p-[6%]" : "inset-[8%] gap-[5%] rounded-xl p-[7%]"}`} style={{ borderColor: `${accent}55` }}>
      <span className={`font-black uppercase tracking-[.14em] ${compact ? "text-[5px]" : "text-[10px]"}`} style={{ color: accent }}>INTERIOR DERECHO</span>
      <div className={`relative overflow-hidden rounded-lg bg-[#f4ebe5] ${isTemplateOne ? "flex-[1.5]" : "flex-1"}`}><img src={image} alt="Tu foto en el interior derecho" className="absolute inset-0 h-full w-full object-cover" style={imageStyle} /></div>
      <div className="flex items-start gap-2"><p className={`serif flex-1 whitespace-pre-line break-words font-bold text-[#182443] ${compact ? "line-clamp-2 text-[7px] leading-tight" : "text-xl leading-tight sm:text-2xl"}`}>{card.message || "Tu mensaje aquí"}</p><span className="shrink-0" style={emojiStyle}>{card.emoji}</span></div>
      {!isTemplateOne && <div className={`relative overflow-hidden rounded-lg bg-[#f4ebe5] ${compact ? "h-[28%]" : "h-[25%]"}`}><img src={image} alt="Tu segunda foto en el interior derecho" className="absolute inset-0 h-full w-full object-cover" style={imageStyle} /></div>}
    </div>
  </div>;
}
