"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { Icon } from "@/components/icons";
import { BrandLoader } from "@/components/loading";
import { SiteFooter, SiteHeader } from "@/components/site";
import { clearCartItems } from "@/lib/store";

type State = "loading" | "paid" | "pending" | "failed" | "cancelled" | "declined" | "not_approved" | "error";

export default function PayPalReturnPage() {
  const [state, setState] = useState<State>("loading");
  const [orderNumber, setOrderNumber] = useState("");
  const [message, setMessage] = useState("");
  const [retryUrl, setRetryUrl] = useState<string | null>(null);
  const dispatch = useDispatch();
  const started = useRef(false);

  useEffect(() => {
    // Guard against React strict-mode double effects; the server is idempotent anyway.
    if (started.current) return;
    started.current = true;
    const paypalOrderId = new URLSearchParams(window.location.search).get("token");
    if (!paypalOrderId) { setState("error"); return; }
    fetch("/api/checkout/paypal/capture", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paypalOrderId }) })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "No se pudo confirmar el pago");
        setOrderNumber(body.order?.id || "");
        setMessage(body.message || "");
        setRetryUrl(body.approvalUrl || null);
        if (body.status === "paid") dispatch(clearCartItems());
        setState(body.status as State);
      })
      .catch((reason) => { setMessage(reason instanceof Error ? reason.message : ""); setState("error"); });
  }, [dispatch]);

  if (state === "loading") return <><SiteHeader /><main className="flex min-h-[68vh] items-center justify-center bg-[#fffaf5] px-5 py-20"><BrandLoader label="Confirmando tu pago con PayPal…" /></main><SiteFooter /></>;

  const view = state === "paid"
    ? { tone: "bg-[#e8f5ed] text-[#24714b]", icon: "check", eyebrow: "PAGO CONFIRMADO", title: "Tu momento está en camino.", body: <>Tu pedido {orderNumber && <strong>{orderNumber}</strong>} se ha pagado con PayPal y se ha guardado correctamente.</> }
    : state === "pending"
      ? { tone: "bg-[#fff4d7] text-[#896816]", icon: "spark", eyebrow: "PAGO EN REVISIÓN", title: "Pago pendiente", body: message || "PayPal todavía no ha confirmado el pago. Tu pedido no se marcará como pagado hasta recibir la confirmación." }
      : state === "declined"
        ? { tone: "bg-[#fff0e8] text-[#c94758]", icon: "close", eyebrow: "PAGO RECHAZADO", title: "PayPal ha rechazado el método de pago", body: "No se ha realizado ningún cargo. Puedes volver a PayPal y elegir otro método de pago." }
        : state === "not_approved"
          ? { tone: "bg-[#fff4d7] text-[#896816]", icon: "spark", eyebrow: "PAGO SIN APROBAR", title: "Aún no has aprobado el pago", body: "Vuelve a PayPal para aprobar el pago o regresa al checkout." }
          : state === "cancelled"
            ? { tone: "bg-[#fff0e8] text-[#c94758]", icon: "close", eyebrow: "PAGO CANCELADO", title: "El pago se ha cancelado", body: "No se ha realizado ningún cargo. Tu cesta sigue guardada para cuando quieras volver a intentarlo." }
            : { tone: "bg-[#fff0e8] text-[#c94758]", icon: "close", eyebrow: "ERROR", title: "No pudimos confirmar el pago", body: message || "No se ha realizado ningún cargo. Vuelve al checkout para intentarlo de nuevo." };

  return <><SiteHeader /><main className="flex min-h-[68vh] items-center justify-center bg-[#fffaf5] px-5 py-20"><div className="max-w-[560px] text-center"><div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${view.tone}`}><Icon name={view.icon} size={28} /></div><p className="mt-7 text-[10px] font-black tracking-[.2em] text-[#ee5264]">{view.eyebrow}</p><h1 className="serif mt-3 text-4xl font-bold sm:text-5xl">{view.title}</h1><p className="mt-5 text-sm leading-7 text-[#737b90]">{view.body}</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">{state === "paid" || state === "pending" ? <Link href="/account" className="rounded-full bg-[#ee5264] px-6 py-3.5 text-sm font-black text-white">Ver mi cuenta</Link> : retryUrl ? <a href={retryUrl} className="rounded-full bg-[#ee5264] px-6 py-3.5 text-sm font-black text-white">Volver a PayPal</a> : <Link href="/checkout" className="rounded-full bg-[#ee5264] px-6 py-3.5 text-sm font-black text-white">Volver al checkout</Link>}<Link href="/" className="rounded-full border border-[#dfd3cc] bg-white px-6 py-3.5 text-sm font-black">Volver al inicio</Link></div></div></main><SiteFooter /></>;
}
