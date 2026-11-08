// Width the card pages are laid out at on this screen (the editor's preview window is at most
// 650 px with 8 px padding). The final print pages (components/card-design-export.tsx) and the
// cart previews (components/cart-design-preview.tsx) use the same width, so text and emoji keep
// the same proportion to the card as the customer saw them in the editor.
export function previewWidth() {
  return Math.round(Math.min(634, Math.max(300, window.innerWidth - 64)));
}

// A page fills the print shape exactly: no rounded corners, no preview aspect ratio.
export const CARD_PAGE_CSS = ".cm-card-page > div { aspect-ratio: auto !important; height: 100% !important; border-radius: 0 !important; }";
