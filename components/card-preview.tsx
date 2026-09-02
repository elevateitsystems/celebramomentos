"use client";

import { type KeyboardEvent, type PointerEvent, useRef } from "react";
import { useSelector } from "react-redux";
import { frames, templates } from "@/lib/data";
import { defaultEmojiPosition, emojiToneFilters, type EmojiPosition, type EmojiTone } from "@/lib/emojis";
import type { RootState } from "@/lib/store";

type CardPreviewProps = {
  templateId: string;
  message: string;
  emoji: string;
  emojiTone?: EmojiTone;
  emojiSize?: number;
  emojiPosition?: EmojiPosition;
  onEmojiPositionChange?: (position: EmojiPosition) => void;
  photoDataUrl?: string | null;
  photoZoom?: number;
  photoPosition?: "center" | "top" | "bottom" | "left" | "right";
  size?: "A4" | "A3";
  compact?: boolean;
};

const clampPosition = (value: number) => Math.min(94, Math.max(6, value));

export function CardPreview({
  templateId,
  message,
  emoji,
  emojiTone,
  emojiSize,
  emojiPosition,
  onEmojiPositionChange,
  photoDataUrl,
  photoZoom = 1,
  photoPosition = "center",
  size = "A4",
  compact = false,
}: CardPreviewProps) {
  const savedEmoji = useSelector((state: RootState) => state.cart.card);
  const template = templates.find((item) => item.id === templateId) || templates[0];
  const frame = frames.find((item) => item.id === savedEmoji.frameId) || frames[0];
  const backgroundImage = template.magazineStyle ? (photoDataUrl || template.image) : frame.image;
  const designRef = useRef<HTMLDivElement>(null);
  const canMoveEmoji = Boolean(onEmojiPositionChange) && !compact;
  const activeEmojiTone = emojiTone ?? savedEmoji.emojiTone ?? "natural";
  const activeEmojiSize = emojiSize ?? savedEmoji.emojiSize ?? 28;
  const activeEmojiPosition = emojiPosition ?? savedEmoji.emojiPosition ?? defaultEmojiPosition;

  const moveEmoji = (event: PointerEvent<HTMLSpanElement>) => {
    if (!canMoveEmoji || !designRef.current) return;
    const bounds = designRef.current.getBoundingClientRect();
    onEmojiPositionChange?.({
      x: clampPosition(((event.clientX - bounds.left) / bounds.width) * 100),
      y: clampPosition(((event.clientY - bounds.top) / bounds.height) * 100),
    });
  };

  const handlePointerDown = (event: PointerEvent<HTMLSpanElement>) => {
    if (!canMoveEmoji) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    moveEmoji(event);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (!canMoveEmoji || !onEmojiPositionChange) return;
    const movement = event.shiftKey ? 5 : 2;
    const next = { ...activeEmojiPosition };
    if (event.key === "ArrowLeft") next.x -= movement;
    else if (event.key === "ArrowRight") next.x += movement;
    else if (event.key === "ArrowUp") next.y -= movement;
    else if (event.key === "ArrowDown") next.y += movement;
    else return;
    event.preventDefault();
    onEmojiPositionChange({ x: clampPosition(next.x), y: clampPosition(next.y) });
  };

  return (
    <div className={`relative overflow-hidden rounded-[12px] bg-[#fff0e8] ${compact ? "aspect-[.9/1]" : size === "A3" ? "aspect-[.78/1]" : "aspect-[.82/1]"}`}>
      <img src={backgroundImage} alt={`Vista previa ${template.name}`} className={`absolute inset-0 h-full w-full ${template.magazineStyle && !photoDataUrl ? "object-contain" : "object-cover"} ${template.magazineStyle ? "opacity-85" : "opacity-70"}`} style={template.magazineStyle && photoDataUrl ? { objectPosition: photoPosition, transform: `scale(${photoZoom})` } : undefined} />
      {photoDataUrl && !template.magazineStyle && <div className="absolute inset-[11%] overflow-hidden rounded-[8px] border-2 border-white/90 shadow-lg"><img src={photoDataUrl} alt="Tu foto dentro del marco elegido" className="h-full w-full object-cover transition-transform duration-300" style={{ objectPosition: photoPosition, transform: `scale(${photoZoom})` }} /></div>}
      <div className={`absolute inset-0 ${template.magazineStyle ? "bg-white/20" : "bg-white/50"}`} />
      <div ref={designRef} className={`absolute flex flex-col justify-between rounded-[8px] backdrop-blur-[1px] ${template.magazineStyle ? "border-2 border-[#e51f2a] bg-white/65" : "border border-white/90 bg-white/60"} ${compact ? "inset-[7%] p-[7%]" : "inset-[8%] p-[7%]"}`}>
        <div>{template.magazineStyle ? <span className="inline-block bg-[#e51f2a] px-3 py-2 text-[clamp(10px,2.2vw,22px)] font-black uppercase leading-none text-white">Últimas noticias</span> : <span className="rounded-full bg-[#182443] px-3 py-1.5 text-[9px] font-black tracking-[.12em] text-white">PARA ALGUIEN ESPECIAL</span>}</div>
        <span
          role={canMoveEmoji ? "button" : undefined}
          tabIndex={canMoveEmoji ? 0 : undefined}
          aria-label={canMoveEmoji ? "Mover emoji. Arrastra o usa las flechas del teclado" : undefined}
          title={canMoveEmoji ? "Arrastra para mover el emoji" : undefined}
          onPointerDown={handlePointerDown}
          onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) moveEmoji(event); }}
          onKeyDown={handleKeyDown}
          className={`absolute z-10 select-none leading-none outline-none ${canMoveEmoji ? "cursor-grab touch-none rounded-lg focus:ring-2 focus:ring-[#ee5264] focus:ring-offset-2 active:cursor-grabbing" : ""}`}
          style={{ left: `${activeEmojiPosition.x}%`, top: `${activeEmojiPosition.y}%`, fontSize: `${compact ? activeEmojiSize * 0.55 : activeEmojiSize}px`, filter: emojiToneFilters[activeEmojiTone], transform: "translate(-50%, -50%)" }}
        >
          {emoji}
        </span>
        <div className={template.id === "template-2" ? "rounded-xl bg-white/75 p-[5%] text-center" : ""}><p className={`${template.magazineStyle ? "font-sans" : "serif"} max-w-[460px] whitespace-pre-line break-words font-bold leading-[.98] tracking-[-.05em] text-[#182443] ${compact ? "text-2xl" : "text-[clamp(28px,5vw,58px)]"}`}>{message || "Tu mensaje aquí"}</p><div className={`mt-5 h-1 w-16 rounded-full ${template.id === "template-2" ? "mx-auto" : ""} ${template.magazineStyle ? "bg-[#1d5894]" : "bg-[#ee5264]"}`} /></div>
        <div className="flex items-end justify-between"><span className={`${template.magazineStyle ? "rounded bg-[#1d5894] px-2 py-1 font-sans font-black text-white" : "serif italic text-[#ee5264]"} ${compact ? "text-xs" : "text-[clamp(13px,2vw,18px)]"}`}>{template.magazineStyle ? "EXCLUSIVA" : "Con todo mi cariño"}</span><span className={compact ? "text-lg" : "text-2xl"}>♡</span></div>
      </div>
    </div>
  );
}
