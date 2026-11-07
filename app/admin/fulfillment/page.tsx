"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AdminPageHeader, AdminShell } from "@/components/admin";
import { BrandLoader } from "@/components/loading";
import { Price, Spinner, StatusBadge, Toast } from "@/components/site";
import { isPodProvider, podProviderLabel, POD_PROVIDER_LABELS, type PodProvider } from "@/lib/products";
import type { CardCustomization } from "@/lib/store";

type Issue = { code: string; severity: "blocker" | "warning"; message: string };
type Reference = { label: string; side?: string; url: string; width?: number; height?: number };
type Slot = { unit: number; productRef: string | null; area: string; url: string | null; source: "design" | "customer" | "admin" | null; description?: string; width?: number; height?: number; format?: string; fit?: "fill" | "pad" | "aspect" | "original"; original?: string | null; verified?: { width: number; height: number } | null; references?: Reference[] };
type Item = { id: string; name: string; quantity: number; podProductRef: string | null; podArtwork: Slot[]; podIssues: Issue[]; card: CardCustomization | null; kind: string | null; photos: (string | null)[] };
type Fulfillment = {
  id: string; provider: string; status: string; mode: string; reference: string; providerOrderId: string | null; providerStatus: string | null;
  carrier: string | null; trackingNumber: string | null; trackingUrl: string | null; attempts: number; lastError: string | null; nextAttemptAt: string | null;
  submittedAt: string | null; lastSyncedAt: string | null; createdAt: string;
  order: { id: string; number: string; email: string; status: string; totalCents: number; createdAt: string; shippingAddress: Record<string, string> };
  items: Item[];
};
type Data = { config: { mode: "draft" | "live"; autoSubmit: boolean; webhooks: boolean; cron: boolean; providers: Record<PodProvider, string | null> }; counts: Record<string, number>; unprepared: { id: string; number: string; email: string; createdAt: string; totalCents: number }[]; fulfillments: Fulfillment[] };

const STATUS_LABEL: Record<string, string> = { NEEDS_ATTENTION: "Needs attention", READY: "Ready", SUBMITTING: "Sending", SUBMITTED: "Sent", IN_PRODUCTION: "In production", SHIPPED: "Shipped", DELIVERED: "Delivered", CANCELLED: "Cancelled", FAILED: "Failed" };
const STATUS_TONE: Record<string, "green" | "amber" | "rose" | "slate"> = { NEEDS_ATTENTION: "amber", READY: "slate", SUBMITTING: "slate", SUBMITTED: "green", IN_PRODUCTION: "green", SHIPPED: "green", DELIVERED: "green", CANCELLED: "rose", FAILED: "rose" };
const PROVIDERS = Object.keys(POD_PROVIDER_LABELS) as PodProvider[];
const date = (value: string | null) => (value ? new Date(value).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");

export default function AdminFulfillmentPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loadError, setLoadError] = useState("");
  const [provider, setProvider] = useState<PodProvider | "">("");
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState("");
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const params = new URLSearchParams({ ...(provider ? { provider } : {}), ...(status ? { status } : {}), ...(query.trim() ? { q: query.trim() } : {}) });
      const response = await fetch(`/api/admin/pod?${params}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to load print orders");
      setData(body);
    } catch (reason) {
      setLoadError(reason instanceof Error ? reason.message : "Unable to load print orders");
    }
  }, [provider, status, query]);
  useEffect(() => { void load(); }, [load]);

  const act = async (label: string, payload: Record<string, unknown>, success: string) => {
    setBusy(label);
    try {
      const response = await fetch("/api/admin/pod", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json();
      const message = body.result?.message || body.error;
      if (!response.ok) throw new Error(message || "The action failed");
      setToast(success);
      await load();
    } catch (reason) {
      setToast(`Unable to complete: ${reason instanceof Error ? reason.message : "try again"}`);
      await load();
    } finally {
      setBusy("");
    }
  };

  const selected = data?.fulfillments.find((item) => item.id === selectedId) || null;
  const config = data?.config;

  return <AdminShell><AdminPageHeader eyebrow="FULFILMENT" title="Print orders" body="Paid orders split by print shop (Prodigi, Gelato, Printful, Printeers): what was sent, its status and tracking, and anything that needs you." />
    {config && <section className={`mt-6 rounded-2xl border p-4 text-sm ${config.mode === "live" ? "border-[#bfe6cf] bg-[#f3fbf6]" : "border-[#f0dfaa] bg-[#fffbec]"}`}>
      <p className="font-black">{config.mode === "live" ? "Live mode — print orders are real and charged by the print shops." : "Draft mode — nothing is produced or charged: Gelato and Printful orders are drafts, Prodigi uses its sandbox, Printeers uses its test environment."}</p>
      <p className="mt-1 text-xs font-bold text-[#737b90]">Automatic sending after payment: {config.autoSubmit ? "on" : "off"} · Webhooks: {config.webhooks ? "set up" : "POD_WEBHOOK_SECRET missing"} · Daily sync job: {config.cron ? "set up" : "CRON_SECRET missing"}</p>
      <div className="mt-3 flex flex-wrap gap-2">{PROVIDERS.map((name) => <span key={name} title={config.providers[name] || "Ready"} className={`rounded-full px-3 py-1 text-[11px] font-black ${config.providers[name] ? "bg-[#fff0e8] text-[#c94758]" : "bg-[#e8f5ed] text-[#24714b]"}`}>{POD_PROVIDER_LABELS[name]}: {config.providers[name] ? "not available" : "ready"}</span>)}</div>
      {PROVIDERS.filter((name) => config.providers[name]).map((name) => <p key={name} className="mt-1 text-[11px] text-[#737b90]"><b>{POD_PROVIDER_LABELS[name]}</b>: {config.providers[name]}</p>)}
    </section>}

    {data && data.unprepared.length > 0 && <section className="mt-4 rounded-2xl border border-[#e4e7ee] bg-white p-4">
      <p className="text-sm font-black">Paid orders without print orders ({data.unprepared.length})</p>
      <p className="mt-1 text-xs text-[#737b90]">Usually orders from before print-on-demand was set up. Create their print orders only if they were not already made by hand.</p>
      <div className="mt-3 flex flex-wrap gap-2">{data.unprepared.slice(0, 12).map((order) => <button key={order.id} type="button" disabled={Boolean(busy)} onClick={() => { if (window.confirm(`Create print orders for ${order.number}?`)) void act(`prepare-${order.id}`, { action: "prepare", orderId: order.id }, `Print orders created for ${order.number}`); }} className="rounded-full border border-[#dfd3cc] px-3 py-1.5 text-[11px] font-black disabled:opacity-50">{busy === `prepare-${order.id}` ? <Spinner size={12} /> : "+"} {order.number}</button>)}</div>
    </section>}

    <div className="mt-6 flex flex-wrap items-center gap-2">
      <select value={provider} onChange={(event) => setProvider(event.target.value as PodProvider | "")} className="rounded-full border border-[#e4e7ee] bg-white px-3 py-2 text-xs font-black" aria-label="Print shop"><option value="">All print shops</option>{PROVIDERS.map((name) => <option key={name} value={name}>{POD_PROVIDER_LABELS[name]}</option>)}</select>
      {["", ...Object.keys(STATUS_LABEL)].map((value) => <button key={value || "all"} type="button" onClick={() => setStatus(value)} aria-pressed={status === value} className={`rounded-full border px-3 py-2 text-xs font-black ${status === value ? "border-[#182443] bg-[#182443] text-white" : "border-[#e4e7ee] bg-white text-[#59627b]"}`}>{value ? STATUS_LABEL[value] : "All"}{value && data?.counts[value] ? ` ${data.counts[value]}` : ""}</button>)}
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Order number, email or shop id" className="ml-auto min-w-[220px] rounded-full border border-[#e4e7ee] bg-white px-4 py-2 text-xs" aria-label="Search" />
    </div>

    <section className="mt-4 overflow-hidden rounded-2xl border border-[#e4e7ee] bg-white">
      {loadError ? <div role="alert" className="flex items-center justify-between p-6 text-sm font-bold text-[#c94758]"><span>{loadError}</span><button type="button" onClick={() => void load()} className="rounded-full border border-[#dfd3cc] px-4 py-2 text-xs font-black text-[#182443]">Retry</button></div>
        : !data ? <BrandLoader label="Loading print orders…" />
        : !data.fulfillments.length ? <p className="p-10 text-center text-sm font-black text-[#737b90]">No print orders{provider || status || query ? " match these filters" : " yet — they appear here after a payment is verified"}.</p>
        : <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left"><thead><tr className="border-b border-[#e4e7ee] bg-[#fafbfc] text-[10px] uppercase tracking-[.14em] text-[#9297a4]"><th className="px-5 py-3">Order</th><th className="px-5 py-3">Print shop</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Shop order</th><th className="px-5 py-3">Tracking</th><th className="px-5 py-3">Last problem</th></tr></thead>
          <tbody>{data.fulfillments.map((item) => <tr key={item.id} onClick={() => setSelectedId(item.id)} className="cursor-pointer border-b border-[#eef0f4] text-sm hover:bg-[#fafbfc]">
            <td className="px-5 py-4"><span className="block font-black">{item.order.number}</span><span className="block text-[11px] text-[#9297a4]">{item.order.email} · {date(item.order.createdAt)}</span></td>
            <td className="whitespace-nowrap px-5 py-4 font-bold">{podProviderLabel(item.provider)}{item.mode === "draft" && <span className="ml-2 rounded bg-[#fff6e0] px-1.5 py-0.5 text-[10px] font-black text-[#8a5a00]">DRAFT</span>}</td>
            <td className="whitespace-nowrap px-5 py-4"><StatusBadge tone={STATUS_TONE[item.status]}>{STATUS_LABEL[item.status]}</StatusBadge></td>
            <td className="px-5 py-4 text-xs"><span className="block font-bold">{item.providerOrderId || "—"}</span><span className="text-[#9297a4]">{item.providerStatus || ""}</span></td>
            <td className="px-5 py-4 text-xs">{item.trackingUrl ? <a href={item.trackingUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="font-black text-[#ee5264] underline">{item.trackingNumber || "Track"}</a> : item.trackingNumber || "—"}</td>
            <td className="max-w-[260px] truncate px-5 py-4 text-xs text-[#c94758]" title={item.lastError || ""}>{item.lastError || ""}</td>
          </tr>)}</tbody></table></div>}
    </section>
    {selected && <Detail item={selected} mode={config?.mode || "draft"} busy={busy} onClose={() => setSelectedId(null)} act={act} onToast={setToast} />}
    {toast && <Toast message={toast} onClose={() => setToast("")} />}
  </AdminShell>;
}

function Detail({ item, mode, busy, onClose, act, onToast }: { item: Fulfillment; mode: "draft" | "live"; busy: string; onClose: () => void; act: (label: string, payload: Record<string, unknown>, success: string) => Promise<void>; onToast: (message: string) => void }) {
  const issues = item.items.flatMap((line) => line.podIssues);
  const onlyWarnings = issues.length > 0 && issues.every((issue) => issue.severity === "warning");
  const canSend = item.status === "READY" || item.status === "FAILED" || (item.status === "NEEDS_ATTENTION" && onlyWarnings);
  const address = item.order.shippingAddress || {};
  const [tracking, setTracking] = useState({ status: "SHIPPED", carrier: item.carrier || "", trackingNumber: item.trackingNumber || "", trackingUrl: item.trackingUrl || "" });
  const button = (label: string, text: string, payload: Record<string, unknown>, success: string, tone = "bg-[#182443] text-white", confirm?: string) => <button type="button" disabled={Boolean(busy)} onClick={() => { if (confirm && !window.confirm(confirm)) return; void act(label, payload, success); }} className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-black disabled:opacity-50 ${tone}`}>{busy === label && <Spinner size={13} />}{text}</button>;

  return <div className="fixed inset-0 z-50"><button className="absolute inset-0 bg-[#182443]/25" onClick={onClose} aria-label="Close" />
    <section className="absolute bottom-0 right-0 top-0 w-full max-w-[560px] overflow-y-auto bg-white p-6 shadow-2xl sm:p-8">
      <button type="button" onClick={onClose} className="float-right text-xs font-black text-[#737b90]">Close</button>
      <p className="pt-8 text-[10px] font-black tracking-widest text-[#ee5264]">{podProviderLabel(item.provider).toUpperCase()} · {item.mode === "draft" ? "DRAFT" : "LIVE"}</p>
      <h2 className="mt-2 text-2xl font-black">{item.order.number}</h2>
      <div className="mt-3 flex flex-wrap items-center gap-2"><StatusBadge tone={STATUS_TONE[item.status]}>{STATUS_LABEL[item.status]}</StatusBadge><Price value={item.order.totalCents / 100} /><span className="text-xs text-[#737b90]">Order {item.order.status.toLowerCase()}</span></div>
      <dl className="mt-5 grid grid-cols-[130px_1fr] gap-x-3 gap-y-1.5 text-xs">
        <dt className="font-black text-[#9297a4]">Reference</dt><dd className="break-all">{item.reference}</dd>
        <dt className="font-black text-[#9297a4]">Shop order id</dt><dd className="break-all">{item.providerOrderId || "—"} {item.providerStatus && <span className="text-[#9297a4]">({item.providerStatus})</span>}</dd>
        <dt className="font-black text-[#9297a4]">Tracking</dt><dd>{item.trackingUrl ? <a href={item.trackingUrl} target="_blank" rel="noreferrer" className="font-black text-[#ee5264] underline">{item.trackingNumber || item.trackingUrl}</a> : item.trackingNumber || "—"}{item.carrier && ` · ${item.carrier}`}</dd>
        <dt className="font-black text-[#9297a4]">Ship to</dt><dd>{[address.recipient || address.name, address.address, `${address.postalCode || ""} ${address.city || ""}`.trim(), address.country].filter(Boolean).join(", ")}</dd>
        <dt className="font-black text-[#9297a4]">Attempts</dt><dd>{item.attempts}{item.nextAttemptAt && ` · next try ${date(item.nextAttemptAt)}`}</dd>
        <dt className="font-black text-[#9297a4]">Sent / synced</dt><dd>{date(item.submittedAt)} / {date(item.lastSyncedAt)}</dd>
      </dl>
      {item.lastError && <p role="alert" className="mt-4 rounded-xl bg-[#fff0e8] p-3 text-xs font-bold text-[#c94758]">{item.lastError}</p>}

      <div className="mt-5 flex flex-wrap gap-2">
        {canSend && button("send", item.status === "FAILED" ? "Retry now" : onlyWarnings && item.status === "NEEDS_ATTENTION" ? "Send anyway" : "Send to print shop", { action: "submit", id: item.id, allowWarnings: onlyWarnings }, "Sent to the print shop", "bg-[#ee5264] text-white", mode === "live" ? "This creates a real, paid order at the print shop. Continue?" : undefined)}
        {["NEEDS_ATTENTION", "READY", "FAILED"].includes(item.status) && button("recheck", "Check again", { action: "recheck", id: item.id }, "Checked again", "border border-[#dfd3cc] text-[#182443]")}
        {item.providerOrderId && isPodProvider(item.provider) && button("sync", "Refresh status", { action: "sync", id: item.id }, "Status refreshed", "border border-[#dfd3cc] text-[#182443]")}
        {["NEEDS_ATTENTION", "READY", "FAILED"].includes(item.status) && button("cancel", "Cancel print order", { action: "mark", id: item.id, status: "CANCELLED" }, "Print order cancelled", "border border-[#f3c6c2] text-[#c94758]", "Cancel this print order? It will not be sent to the print shop. The customer's order and payment are not changed.")}
        {item.mode === "draft" && item.status === "SUBMITTED" && (item.provider === "GELATO" || item.provider === "PRINTFUL") && button("confirm", "Confirm for production", { action: "confirm", id: item.id }, "Draft confirmed for production", "bg-[#24714b] text-white", "Confirm this draft? The print shop will produce and charge it.")}
      </div>

      <h3 className="mt-7 text-sm font-black">Items</h3>
      {item.items.map((line) => <div key={line.id} className="mt-3 rounded-2xl border border-[#e4e7ee] p-4">
        <p className="text-sm font-black">{line.quantity} × {line.name}</p>
        <p className="mt-0.5 break-all text-[11px] text-[#9297a4]">Shop product: {line.podProductRef || "not mapped"}</p>
        {line.podIssues.map((issue, index) => <p key={index} className={`mt-2 rounded-lg px-2.5 py-1.5 text-[11px] font-bold ${issue.severity === "blocker" ? "bg-[#fff0e8] text-[#c94758]" : "bg-[#fff6e0] text-[#8a5a00]"}`}>{issue.severity === "blocker" ? "Blocks sending: " : "Check: "}{issue.message}</p>)}
        {line.podArtwork.length > 0 && !line.podArtwork.some((slot) => slot.original || slot.references?.length) && <CustomerPhotos item={line} />}
        {line.podArtwork.map((slot, index) => <ArtworkSlot key={index} slot={slot} item={line} editable={["NEEDS_ATTENTION", "READY", "FAILED"].includes(item.status)} busy={busy} act={act} onToast={onToast} />)}
      </div>)}

      {(item.status === "SUBMITTED" || item.status === "IN_PRODUCTION" || item.status === "SHIPPED") && item.providerOrderId && <div className="mt-6 rounded-2xl border border-[#e4e7ee] p-4">
        <p className="text-sm font-black">Update by hand</p>
        <p className="mt-1 text-[11px] text-[#9297a4]">Use only if the print shop status cannot be refreshed.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <select value={tracking.status} onChange={(event) => setTracking({ ...tracking, status: event.target.value })} className="field !mt-0" aria-label="Status">{["SUBMITTED", "IN_PRODUCTION", "SHIPPED", "DELIVERED", "CANCELLED"].map((value) => <option key={value} value={value}>{STATUS_LABEL[value]}</option>)}</select>
          <input value={tracking.carrier} onChange={(event) => setTracking({ ...tracking, carrier: event.target.value })} placeholder="Carrier" className="field !mt-0" aria-label="Carrier" />
          <input value={tracking.trackingNumber} onChange={(event) => setTracking({ ...tracking, trackingNumber: event.target.value })} placeholder="Tracking number" className="field !mt-0" aria-label="Tracking number" />
          <input value={tracking.trackingUrl} onChange={(event) => setTracking({ ...tracking, trackingUrl: event.target.value })} placeholder="https://… tracking link" className="field !mt-0" aria-label="Tracking link" />
        </div>
        <div className="mt-3">{button("mark", "Save status", { action: "mark", id: item.id, status: tracking.status, carrier: tracking.carrier || null, trackingNumber: tracking.trackingNumber || null, trackingUrl: tracking.trackingUrl || null }, "Status saved", "bg-[#182443] text-white")}</div>
      </div>}
    </section></div>;
}

// Small preview of a Cloudinary image (print files can be very large); other links as they are.
function previewUrl(url: string) {
  return url.replace(/^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)/, "$1c_limit,w_480,h_480,f_auto,q_auto/");
}

function Thumb({ url, label, detail }: { url: string; label: string; detail?: string }) {
  const pdf = /\.pdf($|\?)/i.test(url);
  return <a href={url} target="_blank" rel="noreferrer" className="group block min-w-0" title="Open the full file">
    <span className="flex h-36 items-center justify-center overflow-hidden rounded-lg border border-[#e4e7ee] bg-[repeating-conic-gradient(#f3f4f6_0_25%,#fff_0_50%)] bg-[length:16px_16px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {pdf ? <span className="text-xs font-black text-[#59627b]">PDF</span> : <img src={previewUrl(url)} alt={label} className="max-h-full max-w-full object-contain" />}
    </span>
    <span className="mt-1 block font-black text-[#182443] group-hover:text-[#ee5264]">{label}</span>
    {detail && <span className="block text-[#9297a4]">{detail}</span>}
  </a>;
}

const SOURCE_LABEL: Record<string, string> = { design: "rendered from the customer's design", admin: "attached by admin", customer: "link to the customer's photo — not checked" };

function requiredSize(slot: Slot) {
  if (slot.fit === "original") return "the customer's photo as uploaded";
  if (slot.fit === "aspect" && slot.width && slot.height) return `any size in the shape ${slot.width / 10} × ${slot.height / 10} cm, full resolution`;
  if (slot.width && slot.height) return `${slot.width} × ${slot.height} px${slot.format ? ` ${slot.format.toUpperCase()}` : ""}`;
  return null;
}

function ArtworkSlot({ slot, item, editable, busy, act, onToast }: { slot: Slot; item: Item; editable: boolean; busy: string; act: (label: string, payload: Record<string, unknown>, success: string) => Promise<void>; onToast: (message: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [rendering, setRendering] = useState(false);
  const label = `attach-${item.id}-${slot.unit}-${slot.area}`;
  const attach = (value: string) => act(label, { action: "attach", itemId: item.id, unit: slot.unit, area: slot.area, url: value }, "Print file attached");
  const uploadFile = async (file: Blob, name: string, kind: string) => {
    const form = new FormData(); form.append("file", file, name); form.append("kind", kind);
    const response = await fetch("/api/uploads", { method: "POST", body: form });
    const body = await response.json();
    if (!response.ok || !body.asset?.url) throw new Error(body.error || "Upload failed");
    return body.asset.url as string;
  };
  const upload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) { onToast("Unable to upload: files above 10 MB need a link instead"); return; }
    setUploading(true);
    try { await attach(await uploadFile(file, file.name, "PRINT_FILE")); }
    catch (reason) { onToast(`Unable to upload: ${reason instanceof Error ? reason.message : "try again"}`); }
    finally { setUploading(false); }
  };
  // Renders the card pages again from the design saved with the order (same renderer as checkout).
  const renderPages = async () => {
    if (!item.card) return;
    setRendering(true);
    try {
      const { renderCardDesign } = await import("@/components/card-design-export");
      const panels = await renderCardDesign(item.card, "es");
      const pages = await Promise.all(panels.map(async (panel) => ({ side: panel.side, url: await uploadFile(panel.blob, `design-${panel.side}.jpg`, "CUSTOMER_UPLOAD") })));
      await act(`design-${item.id}`, { action: "design", itemId: item.id, pages }, "Card pages rendered from the saved design");
    } catch (reason) {
      onToast(`Unable to render: ${reason instanceof Error ? reason.message : "try again"}`);
    } finally { setRendering(false); }
  };
  const size = requiredSize(slot);
  const checked = slot.verified ? `${slot.verified.width} × ${slot.verified.height} px${slot.width && slot.fit !== "aspect" && slot.verified.width === slot.width && slot.verified.height === slot.height ? " ✓" : ""}` : slot.url ? "size not checked" : undefined;
  return <div className="mt-3 rounded-xl bg-[#fafbfc] p-3 text-[11px]">
    <p className="font-black">Print file{slot.unit ? ` ${slot.unit + 1}` : ""} · {slot.area}</p>
    {size && <p className="mt-0.5 text-[#737b90]">Required by the print shop: {size}</p>}
    {slot.description && <p className="mt-0.5 text-[#737b90]">{slot.description}</p>}
    <div className="mt-2 grid grid-cols-2 gap-3">
      {slot.url ? <Thumb url={slot.url} label="Final print artwork" detail={[SOURCE_LABEL[slot.source || "customer"], checked].filter(Boolean).join(" · ")} /> : <div><span className="flex h-36 items-center justify-center rounded-lg border border-dashed border-[#f3c6c2] bg-white text-center font-black text-[#c94758]">No print file yet</span><span className="mt-1 block font-black">Final print artwork</span></div>}
      {slot.original && <Thumb url={slot.original} label="Customer's original upload" detail="for reference only — not sent" />}
    </div>
    {(slot.references?.length || item.card) && <div className="mt-3">
      <p className="font-black">Customer&apos;s final card design {slot.references?.length ? `(${slot.references.length} pages)` : ""}</p>
      {slot.references?.length ? <div className="mt-2 grid grid-cols-4 gap-2">{slot.references.map((page) => <Thumb key={page.url} url={page.url} label={page.label} detail={page.width ? `${page.width} × ${page.height}` : undefined} />)}</div>
        : <p className="mt-1 text-[#8a5a00]">Not saved at checkout.</p>}
      {editable && item.card && <button type="button" disabled={rendering || Boolean(busy)} onClick={() => void renderPages()} className="mt-2 rounded-full border border-[#dfd3cc] px-3 py-1.5 font-black disabled:opacity-50">{rendering ? "Rendering…" : slot.references?.length ? "Render again from saved design" : "Render from saved design"}</button>}
    </div>}
    {editable && <div className="mt-3 flex flex-wrap items-center gap-2">
      <button type="button" disabled={uploading || Boolean(busy)} onClick={() => fileRef.current?.click()} className="rounded-full bg-[#182443] px-3 py-1.5 font-black text-white disabled:opacity-50">{uploading || busy === label ? "Saving…" : slot.url ? "Replace file" : "Upload file"}</button>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,application/pdf" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void upload(file); }} />
      <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="or paste an https:// link" className="min-w-[180px] flex-1 rounded-full border border-[#e4e7ee] px-3 py-1.5" aria-label="Print file link" />
      <button type="button" disabled={!url.trim() || Boolean(busy)} onClick={() => void attach(url.trim()).then(() => setUrl(""))} className="rounded-full border border-[#dfd3cc] px-3 py-1.5 font-black disabled:opacity-50">Use link</button>
      {slot.source === "admin" && slot.original && <button type="button" disabled={Boolean(busy)} onClick={() => { if (window.confirm("Remove the attached file and render the print file again from the customer's design?")) void act(`reset-${label}`, { action: "reset", itemId: item.id, unit: slot.unit, area: slot.area }, "Print file rendered from the customer's design"); }} className="rounded-full border border-[#dfd3cc] px-3 py-1.5 font-black disabled:opacity-50">Use customer&apos;s design</button>}
    </div>}
  </div>;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// The customer's uploaded photos, for items whose print file is not made from one photo
// (calendars: one photo per month). Reference only: nothing here is sent to the print shop.
function CustomerPhotos({ item }: { item: Item }) {
  const photos = item.photos.map((url, index) => ({ url, index })).filter((photo): photo is { url: string; index: number } => Boolean(photo.url));
  const calendar = item.kind === "CALENDAR";
  return <div className="mt-3 rounded-xl bg-[#fafbfc] p-3 text-[11px]">
    <p className="font-black">Customer&apos;s uploaded photos {calendar ? `(${photos.length} of 12 months)` : `(${photos.length})`}</p>
    {photos.length ? <div className="mt-2 grid grid-cols-3 gap-2">{photos.map((photo) => <Thumb key={photo.index} url={photo.url} label={calendar ? MONTHS[photo.index] || `Month ${photo.index + 1}` : `Photo ${photo.index + 1}`} detail="reference only — not sent" />)}</div>
      : <p className="mt-1 font-bold text-[#c94758]">The customer did not upload any photo.</p>}
    {calendar && photos.length < 12 && photos.length > 0 && <p className="mt-2 text-[#8a5a00]">Only {photos.length} of the 12 months have a photo; the other months will be blank in the calendar unless you fill them.</p>}
  </div>;
}
