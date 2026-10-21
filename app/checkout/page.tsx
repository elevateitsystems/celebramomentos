"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { CartItemThumb } from "@/components/cart-item-visual";
import { Icon } from "@/components/icons";
import { getSessionUser } from "@/lib/client-session";
import { Price, SiteFooter, SiteHeader, StatusBadge, Toast } from "@/components/site";
import { DELIVERY_PRICES, FREE_SHIPPING_THRESHOLD, amountUntilFreeShipping, getDeliveryPrice, qualifiesForFreeShipping } from "@/lib/shipping";
import { describeProductSelection, getCartItemUnitTotal } from "@/lib/cart";
import { RootState, setAllItemsDelivery } from "@/lib/store";
import { templates } from "@/lib/data";

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
  cardNumber: z.string().optional(),
  paypalEmail: z.string().optional(),
}).superRefine((data, context) => {
  if (data.payment === "card" && (data.cardNumber || "").replace(/\s/g, "").length < 12) context.addIssue({ code: z.ZodIssueCode.custom, path: ["cardNumber"], message: "Introduce una tarjeta de prueba válida." });
  if (data.payment === "paypal" && !data.paypalEmail) context.addIssue({ code: z.ZodIssueCode.custom, path: ["paypalEmail"], message: "Introduce un email de PayPal de prueba." });
});
type CheckoutForm = z.infer<typeof checkoutSchema>;

export default function CheckoutPage() {
  const dispatch = useDispatch();
  const cart = useSelector((state: RootState) => state.cart);
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string } | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const items = cart.items;
  const rows = items.map((item) => {
    const template = templates.find((current) => current.id === item.card.templateId) || templates[0];
    return { item, template, unitTotal: getCartItemUnitTotal(item, template.price) };
  });
  const merchandiseSubtotal = rows.reduce((sum, row) => sum + row.unitTotal * row.item.quantity, 0);
  const freeShipping = qualifiesForFreeShipping(merchandiseSubtotal);
  const deliveryMethod = items[0]?.card.delivery || cart.card.delivery;
  const delivery = getDeliveryPrice(deliveryMethod, merchandiseSubtotal);
  const discountValue = cart.discountCode.trim().toUpperCase() === "HOLA10" ? (merchandiseSubtotal + delivery) * 0.1 : 0;
  const total = merchandiseSubtotal + delivery - discountValue;
  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm<CheckoutForm>({ resolver: zodResolver(checkoutSchema), defaultValues: { name: "", email: "", payment: "card", country: "ES" } });
  const selectedPayment = watch("payment");
  useEffect(() => { let active = true; void getSessionUser().then((user) => { if (active && user) { setCurrentUser(user); reset({ name: user.name, email: user.email, payment: "card", country: "ES" }); } }); return () => { active = false; }; }, [reset]);

  const submitOrder = async (data: CheckoutForm) => {
    setPaymentError("");
    try {
      const first = rows[0];
      if (!first) throw new Error("Tu cesta está vacía. Añade un producto antes de pagar.");
      const uploadDataUrl = async (value: string | null, fileName: string) => {
        if (!value || !value.startsWith("data:image/")) return value;
        const blob = await (await fetch(value)).blob();
        const form = new FormData(); form.append("file", blob, fileName); form.append("kind", "CUSTOMER_UPLOAD");
        const response = await fetch("/api/uploads", { method: "POST", body: form }); const body = await response.json();
        if (!response.ok || !body.asset?.url) throw new Error(body.error || "No se pudo guardar una imagen");
        return body.asset.url as string;
      };
      const persistedItems = await Promise.all(items.map(async (item) => {
        const photoDataUrls = await Promise.all((item.card.photoDataUrls || []).map((value, index) => uploadDataUrl(value, `photo-${index}.jpg`)));
        const photoDataUrl = await uploadDataUrl(item.card.photoDataUrl, "photo-cover.jpg");
        const stickerImage = await uploadDataUrl(item.stickerImage, "sticker.jpg");
        const product = item.product ? { ...item.product, photos: await Promise.all(item.product.photos.map((value, index) => uploadDataUrl(value, `product-${index}.jpg`))) } : null;
        return { ...item, product, stickerImage, card: { ...item.card, photoDataUrl, photoDataUrls } };
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
      const response = await fetch("/api/checkout/session", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": `checkout-${Date.now()}-${Math.random().toString(36).slice(2)}` }, body: JSON.stringify({ ...data, discountCode: cart.discountCode }) });
      const body = await response.json();
      if (!response.ok || !body.checkoutUrl) throw new Error(body.error || "No se pudo iniciar el pago con Stripe");
      window.location.assign(body.checkoutUrl);
    } catch (error) {
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

  return <><SiteHeader /><main className="bg-[#fffaf5] py-14 md:py-20"><div className="container"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-[10px] font-black tracking-[.2em] text-[#ee5264]">ÚLTIMO PASO</p><h1 className="serif mt-3 text-4xl font-bold tracking-[-.04em] sm:text-5xl">Completa tu pedido</h1><p className="mt-3 text-sm text-[#737b90]">Checkout frontend con pago simulado; ningún cargo real se realiza.</p></div><div className="flex items-center gap-2 text-xs font-bold text-[#737b90]"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#182443] text-white">1</span> Datos <span className="text-[#c8bbb4]">—</span><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#182443] text-white">2</span> Revisión</div></div><div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-[#eadbd3] bg-white px-5 py-4 text-xs text-[#737b90]"><span className="flex items-center gap-2 font-black text-[#182443]"><Icon name="lock" size={15} /> Pago de demostración</span><span className="flex items-center gap-2"><Icon name="truck" size={15} /> España y Portugal</span><span className="flex items-center gap-2"><Icon name="heart" size={15} /> Atención humana</span></div><form onSubmit={handleSubmit(submitOrder)} className="mt-8 grid gap-7 lg:grid-cols-[1.08fr_.92fr]"><div className="space-y-5"><CheckoutSection title="Tus datos" caption="Te enviaremos la confirmación a este email."><div className="grid gap-4 sm:grid-cols-2"><Field label="Nombre completo" error={errors.name?.message}><input {...register("name")} placeholder="María García" className="field" /></Field><Field label="Email" error={errors.email?.message}><input {...register("email")} type="email" placeholder="hola@ejemplo.com" className="field" /></Field><Field label="Teléfono" error={errors.phone?.message}><input {...register("phone")} type="tel" placeholder="+34 600 000 000" className="field" /></Field></div></CheckoutSection><CheckoutSection title="Entrega y destinatario" caption="Enviamos a España y Portugal."><div className="grid gap-4 sm:grid-cols-2"><Field label="Nombre del destinatario" error={errors.recipient?.message}><input {...register("recipient")} placeholder="Ana López" className="field" /></Field><Field label="Dirección" error={errors.address?.message}><input {...register("address")} placeholder="Calle de la Paz, 12" className="field" /></Field><Field label="Ciudad" error={errors.city?.message}><input {...register("city")} placeholder="Madrid" className="field" /></Field><Field label="Código postal" error={errors.postalCode?.message}><input {...register("postalCode")} placeholder="28001" className="field" /></Field></div><label className="mt-4 block text-sm font-black">País<select {...register("country")} className="field"><option value="ES">España</option><option value="PT">Portugal</option></select></label><input {...register("billingAddress")} placeholder="Dirección de facturación opcional" className="field mt-4" /></CheckoutSection><CheckoutSection title="Tipo de entrega" caption={"Envío gratis cuando los productos suman " + FREE_SHIPPING_THRESHOLD + " € o más."}><div className="grid gap-3 sm:grid-cols-2">{([["standard", "Entrega normal", "3–5 días laborables", DELIVERY_PRICES.standard], ["express", "Entrega express", "1–2 días laborables", DELIVERY_PRICES.express]] as const).map(([value, title, detail, basePrice]) => <button key={value} type="button" onClick={() => dispatch(setAllItemsDelivery(value))} className={deliveryMethod === value ? "focus-ring rounded-2xl border border-[#ee5264] bg-[#fff0e8] p-4 text-left transition" : "focus-ring rounded-2xl border border-[#dfd3cc] bg-white p-4 text-left transition hover:border-[#ee5264]"}><span className="flex items-start justify-between gap-3"><span><span className="block text-sm font-black">{title}</span><span className="mt-1 block text-xs text-[#737b90]">{detail}</span></span><span className="shrink-0 text-sm font-black">{freeShipping ? "Gratis" : <Price value={basePrice} />}</span></span></button>)}</div><p className="mt-4 rounded-xl bg-[#fff7f1] px-3 py-2.5 text-xs font-bold text-[#737b90]"><Icon name="truck" size={15} /> {freeShipping ? "Tu pedido tiene envío gratis." : <>Te faltan <Price value={amountUntilFreeShipping(merchandiseSubtotal)} /> en productos para conseguir envío gratis.</>}</p></CheckoutSection><CheckoutSection title="Método de pago" caption="Selecciona una opción; la conexión real llegará en la fase backend."><div className="grid gap-3 sm:grid-cols-2"><PaymentOption register={register} value="card" title="Tarjeta crédito / débito" detail="Visa · Mastercard" /><PaymentOption register={register} value="paypal" title="PayPal" detail="Pago rápido y protegido" /></div>{selectedPayment === "card" ? <Field label="Número de tarjeta de prueba" error={errors.cardNumber?.message}><input {...register("cardNumber")} inputMode="numeric" placeholder="4242 4242 4242 4242" className="field" /></Field> : <Field label="Email de PayPal de prueba" error={errors.paypalEmail?.message}><input {...register("paypalEmail")} type="email" placeholder="cliente@paypal.demo" className="field" /></Field>}{paymentError && <p className="mt-3 rounded-xl bg-[#fff0e8] px-3 py-2.5 text-xs font-bold text-[#c94758]">{paymentError}</p>}<p className="mt-5 flex items-center gap-2 text-xs text-[#737b90]"><Icon name="lock" size={14} /> No se realiza ningún cargo en esta demo frontend.</p></CheckoutSection></div><Summary rows={rows} merchandiseSubtotal={merchandiseSubtotal} delivery={delivery} total={total} isSubmitting={isSubmitting} discountValue={discountValue} /></form></div></main><SiteFooter />{toastView}</>;
}

function CheckoutSection({ title, caption, children }: { title: string; caption: string; children: React.ReactNode }) { return <section className="rounded-[24px] border border-[#eadbd3] bg-white p-5 sm:p-7"><h2 className="text-lg font-black">{title}</h2><p className="mt-1 text-sm text-[#737b90]">{caption}</p><div className="mt-5">{children}</div></section>; }
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <label className="block text-sm font-black">{label}{children}{error && <span className="mt-1 block text-xs font-bold text-[#c94758]">{error}</span>}</label>; }
function PaymentOption({ register, value, title, detail }: { register: ReturnType<typeof useForm<CheckoutForm>>["register"]; value: "card" | "paypal"; title: string; detail: string }) { if (value === "paypal") return null; return <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#dfd3cc] p-4 has-[:checked]:border-[#ee5264] has-[:checked]:bg-[#fff0e8]"><input {...register("payment")} type="radio" value={value} className="accent-[#ee5264]" /><span><span className="block text-sm font-black">{title}</span><span className="mt-1 block text-xs text-[#737b90]">{detail}</span></span></label>; }
function Summary({ rows, merchandiseSubtotal, delivery, total, isSubmitting, discountValue }: { rows: { item: RootState["cart"]["items"][number]; template: typeof templates[number]; unitTotal: number }[]; merchandiseSubtotal: number; delivery: number; total: number; isSubmitting: boolean; discountValue: number }) { return <aside className="h-fit rounded-[24px] bg-[#182443] p-6 text-white lg:sticky lg:top-28 sm:p-7"><div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#f8c75e]">RESUMEN</p><h2 className="mt-1 text-xl font-black">Tu momento</h2></div><StatusBadge tone="green">Listo</StatusBadge></div><div className="mt-6 space-y-4 border-b border-white/10 pb-5">{rows.map(({ item, template, unitTotal }) => <div key={item.id} className="flex gap-3"><div className="w-16 shrink-0 rounded-lg bg-white p-1"><CartItemThumb item={item} template={template} /></div><div className="min-w-0 flex-1"><div className="flex justify-between gap-2 text-sm font-black"><span className="truncate">{item.product ? describeProductSelection(item.product).name : template.name} × {item.quantity}</span><Price value={unitTotal * item.quantity} /></div><p className="mt-1 text-xs text-white/60">{item.product ? describeProductSelection(item.product).detail : `${item.card.size} · ${item.card.packaging === "gift" ? "Packaging regalo" : "Sobre estándar"}`}</p></div></div>)}</div><div className="mt-5 space-y-3 text-sm text-white/70"><div className="flex justify-between"><span>Productos</span><Price value={merchandiseSubtotal} /></div><div className="flex justify-between"><span>Entrega</span>{delivery ? <Price value={delivery} /> : <span className="font-black text-[#f8c75e]">Gratis</span>}</div>{discountValue > 0 && <div className="flex justify-between text-[#f8c75e]"><span>Descuento HOLA10</span><span>−<Price value={discountValue} /></span></div>}</div><div className="mt-7 flex justify-between border-t border-white/10 pt-5 text-xl font-black"><span>Total</span><Price value={total} /></div><button disabled={isSubmitting} className="focus-ring mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#ee5264] px-5 py-3.5 text-sm font-black transition hover:bg-[#d83d54] disabled:opacity-60">{isSubmitting ? "Procesando…" : "Confirmar y pagar"}<Icon name="arrow" size={16} /></button><p className="mt-4 text-center text-[11px] text-white/50">Frontend demo · sin cobros reales.</p></aside>; }
