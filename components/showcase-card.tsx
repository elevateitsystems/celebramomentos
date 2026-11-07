"use client";

type ShowcaseCardProps = {
  variant: "graduation" | "birthday";
  language: "es" | "pt";
  // The admin's photo for this card (admin → Homepage); the built-in photo otherwise.
  image?: string;
};

const photoAlt = {
  graduation: { es: "Persona celebrando con flores", pt: "Finalista a celebrar com flores" },
  birthday: { es: "Niña soplando las velas de su tarta", pt: "Menina a soprar as velas do bolo" },
} as const;

export function ShowcaseCard({ variant, language, image }: ShowcaseCardProps) {
  const graduation = variant === "graduation";
  const title = language === "pt" ? "Feliz aniversário" : "Feliz cumpleaños";

  return <article className="group relative overflow-hidden rounded-[24px] border border-[#d9cbc4] bg-[#fffdf8] shadow-[0_22px_50px_rgba(80,48,38,.2)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_60px_rgba(80,48,38,.25)]">
    <div className="relative aspect-[.78/1] overflow-hidden bg-[#fffdf8] px-[7%] py-[7%]">
      <div className="absolute inset-[7%] rounded-[12px] bg-[#f8f0e8] shadow-inner" />
      <img src={graduation ? "/images/floral-clean.png" : "/images/birthday-lights-frame.png"} alt="" aria-hidden="true" className={`absolute inset-0 ${graduation ? "z-0" : "z-20"} h-full w-full object-fill`} />
      <div className={`absolute z-10 overflow-hidden rounded-[10px] bg-[#eadfd7] shadow-[0_8px_18px_rgba(74,43,35,.16)] ${graduation ? "inset-x-[16%] top-[13%] h-[53%]" : "left-[23%] right-[23%] top-[15%] h-[45%]"}`}>
        <img src={image || (graduation ? "/images/graduation-celebration.png" : "/images/birthday-celebration.png")} alt={photoAlt[variant][language]} className="h-full w-full object-cover" style={{ objectPosition: graduation ? "center 35%" : "center 30%" }} />
      </div>
      <div className={`absolute z-30 text-center ${graduation ? "inset-x-[18%] bottom-[13%]" : "left-[21%] right-[21%] bottom-[25%]"}`}>
        <div className="mx-auto inline-block max-w-full px-[5%] py-[2.5%]">
          <p style={{ textShadow: "0 0 .05em #fff, 0 0 .1em #fff, 0 0 .2em #fff, 0 0 .38em rgba(255,255,255,.95)" }} className={`break-words font-serif font-bold leading-tight text-[#182443] ${graduation ? "text-[clamp(11px,2vw,19px)]" : "text-[clamp(9px,1.7vw,17px)]"}`}>{title}</p>
        </div>
      </div>
      <span className={`absolute z-30 text-[clamp(20px,5vw,42px)] drop-shadow-sm ${graduation ? "right-[13%] top-[10%]" : "right-[24%] top-[11%]"}`}>{graduation ? "🎓" : "🎂"}</span>
      <span className={`absolute z-30 text-[clamp(16px,3.5vw,30px)] drop-shadow-sm ${graduation ? "bottom-[10%] left-[12%]" : "bottom-[19%] left-[22%]"}`}>{graduation ? "⭐" : "🎈"}</span>
    </div>
  </article>;
}
