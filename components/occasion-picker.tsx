import { designCategories, type DesignCategoryId, type Language } from "@/lib/data";

export function OccasionPicker({ activeId, language = "es", onChange }: { activeId: DesignCategoryId; language?: Language; onChange: (id: DesignCategoryId) => void }) {
  return <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6" role="list" aria-label={language === "es" ? "Categorías de tarjetas" : "Categorias de cartões"}>
    {designCategories.map((category) => {
      const active = category.id === activeId;
      const name = language === "pt" ? category.namePt : category.name;
      return <button key={category.id} type="button" role="listitem" aria-pressed={active} onClick={() => onChange(category.id)} className={`focus-ring group min-h-[96px] rounded-2xl border-2 p-3 text-left transition hover:-translate-y-0.5 hover:border-[#ee5264] ${active ? "border-[#ee5264] bg-[#fff0e8] shadow-md shadow-[#8a564c]/10" : "border-[#eadbd3] bg-white"}`}>
        <span className="flex items-start justify-between gap-2">
          <span className={`flex h-8 w-8 items-center justify-center rounded-xl text-sm font-black ${active ? "bg-[#ee5264] text-white" : "bg-[#f7eee8] text-[#bd4657]"}`}>{category.symbol}</span>
          <span className={`mt-1 h-3.5 w-3.5 rounded-full border ${active ? "border-[4px] border-[#ee5264]" : "border-[#c8bdb7]"}`} />
        </span>
        <span className="mt-3 block text-xs font-black leading-tight text-[#182443]">{name}</span>
      </button>;
    })}
  </div>;
}
