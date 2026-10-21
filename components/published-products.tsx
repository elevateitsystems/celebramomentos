"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProductGridSkeleton } from "@/components/loading";
import { getProductPreviewImage } from "@/lib/data";

export type PublishedProductKind = "POSTCARD" | "CALENDAR" | "WALL_ART" | "MAGNET" | "PHONE_CASE" | "MUG" | "STICKER";

type PublishedProduct = {
  id: string;
  name: string;
  description: string | null;
  basePriceCents: number;
  kind: string;
  category?: { name?: string | null } | null;
  images: { asset: { url: string | null } }[];
};

const categoryPath: Record<PublishedProductKind, string> = {
  POSTCARD: "/templates",
  CALENDAR: "/calendars",
  WALL_ART: "/wall-art",
  MAGNET: "/magnets",
  PHONE_CASE: "/phone-cases",
  MUG: "/mugs",
  STICKER: "/stickers",
};

export function PublishedProducts({ kind, title }: { kind: PublishedProductKind; title: string }) {
  const [products, setProducts] = useState<PublishedProduct[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    // Fast responses render straight away; the skeleton only appears for slow ones.
    const skeletonTimer = window.setTimeout(() => { if (active) setShowSkeleton(true); }, 300);
    fetch(`/api/products?kind=${kind}`, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Unable to load products");
        return body;
      })
      .then((body) => {
        if (active) setProducts(Array.isArray(body.products) ? body.products : []);
      })
      .catch(() => {
        if (active) setError("No hemos podido cargar más productos ahora mismo.");
      })
      .finally(() => { window.clearTimeout(skeletonTimer); if (active) { setLoading(false); setShowSkeleton(false); } });
    return () => { active = false; window.clearTimeout(skeletonTimer); };
  }, [kind]);

  if (loading) return showSkeleton ? <section className="bg-[#fffaf5] pb-16" aria-label={title}><div className="container"><ProductGridSkeleton /></div></section> : null;
  if (error) return <section className="bg-[#fffaf5] pb-16"><div className="container"><p role="alert" className="rounded-xl border border-[#f3c6c2] bg-[#fff0e8] p-4 text-sm font-bold text-[#c94758]">{error}</p></div></section>;
  if (products.length === 0) return null;

  return (
    <section className="bg-[#fffaf5] pb-16" aria-label={title}>
      <div className="container">
        <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#ee5264]">CATÁLOGO</p>
        <h2 className="mt-2 text-2xl font-black text-[#182443]">{title}</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const image = product.images[0]?.asset.url || getProductPreviewImage(product.kind, product.category?.name);
            const href = kind === "POSTCARD"
              ? `/customize?template=template-3&product=${encodeURIComponent(product.id)}`
              : `${categoryPath[kind]}?product=${encodeURIComponent(product.id)}`;
            return (
              <article key={product.id} className="overflow-hidden rounded-[22px] border border-[#eadbd3] bg-white shadow-sm">
                <div className="aspect-[4/3] bg-[#f8efe8]"><img src={image} alt={product.name} className="h-full w-full object-cover" /></div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3"><h3 className="text-lg font-black text-[#182443]">{product.name}</h3><span className="shrink-0 text-sm font-black text-[#ee5264]">{(product.basePriceCents / 100).toFixed(2).replace(".", ",")} €</span></div>
                  {product.description && <p className="mt-2 text-sm leading-6 text-[#737b90]">{product.description}</p>}
                  <Link href={href} className="mt-4 inline-flex rounded-full bg-[#182443] px-4 py-2.5 text-xs font-black text-white hover:bg-[#ee5264]">Personalizar</Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
