"use client";

import Link from "next/link";
import { ChangeEvent, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CardPreview } from "@/components/card-preview";
import { EmojiControls } from "@/components/emoji-controls";
import { Icon } from "@/components/icons";
import { PostcardPreviewWindow } from "@/components/postcard-preview";
import { PageIntro, SiteFooter, SiteHeader, Toast } from "@/components/site";
import { frames, templates } from "@/lib/data";
import { defaultEmojiPosition } from "@/lib/emojis";
import {
  RootState,
  setEmoji,
  setEmojiPosition,
  setEmojiSize,
  setEmojiTone,
  setFrame,
  setMessage,
  setPhoto,
  setPhotoPosition,
  setPhotoZoom,
  setRecipientMode,
  setSize,
  setTemplate,
} from "@/lib/store";

const cropPositions = [["left", "Izquierda"], ["center", "Centro"], ["right", "Derecha"], ["top", "Arriba"], ["bottom", "Abajo"]] as const;
type FlowStep = "template" | "frame" | "customize" | "preview";

export default function CustomizePage() {
  const dispatch = useDispatch();
  const cart = useSelector((state: RootState) => state.cart);
  const [step, setStep] = useState<FlowStep>("template");
  const [chosenTemplateId, setChosenTemplateId] = useState<string | null>(null);
  const [chosenFrameId, setChosenFrameId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const template = templates.find((item) => item.id === (chosenTemplateId || cart.card.templateId)) || templates[0];
  const frame = frames.find((item) => item.id === cart.card.frameId) || frames[0];
  const isMagazine = Boolean(template.magazineStyle);

  const chooseTemplate = (templateId: string) => {
    const nextTemplate = templates.find((item) => item.id === templateId) || templates[0];
    setChosenTemplateId(nextTemplate.id);
    setChosenFrameId(null);
    dispatch(setTemplate(nextTemplate.id));
    dispatch(setFrame(nextTemplate.magazineStyle ? null : frames[0].id));
  };

  const continueFromTemplate = () => {
    if (!chosenTemplateId) return;
    setStep(isMagazine ? "customize" : "frame");
  };

  const chooseFrame = (frameId: string) => {
    setChosenFrameId(frameId);
    dispatch(setFrame(frameId));
  };

  const handlePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      dispatch(setPhoto(String(reader.result)));
      dispatch(setPhotoZoom(1));
      dispatch(setPhotoPosition("center"));
    };
    reader.readAsDataURL(file);
  };

  const reset = () => {
    dispatch(setMessage("Feliz vuelta al sol, Ana ✨"));
    dispatch(setEmoji("✨"));
    dispatch(setEmojiTone("natural"));
    dispatch(setEmojiSize(28));
    dispatch(setEmojiPosition(defaultEmojiPosition));
    dispatch(setPhoto(null));
    dispatch(setPhotoZoom(1));
    dispatch(setPhotoPosition("center"));
    dispatch(setSize("A4"));
  };

  const progressSteps = isMagazine && step !== "template"
    ? [["template", "Plantilla"], ["customize", "Personaliza"], ["preview", "Vista completa"]] as const
    : [["template", "Plantilla"], ["frame", "Marco"], ["customize", "Personaliza"], ["preview", "Vista completa"]] as const;
  const activeProgressIndex = progressSteps.findIndex(([value]) => value === step);

  return <>
    <SiteHeader active="Diseños" />
    <main className="bg-white">
      <div className="container pb-24 pt-12">
        <ol className="mx-auto mb-10 flex max-w-[760px] items-center" aria-label="Progreso de personalización">
          {progressSteps.map(([value, label], index) => <li key={value} className={`flex items-center ${index < progressSteps.length - 1 ? "flex-1" : ""}`}>
            <span className="flex items-center gap-2">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${index <= activeProgressIndex ? "bg-[#ee5264] text-white" : "bg-[#f1e7e0] text-[#8d8490]"}`}>{index + 1}</span>
              <span className={`hidden text-xs font-black sm:block ${index <= activeProgressIndex ? "text-[#182443]" : "text-[#9297a4]"}`}>{label}</span>
            </span>
            {index < progressSteps.length - 1 && <span className={`mx-3 h-px flex-1 ${index < activeProgressIndex ? "bg-[#ee5264]" : "bg-[#e5d9d2]"}`} />}
          </li>)}
        </ol>

        {step === "template" && <TemplateStep selectedId={chosenTemplateId} onSelect={chooseTemplate} onContinue={continueFromTemplate} />}
        {step === "frame" && <FrameStep selectedId={chosenFrameId} onSelect={chooseFrame} onBack={() => setStep("template")} onContinue={() => setStep("customize")} />}
        {step === "customize" && <>
          <PageIntro eyebrow={isMagazine ? "PASO 2 DE 3 · PERSONALIZA" : "PASO 3 DE 4 · PERSONALIZA"} title="Haz tuya la tarjeta" body={isMagazine ? "Tu plantilla estilo revista ya está lista para editar. Añade la foto y el mensaje que la harán única." : `Has elegido ${template.name} con el marco “${frame.name}”. Ahora añade tus palabras, foto y detalles.`} />
          <div className="mt-14 grid gap-8 lg:grid-cols-[.78fr_1.22fr] lg:items-start">
            <section className="order-2 rounded-[24px] border border-[#eadfd8] bg-[#fffaf5] p-5 sm:p-7 lg:order-1" aria-label="Controles de personalización">
              <div className="flex items-start justify-between gap-4 border-b border-[#eadfd8] pb-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#ee5264]">{template.eyebrow}</p>
                  <h2 className="mt-1 font-black">{template.name}</h2>
                  <button onClick={() => setStep("template")} className="mt-2 text-xs font-bold text-[#7c8191] underline underline-offset-4 hover:text-[#ee5264]">Cambiar plantilla{!isMagazine ? " o marco" : ""}</button>
                </div>
                <button onClick={reset} className="text-xs font-bold text-[#7c8191] underline underline-offset-4 hover:text-[#ee5264]">Restablecer</button>
              </div>

              <label className="mt-6 block text-sm font-black">Tu mensaje
                <textarea value={cart.card.message} onChange={(event) => dispatch(setMessage(event.target.value))} rows={3} className="focus-ring mt-2 w-full resize-none rounded-2xl border border-[#dfd3cc] bg-white p-3 text-sm leading-6 text-[#182443] placeholder:text-[#adb1bd]" />
              </label>
              <EmojiControls emoji={cart.card.emoji} tone={cart.card.emojiTone} size={cart.card.emojiSize} onSelect={(item) => { dispatch(setEmoji(item.emoji)); dispatch(setEmojiTone(item.tone || "natural")); }} onSizeChange={(value) => dispatch(setEmojiSize(value))} />

              <div className="mt-6">
                <p className="text-sm font-black">Tu foto</p>
                <button onClick={() => inputRef.current?.click()} className="focus-ring mt-2 flex w-full items-center gap-3 rounded-2xl border border-dashed border-[#e7a59c] bg-white p-3 text-left transition hover:bg-[#fff0e8]">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff0e8] text-[#ee5264]"><Icon name="plus" size={18} /></span>
                  <span><span className="block text-sm font-black">{cart.card.photoDataUrl ? "Cambiar foto" : "Subir una foto"}</span><span className="mt-0.5 block text-xs text-[#7c8191]">JPG o PNG · hasta 10 MB</span></span>
                </button>
                <input ref={inputRef} onChange={handlePhoto} type="file" accept="image/png,image/jpeg" className="hidden" />
              </div>

              <div className={`mt-4 rounded-2xl border border-[#eadbd3] bg-white p-4 ${cart.card.photoDataUrl ? "" : "opacity-55"}`}>
                <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-black">Ajusta tu foto</p><p className="mt-1 text-xs text-[#7c8191]">Mueve y acerca la imagen para encontrar el encuadre perfecto.</p></div><span className="rounded-full bg-[#fff0e8] px-2.5 py-1 text-[10px] font-black text-[#c94758]">{cart.card.photoDataUrl ? "Editable" : "Sube una foto"}</span></div>
                <label className="mt-4 block text-xs font-black">Zoom
                  <input aria-label="Zoom de la foto" type="range" min="1" max="1.5" step="0.05" value={cart.card.photoZoom} onChange={(event) => dispatch(setPhotoZoom(Number(event.target.value)))} disabled={!cart.card.photoDataUrl} className="mt-3 w-full accent-[#ee5264]" />
                  <span className="mt-1 flex justify-between text-[10px] font-normal text-[#9297a4]"><span>Más imagen</span><span>{Math.round(cart.card.photoZoom * 100)}%</span><span>Más detalle</span></span>
                </label>
                <div className="mt-4"><p className="text-xs font-black">Posición</p><div className="mt-2 grid grid-cols-5 gap-1.5">{cropPositions.map(([value, label]) => <button key={value} title={label} disabled={!cart.card.photoDataUrl} onClick={() => dispatch(setPhotoPosition(value))} className={`focus-ring rounded-xl border px-1 py-2 text-[10px] font-bold transition disabled:cursor-not-allowed ${cart.card.photoPosition === value ? "border-[#ee5264] bg-[#fff0e8] text-[#c94758]" : "border-[#dfd3cc] hover:border-[#ee5264]"}`}>{label}</button>)}</div></div>
              </div>

              <div className="mt-6"><p className="text-sm font-black">Tamaño</p><div className="mt-2 grid grid-cols-2 gap-2">{(["A4", "A3"] as const).map((option) => <button key={option} onClick={() => dispatch(setSize(option))} className={`focus-ring rounded-2xl border p-3 text-left transition ${cart.card.size === option ? "border-[#ee5264] bg-[#fff0e8]" : "border-[#dfd3cc] bg-white hover:border-[#ee5264]"}`}><span className="block text-sm font-black">{option}</span><span className="mt-1 block text-[11px] text-[#7c8191]">{option === "A4" ? "21 × 29,7 cm" : "29,7 × 42 cm"}</span></button>)}</div></div>
              <div className="mt-6"><p className="text-sm font-black">¿Dónde lo enviamos?</p><div className="mt-2 grid gap-2">{([["recipient", "Directamente a quien lo recibe", "Nosotros lo preparamos y lo entregamos por ti."], ["customer", "A mi dirección", "Recíbelo en casa, listo para entregar."]] as const).map(([value, title, body]) => <button key={value} onClick={() => dispatch(setRecipientMode(value))} className={`focus-ring rounded-2xl border p-3 text-left transition ${cart.card.recipientMode === value ? "border-[#ee5264] bg-[#fff0e8]" : "border-[#dfd3cc] bg-white hover:border-[#ee5264]"}`}><span className="flex items-center gap-2 text-sm font-black"><span className={`h-3 w-3 rounded-full border ${cart.card.recipientMode === value ? "border-[4px] border-[#ee5264]" : "border-[#b7b0ac]"}`} />{title}</span><span className="mt-1 block pl-5 text-xs text-[#7c8191]">{body}</span></button>)}</div></div>
            </section>

            <section className="order-1 rounded-[26px] bg-[#f8efe8] p-5 sm:p-10 lg:order-2">
              <div className="mb-5 flex items-center justify-between"><span className="text-[10px] font-black uppercase tracking-[.18em] text-[#7b7180]">Vista previa</span><span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-[#182443]">{cart.card.size} · {template.eyebrow}</span></div>
              <div className="mx-auto max-w-[640px] rounded-[18px] bg-white p-3 shadow-xl shadow-[#8a564c]/10 sm:p-5"><CardPreview templateId={template.id} message={cart.card.message} emoji={cart.card.emoji} emojiTone={cart.card.emojiTone} emojiSize={cart.card.emojiSize} emojiPosition={cart.card.emojiPosition} onEmojiPositionChange={(position) => dispatch(setEmojiPosition(position))} photoDataUrl={cart.card.photoDataUrl} photoZoom={cart.card.photoZoom} photoPosition={cart.card.photoPosition} size={cart.card.size} /></div>
              <p className="mx-auto mt-4 max-w-[640px] text-center text-xs text-[#7b7180]">Arrastra el emoji para colocarlo. Así se verá tu tarjeta impresa en {cart.card.size}.</p>
              <div className="mx-auto mt-6 flex max-w-[640px] flex-col gap-3 sm:flex-row"><button type="button" onClick={() => setStep("preview")} className="focus-ring inline-flex flex-1 items-center justify-center gap-3 rounded-full bg-[#ee5264] px-5 py-3.5 text-sm font-black text-white transition hover:bg-[#d83d54]">Ver tarjeta completa <Icon name="arrow" size={17} /></button><button onClick={() => setToast("Tu diseño se ha guardado en esta sesión")} className="focus-ring rounded-full border border-[#d9cbc4] bg-white px-5 py-3.5 text-sm font-black text-[#182443] transition hover:border-[#ee5264]">Guardar diseño</button></div>
            </section>
          </div>
        </>}
        {step === "preview" && <>
          <PageIntro eyebrow={isMagazine ? "PASO 3 DE 3 · VISTA COMPLETA" : "PASO 4 DE 4 · VISTA COMPLETA"} title="Revisa todos los lados" body="Abre cada vista para comprobar cómo quedará la tarjeta física completa antes de añadirla a tu cesta." />
          <PostcardPreviewWindow />
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button type="button" onClick={() => setStep("customize")} className="focus-ring inline-flex items-center justify-center gap-2 rounded-full border border-[#d9cbc4] bg-white px-6 py-3.5 text-sm font-black text-[#182443] hover:border-[#ee5264]"><Icon name="edit" size={15} /> Volver a editar</button>
            <Link href="/addons" className="focus-ring inline-flex items-center justify-center rounded-full border border-[#d9cbc4] bg-white px-6 py-3.5 text-sm font-black text-[#182443] hover:border-[#ee5264]">Añadir extras</Link>
            <Link href="/cart" className="focus-ring inline-flex min-w-[220px] items-center justify-center gap-2 rounded-full bg-[#ee5264] px-6 py-3.5 text-sm font-black text-white transition hover:bg-[#d83d54]">Añadir a la cesta <Icon name="bag" size={17} /></Link>
          </div>
          <p className="mt-4 text-center text-xs text-[#7c8191]">Tu personalización ya está guardada en esta sesión.</p>
        </>}
      </div>
    </main>
    <SiteFooter />
    {toast && <Toast message={toast} onClose={() => setToast("")} />}
  </>;
}

function TemplateStep({ selectedId, onSelect, onContinue }: { selectedId: string | null; onSelect: (id: string) => void; onContinue: () => void }) {
  return <section aria-labelledby="template-step-title">
    <PageIntro eyebrow="PASO 1 · ELIGE PLANTILLA" title="Primero, elige tu plantilla" body="Selecciona una de las tres composiciones. Después podrás elegir un marco cuando la plantilla lo permita." />
    <div className="mt-12 grid gap-5 md:grid-cols-3">{templates.map((item, index) => {
      const selected = selectedId === item.id;
      return <button key={item.id} type="button" aria-pressed={selected} onClick={() => onSelect(item.id)} className={`focus-ring group overflow-hidden rounded-[24px] border-2 bg-white text-left transition hover:-translate-y-1 hover:shadow-xl hover:shadow-[#8a564c]/10 ${selected ? "border-[#ee5264] shadow-lg shadow-[#8a564c]/10" : "border-[#eadbd3]"}`}>
        <span className="relative block aspect-[1.12/1] overflow-hidden bg-[#fffaf5] p-3"><img src={item.image} alt={`Vista de ${item.name}`} className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.02]" /><span className={`absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full border-2 bg-white ${selected ? "border-[#ee5264] text-[#ee5264]" : "border-[#d3c8c1] text-transparent"}`}><Icon name="check" size={14} /></span>{item.magazineStyle && <span className="absolute bottom-4 left-4 rounded-full bg-[#182443] px-3 py-1.5 text-[9px] font-black uppercase tracking-[.12em] text-white">Estilo revista</span>}</span>
        <span className="block p-5"><span className="text-[10px] font-black uppercase tracking-[.15em] text-[#ee5264]">Opción {index + 1}</span><span className="mt-1 block text-lg font-black">{item.name}</span><span className="mt-2 block text-sm leading-6 text-[#737b90]">{item.description}</span><span className="mt-4 block text-xs font-bold text-[#59627b]">{item.magazineStyle ? "Sin selección de marco" : "Marco a elegir en el siguiente paso"}</span></span>
      </button>;
    })}</div>
    <div className="mt-9 flex justify-center"><button type="button" disabled={!selectedId} onClick={onContinue} className="focus-ring inline-flex min-w-[220px] items-center justify-center gap-2 rounded-full bg-[#ee5264] px-6 py-3.5 text-sm font-black text-white transition hover:bg-[#d83d54] disabled:cursor-not-allowed disabled:opacity-40">Continuar <Icon name="arrow" size={16} /></button></div>
  </section>;
}

function FrameStep({ selectedId, onSelect, onBack, onContinue }: { selectedId: string | null; onSelect: (id: string) => void; onBack: () => void; onContinue: () => void }) {
  return <section aria-labelledby="frame-step-title">
    <PageIntro eyebrow="PASO 2 · ELIGE MARCO" title="Ahora, elige un marco" body="Este paso solo aparece para las Plantillas 1 y 2. El marco acompañará tus fotos y tu mensaje." />
    <div className="mx-auto mt-12 grid max-w-[960px] gap-5 sm:grid-cols-2 lg:grid-cols-4">{frames.map((item) => {
      const selected = selectedId === item.id;
      return <button key={item.id} type="button" aria-pressed={selected} onClick={() => onSelect(item.id)} className={`focus-ring group overflow-hidden rounded-[22px] border-2 bg-white text-left transition hover:-translate-y-1 hover:shadow-lg ${selected ? "border-[#ee5264]" : "border-[#eadbd3]"}`}>
        <span className="relative block aspect-square overflow-hidden bg-[#f8efe8]"><img src={item.image} alt={item.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" /><span className={`absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full border-2 bg-white ${selected ? "border-[#ee5264] text-[#ee5264]" : "border-[#d3c8c1] text-transparent"}`}><Icon name="check" size={14} /></span></span>
        <span className="block p-4 text-sm font-black">{item.name}</span>
      </button>;
    })}</div>
    <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row"><button type="button" onClick={onBack} className="focus-ring rounded-full border border-[#d9cbc4] bg-white px-6 py-3.5 text-sm font-black text-[#182443] hover:border-[#ee5264]">Volver a plantillas</button><button type="button" disabled={!selectedId} onClick={onContinue} className="focus-ring inline-flex min-w-[220px] items-center justify-center gap-2 rounded-full bg-[#ee5264] px-6 py-3.5 text-sm font-black text-white transition hover:bg-[#d83d54] disabled:cursor-not-allowed disabled:opacity-40">Personalizar tarjeta <Icon name="arrow" size={16} /></button></div>
  </section>;
}
