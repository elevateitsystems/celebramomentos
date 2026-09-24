"use client";

import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { Icon } from "./icons";
import { Price } from "./site";
import { ShowcaseCard } from "./showcase-card";
import { CardPreview } from "./card-preview";
import type { Language, Template } from "@/lib/data";
import { frames } from "@/lib/data";
import { RootState, resetCurrentDraft, setBackText, setFrame, setFrontSubheadline, setInsideLeftText, setInsideRightText, setMessage, setPhotoSlots, setTemplate } from "@/lib/store";
import { magazineHeadline, magazineInsideLeft, magazineInsideRight, magazineSubheadline } from "./magazine-card";

export function TemplateCard({ template, language, featured = false }: { template: Template; language: Language; featured?: boolean }) {
  const dispatch = useDispatch();
  const router = useRouter();
  const activeTemplate = useSelector((state: RootState) => state.cart.card.templateId);
  const name = language === "pt" ? template.namePt || template.name : template.name;
  const description = language === "pt" ? template.descriptionPt || template.description : template.description;

  const choose = () => {
    const portuguese = language === "pt";
    dispatch(resetCurrentDraft());
    dispatch(setTemplate(template.id));
    dispatch(setFrame(template.requiresFrame ? frames[0].id : null));
    dispatch(setPhotoSlots(template.imageCount));
    if (template.magazineStyle) {
      dispatch(setMessage(portuguese ? "Hoje celebra-se o 13.º aniversário do Roberto García" : magazineHeadline));
      dispatch(setFrontSubheadline(portuguese ? "Que tenhas um dia tão incrível como tu, Roberto! 🎉 ⚽ 💙" : magazineSubheadline));
      dispatch(setInsideLeftText(portuguese ? "Os teus avós, a tua irmã, o pai, a mãe e o Rocky gostam muito de ti." : magazineInsideLeft));
      dispatch(setInsideRightText(portuguese ? "Continua assim, campeão!!" : magazineInsideRight));
      dispatch(setBackText(portuguese ? "Um cartão criado especialmente para alguém especial." : "Una tarjeta creada especialmente para alguien especial."));
    } else {
      dispatch(setMessage(portuguese ? "Parabéns" : "Enhorabuena"));
      dispatch(setFrontSubheadline(""));
      dispatch(setInsideLeftText(portuguese ? "Escreve aqui a tua dedicatória pessoal." : "Escribe aquí tu dedicatoria personal."));
      dispatch(setInsideRightText(portuguese ? "Com todo o meu carinho." : "Con todo mi cariño."));
      dispatch(setBackText(portuguese ? "Feito especialmente para ti." : "Hecha especialmente para ti."));
    }
    router.push("/customize");
  };

  const previewAspectClass = template.magazineStyle ? "aspect-square" : "aspect-[.82/1]";

  return <article className={`group overflow-hidden rounded-[24px] border bg-white transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#8a564c]/10 ${activeTemplate === template.id ? "border-[#ee5264]" : "border-[#eadbd3]"}`}>
    <div className="relative aspect-[1.12/1] overflow-hidden bg-[#fffaf5] p-3">
      <div className={`mx-auto h-full overflow-hidden rounded-lg shadow-lg transition duration-500 group-hover:scale-[1.02] ${previewAspectClass}`}>
        {template.magazineStyle ? <CardPreview compact templateId={template.id} message={language === "pt" ? "Feliz aniversário" : "Feliz cumpleaños"} emojiElements={[]} photoDataUrls={Array(template.imageCount).fill(null)} /> : <ShowcaseCard variant={template.id === "template-3" ? "graduation" : "romantic"} language={language} />}
      </div>
      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
        <span className="rounded-full bg-white/95 px-3 py-1.5 text-[9px] font-black tracking-[.14em] text-[#182443]">{template.eyebrow}</span>
        {featured && <span className="rounded-full bg-[#f8c75e] px-3 py-1.5 text-[9px] font-black tracking-[.12em] text-[#182443]">{language === "es" ? "CLÁSICO" : "CLÁSSICO"}</span>}
      </div>
      <button onClick={choose} className="focus-ring absolute bottom-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-[#ee5264] text-white opacity-0 shadow-lg transition group-hover:opacity-100 sm:opacity-100" aria-label={`${language === "es" ? "Personalizar" : "Personalizar"} ${name}`}><Icon name="arrow" size={17} /></button>
    </div>
    <div className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4"><h2 className="text-lg font-black">{name}</h2><p className="shrink-0 text-xs font-black text-[#ee5264]"><span className="font-normal text-[#9297a4]">desde </span><Price value={template.price} /></p></div>
      <p className="mt-3 min-h-[48px] text-sm leading-6 text-[#737b90]">{description}</p>
      <p className="mt-3 text-[11px] font-bold text-[#59627b]">{template.imageCount} {language === "es" ? "fotos · Distribución fiel a la plantilla" : "fotografias · Distribuição fiel ao modelo"}</p>
      <button onClick={choose} className="focus-ring mt-5 inline-flex items-center gap-2 rounded-full bg-[#182443] px-4 py-2.5 text-xs font-black text-white transition hover:bg-[#ee5264]">{language === "es" ? "Personalizar diseño" : "Personalizar design"}<Icon name="arrow" size={14} /></button>
    </div>
  </article>;
}
