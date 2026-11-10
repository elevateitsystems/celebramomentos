"use client";

// Orders. Statuses are read-only here: the payment status comes from Stripe / PayPal and the
// fulfilment status from the print shops (webhooks, scheduled checks and a refresh when this page
// loads). The only manual action is deleting an order, after a confirmation.
import { useEffect, useState } from "react";
import { AdminPageHeader, AdminShell } from "@/components/admin";
import { BrandLoader } from "@/components/loading";
import { Price, StatusBadge, Toast } from "@/components/site";
import { LoadingButton } from "@/components/loading-button";

type Fulfillment = { provider: string; mode: string; status: string; providerStatus: string | null; carrier: string | null; trackingNumber: string | null; trackingUrl: string | null; lastSyncedAt: string | null };
type Order = {
  id: string; dbId: string; email: string; amount: number; date: string; status: string; orderStatus: string; item: string; shipping: { name: string };
  payment?: { provider: string; status: string } | null;
  fulfillments?: Fulfillment[];
};

const ORDER_LABEL: Record<string, string> = { PENDING: "Awaiting payment", PAID: "Paid", PROCESSING: "In production", SHIPPED: "Shipped", DELIVERED: "Delivered", CANCELLED: "Cancelled", REFUNDED: "Refunded" };
const PAYMENT_LABEL: Record<string, string> = { PENDING: "Pending", SUCCEEDED: "Paid", FAILED: "Failed", CANCELLED: "Cancelled", REFUNDED: "Refunded" };
const FULFILLMENT_LABEL: Record<string, string> = { NEEDS_ATTENTION: "Needs attention", READY: "Ready to send", SUBMITTING: "Sending", SUBMITTED: "Sent", IN_PRODUCTION: "In production", SHIPPED: "Shipped", DELIVERED: "Delivered", CANCELLED: "Cancelled", FAILED: "Failed (retrying)" };
const PROVIDER_LABEL: Record<string, string> = { PRODIGI: "Prodigi", GELATO: "Gelato", PRINTFUL: "Printful", PRINTEERS: "Printeers", ALERIO_PRINT: "AlerioPrint" };
const tone = (status: string) => (["DELIVERED", "SHIPPED", "SUCCEEDED", "PAID"].includes(status) ? "green" : ["CANCELLED", "REFUNDED", "FAILED"].includes(status) ? "rose" : "amber") as "green" | "rose" | "amber";
const when = (value: string | null) => (value ? new Date(value).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "not yet");

export default function AdminOrdersPage() {
  const [loaded, setLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selected, setSelected] = useState<Order | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [toast, setToast] = useState("");

  const load = async () => {
    const response = await fetch("/api/admin/orders", { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Unable to load orders");
    setOrders(body.orders || []);
  };
  useEffect(() => { void load().catch((reason) => { setToast(reason instanceof Error ? reason.message : "Unable to load orders"); setLoadFailed(true); }).finally(() => setLoaded(true)); }, []);

  const remove = async () => {
    if (!selected) return;
    const response = await fetch(`/api/admin/orders?id=${selected.dbId}`, { method: "DELETE" });
    if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.error || "Unable to delete order"); }
    setConfirming(false);
    setSelected(null);
    await load();
    setToast("Order deleted");
  };

  return <AdminShell>
    <AdminPageHeader eyebrow="COMMERCE" title="Orders" body="Payment status comes from Stripe / PayPal and print status from the print shops, automatically. Orders can only be deleted." action={<span className="rounded-full bg-[#e8f5ed] px-4 py-3 text-xs font-black text-[#24714b]">{orders.length} orders</span>} />
    <section className="mt-8 overflow-hidden rounded-2xl border border-[#e4e7ee] bg-white">
      {!loaded ? <BrandLoader compact label="Loading orders…" />
        : loadFailed ? <div role="alert" className="p-12 text-center"><p className="font-black text-[#c94758]">Unable to load orders</p></div>
        : orders.length === 0 ? <div className="p-12 text-center"><p className="font-black">No orders yet</p></div>
        : <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left">
          <thead><tr className="border-b border-[#e4e7ee] bg-[#fafbfc] text-[10px] uppercase tracking-[.14em] text-[#9297a4]"><th className="px-5 py-3">Order</th><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Total</th><th className="px-5 py-3">Order</th><th className="px-5 py-3">Payment</th><th className="px-5 py-3">Print</th><th className="px-5 py-3 text-right">Actions</th></tr></thead>
          <tbody>{orders.map((order) => <tr key={order.dbId} className="border-b border-[#eef0f4] text-sm">
            <td className="px-5 py-4 font-black">{order.id}</td>
            <td className="px-5 py-4"><p className="font-bold">{order.shipping.name}</p><p className="text-xs text-[#737b90]">{order.email}</p></td>
            <td className="px-5 py-4 font-black"><Price value={order.amount} /></td>
            <td className="px-5 py-4"><StatusBadge tone={tone(order.orderStatus)}>{ORDER_LABEL[order.orderStatus] || order.orderStatus}</StatusBadge></td>
            <td className="px-5 py-4 text-xs">{order.payment ? <StatusBadge tone={tone(order.payment.status)}>{PAYMENT_LABEL[order.payment.status] || order.payment.status}</StatusBadge> : "—"}</td>
            <td className="px-5 py-4 text-xs">{order.fulfillments?.length ? order.fulfillments.map((item) => <span key={item.provider} className="block">{PROVIDER_LABEL[item.provider] || item.provider}: <b>{FULFILLMENT_LABEL[item.status] || item.status}</b></span>) : <span className="text-[#9297a4]">—</span>}</td>
            <td className="px-5 py-4 text-right"><button onClick={() => setSelected(order)} className="text-xs font-black text-[#ee5264]">View</button></td>
          </tr>)}</tbody>
        </table></div>}
    </section>

    {selected && <div className="fixed inset-0 z-50">
      <button className="absolute inset-0 bg-[#182443]/25" onClick={() => { setSelected(null); setConfirming(false); }} aria-label="Close" />
      <aside className="absolute bottom-0 right-0 top-0 w-full max-w-[460px] overflow-y-auto bg-white p-6 shadow-2xl sm:p-8">
        <button onClick={() => { setSelected(null); setConfirming(false); }} className="float-right text-xs font-black text-[#737b90]">Close</button>
        <p className="pt-8 text-[10px] font-black tracking-widest text-[#ee5264]">ORDER DETAIL</p>
        <h2 className="mt-2 break-all text-2xl font-black">{selected.id}</h2>
        <p className="mt-2 text-sm text-[#737b90]">{selected.email}</p>
        <p className="mt-1 text-sm text-[#737b90]">{selected.item}</p>
        <p className="mt-5 font-black"><Price value={selected.amount} /></p>

        <dl className="mt-6 grid grid-cols-[110px_1fr] gap-x-3 gap-y-2 text-xs">
          <dt className="font-black text-[#9297a4]">Order</dt><dd><StatusBadge tone={tone(selected.orderStatus)}>{ORDER_LABEL[selected.orderStatus] || selected.orderStatus}</StatusBadge></dd>
          <dt className="font-black text-[#9297a4]">Payment</dt><dd>{selected.payment ? <><StatusBadge tone={tone(selected.payment.status)}>{PAYMENT_LABEL[selected.payment.status] || selected.payment.status}</StatusBadge> <span className="text-[#737b90]">via {selected.payment.provider === "paypal" ? "PayPal" : "Stripe"}</span></> : "—"}</dd>
        </dl>

        <h3 className="mt-6 text-sm font-black">Print orders</h3>
        {selected.fulfillments?.length ? selected.fulfillments.map((item) => <div key={item.provider} className="mt-2 rounded-xl border border-[#e4e7ee] p-3 text-xs">
          <p className="flex flex-wrap items-center gap-2 font-black">{PROVIDER_LABEL[item.provider] || item.provider}{item.mode === "draft" && <span className="rounded-full bg-[#fff6e0] px-2 py-0.5 text-[10px] text-[#8a5a00]">TEST</span>}<StatusBadge tone={tone(item.status)}>{FULFILLMENT_LABEL[item.status] || item.status}</StatusBadge></p>
          {item.providerStatus && <p className="mt-1 text-[#737b90]">Print shop says: {item.providerStatus}</p>}
          {(item.trackingNumber || item.trackingUrl) && <p className="mt-1">Tracking{item.carrier ? ` (${item.carrier})` : ""}: {item.trackingUrl ? <a href={item.trackingUrl} target="_blank" rel="noreferrer" className="font-black text-[#ee5264] underline">{item.trackingNumber || "open"}</a> : item.trackingNumber}</p>}
          <p className="mt-1 text-[#9297a4]">Last checked with the print shop: {when(item.lastSyncedAt)}</p>
        </div>) : <p className="mt-2 text-xs text-[#9297a4]">No print order yet (created automatically once the payment is confirmed).</p>}
        <p className="mt-3 text-[11px] text-[#9297a4]">Statuses update automatically and cannot be changed by hand.</p>

        {!confirming
          ? <button onClick={() => setConfirming(true)} className="mt-8 w-full rounded-full border border-[#f3c6c2] px-5 py-3.5 text-sm font-black text-[#c94758]">Delete this order</button>
          : <div role="alertdialog" aria-modal="true" aria-labelledby="delete-order-title" className="mt-8 rounded-2xl border border-[#f3c6c2] bg-[#fff0e8] p-4">
            <p id="delete-order-title" className="text-sm font-black text-[#c94758]">Delete order {selected.id}?</p>
            <p className="mt-1 text-xs leading-5 text-[#59627b]">This permanently removes the order with its items, payment records and print orders from this site. The customer account and the products are kept. A print order already sent to a print shop is <b>not</b> cancelled there.</p>
            <div className="mt-3 flex gap-2">
              <button onClick={() => setConfirming(false)} className="flex-1 rounded-full border border-[#dfd3cc] bg-white px-4 py-2.5 text-xs font-black">Keep order</button>
              <LoadingButton onClick={remove} loadingLabel="Deleting…" errorMessage="Unable to delete the order. Try again." className="flex-1 rounded-full bg-[#c94758] px-4 py-2.5 text-xs font-black text-white disabled:opacity-60">Delete permanently</LoadingButton>
            </div>
          </div>}
      </aside>
    </div>}
    {toast && <Toast message={toast} onClose={() => setToast("")} />}
  </AdminShell>;
}
