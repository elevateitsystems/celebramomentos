"use client";

import { type CSSProperties, type KeyboardEvent, type PointerEvent, useRef } from "react";
import { useSelector } from "react-redux";
import { resolveFrame, templates, type CardSize } from "@/lib/data";
import { defaultEmojiPosition, emojiToneFilters, type EmojiElement, type EmojiPosition, type EmojiTone } from "@/lib/emojis";
import type { RootState, TextAlign, TextPosition } from "@/lib/store";
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
  // 5x7 and A5 share the same proportions (about 17 : 24 with bleed), so the preview shape does not change.
  size?: CardSize;
  compact?: boolean;
  className?: string;
  photoFit?: "cover" | "contain" | "fill";
  headline?: string;
  subheadline?: string;
  category?: string;
  date?: string;
  badge?: string;
  headlineTag?: string;
  footerText?: string;
  // Cover text (Tradicional and Collage). When omitted they come from the card being edited.
  textScale?: number;
  textAlign?: TextAlign;
  textPosition?: TextPosition | null;
  // Set in the editor to let the text be dragged (or moved with the arrow keys).
  onTextPositionChange?: (position: TextPosition | null) => void;
};

const clampPosition = (value: number) => Math.min(94, Math.max(6, value));
const samplePhotos = ["/images/graduation-celebration.png", "/images/sticker-family.jpg", "/images/sticker-baby.jpg", "/images/sticker-lifestyle-dog.jpg", "/images/sticker-lifestyle-sports.jpg"];

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
    // Asymmetric: dotted strip on the left, "HAPPY" band on the right, ribbon at the bottom.
    case "birthday-lights":
      return { top: "9.5%", right: "20%", bottom: "17.5%", left: "19.5%" };
    case "floral":
    default:
      return { top: "8%", right: "8%", bottom: "8%", left: "8%" };
  }
}

// Style of the cover text: the template's own size times the customer's scale. A white halo
// (not a box) keeps it readable over photos and frame art.
function coverTextStyle({ compact, collage, scale, align, position }: { compact: boolean; collage: boolean; scale: number; align: TextAlign; position: TextPosition | null }): CSSProperties {
  const base = compact ? "8px" : collage ? "clamp(13px,2.5vw,25px)" : "clamp(14px,2.8vw,28px)";
  return {
    fontSize: `calc(${base} * ${scale})`,
    textAlign: align,
    textShadow: "0 0 .05em #fff, 0 0 .1em #fff, 0 0 .2em #fff, 0 0 .38em rgba(255,255,255,.95)",
    ...(position
      ? { position: "absolute", width: `${position.w}%`, left: `${position.x * 100}%`, top: `${position.y * 100}%`, transform: `translate(-${position.x * 100}%, -${position.y * 100}%)` }
      : { width: collage ? "100%" : "92%" }),
  };
}

// These frame files have transparent decorative edges, so they must sit above
// the photo to keep every part of the frame visible. Opaque frame files keep
// their existing layer so their white inner opening is not painted over the photo.
export function frameOverlayClass(frameId: string) {
  return frameId === "geometric-heart" || frameId === "romantic-heart" || frameId === "birthday-lights" ? "z-20" : "z-0";
}

export function CardPreview({
  templateId,
  message,
  emoji = "✨",
  emojiTone,
  emojiSize,
  emojiPosition,
  emojiElements,
  onEmojiPositionChange,
  onEmojiElementPositionChange,
  onEmojiSelect,
  photoDataUrl,
  photoDataUrls,
  photoZoom = 1,
  photoPosition = "center",
  frameId,
  compact = false,
  className = "",
  photoFit = "cover",
  headline,
  subheadline,
  category,
  date,
  badge,
  headlineTag,
  footerText,
  textScale,
  textAlign,
  textPosition,
  onTextPositionChange,
}: CardPreviewProps) {
  const savedCard = useSelector((state: RootState) => state.cart.card);
  const isPortuguese = useSelector((state: RootState) => state.language.language === "pt");
  const template = templates.find((item) => item.id === templateId) || templates[0];
  const frame = resolveFrame(frameId ?? savedCard.frameId);
  const designRef = useRef<HTMLDivElement>(null);
  const effectivePhotoUrls = photoDataUrls ?? (savedCard.templateId === templateId ? savedCard.photoDataUrls : undefined);
  const photos = Array.from({ length: template.imageCount }, (_, index) => effectivePhotoUrls?.[index] ?? (index === 0 ? photoDataUrl : null) ?? null);
  const legacyElement: EmojiElement = { id: "legacy-emoji", emoji, tone: emojiTone ?? savedCard.emojiTone ?? "natural", size: emojiSize ?? savedCard.emojiSize ?? 28, position: emojiPosition ?? savedCard.emojiPosition ?? defaultEmojiPosition };
  const elements = emojiElements ?? (savedCard.templateId === templateId ? savedCard.emojiElements : [legacyElement]);
  const canMoveEmoji = Boolean(onEmojiElementPositionChange || onEmojiPositionChange) && !compact;

  // Cover text of Tradicional and Collage. Without explicit props the editor's card is used,
  // except in small thumbnails, which keep the template's own layout.
  const useSaved = savedCard.templateId === templateId && !compact;
  const scale = textScale ?? (useSaved ? savedCard.frontTextScale : undefined) ?? 1;
  const align: TextAlign = textAlign ?? (useSaved ? savedCard.frontTextAlign : undefined) ?? "center";
  const position = textPosition !== undefined ? textPosition : useSaved ? savedCard.frontTextPosition ?? null : null;
  const canMoveText = Boolean(onTextPositionChange) && !compact;
  const coverMessage = message || (isPortuguese ? "Parabéns" : "Enhorabuena");
  const textRef = useRef<HTMLParagraphElement>(null);
  const textDrag = useRef<{ dx: number; dy: number } | null>(null);
  const measure = () => {
    const card = designRef.current?.getBoundingClientRect();
    const box = textRef.current?.getBoundingClientRect();
    return card && box ? { card, box } : null;
  };
  // left/top: where the text box should start, in px from the card's corner. Stored as
  // fractions of the room left over, so the box always stays fully inside the card.
  const placeText = (left: number, top: number, { card, box }: { card: DOMRect; box: DOMRect }) => {
    const unit = (value: number) => Math.min(1, Math.max(0, value));
    const slackX = card.width - box.width;
    const slackY = card.height - box.height;
    onTextPositionChange?.({ x: slackX > 1 ? unit(left / slackX) : .5, y: slackY > 1 ? unit(top / slackY) : 0, w: Math.min(92, Math.max(30, Math.round((box.width / card.width) * 100))) });
  };
  const startTextDrag = (event: PointerEvent<HTMLParagraphElement>) => {
    const sizes = measure();
    if (!canMoveText || !sizes) return;
    textDrag.current = { dx: event.clientX - sizes.box.left, dy: event.clientY - sizes.box.top };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const dragText = (event: PointerEvent<HTMLParagraphElement>) => {
    const sizes = measure();
    if (!textDrag.current || !sizes || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    placeText(event.clientX - textDrag.current.dx - sizes.card.left, event.clientY - textDrag.current.dy - sizes.card.top, sizes);
  };
  const keyTextMove = (event: KeyboardEvent<HTMLParagraphElement>) => {
    const sizes = measure();
    if (!canMoveText || !sizes) return;
    const step = event.shiftKey ? .05 : .02;
    let left = sizes.box.left - sizes.card.left;
    let top = sizes.box.top - sizes.card.top;
    if (event.key === "ArrowLeft") left -= sizes.card.width * step;
    else if (event.key === "ArrowRight") left += sizes.card.width * step;
    else if (event.key === "ArrowUp") top -= sizes.card.height * step;
    else if (event.key === "ArrowDown") top += sizes.card.height * step;
    else return;
    event.preventDefault();
    placeText(left, top, sizes);
  };
  // Full-size pages have the printed card's shape (5 × 7" / A5 with bleed, 1530 × 2160 px).
  const surfaceClass = compact ? template.magazineStyle ? "aspect-square" : "aspect-[.9/1]" : "aspect-[17/24]";

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
    {template.magazineStyle ? (
      <MagazineFront
        compact={compact}
        message={message}
        headline={headline ?? (savedCard.frontHeadline || message)}
        subheadline={subheadline ?? savedCard.frontSubheadline}
        category={category ?? savedCard.magazineCategory}
        date={date ?? savedCard.magazineDate}
        badge={badge ?? savedCard.magazineBadge}
        headlineTag={headlineTag ?? savedCard.magazineHeadlineTag}
        footerText={footerText ?? savedCard.magazineFooter}
        photoDataUrl={photos[0]}
        photoZoom={photoZoom}
        photoPosition={photoPosition}
      />
    ) : template.id === "template-2" ? <CollageFront compact={compact} reserve={position ? null : <p aria-hidden="true" className="invisible mb-[4%] whitespace-pre-line break-words font-serif font-bold leading-[1.1]" style={coverTextStyle({ compact, collage: true, scale, align, position: null })}>{coverMessage}</p>} photos={photos} frameId={frame.id} frameImage={frame.image} photoZoom={photoZoom} photoPosition={photoPosition} photoFit={photoFit} isPortuguese={isPortuguese} /> : <StoryFront compact={compact} photos={photos} frameId={frame.id} frameImage={frame.image} photoZoom={photoZoom} photoPosition={photoPosition} photoFit={photoFit} isPortuguese={isPortuguese} />}
    {/* The cover text is its own layer above the photo and the frame, so nothing can hide it.
        By default it sits where the template had it; once dragged it is placed by position. */}
    {!template.magazineStyle && <div className={`pointer-events-none absolute z-30 flex flex-col items-center ${position ? "" : template.id === "template-2" ? (compact ? "p-[5%]" : "p-[5%]") : compact ? "p-[5%]" : "p-[5.5%]"}`} style={position ? { inset: 0 } : frameOpeningStyle(frame.id)}>
      {!position && template.id !== "template-2" && <span aria-hidden="true" className={`w-[88%] shrink-0 ${compact ? "h-[48%]" : "h-[54%]"}`} />}
      <p
        ref={textRef}
        role={canMoveText ? "button" : undefined}
        tabIndex={canMoveText ? 0 : undefined}
        aria-label={canMoveText ? (isPortuguese ? "Texto da capa. Arrasta ou usa as setas para o mover" : "Texto de la portada. Arrastra o usa las flechas para moverlo") : undefined}
        title={canMoveText ? (isPortuguese ? "Arrasta para mover o texto" : "Arrastra para mover el texto") : undefined}
        onPointerDown={startTextDrag}
        onPointerMove={dragText}
        onPointerUp={() => { textDrag.current = null; }}
        onPointerCancel={() => { textDrag.current = null; }}
        onKeyDown={keyTextMove}
        className={`whitespace-pre-line break-words font-serif font-bold leading-[1.1] text-[#182443] ${canMoveText ? "pointer-events-auto cursor-grab touch-none rounded-sm outline-none focus:ring-2 focus:ring-[#ee5264] focus:ring-offset-2 active:cursor-grabbing" : ""} ${!position && template.id !== "template-2" ? "mt-[5%]" : ""}`}
        style={coverTextStyle({ compact, collage: template.id === "template-2", scale, align, position })}
      >{coverMessage}</p>
    </div>}
    {elements.map((item) => <span key={item.id} role={canMoveEmoji ? "button" : undefined} tabIndex={canMoveEmoji ? 0 : undefined} aria-label={canMoveEmoji ? (isPortuguese ? `Mover emoji ${item.emoji}. Arrasta ou usa as setas` : `Mover emoji ${item.emoji}. Arrastra o usa las flechas`) : undefined} title={canMoveEmoji ? (isPortuguese ? "Arrasta para mover; seleciona para alterar o tamanho" : "Arrastra para mover; selecciónalo para cambiar su tamaño") : undefined} onPointerDown={(event) => { if (!canMoveEmoji) return; onEmojiSelect?.(item.id); event.currentTarget.setPointerCapture(event.pointerId); moveEmoji(event, item.id); }} onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) moveEmoji(event, item.id); }} onKeyDown={(event) => handleKeyDown(event, item)} onFocus={() => onEmojiSelect?.(item.id)} className={`absolute z-30 select-none leading-none outline-none ${canMoveEmoji ? "cursor-grab touch-none rounded-lg focus:ring-2 focus:ring-[#ee5264] focus:ring-offset-2 active:cursor-grabbing" : ""}`} style={{ left: `${item.position.x}%`, top: `${item.position.y}%`, fontSize: `${compact ? item.size * .5 : item.size}px`, filter: emojiToneFilters[item.tone], transform: "translate(-50%, -50%)" }}>{item.emoji}</span>)}
  </div>;
}

function PhotoTile({ src, fallback, alt, className, photoZoom = 1, photoPosition = "center", photoFit = "cover", isPortuguese }: { src: string | null; fallback: string; alt: string; className: string; photoZoom?: number; photoPosition?: string; photoFit?: "cover" | "contain" | "fill"; isPortuguese: boolean }) {
  // A filled frame must use a proportional cover crop; object-fill distorts
  // the uploaded photo and is never appropriate for a card preview.
  const fitClass = photoFit === "contain" ? "object-contain" : "object-cover";
  return <div className={`relative overflow-hidden bg-[#eee5df] ${className}`}><img src={src || fallback} alt={alt} className={`h-full w-full ${fitClass} ${src ? "" : "opacity-75 saturate-[.8]"}`} style={{ objectPosition: photoPosition, transform: src && photoFit === "cover" ? `scale(${photoZoom})` : undefined }} />{!src && <span className="absolute inset-x-0 bottom-0 bg-[#182443]/70 px-2 py-1 text-center text-[clamp(5px,1vw,9px)] font-black uppercase tracking-wider text-white">{isPortuguese ? "Adiciona fotografia" : "Añade foto"}</span>}</div>;
}

function CollageFront({ compact, reserve, photos, frameId, frameImage, photoZoom, photoPosition, photoFit, isPortuguese }: { compact: boolean; reserve?: React.ReactNode; photos: (string | null)[]; frameId: string; frameImage: string; photoZoom: number; photoPosition: string; photoFit: "cover" | "contain" | "fill"; isPortuguese: boolean }) {
  // The headline is drawn by CardPreview's text layer. `reserve` is an invisible copy of it that keeps
  // the photo below the text (growing with it), as the in-flow label used to.
  return <div className="absolute inset-0"><img src={frameImage} alt="" className={`absolute inset-0 ${frameOverlayClass(frameId)} h-full w-full object-fill`} /><div style={frameOpeningStyle(frameId)} className="absolute z-10 flex flex-col p-[5%]">{reserve}<PhotoTile src={photos[0]} fallback={samplePhotos[0]} alt={isPortuguese ? "Fotografia 1 · Capa" : "Foto 1 · Portada"} className="min-h-0 flex-1 rounded-md" photoZoom={photoZoom} photoPosition={photoPosition} photoFit={photoFit} isPortuguese={isPortuguese} /></div></div>;
}

function StoryFront({ compact, photos, frameId, frameImage, photoZoom, photoPosition, photoFit, isPortuguese }: { compact: boolean; photos: (string | null)[]; frameId: string; frameImage: string; photoZoom: number; photoPosition: string; photoFit: "cover" | "contain" | "fill"; isPortuguese: boolean }) {
  // The headline is drawn by CardPreview's text layer, under this photo's place.
  return <div className="absolute inset-0">
    <img src={frameImage} alt="" className={`absolute inset-0 ${frameOverlayClass(frameId)} h-full w-full object-fill`} />
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
    </div>
  </div>;
}
