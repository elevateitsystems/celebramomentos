"use client";

import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Icon } from "@/components/icons";
import { SiteFooter, SiteHeader } from "@/components/site";
import { createMockMessage, getCurrentUser, useMockDb } from "@/lib/mock-store";

const schema = z.object({
  name: z.string().min(2, "Escribe tu nombre"),
  email: z.string().email("Introduce un email válido"),
  subject: z.string().min(3, "Añade un asunto"),
  message: z.string().min(10, "Cuéntanos un poco más"),
});
type Form = z.infer<typeof schema>;

const MAX_MESSAGE = 600;

const topics = [
  { label: "Mi pedido", subject: "Tengo una duda sobre mi pedido" },
  { label: "Diseño y fotos", subject: "Necesito ayuda con mi diseño" },
  { label: "Envíos", subject: "Pregunta sobre el envío" },
  { label: "Regalos a medida", subject: "Quiero un regalo personalizado" },
];

export default function ContactPage() {
  const db = useMockDb();
  const user = getCurrentUser(db);
  const [sent, setSent] = useState(false);
  const [sentName, setSentName] = useState("");
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: user ? { name: user.name, email: user.email } : undefined,
  });

  const subject = watch("subject") || "";
  const messageLength = (watch("message") || "").length;

  const submit = (data: Form) => {
    createMockMessage({
      userId: user?.id || null,
      name: data.name,
      email: data.email,
      subject: data.subject,
      text: data.message,
    });
    setSentName(data.name.split(" ")[0]);
    setSent(true);
    reset({ name: data.name, email: data.email, subject: "", message: "" });
  };

  return (
    <>
      <SiteHeader active="Ayuda" />
      <main className="relative overflow-hidden bg-[#fffaf5]">
        <div className="pointer-events-none absolute -left-32 top-10 h-96 w-96 rounded-full bg-[#ee5264]/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 top-64 h-96 w-96 rounded-full bg-[#f8c75e]/15 blur-3xl" />

        <div className="container relative py-16 md:py-24">
          {/* Hero */}
          <div className="mx-auto max-w-[720px] text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#f0d3c9] bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[.2em] text-[#ee5264] shadow-sm">
              <ContactIcon name="sparkles" size={14} />
              Estamos para ayudarte
            </span>
            <h1 className="serif mt-6 text-5xl font-bold leading-[1] tracking-[-.05em] text-[#182443] sm:text-6xl lg:text-[68px]">
              Hablemos de tu{" "}
              <span className="text-[#ee5264]">próximo recuerdo.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-[540px] text-base leading-7 text-[#68718a]">
              Dudas sobre un pedido, ayuda con tu diseño o una idea de regalo a
              medida. Escríbenos y te respondemos con calma y con cariño.
            </p>
          </div>

          <div className="mx-auto mt-14 grid max-w-[1100px] gap-6 lg:grid-cols-[.78fr_1.22fr] lg:gap-8">
            {/* Info panel */}
            <aside className="relative flex flex-col overflow-hidden rounded-[32px] bg-[#182443] p-8 text-white shadow-2xl shadow-[#182443]/20 lg:p-10">
              <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#ee5264]/25 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-[#f8c75e]/15 blur-3xl" />

              <div className="relative">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-[11px] font-black text-white/90 ring-1 ring-white/15">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#5ad69a] opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#5ad69a]" />
                  </span>
                  Respondemos en menos de 24 h
                </span>
                <h2 className="serif mt-6 text-3xl font-bold leading-tight tracking-[-.02em] sm:text-[34px]">
                  Un equipo real, cerca de ti.
                </h2>
                <p className="mt-3 text-sm leading-7 text-white/65">
                  Cada mensaje lo lee una persona. Cuéntanos qué necesitas y lo
                  resolvemos juntos.
                </p>
              </div>

              <div className="relative mt-10 space-y-3">
                <InfoRow
                  icon="mail"
                  label="Email"
                  value="celebramomentos@outlook.com"
                  href="mailto:celebramomentos@outlook.com"
                />
                <InfoRow
                  icon="clock"
                  label="Horario"
                  value="Lunes a viernes · 9:00 – 18:00"
                />
                <InfoRow
                  icon="inbox"
                  label="Seguimiento"
                  value="Consulta tus respuestas en Mi cuenta"
                />
              </div>

              <div className="relative mt-auto pt-10">
                <div className="rounded-2xl border border-white/10 bg-white/[.06] p-5">
                  <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#f8c75e]">
                    Consejo
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/75">
                    Si es sobre un pedido, incluye tu número de pedido para que
                    podamos ayudarte más rápido.
                  </p>
                </div>
              </div>
            </aside>

            {/* Form / success */}
            {sent ? (
              <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-[32px] border border-[#eadbd3] bg-white p-10 text-center shadow-xl shadow-[#8a564c]/10 sm:p-14">
                <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#2f7d57]/10 blur-3xl" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-[#e8f5ed] text-[#24714b] ring-8 ring-[#e8f5ed]/50">
                  <Icon name="check" size={32} />
                </div>
                <h2 className="serif relative mt-8 text-4xl font-bold tracking-[-.03em] text-[#182443] sm:text-5xl">
                  {sentName ? `Gracias, ${sentName}.` : "Mensaje recibido."}
                </h2>
                <p className="relative mt-4 max-w-[400px] text-[15px] leading-7 text-[#68718a]">
                  Tu mensaje ya está en manos del equipo. Cuando respondan, lo
                  verás en{" "}
                  <strong className="font-black text-[#182443]">
                    Mi cuenta
                  </strong>
                  .
                </p>
                <button
                  onClick={() => setSent(false)}
                  className="focus-ring relative mt-8 inline-flex items-center gap-2 rounded-full bg-[#182443] px-7 py-4 text-sm font-black text-white shadow-lg shadow-[#182443]/20 transition hover:-translate-y-0.5 hover:bg-[#232f55]"
                >
                  Enviar otro mensaje
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit(submit)}
                noValidate
                className="relative overflow-hidden rounded-[32px] border border-[#eadbd3] bg-white p-7 shadow-xl shadow-[#8a564c]/10 sm:p-10"
              >
                <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-[#ee5264]/[.07] blur-3xl" />

                <div className="relative">
                  <h2 className="serif text-3xl font-bold tracking-[-.02em] text-[#182443]">
                    Escríbenos
                  </h2>
                  <p className="mt-2 text-sm text-[#737b90]">
                    Rellena el formulario y te contestamos lo antes posible.
                  </p>
                </div>

                <div className="relative mt-7">
                  <p className="text-[11px] font-black uppercase tracking-[.16em] text-[#9297a4]">
                    ¿Sobre qué quieres hablar?
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {topics.map((topic) => {
                      const active = subject === topic.subject;
                      return (
                        <button
                          key={topic.label}
                          type="button"
                          onClick={() =>
                            setValue("subject", topic.subject, {
                              shouldValidate: true,
                              shouldDirty: true,
                            })
                          }
                          className={`focus-ring rounded-full border px-4 py-2 text-[13px] font-black transition ${
                            active
                              ? "border-[#ee5264] bg-[#ee5264] text-white shadow-md shadow-[#ee5264]/20"
                              : "border-[#e6d8cf] bg-[#fffaf5] text-[#3f4863] hover:border-[#ee5264]/50 hover:text-[#ee5264]"
                          }`}
                        >
                          {topic.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="relative mt-7 grid gap-5 sm:grid-cols-2">
                  <Field label="Nombre" error={errors.name?.message}>
                    <input
                      {...register("name")}
                      className="field"
                      placeholder="María García"
                      autoComplete="name"
                    />
                  </Field>
                  <Field label="Email" error={errors.email?.message}>
                    <input
                      {...register("email")}
                      className="field"
                      placeholder="hola@ejemplo.com"
                      autoComplete="email"
                    />
                  </Field>
                </div>

                <div className="relative mt-5">
                  <Field label="Asunto" error={errors.subject?.message}>
                    <input
                      {...register("subject")}
                      className="field"
                      placeholder="Tengo una duda sobre mi pedido"
                    />
                  </Field>
                </div>

                <div className="relative mt-5">
                  <Field
                    label="Mensaje"
                    error={errors.message?.message}
                    aside={
                      <span
                        className={
                          messageLength > MAX_MESSAGE
                            ? "text-[#c94758]"
                            : "text-[#9297a4]"
                        }
                      >
                        {messageLength}/{MAX_MESSAGE}
                      </span>
                    }
                  >
                    <textarea
                      {...register("message")}
                      rows={6}
                      maxLength={MAX_MESSAGE}
                      className="field resize-none"
                      placeholder="Cuéntanos cómo podemos ayudarte…"
                    />
                  </Field>
                </div>

                <div className="relative mt-8 flex flex-col gap-4 border-t border-[#f0e4dc] pt-7 sm:flex-row sm:items-center sm:justify-between">
                  <p className="flex items-center gap-2 text-xs font-bold text-[#737b90]">
                    <span className="text-[#24714b]">
                      <ContactIcon name="shield" size={16} />
                    </span>
                    Tus datos solo se usan para responderte.
                  </p>
                  <button
                    disabled={isSubmitting}
                    className="focus-ring inline-flex items-center justify-center gap-3 rounded-full bg-[#ee5264] px-8 py-4 text-sm font-black text-white shadow-lg shadow-[#ee5264]/25 transition hover:-translate-y-0.5 hover:bg-[#d83d54] disabled:opacity-60 disabled:hover:translate-y-0"
                  >
                    Enviar mensaje <Icon name="arrow" size={16} />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function Field({
  label,
  error,
  aside,
  children,
}: {
  label: string;
  error?: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between text-[13px] font-black text-[#182443]">
        {label}
        {aside && <span className="text-[11px] font-bold">{aside}</span>}
      </span>
      <span className="mt-2 block">{children}</span>
      {error && (
        <span className="mt-1.5 block text-xs font-bold text-[#c94758]">
          {error}
        </span>
      )}
    </label>
  );
}

function InfoRow({
  icon,
  label,
  value,
  href,
}: {
  icon: string;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#f8c75e] ring-1 ring-white/10 transition group-hover:bg-[#f8c75e] group-hover:text-[#182443]">
        <ContactIcon name={icon} size={20} />
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-black uppercase tracking-[.16em] text-white/50">
          {label}
        </span>
        <span className="mt-0.5 block break-words text-sm font-bold text-white">
          {value}
        </span>
      </span>
    </>
  );
  const cls =
    "group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[.05] p-4 transition hover:bg-white/[.09]";
  return href ? (
    <a href={href} className={`${cls} focus-ring`}>
      {content}
    </a>
  ) : (
    <div className={cls}>{content}</div>
  );
}

function ContactIcon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    mail: (
      <>
        <rect width="20" height="16" x="2" y="4" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </>
    ),
    inbox: (
      <>
        <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
        <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
      </>
    ),
    shield: (
      <>
        <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    sparkles: (
      <>
        <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
        <path d="M20 3v4" />
        <path d="M22 5h-4" />
        <path d="M4 17v2" />
        <path d="M5 18H3" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
