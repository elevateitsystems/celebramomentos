"use client";

import Link from "next/link";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { CardPreview } from "@/components/card-preview";
import { Icon } from "@/components/icons";
import { Price, SiteFooter, SiteHeader, StatusBadge } from "@/components/site";
import { DELIVERY_PRICES, FREE_SHIPPING_THRESHOLD, amountUntilFreeShipping, getDeliveryPrice, qualifiesForFreeShipping } from "@/lib/shipping";
import { getCartItemUnitTotal } from "@/lib/cart";
import { createMockOrder, getCurrentUser, getTemplatePrice, useMockDb } from "@/lib/mock-store";
import { clearCartItems, RootState, setAllItemsDelivery } from "@/lib/store";
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
  const db = useMockDb();
  const [submitted, setSubmitted] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const items = cart.items;
  const rows = items.map((item) => {
    const template = templates.find((current) => current.id === item.card.templateId) || templates[0];
    return { item, template, unitTotal: getCartItemUnitTotal(item, getTemplatePrice(template.id, db)) };
  });
  const merchandiseSubtotal = rows.reduce((sum, row) => sum + row.unitTotal * row.item.quantity, 0);
  const freeShipping = qualifiesForFreeShipping(merchandiseSubtotal);
  const deliveryMethod = items[0]?.card.delivery || cart.card.delivery;
  const delivery = getDeliveryPrice(deliveryMethod, merchandiseSubtotal);
  const discountValue = cart.discountCode.trim().toUpperCase() === "HOLA10" ? (merchandiseSubtotal + delivery) * 0.1 : 0;
  const total = merchandiseSubtotal + delivery - discountValue;
  const currentUser = getCurrentUser(db);
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<CheckoutForm>({ resolver: zodResolver(checkoutSchema), defaultValues: { name: currentUser?.name || "", email: currentUser?.email || "", payment: "card", country: "ES" } });
  const selectedPayment = watch("payment");

  const submitOrder = (data: CheckoutForm) => {
    setPaymentError("");
    if (data.payment === "card" && data.cardNumber?.replace(/\s/g, "").endsWith("0000")) {
      setPaymentError("Pago rechazado en la demo. Usa cualquier tarjeta que no termine en 0000.");
      return;
    }
    const first = rows[0];
    if (!first) return;
    const order = createMockOrder({
      userId: currentUser?.id || "guest-" + data.email.trim().toLowerCase(),
      email: data.email.trim().toLowerCase(),
      item: rows.map((row) => row.template.name + (row.item.quantity > 1 ? " × " + row.item.quantity : "")).join(" · "),
      templateId: first.template.id,
      amount: total,
      payment: data.payment,
      status: "Pedido recibido",
      delivery: deliveryMethod,
      packaging: first.item.card.packaging,
      card: first.item.card,
      items,
      extras: { stickerQuantity: first.item.stickerQuantity, envelopeText: first.item.envelopeText, envelopeTextAdded: first.item.envelopeTextAdded },
      shipping: { name: data.name, phone: data.phone, recipient: data.recipient, address: data.address, city: data.city, postalCode: data.postalCode, country: data.country, billingAddress: data.billingAddress },
    });
    dispatch(clearCartItems());
    setOrderId(order.id);
    setSubmitted(true);
  };

  if (items.length === 0 && !submitted) {
    return <><SiteHeader /><main className="flex min-h-[62vh] items-center justify-center bg-[#fffaf5] px-5 py-20"><div className="max-w-[520px] text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#fff0e8] text-[#ee5264]"><Icon name="bag" size={27} /></div><h1 className="serif mt-6 text-4xl font-bold text-[#182443]">Tu checkout está vacío</h1><p className="mt-4 text-sm leading-7 text-[#737b90]">Añade una tarjeta personalizada antes de continuar al pago demo.</p><Link href="/templates" className="mt-7 inline-flex rounded-full bg-[#ee5264] px-6 py-3.5 text-sm font-black text-white">Ver plantillas</Link></div></main><SiteFooter /></>;
  }

  if (submitted) return <><SiteHeader /><main className="flex min-h-[68vh] items-center justify-center bg-[#fffaf5] px-5 py-20"><div className="max-w-[560px] text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#e8f5ed] text-[#24714b]"><Icon name="check" size={28} /></div><p className="mt-7 text-[10px] font-black tracking-[.2em] text-[#ee5264]">PEDIDO CREADO</p><h1 className="serif mt-3 text-5xl font-bold tracking-[-.04em]">Tu momento está en camino.</h1><p className="mt-5 text-sm leading-7 text-[#737b90]">Pago simulado correctamente. Tu pedido <strong>{orderId}</strong> está guardado en este navegador y aparecerá en tu historial.</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/account" className="rounded-full bg-[#ee5264] px-6 py-3.5 text-sm font-black text-white">Ver mis pedidos</Link><Link href="/" className="rounded-full border border-[#dfd3cc] bg-white px-6 py-3.5 text-sm font-black">Volver al inicio</Link></div></div></main><SiteFooter /></>;

  return <><SiteHeader /><main className="bg-[#fffaf5] py-14 md:py-20"><div className="container"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-[10px] font-black tracking-[.2em] text-[#ee5264]">ÚLTIMO PASO</p><h1 className="serif mt-3 text-4xl font-bold tracking-[-.04em] sm:text-5xl">Completa tu pedido</h1><p className="mt-3 text-sm text-[#737b90]">Checkout frontend con pago simulado; ningún cargo real se realiza.</p></div><div className="flex items-center gap-2 text-xs font-bold text-[#737b90]"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#182443] text-white">1</span> Datos <span className="text-[#c8bbb4]">—</span><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#182443] text-white">2</span> Revisión</div></div><div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-[#eadbd3] bg-white px-5 py-4 text-xs text-[#737b90]"><span className="flex items-center gap-2 font-black text-[#182443]"><Icon name="lock" size={15} /> Pago de demostración</span><span className="flex items-center gap-2"><Icon name="truck" size={15} /> España y Portugal</span><span className="flex items-center gap-2"><Icon name="heart" size={15} /> Atención humana</span></div><form onSubmit={handleSubmit(submitOrder)} className="mt-8 grid gap-7 lg:grid-cols-[1.08fr_.92fr]"><div className="space-y-5"><CheckoutSection title="Tus datos" caption="Te enviaremos la confirmación a este email."><div className="grid gap-4 sm:grid-cols-2"><Field label="Nombre completo" error={errors.name?.message}><input {...register("name")} placeholder="María García" className="field" /></Field><Field label="Email" error={errors.email?.message}><input {...register("email")} type="email" placeholder="hola@ejemplo.com" className="field" /></Field><Field label="Teléfono" error={errors.phone?.message}><input {...register("phone")} type="tel" placeholder="+34 600 000 000" className="field" /></Field></div></CheckoutSection><CheckoutSection title="Entrega y destinatario" caption="Enviamos a España y Portugal."><div className="grid gap-4 sm:grid-cols-2"><Field label="Nombre del destinatario" error={errors.recipient?.message}><input {...register("recipient")} placeholder="Ana López" className="field" /></Field><Field label="Dirección" error={errors.address?.message}><input {...register("address")} placeholder="Calle de la Paz, 12" className="field" /></Field><Field label="Ciudad" error={errors.city?.message}><input {...register("city")} placeholder="Madrid" className="field" /></Field><Field label="Código postal" error={errors.postalCode?.message}><input {...register("postalCode")} placeholder="28001" className="field" /></Field></div><label className="mt-4 block text-sm font-black">País<select {...register("country")} className="field"><option value="ES">España</option><option value="PT">Portugal</option></select></label><input {...register("billingAddress")} placeholder="Dirección de facturación opcional" className="field mt-4" /></CheckoutSection><CheckoutSection title="Tipo de entrega" caption={"Envío gratis cuando los productos suman " + FREE_SHIPPING_THRESHOLD + " € o más."}><div className="grid gap-3 sm:grid-cols-2">{([["standard", "Entrega normal", "3–5 días laborables", DELIVERY_PRICES.standard], ["express", "Entrega express", "1–2 días laborables", DELIVERY_PRICES.express]] as const).map(([value, title, detail, basePrice]) => <button key={value} type="button" onClick={() => dispatch(setAllItemsDelivery(value))} className={deliveryMethod === value ? "focus-ring rounded-2xl border border-[#ee5264] bg-[#fff0e8] p-4 text-left transition" : "focus-ring rounded-2xl border border-[#dfd3cc] bg-white p-4 text-left transition hover:border-[#ee5264]"}><span className="flex items-start justify-between gap-3"><span><span className="block text-sm font-black">{title}</span><span className="mt-1 block text-xs text-[#737b90]">{detail}</span></span><span className="shrink-0 text-sm font-black">{freeShipping ? "Gratis" : <Price value={basePrice} />}</span></span></button>)}</div><p className="mt-4 rounded-xl bg-[#fff7f1] px-3 py-2.5 text-xs font-bold text-[#737b90]"><Icon name="truck" size={15} /> {freeShipping ? "Tu pedido tiene envío gratis." : <>Te faltan <Price value={amountUntilFreeShipping(merchandiseSubtotal)} /> en productos para conseguir envío gratis.</>}</p></CheckoutSection><CheckoutSection title="Método de pago" caption="Selecciona una opción; la conexión real llegará en la fase backend."><div className="grid gap-3 sm:grid-cols-2"><PaymentOption register={register} value="card" title="Tarjeta crédito / débito" detail="Visa · Mastercard" /><PaymentOption register={register} value="paypal" title="PayPal" detail="Pago rápido y protegido" /></div>{selectedPayment === "card" ? <Field label="Número de tarjeta de prueba" error={errors.cardNumber?.message}><input {...register("cardNumber")} inputMode="numeric" placeholder="4242 4242 4242 4242" className="field" /></Field> : <Field label="Email de PayPal de prueba" error={errors.paypalEmail?.message}><input {...register("paypalEmail")} type="email" placeholder="cliente@paypal.demo" className="field" /></Field>}{paymentError && <p className="mt-3 rounded-xl bg-[#fff0e8] px-3 py-2.5 text-xs font-bold text-[#c94758]">{paymentError}</p>}<p className="mt-5 flex items-center gap-2 text-xs text-[#737b90]"><Icon name="lock" size={14} /> No se realiza ningún cargo en esta demo frontend.</p></CheckoutSection></div><Summary rows={rows} merchandiseSubtotal={merchandiseSubtotal} delivery={delivery} total={total} isSubmitting={isSubmitting} discountValue={discountValue} /></form></div></main><SiteFooter /></>;
}

function CheckoutSection({ title, caption, children }: { title: string; caption: string; children: React.ReactNode }) { return <section className="rounded-[24px] border border-[#eadbd3] bg-white p-5 sm:p-7"><h2 className="text-lg font-black">{title}</h2><p className="mt-1 text-sm text-[#737b90]">{caption}</p><div className="mt-5">{children}</div></section>; }
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <label className="block text-sm font-black">{label}{children}{error && <span className="mt-1 block text-xs font-bold text-[#c94758]">{error}</span>}</label>; }
function PaymentOption({ register, value, title, detail }: { register: ReturnType<typeof useForm<CheckoutForm>>["register"]; value: "card" | "paypal"; title: string; detail: string }) { return <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#dfd3cc] p-4 has-[:checked]:border-[#ee5264] has-[:checked]:bg-[#fff0e8]"><input {...register("payment")} type="radio" value={value} className="accent-[#ee5264]" /><span><span className="block text-sm font-black">{title}</span><span className="mt-1 block text-xs text-[#737b90]">{detail}</span></span></label>; }
function Summary({ rows, merchandiseSubtotal, delivery, total, isSubmitting, discountValue }: { rows: { item: RootState["cart"]["items"][number]; template: typeof templates[number]; unitTotal: number }[]; merchandiseSubtotal: number; delivery: number; total: number; isSubmitting: boolean; discountValue: number }) { return <aside className="h-fit rounded-[24px] bg-[#182443] p-6 text-white lg:sticky lg:top-28 sm:p-7"><div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#f8c75e]">RESUMEN</p><h2 className="mt-1 text-xl font-black">Tu momento</h2></div><StatusBadge tone="green">Listo</StatusBadge></div><div className="mt-6 space-y-4 border-b border-white/10 pb-5">{rows.map(({ item, template, unitTotal }) => <div key={item.id} className="flex gap-3"><div className="w-16 shrink-0 rounded-lg bg-white p-1"><CardPreview compact templateId={template.id} message={item.card.frontHeadline || item.card.message} emojiElements={item.card.emojiElements} photoDataUrls={item.card.photoDataUrls} photoZoom={item.card.photoZoom} photoPosition={item.card.photoPosition} /></div><div className="min-w-0 flex-1"><div className="flex justify-between gap-2 text-sm font-black"><span className="truncate">{template.name} × {item.quantity}</span><Price value={unitTotal * item.quantity} /></div><p className="mt-1 text-xs text-white/60">{item.card.size} · {item.card.packaging === "gift" ? "Packaging regalo" : "Sobre estándar"}</p></div></div>)}</div><div className="mt-5 space-y-3 text-sm text-white/70"><div className="flex justify-between"><span>Productos</span><Price value={merchandiseSubtotal} /></div><div className="flex justify-between"><span>Entrega</span>{delivery ? <Price value={delivery} /> : <span className="font-black text-[#f8c75e]">Gratis</span>}</div>{discountValue > 0 && <div className="flex justify-between text-[#f8c75e]"><span>Descuento HOLA10</span><span>−<Price value={discountValue} /></span></div>}</div><div className="mt-7 flex justify-between border-t border-white/10 pt-5 text-xl font-black"><span>Total</span><Price value={total} /></div><button disabled={isSubmitting} className="focus-ring mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#ee5264] px-5 py-3.5 text-sm font-black transition hover:bg-[#d83d54] disabled:opacity-60">{isSubmitting ? "Procesando…" : "Confirmar y pagar"}<Icon name="arrow" size={16} /></button><p className="mt-4 text-center text-[11px] text-white/50">Frontend demo · sin cobros reales.</p></aside>; }
