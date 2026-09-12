"use client";

import Link from "next/link";
import { ChangeEvent, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CardPreview } from "@/components/card-preview";
import { EmojiElementControls } from "@/components/emoji-element-controls";
import { Icon } from "@/components/icons";
import { PostcardPreviewWindow, PostcardSideView, type PostcardSide } from "@/components/postcard-preview";
import { MagazineFront, magazineHeadline, magazineSubheadline, magazineInsideLeft, magazineInsideRight } from "@/components/magazine-card";
import { OccasionPicker } from "@/components/occasion-picker";
import { PageIntro, Price, SiteFooter, SiteHeader, Toast } from "@/components/site";
import { addOns, designCategories, ENVELOPE_TEXT_PRICE, frames, STICKER_PRICES, stickerGallery, templates, type DesignCategoryId } from "@/lib/data";
import { defaultEmojiPosition, type EmojiOption } from "@/lib/emojis";
import {
  RootState,
  addEmojiElement,
  removeEmojiElement,
  setCardCategory,
  setEmojiElements,
  setEnvelopeText,
  setEnvelopeTextAdded,
  setFrame,
  setFrontHeadline,
  setFrontSubheadline,
  setInsideLeftText,
  setInsideRightText,
  setBackText,
  setMessage,
  setPhotoAt,
  setPhotoPosition,
  setPhotoSlots,
  setPhotoZoom,
  setRecipientMode,
  setSize,
  setStickerImage,
  setStickerQuantity,
  setTemplate,
  updateEmojiElement,
} from "@/lib/store";

const cropPositions = [["left", "Izquierda"], ["center", "Centro"], ["right", "Derecha"], ["top", "Arriba"], ["bottom", "Abajo"]] as const;
type FlowStep = "template" | "frame" | "customize" | "emojis" | "preview" | "extras";

export default function CustomizePage() {
  const dispatch = useDispatch();
  const cart = useSelector((state: RootState) => state.cart);
  const [step, setStep] = useState<FlowStep>("template");
  const [chosenTemplateId, setChosenTemplateId] = useState<string | null>(null);
  const [chosenFrameId, setChosenFrameId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<PostcardSide>("front");
  const [uploadIndex, setUploadIndex] = useState(0);
  const [selectedEmojiId, setSelectedEmojiId] = useState<string | null>(cart.card.emojiElements[0]?.id || null);
  const [toast, setToast] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const stickerFileRef = useRef<HTMLInputElement>(null);

  const template = templates.find((item) => item.id === (chosenTemplateId || cart.card.templateId)) || templates[0];
  const frame = frames.find((item) => item.id === (chosenFrameId || cart.card.frameId)) || frames[0];
  const isMagazine = Boolean(template.magazineStyle);

  const chooseTemplate = (templateId: string) => {
    const nextTemplate = templates.find((item) => item.id === templateId) || templates[0];
    setChosenTemplateId(nextTemplate.id);
    setChosenFrameId(null);
    dispatch(setTemplate(nextTemplate.id));
    dispatch(setFrame(nextTemplate.requiresFrame ? frames[0].id : null));
    dispatch(setPhotoSlots(nextTemplate.imageCount));
    if (nextTemplate.magazineStyle) {
      dispatch(setMessage(magazineHeadline));
      dispatch(setFrontHeadline(magazineHeadline));
      dispatch(setFrontSubheadline(magazineSubheadline));
      dispatch(setInsideLeftText(magazineInsideLeft));
      dispatch(setInsideRightText(magazineInsideRight));
      dispatch(setBackText("Una tarjeta creada especialmente para alguien especial."));
    }
  };

  const continueFromTemplate = () => {
    if (!chosenTemplateId) return;
    if (template.requiresFrame) {
      setStep("frame");
    } else {
      setStep("customize");
    }
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
      dispatch(setPhotoAt({ index: uploadIndex, dataUrl: String(reader.result) }));
      dispatch(setPhotoZoom(1));
      dispatch(setPhotoPosition("center"));
      setToast(`Foto ${uploadIndex + 1} actualizada`);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handleStickerPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      dispatch(setStickerImage(String(reader.result)));
      setToast("Imagen del sticker guardada");
    };
    reader.readAsDataURL(file);
  };

  const reset = () => {
    if (isMagazine) {
      dispatch(setMessage(magazineHeadline));
      dispatch(setFrontHeadline(magazineHeadline));
      dispatch(setFrontSubheadline(magazineSubheadline));
      dispatch(setInsideLeftText(magazineInsideLeft));
      dispatch(setInsideRightText(magazineInsideRight));
      dispatch(setBackText("Una tarjeta creada especialmente para alguien especial."));
    } else {
      dispatch(setMessage("Feliz vuelta al sol, Ana ✨"));
      dispatch(setFrontHeadline("Feliz vuelta al sol, Ana ✨"));
      dispatch(setInsideLeftText("Deseándote el mejor de los días y un año repleto de momentos inolvidables."));
      dispatch(setInsideRightText("Con todo nuestro cariño y admiración."));
      dispatch(setBackText("Celebra cada momento inolvidable."));
    }
    dispatch(setEmojiElements([{ id: "emoji-reset", emoji: "✨", tone: "natural", size: 28, position: defaultEmojiPosition }]));
    setSelectedEmojiId("emoji-reset");
    dispatch(setPhotoSlots(template.imageCount));
    for (let index = 0; index < template.imageCount; index += 1) dispatch(setPhotoAt({ index, dataUrl: null }));
    dispatch(setPhotoZoom(1));
    dispatch(setPhotoPosition("center"));
    dispatch(setSize("A4"));
    setToast("Personalización restablecida");
  };

  const addEmoji = (option: EmojiOption) => {
    const id = `emoji-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const offset = cart.card.emojiElements.length % 6;
    dispatch(addEmojiElement({ id, emoji: option.emoji, tone: option.tone || "natural", size: 32, position: { x: 18 + offset * 12, y: 16 + (offset % 2) * 12 } }));
    setSelectedEmojiId(id);
    setToast(`Emoji ${option.emoji} añadido`);
  };

  // 6-step progress steps (or 5 if frame skipped for Magazine)
  const progressSteps: { id: FlowStep; label: string }[] = template.requiresFrame
    ? [
        { id: "template", label: "Plantilla" },
        { id: "frame", label: "Marco" },
        { id: "customize", label: "Secciones" },
        { id: "emojis", label: "Emojis" },
        { id: "preview", label: "Vista previa" },
        { id: "extras", label: "Extras" },
      ]
    : [
        { id: "template", label: "Plantilla" },
        { id: "customize", label: "Secciones" },
        { id: "emojis", label: "Emojis" },
        { id: "preview", label: "Vista previa" },
        { id: "extras", label: "Extras" },
      ];

  const activeProgressIndex = progressSteps.findIndex((item) => item.id === step);

  const canNavigateTo = (targetStep: FlowStep) => {
    if (!chosenTemplateId && targetStep !== "template") return false;
    return true;
  };

  return (
    <>
      <SiteHeader active="Diseños" />
      <main className="bg-white">
        <div className="container pb-24 pt-10">
          {/* Progress bar */}
          <ol className="mx-auto mb-10 flex max-w-[840px] items-center" aria-label="Progreso de personalización">
            {progressSteps.map((item, index) => {
              const isCurrent = item.id === step;
              const isCompleted = index < activeProgressIndex;
              const allowed = canNavigateTo(item.id);
              return (
                <li key={item.id} className={`flex items-center ${index < progressSteps.length - 1 ? "flex-1" : ""}`}>
                  <button
                    type="button"
                    disabled={!allowed}
                    onClick={() => setStep(item.id)}
                    className={`flex items-center gap-2 text-left transition disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black transition ${
                        isCurrent
                          ? "bg-[#ee5264] text-white shadow-md shadow-[#ee5264]/30"
                          : isCompleted
                          ? "bg-[#182443] text-white"
                          : "bg-[#f1e7e0] text-[#8d8490]"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span
                      className={`hidden text-xs font-black sm:block ${
                        isCurrent ? "text-[#ee5264]" : isCompleted ? "text-[#182443]" : "text-[#9297a4]"
                      }`}
                    >
                      {item.label}
                    </span>
                  </button>
                  {index < progressSteps.length - 1 && (
                    <span className={`mx-2 h-px flex-1 ${index < activeProgressIndex ? "bg-[#ee5264]" : "bg-[#e5d9d2]"}`} />
                  )}
                </li>
              );
            })}
          </ol>

          {/* STEP 1: TEMPLATE */}
          {step === "template" && (
            <TemplateStep
              categoryId={cart.card.categoryId}
              selectedId={chosenTemplateId}
              onCategorySelect={(categoryId) => {
                dispatch(setCardCategory(categoryId));
                setChosenTemplateId(null);
              }}
              onSelect={chooseTemplate}
              onContinue={continueFromTemplate}
            />
          )}

          {/* STEP 2: FRAME (Templates 2 & 3 only) */}
          {step === "frame" && (
            <FrameStep
              selectedId={chosenFrameId || cart.card.frameId}
              onSelect={chooseFrame}
              onBack={() => setStep("template")}
              onContinue={() => setStep("customize")}
            />
          )}

          {/* STEP 3: SECTION-BY-SECTION CUSTOMIZATION */}
          {step === "customize" && (
            <>
              <PageIntro
                eyebrow={!template.requiresFrame ? "PASO 2 DE 5 · SECCIONES" : "PASO 3 DE 6 · SECCIONES"}
                title="Personalización por secciones"
                body={
                  !template.requiresFrame
                    ? `Edita las 4 caras de tu tarjeta revista (Portada, Interior Izquierdo, Interior Derecho y Contraportada) con sus ${template.imageCount} fotos y textos.`
                    : `Has elegido ${template.name} con el marco “${frame.name}”. Personaliza cada cara de la tarjeta paso a paso.`
                }
              />

              {/* Section Sub-Navigation Tabs */}
              <div className="mt-8 flex items-center justify-center">
                <nav
                  className="inline-flex rounded-full border border-[#eadfd8] bg-[#fffaf5] p-1.5 shadow-sm"
                  aria-label="Seleccionar sección para editar"
                >
                  {[
                    { id: "front" as PostcardSide, label: "1. Portada", icon: "📄" },
                    { id: "inside-left" as PostcardSide, label: "2. Interior Izq.", icon: "📖" },
                    { id: "inside-right" as PostcardSide, label: "3. Interior Dcho.", icon: "✍️" },
                    { id: "back" as PostcardSide, label: "4. Contraportada", icon: "✨" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveSection(tab.id)}
                      className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black transition ${
                        activeSection === tab.id
                          ? "bg-[#ee5264] text-white shadow"
                          : "text-[#7c8191] hover:text-[#182443]"
                      }`}
                    >
                      <span>{tab.icon}</span>
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </nav>
              </div>

              <div className="mt-8 grid gap-8 lg:grid-cols-[.85fr_1.15fr] lg:items-start">
                {/* Editor Panel for Active Section */}
                <section className="order-2 rounded-[24px] border border-[#eadfd8] bg-[#fffaf5] p-5 sm:p-7 lg:order-1">
                  <div className="flex items-start justify-between gap-4 border-b border-[#eadfd8] pb-5">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#ee5264]">
                        {designCategories.find((category) => category.id === cart.card.categoryId)?.name} · {template.eyebrow}
                      </p>
                      <h2 className="mt-1 font-black">
                        {activeSection === "front" && "Cara 1: Portada"}
                        {activeSection === "inside-left" && "Cara 2: Interior Izquierdo"}
                        {activeSection === "inside-right" && "Cara 3: Interior Derecho"}
                        {activeSection === "back" && "Cara 4: Contraportada"}
                      </h2>
                      <button
                        onClick={() => setStep(template.requiresFrame ? "frame" : "template")}
                        className="mt-2 text-xs font-bold text-[#7c8191] underline underline-offset-4 hover:text-[#ee5264]"
                      >
                        Cambiar {template.requiresFrame ? "marco o plantilla" : "plantilla"}
                      </button>
                    </div>
                    <button onClick={reset} className="text-xs font-bold text-[#7c8191] underline underline-offset-4 hover:text-[#ee5264]">
                      Restablecer
                    </button>
                  </div>

                  {/* Section 1: FRONT */}
                  {activeSection === "front" && (
                    <div className="space-y-6 pt-5">
                      <label className="block text-sm font-black">
                        {isMagazine ? "Titular de Portada (Noticia principal)" : "Titular / Mensaje de Portada"}
                        <textarea
                          value={cart.card.frontHeadline || cart.card.message}
                          onChange={(e) => dispatch(setFrontHeadline(e.target.value))}
                          rows={3}
                          maxLength={240}
                          className="focus-ring mt-2 w-full resize-none rounded-2xl border border-[#dfd3cc] bg-white p-3 text-sm leading-6 text-[#182443]"
                        />
                        <span className="mt-1 block text-right text-[10px] text-[#9297a4]">
                          {(cart.card.frontHeadline || cart.card.message).length}/240
                        </span>
                      </label>

                      {isMagazine && (
                        <label className="block text-sm font-black">
                          Subtitular de Portada
                          <input
                            type="text"
                            value={cart.card.frontSubheadline}
                            onChange={(e) => dispatch(setFrontSubheadline(e.target.value))}
                            maxLength={160}
                            className="focus-ring mt-2 w-full rounded-2xl border border-[#dfd3cc] bg-white p-3 text-sm text-[#182443]"
                          />
                          <span className="mt-1 block text-right text-[10px] text-[#9297a4]">
                            {cart.card.frontSubheadline.length}/160
                          </span>
                        </label>
                      )}

                      {/* Photo 1 Upload */}
                      <div>
                        <p className="text-sm font-black">Foto 1 · Portada principal</p>
                        <div className="mt-2 relative overflow-hidden rounded-2xl border border-[#dfd3cc] bg-white">
                          <button
                            type="button"
                            onClick={() => {
                              setUploadIndex(0);
                              inputRef.current?.click();
                            }}
                            className="focus-ring relative block aspect-[16/10] w-full overflow-hidden bg-[#f8efe8] text-left"
                          >
                            {cart.card.photoDataUrls[0] ? (
                              <img src={cart.card.photoDataUrls[0]} alt="Foto 1 de portada" className="h-full w-full object-cover" />
                            ) : (
                              <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[#ee5264]">
                                <Icon name="plus" size={24} />
                                <span className="text-xs font-black">SUBIR FOTO DE PORTADA</span>
                              </span>
                            )}
                          </button>
                          {cart.card.photoDataUrls[0] && (
                            <button
                              type="button"
                              onClick={() => dispatch(setPhotoAt({ index: 0, dataUrl: null }))}
                              className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm font-black text-[#ee5264] shadow"
                              aria-label="Eliminar foto de portada"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Photo crop/zoom controls */}
                      <div className={`rounded-2xl border border-[#eadbd3] bg-white p-4 ${cart.card.photoDataUrls[0] ? "" : "opacity-55"}`}>
                        <p className="text-xs font-black">Ajuste de encuadre (Foto 1)</p>
                        <label className="mt-3 block text-xs font-bold text-[#7c8191]">
                          Zoom
                          <input
                            type="range"
                            min="1"
                            max="1.5"
                            step="0.05"
                            value={cart.card.photoZoom}
                            onChange={(e) => dispatch(setPhotoZoom(Number(e.target.value)))}
                            disabled={!cart.card.photoDataUrls[0]}
                            className="mt-2 w-full accent-[#ee5264]"
                          />
                        </label>
                        <div className="mt-3">
                          <p className="text-xs font-bold text-[#7c8191]">Posición</p>
                          <div className="mt-1.5 grid grid-cols-5 gap-1.5">
                            {cropPositions.map(([value, label]) => (
                              <button
                                key={value}
                                title={label}
                                disabled={!cart.card.photoDataUrls[0]}
                                onClick={() => dispatch(setPhotoPosition(value))}
                                className={`focus-ring rounded-xl border px-1 py-1.5 text-[10px] font-bold transition disabled:cursor-not-allowed ${
                                  cart.card.photoPosition === value
                                    ? "border-[#ee5264] bg-[#fff0e8] text-[#c94758]"
                                    : "border-[#dfd3cc] hover:border-[#ee5264]"
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Section 2: INSIDE LEFT */}
                  {activeSection === "inside-left" && (
                    <div className="space-y-6 pt-5">
                      <label className="block text-sm font-black">
                        Texto / Dedicatoria interior izquierda
                        <textarea
                          value={cart.card.insideLeftText}
                          onChange={(e) => dispatch(setInsideLeftText(e.target.value))}
                          rows={4}
                          maxLength={350}
                          className="focus-ring mt-2 w-full resize-none rounded-2xl border border-[#dfd3cc] bg-white p-3 text-sm leading-6 text-[#182443]"
                        />
                        <span className="mt-1 block text-right text-[10px] text-[#9297a4]">
                          {cart.card.insideLeftText.length}/350
                        </span>
                      </label>

                      {/* Photo 2 Upload */}
                      <div>
                        <p className="text-sm font-black">Foto 2 · Interior izquierdo</p>
                        <div className="mt-2 relative overflow-hidden rounded-2xl border border-[#dfd3cc] bg-white">
                          <button
                            type="button"
                            onClick={() => {
                              setUploadIndex(1);
                              inputRef.current?.click();
                            }}
                            className="focus-ring relative block aspect-[16/10] w-full overflow-hidden bg-[#f8efe8] text-left"
                          >
                            {cart.card.photoDataUrls[1] ? (
                              <img src={cart.card.photoDataUrls[1]} alt="Foto 2 interior izquierdo" className="h-full w-full object-cover" />
                            ) : (
                              <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[#ee5264]">
                                <Icon name="plus" size={24} />
                                <span className="text-xs font-black">SUBIR FOTO INTERIOR IZQUIERDA</span>
                              </span>
                            )}
                          </button>
                          {cart.card.photoDataUrls[1] && (
                            <button
                              type="button"
                              onClick={() => dispatch(setPhotoAt({ index: 1, dataUrl: null }))}
                              className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm font-black text-[#ee5264] shadow"
                              aria-label="Eliminar foto 2"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Section 3: INSIDE RIGHT */}
                  {activeSection === "inside-right" && (
                    <div className="space-y-6 pt-5">
                      <label className="block text-sm font-black">
                        Texto / Carta interior derecha
                        <textarea
                          value={cart.card.insideRightText}
                          onChange={(e) => dispatch(setInsideRightText(e.target.value))}
                          rows={4}
                          maxLength={350}
                          className="focus-ring mt-2 w-full resize-none rounded-2xl border border-[#dfd3cc] bg-white p-3 text-sm leading-6 text-[#182443]"
                        />
                        <span className="mt-1 block text-right text-[10px] text-[#9297a4]">
                          {cart.card.insideRightText.length}/350
                        </span>
                      </label>

                      {/* Photo 3 Upload */}
                      <div>
                        <p className="text-sm font-black">Foto 3 · Interior derecho superior</p>
                        <div className="mt-2 relative overflow-hidden rounded-2xl border border-[#dfd3cc] bg-white">
                          <button
                            type="button"
                            onClick={() => {
                              setUploadIndex(2);
                              inputRef.current?.click();
                            }}
                            className="focus-ring relative block aspect-[16/10] w-full overflow-hidden bg-[#f8efe8] text-left"
                          >
                            {cart.card.photoDataUrls[2] ? (
                              <img src={cart.card.photoDataUrls[2]} alt="Foto 3 interior derecho" className="h-full w-full object-cover" />
                            ) : (
                              <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[#ee5264]">
                                <Icon name="plus" size={24} />
                                <span className="text-xs font-black">SUBIR FOTO 3</span>
                              </span>
                            )}
                          </button>
                          {cart.card.photoDataUrls[2] && (
                            <button
                              type="button"
                              onClick={() => dispatch(setPhotoAt({ index: 2, dataUrl: null }))}
                              className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm font-black text-[#ee5264] shadow"
                              aria-label="Eliminar foto 3"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Photo 4 Upload (For Magazine / 4 photos) */}
                      {template.imageCount >= 4 && (
                        <div>
                          <p className="text-sm font-black">Foto 4 · Interior derecho inferior</p>
                          <div className="mt-2 relative overflow-hidden rounded-2xl border border-[#dfd3cc] bg-white">
                            <button
                              type="button"
                              onClick={() => {
                                setUploadIndex(3);
                                inputRef.current?.click();
                              }}
                              className="focus-ring relative block aspect-[16/10] w-full overflow-hidden bg-[#f8efe8] text-left"
                            >
                              {cart.card.photoDataUrls[3] ? (
                                <img src={cart.card.photoDataUrls[3]} alt="Foto 4 interior derecho" className="h-full w-full object-cover" />
                              ) : (
                                <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[#ee5264]">
                                  <Icon name="plus" size={24} />
                                  <span className="text-xs font-black">SUBIR FOTO 4</span>
                                </span>
                              )}
                            </button>
                            {cart.card.photoDataUrls[3] && (
                              <button
                                type="button"
                                onClick={() => dispatch(setPhotoAt({ index: 3, dataUrl: null }))}
                                className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm font-black text-[#ee5264] shadow"
                                aria-label="Eliminar foto 4"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Section 4: BACK */}
                  {activeSection === "back" && (
                    <div className="space-y-6 pt-5">
                      <label className="block text-sm font-black">
                        Mensaje de Contraportada / Cierre
                        <textarea
                          value={cart.card.backText}
                          onChange={(e) => dispatch(setBackText(e.target.value))}
                          rows={3}
                          maxLength={160}
                          className="focus-ring mt-2 w-full resize-none rounded-2xl border border-[#dfd3cc] bg-white p-3 text-sm leading-6 text-[#182443]"
                        />
                        <span className="mt-1 block text-right text-[10px] text-[#9297a4]">
                          {cart.card.backText.length}/160
                        </span>
                      </label>

                      <div>
                        <p className="text-sm font-black">Tamaño físico de la tarjeta</p>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {(["A4", "A3"] as const).map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => dispatch(setSize(option))}
                              className={`focus-ring rounded-2xl border p-3 text-left transition ${
                                cart.card.size === option
                                  ? "border-[#ee5264] bg-[#fff0e8]"
                                  : "border-[#dfd3cc] bg-white hover:border-[#ee5264]"
                              }`}
                            >
                              <span className="block text-sm font-black">{option}</span>
                              <span className="mt-1 block text-[11px] text-[#7c8191]">
                                {option === "A4" ? "21 × 29,7 cm" : "29,7 × 42 cm"}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-black">¿Dónde lo enviamos?</p>
                        <div className="mt-2 grid gap-2">
                          {(
                            [
                              ["recipient", "Directamente a quien lo recibe", "Nosotros lo preparamos y lo entregamos por ti."],
                              ["customer", "A mi dirección", "Recíbelo en casa, listo para entregar en mano."],
                            ] as const
                          ).map(([value, title, body]) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => dispatch(setRecipientMode(value))}
                              className={`focus-ring rounded-2xl border p-3 text-left transition ${
                                cart.card.recipientMode === value
                                  ? "border-[#ee5264] bg-[#fff0e8]"
                                  : "border-[#dfd3cc] bg-white hover:border-[#ee5264]"
                              }`}
                            >
                              <span className="flex items-center gap-2 text-sm font-black">
                                <span
                                  className={`h-3 w-3 rounded-full border ${
                                    cart.card.recipientMode === value
                                      ? "border-[4px] border-[#ee5264]"
                                      : "border-[#b7b0ac]"
                                  }`}
                                />
                                {title}
                              </span>
                              <span className="mt-1 block pl-5 text-xs text-[#7c8191]">{body}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <input ref={inputRef} onChange={handlePhoto} type="file" accept="image/png,image/jpeg" className="hidden" />

                  {/* Section Next / Prev Buttons */}
                  <div className="mt-8 flex flex-col gap-3 border-t border-[#eadfd8] pt-6 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        const sideOrder: PostcardSide[] = ["front", "inside-left", "inside-right", "back"];
                        const currentIndex = sideOrder.indexOf(activeSection);
                        if (currentIndex > 0) setActiveSection(sideOrder[currentIndex - 1]);
                        else setStep(template.requiresFrame ? "frame" : "template");
                      }}
                      className="focus-ring rounded-full border border-[#d9cbc4] bg-white px-5 py-3 text-xs font-black text-[#182443] hover:border-[#ee5264]"
                    >
                      Anterior cara
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const sideOrder: PostcardSide[] = ["front", "inside-left", "inside-right", "back"];
                        const currentIndex = sideOrder.indexOf(activeSection);
                        if (currentIndex < sideOrder.length - 1) {
                          setActiveSection(sideOrder[currentIndex + 1]);
                        } else {
                          setStep("emojis");
                        }
                      }}
                      className="focus-ring inline-flex items-center justify-center gap-2 rounded-full bg-[#ee5264] px-6 py-3 text-xs font-black text-white hover:bg-[#d83d54]"
                    >
                      {activeSection === "back" ? "Continuar a Emojis (Paso 4)" : "Siguiente cara"}{" "}
                      <Icon name="arrow" size={15} />
                    </button>
                  </div>
                </section>

                {/* Section Live Preview */}
                <section className="order-1 rounded-[26px] bg-[#f8efe8] p-5 sm:p-8 lg:order-2">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[.18em] text-[#7b7180]">
                      Vista previa en vivo · Cara activa
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black text-[#182443]">
                      {cart.card.size} ·{" "}
                      {activeSection === "front" && "Portada"}
                      {activeSection === "inside-left" && "Interior Izq."}
                      {activeSection === "inside-right" && "Interior Dcho."}
                      {activeSection === "back" && "Contraportada"}
                    </span>
                  </div>
                  <div className="mx-auto max-w-[580px] overflow-hidden rounded-[18px] bg-white p-3 shadow-xl shadow-[#8a564c]/10">
                    <PostcardSideView side={activeSection} compact={false} />
                  </div>
                  <p className="mt-3 text-center text-xs text-[#7b7180]">
                    Tus cambios se reflejan al instante en esta cara. En el siguiente paso podrás añadir y mover todos tus emojis.
                  </p>
                  <div className="mt-5 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setStep("emojis")}
                      className="focus-ring inline-flex items-center gap-2 rounded-full bg-[#182443] px-6 py-3 text-xs font-black text-white hover:bg-[#ee5264]"
                    >
                      Ir a Emojis (Paso 4) <Icon name="arrow" size={15} />
                    </button>
                  </div>
                </section>
              </div>
            </>
          )}

          {/* STEP 4: EMOJIS */}
          {step === "emojis" && (
            <>
              <PageIntro
                eyebrow={!template.requiresFrame ? "PASO 3 DE 5 · EMOJIS" : "PASO 4 DE 6 · EMOJIS"}
                title="Añade y coloca tus emojis"
                body="Añade todos los emojis que quieras sin límite. Arrástralos sobre la tarjeta para situarlos exactamente donde te guste y cambia su tamaño con los controles."
              />

              <div className="mt-10 grid gap-8 lg:grid-cols-[.85fr_1.15fr] lg:items-start">
                <section className="order-2 rounded-[24px] border border-[#eadfd8] bg-[#fffaf5] p-5 sm:p-7 lg:order-1">
                  <div className="border-b border-[#eadfd8] pb-4">
                    <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#ee5264]">Colección de emojis</p>
                    <h2 className="mt-1 text-xl font-black">Emojis para celebrar</h2>
                    <p className="mt-1 text-xs text-[#7c8191]">
                      Elige de la colección, añade tantos como quieras y ajusta el tamaño de cada uno por separado (+ / −).
                    </p>
                  </div>

                  <EmojiElementControls
                    items={cart.card.emojiElements}
                    selectedId={selectedEmojiId}
                    onAdd={addEmoji}
                    onSelect={setSelectedEmojiId}
                    onChangeSize={(id, size) => dispatch(updateEmojiElement({ id, changes: { size } }))}
                    onRemove={(id) => {
                      dispatch(removeEmojiElement(id));
                      if (selectedEmojiId === id) setSelectedEmojiId(cart.card.emojiElements.find((item) => item.id !== id)?.id || null);
                    }}
                  />

                  <div className="mt-8 flex flex-col gap-3 border-t border-[#eadfd8] pt-6 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={() => setStep("customize")}
                      className="focus-ring rounded-full border border-[#d9cbc4] bg-white px-5 py-3 text-xs font-black text-[#182443] hover:border-[#ee5264]"
                    >
                      Volver a secciones
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep("preview")}
                      className="focus-ring inline-flex items-center justify-center gap-2 rounded-full bg-[#ee5264] px-6 py-3 text-xs font-black text-white hover:bg-[#d83d54]"
                    >
                      Continuar a Vista previa <Icon name="arrow" size={15} />
                    </button>
                  </div>
                </section>

                <section className="order-1 rounded-[26px] bg-[#f8efe8] p-5 sm:p-8 lg:order-2">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[.18em] text-[#7b7180]">
                      Lienzo interactivo
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black text-[#182443]">
                      Arrastra y suelta
                    </span>
                  </div>
                  <div className="mx-auto max-w-[620px] rounded-[18px] bg-white p-3 shadow-xl shadow-[#8a564c]/10 sm:p-5">
                    <CardPreview
                      templateId={template.id}
                      message={cart.card.frontHeadline || cart.card.message}
                      emojiElements={cart.card.emojiElements}
                      onEmojiElementPositionChange={(id, position) => dispatch(updateEmojiElement({ id, changes: { position } }))}
                      onEmojiSelect={setSelectedEmojiId}
                      photoDataUrl={cart.card.photoDataUrls[0]}
                      photoDataUrls={cart.card.photoDataUrls}
                      photoZoom={cart.card.photoZoom}
                      photoPosition={cart.card.photoPosition}
                      size={cart.card.size}
                    />
                  </div>
                  <p className="mt-3 text-center text-xs text-[#7b7180]">
                    Haz clic en un emoji o arrástralo sobre la tarjeta para colocarlo en cualquier posición.
                  </p>
                </section>
              </div>
            </>
          )}

          {/* STEP 5: PREVIEW */}
          {step === "preview" && (
            <>
              <PageIntro
                eyebrow={!template.requiresFrame ? "PASO 4 DE 5 · VISTA COMPLETA" : "PASO 5 DE 6 · VISTA COMPLETA"}
                title="Revisa las 4 caras de tu tarjeta"
                body="Comprueba cómo lucirá la tarjeta física desplegada antes de pasar a los extras o finalizar tu compra."
              />
              <PostcardPreviewWindow />
              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setStep("customize")}
                  className="focus-ring inline-flex items-center justify-center gap-2 rounded-full border border-[#d9cbc4] bg-white px-6 py-3.5 text-sm font-black text-[#182443] hover:border-[#ee5264]"
                >
                  <Icon name="edit" size={15} /> Volver a editar
                </button>
                <button
                  type="button"
                  onClick={() => setStep("extras")}
                  className="focus-ring inline-flex min-w-[240px] items-center justify-center gap-2 rounded-full bg-[#ee5264] px-7 py-3.5 text-sm font-black text-white transition hover:bg-[#d83d54]"
                >
                  Continuar a Extras (Paso 6) <Icon name="arrow" size={16} />
                </button>
              </div>
              <p className="mt-4 text-center text-xs text-[#7c8191]">
                Tu diseño ya está guardado en esta sesión.
              </p>
            </>
          )}

          {/* STEP 6: EXTRAS */}
          {step === "extras" && (
            <ExtrasStep
              cart={cart}
              dispatch={dispatch}
              stickerFileRef={stickerFileRef}
              handleStickerPhoto={handleStickerPhoto}
              onBack={() => setStep("preview")}
              setToast={setToast}
            />
          )}
        </div>
      </main>
      <SiteFooter />
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </>
  );
}
function TemplateStep({
  categoryId,
  selectedId,
  onCategorySelect,
  onSelect,
  onContinue,
}: {
  categoryId: DesignCategoryId;
  selectedId: string | null;
  onCategorySelect: (id: DesignCategoryId) => void;
  onSelect: (id: string) => void;
  onContinue: () => void;
}) {
  const category = designCategories.find((item) => item.id === categoryId) || designCategories[0];
  return (
    <section aria-labelledby="template-step-title">
      <PageIntro
        eyebrow="PASO 1 · EMPIEZA AQUÍ"
        title="Elige tu Plantilla"
        body="Primero selecciona la ocasión y después una de nuestras tres composiciones. Es obligatorio elegir plantilla para poder personalizar."
      />
      <div className="mt-12 rounded-[26px] border border-[#eadbd3] bg-[#fffaf5] p-5 sm:p-7">
        <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.17em] text-[#ee5264]">1 · Elige la ocasión</p>
            <h2 className="mt-1 text-xl font-black text-[#182443]">¿Qué quieres celebrar?</h2>
          </div>
          <p className="max-w-[350px] text-xs leading-5 text-[#737b90]">
            Explora las categorías y encuentra el tono perfecto para tu tarjeta.
          </p>
        </div>
        <OccasionPicker activeId={categoryId} onChange={onCategorySelect} />
      </div>

      <div className="mb-5 mt-10 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.17em] text-[#ee5264]">2 · Selecciona el diseño</p>
          <h2 className="mt-1 text-xl font-black text-[#182443]">Elige una de las 3 plantillas</h2>
        </div>
        <p className="max-w-[380px] text-xs leading-5 text-[#737b90]">
          <span className="font-black text-[#182443]">{category.name}:</span> {category.description}
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {templates.map((item, index) => {
          const selected = selectedId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(item.id)}
              className={`focus-ring group overflow-hidden rounded-[24px] border-2 bg-white text-left transition hover:-translate-y-1 hover:shadow-xl hover:shadow-[#8a564c]/10 ${
                selected ? "border-[#ee5264] shadow-lg shadow-[#8a564c]/10" : "border-[#eadbd3]"
              }`}
            >
              <span className="relative block aspect-[1.12/1] overflow-hidden bg-[#fffaf5] p-3">
                {item.magazineStyle ? (
                  <span className="flex h-full items-center justify-center">
                    <span className="block aspect-[.82/1] h-[94%] overflow-hidden rounded shadow-lg">
                      <MagazineFront compact message={magazineHeadline} />
                    </span>
                  </span>
                ) : (
                  <img
                    src={item.image}
                    alt={`Vista de ${item.name}`}
                    className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.02]"
                  />
                )}
                <span
                  className={`absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full border-2 bg-white ${
                    selected ? "border-[#ee5264] text-[#ee5264]" : "border-[#d3c8c1] text-transparent"
                  }`}
                >
                  <Icon name="check" size={14} />
                </span>
                {item.magazineStyle && (
                  <span className="absolute bottom-4 left-4 rounded-full bg-[#182443] px-3 py-1.5 text-[9px] font-black uppercase tracking-[.12em] text-white">
                    1 + 3 fotos · Revista
                  </span>
                )}
              </span>
              <span className="block p-5">
                <span className="text-[10px] font-black uppercase tracking-[.15em] text-[#ee5264]">Opción {index + 1}</span>
                <span className="mt-1 block text-lg font-black">{item.name}</span>
                <span className="mt-2 block text-sm leading-6 text-[#737b90]">{item.description}</span>
                <span className="mt-4 block text-xs font-bold text-[#59627b]">
                  {item.magazineStyle ? "Sin marco · Va directo al editor" : "Paso de marco a continuación"}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-9 flex flex-col items-center">
        <button
          type="button"
          disabled={!selectedId}
          onClick={onContinue}
          className="focus-ring inline-flex min-w-[240px] items-center justify-center gap-2 rounded-full bg-[#ee5264] px-6 py-3.5 text-sm font-black text-white transition hover:bg-[#d83d54] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Empezar a personalizar <Icon name="arrow" size={16} />
        </button>
        <p className="mt-3 text-center text-xs text-[#7c8191]">
          {selectedId ? "Plantilla seleccionada. Pulsa para continuar." : "Selecciona una plantilla para continuar."}
        </p>
      </div>
    </section>
  );
}

function FrameStep({
  selectedId,
  onSelect,
  onBack,
  onContinue,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <section aria-labelledby="frame-step-title">
      <PageIntro
        eyebrow="PASO 2 · ELIGE MARCO"
        title="Ahora, elige un marco"
        body="Este paso solo aparece para las Plantillas 2 y 3. La Plantilla 1 continúa directamente al editor porque ya incluye su diseño exclusivo de revista."
      />
      <div className="mx-auto mt-12 grid max-w-[960px] gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {frames.map((item) => {
          const selected = selectedId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(item.id)}
              className={`focus-ring group overflow-hidden rounded-[22px] border-2 bg-white text-left transition hover:-translate-y-1 hover:shadow-lg ${
                selected ? "border-[#ee5264]" : "border-[#eadbd3]"
              }`}
            >
              <span className="relative block aspect-square overflow-hidden bg-[#f8efe8]">
                <img src={item.image} alt={item.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                <span
                  className={`absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full border-2 bg-white ${
                    selected ? "border-[#ee5264] text-[#ee5264]" : "border-[#d3c8c1] text-transparent"
                  }`}
                >
                  <Icon name="check" size={14} />
                </span>
              </span>
              <span className="block p-4 text-sm font-black">{item.name}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onBack}
          className="focus-ring rounded-full border border-[#d9cbc4] bg-white px-6 py-3.5 text-sm font-black text-[#182443] hover:border-[#ee5264]"
        >
          Volver a plantillas
        </button>
        <button
          type="button"
          disabled={!selectedId}
          onClick={onContinue}
          className="focus-ring inline-flex min-w-[220px] items-center justify-center gap-2 rounded-full bg-[#ee5264] px-6 py-3.5 text-sm font-black text-white transition hover:bg-[#d83d54] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Personalizar tarjeta <Icon name="arrow" size={16} />
        </button>
      </div>
    </section>
  );
}

function ExtrasStep({
  cart,
  dispatch,
  stickerFileRef,
  handleStickerPhoto,
  onBack,
  setToast,
}: {
  cart: RootState["cart"];
  dispatch: ReturnType<typeof useDispatch>;
  stickerFileRef: React.RefObject<HTMLInputElement>;
  handleStickerPhoto: (e: ChangeEvent<HTMLInputElement>) => void;
  onBack: () => void;
  setToast: (msg: string) => void;
}) {
  const template = templates.find((item) => item.id === cart.card.templateId) || templates[0];
  const sticker = addOns[0];
  const stickerPrice = STICKER_PRICES[cart.stickerQuantity];
  const envelopePrice = cart.envelopeTextAdded ? ENVELOPE_TEXT_PRICE : 0;
  const extrasTotal = stickerPrice + envelopePrice;
  const totalWithCard = template.price + extrasTotal;

  return (
    <section aria-labelledby="extras-step-title">
      <PageIntro
        eyebrow="PASO 6 · EXTRAS OPCIONALES"
        title="Completa tu momento con extras"
        body="Detalles opcionales pensados con cariño para que abrir el paquete sea todavía más especial e inolvidable."
      />

      <div className="mt-12 grid gap-8 lg:grid-cols-[1.1fr_.9fr]">
        <div className="space-y-8">
          {/* STICKERS */}
          <div className="rounded-[26px] border border-[#eadbd3] bg-[#fffaf5] p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-black tracking-[.18em] text-[#ee5264]">01 · PEGATINAS PERSONALIZADAS</span>
                <h3 className="mt-1 text-xl font-black">{sticker.name}</h3>
                <p className="mt-1 max-w-[440px] text-xs leading-5 text-[#737b90]">{sticker.description}</p>
              </div>
              <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-[4px] border-white bg-[#fff0e8] shadow-[0_0_0_2px_#f8c75e] sm:h-24 sm:w-24">
                {cart.stickerImage ? (
                  <img src={cart.stickerImage} alt="Sticker" className="h-full w-full object-cover" />
                ) : (
                  <img src={sticker.image} alt="Ejemplo de sticker" className="h-full w-full object-cover" />
                )}
                <span className="absolute bottom-1 rounded-full bg-[#182443]/85 px-1.5 py-0.5 text-[8px] font-black text-white">
                  7,62 cm
                </span>
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-white p-4 border border-[#eadbd3]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black">Elige cuántos stickers quieres</p>
                  <p className="mt-0.5 text-[11px] text-[#737b90]">1=€1.50 · 2=€2.50 · 3=€3.50</p>
                </div>
                <span className="text-base font-black">
                  {cart.stickerQuantity === 0 ? "Sin sticker" : <Price value={stickerPrice} />}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-4 gap-2">
                {([0, 1, 2, 3] as const).map((quantity) => (
                  <button
                    key={quantity}
                    type="button"
                    onClick={() => {
                      dispatch(setStickerQuantity(quantity));
                      if (quantity > 0) setToast(`Sticker${quantity > 1 ? "s" : ""} añadido${quantity > 1 ? "s" : ""}`);
                    }}
                    className={`focus-ring rounded-xl border py-2.5 text-xs font-black transition ${
                      cart.stickerQuantity === quantity
                        ? "border-[#ee5264] bg-[#fff0e8] text-[#ee5264]"
                        : "border-[#dfd3cc] bg-white hover:border-[#ee5264]"
                    }`}
                  >
                    {quantity === 0 ? (
                      "No"
                    ) : (
                      <>
                        <span className="block">{quantity}</span>
                        <span className="mt-0.5 block text-[10px] font-normal text-[#737b90]">
                          {STICKER_PRICES[quantity].toFixed(2).replace(".", ",")} €
                        </span>
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => stickerFileRef.current?.click()}
              className="focus-ring mt-3 flex w-full items-center gap-3 rounded-xl border border-dashed border-[#e7a59c] bg-white p-3 text-left transition hover:bg-[#fff0e8]"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff0e8] text-[#ee5264]">
                <Icon name="plus" size={16} />
              </span>
              <span>
                <span className="block text-xs font-black">
                  {cart.stickerImage ? "Cambiar foto del sticker" : "Subir foto propia para el sticker"}
                </span>
                <span className="block text-[10px] text-[#7c8191]">
                  Tu foto se recorta automáticamente al círculo · JPG o PNG
                </span>
              </span>
            </button>
            <input ref={stickerFileRef} onChange={handleStickerPhoto} type="file" accept="image/png,image/jpeg" className="hidden" />

            <div className="mt-4">
              <p className="text-[10px] font-black uppercase tracking-[.13em] text-[#9297a4]">Inspiración</p>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {stickerGallery.map((item) => (
                  <div key={item.id} className="overflow-hidden rounded-xl bg-[#f8efe8]">
                    <img src={item.image} alt={item.label} className="aspect-square w-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ENVELOPE PERSONALIZED MESSAGE */}
          <div className="rounded-[26px] border border-[#eadbd3] bg-[#fffaf5] p-5 sm:p-7">
            <span className="text-[10px] font-black tracking-[.18em] text-[#ee5264]">02 · MENSAJE EN EL EXTERIOR DEL SOBRE</span>
            <div className="mt-2 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black">Texto personalizado en el sobre</h3>
                <p className="mt-0.5 text-xs text-[#737b90]">
                  Imprime una frase especial en el exterior del sobre. Será lo primero que vean (+1,00 €).
                </p>
              </div>
              <span className="text-sm font-black text-[#ee5264]">
                <Price value={ENVELOPE_TEXT_PRICE} />
              </span>
            </div>

            <div className="mt-4 rounded-2xl border border-[#e5d8d0] bg-white p-4">
              <div className="border-b border-[#e5d8d0] pb-3 text-center">
                <span className="text-[9px] font-black uppercase tracking-[.16em] text-[#9297a4]">VISTA PREVIA DEL SOBRE</span>
                <p className="serif mx-auto mt-2 min-h-6 max-w-[400px] text-base font-bold italic text-[#182443]">
                  {cart.envelopeText || "Tu dedicatoria especial aparecerá aquí…"}
                </p>
              </div>
              <textarea
                value={cart.envelopeText}
                onChange={(e) => dispatch(setEnvelopeText(e.target.value))}
                maxLength={80}
                rows={2}
                placeholder="Ej.: Para alguien que ilumina todos mis días ✨"
                className="focus-ring mt-3 w-full resize-none rounded-xl border border-[#dfd3cc] bg-white p-2.5 text-xs text-[#182443]"
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] text-[#9297a4]">{cart.envelopeText.length}/80</span>
                <button
                  type="button"
                  onClick={() => {
                    if (!cart.envelopeTextAdded && !cart.envelopeText.trim()) {
                      return setToast("Escribe primero el texto del sobre");
                    }
                    dispatch(setEnvelopeTextAdded(!cart.envelopeTextAdded));
                    setToast(cart.envelopeTextAdded ? "Texto del sobre eliminado" : "Texto del sobre añadido (+1,00 €)");
                  }}
                  className={`focus-ring rounded-full px-4 py-2 text-xs font-black transition ${
                    cart.envelopeTextAdded
                      ? "border border-[#ee5264] bg-white text-[#ee5264]"
                      : "bg-[#182443] text-white hover:bg-[#ee5264]"
                  }`}
                >
                  {cart.envelopeTextAdded ? "Eliminar del pedido" : "Añadir por 1,00 €"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Order Summary Aside */}
        <aside className="h-fit rounded-[24px] bg-[#182443] p-6 text-white sm:p-7 lg:sticky lg:top-24">
          <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#f8c75e]">RESUMEN DEL PEDIDO</p>
          <h3 className="mt-1 text-2xl font-black">Tu selección</h3>

          <div className="mt-6 space-y-3.5 border-b border-white/10 pb-5 text-sm">
            <div className="flex justify-between text-white/80">
              <span>{template.name} ({cart.card.size})</span>
              <Price value={template.price} />
            </div>
            {cart.stickerQuantity > 0 && (
              <div className="flex justify-between text-white/80">
                <span>Stickers personalizados × {cart.stickerQuantity}</span>
                <Price value={stickerPrice} />
              </div>
            )}

            {cart.envelopeTextAdded && (
              <div className="flex justify-between text-white/80">
                <span>Mensaje impreso en el sobre</span>
                <Price value={ENVELOPE_TEXT_PRICE} />
              </div>
            )}
          </div>

          <div className="mt-5 flex justify-between text-lg font-black">
            <span>Subtotal</span>
            <Price value={totalWithCard} />
          </div>

          <p className="mt-3 text-xs text-white/60">
            {totalWithCard >= 35
              ? "🎉 ¡Enhorabuena! Tu pedido supera los 35 € y tiene envío gratis."
              : `Añade ${(35 - totalWithCard).toFixed(2).replace(".", ",")} € más para conseguir envío gratis.`}
          </p>

          <div className="mt-6 space-y-3">
            <Link
              href="/cart"
              className="focus-ring flex w-full items-center justify-center gap-2 rounded-full bg-[#ee5264] px-6 py-3.5 text-sm font-black text-white transition hover:bg-[#d83d54]"
            >
              Añadir a la cesta <Icon name="bag" size={17} />
            </Link>
            <button
              type="button"
              onClick={onBack}
              className="focus-ring flex w-full items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-3 text-xs font-black text-white transition hover:bg-white/20"
            >
              Volver a Vista previa
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}
