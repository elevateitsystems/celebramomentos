"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Icon } from "@/components/icons";
import { PageIntro, SiteFooter, SiteHeader } from "@/components/site";
import { createMockMessage, getCurrentUser, useMockDb } from "@/lib/mock-store";

const schema = z.object({ name: z.string().min(2, "Escribe tu nombre"), email: z.string().email("Introduce un email válido"), subject: z.string().min(3, "Añade un asunto"), message: z.string().min(10, "Cuéntanos un poco más") });
type Form = z.infer<typeof schema>;

export default function ContactPage() {
  const db = useMockDb();
  const user = getCurrentUser(db);
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: user ? { name: user.name, email: user.email } : undefined });
  const submit = (data: Form) => { createMockMessage({ userId: user?.id || null, name: data.name, email: data.email, subject: data.subject, text: data.message }); setSent(true); reset({ name: data.name, email: data.email, subject: "", message: "" }); };
  return <><SiteHeader active="Ayuda" /><main className="bg-[#fffaf5] py-16 md:py-24"><div className="container"><PageIntro eyebrow="ESTAMOS PARA AYUDARTE" title="Hablemos" body="Tu mensaje se guarda en este navegador para que el equipo pueda responderte desde el panel demo." /><div className="mx-auto mt-12 grid max-w-[930px] gap-7 md:grid-cols-[.72fr_1.28fr]"><aside className="rounded-[24px] bg-[#182443] p-6 text-white sm:p-8"><h2 className="text-xl font-black">Estamos cerca</h2><p className="mt-3 text-sm leading-6 text-white/65">Nuestro equipo responde de lunes a viernes, de 9:00 a 18:00.</p><div className="mt-10 space-y-5 text-sm"><div><p className="text-[10px] font-black uppercase tracking-[.15em] text-[#f8c75e]">Email</p><p className="mt-2 font-bold">hola@celebramomentos.com</p></div><div><p className="text-[10px] font-black uppercase tracking-[.15em] text-[#f8c75e]">Seguimiento</p><p className="mt-2 font-bold">Consulta tus respuestas en Mi cuenta.</p></div></div></aside>{sent ? <div className="rounded-[24px] border border-[#eadbd3] bg-white p-8 text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#e8f5ed] text-[#24714b]"><Icon name="check" size={28} /></div><h2 className="serif mt-6 text-4xl font-bold">Mensaje recibido.</h2><p className="mt-4 text-sm leading-7 text-[#737b90]">El mensaje ya está disponible para el equipo en el panel de administración. Cuando respondan, lo verás en Mi cuenta.</p><button onClick={() => setSent(false)} className="mt-7 rounded-full bg-[#182443] px-5 py-3.5 text-sm font-black text-white">Enviar otro mensaje</button></div> : <form onSubmit={handleSubmit(submit)} className="rounded-[24px] border border-[#eadbd3] bg-white p-6 sm:p-8"><div className="grid gap-4 sm:grid-cols-2"><Field label="Nombre" error={errors.name?.message}><input {...register("name")} className="field" placeholder="María García" /></Field><Field label="Email" error={errors.email?.message}><input {...register("email")} className="field" placeholder="hola@ejemplo.com" /></Field></div><Field label="Asunto" error={errors.subject?.message}><input {...register("subject")} className="field" placeholder="Tengo una duda sobre mi pedido" /></Field><Field label="Mensaje" error={errors.message?.message}><textarea {...register("message")} rows={5} className="field resize-none" placeholder="Cuéntanos cómo podemos ayudarte…" /></Field><button disabled={isSubmitting} className="focus-ring mt-5 inline-flex items-center gap-2 rounded-full bg-[#ee5264] px-5 py-3.5 text-sm font-black text-white disabled:opacity-60">Guardar mensaje <Icon name="arrow" size={16} /></button></form>}</div></div></main><SiteFooter /></>;
}
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <label className="mt-4 block text-sm font-black first:mt-0">{label}{children}{error && <span className="mt-1 block text-xs font-bold text-[#c94758]">{error}</span>}</label>; }
