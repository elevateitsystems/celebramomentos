"use client";

import { useEffect, useState } from "react";
import { AdminPageHeader, AdminShell } from "@/components/admin";
import { Icon } from "@/components/icons";
import { addOns, templates } from "@/lib/data";
import { updateMockDb, useMockDb } from "@/lib/mock-store";
import { Price, StatusBadge, Toast } from "@/components/site";

type Product = { id: string; name: string; category: string; price: number; active: boolean };
type ProductDraft = Omit<Product, "id" | "active">;
const initialProducts: Product[] = [
  ...templates.map((item) => ({ id: item.id, name: item.name, category: "Postcard template", price: item.price, active: true })),
  ...addOns.map((item) => ({ id: item.id, name: item.name, category: "Custom sticker", price: item.price, active: true })),
];
const emptyDraft: ProductDraft = { name: "", category: "Postcard template", price: 8.9 };

export default function AdminProductsPage() {
  const db = useMockDb();
  const [products, setProducts] = useState(initialProducts);
  const [draft, setDraft] = useState<ProductDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => setProducts([...db.templates.map((item) => ({ id: item.id, name: item.name, category: "Postcard template", price: db.templatePrices[item.id] ?? item.price, active: item.active })), ...db.products, ...addOns.map((item) => ({ id: item.id, name: item.name, category: "Custom sticker", price: item.price, active: true }))]), [db.products, db.templates, db.templatePrices]);
  const openNew = () => { setDraft(emptyDraft); setEditingId(null); setPanelOpen(true); };
  const openEdit = (product: Product) => { setDraft({ name: product.name, category: product.category, price: product.price }); setEditingId(product.id); setPanelOpen(true); };
  const save = async () => {
    if (!draft.name.trim() || !Number.isFinite(draft.price) || draft.price < 0) { setToast("Add a product name and a valid price"); return; }
    setSaving(true);
    try {
      if (editingId?.startsWith("template")) {
        setProducts((items) => items.map((item) => item.id === editingId ? { ...item, ...draft, name: draft.name.trim() } : item));
        updateMockDb((current) => ({ ...current, templatePrices: { ...current.templatePrices, [editingId]: draft.price } }));
      } else if (editingId) {
        const response = await fetch(`/api/admin/products?id=${encodeURIComponent(editingId)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: draft.name.trim(), basePriceCents: Math.round(draft.price * 100) }) });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Unable to update product");
        setProducts((items) => items.map((item) => item.id === editingId ? { ...item, ...draft, name: draft.name.trim(), price: body.product.basePriceCents / 100 } : item));
      } else {
        const slug = `${draft.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now()}`;
        const response = await fetch("/api/admin/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, name: draft.name.trim(), kind: "POSTCARD", basePriceCents: Math.round(draft.price * 100), active: true, featured: false }) });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Unable to create product");
        setProducts((items) => [{ id: body.product.id, name: body.product.name, category: draft.category, price: body.product.basePriceCents / 100, active: body.product.active }, ...items]);
      }
      setPanelOpen(false);
      setToast(editingId ? "Product updated" : "Product published on the website");
    } catch (reason) {
      if (!editingId) {
        const localProduct = { id: `product-local-${Date.now()}`, name: draft.name.trim(), category: draft.category, price: draft.price, active: true };
        updateMockDb((current) => ({ ...current, products: [localProduct, ...current.products] }));
        setProducts((items) => [localProduct, ...items]);
        setPanelOpen(false);
        setToast("Product saved locally and published on this browser");
        return;
      }
      setToast(reason instanceof Error ? reason.message : "Unable to save product");
    } finally {
      setSaving(false);
    }
  };
  const removeProduct = async (product: Product) => {
    if (!window.confirm(`Delete ${product.name}?`)) return;
    try {
      if (product.id.startsWith("template")) {
        updateMockDb((current) => { const { [product.id]: _removed, ...templatePrices } = current.templatePrices; return { ...current, templates: current.templates.filter((item) => item.id !== product.id), templatePrices }; });
      } else if (product.id.startsWith("product-local")) {
        updateMockDb((current) => ({ ...current, products: current.products.filter((item) => item.id !== product.id) }));
      } else {
        const response = await fetch(`/api/admin/products?id=${encodeURIComponent(product.id)}`, { method: "DELETE" });
        if (!response.ok) { const body = await response.json(); throw new Error(body.error || "Unable to delete product"); }
      }
      setProducts((items) => items.filter((item) => item.id !== product.id));
      setToast("Product deleted");
    } catch (reason) {
      setToast(reason instanceof Error ? reason.message : "Unable to delete product");
    }
  };
  return <AdminShell><AdminPageHeader eyebrow="CATALOG" title="Products" body="Add, edit, publish, or pause products customers can add to their moment." action={<button onClick={openNew} className="rounded-full bg-[#ee5264] px-4 py-3 text-xs font-black text-white hover:bg-[#d83d54]">+ Add product</button>} />
    <section className="mt-8 overflow-hidden rounded-2xl border border-[#e4e7ee] bg-white"><div className="flex items-center justify-between border-b border-[#e4e7ee] p-5"><p className="text-sm font-black">{products.length} products</p><span className="text-xs text-[#9297a4]">Demo catalog</span></div><div className="overflow-x-auto"><table className="w-full min-w-[690px] text-left"><thead><tr className="border-b border-[#e4e7ee] bg-[#fafbfc] text-[10px] uppercase tracking-[.14em] text-[#9297a4]"><th className="px-5 py-3 font-black">Product</th><th className="px-5 py-3 font-black">Category</th><th className="px-5 py-3 font-black">Price</th><th className="px-5 py-3 font-black">Status</th><th className="px-5 py-3 font-black text-right">Actions</th></tr></thead><tbody>{products.map((product) => <tr key={product.id} className="border-b border-[#eef0f4] text-sm last:border-0"><td className="px-5 py-4 font-black">{product.name}</td><td className="px-5 py-4 text-[#737b90]">{product.category}</td><td className="px-5 py-4 font-black"><Price value={product.price} /></td><td className="px-5 py-4"><button onClick={() => { setProducts((items) => items.map((item) => item.id === product.id ? { ...item, active: !item.active } : item)); setToast(`${product.name} ${product.active ? "deactivated" : "activated"}`); }}><StatusBadge tone={product.active ? "green" : "slate"}>{product.active ? "Active" : "Inactive"}</StatusBadge></button></td><td className="px-5 py-4 text-right"><button onClick={() => openEdit(product)} className="inline-flex items-center gap-2 rounded-full border border-[#dfd3cc] px-3 py-2 text-xs font-black hover:border-[#ee5264]"><Icon name="edit" size={14} /> Edit</button></td></tr>)}</tbody></table></div></section>
    {panelOpen && <ProductPanel draft={draft} editing={Boolean(editingId)} saving={saving} onChange={setDraft} onClose={() => setPanelOpen(false)} onSave={save} onDelete={editingId ? () => { const product = products.find((item) => item.id === editingId); if (product) void removeProduct(product); } : undefined} />}{toast && <Toast message={toast} onClose={() => setToast("")} />}
  </AdminShell>;
}

function ProductPanel({ draft, editing, saving, onChange, onClose, onSave, onDelete }: { draft: ProductDraft; editing: boolean; saving: boolean; onChange: (draft: ProductDraft) => void; onClose: () => void; onSave: () => void; onDelete?: () => void }) {
  return <div className="fixed inset-0 z-50"><button className="absolute inset-0 bg-[#182443]/25" onClick={onClose} aria-label="Close product form" /><section className="absolute bottom-0 right-0 top-0 w-full max-w-[410px] overflow-y-auto bg-white p-6 shadow-2xl sm:p-8"><button type="button" onClick={onClose} className="float-right text-xs font-black text-[#737b90]">Close</button><p className="pt-8 text-[10px] font-black tracking-widest text-[#ee5264]">CATALOG DEMO</p><h2 className="mt-2 text-2xl font-black">{editing ? "Edit product" : "Add product"}</h2><p className="mt-2 text-sm leading-6 text-[#737b90]">Changes remain available while this demo session is open.</p><label className="mt-8 block text-sm font-black">Product name<input value={draft.name} onChange={(event) => onChange({ ...draft, name: event.target.value })} className="field" placeholder="e.g. Photo magnet" autoFocus /></label><label className="mt-4 block text-sm font-black">Category<select value={draft.category} onChange={(event) => onChange({ ...draft, category: event.target.value })} className="field"><option>Postcard template</option><option>Custom sticker</option><option>Photo print</option><option>Gift add-on</option></select></label><label className="mt-4 block text-sm font-black">Price (€)<input value={draft.price} onChange={(event) => onChange({ ...draft, price: Number(event.target.value) })} type="number" min="0" step="0.1" className="field" /></label><button type="button" disabled={saving} onClick={onSave} className="mt-7 w-full rounded-full bg-[#ee5264] px-5 py-3.5 text-sm font-black text-white disabled:opacity-60">{saving ? "Saving…" : editing ? "Save changes" : "Add product"}</button>{onDelete && <button type="button" disabled={saving} onClick={onDelete} className="mt-3 w-full rounded-full border border-[#f3c6c2] px-5 py-3.5 text-sm font-black text-[#c94758] disabled:opacity-50">Delete product</button>}</section></div>;
}
