"use client";

import { useEffect, useState } from "react";
import { AdminPageHeader, AdminShell } from "@/components/admin";
import { Icon } from "@/components/icons";
import { CardPreview } from "@/components/card-preview";
import { templates } from "@/lib/data";
import { updateMockDb, useMockDb } from "@/lib/mock-store";
import { Toast } from "@/components/site";

type TemplateRecord = { id: string; layoutId: string; name: string; eyebrow: string; description: string; price: number; imageCount: number };
type TemplateDraft = Omit<TemplateRecord, "id">;
const initialTemplates: TemplateRecord[] = templates.map(({ id, name, eyebrow, description, price, imageCount }) => ({ id, layoutId: id, name, eyebrow, description, price, imageCount }));
const blankTemplate: TemplateDraft = { layoutId: "template-3", name: "", eyebrow: "NEW · 2 PHOTOS", description: "", price: 8.9, imageCount: 2 };

export default function AdminTemplatesPage() {
  const db = useMockDb();
  const [items, setItems] = useState<TemplateRecord[]>(initialTemplates);
  const [draft, setDraft] = useState<TemplateDraft>(blankTemplate);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [toast, setToast] = useState("");
  useEffect(() => setItems(db.templates.map((item) => ({ ...item, layoutId: item.id }))), [db.templates]);
  const startNew = () => { setEditingId(null); setDraft(blankTemplate); setPanelOpen(true); };
  const startEdit = (item: TemplateRecord) => { setEditingId(item.id); setDraft({ layoutId: item.layoutId, name: item.name, eyebrow: item.eyebrow, description: item.description, price: item.price, imageCount: item.imageCount }); setPanelOpen(true); };
  const save = () => {
    if (!draft.name.trim() || !draft.description.trim() || draft.price < 0) { setToast("Add a name, description, and valid price"); return; }
    if (editingId) {
      const next = { ...draft, name: draft.name.trim(), description: draft.description.trim() };
      updateMockDb((current) => ({ ...current, templates: current.templates.map((item) => item.id === editingId ? { ...item, ...next } : item), templatePrices: { ...current.templatePrices, [editingId]: next.price } }));
      setToast("Template updated and persisted");
    } else {
      const id = `template-demo-${Date.now()}`;
      const next = { id, ...draft, name: draft.name.trim(), description: draft.description.trim(), active: true };
      updateMockDb((current) => ({ ...current, templates: [next, ...current.templates], templatePrices: { ...current.templatePrices, [id]: next.price } }));
      setToast("New template added to this demo");
    }
    setPanelOpen(false);
  };
  return <AdminShell><AdminPageHeader eyebrow="CATALOG / DESIGN SYSTEM" title="Templates" body="Create and edit the starting points customers use to make their card their own." action={<button onClick={startNew} className="rounded-full bg-[#ee5264] px-4 py-3 text-xs font-black text-white">+ New template</button>} />
    <div className="mt-8 grid gap-5 md:grid-cols-3">{items.map((template) => <article key={template.id} className="overflow-hidden rounded-2xl border border-[#e4e7ee] bg-white"><div className="relative flex aspect-[1.25/1] items-center justify-center bg-[#f8efe8] p-4"><div className="aspect-[.82/1] h-full overflow-hidden rounded-lg shadow"><CardPreview compact templateId={template.layoutId} message={template.layoutId === "template-1" ? "Últimas noticias" : template.name || "Enhorabuena"} emojiElements={[]} photoDataUrls={Array(template.imageCount).fill(null)} /></div><span className="absolute left-4 top-4 rounded-full bg-white px-3 py-1.5 text-[10px] font-black tracking-wider">{template.eyebrow}</span></div><div className="p-5"><h2 className="font-black">{template.name}</h2><p className="mt-2 min-h-12 text-sm leading-6 text-[#737b90]">{template.description}</p><div className="mt-5 flex items-center justify-between"><span className="text-sm font-black">€{template.price.toFixed(2)}</span><button onClick={() => startEdit(template)} className="flex items-center gap-2 text-xs font-black text-[#ee5264]">Edit <Icon name="edit" size={14} /></button></div></div></article>)}</div>
    {panelOpen && <TemplatePanel draft={draft} editing={Boolean(editingId)} onChange={setDraft} onClose={() => setPanelOpen(false)} onSave={save} />}{toast && <Toast message={toast} onClose={() => setToast("")} />}
  </AdminShell>;
}

function TemplatePanel({ draft, editing, onChange, onClose, onSave }: { draft: TemplateDraft; editing: boolean; onChange: (draft: TemplateDraft) => void; onClose: () => void; onSave: () => void }) {
  return <div className="fixed inset-0 z-50"><button className="absolute inset-0 bg-[#182443]/25" onClick={onClose} aria-label="Close template form" /><section className="absolute bottom-0 right-0 top-0 w-full max-w-[410px] overflow-y-auto bg-white p-6 shadow-2xl sm:p-8"><button type="button" onClick={onClose} className="float-right text-xs font-black text-[#737b90]">Close</button><p className="pt-8 text-[10px] font-black tracking-widest text-[#ee5264]">TEMPLATE DEMO</p><h2 className="mt-2 text-2xl font-black">{editing ? "Edit template" : "New template"}</h2><label className="mt-8 block text-sm font-black">Template name<input value={draft.name} onChange={(event) => onChange({ ...draft, name: event.target.value })} className="field" placeholder="e.g. Birthday story" autoFocus /></label><label className="mt-4 block text-sm font-black">Preview layout<select value={draft.layoutId} onChange={(event) => onChange({ ...draft, layoutId: event.target.value })} className="field"><option value="template-3">Traditional</option><option value="template-2">Collage</option><option value="template-1">Magazine</option></select></label><label className="mt-4 block text-sm font-black">Label<input value={draft.eyebrow} onChange={(event) => onChange({ ...draft, eyebrow: event.target.value.toUpperCase() })} className="field" placeholder="BIRTHDAY · 2 PHOTOS" /></label><label className="mt-4 block text-sm font-black">Description<textarea value={draft.description} onChange={(event) => onChange({ ...draft, description: event.target.value })} className="field min-h-24 resize-y" placeholder="Describe the template" /></label><div className="mt-4 grid grid-cols-2 gap-3"><label className="text-sm font-black">Price (€)<input value={draft.price} onChange={(event) => onChange({ ...draft, price: Number(event.target.value) })} type="number" min="0" step="0.1" className="field" /></label><label className="text-sm font-black">Photos<select value={draft.imageCount} onChange={(event) => onChange({ ...draft, imageCount: Number(event.target.value) })} className="field"><option value={1}>1</option><option value={2}>2</option><option value={4}>4</option></select></label></div><button type="button" onClick={onSave} className="mt-7 w-full rounded-full bg-[#ee5264] px-5 py-3.5 text-sm font-black text-white">{editing ? "Save changes" : "Create template"}</button></section></div>;
}
