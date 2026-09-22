"use client";

import Link from "next/link";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CardPreview } from "@/components/card-preview";
import { Icon } from "@/components/icons";
import { PageIntro, Price, SiteFooter, SiteHeader, StatusBadge, Toast } from "@/components/site";
import { ENVELOPE_TEXT_PRICE, PACKAGING_PRICES, SIZE_PRICES, STICKER_PRICES, templates } from "@/lib/data";
import { amountUntilFreeShipping, getDeliveryPrice, qualifiesForFreeShipping } from "@/lib/shipping";
import { RootState, setDiscountCode, setEnvelopeTextAdded, setStickerQuantity } from "@/lib/store";
import { getTemplatePrice, useMockDb } from "@/lib/mock-store";

export default function CartPage() {
  const cart = useSelector((state: RootState) => state.cart);
  const dispatch = useDispatch();
  const db = useMockDb();
  const [toast, setToast] = useState("");
  const [discount, setDiscount] = useState(cart.discountCode);
  const template = templates.find((item) => item.id === cart.card.templateId) || templates[0];
  const templatePrice = getTemplatePrice(template.id, db);
  const packagingPrice = PACKAGING_PRICES[cart.card.packaging];
  const sizePrice = SIZE_PRICES[cart.card.size];
  const stickerPrice = STICKER_PRICES[cart.stickerQuantity];
  const envelopePrice = cart.envelopeTextAdded ? ENVELOPE_TEXT_PRICE : 0;
  const merchandiseSubtotal = templatePrice + packagingPrice + sizePrice + stickerPrice + envelopePrice;
  const freeShipping = qualifiesForFreeShipping(merchandiseSubtotal);
  const delivery = getDeliveryPrice(cart.card.delivery, merchandiseSubtotal);
  const subtotal = merchandiseSubtotal + delivery;
  const discountValue = discount.trim().toUpperCase() === "HOLA10" ? subtotal * .1 : 0;
  const total = subtotal - discountValue;

  return <>
    <SiteHeader active="" />
    <main className="bg-[#fffaf5] py-14 md:py-20"><div className="container">
      <PageIntro eyebrow="CASI ESTÁ" title="Tu selección" body="Una última mirada para asegurarnos de que todo está como quieres." />
      <div className="mt-12 grid gap-7 lg:grid-cols-[1.25fr_.75fr]">
        <section className="space-y-4">
          <div className="rounded-[24px] border border-[#eadbd3] bg-white p-4 sm:p-6"><div className="flex flex-col gap-5 sm:flex-row">
            <div className="w-full max-w-[190px] shrink-0 rounded-2xl bg-[#f8efe8] p-3"><CardPreview compact templateId={template.id} message={cart.card.message} emojiElements={cart.card.emojiElements} photoDataUrls={cart.card.photoDataUrls} photoZoom={cart.card.photoZoom} photoPosition={cart.card.photoPosition} /></div>
            <div className="flex-1"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#ee5264]">{template.eyebrow}</p><h2 className="mt-1 text-xl font-black">{template.name}</h2><p className="mt-2 text-sm text-[#737b90]">{cart.card.size} · {cart.card.recipientMode === "recipient" ? "Entrega directa al destinatario" : "Entrega a mi dirección"}</p></div><Link href="/customize" className="flex h-9 w-9 items-center justify-center rounded-full border border-[#dfd3cc] hover:border-[#ee5264]" aria-label="Editar tarjeta"><Icon name="edit" size={15} /></Link></div><div className="mt-6 flex items-center justify-between border-t border-[#eadbd3] pt-4"><StatusBadge tone={cart.card.delivery === "express" ? "amber" : "green"}>{cart.card.delivery === "express" ? "Express · 1–2 días" : "Normal · 3–5 días"}</StatusBadge><span className="font-black"><Price value={templatePrice + packagingPrice} /></span></div></div>
          </div></div>

          {cart.stickerQuantity > 0 && <CartItem icon={<div className="h-14 w-14 overflow-hidden rounded-full border-4 border-[#f8c75e] bg-[#fff0e8]"><img src={cart.stickerImage || "/images/sticker-dog.jpg"} alt="Sticker personalizado" className="h-full w-full object-cover" /></div>} title={`Sticker personalizado × ${cart.stickerQuantity}`} detail="Diámetro de 3 pulgadas · 7,62 cm" price={stickerPrice} onRemove={() => { dispatch(setStickerQuantity(0)); setToast("Sticker eliminado"); }} />}

          {cart.envelopeTextAdded && <CartItem icon={<span className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#fff0e8] text-2xl">✍️</span>} title="Texto personalizado en el sobre" detail={`“${cart.envelopeText}”`} price={ENVELOPE_TEXT_PRICE} onRemove={() => { dispatch(setEnvelopeTextAdded(false)); setToast("Texto del sobre eliminado"); }} />}

          <Link href="/addons" className="inline-flex items-center gap-2 px-2 pt-2 text-sm font-black text-[#ee5264] hover:text-[#d83d54]"><Icon name="plus" size={15} /> Añadir más extras</Link>
        </section>

        <aside className="h-fit rounded-[24px] bg-[#182443] p-6 text-white sm:p-7"><h2 className="text-xl font-black">Resumen del pedido</h2><div className="mt-6 space-y-4 text-sm">
          <SummaryRow label="Tarjeta personalizada" value={templatePrice} />
          <SummaryRow label={cart.card.packaging === "gift" ? "Packaging regalo" : "Sobre estándar"} value={packagingPrice} />
          <SummaryRow label={`Formato ${cart.card.size}`} value={sizePrice} />
          {cart.stickerQuantity > 0 && <SummaryRow label={`Sticker × ${cart.stickerQuantity}`} value={stickerPrice} />}
          {cart.envelopeTextAdded && <SummaryRow label="Texto en el sobre" value={ENVELOPE_TEXT_PRICE} />}
          <div className="flex justify-between text-white/70"><span>Entrega {cart.card.delivery === "express" ? "express" : "normal"}</span>{delivery ? <Price value={delivery} /> : <span className="font-black text-[#f8c75e]">Gratis</span>}</div>
        </div><div className={`mt-5 flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs font-bold ${freeShipping ? "bg-[#24714b]/25 text-[#bde9cc]" : "bg-white/10 text-white/70"}`}><Icon name="truck" size={15} /><span>{freeShipping ? "Envío gratis aplicado: tus productos suman 35 € o más." : <>Te faltan <Price value={amountUntilFreeShipping(merchandiseSubtotal)} /> en productos para conseguir envío gratis.</>}</span></div><div className="mt-6 flex gap-2"><input value={discount} onChange={(event) => setDiscount(event.target.value)} placeholder="Código de descuento" className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-xs text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#f8c75e]" /><button onClick={() => { dispatch(setDiscountCode(discount)); setToast(discount.toUpperCase() === "HOLA10" ? "Descuento aplicado" : "Código guardado para revisar"); }} className="rounded-xl bg-white/10 px-3 text-xs font-black hover:bg-white/20">Aplicar</button></div>{discountValue > 0 && <div className="mt-3 flex justify-between text-sm text-[#f8c75e]"><span>Descuento HOLA10</span><span>−<Price value={discountValue} /></span></div>}<div className="mt-7 flex justify-between border-t border-white/10 pt-5 text-xl font-black"><span>Total</span><Price value={total} /></div><Link href="/checkout" className="focus-ring mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#ee5264] px-5 py-3.5 text-sm font-black text-white transition hover:bg-[#d83d54]">Continuar al checkout <Icon name="arrow" size={16} /></Link><p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-white/50"><Icon name="lock" size={12} /> Elige entrega normal o express en checkout</p></aside>
      </div>
    </div></main>
    <SiteFooter />
    {toast && <Toast message={toast} onClose={() => setToast("")} />}
  </>;
}

function CartItem({ icon, title, detail, price, onRemove }: { icon: React.ReactNode; title: string; detail: string; price: number; onRemove: () => void }) {
  return <div className="flex items-center justify-between gap-4 rounded-[20px] border border-[#eadbd3] bg-white p-5"><div className="flex min-w-0 items-center gap-4">{icon}<div className="min-w-0"><p className="text-sm font-black">{title}</p><p className="mt-1 line-clamp-2 text-xs text-[#737b90]">{detail}</p></div></div><div className="flex shrink-0 items-center gap-4"><span className="font-black"><Price value={price} /></span><button onClick={onRemove} className="text-[#9297a4] hover:text-[#ee5264]" aria-label={`Eliminar ${title}`}><Icon name="trash" size={16} /></button></div></div>;
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return <div className="flex justify-between text-white/70"><span>{label}</span><Price value={value} /></div>;
}
