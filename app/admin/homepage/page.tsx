"use client";

import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { AdminPageHeader, AdminShell } from "@/components/admin";
import { Icon } from "@/components/icons";
import { BrandLoader } from "@/components/loading";
import { Spinner, StatusBadge, Toast } from "@/components/site";
import { HOMEPAGE_IMAGE_SLOTS, HOMEPAGE_SECTIONS, type HomepageImageId, type HomepageImageSlot, type HomepageImages } from "@/lib/homepage-images";

const MAX_BYTES = 10 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

async function readJson(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Something went wrong");
  return body;
}

// Built-in images that are only a part of a bigger picture are shown cropped like the home page does.
const cropStyle = (slot: HomepageImageSlot) => ({ backgroundImage: `url(${slot.fallback})`, backgroundSize: "200% 200%", backgroundPosition: "0% 0%", backgroundRepeat: "no-repeat" });

export default function AdminHomepageImagesPage() {
  const [images, setImages] = useState<HomepageImages>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState<HomepageImageId | null>(null);
  const [toast, setToast] = useState("");
  const pickerSlot = useRef<HomepageImageSlot | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      setImages((await readJson(await fetch("/api/admin/homepage-images", { cache: "no-store" }))).images);
    } catch (reason) {
      setLoadError(reason instanceof Error ? reason.message : "Unable to load images");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const pick = (slot: HomepageImageSlot) => { pickerSlot.current = slot; fileRef.current?.click(); };

  // Upload the file, then attach it to the slot. Adding and changing are the same call.
  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const slot = pickerSlot.current;
    event.target.value = "";
    if (!file || !slot) return;
    if (!TYPES.includes(file.type)) { setToast("Unable to use this file: choose a JPG, PNG or WebP image"); return; }
    if (file.size > MAX_BYTES) { setToast("Unable to use this file: the image is larger than 10 MB"); return; }
    setBusy(slot.id);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("kind", "BANNER");
      const { asset } = await readJson(await fetch("/api/uploads", { method: "POST", body: form }));
      const body = await readJson(await fetch("/api/admin/homepage-images", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slot: slot.id, assetId: asset.id }) }));
      setImages(body.images);
      setToast(`“${slot.label}” image saved — the home page now shows it`);
    } catch (reason) {
      setToast(`Unable to save the image: ${reason instanceof Error ? reason.message : "try again"}`);
    } finally {
      setBusy(null);
    }
  };

  const remove = async (slot: HomepageImageSlot) => {
    if (!window.confirm(`Remove the custom image of “${slot.label}”? The home page goes back to the built-in image.`)) return;
    setBusy(slot.id);
    try {
      setImages((await readJson(await fetch(`/api/admin/homepage-images?slot=${encodeURIComponent(slot.id)}`, { method: "DELETE" }))).images);
      setToast(`“${slot.label}” image removed — the built-in image is back`);
    } catch (reason) {
      setToast(`Unable to remove the image: ${reason instanceof Error ? reason.message : "try again"}`);
    } finally {
      setBusy(null);
    }
  };

  const customCount = Object.keys(images).length;

  return <AdminShell><AdminPageHeader eyebrow="STOREFRONT" title="Homepage images" body="Every picture on the home page, section by section, in the order visitors see them. Add or change an image and the home page shows it within moments; remove it to go back to the built-in image." />
    <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => void onFile(event)} />
    {loadError ? <div role="alert" className="mt-8 flex flex-col items-start gap-3 rounded-2xl border border-[#e4e7ee] bg-white p-6 text-sm font-bold text-[#c94758] sm:flex-row sm:items-center sm:justify-between"><span>{loadError}</span><button type="button" onClick={() => void load()} className="rounded-full border border-[#dfd3cc] px-4 py-2 text-xs font-black text-[#182443]">Retry</button></div>
      : loading ? <section className="mt-8 rounded-2xl border border-[#e4e7ee] bg-white"><BrandLoader label="Loading images…" /></section>
      : <>
        <p className="mt-6 text-xs font-bold text-[#737b90]">{customCount ? `${customCount} of ${HOMEPAGE_IMAGE_SLOTS.length} images are custom.` : "All images are still the built-in ones."} Use JPG, PNG or WebP up to 10 MB, at the recommended size shown under each section — other shapes are cropped to fit.</p>
        {HOMEPAGE_SECTIONS.map((section) => {
          const slots = HOMEPAGE_IMAGE_SLOTS.filter((slot) => slot.section === section.id);
          return <section key={section.id} className="mt-10">
            <h2 className="text-lg font-black">{section.title}</h2>
            <p className="mt-1 text-xs font-bold text-[#737b90]">{section.where}</p>
            <div className={`mt-4 grid gap-5 sm:grid-cols-2 ${slots.length === 4 ? "xl:grid-cols-4" : "xl:grid-cols-3"}`}>
              {slots.map((slot) => {
                const custom = images[slot.id];
                const working = busy === slot.id;
                return <article key={slot.id} className="overflow-hidden rounded-2xl border border-[#e4e7ee] bg-white">
                  <div className="relative bg-[#f4eee9]" style={{ aspectRatio: `${slot.ratio[0]} / ${slot.ratio[1]}` }}>
                    {custom || !slot.crop
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={custom || slot.fallback} alt={slot.label} className="h-full w-full object-cover" />
                      : <div role="img" aria-label={slot.label} className="h-full w-full" style={cropStyle(slot)} />}
                    {working && <div className="absolute inset-0 flex items-center justify-center bg-white/70"><Spinner size={26} className="text-[#ee5264]" /></div>}
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3"><h3 className="min-w-0 text-sm font-black">{slot.label}</h3><span className="shrink-0 whitespace-nowrap"><StatusBadge tone={custom ? "green" : "slate"}>{custom ? "Custom image" : "Built-in image"}</StatusBadge></span></div>
                    <p className="mt-1 text-[11px] font-bold text-[#9297a4]">Recommended: {slot.size}</p>
                    <div className="mt-4 flex items-center gap-4">
                      <button type="button" disabled={working} onClick={() => pick(slot)} className="inline-flex items-center gap-2 rounded-full bg-[#182443] px-4 py-2.5 text-xs font-black text-white disabled:cursor-wait disabled:opacity-60"><Icon name={custom ? "edit" : "plus"} size={14} />{custom ? "Change image" : "Add image"}</button>
                      {custom && <button type="button" disabled={working} onClick={() => void remove(slot)} className="inline-flex items-center gap-1.5 text-xs font-black text-[#c94758] disabled:cursor-wait disabled:opacity-50"><Icon name="trash" size={14} />Remove</button>}
                    </div>
                  </div>
                </article>;
              })}
            </div>
          </section>;
        })}
      </>}
    {toast && <Toast message={toast} onClose={() => setToast("")} />}</AdminShell>;
}
