"use client";

import { useEffect, useState } from "react";
import { AdminPageHeader, AdminShell } from "@/components/admin";
import { BrandLoader } from "@/components/loading";
import { Spinner, Toast } from "@/components/site";
import { CARD_SIZES, DEFAULT_CARD_SIZE_PRICES, SOCIAL_LINK_DEFAULTS, SOCIAL_LINK_KEYS, type CardSize, type SocialLinkKey } from "@/lib/data";
import { invalidatePublicSettings } from "@/lib/public-settings";
import { DEFAULT_DELIVERY_RATES, type DeliveryRates } from "@/lib/shipping";

type Setting = { key: string; value: string };
type RateDraft = { price: string; freeFrom: string };
const CARD_SIZE_PRICES_KEY = "card_size_prices";
const DELIVERY_LABELS = { standard: "Standard delivery (Entrega normal)", express: "Express delivery (Entrega express)" } as const;
const socialLabels: Record<SocialLinkKey, string> = { social_facebook: "Facebook page", social_instagram: "Instagram profile", social_google_business: "Google Business profile (reviews)" };
const centsToInput = (cents: number) => (cents / 100).toFixed(2);
// Returns cents, or null for an invalid amount.
const toCents = (value: string) => { const amount = Number(value.trim().replace(",", ".")); return value.trim() !== "" && Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : null; };
const toRateDrafts = (rates: DeliveryRates) => ({
  standard: { price: centsToInput(rates.standard.priceCents), freeFrom: rates.standard.freeFromCents === null ? "" : centsToInput(rates.standard.freeFromCents) },
  express: { price: centsToInput(rates.express.priceCents), freeFrom: rates.express.freeFromCents === null ? "" : centsToInput(rates.express.freeFromCents) },
});

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({ store_name: "Celebra Momentos", support_email: "celebramomentos@outlook.com", announcement: "Envío gratis en pedidos de 35€ o más", ...SOCIAL_LINK_DEFAULTS });
  const [cardSizePrices, setCardSizePrices] = useState<Record<CardSize, string>>(() => Object.fromEntries(CARD_SIZES.map((size) => [size.id, centsToInput(DEFAULT_CARD_SIZE_PRICES[size.id])])) as Record<CardSize, string>);
  const [delivery, setDelivery] = useState<Record<keyof DeliveryRates, RateDraft>>(() => toRateDrafts(DEFAULT_DELIVERY_RATES));
  const [notifications, setNotifications] = useState(true);
  const [maintenance, setMaintenance] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([fetch("/api/admin/settings", { cache: "no-store" }), fetch("/api/admin/shipping", { cache: "no-store" })])
      .then(async ([response, shippingResponse]) => {
        const shipping = await shippingResponse.json();
        if (!shippingResponse.ok) throw new Error(shipping.error || "Unable to load delivery rates");
        setDelivery(toRateDrafts(shipping.delivery));
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Unable to load settings");
        const stored = Object.fromEntries((body.settings as Setting[]).map((item) => [item.key, item.value]));
        setSettings((current) => ({ ...current, ...stored }));
        if (stored.admin_notifications !== undefined) setNotifications(stored.admin_notifications === "true");
        if (stored.maintenance_mode !== undefined) setMaintenance(stored.maintenance_mode === "true");
        if (stored[CARD_SIZE_PRICES_KEY]) {
          try {
            const prices = JSON.parse(stored[CARD_SIZE_PRICES_KEY]) as Record<string, number>;
            setCardSizePrices((current) => ({ ...current, ...Object.fromEntries(Object.entries(prices).filter(([key]) => key in current).map(([key, cents]) => [key, centsToInput(cents)])) }));
          } catch { /* keep defaults for an unreadable value */ }
        }
      })
      .catch((reason) => setLoadError(reason instanceof Error ? reason.message : "Unable to load settings"))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    const priceCents: Record<string, number> = {};
    for (const size of CARD_SIZES) {
      const cents = toCents(cardSizePrices[size.id]);
      if (cents === null) { setToast(`Enter a valid price for the ${size.label} card size`); return; }
      priceCents[size.id] = cents;
    }
    const rates = {} as DeliveryRates;
    for (const method of ["standard", "express"] as const) {
      const price = toCents(delivery[method].price);
      const freeFrom = delivery[method].freeFrom.trim() === "" ? null : toCents(delivery[method].freeFrom);
      if (price === null || freeFrom === undefined || (delivery[method].freeFrom.trim() !== "" && freeFrom === null)) { setToast(`Enter valid prices for ${DELIVERY_LABELS[method]}`); return; }
      rates[method] = { priceCents: price, freeFromCents: freeFrom };
    }
    setSaving(true);
    try {
      const shippingResponse = await fetch("/api/admin/shipping", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(rates) });
      if (!shippingResponse.ok) { const body = await shippingResponse.json(); throw new Error(`Delivery rates: ${body.error || "Unable to save"}`); }
      const entries = { ...settings, [CARD_SIZE_PRICES_KEY]: JSON.stringify(priceCents), admin_notifications: String(notifications), maintenance_mode: String(maintenance) };
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
    <section className="rounded-2xl border border-[#e4e7ee] bg-white p-6 sm:p-8"><h2 className="text-lg font-black">Delivery rates</h2><p className="mt-1 text-sm text-[#737b90]">Prices in euros, used by the cart, checkout and payment. Leave &ldquo;Free from&rdquo; empty if that method is never free.</p><div className="mt-5 grid gap-5 sm:grid-cols-2">{(["standard", "express"] as const).map((method) => <div key={method} className="rounded-xl border border-[#eef0f4] p-4"><p className="text-sm font-black">{DELIVERY_LABELS[method]}</p><label className="mt-3 block text-xs font-black text-[#59627b]">Price (€)<input inputMode="decimal" value={delivery[method].price} onChange={(event) => setDelivery({ ...delivery, [method]: { ...delivery[method], price: event.target.value } })} className="field" /></label><label className="mt-3 block text-xs font-black text-[#59627b]">Free from (€ of products)<input inputMode="decimal" placeholder="Never free" value={delivery[method].freeFrom} onChange={(event) => setDelivery({ ...delivery, [method]: { ...delivery[method], freeFrom: event.target.value } })} className="field" /></label></div>)}</div></section>
    <section className="rounded-2xl border border-[#e4e7ee] bg-white p-6 sm:p-8"><h2 className="text-lg font-black">Card sizes (Prodigi)</h2><p className="mt-1 text-sm text-[#737b90]">Amount added to the card template price for each size. Use 0 for no extra charge. Template prices are edited in Templates.</p><div className="mt-5 grid gap-4 sm:grid-cols-2">{CARD_SIZES.map((size) => <label key={size.id} className="block text-sm font-black">{size.label} <span className="font-semibold text-[#9297a4]">· {size.dimensions} · {size.sku}</span><input inputMode="decimal" value={cardSizePrices[size.id]} onChange={(event) => setCardSizePrices({ ...cardSizePrices, [size.id]: event.target.value })} className="field" /></label>)}</div></section>
    <section className="rounded-2xl border border-[#e4e7ee] bg-white p-6 sm:p-8"><h2 className="text-lg font-black">Preferences</h2><label className="mt-5 flex items-center justify-between gap-4 text-sm font-black">Admin notifications<input type="checkbox" checked={notifications} onChange={(event) => setNotifications(event.target.checked)} /></label><label className="mt-5 flex items-center justify-between gap-4 text-sm font-black">Maintenance mode<input type="checkbox" checked={maintenance} onChange={(event) => setMaintenance(event.target.checked)} /></label><button disabled={saving} onClick={() => void save()} className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#182443] px-5 py-3 text-sm font-black text-white disabled:opacity-60">{saving && <Spinner size={14} />}{saving ? "Saving…" : "Save settings"}</button></section>
  </div>}{toast && <Toast message={toast} onClose={() => setToast("")} />}</AdminShell>;
}
