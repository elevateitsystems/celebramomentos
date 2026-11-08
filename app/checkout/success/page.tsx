"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { Icon } from "@/components/icons";
import { BrandLoader } from "@/components/loading";
import { SiteFooter, SiteHeader } from "@/components/site";
import { clearCartItems } from "@/lib/store";
import { trackPurchaseOnce } from "@/lib/meta-pixel";

type Outcome = { state: "paid" | "pending" | "error"; orderNumber: string; amount: number };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Asks the server whether Stripe has confirmed the payment. The page only reports success when the
// server answers `paid: true` (it re-reads the session from Stripe and checks the amount). Failures
// that can be momentary (the Stripe webhook updating the same order, a network blip, a slow server)
// are retried while the loader stays on screen, so a failure mark is only ever shown for a
// failure that lasted.
async function confirmPayment(sessionId: string): Promise<Outcome> {
  const attempts = 6;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch("/api/checkout/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId }) });
      const body = await response.json().catch(() => ({}));
      if (response.ok && body.paid) return { state: "paid", orderNumber: body.order?.id || "", amount: Number(body.order?.amount) };
      if (response.ok) {
        // Stripe has not confirmed (yet): look again a couple of times before saying "pending".
        if (attempt >= 2) return { state: "pending", orderNumber: body.order?.id || "", amount: 0 };
      } else if (response.status === 401 || response.status === 400) {
        return { state: "error", orderNumber: "", amount: 0 };
      }
    } catch { /* network error: try again */ }
    if (attempt < attempts - 1) await wait(1000 + attempt * 700);
  }
  return { state: "error", orderNumber: "", amount: 0 };
}

export default function CheckoutSuccessPage() {
  const [state, setState] = useState<"loading" | "paid" | "pending" | "error">("loading");
  const [orderNumber, setOrderNumber] = useState("");
  const dispatch = useDispatch();
  // One verification per visit (React runs effects twice in development; two simultaneous
  // confirmations are what used to make the first one fail), and no updates after leaving the page.
  const started = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const sessionId = new URLSearchParams(window.location.search).get("session_id");
    if (!sessionId) { setState("error"); return; }
    void confirmPayment(sessionId).then((outcome) => {
      if (outcome.state === "paid") {
        dispatch(clearCartItems()); // Server-verified Stripe payment
        trackPurchaseOnce(outcome.orderNumber, outcome.amount);
      }
      if (!mounted.current) return;
      setOrderNumber(outcome.orderNumber);
      setState(outcome.state);
    });
  }, [dispatch]);

  if (state === "loading") return <><SiteHeader /><main className="flex min-h-[68vh] items-center justify-center bg-[#fffaf5] px-5 py-20"><BrandLoader label="Confirmando tu pago…" /></main><SiteFooter /></>;

  return <><SiteHeader /><main className="flex min-h-[68vh] items-center justify-center bg-[#fffaf5] px-5 py-20"><div className="max-w-[560px] text-center">{state === "paid" ? <><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#e8f5ed] text-[#24714b]"><Icon name="check" size={28} /></div><p className="mt-7 text-[10px] font-black tracking-[.2em] text-[#ee5264]">PAGO CONFIRMADO</p><h1 className="serif mt-3 text-5xl font-bold">Tu momento está en camino.</h1><p className="mt-5 text-sm leading-7 text-[#737b90]">Tu pedido {orderNumber && <strong>{orderNumber}</strong>} se ha guardado correctamente.</p></> : state === "pending" ? <><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#fff4d7] text-[#896816]"><Icon name="spark" size={28} /></div><h1 className="serif mt-7 text-4xl font-bold">Pago pendiente</h1><p className="mt-4 text-sm leading-7 text-[#737b90]">Stripe todavía no ha confirmado el pago. Tu pedido no se marcará como pagado hasta recibir la confirmación.</p></> : <><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#fff0e8] text-[#c94758]"><Icon name="close" size={28} /></div><h1 className="serif mt-7 text-4xl font-bold">No pudimos confirmar el pago</h1><p className="mt-4 text-sm leading-7 text-[#737b90]">Si el pago se completó, tu pedido aparecerá en Mi cuenta en unos minutos. Si no, puedes volver a intentarlo.</p></>}<div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/account" className="rounded-full bg-[#ee5264] px-6 py-3.5 text-sm font-black text-white">Ver mi cuenta</Link><Link href="/" className="rounded-full border border-[#dfd3cc] bg-white px-6 py-3.5 text-sm font-black">Volver al inicio</Link></div></div></main><SiteFooter />;</>;
}
