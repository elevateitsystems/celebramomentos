"use client";

// Discount code field of the cart. A code is only applied after the server has said it is
// valid for this cart (lib/server/discounts.ts); what it takes off is shown from the
// server's answer. An applied code can be removed, and one that stops being valid (expired,
// used up, cart changed) is flagged with the reason.
import { useRef, useState } from "react";
import { LoadingButton } from "@/components/loading-button";
import { checkDiscountCode, type DiscountQuote } from "@/lib/cart-quote";
import type { CartItem } from "@/lib/store";

export function DiscountBox({ items, appliedCode, verdict, onApply, onRemove }: { items: CartItem[]; appliedCode: string; verdict: DiscountQuote | null; onApply: (code: string) => void; onRemove: () => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);

  const apply = async () => {
    const code = text.trim();
    // Enter key and button can fire together: the ref closes the gap before the state re-renders.
    if (!code || busy || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await checkDiscountCode(items, code);
      if (result.valid) { onApply(result.code); setText(""); } else setError(result.message);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No hemos podido comprobar el código. Inténtalo de nuevo.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  if (appliedCode) {
    const invalid = verdict && !verdict.valid ? verdict : null;
    return <div className="mt-6">
      <div className={`flex items-start justify-between gap-3 rounded-xl px-3 py-2.5 text-xs font-bold ${invalid ? "bg-[#c94758]/25 text-white" : "bg-[#24714b]/25 text-[#bde9cc]"}`}>
        <span role={invalid ? "alert" : "status"}>{invalid ? <>El código <b>{appliedCode}</b> no se puede usar: {invalid.message}</> : verdict ? <>Código <b>{appliedCode}</b> aplicado.</> : <>Comprobando el código <b>{appliedCode}</b>…</>}</span>
        <button type="button" onClick={onRemove} className="shrink-0 underline underline-offset-2 hover:text-white">Quitar</button>
      </div>
    </div>;
  }

  return <form className="mt-6" onSubmit={(event) => { event.preventDefault(); void apply(); }}>
    <div className="flex gap-2">
      <input value={text} onChange={(event) => { setText(event.target.value); setError(""); }} placeholder="Código de descuento" aria-label="Código de descuento" aria-invalid={Boolean(error)} autoComplete="off" autoCapitalize="characters" maxLength={60} className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-xs text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#f8c75e]" />
      <LoadingButton type="submit" loading={busy} disabled={!text.trim()} spinnerSize={14} className="rounded-xl bg-white/10 px-3 text-xs font-black hover:bg-white/20 disabled:opacity-50">Aplicar</LoadingButton>
    </div>
    {error && <p role="alert" className="mt-2 text-xs font-bold text-[#ffb4bd]">{error}</p>}
  </form>;
}
