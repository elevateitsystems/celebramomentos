"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { CartItemThumb } from "@/components/cart-item-visual";
import { rememberCheckout } from "@/lib/checkout-tracker";
import { LoadingButton } from "@/components/loading-button";
import { Icon } from "@/components/icons";
import { getSessionUser } from "@/lib/client-session";
import { Price, SiteFooter, SiteHeader, StatusBadge, Toast } from "@/components/site";
import { amountUntilFreeShippingCents, getDeliveryPriceCents, qualifiesForFreeShipping } from "@/lib/shipping";
import { describeProductSelection, getCartItemUnitTotal } from "@/lib/cart";
import { useCartQuote } from "@/lib/cart-quote";
import { trackPixel } from "@/lib/meta-pixel";
import { usePublicSettings } from "@/lib/public-settings";
import { RootState, setDiscountCode, type CardDesign, type CartItem } from "@/lib/store";
import { DELIVERY_METHOD, cardSizeText, templates } from "@/lib/data";

const checkoutSchema = z.object({
  name: z.string().min(2, "Escribe tu nombre"),
  email: z.string().email("Introduce un email válido"),
  phone: z.string().min(7, "Introduce un teléfono válido"),
  recipient: z.string().min(2, "Escribe el nombre del destinatario"),
  address: z.string().min(5, "Introduce una dirección"),
  city: z.string().min(2, "Introduce una ciudad"),
  postalCode: z.string().min(4, "Introduce un código postal"),
  country: z.enum(["ES", "PT"]).default("ES"),
  billingAddress: z.string().optional(),
  payment: z.enum(["card", "paypal"]),
});
// No card fields here: the card is entered on Stripe's secure Checkout page, which validates the
// number (Luhn check and the length of each card network), expiry and CVC. Card data never
// reaches this app.
type CheckoutForm = z.infer<typeof checkoutSchema>;

export default function CheckoutPage() {
  const dispatch = useDispatch();
  const cart = useSelector((state: RootState) => state.cart);
  const language = useSelector((state: RootState) => state.language.language);
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string } | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const items = cart.items;
  const { settings } = usePublicSettings();
  // Same server prices the payment will use; unavailable lines block the payment.
  const quote = useCartQuote(items, cart.discountCode);
  const rows = items.map((item) => {
    const template = templates.find((current) => current.id === item.card.templateId) || templates[0];
    const line = quote.lines?.[item.id];
    return { item, template, unitTotal: line?.unitPriceCents !== undefined ? line.unitPriceCents / 100 : getCartItemUnitTotal(item, template.price, settings.cardSizePrices), error: line?.error };
  });
  const unavailable = rows.some((row) => row.error);
  const merchandiseSubtotal = rows.reduce((sum, row) => sum + (row.error ? 0 : row.unitTotal * row.item.quantity), 0);
  const merchandiseCents = Math.round(merchandiseSubtotal * 100);
  // One delivery option only (see DELIVERY_METHOD); the server charges the same.
  const deliveryMethod = DELIVERY_METHOD;
  const freeShipping = qualifiesForFreeShipping(settings.delivery, deliveryMethod, merchandiseCents);
  const missingForFree = amountUntilFreeShippingCents(settings.delivery, deliveryMethod, merchandiseCents);
  const delivery = getDeliveryPriceCents(settings.delivery, deliveryMethod, merchandiseCents) / 100;
  // The amount comes from the server's verdict on the applied code (lib/server/discounts.ts). The order
  // is priced again from the database, with the code checked again, when the customer pays.
  const verdict = quote.discount;
  const discountValue = verdict?.valid ? Math.min(verdict.discountCents / 100, merchandiseSubtotal + delivery) : 0;
  const discountInvalid = verdict && !verdict.valid ? verdict : null;
  const total = merchandiseSubtotal + delivery - discountValue;
  // One InitiateCheckout per visit to the checkout with a non-empty cart.
  const checkoutTracked = useRef(false);
  useEffect(() => {
    if (checkoutTracked.current || !items.length || total <= 0) return;
    checkoutTracked.current = true;
    trackPixel("InitiateCheckout", { currency: "EUR", value: total, num_items: items.reduce((sum, item) => sum + item.quantity, 0), content_type: "product", content_ids: items.map((item) => item.product?.productId || item.productId || item.card.templateId) });
  }, [items, total]);
  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm<CheckoutForm>({ resolver: zodResolver(checkoutSchema), defaultValues: { name: "", email: "", payment: "card", country: "ES" } });
  const selectedPayment = watch("payment");
  useEffect(() => { let active = true; void getSessionUser().then((user) => { if (active && user) { setCurrentUser(user); reset({ name: user.name, email: user.email, phone: user.phone || "", payment: "card", country: "ES" }); } }); return () => { active = false; }; }, [reset]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") !== "cancelled") return;
    window.history.replaceState(null, "", "/checkout");
    const paypalOrderId = params.get("provider") === "paypal" ? params.get("token") : null;
    if (!paypalOrderId) { setToast({ message: "Has cancelado el pago. Tu cesta sigue guardada.", tone: "error" }); return; }
    // Releases the pending order; the server checks PayPal first so a completed payment is never cancelled.
    void fetch("/api/checkout/paypal/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paypalOrderId }) })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (body.status === "paid") { window.location.assign(`/checkout/paypal/return?token=${encodeURIComponent(paypalOrderId)}`); return; }
        setToast({ message: "Has cancelado el pago con PayPal. No se ha realizado ningún cargo y tu cesta sigue guardada.", tone: "error" });
      })
      .catch(() => setToast({ message: "Has cancelado el pago con PayPal. Tu cesta sigue guardada.", tone: "error" }));
  }, []);

  // One payment attempt at a time. After the customer is sent to Stripe/PayPal the button stays busy until
  // the page is gone (it used to be re-enabled during the redirect, so a second click could start a second payment).
  const payLock = useRef(false);
  const [redirecting, setRedirecting] = useState(false);
  useEffect(() => {
    // Coming back with the browser's Back button restores this page as it was: let the customer try again.
    const restore = (event: PageTransitionEvent) => { if (event.persisted) { payLock.current = false; setRedirecting(false); } };
    window.addEventListener("pageshow", restore);
    return () => window.removeEventListener("pageshow", restore);
  }, []);

  const submitOrder = async (data: CheckoutForm) => {
    if (payLock.current) return;
    payLock.current = true;
    setPaymentError("");
    trackPixel("AddPaymentInfo", { currency: "EUR", value: total, payment_type: data.payment === "paypal" ? "paypal" : "card", num_items: items.reduce((sum, item) => sum + item.quantity, 0) });
    try {
      const first = rows[0];
      if (!first) throw new Error("Tu cesta está vacía. Añade un producto antes de pagar.");
      const uploadDataUrl = async (value: string | null, fileName: string) => {
        if (!value || !value.startsWith("data:image/")) return value;
        return uploadBlob(await (await fetch(value)).blob(), fileName);
      };
      const uploadBlob = async (blob: Blob, fileName: string) => {
        const form = new FormData(); form.append("file", blob, fileName); form.append("kind", "CUSTOMER_UPLOAD");
        const response = await fetch("/api/uploads", { method: "POST", body: form }); const body = await response.json();
        if (!response.ok || !body.asset?.url) throw new Error(body.error || "No se pudo guardar una imagen");
        return body.asset.url as string;
      };
      // The final card pages, rendered from the design as the customer sees it, are the
      // artwork the print shop needs. A failed export never blocks the payment: the
      // order is then held in admin, which can render it again from the saved design.
      const renderDesign = async (card: CartItem["card"]): Promise<CardDesign | undefined> => {
        try {
          const { renderCardDesign } = await import("@/components/card-design-export");
          const panels = await renderCardDesign(card, language);
          return { panels: await Promise.all(panels.map(async (panel) => ({ side: panel.side, width: panel.width, height: panel.height, url: await uploadBlob(panel.blob, `design-${panel.side}.jpg`) }))) };
        } catch (reason) {
          console.error("Card design export failed", reason);
          return undefined;
        }
      };
      const persistedItems = await Promise.all(items.map(async (item) => {
        const design = item.product ? undefined : await renderDesign(item.card);
        const photoDataUrls = await Promise.all((item.card.photoDataUrls || []).map((value, index) => uploadDataUrl(value, `photo-${index}.jpg`)));
        const photoDataUrl = await uploadDataUrl(item.card.photoDataUrl, "photo-cover.jpg");
        // The design preview is a nicety: if it cannot be saved the order goes ahead without it.
        const preview = item.product?.preview ? await uploadDataUrl(item.product.preview, "preview.jpg").catch(() => null) : null;
        const product = item.product ? { ...item.product, preview, photos: await Promise.all(item.product.photos.map((value, index) => uploadDataUrl(value, `product-${index}.jpg`))) } : null;
        return { ...item, product, card: { ...item.card, photoDataUrl, photoDataUrls, design } };
      }));
      const existingResponse = await fetch("/api/cart", { cache: "no-store" });
      if (!existingResponse.ok) throw new Error("Inicia sesión para continuar al pago.");
      const existing = await existingResponse.json();
      for (const item of existing.items || []) await fetch(`/api/cart?id=${encodeURIComponent(item.id)}`, { method: "DELETE" });
      for (const item of persistedItems) {
        const response = await fetch("/api/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(item) });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "No se pudo guardar la cesta");
      }
      const idempotencyKey = `checkout-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      if (data.payment === "paypal") {
        const response = await fetch("/api/checkout/paypal/order", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey }, body: JSON.stringify({ ...data, discountCode: cart.discountCode }) });
        const body = await response.json();
        if (!response.ok || !body.approvalUrl) throw new Error(body.error || "No se pudo iniciar el pago con PayPal");
        // These lines leave the cart only once PayPal confirms the payment.
        if (body.orderId) rememberCheckout(body.orderId, items.map((item) => item.id));
        setRedirecting(true);
        window.location.assign(body.approvalUrl);
        return;
      }
      const response = await fetch("/api/checkout/session", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey }, body: JSON.stringify({ ...data, discountCode: cart.discountCode }) });
      const body = await response.json();
      if (!response.ok || !body.checkoutUrl) throw new Error(body.error || "No se pudo iniciar el pago con Stripe");
      // These lines leave the cart only once Stripe confirms the payment.
      if (body.orderId) rememberCheckout(body.orderId, items.map((item) => item.id));
      setRedirecting(true);
      window.location.assign(body.checkoutUrl);
    } catch (error) {
      payLock.current = false;
      setRedirecting(false);
      const message = error instanceof Error ? error.message : "No se pudo completar el pedido. Inténtalo de nuevo.";
      setPaymentError(message);
      setToast({ message, tone: "error" });
    }
  };

  const toastView = toast ? <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} /> : null;

  if (items.length === 0 && !submitted) {
    return <><SiteHeader /><main className="flex min-h-[62vh] items-center justify-center bg-[#fffaf5] px-5 py-20"><div className="max-w-[520px] text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#fff0e8] text-[#ee5264]"><Icon name="bag" size={27} /></div><h1 className="serif mt-6 text-4xl font-bold text-[#182443]">Tu checkout está vacío</h1><p className="mt-4 text-sm leading-7 text-[#737b90]">Añade una tarjeta personalizada antes de continuar al pago demo.</p><Link href="/templates" className="mt-7 inline-flex rounded-full bg-[#ee5264] px-6 py-3.5 text-sm font-black text-white">Ver plantillas</Link></div></main><SiteFooter />{toastView}</>;
  }

  if (submitted) return null;

  return <><SiteHeader /><main className="bg-[#fffaf5] py-14 md:py-20"><div className="container"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-[10px] font-black tracking-[.2em] text-[#ee5264]">ÚLTIMO PASO</p><h1 className="serif mt-3 text-4xl font-bold tracking-[-.04em] sm:text-5xl">Completa tu pedido</h1><p className="mt-3 text-sm text-[#737b90]">Checkout frontend con pago simulado; ningún cargo real se realiza.</p></div><div className="flex items-center gap-2 text-xs font-bold text-[#737b90]"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#182443] text-white">1</span> Datos <span className="text-[#c8bbb4]">—</span><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#182443] text-white">2</span> Revisión</div></div><div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-[#eadbd3] bg-white px-5 py-4 text-xs text-[#737b90]"><span className="flex items-center gap-2 font-black text-[#182443]"><Icon name="lock" size={15} /> Pago de demostración</span><span className="flex items-center gap-2"><Icon name="truck" size={15} /> España y Portugal</span><span className="flex items-center gap-2"><Icon name="heart" size={15} /> Atención humana</span></div><form onSubmit={handleSubmit(submitOrder)} className="mt-8 grid gap-7 lg:grid-cols-[1.08fr_.92fr]"><div className="space-y-5"><CheckoutSection title="Tus datos" caption="Te enviaremos la confirmación a este email."><div className="grid gap-4 sm:grid-cols-2"><Field label="Nombre completo" error={errors.name?.message}><input {...register("name")} placeholder="María García" className="field" /></Field><Field label="Email" error={errors.email?.message}><input {...register("email")} type="email" placeholder="hola@ejemplo.com" className="field" /></Field><Field label="Teléfono" error={errors.phone?.message}><input {...register("phone")} type="tel" placeholder="+34 600 000 000" className="field" /></Field></div></CheckoutSection><CheckoutSection title="Entrega y destinatario" caption="Enviamos a España y Portugal."><div className="grid gap-4 sm:grid-cols-2"><Field label="Nombre del destinatario" error={errors.recipient?.message}><input {...register("recipient")} placeholder="Ana López" className="field" /></Field><Field label="Dirección" error={errors.address?.message}><input {...register("address")} placeholder="Calle de la Paz, 12" className="field" /></Field><Field label="Ciudad" error={errors.city?.message}><input {...register("city")} placeholder="Madrid" className="field" /></Field><Field label="Código postal" error={errors.postalCode?.message}><input {...register("postalCode")} placeholder="28001" className="field" /></Field></div><label className="mt-4 block text-sm font-black">País<select {...register("country")} className="field"><option value="ES">España</option><option value="PT">Portugal</option></select></label><input {...register("billingAddress")} placeholder="Dirección de facturación opcional" className="field mt-4" /></CheckoutSection><CheckoutSection title="Entrega" caption={settings.delivery.standard.freeFromCents !== null ? "Envío gratis cuando los productos suman " + (settings.delivery.standard.freeFromCents / 100).toFixed(2).replace(".", ",") + " € o más." : "Te lo enviamos a la dirección indicada."}><div className="flex items-start justify-between gap-3 rounded-2xl border border-[#ee5264] bg-[#fff0e8] p-4"><span><span className="block text-sm font-black">Entrega normal</span><span className="mt-1 block text-xs text-[#737b90]">3–5 días laborables</span></span><span className="shrink-0 text-sm font-black">{delivery === 0 ? "Gratis" : <Price value={delivery} />}</span></div><p className="mt-4 rounded-xl bg-[#fff7f1] px-3 py-2.5 text-xs font-bold text-[#737b90]"><Icon name="truck" size={15} /> {freeShipping ? "Tu pedido tiene envío gratis." : missingForFree === null ? "Este método de entrega no tiene envío gratis." : <>Te faltan <Price value={missingForFree / 100} /> en productos para conseguir envío gratis.</>}</p></CheckoutSection><CheckoutSection title="Método de pago" caption="Paga con tarjeta mediante Stripe o con tu cuenta de PayPal."><div className="grid gap-3 sm:grid-cols-2"><PaymentOption register={register} value="card" title="Tarjeta crédito / débito" detail="Visa · Mastercard" /><PaymentOption register={register} value="paypal" title="PayPal" detail="Pago rápido y protegido" /></div>{selectedPayment === "card" ? <p className="mt-4 rounded-xl bg-[#fff7f1] px-3 py-2.5 text-xs font-bold leading-5 text-[#737b90]">Al confirmar te llevaremos a la página segura de Stripe, con tu email y tu país ya rellenados, para introducir los datos de tu tarjeta.</p> : <p className="mt-4 rounded-xl bg-[#fff7f1] px-3 py-2.5 text-xs font-bold leading-5 text-[#737b90]">Al confirmar te llevaremos a PayPal para aprobar el pago. Solo se cobrará cuando vuelvas y confirmemos el pedido.</p>}{paymentError && <p className="mt-3 rounded-xl bg-[#fff0e8] px-3 py-2.5 text-xs font-bold text-[#c94758]">{paymentError}</p>}<p className="mt-5 flex items-center gap-2 text-xs text-[#737b90]"><Icon name="lock" size={14} /> El pago se realiza en la página segura de {selectedPayment === "paypal" ? "PayPal" : "Stripe"}; no guardamos tus datos de pago.</p></CheckoutSection></div><Summary rows={rows} merchandiseSubtotal={merchandiseSubtotal} delivery={delivery} total={total} isSubmitting={isSubmitting || redirecting} blocked={unavailable || quote.loading || Boolean(discountInvalid)} discountValue={discountValue} discountCode={cart.discountCode.trim().toUpperCase()} discountInvalid={discountInvalid?.message ?? null} onRemoveDiscount={() => { dispatch(setDiscountCode("")); setPaymentError(""); }} /></form></div></main><SiteFooter />{toastView}</>;
}

function CheckoutSection({ title, caption, children }: { title: string; caption: string; children: React.ReactNode }) { return <section className="rounded-[24px] border border-[#eadbd3] bg-white p-5 sm:p-7"><h2 className="text-lg font-black">{title}</h2><p className="mt-1 text-sm text-[#737b90]">{caption}</p><div className="mt-5">{children}</div></section>; }
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <label className="block text-sm font-black">{label}{children}{error && <span className="mt-1 block text-xs font-bold text-[#c94758]">{error}</span>}</label>; }
function PaymentOption({ register, value, title, detail }: { register: ReturnType<typeof useForm<CheckoutForm>>["register"]; value: "card" | "paypal"; title: string; detail: string }) { return <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#dfd3cc] p-4 has-[:checked]:border-[#ee5264] has-[:checked]:bg-[#fff0e8]"><input {...register("payment")} type="radio" value={value} className="accent-[#ee5264]" /><span><span className="block text-sm font-black">{title}</span><span className="mt-1 block text-xs text-[#737b90]">{detail}</span></span></label>; }
function Summary({ rows, merchandiseSubtotal, delivery, total, isSubmitting, blocked, discountValue, discountCode, discountInvalid, onRemoveDiscount }: { rows: { item: RootState["cart"]["items"][number]; template: typeof templates[number]; unitTotal: number; error?: string }[]; merchandiseSubtotal: number; delivery: number; total: number; isSubmitting: boolean; blocked: boolean; discountValue: number; discountCode: string; discountInvalid: string | null; onRemoveDiscount: () => void }) { return <aside className="h-fit rounded-[24px] bg-[#182443] p-6 text-white lg:sticky lg:top-28 sm:p-7"><div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#f8c75e]">RESUMEN</p><h2 className="mt-1 text-xl font-black">Tu momento</h2></div><StatusBadge tone="green">Listo</StatusBadge></div><div className="mt-6 space-y-4 border-b border-white/10 pb-5">{rows.map(({ item, template, unitTotal }) => <div key={item.id} className="flex gap-3"><div className="w-16 shrink-0 rounded-lg bg-white p-1"><CartItemThumb item={item} template={template} /></div><div className="min-w-0 flex-1"><div className="flex justify-between gap-2 text-sm font-black"><span className="truncate">{item.product ? describeProductSelection(item.product).name : item.productName || template.name} × {item.quantity}</span><Price value={unitTotal * item.quantity} /></div><p className="mt-1 text-xs text-white/60">{item.product ? describeProductSelection(item.product).detail : cardSizeText(item.card.size)}</p></div></div>)}</div><div className="mt-5 space-y-3 text-sm text-white/70"><div className="flex justify-between"><span>Productos</span><Price value={merchandiseSubtotal} /></div><div className="flex justify-between"><span>Entrega</span>{delivery ? <Price value={delivery} /> : <span className="font-black text-[#f8c75e]">Gratis</span>}</div>{discountValue > 0 && <div className="flex justify-between text-[#f8c75e]"><span>Descuento {discountCode} <button type="button" onClick={onRemoveDiscount} className="ml-1 text-[11px] underline underline-offset-2 hover:text-white">Quitar</button></span><span>−<Price value={discountValue} /></span></div>}{discountInvalid && <p role="alert" className="rounded-xl bg-[#c94758]/25 px-3 py-2.5 text-xs font-bold text-white">El código {discountCode} no se puede usar: {discountInvalid} <button type="button" onClick={onRemoveDiscount} className="underline underline-offset-2">Quitar código</button></p>}</div><div className="mt-7 flex justify-between border-t border-white/10 pt-5 text-xl font-black"><span>Total</span><Price value={total} /></div><p data-testid="shipping-notice" className="mt-5 rounded-xl border border-white/15 bg-white/10 px-3.5 py-3 text-xs leading-5 text-white/90 sm:text-[13px]">📦 ¿Has pedido varios productos? Algunos artículos pueden enviarse por separado y llegar en fechas diferentes, sin coste adicional para ti.</p>{rows.some((row) => row.error) && <p role="alert" className="mt-6 rounded-xl bg-[#c94758]/25 px-3 py-2.5 text-xs font-bold text-white">Hay artículos que ya no están disponibles. Vuelve a la <Link href="/cart" className="underline">cesta</Link> para eliminarlos.</p>}<LoadingButton type="submit" loading={isSubmitting} disabled={blocked} loadingLabel="Procesando…" className="focus-ring mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#ee5264] px-5 py-3.5 text-sm font-black transition hover:bg-[#d83d54] disabled:opacity-60">Confirmar y pagar<Icon name="arrow" size={16} /></LoadingButton><p className="mt-4 text-center text-[11px] text-white/50">Frontend demo · sin cobros reales.</p></aside>; }
