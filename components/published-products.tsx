"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ProductGridSkeleton } from "@/components/loading";
import { getProductPreviewImage } from "@/lib/data";
import { productHref, type CatalogProduct, type ProductKind } from "@/lib/products";

export type PublishedProductKind = ProductKind;

export type CatalogState = { products: CatalogProduct[]; loading: boolean; error: string; reload: () => void };

// Loads the active products of one category from the database-backed API.
export function useCatalogProducts(kind: ProductKind): CatalogState {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    fetch(`/api/products?kind=${kind}`, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Unable to load products");
        if (active) setProducts(Array.isArray(body.products) ? body.products : []);
      })
      .catch(() => { if (active) setError("No hemos podido cargar los productos ahora mismo."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [kind, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);
  return { products, loading, error, reload };
}

export function catalogImage(product: Pick<CatalogProduct, "images" | "kind">) {
  return product.images[0]?.asset.url || getProductPreviewImage(product.kind);
}

export const formatCatalogPrice = (cents: number) => (cents / 100).toFixed(2).replace(".", ",") + " €";

// "Desde" price for products whose sizes have different prices.
export function catalogPriceLabel(product: Pick<CatalogProduct, "variants" | "basePriceCents">, es = true) {
  if (!product.variants.length) return formatCatalogPrice(product.basePriceCents);
  const prices = product.variants.map((variant) => variant.priceCents);
  const min = Math.min(...prices);
  return min === Math.max(...prices) ? formatCatalogPrice(min) : `${es ? "Desde" : "Desde"} ${formatCatalogPrice(min)}`;
}

export function PublishedProducts({ catalog, title, es = true, selectedId, onSelect, emptyText }: { catalog: CatalogState; title: string; es?: boolean; selectedId?: string | null; onSelect?: (product: CatalogProduct) => void; emptyText?: string }) {
  const { products, loading, error, reload } = catalog;
  const [showSkeleton, setShowSkeleton] = useState(false);

  useEffect(() => {
    if (!loading) { setShowSkeleton(false); return; }
    // Fast responses render straight away; the skeleton only appears for slow ones.
    const timer = window.setTimeout(() => setShowSkeleton(true), 300);
    return () => window.clearTimeout(timer);
  }, [loading]);

  if (loading) return showSkeleton ? <section id="catalog" className="bg-[#fffaf5] pb-16" aria-label={title}><div className="container"><ProductGridSkeleton /></div></section> : null;
  if (error) return <section id="catalog" className="bg-[#fffaf5] pb-16"><div className="container"><div role="alert" className="flex flex-col items-start gap-3 rounded-xl border border-[#f3c6c2] bg-[#fff0e8] p-4 text-sm font-bold text-[#c94758] sm:flex-row sm:items-center sm:justify-between"><span>{error}</span><button type="button" onClick={reload} className="rounded-full bg-white px-4 py-2 text-xs font-black text-[#182443] shadow-sm hover:text-[#ee5264]">{es ? "Reintentar" : "Tentar novamente"}</button></div></div></section>;
  if (products.length === 0) return emptyText ? <section id="catalog" className="bg-[#fffaf5] pb-16"><div className="container"><p className="rounded-xl border border-dashed border-[#eadbd3] bg-white p-5 text-center text-sm text-[#737b90]">{emptyText}</p></div></section> : null;

  return (
    <section id="catalog" className="bg-[#fffaf5] pb-16" aria-label={title}>
      <div className="container">
        <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#ee5264]">{es ? "CATÁLOGO" : "CATÁLOGO"}</p>
        <h2 className="mt-2 text-2xl font-black text-[#182443]">{title}</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const selected = product.id === selectedId;
            const action = selected ? (es ? "Seleccionado ✓" : "Selecionado ✓") : (es ? "Personalizar" : "Personalizar");
            const buttonClass = `mt-4 inline-flex rounded-full px-4 py-2.5 text-xs font-black text-white ${selected ? "bg-[#ee5264]" : "bg-[#182443] hover:bg-[#ee5264]"}`;
            return (
              <article key={product.id} className={`overflow-hidden rounded-[22px] border bg-white shadow-sm ${selected ? "border-[#ee5264] ring-2 ring-[#ee5264]/20" : "border-[#eadbd3]"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <div className="aspect-[4/3] bg-[#f8efe8]"><img src={catalogImage(product)} alt={product.name} className="h-full w-full object-cover" /></div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3"><h3 className="text-lg font-black text-[#182443]">{product.name}</h3><span className="shrink-0 text-sm font-black text-[#ee5264]">{catalogPriceLabel(product, es)}</span></div>
                  {product.description && <p className="mt-2 text-sm leading-6 text-[#737b90]">{product.description}</p>}
                  {product.variants.length > 0 && <p className="mt-2 text-xs font-bold text-[#9297a4]">{product.variants.map((variant) => variant.name).join(" · ")}</p>}
                  {onSelect
                    ? <button type="button" onClick={() => onSelect(product)} aria-pressed={selected} className={buttonClass}>{action}</button>
                    : <Link href={productHref(product)} className={buttonClass}>{action}</Link>}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
