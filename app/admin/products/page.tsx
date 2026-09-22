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
  useEffect(() => setProducts([...db.templates.map((item) => ({ id: item.id, name: item.name, category: "Postcard template", price: db.templatePrices[item.id] ?? item.price, active: item.active })), ...addOns.map((item) => ({ id: item.id, name: item.name, category: "Custom sticker", price: item.price, active: true }))]), [db.templates, db.templatePrices]);
  const openNew = () => { setDraft(emptyDraft); setEditingId(null); setPanelOpen(true); };
  const openEdit = (product: Product) => { setDraft({ name: product.name, category: product.category, price: product.price }); setEditingId(product.id); setPanelOpen(true); };
  const save = () => {
    if (!draft.name.trim() || !Number.isFinite(draft.price) || draft.price < 0) { setToast("Add a product name and a valid price"); return; }
    if (editingId) {
      setProducts((items) => items.map((item) => item.id === editingId ? { ...item, ...draft, name: draft.name.trim() } : item));
      if (editingId.startsWith("template")) updateMockDb((current) => ({ ...current, templatePrices: { ...current.templatePrices, [editingId]: draft.price } }));
      setToast("Product updated");
    } else {
      setProducts((items) => [{ id: `product-${Date.now()}`, ...draft, name: draft.name.trim(), active: true }, ...items]);
      setToast("Product added to this demo catalog");
    }
    setPanelOpen(false);
  };
  return <AdminShell><AdminPageHeader eyebrow="CATALOG" title="Products" body="Add, edit, publish, or pause products customers can add to their moment." action={<button onClick={openNew} className="rounded-full bg-[#ee5264] px-4 py-3 text-xs font-black text-white hover:bg-[#d83d54]">+ Add product</button>} />
    <section className="mt-8 overflow-hidden rounded-2xl border border-[#e4e7ee] bg-white"><div className="flex items-center justify-between border-b border-[#e4e7ee] p-5"><p className="text-sm font-black">{products.length} products</p><span className="text-xs text-[#9297a4]">Demo catalog</span></div><div className="overflow-x-auto"><table className="w-full min-w-[690px] text-left"><thead><tr className="border-b border-[#e4e7ee] bg-[#fafbfc] text-[10px] uppercase tracking-[.14em] text-[#9297a4]"><th className="px-5 py-3 font-black">Product</th><th className="px-5 py-3 font-black">Category</th><th className="px-5 py-3 font-black">Price</th><th className="px-5 py-3 font-black">Status</th><th className="px-5 py-3 font-black text-right">Actions</th></tr></thead><tbody>{products.map((product) => <tr key={product.id} className="border-b border-[#eef0f4] text-sm last:border-0"><td className="px-5 py-4 font-black">{product.name}</td><td className="px-5 py-4 text-[#737b90]">{product.category}</td><td className="px-5 py-4 font-black"><Price value={product.price} /></td><td className="px-5 py-4"><button onClick={() => { setProducts((items) => items.map((item) => item.id === product.id ? { ...item, active: !item.active } : item)); setToast(`${product.name} ${product.active ? "deactivated" : "activated"}`); }}><StatusBadge tone={product.active ? "green" : "slate"}>{product.active ? "Active" : "Inactive"}</StatusBadge></button></td><td className="px-5 py-4 text-right"><button onClick={() => openEdit(product)} className="inline-flex items-center gap-2 rounded-full border border-[#dfd3cc] px-3 py-2 text-xs font-black hover:border-[#ee5264]"><Icon name="edit" size={14} /> Edit</button></td></tr>)}</tbody></table></div></section>
    {panelOpen && <ProductPanel draft={draft} editing={Boolean(editingId)} onChange={setDraft} onClose={() => setPanelOpen(false)} onSave={save} />}{toast && <Toast message={toast} onClose={() => setToast("")} />}
  </AdminShell>;
}

function ProductPanel({ draft, editing, onChange, onClose, onSave }: { draft: ProductDraft; editing: boolean; onChange: (draft: ProductDraft) => void; onClose: () => void; onSave: () => void }) {
  return <div className="fixed inset-0 z-50"><button className="absolute inset-0 bg-[#182443]/25" onClick={onClose} aria-label="Close product form" /><section className="absolute bottom-0 right-0 top-0 w-full max-w-[410px] overflow-y-auto bg-white p-6 shadow-2xl sm:p-8"><button type="button" onClick={onClose} className="float-right text-xs font-black text-[#737b90]">Close</button><p className="pt-8 text-[10px] font-black tracking-widest text-[#ee5264]">CATALOG DEMO</p><h2 className="mt-2 text-2xl font-black">{editing ? "Edit product" : "Add product"}</h2><p className="mt-2 text-sm leading-6 text-[#737b90]">Changes remain available while this demo session is open.</p><label className="mt-8 block text-sm font-black">Product name<input value={draft.name} onChange={(event) => onChange({ ...draft, name: event.target.value })} className="field" placeholder="e.g. Photo magnet" autoFocus /></label><label className="mt-4 block text-sm font-black">Category<select value={draft.category} onChange={(event) => onChange({ ...draft, category: event.target.value })} className="field"><option>Postcard template</option><option>Custom sticker</option><option>Photo print</option><option>Gift add-on</option></select></label><label className="mt-4 block text-sm font-black">Price (€)<input value={draft.price} onChange={(event) => onChange({ ...draft, price: Number(event.target.value) })} type="number" min="0" step="0.1" className="field" /></label><button type="button" onClick={onSave} className="mt-7 w-full rounded-full bg-[#ee5264] px-5 py-3.5 text-sm font-black text-white">{editing ? "Save changes" : "Add product"}</button></section></div>;
}
