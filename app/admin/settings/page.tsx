"use client";

import { useEffect, useState } from "react";
import { AdminPageHeader, AdminShell } from "@/components/admin";
import { BrandLoader } from "@/components/loading";
import { Spinner, Toast } from "@/components/site";
import { DEFAULT_WALL_ART_PRICES, SOCIAL_LINK_DEFAULTS, SOCIAL_LINK_KEYS, WALL_ART_SIZES, type SocialLinkKey, type WallArtSizeId } from "@/lib/data";
import { invalidatePublicSettings } from "@/lib/public-settings";

type Setting = { key: string; value: string };
const WALL_ART_PRICES_KEY = "wall_art_prices";
const socialLabels: Record<SocialLinkKey, string> = { social_facebook: "Facebook page", social_instagram: "Instagram profile", social_google_business: "Google Business profile (reviews)" };
const centsToInput = (cents: number) => (cents / 100).toFixed(2);

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({ store_name: "Celebra Momentos", support_email: "celebramomentos@outlook.com", announcement: "Envío gratis en pedidos de 35€ o más", ...SOCIAL_LINK_DEFAULTS });
  const [wallArtPrices, setWallArtPrices] = useState<Record<WallArtSizeId, string>>(() => Object.fromEntries(WALL_ART_SIZES.map((size) => [size.id, centsToInput(DEFAULT_WALL_ART_PRICES[size.id])])) as Record<WallArtSizeId, string>);
  const [notifications, setNotifications] = useState(true);
  const [maintenance, setMaintenance] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Unable to load settings");
        const stored = Object.fromEntries((body.settings as Setting[]).map((item) => [item.key, item.value]));
        setSettings((current) => ({ ...current, ...stored }));
        if (stored.admin_notifications !== undefined) setNotifications(stored.admin_notifications === "true");
        if (stored.maintenance_mode !== undefined) setMaintenance(stored.maintenance_mode === "true");
        if (stored[WALL_ART_PRICES_KEY]) {
          try {
            const prices = JSON.parse(stored[WALL_ART_PRICES_KEY]) as Record<string, number>;
            setWallArtPrices((current) => ({ ...current, ...Object.fromEntries(Object.entries(prices).filter(([key]) => key in current).map(([key, cents]) => [key, centsToInput(cents)])) }));
          } catch { /* keep defaults for an unreadable value */ }
        }
      })
      .catch((reason) => setLoadError(reason instanceof Error ? reason.message : "Unable to load settings"))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    const priceCents: Record<string, number> = {};
    for (const size of WALL_ART_SIZES) {
      const value = Number(wallArtPrices[size.id].replace(",", "."));
      if (!Number.isFinite(value) || value < 0) { setToast(`Enter a valid price for ${size.label}`); return; }
      priceCents[size.id] = Math.round(value * 100);
    }
    setSaving(true);
    try {
      const entries = { ...settings, [WALL_ART_PRICES_KEY]: JSON.stringify(priceCents), admin_notifications: String(notifications), maintenance_mode: String(maintenance) };
      for (const [key, value] of Object.entries(entries)) {
        if (key === "id") continue;
        const response = await fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, value }) });
        if (!response.ok) { const body = await response.json(); throw new Error(`${key}: ${body.error || "Unable to save settings"}`); }
      }
      invalidatePublicSettings();
      setToast("Settings saved to the database");
    } catch (reason) {
      setToast(reason instanceof Error ? reason.message : "Unable to save settings");
    } finally { setSaving(false); }
  };

  return <AdminShell><AdminPageHeader eyebrow="WORKSPACE" title="Settings" body="Storefront settings persisted in the database." />{loading ? <section className="mt-8 max-w-[860px] rounded-2xl border border-[#e4e7ee] bg-white"><BrandLoader label="Loading settings…" /></section> : loadError ? <p role="alert" className="mt-8 max-w-[860px] rounded-2xl border border-[#f3c6c2] bg-[#fff0e8] p-4 text-sm font-bold text-[#c94758]">{loadError}</p> : <div className="mt-8 grid max-w-[860px] gap-6">
    <section className="rounded-2xl border border-[#e4e7ee] bg-white p-6 sm:p-8"><h2 className="text-lg font-black">Storefront settings</h2><label className="mt-6 block text-sm font-black">Store name<input value={settings.store_name || ""} onChange={(event) => setSettings({ ...settings, store_name: event.target.value })} className="field" /></label><label className="mt-4 block text-sm font-black">Support email<input type="email" value={settings.support_email || ""} onChange={(event) => setSettings({ ...settings, support_email: event.target.value })} className="field" /></label><label className="mt-4 block text-sm font-black">Announcement bar<input value={settings.announcement || ""} onChange={(event) => setSettings({ ...settings, announcement: event.target.value })} className="field" /></label></section>
    <section className="rounded-2xl border border-[#e4e7ee] bg-white p-6 sm:p-8"><h2 className="text-lg font-black">Social media</h2><p className="mt-1 text-sm text-[#737b90]">Shown as icons in the storefront footer. Use full https:// links; leave a field empty to hide that icon.</p>{SOCIAL_LINK_KEYS.map((key) => <label key={key} className="mt-4 block text-sm font-black">{socialLabels[key]}<input type="url" inputMode="url" placeholder="https://" value={settings[key] ?? ""} onChange={(event) => setSettings({ ...settings, [key]: event.target.value })} className="field" /></label>)}</section>
    <section className="rounded-2xl border border-[#e4e7ee] bg-white p-6 sm:p-8"><h2 className="text-lg font-black">Wall Art prices</h2><p className="mt-1 text-sm text-[#737b90]">One framed product; customers only choose the size. Prices in euros, charged at checkout.</p><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{WALL_ART_SIZES.map((size) => <label key={size.id} className="block text-sm font-black">{size.label} <span className="font-semibold text-[#9297a4]">· {size.dimensions}</span><input inputMode="decimal" value={wallArtPrices[size.id]} onChange={(event) => setWallArtPrices({ ...wallArtPrices, [size.id]: event.target.value })} className="field" /></label>)}</div></section>
    <section className="rounded-2xl border border-[#e4e7ee] bg-white p-6 sm:p-8"><h2 className="text-lg font-black">Preferences</h2><label className="mt-5 flex items-center justify-between gap-4 text-sm font-black">Admin notifications<input type="checkbox" checked={notifications} onChange={(event) => setNotifications(event.target.checked)} /></label><label className="mt-5 flex items-center justify-between gap-4 text-sm font-black">Maintenance mode<input type="checkbox" checked={maintenance} onChange={(event) => setMaintenance(event.target.checked)} /></label><button disabled={saving} onClick={() => void save()} className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#182443] px-5 py-3 text-sm font-black text-white disabled:opacity-60">{saving && <Spinner size={14} />}{saving ? "Saving…" : "Save settings"}</button></section>
  </div>}{toast && <Toast message={toast} onClose={() => setToast("")} />}</AdminShell>;
}
