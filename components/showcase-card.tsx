"use client";

type ShowcaseCardProps = {
  variant: "graduation" | "romantic";
  language: "es" | "pt";
};

const copy = {
  graduation: {
    es: {
      label: "Graduación",
      photoAlt: "Graduada celebrando con flores",
      title: "Feliz cumpleaños",
      footer: "Roberto García celebra con su familia",
      detail: "Un recuerdo para guardar siempre",
    },
    pt: {
      label: "Formatura",
      photoAlt: "Finalista a celebrar com flores",
      title: "Feliz aniversário",
      footer: "Roberto García celebra com a sua família",
      detail: "Uma memória para guardar sempre",
    },
  },
  romantic: {
    es: {
      label: "Siempre juntos",
      photoAlt: "Pareja abrazándose en un jardín",
      title: "Juntos, siempre",
      footer: "Mi lugar favorito es contigo",
      detail: "Una historia que merece quedarse",
    },
    pt: {
      label: "Sempre juntos",
      photoAlt: "Casal abraçado num jardim",
      title: "Juntos, para sempre",
      footer: "O meu lugar favorito é contigo",
      detail: "Uma história para guardar",
    },
  },
} as const;

export function ShowcaseCard({ variant, language }: ShowcaseCardProps) {
  const text = copy[variant][language];
  const graduation = variant === "graduation";

  return <article className="group relative overflow-hidden rounded-[24px] border border-[#d9cbc4] bg-[#fffdf8] shadow-[0_22px_50px_rgba(80,48,38,.2)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_60px_rgba(80,48,38,.25)]">
    <div className="relative aspect-[.78/1] overflow-hidden bg-[#fffdf8] px-[7%] py-[7%]">
      <div className="absolute inset-[7%] rounded-[12px] bg-[#f8f0e8] shadow-inner" />
      <img src={graduation ? "/images/floral-clean.png" : "/images/romantic-heart-frame.png"} alt="" aria-hidden="true" className={`absolute inset-0 ${graduation ? "z-0" : "z-20"} h-full w-full object-fill`} />
      <div className="absolute inset-x-[16%] top-[15%] z-10 h-[48%] overflow-hidden rounded-[10px] bg-[#eadfd7] shadow-[0_8px_18px_rgba(74,43,35,.16)]">
        <img src={graduation ? "/images/graduation-celebration.png" : "/images/romantic-couple.png"} alt={text.photoAlt} className="h-full w-full object-cover" style={{ objectPosition: graduation ? "center 35%" : "center 45%" }} />
      </div>
      <div className="absolute inset-x-[14%] bottom-[12%] z-30 text-center">
        <span className="text-[clamp(8px,1.4vw,12px)] font-black uppercase tracking-[.18em] text-[#ee5264]">{text.label}</span>
        <div className="mx-auto mt-2 inline-block max-w-full rounded-[10px] bg-[#f8c75e] px-[6%] py-[3%] shadow-sm">
          <p className="break-words font-serif text-[clamp(18px,3.4vw,31px)] font-bold leading-none text-[#182443]">{text.title}</p>
        </div>
        <p className="mt-2 text-[clamp(8px,1.4vw,12px)] font-bold leading-tight text-[#59627b]">{text.detail}</p>
        <p className="mt-1 line-clamp-2 text-[clamp(8px,1.35vw,12px)] font-black uppercase tracking-[.06em] text-[#182443]">{text.footer}</p>
      </div>
      <span className="absolute right-[13%] top-[10%] z-30 text-[clamp(24px,6vw,52px)] drop-shadow-sm">{graduation ? "🎓" : "💖"}</span>
      <span className="absolute bottom-[10%] left-[12%] z-30 text-[clamp(18px,4vw,34px)] drop-shadow-sm">{graduation ? "⭐" : "😘"}</span>
    </div>
  </article>;
}
