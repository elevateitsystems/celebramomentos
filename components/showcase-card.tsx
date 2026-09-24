"use client";

type ShowcaseCardProps = {
  variant: "graduation" | "romantic";
  language: "es" | "pt";
};

const photoAlt = {
  graduation: { es: "Persona celebrando con flores", pt: "Finalista a celebrar com flores" },
  romantic: { es: "Pareja abrazándose en un jardín", pt: "Casal abraçado num jardim" },
} as const;

export function ShowcaseCard({ variant, language }: ShowcaseCardProps) {
  const graduation = variant === "graduation";
  const title = language === "pt" ? "Feliz aniversário" : "Feliz cumpleaños";

  return <article className="group relative overflow-hidden rounded-[24px] border border-[#d9cbc4] bg-[#fffdf8] shadow-[0_22px_50px_rgba(80,48,38,.2)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_60px_rgba(80,48,38,.25)]">
    <div className="relative aspect-[.78/1] overflow-hidden bg-[#fffdf8] px-[7%] py-[7%]">
      <div className="absolute inset-[7%] rounded-[12px] bg-[#f8f0e8] shadow-inner" />
      <img src={graduation ? "/images/floral-clean.png" : "/images/romantic-heart-frame.png"} alt="" aria-hidden="true" className={`absolute inset-0 ${graduation ? "z-0" : "z-20"} h-full w-full object-fill`} />
      <div className="absolute inset-x-[16%] top-[13%] z-10 h-[53%] overflow-hidden rounded-[10px] bg-[#eadfd7] shadow-[0_8px_18px_rgba(74,43,35,.16)]">
        <img src={graduation ? "/images/graduation-celebration.png" : "/images/romantic-couple.png"} alt={photoAlt[variant][language]} className="h-full w-full object-cover" style={{ objectPosition: graduation ? "center 35%" : "center 45%" }} />
      </div>
      <div className="absolute inset-x-[18%] bottom-[13%] z-30 text-center">
        <div className="mx-auto inline-block max-w-full rounded-[7px] bg-[#f8c75e] px-[5%] py-[2.5%] shadow-sm">
          <p className="break-words font-serif text-[clamp(11px,2vw,19px)] font-bold leading-none text-[#182443]">{title}</p>
        </div>
      </div>
      <span className="absolute right-[13%] top-[10%] z-30 text-[clamp(20px,5vw,42px)] drop-shadow-sm">{graduation ? "🎓" : "💖"}</span>
      <span className="absolute bottom-[10%] left-[12%] z-30 text-[clamp(16px,3.5vw,30px)] drop-shadow-sm">{graduation ? "⭐" : "😘"}</span>
    </div>
  </article>;
}
