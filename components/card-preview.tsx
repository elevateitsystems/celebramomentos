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
  photoFit?: "cover" | "contain" | "fill";
};

const clampPosition = (value: number) => Math.min(94, Math.max(6, value));
const samplePhotos = ["/images/graduation-celebration.png", "/images/sticker-family.jpg", "/images/sticker-baby.jpg", "/images/sticker-lifestyle-dog.jpg", "/images/sticker-cello.jpg"];

// Each frame asset already contains the complete outside edge of the product.
// Artwork is placed in the asset's opening so no second card/panel is rendered
// behind the frame.
export function frameOpeningStyle(frameId: string) {
  switch (frameId) {
    case "classic":
      return { top: "13%", right: "15%", bottom: "14%", left: "15%" };
    case "geometric-heart":
      return { top: "9%", right: "9%", bottom: "9%", left: "9%" };
    case "balloon-frame":
      return { top: "9%", right: "9%", bottom: "9%", left: "9%" };
    case "romantic-heart":
      return { top: "8%", right: "8%", bottom: "8%", left: "8%" };
    case "floral":
    default:
      return { top: "8%", right: "8%", bottom: "8%", left: "8%" };
  }
}

export function CardPreview({ templateId, message, emoji = "✨", emojiTone, emojiSize, emojiPosition, emojiElements, onEmojiPositionChange, onEmojiElementPositionChange, onEmojiSelect, photoDataUrl, photoDataUrls, photoZoom = 1, photoPosition = "center", frameId, size = "A4", compact = false, className = "", photoFit = "cover" }: CardPreviewProps) {
  const savedCard = useSelector((state: RootState) => state.cart.card);
  const isPortuguese = useSelector((state: RootState) => state.language.language === "pt");
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

  return <div ref={designRef} className={`relative overflow-hidden rounded-[12px] bg-[#fffaf5] ${surfaceClass} ${className}`}>
    {template.magazineStyle ? <MagazineFront compact={compact} message={message} photoDataUrl={photos[0]} photoZoom={photoZoom} photoPosition={photoPosition} /> : template.id === "template-2" ? <CollageFront compact={compact} message={message} photos={photos} frameId={frame.id} frameImage={frame.image} photoZoom={photoZoom} photoPosition={photoPosition} photoFit={photoFit} isPortuguese={isPortuguese} /> : <StoryFront compact={compact} message={message} photos={photos} frameId={frame.id} frameImage={frame.image} photoZoom={photoZoom} photoPosition={photoPosition} photoFit={photoFit} isPortuguese={isPortuguese} />}
    {elements.map((item) => <span key={item.id} role={canMoveEmoji ? "button" : undefined} tabIndex={canMoveEmoji ? 0 : undefined} aria-label={canMoveEmoji ? (isPortuguese ? `Mover emoji ${item.emoji}. Arrasta ou usa as setas` : `Mover emoji ${item.emoji}. Arrastra o usa las flechas`) : undefined} title={canMoveEmoji ? (isPortuguese ? "Arrasta para mover; seleciona para alterar o tamanho" : "Arrastra para mover; selecciónalo para cambiar su tamaño") : undefined} onPointerDown={(event) => { if (!canMoveEmoji) return; onEmojiSelect?.(item.id); event.currentTarget.setPointerCapture(event.pointerId); moveEmoji(event, item.id); }} onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) moveEmoji(event, item.id); }} onKeyDown={(event) => handleKeyDown(event, item)} onFocus={() => onEmojiSelect?.(item.id)} className={`absolute z-30 select-none leading-none outline-none ${canMoveEmoji ? "cursor-grab touch-none rounded-lg focus:ring-2 focus:ring-[#ee5264] focus:ring-offset-2 active:cursor-grabbing" : ""}`} style={{ left: `${item.position.x}%`, top: `${item.position.y}%`, fontSize: `${compact ? item.size * .5 : item.size}px`, filter: emojiToneFilters[item.tone], transform: "translate(-50%, -50%)" }}>{item.emoji}</span>)}
  </div>;
}

function PhotoTile({ src, fallback, alt, className, photoZoom = 1, photoPosition = "center", photoFit = "cover", isPortuguese }: { src: string | null; fallback: string; alt: string; className: string; photoZoom?: number; photoPosition?: string; photoFit?: "cover" | "contain" | "fill"; isPortuguese: boolean }) {
  const fitClass = photoFit === "contain" ? "object-contain" : photoFit === "fill" ? "object-fill" : "object-cover";
  return <div className={`relative overflow-hidden bg-[#eee5df] ${className}`}><img src={src || fallback} alt={alt} className={`h-full w-full ${fitClass} ${src ? "" : "opacity-75 saturate-[.8]"}`} style={{ objectPosition: photoPosition, transform: src && photoFit === "cover" ? `scale(${photoZoom})` : undefined }} />{!src && <span className="absolute inset-x-0 bottom-0 bg-[#182443]/70 px-2 py-1 text-center text-[clamp(5px,1vw,9px)] font-black uppercase tracking-wider text-white">{isPortuguese ? "Adiciona fotografia" : "Añade foto"}</span>}</div>;
}

function CollageFront({ compact, message, photos, frameId, frameImage, photoZoom, photoPosition, photoFit, isPortuguese }: { compact: boolean; message: string; photos: (string | null)[]; frameId: string; frameImage: string; photoZoom: number; photoPosition: string; photoFit: "cover" | "contain" | "fill"; isPortuguese: boolean }) {
  return <div className="absolute inset-0"><img src={frameImage} alt="" className="absolute inset-0 z-0 h-full w-full object-fill" /><div style={frameOpeningStyle(frameId)} className="absolute z-10 flex flex-col p-[5%]"><div className="mb-[4%] rounded-[10px] bg-[#f8c75e] px-[4%] py-[3%] text-center shadow-sm"><p className={`line-clamp-2 font-serif font-bold leading-tight text-[#182443] ${compact ? "text-[9px]" : "text-[clamp(19px,3.2vw,32px)]"}`}>{message || (isPortuguese ? "Parabéns" : "Enhorabuena")}</p></div><PhotoTile src={photos[0]} fallback={samplePhotos[0]} alt={isPortuguese ? "Fotografia 1 · Capa" : "Foto 1 · Portada"} className="min-h-0 flex-1 rounded-md" photoZoom={photoZoom} photoPosition={photoPosition} photoFit={photoFit} isPortuguese={isPortuguese} /></div></div>;
}

function StoryFront({ compact, message, photos, frameId, frameImage, photoZoom, photoPosition, photoFit, isPortuguese }: { compact: boolean; message: string; photos: (string | null)[]; frameId: string; frameImage: string; photoZoom: number; photoPosition: string; photoFit: "cover" | "contain" | "fill"; isPortuguese: boolean }) {
  return <div className="absolute inset-0">
    <img src={frameImage} alt="" className="absolute inset-0 z-0 h-full w-full object-fill" />
    <div style={frameOpeningStyle(frameId)} className={`absolute z-10 flex flex-col items-center ${compact ? "p-[5%]" : "p-[5.5%]"}`}>
      <PhotoTile
        src={photos[0]}
        fallback={samplePhotos[0]}
        alt={isPortuguese ? "Fotografia 1 · Capa" : "Foto 1 · Portada"}
        className={`w-[88%] shrink-0 rounded-[clamp(6px,1vw,14px)] ${compact ? "h-[48%]" : "h-[54%]"}`}
        photoZoom={photoZoom}
        photoPosition={photoPosition}
        photoFit={photoFit}
        isPortuguese={isPortuguese}
      />
      <div className="mt-[6%] flex min-h-0 w-[92%] flex-1 flex-col items-center text-center">
        <p className={`max-w-full rounded-[10px] bg-[#f8c75e] px-[5%] py-[4%] line-clamp-2 whitespace-pre-line break-words font-serif font-bold leading-[1.02] text-[#182443] shadow-sm ${compact ? "text-[10px]" : "text-[clamp(22px,4vw,40px)]"}`}>{message || (isPortuguese ? "Parabéns" : "Enhorabuena")}</p>
      </div>
    </div>
  </div>;
}
