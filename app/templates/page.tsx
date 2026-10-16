"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Icon } from "@/components/icons";
import { PageIntro, SiteFooter, SiteHeader } from "@/components/site";
import { TemplateCard } from "@/components/template-card";
import { templates } from "@/lib/data";
import { RootState } from "@/lib/store";
import { useMockDb } from "@/lib/mock-store";

type PublishedProduct = { id: string; name: string; description: string | null; basePriceCents: number; kind: string; images: { asset: { url: string | null } }[] };

export default function TemplatesPage() {
  const router = useRouter();
  const language = useSelector((state: RootState) => state.language.language);
  const [activeType, setActiveType] = useState<"all" | "traditional" | "collage" | "magazine">("all");
  const [publishedProducts, setPublishedProducts] = useState<PublishedProduct[]>([]);
  const es = language === "es";
  const db = useMockDb();

  useEffect(() => {
    let active = true;
    fetch("/api/products", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((body) => {
      if (active && body?.products) setPublishedProducts(body.products);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  const localProducts: PublishedProduct[] = db.products.filter((product) => product.active).map((product) => ({ id: product.id, name: product.name, description: null, basePriceCents: Math.round(product.price * 100), kind: "POSTCARD", images: [] }));
  const allPublishedProducts = [...localProducts, ...publishedProducts.filter((product) => !localProducts.some((localProduct) => localProduct.id === product.id))];

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

  const templateIdForType = {
    traditional: "template-3",
    collage: "template-2",
    magazine: "template-magazine",
  } as const;

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
                onClick={() => router.push(`/customize?template=${templateIdForType[type.id]}`)}
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

          {allPublishedProducts.length > 0 && <section className="mx-auto mt-16 max-w-[1180px]" aria-label={es ? "Productos disponibles" : "Produtos disponíveis"}><div className="mb-5"><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#ee5264]">{es ? "NUEVO EN LA TIENDA" : "NOVO NA LOJA"}</p><h2 className="mt-2 text-2xl font-black text-[#182443]">{es ? "Más productos para tus momentos" : "Mais produtos para os teus momentos"}</h2></div><div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{allPublishedProducts.map((product) => <article key={product.id} className="overflow-hidden rounded-[22px] border border-[#eadbd3] bg-white shadow-sm"><div className="aspect-[4/3] bg-[#f8efe8]">{product.images[0]?.asset.url ? <img src={product.images[0].asset.url} alt={product.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-5xl">✨</div>}</div><div className="p-5"><div className="flex items-start justify-between gap-3"><h3 className="text-lg font-black text-[#182443]">{product.name}</h3><span className="shrink-0 text-sm font-black text-[#ee5264]">{(product.basePriceCents / 100).toFixed(2).replace(".", ",")} €</span></div>{product.description && <p className="mt-2 text-sm leading-6 text-[#737b90]">{product.description}</p>}<Link href={`/customize?product=${encodeURIComponent(product.id)}`} className="mt-4 inline-flex rounded-full bg-[#182443] px-4 py-2.5 text-xs font-black text-white hover:bg-[#ee5264]">Personalizar</Link></div></article>)}</div></section>}

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
