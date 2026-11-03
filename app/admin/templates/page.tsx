"use client";

import { useEffect, useRef, useState } from "react";
import { AdminPageHeader, AdminShell } from "@/components/admin";
import { Icon } from "@/components/icons";
import { Toast } from "@/components/site";

type Template = { id: string; slug: string; name: string; type: string; description: string | null; imageCount: number; priceCents: number; active: boolean; metadata?: { eyebrow?: string; layoutId?: string } | null; images?: { id: string; asset: { url: string | null } }[] };
type Draft = { name: string; type: string; description: string; imageCount: number; price: number; eyebrow: string; layoutId: string };
const blank: Draft = { name: "", type: "traditional", description: "", imageCount: 2, price: 8.9, eyebrow: "NEW · 2 PHOTOS", layoutId: "template-3" };

export default function AdminTemplatesPage() {
  const [items, setItems] = useState<Template[]>([]); const [draft, setDraft] = useState<Draft>(blank); const [editingId, setEditingId] = useState<string | null>(null); const [open, setOpen] = useState(false); const [toast, setToast] = useState(""); const [saving, setSaving] = useState(false);
  const load = async () => { const response = await fetch("/api/admin/templates", { cache: "no-store" }); const body = await response.json(); if (!response.ok) throw new Error(body.error || "Unable to load templates"); setItems(body.templates || []); };
  useEffect(() => { void load().catch((reason) => setToast(reason instanceof Error ? reason.message : "Unable to load templates")); }, []);
  const edit = (item: Template) => { setEditingId(item.id); setDraft({ name: item.name, type: item.type, description: item.description || "", imageCount: item.imageCount, price: item.priceCents / 100, eyebrow: item.metadata?.eyebrow || "", layoutId: item.metadata?.layoutId || item.slug }); setOpen(true); };
  const save = async () => { if (!draft.name.trim() || !draft.description.trim() || draft.price < 0) { setToast("Add a name, description and valid price"); return; } setSaving(true); try { const payload = { name: draft.name.trim(), type: draft.type, description: draft.description.trim(), imageCount: draft.imageCount, priceCents: Math.round(draft.price * 100), metadata: { eyebrow: draft.eyebrow, layoutId: draft.layoutId }, ...(editingId ? {} : { slug: `${draft.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now()}`, active: true }) }; const response = await fetch(editingId ? `/api/admin/templates?id=${editingId}` : "/api/admin/templates", { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); const body = await response.json(); if (!response.ok) throw new Error(body.error || "Unable to save template"); await load(); setOpen(false); setToast(editingId ? "Template updated" : "Template created"); } catch (reason) { setToast(reason instanceof Error ? reason.message : "Unable to save template"); } finally { setSaving(false); } };
  // Cover image: upload the file, then attach the stored asset to the template.
  const [busyImage, setBusyImage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const pickFor = useRef<Template | null>(null);
  const pickImage = (item: Template) => { pickFor.current = item; fileRef.current?.click(); };
  const uploadImage = async (file: File) => {
    const item = pickFor.current;
    if (!item) return;
    if (file.size > 10 * 1024 * 1024) { setToast("That image is larger than 10 MB"); return; }
    setBusyImage(item.id);
    try {
      const form = new FormData(); form.append("file", file); form.append("kind", "TEMPLATE_IMAGE");
      const uploaded = await fetch("/api/uploads", { method: "POST", body: form });
      const asset = (await uploaded.json()).asset;
      if (!uploaded.ok || !asset?.id) throw new Error(asset?.error || "Unable to upload the image");
      const response = await fetch("/api/admin/templates/images", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ templateId: item.id, assetId: asset.id, alt: item.name }) });
      if (!response.ok) throw new Error((await response.json()).error || "Unable to save the image");
      await load();
      setToast(`“${item.name}” image saved — the storefront now shows it`);
    } catch (reason) { setToast(reason instanceof Error ? reason.message : "Unable to save the image"); }
    finally { setBusyImage(""); }
  };
  const removeImage = async (item: Template) => {
    if (!window.confirm(`Remove the image of “${item.name}”? The storefront goes back to the built-in preview.`)) return;
    setBusyImage(item.id);
    try {
      const response = await fetch(`/api/admin/templates/images?templateId=${item.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error((await response.json()).error || "Unable to remove the image");
      await load();
      setToast(`“${item.name}” image removed`);
    } catch (reason) { setToast(reason instanceof Error ? reason.message : "Unable to remove the image"); }
    finally { setBusyImage(""); }
  };
  const archive = async (item: Template) => { if (!window.confirm(`Archive ${item.name}?`)) return; const response = await fetch(`/api/admin/templates?id=${item.id}`, { method: "DELETE" }); if (!response.ok) { const body = await response.json(); setToast(body.error || "Unable to archive template"); return; } await load(); setToast("Template archived"); };
  return <AdminShell><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void uploadImage(file); }} /><AdminPageHeader eyebrow="CATALOG / DESIGN SYSTEM" title="Templates" body="Create and edit templates stored in the database. The image is what customers see in the template gallery." action={<button onClick={() => { setEditingId(null); setDraft(blank); setOpen(true); }} className="rounded-full bg-[#ee5264] px-4 py-3 text-xs font-black text-white">+ New template</button>} /><div className="mt-8 grid gap-5 md:grid-cols-3">{items.map((item) => <article key={item.id} className="rounded-2xl border border-[#e4e7ee] bg-white p-5"><p className="text-[10px] font-black uppercase tracking-widest text-[#ee5264]">{item.metadata?.eyebrow || item.type}</p><h2 className="mt-3 font-black">{item.name}</h2><TemplateImageField item={item} busy={busyImage === item.id} onPick={() => pickImage(item)} onRemove={() => void removeImage(item)} /><p className="mt-2 min-h-12 text-sm leading-6 text-[#737b90]">{item.description}</p><div className="mt-5 flex items-center justify-between"><span className="text-sm font-black">€{(item.priceCents / 100).toFixed(2)}</span><div><button onClick={() => edit(item)} className="mr-3 text-xs font-black"><Icon name="edit" size={14} /> Edit</button><button onClick={() => void archive(item)} className="text-xs font-black text-[#c94758]">Archive</button></div></div></article>)}</div>{open && <div className="fixed inset-0 z-50"><button className="absolute inset-0 bg-[#182443]/25" onClick={() => setOpen(false)} aria-label="Close" /><section className="absolute bottom-0 right-0 top-0 w-full max-w-[410px] overflow-y-auto bg-white p-6 shadow-2xl sm:p-8"><button onClick={() => setOpen(false)} className="float-right text-xs font-black text-[#737b90]">Close</button><p className="pt-8 text-[10px] font-black tracking-widest text-[#ee5264]">DATABASE TEMPLATE</p><h2 className="mt-2 text-2xl font-black">{editingId ? "Edit template" : "New template"}</h2><label className="mt-8 block text-sm font-black">Name<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="field" autoFocus /></label><label className="mt-4 block text-sm font-black">Type<select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value })} className="field"><option value="traditional">Traditional</option><option value="collage">Collage</option><option value="magazine">Magazine</option></select></label><label className="mt-4 block text-sm font-black">Label<input value={draft.eyebrow} onChange={(event) => setDraft({ ...draft, eyebrow: event.target.value.toUpperCase() })} className="field" /></label><label className="mt-4 block text-sm font-black">Description<textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className="field resize-none" rows={4} /></label><div className="mt-4 grid grid-cols-2 gap-3"><label className="text-sm font-black">Photos<input type="number" min="0" max="20" value={draft.imageCount} onChange={(event) => setDraft({ ...draft, imageCount: Number(event.target.value) })} className="field" /></label><label className="text-sm font-black">Price (€)<input type="number" min="0" step="0.01" value={draft.price} onChange={(event) => setDraft({ ...draft, price: Number(event.target.value) })} className="field" /></label></div><button disabled={saving} onClick={() => void save()} className="mt-7 w-full rounded-full bg-[#ee5264] px-5 py-3.5 text-sm font-black text-white disabled:opacity-60">{saving ? "Saving…" : "Save"}</button></section></div>}{toast && <Toast message={toast} onClose={() => setToast("")} />}</AdminShell>;
}

// Cover image of one template, with the built-in preview as the fallback.
function TemplateImageField({ item, busy, onPick, onRemove }: { item: Template; busy: boolean; onPick: () => void; onRemove: () => void }) {
  const url = item.images?.[0]?.asset.url || null;
  return <div className="mt-3 rounded-xl border border-[#e4e7ee] bg-[#fafbfc] p-3">
    <div className="flex gap-3">
      <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#e4e7ee] bg-white text-center text-[10px] font-black text-[#9297a4]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {url ? <img src={url} alt={item.name} className="h-full w-full object-cover" /> : <span className="px-1">Built-in preview</span>}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-black text-[#182443]">Gallery image</p>
        <p className="mt-0.5 text-[11px] leading-4 text-[#737b90]">{url ? "Shown in the template gallery." : "No image yet: the gallery draws a sample of this layout."}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={onPick} className="rounded-full bg-[#182443] px-3 py-1.5 text-[11px] font-black text-white disabled:opacity-50">{busy ? "Saving…" : url ? "Replace" : "Upload"}</button>
          {url && <button type="button" disabled={busy} onClick={onRemove} className="rounded-full border border-[#dfd3cc] px-3 py-1.5 text-[11px] font-black disabled:opacity-50">Remove</button>}
        </div>
      </div>
    </div>
  </div>;
}
