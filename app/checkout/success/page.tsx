"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { Icon } from "@/components/icons";
import { SiteFooter, SiteHeader } from "@/components/site";
import { clearCartItems } from "@/lib/store";

export default function CheckoutSuccessPage() {
  const [state, setState] = useState<"loading" | "paid" | "pending" | "error">("loading");
  const [orderNumber, setOrderNumber] = useState("");
  const dispatch = useDispatch();

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get("session_id");
    if (!sessionId) { setState("error"); return; }
    fetch("/api/checkout/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId }) })
      .then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error || "Unable to confirm payment"); setOrderNumber(body.order?.id || ""); if (body.paid) dispatch(clearCartItems()); setState(body.paid ? "paid" : "pending"); })
      .catch(() => setState("error"));
  }, [dispatch]);

  if (state === "loading") return <><SiteHeader /><main className="min-h-[68vh] bg-[#fffaf5]" /><SiteFooter /></>;

  return <><SiteHeader /><main className="flex min-h-[68vh] items-center justify-center bg-[#fffaf5] px-5 py-20"><div className="max-w-[560px] text-center">{state === "paid" ? <><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#e8f5ed] text-[#24714b]"><Icon name="check" size={28} /></div><p className="mt-7 text-[10px] font-black tracking-[.2em] text-[#ee5264]">PAGO CONFIRMADO</p><h1 className="serif mt-3 text-5xl font-bold">Tu momento está en camino.</h1><p className="mt-5 text-sm leading-7 text-[#737b90]">Tu pedido {orderNumber && <strong>{orderNumber}</strong>} se ha guardado correctamente.</p></> : state === "pending" ? <><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#fff4d7] text-[#896816]"><Icon name="spark" size={28} /></div><h1 className="serif mt-7 text-4xl font-bold">Pago pendiente</h1><p className="mt-4 text-sm leading-7 text-[#737b90]">Stripe todavía no ha confirmado el pago. Tu pedido no se marcará como pagado hasta recibir la confirmación.</p></> : <><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#fff0e8] text-[#c94758]"><Icon name="close" size={28} /></div><h1 className="serif mt-7 text-4xl font-bold">No pudimos confirmar el pago</h1><p className="mt-4 text-sm leading-7 text-[#737b90]">Revisa tu cuenta o vuelve a intentarlo con una tarjeta de prueba de Stripe.</p></>}<div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/account" className="rounded-full bg-[#ee5264] px-6 py-3.5 text-sm font-black text-white">Ver mi cuenta</Link><Link href="/" className="rounded-full border border-[#dfd3cc] bg-white px-6 py-3.5 text-sm font-black">Volver al inicio</Link></div></div></main><SiteFooter />;</>;
}
