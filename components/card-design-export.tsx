"use client";

import { toCanvas } from "html-to-image";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { CARD_SIZES } from "@/lib/data";
import { createCardStore, type CardCustomization, type CardDesignSide } from "@/lib/store";
import { CARD_PAGE_CSS, previewWidth } from "@/lib/card-layout";
import { PostcardSideView } from "./postcard-preview";

export const CARD_DESIGN_SIDES: CardDesignSide[] = ["front", "inside-left", "inside-right", "back"];

export type RenderedPanel = { side: CardDesignSide; blob: Blob; width: number; height: number };

async function settle(host: HTMLElement) {
  await Promise.all(Array.from(host.querySelectorAll("img")).map((image) => (image.complete ? Promise.resolve() : image.decode().catch(() => undefined))));
  await document.fonts?.ready;
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

// Renders the four pages of a card design with the same components as the editor
// preview, each at the card's print size (300 dpi with bleed). Runs in the browser.
export async function renderCardDesign(card: CardCustomization, language: "es" | "pt"): Promise<RenderedPanel[]> {
  const size = CARD_SIZES.find((item) => item.id === card.size) || CARD_SIZES[0];
  const { width, height } = size.panel;
  const layoutWidth = previewWidth();
  const layoutHeight = Math.round((layoutWidth * height) / width);
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  Object.assign(host.style, { position: "fixed", left: "-100000px", top: "0", width: `${layoutWidth}px`, pointerEvents: "none" });
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    flushSync(() => root.render(<Provider store={createCardStore({ ...card, design: undefined }, language)}>
      {/* The page fills the print shape exactly: no rounded corners, no preview aspect. */}
      <style>{CARD_PAGE_CSS}</style>
      {CARD_DESIGN_SIDES.map((side) => <div key={side} data-side={side} className="cm-card-page" style={{ width: layoutWidth, height: layoutHeight, overflow: "hidden", background: "#fffdf9" }}><PostcardSideView side={side} compact={false} /></div>)}
    </Provider>));
    await settle(host);
    const panels: RenderedPanel[] = [];
    for (const side of CARD_DESIGN_SIDES) {
      const node = host.querySelector<HTMLElement>(`[data-side="${side}"]`)!;
      const options = { canvasWidth: width, canvasHeight: height, pixelRatio: 1, backgroundColor: "#ffffff" };
      // The first pass loads the images into the SVG (Safari paints them only from the second).
      await toCanvas(node, options);
      const canvas = await toCanvas(node, options);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.95));
      if (!blob) throw new Error(`Could not export the ${side} page`);
      panels.push({ side, blob, width: canvas.width, height: canvas.height });
    }
    return panels;
  } finally {
    root.unmount();
    host.remove();
  }
}
