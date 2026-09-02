import { emojiOptions, emojiToneFilters, type EmojiOption, type EmojiTone } from "@/lib/emojis";

type EmojiControlsProps = {
  emoji: string;
  tone: EmojiTone;
  size: number;
  language?: "es" | "pt";
  onSelect: (option: EmojiOption) => void;
  onSizeChange: (size: number) => void;
};

export function EmojiControls({ emoji, tone, size, language = "es", onSelect, onSizeChange }: EmojiControlsProps) {
  const isSpanish = language === "es";
  const updateSize = (nextSize: number) => onSizeChange(Math.min(64, Math.max(18, nextSize)));

  return (
    <div className="mt-5">
      <p className="text-sm font-black">{isSpanish ? "Añade un emoji" : "Adiciona um emoji"}</p>
      <div className="mt-2 grid grid-cols-6 gap-2 sm:grid-cols-8 lg:grid-cols-6">
        {emojiOptions.map((item) => {
          const itemTone = item.tone || "natural";
          const selected = emoji === item.emoji && tone === itemTone;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item)}
              title={item.label}
              aria-label={item.label}
              aria-pressed={selected}
              className={`focus-ring flex h-10 w-full items-center justify-center rounded-xl border text-lg transition ${selected ? "border-[#ee5264] bg-[#fff0e8]" : "border-[#dfd3cc] bg-white hover:border-[#ee5264]"}`}
            >
              <span style={{ filter: emojiToneFilters[itemTone] }}>{item.emoji}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-4 rounded-2xl border border-[#eadbd3] bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black">{isSpanish ? "Tamaño del emoji" : "Tamanho do emoji"}</p>
            <p className="mt-1 text-[11px] text-[#7c8191]">{isSpanish ? "Arrástralo en la vista previa para colocarlo." : "Arrasta-o na pré-visualização para o posicionar."}</p>
          </div>
          <span className="min-w-12 rounded-full bg-[#fff0e8] px-2.5 py-1 text-center text-[10px] font-black text-[#c94758]">{size}px</span>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button type="button" onClick={() => updateSize(size - 4)} disabled={size <= 18} aria-label={isSpanish ? "Disminuir tamaño del emoji" : "Diminuir tamanho do emoji"} className="focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#dfd3cc] text-lg font-black disabled:cursor-not-allowed disabled:opacity-40">−</button>
          <input aria-label={isSpanish ? "Tamaño del emoji" : "Tamanho do emoji"} type="range" min="18" max="64" step="1" value={size} onChange={(event) => updateSize(Number(event.target.value))} className="min-w-0 flex-1 accent-[#ee5264]" />
          <button type="button" onClick={() => updateSize(size + 4)} disabled={size >= 64} aria-label={isSpanish ? "Aumentar tamaño del emoji" : "Aumentar tamanho do emoji"} className="focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#dfd3cc] text-lg font-black disabled:cursor-not-allowed disabled:opacity-40">+</button>
        </div>
      </div>
    </div>
  );
}
