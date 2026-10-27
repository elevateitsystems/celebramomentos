"use client";

import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { AdminPageHeader, AdminShell } from "@/components/admin";
import { Icon } from "@/components/icons";
import { BrandLoader } from "@/components/loading";
import { Price, Spinner, StatusBadge, Toast } from "@/components/site";
import { CARD_TEMPLATE_SLUGS, DEFAULT_CARD_TEMPLATE, DEFAULT_POD_PROVIDER, MAX_PRODUCT_PHOTOS, POD_PROVIDERS, POD_PROVIDER_LABELS, PRODUCT_KIND_INFO, PRODUCT_KINDS, isPodProvider, variantAttributes, type CardTemplateSlug, type PodProvider, type ProductKind } from "@/lib/products";

type ApiProduct = {
  id: string; slug: string; name: string; kind: ProductKind; description: string | null; basePriceCents: number; active: boolean; featured: boolean;
  metadata: { templateSlug?: CardTemplateSlug; photoCount?: number; provider?: string } | null;
  images?: { asset?: { url?: string | null } }[];
  variants: { id: string; name: string; priceCents: number; attributes?: unknown }[];
  options: { id: string; name: string; required: boolean; config: { choices?: string[] } | null }[];
};
type VariantDraft = { id?: string; name: string; price: string; photoCount: string; podSku: string; provider: PodProvider | "" };
type OptionDraft = { name: string; choices: string; required: boolean };
type Draft = { name: string; kind: ProductKind; description: string; price: string; featured: boolean; active: boolean; image?: string; templateSlug: CardTemplateSlug; photoCount: number; provider: PodProvider; variants: VariantDraft[]; options: OptionDraft[] };

// The six storefront categories.
const KIND_ORDER: ProductKind[] = ["POSTCARD", "WALL_ART", "MAGNET", "PHONE_CASE", "MUG", "CALENDAR"];
const TEMPLATE_NAMES: Record<CardTemplateSlug, string> = { "template-3": "Tradicional", "template-2": "Collage", "template-magazine": "Magazine" };
// Calendars default to one photo per month.
const defaultPhotoCount = (kind: ProductKind) => (kind === "CALENDAR" ? 12 : 1);
const emptyDraft = (kind: ProductKind): Draft => ({ name: "", kind, description: "", price: "", featured: false, active: true, templateSlug: DEFAULT_CARD_TEMPLATE, photoCount: defaultPhotoCount(kind), provider: DEFAULT_POD_PROVIDER[kind], variants: [], options: [] });
const toCents = (value: string) => Math.round(Number(value.replace(",", ".")) * 100);
const validPrice = (value: string) => value.trim() !== "" && Number.isFinite(Number(value.replace(",", "."))) && Number(value.replace(",", ".")) >= 0;
const slugify = (value: string) => value.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "product";

function priceLabel(product: ApiProduct) {
  if (!product.variants.length) return <Price value={product.basePriceCents / 100} />;
  const prices = product.variants.map((variant) => variant.priceCents);
  const min = Math.min(...prices);
  return min === Math.max(...prices) ? <Price value={min / 100} /> : <span>From <Price value={min / 100} /></span>;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [counts, setCounts] = useState<Partial<Record<ProductKind, number>>>({});
  const [filter, setFilter] = useState<ProductKind | "ALL">("ALL");
  const [draft, setDraft] = useState<Draft>(emptyDraft("POSTCARD"));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await fetch(`/api/admin/products?limit=100${filter === "ALL" ? "" : `&kind=${filter}`}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to load products");
      setProducts(body.products || []);
      setCounts(body.counts || {});
    } catch (reason) {
      setLoadError(reason instanceof Error ? reason.message : "Unable to load products");
    } finally {
      setLoading(false);
    }
  }, [filter]);
  useEffect(() => { void load(); }, [load]);

  const openNew = () => { setDraft(emptyDraft(filter === "ALL" ? "POSTCARD" : filter)); setEditingId(null); setImageFile(null); setPanelOpen(true); };
  const openEdit = (product: ApiProduct) => {
    setDraft({
      name: product.name, kind: product.kind, description: product.description || "", price: (product.basePriceCents / 100).toFixed(2), featured: product.featured, active: product.active,
      image: product.images?.[0]?.asset?.url || undefined,
      templateSlug: product.metadata?.templateSlug || DEFAULT_CARD_TEMPLATE,
      photoCount: product.metadata?.photoCount || 1,
      provider: isPodProvider(product.metadata?.provider) ? product.metadata.provider : DEFAULT_POD_PROVIDER[product.kind],
      variants: product.variants.map((variant) => { const attributes = variantAttributes(variant.attributes); return { id: variant.id, name: variant.name, price: (variant.priceCents / 100).toFixed(2), photoCount: attributes.photoCount ? String(attributes.photoCount) : "", podSku: attributes.podSku || "", provider: attributes.provider || "" }; }),
      options: product.options.map((option) => ({ name: option.name, choices: (option.config?.choices || []).join(", "), required: option.required })),
    });
    setEditingId(product.id); setImageFile(null); setPanelOpen(true);
  };
  const uploadImage = async (file: File) => { const form = new FormData(); form.append("file", file); form.append("kind", "PRODUCT_IMAGE"); const response = await fetch("/api/uploads", { method: "POST", body: form }); const body = await response.json(); if (!response.ok) throw new Error(body.error || "Unable to upload product image"); return body.asset as { id: string; url: string }; };

  const validate = () => {
    if (draft.name.trim().length < 2) return "Add a product name (at least 2 characters)";
    if (!validPrice(draft.price)) return "Add a valid base price";
    if (draft.kind !== "POSTCARD") {
      if (draft.variants.some((variant) => !variant.name.trim() || !validPrice(variant.price))) return "Every size needs a name and a valid price";
      if (draft.variants.some((variant) => variant.photoCount.trim() && !(Number.isInteger(Number(variant.photoCount)) && Number(variant.photoCount) >= 1 && Number(variant.photoCount) <= MAX_PRODUCT_PHOTOS))) return `Photos per size must be a whole number from 1 to ${MAX_PRODUCT_PHOTOS}`;
      if (new Set(draft.variants.map((variant) => variant.name.trim().toLowerCase())).size !== draft.variants.length) return "Each size needs a different name";
      if (draft.options.some((option) => !option.name.trim() || !option.choices.split(",").some((choice) => choice.trim()))) return "Every option needs a name and at least one choice";
    }
    return null;
  };

  const save = async () => {
    const problem = validate();
    if (problem) { setToast(problem); return; }
    setSaving(true);
    try {
      const isCard = draft.kind === "POSTCARD";
      const payload = {
        name: draft.name.trim(),
        kind: draft.kind,
        description: draft.description.trim() || null,
        basePriceCents: toCents(draft.price),
        featured: draft.featured,
        active: draft.active,
        metadata: isCard ? { templateSlug: draft.templateSlug, provider: draft.provider } : { photoCount: draft.photoCount, provider: draft.provider },
        variants: isCard ? [] : draft.variants.map((variant) => ({ ...(variant.id ? { id: variant.id } : {}), name: variant.name.trim(), priceCents: toCents(variant.price), photoCount: variant.photoCount.trim() ? Math.round(Number(variant.photoCount)) : null, podSku: variant.podSku.trim() || null, provider: variant.provider || null })),
        options: isCard ? [] : draft.options.map((option) => ({ name: option.name.trim(), choices: option.choices.split(",").map((choice) => choice.trim()).filter(Boolean), required: option.required })),
      };
      const response = await fetch(editingId ? `/api/admin/products?id=${encodeURIComponent(editingId)}` : "/api/admin/products", { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editingId ? payload : { ...payload, slug: `${slugify(draft.name)}-${Date.now()}` }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to save product");

      let imageWarning = "";
      if (imageFile && body.product?.id) {
        try {
          const image = await uploadImage(imageFile);
          const imageResponse = await fetch(`/api/admin/products?id=${encodeURIComponent(body.product.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageAssetId: image.id }) });
          const imageBody = await imageResponse.json();
          if (!imageResponse.ok) throw new Error(imageBody.error || "Unable to attach product image");
        } catch (reason) {
          imageWarning = reason instanceof Error ? reason.message : "Unable to save product image";
        }
      }
      await load();
      setPanelOpen(false);
      setToast(imageWarning ? `Product saved, but image was not uploaded: ${imageWarning}` : editingId ? "Product updated — the storefront now shows the changes" : `Product published in ${PRODUCT_KIND_INFO[draft.kind].admin}`);
    } catch (reason) {
      setToast(reason instanceof Error ? reason.message : "Unable to save product");
    } finally { setSaving(false); }
  };
  const toggle = async (product: ApiProduct) => { setActionId(product.id); try { const response = await fetch(`/api/admin/products?id=${encodeURIComponent(product.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !product.active }) }); if (!response.ok) { const body = await response.json(); setToast(body.error || "Unable to update product"); return; } await load(); setToast(product.active ? "Product hidden from the storefront" : "Product visible on the storefront"); } catch (reason) { setToast(reason instanceof Error ? reason.message : "Unable to update product"); } finally { setActionId(null); } };
  const remove = async (product: ApiProduct) => { if (!window.confirm(`Delete ${product.name} permanently? It will disappear from the storefront and can no longer be bought.`)) return; setActionId(product.id); try { const response = await fetch(`/api/admin/products?id=${encodeURIComponent(product.id)}`, { method: "DELETE" }); if (!response.ok) { const body = await response.json(); setToast(body.error || "Unable to delete product"); return; } await load(); setToast("Product deleted from the catalog and database"); } catch (reason) { setToast(reason instanceof Error ? reason.message : "Unable to delete product"); } finally { setActionId(null); } };

  const total = PRODUCT_KINDS.reduce((sum, kind) => sum + (counts[kind] || 0), 0);
  const tabs: [ProductKind | "ALL", string, number][] = [["ALL", "All", total], ...KIND_ORDER.map((kind) => [kind, PRODUCT_KIND_INFO[kind].admin, counts[kind] || 0] as [ProductKind, string, number])];

  return <AdminShell><AdminPageHeader eyebrow="CATALOG" title="Products" body="Manage the products shown in each storefront category. Changes are saved to the database and appear on the website straight away." action={<button onClick={openNew} className="rounded-full bg-[#ee5264] px-4 py-3 text-xs font-black text-white">+ Add product</button>} />
    <div className="mt-6 flex gap-2 overflow-x-auto pb-1">{tabs.map(([value, label, count]) => <button key={value} type="button" onClick={() => setFilter(value)} aria-pressed={filter === value} className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-black transition ${filter === value ? "border-[#182443] bg-[#182443] text-white" : "border-[#e4e7ee] bg-white text-[#59627b] hover:border-[#182443]"}`}>{label} <span className={filter === value ? "text-white/60" : "text-[#9297a4]"}>{count}</span></button>)}</div>
    <section className="mt-4 overflow-hidden rounded-2xl border border-[#e4e7ee] bg-white"><div className="border-b border-[#e4e7ee] p-5 text-sm font-black">{loading && products.length === 0 ? "Loading products…" : `${products.length} products`}{loading && products.length > 0 && <span className="ml-3 text-[11px] font-bold text-[#9297a4]">Updating…</span>}</div>
      {loadError ? <div role="alert" className="flex flex-col items-start gap-3 p-6 text-sm font-bold text-[#c94758] sm:flex-row sm:items-center sm:justify-between"><span>{loadError}</span><button type="button" onClick={() => void load()} className="rounded-full border border-[#dfd3cc] px-4 py-2 text-xs font-black text-[#182443]">Retry</button></div>
        : loading && products.length === 0 ? <BrandLoader label="Loading products…" />
        : products.length === 0 ? <div className="p-10 text-center"><p className="text-sm font-black">No products in {filter === "ALL" ? "the catalog" : PRODUCT_KIND_INFO[filter].admin} yet</p><p className="mt-1 text-xs text-[#737b90]">Products you add here appear on {filter === "ALL" ? "their category page" : PRODUCT_KIND_INFO[filter].path}.</p><button type="button" onClick={openNew} className="mt-4 rounded-full bg-[#182443] px-4 py-2.5 text-xs font-black text-white">+ Add product</button></div>
        : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead><tr className="border-b border-[#e4e7ee] bg-[#fafbfc] text-[10px] uppercase tracking-[.14em] text-[#9297a4]"><th className="px-5 py-3">Product</th><th className="px-5 py-3">Category</th><th className="px-5 py-3">Price</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody>{products.map((product) => { const busy = actionId === product.id; const image = product.images?.[0]?.asset?.url; return <tr key={product.id} className="border-b border-[#eef0f4] text-sm"><td className="px-5 py-4"><div className="flex items-center gap-3">{image ? <img src={image} alt="" className="h-10 w-10 rounded-lg object-cover" /> : <span className="h-10 w-10 rounded-lg bg-[#f4eee9]" />}<span><span className="block font-black">{product.name}{product.featured && <span className="ml-2 text-[10px] font-black text-[#ee5264]">★ Featured</span>}</span><span className="block text-[11px] text-[#9297a4]">{product.kind === "POSTCARD" ? `Template: ${TEMPLATE_NAMES[product.metadata?.templateSlug || DEFAULT_CARD_TEMPLATE]}` : [product.variants.length ? `${product.variants.length} sizes` : null, product.options.length ? `${product.options.length} options` : null, `${product.metadata?.photoCount || 1} photo${(product.metadata?.photoCount || 1) > 1 ? "s" : ""}`].filter(Boolean).join(" · ")}</span></span></div></td><td className="px-5 py-4 text-[#737b90]">{PRODUCT_KIND_INFO[product.kind].admin}</td><td className="px-5 py-4 font-black">{priceLabel(product)}</td><td className="px-5 py-4"><button disabled={busy} onClick={() => void toggle(product)} className="disabled:cursor-wait disabled:opacity-60" title={product.active ? "Click to hide from the storefront" : "Click to show on the storefront"}>{busy ? <Spinner size={20} className="text-[#ee5264]" /> : <StatusBadge tone={product.active ? "green" : "slate"}>{product.active ? "Active" : "Inactive"}</StatusBadge>}</button></td><td className="px-5 py-4 text-right"><a href={product.kind === "POSTCARD" ? "/templates" : `${PRODUCT_KIND_INFO[product.kind].path}?product=${encodeURIComponent(product.id)}`} target="_blank" rel="noreferrer" className="mr-3 text-xs font-black text-[#59627b]">View</a><button disabled={busy} onClick={() => openEdit(product)} className="mr-3 inline-flex items-center gap-2 text-xs font-black disabled:opacity-50"><Icon name="edit" size={14} /> Edit</button><button disabled={busy} onClick={() => void remove(product)} className="inline-flex items-center gap-1 text-xs font-black text-[#c94758] disabled:cursor-wait disabled:opacity-50">{busy ? <Spinner size={13} /> : null}Delete</button></td></tr>; })}</tbody></table></div>}
    </section>
    {panelOpen && <ProductPanel draft={draft} editing={Boolean(editingId)} saving={saving} onChange={setDraft} onImageFile={setImageFile} onClose={() => setPanelOpen(false)} onSave={() => void save()} />}{toast && <Toast message={toast} onClose={() => setToast("")} />}</AdminShell>;
}

function ProductPanel({ draft, editing, saving, onChange, onImageFile, onClose, onSave }: { draft: Draft; editing: boolean; saving: boolean; onChange: (draft: Draft) => void; onImageFile: (file: File | null) => void; onClose: () => void; onSave: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const choose = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; onImageFile(file); const reader = new FileReader(); reader.onload = () => onChange({ ...draft, image: String(reader.result) }); reader.readAsDataURL(file); };
  const isCard = draft.kind === "POSTCARD";
  const setVariant = (index: number, changes: Partial<VariantDraft>) => onChange({ ...draft, variants: draft.variants.map((variant, current) => current === index ? { ...variant, ...changes } : variant) });
  const setOption = (index: number, changes: Partial<OptionDraft>) => onChange({ ...draft, options: draft.options.map((option, current) => current === index ? { ...option, ...changes } : option) });
  return <div className="fixed inset-0 z-50"><button className="absolute inset-0 bg-[#182443]/25" onClick={onClose} aria-label="Close" /><section className="absolute bottom-0 right-0 top-0 w-full max-w-[460px] overflow-y-auto bg-white p-6 shadow-2xl sm:p-8"><button type="button" onClick={onClose} className="float-right text-xs font-black text-[#737b90]">Close</button><p className="pt-8 text-[10px] font-black tracking-widest text-[#ee5264]">DATABASE CATALOG</p><h2 className="mt-2 text-2xl font-black">{editing ? "Edit product" : "Add product"}</h2>
    <label className="mt-8 block text-sm font-black">Category<select value={draft.kind} onChange={(event) => { const kind = event.target.value as ProductKind; onChange({ ...draft, kind, provider: DEFAULT_POD_PROVIDER[kind], ...(editing ? {} : { photoCount: defaultPhotoCount(kind) }) }); }} className="field">{KIND_ORDER.map((kind) => <option key={kind} value={kind}>{PRODUCT_KIND_INFO[kind].admin}</option>)}</select><span className="mt-1 block text-[11px] font-bold text-[#9297a4]">Shown on {PRODUCT_KIND_INFO[draft.kind].path}</span></label>
    <label className="mt-4 block text-sm font-black">Print shop (POD)<select value={draft.provider} onChange={(event) => onChange({ ...draft, provider: event.target.value as PodProvider })} className="field">{POD_PROVIDERS.map((provider) => <option key={provider} value={provider}>{POD_PROVIDER_LABELS[provider]}</option>)}</select><span className="mt-1 block text-[11px] font-bold text-[#9297a4]">Saved on every order line so you know where to send it.</span></label>
    <label className="mt-4 block text-sm font-black">Product name<input value={draft.name} onChange={(event) => onChange({ ...draft, name: event.target.value })} className="field" autoFocus /></label>
    <label className="mt-4 block text-sm font-black">Description<textarea value={draft.description} onChange={(event) => onChange({ ...draft, description: event.target.value })} className="field resize-none" rows={3} /></label>
    <label className="mt-4 block text-sm font-black">{!isCard && draft.variants.length ? "Base price (€) · used only without sizes" : "Price (€)"}<input value={draft.price} onChange={(event) => onChange({ ...draft, price: event.target.value })} type="number" min="0" step="0.01" className="field" /></label>
    {isCard ? <label className="mt-4 block text-sm font-black">Card template<select value={draft.templateSlug} onChange={(event) => onChange({ ...draft, templateSlug: event.target.value as CardTemplateSlug })} className="field">{CARD_TEMPLATE_SLUGS.map((slug) => <option key={slug} value={slug}>{TEMPLATE_NAMES[slug]}</option>)}</select><span className="mt-1 block text-[11px] font-bold text-[#9297a4]">Tradicional, Collage and Magazine are available for Cards only. Customers choose the card size (5 × 7&quot; or A5); size prices are set in Settings.</span></label> : <>
      <label className="mt-4 block text-sm font-black">Customer photos required<input value={draft.photoCount} onChange={(event) => onChange({ ...draft, photoCount: Math.min(MAX_PRODUCT_PHOTOS, Math.max(1, Math.round(Number(event.target.value) || 1))) })} type="number" min="1" max={MAX_PRODUCT_PHOTOS} className="field" /></label>
      <div className="mt-5 rounded-2xl border border-[#e4e7ee] p-4"><div className="flex items-center justify-between"><p className="text-sm font-black">Sizes &amp; prices</p><button type="button" onClick={() => onChange({ ...draft, variants: [...draft.variants, { name: "", price: draft.price, photoCount: "", podSku: "", provider: "" }] })} className="text-xs font-black text-[#ee5264]">+ Add size</button></div><p className="mt-1 text-[11px] text-[#9297a4]">Optional. Each size (or pack / case type) has its own price; customers must pick one. &ldquo;Photos&rdquo; overrides the photo count for that size, e.g. 3 for a pack of 3 magnets.</p>{draft.variants.map((variant, index) => <div key={variant.id || index} className="mt-3 rounded-xl bg-[#fafbfc] p-3"><div className="grid grid-cols-[1fr_88px_auto] items-center gap-2"><input value={variant.name} onChange={(event) => setVariant(index, { name: event.target.value })} placeholder="e.g. 30 × 40 cm" className="field !mt-0" aria-label="Size name" /><input value={variant.price} onChange={(event) => setVariant(index, { price: event.target.value })} type="number" min="0" step="0.01" placeholder="€" className="field !mt-0" aria-label="Size price" /><button type="button" onClick={() => onChange({ ...draft, variants: draft.variants.filter((_, current) => current !== index) })} className="text-xs font-black text-[#c94758]" aria-label="Remove size">✕</button></div><div className="mt-2 grid grid-cols-[72px_1fr_1fr] gap-2"><input value={variant.photoCount} onChange={(event) => setVariant(index, { photoCount: event.target.value })} type="number" min="1" max={MAX_PRODUCT_PHOTOS} placeholder="Photos" className="field !mt-0" aria-label="Photos for this size" /><input value={variant.podSku} onChange={(event) => setVariant(index, { podSku: event.target.value })} placeholder="Print shop SKU" className="field !mt-0" aria-label="Print shop SKU" /><select value={variant.provider} onChange={(event) => setVariant(index, { provider: event.target.value as PodProvider | "" })} className="field !mt-0" aria-label="Print shop for this size"><option value="">Same print shop</option>{POD_PROVIDERS.map((provider) => <option key={provider} value={provider}>{POD_PROVIDER_LABELS[provider]}</option>)}</select></div></div>)}</div>
      <div className="mt-4 rounded-2xl border border-[#e4e7ee] p-4"><div className="flex items-center justify-between"><p className="text-sm font-black">Customization options</p><button type="button" onClick={() => onChange({ ...draft, options: [...draft.options, { name: "", choices: "", required: true }] })} className="text-xs font-black text-[#ee5264]">+ Add option</button></div><p className="mt-1 text-[11px] text-[#9297a4]">Optional, e.g. Color: White, Black. Shown next to the product&apos;s own studio options.</p>{draft.options.map((option, index) => <div key={index} className="mt-3 rounded-xl bg-[#fafbfc] p-3"><div className="flex items-center gap-2"><input value={option.name} onChange={(event) => setOption(index, { name: event.target.value })} placeholder="Option name" className="field !mt-0" aria-label="Option name" /><button type="button" onClick={() => onChange({ ...draft, options: draft.options.filter((_, current) => current !== index) })} className="text-xs font-black text-[#c94758]" aria-label="Remove option">✕</button></div><input value={option.choices} onChange={(event) => setOption(index, { choices: event.target.value })} placeholder="Choices, separated by commas" className="field mt-2" aria-label="Option choices" /><label className="mt-2 flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={option.required} onChange={(event) => setOption(index, { required: event.target.checked })} className="accent-[#ee5264]" /> Required</label></div>)}</div>
    </>}
    <button type="button" onClick={() => fileRef.current?.click()} className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-dashed border-[#e7a59c] p-3 text-left"><span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#fff0e8] text-[#ee5264]">{draft.image ? <img src={draft.image} alt="" className="h-full w-full object-cover" /> : "＋"}</span><span><span className="block text-sm font-black">{draft.image ? "Change image" : "Upload image"}</span><span className="block text-xs text-[#7c8191]">JPG, PNG or WebP · max 10 MB</span></span></button><input ref={fileRef} onChange={choose} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" />
    <div className="mt-4 flex flex-wrap gap-5 text-sm font-black"><label className="flex items-center gap-2"><input type="checkbox" checked={draft.active} onChange={(event) => onChange({ ...draft, active: event.target.checked })} className="accent-[#ee5264]" /> Visible on the storefront</label><label className="flex items-center gap-2"><input type="checkbox" checked={draft.featured} onChange={(event) => onChange({ ...draft, featured: event.target.checked })} className="accent-[#ee5264]" /> Featured</label></div>
    <button type="button" disabled={saving} onClick={onSave} className="mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-[#ee5264] px-5 py-3.5 text-sm font-black text-white disabled:cursor-wait disabled:opacity-60">{saving ? <><Spinner size={15} />Saving…</> : "Save"}</button></section></div>;
}
