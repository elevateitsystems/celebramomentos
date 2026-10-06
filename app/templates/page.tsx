"use client";

import Link from "next/link";
import { useState } from "react";
import { useSelector } from "react-redux";
import { Icon } from "@/components/icons";
import { PageIntro, SiteFooter, SiteHeader } from "@/components/site";
import { TemplateCard } from "@/components/template-card";
import { templates } from "@/lib/data";
import { RootState } from "@/lib/store";

export default function TemplatesPage() {
  const language = useSelector((state: RootState) => state.language.language);
  const [activeType, setActiveType] = useState<"all" | "traditional" | "collage" | "magazine">("all");
  const es = language === "es";

  const copy = es
    ? {
        eyebrow: "TARJETAS PERSONALIZADAS",
        title: "Elige tu tipo de tarjeta",
        body: "Tres estilos únicos para contar tu historia. Elige el que más te guste.",
        customize: "Empezar a personalizar",
      }
    : {
        eyebrow: "CARTÕES PERSONALIZADOS",
        title: "Escolhe o teu tipo de cartão",
        body: "Três estilos únicos para contar a tua história. Escolhe o que mais gostas.",
        customize: "Começar a personalizar",
      };

  const cardTypes = [
    {
      id: "traditional" as const,
      label: es ? "Tradicional" : "Tradicional",
      desc: es
        ? "Clásica y elegante. Con 2 fotos y tu mensaje en el interior."
        : "Clássica e elegante. Com 2 fotos e a tua mensagem no interior.",
      accent: "bg-[#fbe7e1]",
      icon: "❤️",
      badge: es ? "Más popular" : "Mais popular",
    },
    {
      id: "collage" as const,
      label: "Collage",
      desc: es
        ? "Dinámica y creativa. Con 4 fotos para contar tu historia."
        : "Dinâmica e criativa. Com 4 fotos para contar a tua história.",
      accent: "bg-[#e3f1e9]",
      icon: "🖼️",
      badge: null,
    },
    {
      id: "magazine" as const,
      label: "Magazine",
      desc: es
        ? "Moderna y llamativa. Estilo editorial con foto principal."
        : "Moderna e chamativa. Estilo editorial com foto principal.",
      accent: "bg-[#efe7f9]",
      icon: "✨",
      badge: null,
    },
  ];

  const filteredTemplates = activeType === "all"
    ? templates
    : templates.filter((t) => {
        if (activeType === "magazine") return t.magazineStyle;
        if (activeType === "collage") return !t.magazineStyle && t.imageCount >= 4;
        if (activeType === "traditional") return !t.magazineStyle && t.imageCount < 4;
        return true;
      });

  return (
    <>
      <SiteHeader active={language === "es" ? "Productos" : "Produtos"} />
      <main className="bg-[#fffaf5] py-16 md:py-24">
        <div className="container">
          <PageIntro eyebrow={copy.eyebrow} title={copy.title} body={copy.body} />

          {/* 3 Visual Card Type Selectors */}
          <div className="mx-auto mt-12 grid max-w-[900px] gap-5 sm:grid-cols-3">
            {cardTypes.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => setActiveType(activeType === type.id ? "all" : type.id)}
                className={`group relative flex flex-col overflow-hidden rounded-[22px] border-2 p-6 text-left transition duration-300 hover:-translate-y-1 hover:shadow-xl ${
                  activeType === type.id
                    ? "border-[#ee5264] bg-white shadow-xl shadow-[#ee5264]/15"
                    : "border-[#eadbd3] bg-white hover:border-[#ee5264]/50"
                }`}
              >
                {type.badge && (
                  <span className="absolute right-4 top-4 rounded-full bg-[#ee5264] px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-white">
                    {type.badge}
                  </span>
                )}
                <span className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl ${type.accent}`}>
                  {type.icon}
                </span>
                <h3 className="text-lg font-black text-[#182443]">{type.label}</h3>
                <p className="mt-2 text-[13px] leading-5 text-[#68718a]">{type.desc}</p>
                <span className={`mt-4 flex items-center gap-1.5 text-[12px] font-black transition ${activeType === type.id ? "text-[#ee5264]" : "text-[#9297a4] group-hover:text-[#ee5264]"}`}>
                  {activeType === type.id ? (es ? "Seleccionado ✓" : "Selecionado ✓") : (es ? "Ver diseños" : "Ver designs")}
                  <Icon name="arrow" size={13} />
                </span>
              </button>
            ))}
          </div>

          {/* Templates Grid */}
          <section className="mx-auto mt-10 grid max-w-[1180px] gap-5 md:grid-cols-2 lg:grid-cols-3" aria-label={copy.eyebrow}>
            {filteredTemplates.length > 0
              ? filteredTemplates.map((template, index) => (
                  <TemplateCard key={template.id} template={template} language={language} featured={index === 0 && activeType === "all"} />
                ))
              : (
                <p className="col-span-3 py-12 text-center text-sm text-[#737b90]">
                  {es ? "No hay diseños en esta categoría todavía." : "Não há designs nesta categoria ainda."}
                </p>
              )}
          </section>

          <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-[24px] bg-[#182443] p-6 text-white sm:flex-row sm:px-8">
            <div>
              <p className="text-lg font-black">{es ? "Tu foto y tus palabras, a tu manera." : "A tua fotografia e as tuas palavras, à tua maneira."}</p>
              <p className="mt-1 text-sm text-white/60">{es ? "Elige Tradicional, Collage o Magazine y revisa las cuatro caras antes de pedir." : "Escolhe Tradicional, Colagem ou Magazine e revê as quatro faces antes de encomendar."}</p>
            </div>
            <Link href="/customize" className="focus-ring inline-flex items-center gap-2 rounded-full bg-[#ee5264] px-5 py-3 text-sm font-black hover:bg-[#d83d54]">{copy.customize}<Icon name="arrow" size={16} /></Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
