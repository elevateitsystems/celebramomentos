"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { BrandLoader } from "@/components/loading";
import { clearSessionUser, getSessionUser } from "@/lib/client-session";
import { PageIntro, Price, SiteFooter, SiteHeader, StatusBadge, Toast } from "@/components/site";

type User = { id: string; name: string; email: string; phone?: string | null };
type Order = { id: string; amount: number; date: string; item: string; status: string };
type Message = { id: string; subject: string; status: string; messages: { id: string; author: string; text: string }[] };

export default function AccountPage() {
  const router = useRouter();
  const [returnTo, setReturnTo] = useState("/account");
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const loadAccount = async (refresh = false) => {
    const sessionUser = await getSessionUser({ refresh });
    if (!sessionUser) { setUser(null); return; }
    setUser(sessionUser); setName(sessionUser.name); setEmail(sessionUser.email);
    const [ordersResponse, messagesResponse] = await Promise.all([fetch("/api/orders", { cache: "no-store" }), fetch("/api/contact", { cache: "no-store" })]);
    if (ordersResponse.ok) setOrders((await ordersResponse.json()).orders || []);
    if (messagesResponse.ok) setMessages((await messagesResponse.json()).messages || []);
  };

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("returnTo");
    // Only allow same-site paths to avoid open redirects after login.
    setReturnTo(requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/account");
    loadAccount().catch(() => setError("No hemos podido cargar tu cuenta. Inténtalo de nuevo.")).finally(() => setChecking(false));
  }, []);

  const submitAuth = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch(mode === "login" ? "/api/auth/login" : "/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(mode === "login" ? { email, password } : { name, email, password }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "No se pudo completar la operación");
      await loadAccount(true); setToast(mode === "login" ? "Sesión iniciada." : "Cuenta creada correctamente.");
      if (returnTo !== "/account") router.push(returnTo);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudo completar la operación"); }
    finally { setBusy(false); }
  };

  const logout = async () => { await fetch("/api/auth/logout", { method: "POST" }); clearSessionUser(); setUser(null); setOrders([]); setMessages([]); setToast("Sesión cerrada."); };
  const saveProfile = async () => {
    setBusy(true); setError("");
    try { const response = await fetch("/api/auth/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email }) }); const body = await response.json(); if (!response.ok) throw new Error(body.error || "No se pudo guardar el perfil"); void getSessionUser({ refresh: true }); setUser(body.user); setEditing(false); setToast("Perfil actualizado."); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudo guardar el perfil"); }
    finally { setBusy(false); }
  };

  if (checking) return <><SiteHeader active="Mi cuenta" /><main className="bg-[#fffaf5] px-5 py-16 md:py-24"><PageIntro eyebrow="TU ESPACIO PERSONAL" title="Qué alegría verte" /><div className="mx-auto mt-10 max-w-[470px] rounded-[28px] border border-[#eadbd3] bg-white p-6 sm:p-8"><BrandLoader compact label="Comprobando tu sesión…" /></div></main><SiteFooter /></>;

  if (!user) return <><SiteHeader active="Mi cuenta" /><main className="bg-[#fffaf5] px-5 py-16 md:py-24"><PageIntro eyebrow="TU ESPACIO PERSONAL" title="Qué alegría verte" body="Regístrate o entra para guardar tu perfil, consultar pedidos y hablar con nuestro equipo." /><div className="mx-auto mt-10 max-w-[470px] rounded-[28px] border border-[#eadbd3] bg-white p-6 shadow-[0_20px_60px_rgba(24,36,67,.08)] sm:p-8"><div className="mb-7 grid grid-cols-2 rounded-full bg-[#fff5ef] p-1 text-center text-sm font-black"><button type="button" onClick={() => { setMode("login"); setError(""); }} className={`rounded-full px-4 py-2.5 ${mode === "login" ? "bg-[#182443] text-white" : "text-[#737b90]"}`}>Iniciar sesión</button><button type="button" onClick={() => { setMode("register"); setError(""); }} className={`rounded-full px-4 py-2.5 ${mode === "register" ? "bg-[#182443] text-white" : "text-[#737b90]"}`}>Crear cuenta</button></div><form onSubmit={submitAuth} className="space-y-4">{mode === "register" && <Field label="Nombre completo"><input required value={name} onChange={(event) => setName(event.target.value)} className="field" placeholder="María García" /></Field>}<Field label="Email"><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="field" placeholder="hola@ejemplo.com" /></Field><Field label="Contraseña"><input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="field" placeholder="Mínimo 6 caracteres" /></Field>{error && <p className="rounded-xl bg-[#fff0e8] px-3 py-2.5 text-xs font-bold text-[#c94758]">{error}</p>}<button disabled={busy} className="focus-ring flex w-full items-center justify-center gap-2 rounded-full bg-[#ee5264] px-5 py-3.5 text-sm font-black text-white disabled:opacity-60">{busy ? "Procesando…" : mode === "login" ? "Entrar en mi cuenta" : "Crear mi cuenta"}<Icon name="arrow" size={16} /></button></form></div></main><SiteFooter />{toast && <Toast message={toast} onClose={() => setToast("")} />}</>;

  return <><SiteHeader active="Mi cuenta" /><main className="bg-[#fffaf5] px-5 py-12 md:py-20"><div className="container"><div className="flex flex-col gap-5 border-b border-[#eadbd3] pb-8 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-black tracking-[.2em] text-[#ee5264]">MI CUENTA</p><h1 className="serif mt-2 text-4xl font-bold tracking-[-.04em] sm:text-5xl">Hola, {user.name.split(" ")[0]}.</h1><p className="mt-3 text-sm text-[#737b90]">Tus datos, pedidos y conversaciones están guardados en tu cuenta.</p></div><button onClick={() => void logout()} className="focus-ring self-start rounded-full border border-[#dfd3cc] bg-white px-4 py-2.5 text-xs font-black sm:self-auto">Cerrar sesión</button></div><div className="mt-8 grid gap-4 sm:grid-cols-3"><Stat icon="bag" value={String(orders.length)} label="Pedidos realizados" /><Stat icon="heart" value="3" label="Plantillas disponibles" /><Stat icon="truck" value="ES · PT" label="Entregas disponibles" /></div><div className="mt-8 grid gap-7 lg:grid-cols-[.72fr_1.28fr]"><div className="space-y-7"><section className="rounded-[24px] border border-[#eadbd3] bg-white p-6 sm:p-7"><div className="flex items-center justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#ee5264]">Perfil</p><h2 className="serif mt-2 text-2xl font-bold">Tus datos</h2></div><button onClick={() => setEditing(!editing)} className="text-xs font-black text-[#182443]">{editing ? "Cancelar" : "Editar"}</button></div><div className="mt-6 flex items-center gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f8c75e] text-lg font-black text-[#182443]">{user.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</div><div><p className="font-black">{user.name}</p><p className="text-sm text-[#737b90]">Cuenta verificada</p></div></div><div className="mt-6 space-y-4"><Field label="Nombre"><input disabled={!editing} value={name} onChange={(event) => setName(event.target.value)} className="field disabled:bg-[#faf7f4] disabled:text-[#737b90]" /></Field><Field label="Email"><input disabled={!editing} type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="field disabled:bg-[#faf7f4] disabled:text-[#737b90]" /></Field></div>{editing && <button disabled={busy} onClick={() => void saveProfile()} className="mt-5 rounded-full bg-[#182443] px-4 py-3 text-xs font-black text-white disabled:opacity-60">Guardar cambios</button>}{error && <p className="mt-3 text-xs font-bold text-[#c94758]">{error}</p>}</section><section className="rounded-[24px] bg-[#182443] p-6 text-white sm:p-7"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-[#f8c75e]"><Icon name="spark" size={19} /></div><h2 className="mt-5 text-xl font-black">¿Necesitas ayuda?</h2><p className="mt-2 text-sm leading-6 text-white/65">Escríbenos y podrás ver la respuesta del equipo aquí mismo.</p><Link href="/contact" className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[#f8c75e]">Contactar con el equipo <Icon name="arrow" size={15} /></Link></section></div><section className="rounded-[24px] border border-[#eadbd3] bg-white p-6 sm:p-7"><div className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#ee5264]">Historial</p><h2 className="serif mt-2 text-2xl font-bold">Tus pedidos</h2></div><span className="text-xs font-bold text-[#9297a4]">{orders.length} pedidos</span></div>{orders.length === 0 ? <div className="mt-8 rounded-2xl bg-[#fffaf5] p-6 text-center"><p className="font-black">Todavía no tienes pedidos</p><Link href="/templates" className="mt-4 inline-flex rounded-full bg-[#ee5264] px-4 py-3 text-xs font-black text-white">Ver plantillas</Link></div> : <div className="mt-6 divide-y divide-[#f0e6df]">{orders.map((order) => <div key={order.id} className="flex flex-col gap-3 py-5 first:pt-0 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="font-black">{order.id}</p><StatusBadge tone={order.status === "Entregado" ? "green" : order.status === "Cancelado" ? "rose" : "amber"}>{order.status}</StatusBadge></div><p className="mt-1 text-sm text-[#737b90]">{order.item} · {new Date(order.date).toLocaleDateString("es-ES")}</p></div><Price value={order.amount} /></div>)}</div>}<div className="mt-9 border-t border-[#eadbd3] pt-7"><div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#ee5264]">Mensajes</p><h2 className="serif mt-2 text-2xl font-bold">Conversaciones con el equipo</h2></div><Link href="/contact" className="text-xs font-black text-[#ee5264]">Nuevo mensaje</Link></div>{messages.length === 0 ? <p className="mt-5 text-sm text-[#737b90]">No hay conversaciones todavía.</p> : <div className="mt-5 space-y-4">{messages.map((message) => <div key={message.id} className="rounded-2xl border border-[#eadbd3] p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-black">{message.subject}</p><StatusBadge tone={message.status === "replied" ? "green" : "amber"}>{message.status === "replied" ? "Respondido" : "Abierto"}</StatusBadge></div>{message.messages.map((entry) => <div key={entry.id} className={`mt-3 rounded-xl px-3 py-2.5 text-sm ${entry.author === "admin" ? "bg-[#e8f5ed]" : "bg-[#fff7f1]"}`}>{entry.text}</div>)}</div>)}</div>}</div></section></div></div></main><SiteFooter />{toast && <Toast message={toast} onClose={() => setToast("")} />}</>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-xs font-black text-[#182443]">{label}{children}</label>; }
function Stat({ icon, value, label }: { icon: "bag" | "heart" | "truck"; value: string; label: string }) { return <div className="flex items-center gap-4 rounded-[20px] border border-[#eadbd3] bg-white p-5"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff5ef] text-[#ee5264]"><Icon name={icon} size={19} /></div><div><p className="text-2xl font-black tracking-[-.04em] text-[#182443]">{value}</p><p className="text-xs text-[#737b90]">{label}</p></div></div>; }
