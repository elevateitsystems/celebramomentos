"use client";

// The customer's finished card as it will be printed: the same page renderer the checkout uses to
// make the print files (PostcardSideView, laid out at the editor's preview width and scaled down),
// fed with the cart item's own design — photos, frame, texts, text position, emojis, size.
// `faces` adds buttons to look at the inside pages and the back.
import { useEffect, useMemo, useRef, useState } from "react";
import { Provider, useSelector } from "react-redux";
import { CARD_SIZES } from "@/lib/data";
import { CARD_PAGE_CSS, previewWidth } from "@/lib/card-layout";
import { createCardStore, type CardCustomization, type CardDesignSide, type RootState } from "@/lib/store";
import { PostcardSideView } from "./postcard-preview";

const FACES: { side: CardDesignSide; es: string; pt: string }[] = [
  { side: "front", es: "Portada", pt: "Capa" },
  { side: "inside-left", es: "Interior izq.", pt: "Interior esq." },
  { side: "inside-right", es: "Interior dcho.", pt: "Interior dir." },
  { side: "back", es: "Contraportada", pt: "Contracapa" },
];

export function CartDesignPreview({ card, faces = false, className = "" }: { card: CardCustomization; faces?: boolean; className?: string }) {
  const language = useSelector((state: RootState) => state.language.language);
  const [side, setSide] = useState<CardDesignSide>("front");
  const store = useMemo(() => createCardStore({ ...card, design: undefined }, language), [card, language]);
  const size = CARD_SIZES.find((item) => item.id === card.size) || CARD_SIZES[0];
  const [layoutWidth, setLayoutWidth] = useState<number | null>(null);
  const [scale, setScale] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const layoutHeight = layoutWidth ? Math.round((layoutWidth * size.panel.height) / size.panel.width) : 0;

  useEffect(() => { setLayoutWidth(previewWidth()); }, []);
  useEffect(() => {
    if (!layoutWidth || !box.current) return;
    const node = box.current;
    const measure = () => setScale(node.clientWidth / layoutWidth);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [layoutWidth]);

  return <div className={className}>
    <div ref={box} className="relative w-full overflow-hidden rounded-md bg-[#fffdf9] shadow-md" style={{ aspectRatio: `${size.panel.width} / ${size.panel.height}` }}>
      {layoutWidth && scale > 0 && <div aria-hidden="true" className="pointer-events-none absolute left-0 top-0 origin-top-left select-none" style={{ width: layoutWidth, height: layoutHeight, transform: `scale(${scale})` }}>
        <Provider store={store}>
          <style>{CARD_PAGE_CSS}</style>
          <div className="cm-card-page" style={{ width: layoutWidth, height: layoutHeight, overflow: "hidden", background: "#fffdf9" }}><PostcardSideView side={side} compact={false} /></div>
        </Provider>
      </div>}
    </div>
    {faces && <div role="group" aria-label={language === "pt" ? "Faces do cartão" : "Caras de la tarjeta"} className="mt-2 grid grid-cols-2 gap-1">
      {FACES.map((face) => <button key={face.side} type="button" aria-pressed={side === face.side} onClick={() => setSide(face.side)} className={`focus-ring rounded-lg px-1.5 py-1 text-[10px] font-black transition ${side === face.side ? "bg-[#182443] text-white" : "bg-white text-[#59627b] hover:text-[#182443]"}`}>{language === "pt" ? face.pt : face.es}</button>)}
    </div>}
  </div>;
}
