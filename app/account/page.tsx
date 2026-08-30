"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { PageIntro, SiteFooter, SiteHeader, StatusBadge, Toast } from "@/components/site";
import { mockOrders } from "@/lib/data";

type AuthMode = "login" | "register" | "forgot";

export default function AccountPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [loggedIn, setLoggedIn] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [email, setEmail] = useState("maria.garcia@email.com");
  const [profileName, setProfileName] = useState("María García");
  const [profileEmail, setProfileEmail] = useState(email);
  const [editingProfile, setEditingProfile] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<(typeof mockOrders)[number] | null>(null);
  const [toast, setToast] = useState("");

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  }

  function submitAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "forgot") {
      setForgotSent(true);
      return;
    }
    setLoggedIn(true);
    showToast(mode === "login" ? "Bienvenida de nuevo, María." : "Cuenta creada en modo demostración.");
  }

  if (!loggedIn) {
    return <>
      <SiteHeader active="Mi cuenta" />
      <main className="bg-[#fffaf5] px-5 py-16 md:py-24">
        <PageIntro eyebrow="TU ESPACIO PERSONAL" title={mode === "forgot" ? "Recupera tu acceso" : "Qué alegría verte"} body={mode === "forgot" ? "Te enviaremos un enlace de demostración para recuperar tu cuenta." : "Guarda tus diseños, consulta tus pedidos y vuelve a crear momentos especiales."} />
        <div className="mx-auto mt-10 max-w-[470px] rounded-[28px] border border-[#eadbd3] bg-white p-6 shadow-[0_20px_60px_rgba(24,36,67,.08)] sm:p-8">
          {mode !== "forgot" && <div className="mb-7 grid grid-cols-2 rounded-full bg-[#fff5ef] p-1 text-center text-sm font-black"><button type="button" onClick={() => setMode("login")} className={`rounded-full px-4 py-2.5 transition ${mode === "login" ? "bg-[#182443] text-white" : "text-[#737b90]"}`}>Iniciar sesión</button><button type="button" onClick={() => setMode("register")} className={`rounded-full px-4 py-2.5 transition ${mode === "register" ? "bg-[#182443] text-white" : "text-[#737b90]"}`}>Crear cuenta</button></div>}
          {forgotSent ? <div className="py-5 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#e8f5ed] text-[#24714b]"><Icon name="check" size={25} /></div><h2 className="serif mt-5 text-3xl font-bold">Revisa tu email</h2><p className="mt-3 text-sm leading-6 text-[#737b90]">Hemos preparado un enlace de recuperación para <strong className="text-[#182443]">{email}</strong>. Es una simulación frontend por ahora.</p><button type="button" onClick={() => { setForgotSent(false); setMode("login"); }} className="mt-6 text-sm font-black text-[#ee5264]">Volver a iniciar sesión</button></div> : <form onSubmit={submitAuth} className="space-y-4">
            {mode === "register" && <Field label="Nombre completo"><input required value={profileName} onChange={(event) => setProfileName(event.target.value)} className="field" placeholder="María García" /></Field>}
            <Field label="Email"><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="field" placeholder="hola@ejemplo.com" /></Field>
            {mode !== "forgot" && <Field label="Contraseña"><input required minLength={6} type="password" className="field" placeholder="Mínimo 6 caracteres" /></Field>}
            <button className="focus-ring flex w-full items-center justify-center gap-2 rounded-full bg-[#ee5264] px-5 py-3.5 text-sm font-black text-white transition hover:bg-[#d83d54]">{mode === "forgot" ? "Enviar enlace" : mode === "login" ? "Entrar en mi cuenta" : "Crear mi cuenta"}<Icon name="arrow" size={16} /></button>
            {mode === "login" && <button type="button" onClick={() => { setMode("forgot"); setForgotSent(false); }} className="block w-full pt-1 text-center text-xs font-black text-[#737b90] transition hover:text-[#ee5264]">¿Has olvidado tu contraseña?</button>}
            {mode === "forgot" && <button type="button" onClick={() => setMode("login")} className="block w-full pt-1 text-center text-xs font-black text-[#737b90] transition hover:text-[#ee5264]">Volver a iniciar sesión</button>}
            <p className="pt-3 text-center text-[11px] leading-5 text-[#9297a4]">Cuenta de demostración frontend · Sin autenticación real ni envío de emails.</p>
          </form>}
        </div>
      </main>
      <SiteFooter />
    </>;
  }

  return <>
    <SiteHeader active="Mi cuenta" />
    <main className="bg-[#fffaf5] px-5 py-12 md:py-20">
      <div className="container">
        <div className="flex flex-col gap-5 border-b border-[#eadbd3] pb-8 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-black tracking-[.2em] text-[#ee5264]">MI CUENTA</p><h1 className="serif mt-2 text-4xl font-bold tracking-[-.04em] sm:text-5xl">Hola, María.</h1><p className="mt-3 text-sm text-[#737b90]">Todo lo que necesitas para seguir celebrando momentos.</p></div><button onClick={() => { setLoggedIn(false); setMode("login"); }} className="focus-ring self-start rounded-full border border-[#dfd3cc] bg-white px-4 py-2.5 text-xs font-black text-[#182443] transition hover:border-[#ee5264] sm:self-auto">Cerrar sesión</button></div>
        <div className="mt-8 grid gap-4 sm:grid-cols-3"><Stat icon="bag" value="3" label="Pedidos realizados" /><Stat icon="heart" value="2" label="Diseños guardados" /><Stat icon="truck" value="ES · PT" label="Entregas disponibles" /></div>
        <div className="mt-8 grid gap-7 lg:grid-cols-[.72fr_1.28fr]">
          <div className="space-y-7">
            <section className="rounded-[24px] border border-[#eadbd3] bg-white p-6 sm:p-7"><div className="flex items-center justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#ee5264]">Perfil</p><h2 className="serif mt-2 text-2xl font-bold">Tus datos</h2></div><button onClick={() => setEditingProfile(!editingProfile)} className="focus-ring inline-flex items-center gap-2 text-xs font-black text-[#182443] hover:text-[#ee5264]"><Icon name="edit" size={15} />{editingProfile ? "Cancelar" : "Editar"}</button></div><div className="mt-6 flex items-center gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f8c75e] text-lg font-black text-[#182443]">MG</div><div><p className="font-black">{profileName}</p><p className="text-sm text-[#737b90]">Cliente desde mayo de 2025</p></div></div><div className="mt-6 space-y-4"><Field label="Nombre"><input disabled={!editingProfile} value={profileName} onChange={(event) => setProfileName(event.target.value)} className="field disabled:bg-[#faf7f4] disabled:text-[#737b90]" /></Field><Field label="Email"><input disabled={!editingProfile} type="email" value={profileEmail} onChange={(event) => setProfileEmail(event.target.value)} className="field disabled:bg-[#faf7f4] disabled:text-[#737b90]" /></Field></div>{editingProfile && <button onClick={() => { setEditingProfile(false); showToast("Perfil actualizado correctamente."); }} className="mt-5 rounded-full bg-[#182443] px-4 py-3 text-xs font-black text-white transition hover:bg-[#29375c]">Guardar cambios</button>}</section>
            <section className="rounded-[24px] bg-[#182443] p-6 text-white sm:p-7"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-[#f8c75e]"><Icon name="spark" size={19} /></div><h2 className="mt-5 text-xl font-black">¿Necesitas ayuda?</h2><p className="mt-2 text-sm leading-6 text-white/65">Estamos aquí para ayudarte con tu diseño, tu pedido o cualquier detalle especial.</p><Link href="/contact" className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[#f8c75e]">Contactar con el equipo <Icon name="arrow" size={15} /></Link></section>
          </div>
          <section className="rounded-[24px] border border-[#eadbd3] bg-white p-6 sm:p-7"><div className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#ee5264]">Historial</p><h2 className="serif mt-2 text-2xl font-bold">Tus pedidos</h2></div><span className="text-xs font-bold text-[#9297a4]">{mockOrders.length} pedidos</span></div><div className="mt-6 divide-y divide-[#f0e6df]">{mockOrders.map((order) => <div key={order.id} className="flex flex-col gap-4 py-5 first:pt-0 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#fff5ef] text-[#ee5264]"><Icon name="bag" size={19} /></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-black">{order.id}</p><StatusBadge tone={order.status === "Entregado" ? "green" : "amber"}>{order.status}</StatusBadge></div><p className="mt-1 truncate text-sm text-[#737b90]">{order.item} · {order.date}</p></div></div><div className="flex items-center justify-between gap-4 sm:justify-end"><p className="text-sm font-black text-[#182443]">{order.amount}</p><button onClick={() => setSelectedOrder(order)} className="focus-ring inline-flex items-center gap-1 text-xs font-black text-[#ee5264]">Ver detalle <Icon name="arrow" size={13} /></button></div></div>)}</div></section>
        </div>
      </div>
    </main>
    <SiteFooter />
    {selectedOrder && <OrderDialog order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
    {toast && <Toast message={toast} onClose={() => setToast("")} />}
  </>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-xs font-black text-[#182443]">{label}{children}</label>; }
function Stat({ icon, value, label }: { icon: "bag" | "heart" | "truck"; value: string; label: string }) { return <div className="flex items-center gap-4 rounded-[20px] border border-[#eadbd3] bg-white p-5"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff5ef] text-[#ee5264]"><Icon name={icon} size={19} /></div><div><p className="text-2xl font-black tracking-[-.04em] text-[#182443]">{value}</p><p className="text-xs text-[#737b90]">{label}</p></div></div>; }

function OrderDialog({ order, onClose }: { order: (typeof mockOrders)[number]; onClose: () => void }) {
  const delivered = order.status === "Entregado";
  const steps = ["Pedido realizado", "Preparando", "Preparado", "Enviado", "Entregado"];
  const current = delivered ? 4 : 3;
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#182443]/45 p-0 sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-label={`Detalle del pedido ${order.id}`}><div className="max-h-[90vh] w-full overflow-y-auto rounded-t-[28px] bg-white p-6 shadow-2xl sm:max-w-[530px] sm:rounded-[28px] sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#ee5264]">Detalle del pedido</p><h2 className="serif mt-2 text-3xl font-bold">{order.id}</h2><p className="mt-2 text-sm text-[#737b90]">Realizado el {order.date}</p></div><button onClick={onClose} aria-label="Cerrar detalle" className="focus-ring flex h-9 w-9 items-center justify-center rounded-full bg-[#fff5ef] text-[#182443]"><Icon name="close" size={17} /></button></div><div className="mt-7 rounded-2xl bg-[#fffaf5] p-4"><div className="flex items-center justify-between gap-3"><div><p className="font-black">{order.item}</p><p className="mt-1 text-xs text-[#737b90]">Entrega {order.delivery} · Pago {order.payment}</p></div><p className="font-black text-[#182443]">{order.amount}</p></div></div><div className="mt-8"><p className="text-xs font-black uppercase tracking-[.14em] text-[#182443]">Estado del pedido</p><div className="mt-5 space-y-0">{steps.map((step, index) => <div key={step} className="flex gap-4"><div className="flex flex-col items-center"><div className={`z-10 flex h-8 w-8 items-center justify-center rounded-full ${index <= current ? "bg-[#ee5264] text-white" : "border border-[#dfd3cc] bg-white text-[#9297a4]"}`}>{index <= current ? <Icon name="check" size={14} /> : <span className="h-2 w-2 rounded-full bg-current" />}</div>{index < steps.length - 1 && <div className={`-mt-1 h-9 w-px ${index < current ? "bg-[#ee5264]" : "bg-[#eadbd3]"}`} />}</div><div className="pb-4 pt-1"><p className={`text-sm font-black ${index <= current ? "text-[#182443]" : "text-[#9297a4]"}`}>{step}</p>{index === current && <p className="mt-1 text-xs text-[#ee5264]">Estado actual</p>}</div></div>)}</div></div><button onClick={onClose} className="mt-5 w-full rounded-full bg-[#182443] px-5 py-3.5 text-sm font-black text-white">Cerrar</button></div></div>;
}
