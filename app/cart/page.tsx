"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CardPreview } from "@/components/card-preview";
import { Icon } from "@/components/icons";
import { PageIntro, Price, SiteFooter, SiteHeader, StatusBadge, Toast } from "@/components/site";
import { amountUntilFreeShipping, getDeliveryPrice, qualifiesForFreeShipping } from "@/lib/shipping";
import { getCartItemUnitTotal } from "@/lib/cart";
import { getTemplatePrice, useMockDb } from "@/lib/mock-store";
import { RootState, loadCartItem, removeCartItem, setCartItemQuantity, setDiscountCode } from "@/lib/store";
import { templates } from "@/lib/data";

export default function CartPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const cart = useSelector((state: RootState) => state.cart);
  const db = useMockDb();
  const [toast, setToast] = useState("");
  const [discount, setDiscount] = useState(cart.discountCode);
  const items = cart.items;
  const rows = items.map((item) => {
    const template = templates.find((current) => current.id === item.card.templateId) || templates[0];
    const templatePrice = getTemplatePrice(template.id, db);
    return { item, template, unitTotal: getCartItemUnitTotal(item, templatePrice) };
  });
  const merchandiseSubtotal = rows.reduce((sum, row) => sum + row.unitTotal * row.item.quantity, 0);
  const freeShipping = qualifiesForFreeShipping(merchandiseSubtotal);
  const delivery = items[0] ? getDeliveryPrice(items[0].card.delivery, merchandiseSubtotal) : 0;
  const subtotal = merchandiseSubtotal + delivery;
  const discountValue = discount.trim().toUpperCase() === "HOLA10" ? subtotal * 0.1 : 0;
  const total = subtotal - discountValue;
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const editItem = (id: string) => {
    dispatch(loadCartItem(id));
    router.push("/customize?edit=" + encodeURIComponent(id));
  };

  if (items.length === 0) {
    return <><SiteHeader /><main className="bg-[#fffaf5] px-5 py-16 md:py-24"><div className="container"><div className="mx-auto max-w-[580px] rounded-[30px] border border-[#eadbd3] bg-white p-8 text-center shadow-[0_20px_60px_rgba(24,36,67,.06)] sm:p-12"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#fff0e8] text-[#ee5264]"><Icon name="bag" size={27} /></div><PageIntro eyebrow="TU SELECCIÓN" title="Tu cesta está esperando" body="Elige una plantilla, personalízala con calma y aquí podrás revisar cada detalle antes del checkout." /><Link href="/templates" className="focus-ring mt-8 inline-flex items-center gap-2 rounded-full bg-[#ee5264] px-6 py-3.5 text-sm font-black text-white hover:bg-[#d83d54]">Ver plantillas <Icon name="arrow" size={16} /></Link></div></div></main><SiteFooter /></>;
  }

  return <><SiteHeader active="" /><main className="bg-[#fffaf5] py-14 md:py-20"><div className="container"><PageIntro eyebrow="CASI ESTÁ" title="Tu selección" body={itemCount === 1 ? "1 artículo personalizado listo para revisar antes del checkout." : itemCount + " artículos personalizados listos para revisar antes del checkout."} /><div className="mt-12 grid gap-7 lg:grid-cols-[1.25fr_.75fr]"><section className="space-y-4">{rows.map(({ item, template, unitTotal }) => <article key={item.id} className="rounded-[24px] border border-[#eadbd3] bg-white p-4 sm:p-6"><div className="flex flex-col gap-5 sm:flex-row"><div className="w-full max-w-[190px] shrink-0 rounded-2xl bg-[#f8efe8] p-3"><CardPreview compact templateId={template.id} message={item.card.frontHeadline || item.card.message} emojiElements={item.card.emojiElements} photoDataUrls={item.card.photoDataUrls} photoZoom={item.card.photoZoom} photoPosition={item.card.photoPosition} /></div><div className="flex min-w-0 flex-1 flex-col"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#ee5264]">{template.eyebrow}</p><h2 className="mt-1 text-xl font-black">{template.name}</h2><p className="mt-2 text-sm text-[#737b90]">{item.card.size} · {item.card.recipientMode === "recipient" ? "Entrega directa al destinatario" : "Entrega a mi dirección"}</p></div><button type="button" onClick={() => editItem(item.id)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#dfd3cc] hover:border-[#ee5264]" aria-label={"Editar " + template.name}><Icon name="edit" size={15} /></button></div><div className="mt-5 flex flex-wrap gap-2 text-[11px] font-bold text-[#59627b]"><span className="rounded-full bg-[#fff5ef] px-2.5 py-1">{item.card.photoDataUrls.filter(Boolean).length} fotos</span><span className="rounded-full bg-[#fff5ef] px-2.5 py-1">{item.card.packaging === "gift" ? "Packaging regalo" : "Sobre estándar"}</span>{item.stickerQuantity > 0 && <span className="rounded-full bg-[#fff5ef] px-2.5 py-1">Sticker × {item.stickerQuantity}</span>}{item.envelopeTextAdded && <span className="rounded-full bg-[#fff5ef] px-2.5 py-1">Texto en sobre</span>}</div><div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-[#eadbd3] pt-4"><StatusBadge tone={item.card.delivery === "express" ? "amber" : "green"}>{item.card.delivery === "express" ? "Express · 1–2 días" : "Normal · 3–5 días"}</StatusBadge><div className="flex items-center gap-4"><div className="flex items-center rounded-full border border-[#dfd3cc]"><button type="button" onClick={() => dispatch(setCartItemQuantity({ id: item.id, quantity: item.quantity - 1 }))} disabled={item.quantity <= 1} className="h-8 w-8 text-sm font-black text-[#59627b] disabled:opacity-30" aria-label="Reducir cantidad">−</button><span className="w-7 text-center text-sm font-black">{item.quantity}</span><button type="button" onClick={() => dispatch(setCartItemQuantity({ id: item.id, quantity: item.quantity + 1 }))} className="h-8 w-8 text-sm font-black text-[#59627b]" aria-label="Aumentar cantidad">+</button></div><span className="font-black"><Price value={unitTotal * item.quantity} /></span><button type="button" onClick={() => { dispatch(removeCartItem(item.id)); setToast("Artículo eliminado de la cesta."); }} className="text-[#9297a4] hover:text-[#ee5264]" aria-label={"Eliminar " + template.name}><Icon name="trash" size={16} /></button></div></div></div></div></article>)}<Link href="/templates" className="inline-flex items-center gap-2 px-2 pt-2 text-sm font-black text-[#ee5264] hover:text-[#d83d54]"><Icon name="plus" size={15} /> Añadir otro diseño</Link></section><aside className="h-fit rounded-[24px] bg-[#182443] p-6 text-white sm:p-7 lg:sticky lg:top-24"><h2 className="text-xl font-black">Resumen del pedido</h2><div className="mt-6 space-y-4 text-sm"><SummaryRow label={"Diseños personalizados × " + itemCount} value={merchandiseSubtotal} /><div className="flex justify-between text-white/70"><span>Entrega {items[0].card.delivery === "express" ? "express" : "normal"}</span>{delivery ? <Price value={delivery} /> : <span className="font-black text-[#f8c75e]">Gratis</span>}</div></div><div className={freeShipping ? "mt-5 flex items-start gap-2 rounded-xl bg-[#24714b]/25 px-3 py-2.5 text-xs font-bold text-[#bde9cc]" : "mt-5 flex items-start gap-2 rounded-xl bg-white/10 px-3 py-2.5 text-xs font-bold text-white/70"}><Icon name="truck" size={15} /><span>{freeShipping ? "Envío gratis aplicado: tus productos suman 35 € o más." : <>Te faltan <Price value={amountUntilFreeShipping(merchandiseSubtotal)} /> en productos para conseguir envío gratis.</>}</span></div><div className="mt-6 flex gap-2"><input value={discount} onChange={(event) => setDiscount(event.target.value)} placeholder="Código de descuento" className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-xs text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#f8c75e]" /><button type="button" onClick={() => { dispatch(setDiscountCode(discount)); setToast(discount.toUpperCase() === "HOLA10" ? "Descuento aplicado." : "Código guardado para revisar."); }} className="rounded-xl bg-white/10 px-3 text-xs font-black hover:bg-white/20">Aplicar</button></div>{discountValue > 0 && <div className="mt-3 flex justify-between text-sm text-[#f8c75e]"><span>Descuento HOLA10</span><span>−<Price value={discountValue} /></span></div>}<div className="mt-7 flex justify-between border-t border-white/10 pt-5 text-xl font-black"><span>Total</span><Price value={total} /></div><Link href="/checkout" className="focus-ring mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#ee5264] px-5 py-3.5 text-sm font-black text-white transition hover:bg-[#d83d54]">Continuar al checkout <Icon name="arrow" size={16} /></Link><p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-white/50"><Icon name="lock" size={12} /> Pago de demostración; no se realiza ningún cargo.</p></aside></div></div></main><SiteFooter />{toast && <Toast message={toast} onClose={() => setToast("")} />}</>;
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return <div className="flex justify-between text-white/70"><span>{label}</span><Price value={value} /></div>;
}
