"use client";

import { type KeyboardEvent, type PointerEvent, useRef } from "react";
import { useSelector } from "react-redux";
import { frames, templates } from "@/lib/data";
import { defaultEmojiPosition, emojiToneFilters, type EmojiElement, type EmojiPosition, type EmojiTone } from "@/lib/emojis";
import type { RootState } from "@/lib/store";
import { MagazineFront } from "./magazine-card";

type CardPreviewProps = {
  templateId: string;
  message: string;
  emoji?: string;
  emojiTone?: EmojiTone;
  emojiSize?: number;
  emojiPosition?: EmojiPosition;
  emojiElements?: EmojiElement[];
  onEmojiPositionChange?: (position: EmojiPosition) => void;
  onEmojiElementPositionChange?: (id: string, position: EmojiPosition) => void;
  onEmojiSelect?: (id: string) => void;
  photoDataUrl?: string | null;
  photoDataUrls?: (string | null)[];
  photoZoom?: number;
  photoPosition?: "center" | "top" | "bottom" | "left" | "right";
  frameId?: string | null;
  size?: "A4" | "A3";
  compact?: boolean;
  className?: string;
};

const clampPosition = (value: number) => Math.min(94, Math.max(6, value));
const samplePhotos = ["/images/graduation-celebration.png", "/images/sticker-family.jpg", "/images/sticker-baby.jpg", "/images/sticker-lifestyle-dog.jpg", "/images/sticker-cello.jpg"];

export function CardPreview({ templateId, message, emoji = "✨", emojiTone, emojiSize, emojiPosition, emojiElements, onEmojiPositionChange, onEmojiElementPositionChange, onEmojiSelect, photoDataUrl, photoDataUrls, photoZoom = 1, photoPosition = "center", frameId, size = "A4", compact = false, className = "" }: CardPreviewProps) {
  const savedCard = useSelector((state: RootState) => state.cart.card);
  const template = templates.find((item) => item.id === templateId) || templates[0];
  const frame = frames.find((item) => item.id === (frameId ?? savedCard.frameId)) || frames[0];
  const designRef = useRef<HTMLDivElement>(null);
  const effectivePhotoUrls = photoDataUrls ?? (savedCard.templateId === templateId ? savedCard.photoDataUrls : undefined);
  const photos = Array.from({ length: template.imageCount }, (_, index) => effectivePhotoUrls?.[index] ?? (index === 0 ? photoDataUrl : null) ?? null);
  const legacyElement: EmojiElement = { id: "legacy-emoji", emoji, tone: emojiTone ?? savedCard.emojiTone ?? "natural", size: emojiSize ?? savedCard.emojiSize ?? 28, position: emojiPosition ?? savedCard.emojiPosition ?? defaultEmojiPosition };
  const elements = emojiElements ?? (savedCard.templateId === templateId ? savedCard.emojiElements : [legacyElement]);
  const canMoveEmoji = Boolean(onEmojiElementPositionChange || onEmojiPositionChange) && !compact;
  const surfaceClass = compact ? template.magazineStyle ? "aspect-square" : "aspect-[.9/1]" : size === "A3" ? "aspect-[.78/1]" : "aspect-[.82/1]";

  const updatePosition = (id: string, position: EmojiPosition) => {
    onEmojiElementPositionChange?.(id, position);
    if (id === "legacy-emoji" || elements[0]?.id === id) onEmojiPositionChange?.(position);
  };

  const moveEmoji = (event: PointerEvent<HTMLSpanElement>, id: string) => {
    if (!canMoveEmoji || !designRef.current) return;
    const bounds = designRef.current.getBoundingClientRect();
    updatePosition(id, { x: clampPosition(((event.clientX - bounds.left) / bounds.width) * 100), y: clampPosition(((event.clientY - bounds.top) / bounds.height) * 100) });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLSpanElement>, item: EmojiElement) => {
    if (!canMoveEmoji) return;
    const movement = event.shiftKey ? 5 : 2;
    const next = { ...item.position };
    if (event.key === "ArrowLeft") next.x -= movement;
    else if (event.key === "ArrowRight") next.x += movement;
    else if (event.key === "ArrowUp") next.y -= movement;
    else if (event.key === "ArrowDown") next.y += movement;
    else return;
    event.preventDefault();
    updatePosition(item.id, { x: clampPosition(next.x), y: clampPosition(next.y) });
  };

  return <div ref={designRef} className={`relative overflow-hidden rounded-[12px] bg-[#fff0e8] ${surfaceClass} ${className}`}>
    {template.magazineStyle ? <MagazineFront compact={compact} message={message} photoDataUrl={photos[0]} photoZoom={photoZoom} photoPosition={photoPosition} /> : template.id === "template-2" ? <CollageFront compact={compact} message={message} photos={photos} frameImage={frame.image} photoZoom={photoZoom} photoPosition={photoPosition} /> : <StoryFront compact={compact} message={message} photos={photos} frameImage={frame.image} photoZoom={photoZoom} photoPosition={photoPosition} />}
    {elements.map((item) => <span key={item.id} role={canMoveEmoji ? "button" : undefined} tabIndex={canMoveEmoji ? 0 : undefined} aria-label={canMoveEmoji ? `Mover emoji ${item.emoji}. Arrastra o usa las flechas` : undefined} title={canMoveEmoji ? "Arrastra para mover; selecciónalo para cambiar su tamaño" : undefined} onPointerDown={(event) => { if (!canMoveEmoji) return; onEmojiSelect?.(item.id); event.currentTarget.setPointerCapture(event.pointerId); moveEmoji(event, item.id); }} onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) moveEmoji(event, item.id); }} onKeyDown={(event) => handleKeyDown(event, item)} onFocus={() => onEmojiSelect?.(item.id)} className={`absolute z-30 select-none leading-none outline-none ${canMoveEmoji ? "cursor-grab touch-none rounded-lg focus:ring-2 focus:ring-[#ee5264] focus:ring-offset-2 active:cursor-grabbing" : ""}`} style={{ left: `${item.position.x}%`, top: `${item.position.y}%`, fontSize: `${compact ? item.size * .5 : item.size}px`, filter: emojiToneFilters[item.tone], transform: "translate(-50%, -50%)" }}>{item.emoji}</span>)}
  </div>;
}

function PhotoTile({ src, fallback, alt, className, photoZoom = 1, photoPosition = "center" }: { src: string | null; fallback: string; alt: string; className: string; photoZoom?: number; photoPosition?: string }) {
  return <div className={`relative overflow-hidden bg-[#eee5df] ${className}`}><img src={src || fallback} alt={alt} className={`h-full w-full object-cover ${src ? "" : "opacity-75 saturate-[.8]"}`} style={{ objectPosition: photoPosition, transform: src ? `scale(${photoZoom})` : undefined }} />{!src && <span className="absolute inset-x-0 bottom-0 bg-[#182443]/70 px-2 py-1 text-center text-[clamp(5px,1vw,9px)] font-black uppercase tracking-wider text-white">Añade foto</span>}</div>;
}

function CollageFront({ compact, message, photos, frameImage, photoZoom, photoPosition }: { compact: boolean; message: string; photos: (string | null)[]; frameImage: string; photoZoom: number; photoPosition: string }) {
  return <div className="absolute inset-0"><img src={frameImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-65" /><div className="absolute inset-[8%] flex flex-col rounded-lg border border-white/90 bg-white/90 p-[5%] shadow-lg"><div className="mb-[4%] border-l-4 border-[#ee5264] pl-[4%]"><span className={`font-black uppercase tracking-[.14em] text-[#ee5264] ${compact ? "text-[4px]" : "text-[clamp(7px,1.2vw,11px)]"}`}>Tu colección de momentos</span><p className={`mt-[2%] line-clamp-2 font-serif font-bold leading-tight text-[#182443] ${compact ? "text-[9px]" : "text-[clamp(19px,3.2vw,32px)]"}`}>{message || "Enhorabuena"}</p></div><PhotoTile src={photos[0]} fallback={samplePhotos[0]} alt="Foto 1 · Portada" className="min-h-0 flex-1 rounded-md" photoZoom={photoZoom} photoPosition={photoPosition} /></div></div>;
}

function StoryFront({ compact, message, photos, frameImage, photoZoom, photoPosition }: { compact: boolean; message: string; photos: (string | null)[]; frameImage: string; photoZoom: number; photoPosition: string }) {
  return <div className="absolute inset-0"><img src={frameImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-65" /><div className="absolute inset-[8%] flex flex-col rounded-lg border border-white/90 bg-white/90 p-[5%] shadow-lg"><div className="mb-[5%] text-center"><span className={`font-black uppercase tracking-[.14em] text-[#ee5264] ${compact ? "text-[4px]" : "text-[clamp(7px,1.2vw,11px)]"}`}>Una tarjeta solo tuya</span><p className={`mt-[2%] whitespace-pre-line break-words font-serif font-bold leading-[1.05] text-[#182443] ${compact ? "line-clamp-2 text-[10px]" : "text-[clamp(22px,4vw,40px)]"}`}>{message || "Enhorabuena"}</p></div><PhotoTile src={photos[0]} fallback={samplePhotos[0]} alt="Foto 1 · Portada" className="min-h-0 flex-1 rounded-md" photoZoom={photoZoom} photoPosition={photoPosition} /></div></div>;
}
