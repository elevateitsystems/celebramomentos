"use client";

import Link from "next/link";
import { useSelector } from "react-redux";
import { Icon } from "@/components/icons";
import { PageIntro, SiteFooter, SiteHeader } from "@/components/site";
import { TemplateCard } from "@/components/template-card";
import { templates } from "@/lib/data";
import { RootState } from "@/lib/store";

export default function TemplatesPage() {
  const language = useSelector((state: RootState) => state.language.language);
  const copy = language === "es" ? { eyebrow: "NUESTRA COLECCIÓN", title: "Diseños que empiezan la conversación", body: "Tres bases bonitas para tres formas distintas de decir: me acordé de ti.", note: "Solo tres diseños, pensados para hacerlos tuyos.", paper: "Papel premium", delivery: "Envío a España y Portugal", customize: "Personaliza el tuyo" } : { eyebrow: "A NOSSA COLEÇÃO", title: "Designs que começam uma conversa", body: "Três bases bonitas para três formas diferentes de dizer: lembrei-me de ti.", note: "Apenas três designs, pensados para os tornares teus.", paper: "Papel premium", delivery: "Envio para Espanha e Portugal", customize: "Personaliza o teu" };
  return <><SiteHeader active="Diseños" /><main className="bg-[#fffaf5] py-16 md:py-24"><div className="container"><PageIntro eyebrow={copy.eyebrow} title={copy.title} body={copy.body} /><div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-2xl border border-[#eadbd3] bg-white px-5 py-4 text-center sm:flex-row sm:text-left"><p className="flex items-center gap-2 text-sm font-black"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fff0e8] text-[#ee5264]"><Icon name="spark" size={15} /></span>{copy.note}</p><div className="flex gap-4 text-xs font-bold text-[#737b90]"><span>{copy.paper}</span><span className="text-[#dfd3cc]">·</span><span>{copy.delivery}</span></div></div><section className="mt-10 grid gap-5 md:grid-cols-3" aria-label={copy.eyebrow}>{templates.map((template, index) => <TemplateCard key={template.id} template={template} language={language} featured={index === 0} />)}</section><div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-[24px] bg-[#182443] p-6 text-white sm:flex-row sm:px-8"><div><p className="text-lg font-black">{language === "es" ? "¿Ya sabes a quién va?" : "Já sabes para quem é?"}</p><p className="mt-1 text-sm text-white/60">{language === "es" ? "Elige un diseño y empieza a crear algo solo vuestro." : "Escolhe um design e começa a criar algo só vosso."}</p></div><Link href="/customize" className="focus-ring inline-flex items-center gap-2 rounded-full bg-[#ee5264] px-5 py-3 text-sm font-black hover:bg-[#d83d54]">{copy.customize}<Icon name="arrow" size={16} /></Link></div></div></main><SiteFooter /></>;
}
