"use client";

import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { Icon } from "./icons";
import { Price } from "./site";
import { CardPreview } from "./card-preview";
import type { Language, Template } from "@/lib/data";
import { frames } from "@/lib/data";
import { RootState, setBackText, setFrame, setFrontSubheadline, setInsideLeftText, setInsideRightText, setMessage, setPhotoSlots, setTemplate } from "@/lib/store";
import { magazineHeadline, magazineInsideLeft, magazineInsideRight, magazineSubheadline } from "./magazine-card";

export function TemplateCard({ template, language, featured = false }: { template: Template; language: Language; featured?: boolean }) {
  const dispatch = useDispatch();
  const router = useRouter();
  const activeTemplate = useSelector((state: RootState) => state.cart.card.templateId);
  const name = language === "pt" ? template.namePt || template.name : template.name;
  const description = language === "pt" ? template.descriptionPt || template.description : template.description;

  const choose = () => {
    dispatch(setTemplate(template.id));
    dispatch(setFrame(template.requiresFrame ? frames[0].id : null));
    dispatch(setPhotoSlots(template.imageCount));
    if (template.magazineStyle) {
      dispatch(setMessage(magazineHeadline));
      dispatch(setFrontSubheadline(magazineSubheadline));
      dispatch(setInsideLeftText(magazineInsideLeft));
      dispatch(setInsideRightText(magazineInsideRight));
      dispatch(setBackText("Una tarjeta creada especialmente para alguien especial."));
    } else {
      dispatch(setMessage("Enhorabuena"));
      dispatch(setFrontSubheadline(""));
      dispatch(setInsideLeftText("Escribe aquí tu dedicatoria personal."));
      dispatch(setInsideRightText("Con todo mi cariño."));
      dispatch(setBackText("Hecha especialmente para ti."));
    }
    router.push("/customize");
  };

  const sampleMessage = template.magazineStyle ? magazineHeadline : "Enhorabuena";
  const previewAspectClass = template.magazineStyle ? "aspect-square" : "aspect-[.82/1]";
  const previewPhotos = ["/images/graduation-celebration.png", "/images/sticker-family.jpg", "/images/sticker-baby.jpg", "/images/sticker-lifestyle-dog.jpg"];
  const templatePreviewPhotos = template.id === "template-3" ? ["/images/traditional-birthday-preview.png", ...previewPhotos.slice(1)] : previewPhotos;

  return <article className={`group overflow-hidden rounded-[24px] border bg-white transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#8a564c]/10 ${activeTemplate === template.id ? "border-[#ee5264]" : "border-[#eadbd3]"}`}>
    <div className="relative aspect-[1.12/1] overflow-hidden bg-[#fffaf5] p-3">
      <div className={`mx-auto h-full overflow-hidden rounded-lg shadow-lg transition duration-500 group-hover:scale-[1.02] ${previewAspectClass}`}>
        {template.magazineStyle ? <img src={template.image} alt={`${name} preview`} className="h-full w-full bg-white object-contain object-center" /> : <CardPreview compact templateId={template.id} message={sampleMessage} emojiElements={[]} photoDataUrls={template.id === "template-2" ? Array(template.imageCount).fill(null) : Array.from({ length: template.imageCount }, (_, photoIndex) => templatePreviewPhotos[photoIndex % templatePreviewPhotos.length])} photoFit={template.id === "template-3" ? "fill" : undefined} />}
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
