"use client";

import { getSessionUser } from "@/lib/client-session";
import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CardPreview } from "@/components/card-preview";
import { EmojiElementControls } from "@/components/emoji-element-controls";
import { Icon } from "@/components/icons";
import { PostcardPreviewWindow, PostcardSideView, type PostcardSide } from "@/components/postcard-preview";
import { magazineHeadline, magazineSubheadline, magazineInsideLeft, magazineInsideRight } from "@/components/magazine-card";
import { PageIntro, Price, SiteFooter, SiteHeader, Spinner, Toast } from "@/components/site";
import { CARD_SIZES, DEFAULT_CARD_SIZE, cardSizeText, designCategories, frames, templates } from "@/lib/data";
import { usePublicSettings } from "@/lib/public-settings";
import { amountUntilFreeShippingCents, qualifiesForFreeShipping } from "@/lib/shipping";
import { type EmojiOption } from "@/lib/emojis";
import {
  RootState,
  addEmojiElement,
  removeEmojiElement,
  resetCurrentDraft,
  saveCartItem,
  loadCartItem,
  setEmoji,
  setEmojiElements,
  setMagazineDate,
  setMagazineCategory,
  setMagazineBadge,
  setMagazineHeadlineTag,
  setMagazineFooter,
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
  setTemplate,
  updateEmojiElement,
} from "@/lib/store";

type FlowStep = "template" | "frame" | "customize" | "emojis" | "preview" | "summary";

export default function CustomizePage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const cart = useSelector((state: RootState) => state.cart);
  const isPortuguese = useSelector((state: RootState) => state.language.language === "pt");
  const tx = (es: string, pt: string) => isPortuguese ? pt : es;
  const cropPositions = isPortuguese
    ? ([['left', 'Esquerda'], ['center', 'Centro'], ['right', 'Direita'], ['top', 'Topo'], ['bottom', 'Fundo']] as const)
    : ([['left', 'Izquierda'], ['center', 'Centro'], ['right', 'Derecha'], ['top', 'Arriba'], ['bottom', 'Abajo']] as const);
  const [step, setStep] = useState<FlowStep>("template");
  const [chosenTemplateId, setChosenTemplateId] = useState<string | null>(null);
  const [chosenFrameId, setChosenFrameId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<PostcardSide>("front");
  const [uploadIndex, setUploadIndex] = useState(0);
  const [selectedEmojiId, setSelectedEmojiId] = useState<string | null>(cart.card.emojiElements[0]?.id || null);
  const [toast, setToast] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [cardProduct, setCardProduct] = useState<{ id: string; name: string; priceCents: number } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const { settings } = usePublicSettings();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEditItemId(params.get("edit"));
    setPendingTemplateId(params.get("template"));
    setSelectedProductId(params.get("product"));
  }, []);

  useEffect(() => {
    let active = true;
    void getSessionUser().then(() => { if (active) setAuthChecked(true); });
    return () => { active = false; };
  }, []);

  // Card products come from the database and must be active Cards; anything else is dropped.
  useEffect(() => {
    if (!selectedProductId) { setCardProduct(null); return; }
    let active = true;
    fetch("/api/products?kind=POSTCARD", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Unable to load products");
        const product = (body.products as { id: string; name: string; basePriceCents: number }[]).find((item) => item.id === selectedProductId);
        if (!active) return;
        if (product) { setCardProduct({ id: product.id, name: product.name, priceCents: product.basePriceCents }); return; }
        setSelectedProductId(null);
        setCardProduct(null);
        setToast(tx("Esta tarjeta ya no está disponible. Puedes seguir con un diseño estándar.", "Este cartão já não está disponível. Podes continuar com um design padrão."));
      })
      .catch(() => { if (active) setToast(tx("No hemos podido cargar la tarjeta seleccionada.", "Não foi possível carregar o cartão selecionado.")); });
    return () => { active = false; };
  // tx only depends on the current language.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProductId]);

  const template = templates.find((item) => item.id === (chosenTemplateId || cart.card.templateId)) || templates[0];
  const frame = frames.find((item) => item.id === (chosenFrameId || cart.card.frameId)) || frames[0];
  const isMagazine = Boolean(template.magazineStyle);
  const isTraditional = Boolean(template.longText);
  const isCollage = template.id === "template-2";
  const rightPrimaryPhotoIndex = isTraditional ? 1 : isMagazine ? 2 : 3;
  const magazineCopy = isPortuguese
    ? { headline: "Hoje celebra-se o 13.º aniversário do Roberto García", subheadline: "Que tenhas um dia tão incrível como tu, Roberto! 🎉 ⚽ 💙", insideLeft: "Os teus avós, a tua irmã, o pai, a mãe e o Rocky gostam muito de ti.", insideRight: "Continua assim, campeão!!" }
    : { headline: magazineHeadline, subheadline: magazineSubheadline, insideLeft: magazineInsideLeft, insideRight: magazineInsideRight };

  useEffect(() => {
    if (!editItemId) return;
    const item = cart.items.find((current) => current.id === editItemId);
    if (!item) return;
    dispatch(loadCartItem(editItemId));
    setChosenTemplateId(item.card.templateId);
    setChosenFrameId(item.card.frameId);
    setSelectedProductId(item.productId || null);
    setActiveSection("front");
  }, [cart.items, dispatch, editItemId]);

  const chooseTemplate = (templateId: string) => {
    const nextTemplate = templates.find((item) => item.id === templateId) || templates[0];
    setChosenTemplateId(nextTemplate.id);
    setChosenFrameId(null);
    dispatch(resetCurrentDraft());
    dispatch(setTemplate(nextTemplate.id));
    dispatch(setFrame(nextTemplate.requiresFrame ? frames[0].id : null));
    dispatch(setPhotoSlots(nextTemplate.imageCount));
    if (nextTemplate.magazineStyle) {
      dispatch(setMessage(magazineCopy.headline));
      dispatch(setFrontHeadline(magazineCopy.headline));
      dispatch(setFrontSubheadline(magazineCopy.subheadline));
      dispatch(setInsideLeftText(magazineCopy.insideLeft));
      dispatch(setInsideRightText(magazineCopy.insideRight));
      dispatch(setBackText(isPortuguese ? "Um cartão criado especialmente para alguém especial." : "Una tarjeta creada especialmente para alguien especial."));
    } else {
      const message = isPortuguese ? "Parabéns" : "Enhorabuena";
      dispatch(setMessage(message));
      dispatch(setFrontSubheadline(""));
      dispatch(setInsideLeftText(isPortuguese ? "Escreve aqui a tua dedicatória pessoal." : "Escribe aquí tu dedicatoria personal."));
      dispatch(setInsideRightText(isPortuguese ? "Com todo o meu carinho." : "Con todo mi cariño."));
      dispatch(setBackText(isPortuguese ? "Feito especialmente para ti." : "Hecha especialmente para ti."));
    }
  };

  useEffect(() => {
    if (!pendingTemplateId || editItemId) return;
    const nextTemplate = templates.find((item) => item.id === pendingTemplateId);
    if (!nextTemplate) return;
    chooseTemplate(nextTemplate.id);
    setStep(nextTemplate.requiresFrame ? "frame" : "customize");
    setPendingTemplateId(null);
  }, [editItemId, pendingTemplateId]);

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
      setToast(isPortuguese ? `Fotografia ${uploadIndex + 1} atualizada` : `Foto ${uploadIndex + 1} actualizada`);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };


  const reset = () => {
    if (isMagazine) {
      dispatch(setMessage(magazineCopy.headline));
      dispatch(setFrontHeadline(magazineCopy.headline));
      dispatch(setFrontSubheadline(magazineCopy.subheadline));
      dispatch(setInsideLeftText(magazineCopy.insideLeft));
      dispatch(setInsideRightText(magazineCopy.insideRight));
      dispatch(setBackText(isPortuguese ? "Um cartão criado especialmente para alguém especial." : "Una tarjeta creada especialmente para alguien especial."));
    } else {
      const message = isPortuguese ? "Parabéns" : "Enhorabuena";
      dispatch(setMessage(message));
      dispatch(setFrontHeadline(message));
      dispatch(setFrontSubheadline(""));
      dispatch(setInsideLeftText(isPortuguese ? "Escreve aqui a tua dedicatória pessoal." : "Escribe aquí tu dedicatoria personal."));
      dispatch(setInsideRightText(isPortuguese ? "Com todo o meu carinho." : "Con todo mi cariño."));
      dispatch(setBackText(isPortuguese ? "Feito especialmente para ti." : "Hecha especialmente para ti."));
    }
    dispatch(setEmoji(""));
    dispatch(setEmojiElements([]));
    setSelectedEmojiId(null);
    dispatch(setPhotoSlots(template.imageCount));
    for (let index = 0; index < template.imageCount; index += 1) dispatch(setPhotoAt({ index, dataUrl: null }));
    dispatch(setPhotoZoom(1));
    dispatch(setPhotoPosition("center"));
    dispatch(setSize(DEFAULT_CARD_SIZE));
    setToast(isPortuguese ? "Personalização reposta" : "Personalización restablecida");
  };

  const addEmoji = (option: EmojiOption) => {
    const id = `emoji-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const offset = cart.card.emojiElements.length % 6;
    dispatch(addEmojiElement({ id, emoji: option.emoji, tone: option.tone || "natural", size: 32, position: { x: 18 + offset * 12, y: 16 + (offset % 2) * 12 } }));
    setSelectedEmojiId(id);
    setToast(isPortuguese ? `Emoji ${option.emoji} adicionado` : `Emoji ${option.emoji} añadido`);
  };

  const openEmojiStep = () => {
    setActiveSection("front");
    setStep("emojis");
  };

  const handleAddToCart = async () => {
    setAddingToCart(true);
    try {
      const user = await getSessionUser({ refresh: true });
      if (!user) {
        setAuthChecked(true);
        setToast(tx("No se puede añadir el diseño a la cesta sin iniciar sesión. Inicia sesión o crea una cuenta para continuar.", "Não é possível adicionar o design ao carrinho sem iniciar sessão. Inicia sessão ou cria uma conta para continuar."));
        return;
      }
      setAuthChecked(true);
      if (selectedProductId && cardProduct?.id !== selectedProductId) {
        setToast(tx("Estamos cargando la tarjeta seleccionada. Inténtalo de nuevo en un momento.", "Estamos a carregar o cartão selecionado. Tenta novamente dentro de momentos."));
        return;
      }
      dispatch(saveCartItem({ id: editItemId || undefined, quantity: editItemId ? cart.items.find((item) => item.id === editItemId)?.quantity : undefined, productId: selectedProductId, productPriceCents: cardProduct?.priceCents ?? null, productName: cardProduct?.name ?? null, card: cart.card }));
      router.push("/cart");
    } catch {
      setToast(tx("No hemos podido verificar tu sesión. Inténtalo de nuevo.", "Não foi possível verificar a tua sessão. Tenta novamente."));
    } finally {
      setAddingToCart(false);
    }
  };

  // 6-step progress steps (or 5 if frame skipped for Magazine)
  const progressSteps: { id: FlowStep; label: string }[] = template.requiresFrame
    ? [
        { id: "template", label: tx("Plantilla", "Modelo") },
        { id: "frame", label: tx("Marco", "Moldura") },
        { id: "customize", label: tx("Secciones", "Secções") },
        { id: "emojis", label: "Emojis" },
        { id: "preview", label: tx("Vista previa", "Pré-visualização") },
        { id: "summary", label: tx("Resumen", "Resumo") },
      ]
    : [
        { id: "template", label: tx("Plantilla", "Modelo") },
        { id: "customize", label: tx("Secciones", "Secções") },
        { id: "emojis", label: "Emojis" },
        { id: "preview", label: tx("Vista previa", "Pré-visualização") },
        { id: "summary", label: tx("Resumen", "Resumo") },
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
          <ol className="mx-auto mb-10 flex max-w-[840px] items-center" aria-label={tx("Progreso de personalización", "Progresso da personalização")}>
            {progressSteps.map((item, index) => {
              const isCurrent = item.id === step;
              const isCompleted = index < activeProgressIndex;
              const allowed = canNavigateTo(item.id);
              return (
                <li key={item.id} className={`flex items-center ${index < progressSteps.length - 1 ? "flex-1" : ""}`}>
                  <button
                    type="button"
                    disabled={!allowed}
                    onClick={() => (item.id === "emojis" ? openEmojiStep() : setStep(item.id))}
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
              selectedId={chosenTemplateId}
              onSelect={chooseTemplate}
              onContinue={continueFromTemplate}
              isPortuguese={isPortuguese}
            />
          )}

          {/* STEP 2: FRAME (Templates 2 & 3 only) */}
          {step === "frame" && (
            <FrameStep
              selectedId={chosenFrameId || cart.card.frameId}
              onSelect={chooseFrame}
              onBack={() => setStep("template")}
              onContinue={() => setStep("customize")}
              isPortuguese={isPortuguese}
            />
          )}

          {/* STEP 3: SECTION-BY-SECTION CUSTOMIZATION */}
          {step === "customize" && (
            <>
              <PageIntro
                eyebrow={!template.requiresFrame ? tx("PASO 2 DE 5 · SECCIONES", "PASSO 2 DE 5 · SECÇÕES") : tx("PASO 3 DE 6 · SECCIONES", "PASSO 3 DE 6 · SECÇÕES")}
                title={tx("Personalización por secciones", "Personalização por secções")}
                body={
                  !template.requiresFrame
                    ? tx(`Edita las 4 caras de tu tarjeta revista (Portada, Interior Izquierdo, Interior Derecho y Contraportada) con sus ${template.imageCount} fotos y textos.`, `Edita as 4 faces do teu cartão revista (Capa, Interior esquerdo, Interior direito e Contracapa) com as suas ${template.imageCount} fotografias e textos.`)
                    : tx(`Has elegido ${template.name} con el marco “${frame.name}”. Personaliza cada cara de la tarjeta paso a paso.`, `Escolheste ${template.namePt || template.name} com a moldura “${frame.namePt || frame.name}”. Personaliza cada face do cartão passo a passo.`)
                }
              />

              {/* Section Sub-Navigation Tabs */}
              <div className="mt-8 flex items-center justify-center">
                <nav
                  className="inline-flex rounded-full border border-[#eadfd8] bg-[#fffaf5] p-1.5 shadow-sm"
                  aria-label={tx("Seleccionar sección para editar", "Selecionar secção para editar")}
                >
                  {[
                    { id: "front" as PostcardSide, label: tx("1. Portada", "1. Capa"), icon: "📄" },
                    { id: "inside-left" as PostcardSide, label: tx("2. Interior Izq.", "2. Interior Esq."), icon: "📖" },
                    { id: "inside-right" as PostcardSide, label: tx("3. Interior Dcho.", "3. Interior Dir."), icon: "✍️" },
                    { id: "back" as PostcardSide, label: tx("4. Contraportada", "4. Contracapa"), icon: "✨" },
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
                        {activeSection === "front" && tx("Cara 1: Portada", "Face 1: Capa")}
                        {activeSection === "inside-left" && tx("Cara 2: Interior Izquierdo", "Face 2: Interior Esquerdo")}
                        {activeSection === "inside-right" && tx("Cara 3: Interior Derecho", "Face 3: Interior Direito")}
                        {activeSection === "back" && tx("Cara 4: Contraportada", "Face 4: Contracapa")}
                      </h2>
                      <button
                        onClick={() => setStep(template.requiresFrame ? "frame" : "template")}
                        className="mt-2 text-xs font-bold text-[#7c8191] underline underline-offset-4 hover:text-[#ee5264]"
                      >
                        {tx("Cambiar", "Alterar")} {template.requiresFrame ? tx("marco o plantilla", "moldura ou modelo") : tx("plantilla", "modelo")}
                      </button>
                    </div>
                    <button onClick={reset} className="text-xs font-bold text-[#7c8191] underline underline-offset-4 hover:text-[#ee5264]">
                      {tx("Restablecer", "Repor")}
                    </button>
                  </div>

                  {/* Section 1: FRONT */}
                  {activeSection === "front" && (
                    <div className="space-y-6 pt-5">
                      {isMagazine ? (
                        <div className="space-y-4">
                          <label className="block text-sm font-black">
                            {tx("Titular de Portada (Noticia principal)", "Título da capa (Notícia principal)")}
                            <textarea
                              value={cart.card.frontHeadline || cart.card.message}
                              onChange={(e) => dispatch(setFrontHeadline(e.target.value))}
                              rows={2}
                              maxLength={120}
                              placeholder="Hoy se celebra el 13 cumpleaños de Roberto García"
                              className="focus-ring mt-1.5 w-full resize-none rounded-xl border border-[#dfd3cc] bg-white p-3 text-sm font-semibold text-[#182443]"
                            />
                            <span className="mt-1 block text-right text-[10px] text-[#9297a4]">
                              {(cart.card.frontHeadline || cart.card.message).length}/120
                            </span>
                          </label>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label className="block text-xs font-black">
                              {tx("Cartel amarillo sobre la foto", "Cartaz amarelo sobre a foto")}
                              <input
                                type="text"
                                value={cart.card.magazineBadge ?? "¡FELIZ CUMPLEAÑOS!"}
                                onChange={(e) => dispatch(setMagazineBadge(e.target.value))}
                                maxLength={30}
                                className="focus-ring mt-1.5 w-full rounded-xl border border-[#dfd3cc] bg-white px-3 py-2 text-xs font-semibold text-[#182443]"
                              />
                            </label>

                            <label className="block text-xs font-black">
                              {tx("Distintivo rojo (cinta)", "Distintivo vermelho (fita)")}
                              <input
                                type="text"
                                value={cart.card.magazineHeadlineTag ?? "¡Atención!"}
                                onChange={(e) => dispatch(setMagazineHeadlineTag(e.target.value))}
                                maxLength={20}
                                className="focus-ring mt-1.5 w-full rounded-xl border border-[#dfd3cc] bg-white px-3 py-2 text-xs font-semibold text-[#182443]"
                              />
                            </label>
                          </div>

                          <label className="block text-xs font-black">
                            {tx("Mensaje / Frase destacada (cuadro estrella)", "Mensagem / Frase em destaque (quadro estrela)")}
                            <textarea
                              value={cart.card.frontSubheadline}
                              onChange={(e) => dispatch(setFrontSubheadline(e.target.value))}
                              rows={2}
                              maxLength={140}
                              placeholder="¡Que tengas un día tan increíble como tú, Roberto! 🎉⚽💙"
                              className="focus-ring mt-1.5 w-full resize-none rounded-xl border border-[#dfd3cc] bg-white p-2.5 text-xs text-[#182443]"
                            />
                          </label>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label className="block text-xs font-black">
                              {tx("Subcabecera (Categoría)", "Subtítulo (Categoria)")}
                              <input
                                type="text"
                                value={cart.card.magazineCategory ?? "LA NOTICIA DEL DÍA"}
                                onChange={(e) => dispatch(setMagazineCategory(e.target.value))}
                                maxLength={30}
                                className="focus-ring mt-1.5 w-full rounded-xl border border-[#dfd3cc] bg-white px-3 py-2 text-xs text-[#182443]"
                              />
                            </label>

                            <label className="block text-xs font-black">
                              {tx("Fecha y Número de Edición", "Data e Número de Edição")}
                              <input
                                type="text"
                                value={cart.card.magazineDate ?? "26 SEPTIEMBRE 2026 • Nº 01"}
                                onChange={(e) => dispatch(setMagazineDate(e.target.value))}
                                maxLength={35}
                                className="focus-ring mt-1.5 w-full rounded-xl border border-[#dfd3cc] bg-white px-3 py-2 text-xs text-[#182443]"
                              />
                            </label>
                          </div>

                          <label className="block text-xs font-black">
                            {tx("Texto Exclusiva (Pie de página)", "Texto Exclusivo (Rodapé)")}
                            <input
                              type="text"
                              value={cart.card.magazineFooter ?? "ROBERTO GARCÍA CELEBRA CON SU FAMILIA"}
                              onChange={(e) => dispatch(setMagazineFooter(e.target.value))}
                              maxLength={50}
                              className="focus-ring mt-1.5 w-full rounded-xl border border-[#dfd3cc] bg-white px-3 py-2 text-xs text-[#182443]"
                            />
                          </label>
                        </div>
                      ) : (
                        <label className="block text-sm font-black">
                          {tx("Titular / Mensaje de Portada", "Título / Mensagem da capa")}
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
                      )}

                      {/* Photo 1 Upload */}
                      <div>
                        <p className="text-sm font-black">{tx("Foto 1 · Portada principal", "Fotografia 1 · Capa principal")}</p>
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
                              <img src={cart.card.photoDataUrls[0]} alt={tx("Foto 1 de portada", "Fotografia 1 da capa")} className="h-full w-full object-cover" />
                            ) : (
                              <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[#ee5264]">
                                <Icon name="plus" size={24} />
                                <span className="text-xs font-black">{tx("AÑADIR FOTO DE PORTADA", "ADICIONAR FOTOGRAFIA DA CAPA")}</span>
                              </span>
                            )}
                          </button>
                          {cart.card.photoDataUrls[0] && (
                            <button
                              type="button"
                              onClick={() => dispatch(setPhotoAt({ index: 0, dataUrl: null }))}
                              className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm font-black text-[#ee5264] shadow"
                              aria-label={tx("Eliminar foto de portada", "Remover fotografia da capa")}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Photo crop/zoom controls */}
                      <div className={`rounded-2xl border border-[#eadbd3] bg-white p-4 ${cart.card.photoDataUrls[0] ? "" : "opacity-55"}`}>
                        <p className="text-xs font-black">{tx("Ajuste de encuadre (Foto 1)", "Ajuste do enquadramento (Fotografia 1)")}</p>
                        <label className="mt-3 block text-xs font-bold text-[#7c8191]">
                          {tx("Zoom", "Zoom")}
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
                          <p className="text-xs font-bold text-[#7c8191]">{tx("Posición", "Posição")}</p>
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
                        {tx("Texto / Dedicatoria interior izquierda", "Texto / Dedicatória do interior esquerdo")}
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

                      {/* Photo 2 Upload: not present on the traditional inside-left face */}
                      {!isTraditional && <div>
                        <p className="text-sm font-black">{tx("Foto 2 · Interior izquierdo", "Fotografia 2 · Interior esquerdo")}</p>
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
                              <img src={cart.card.photoDataUrls[1]} alt={tx("Foto 2 interior izquierdo", "Fotografia 2 do interior esquerdo")} className="h-full w-full object-cover" />
                            ) : (
                              <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[#ee5264]">
                                <Icon name="plus" size={24} />
                                <span className="text-xs font-black">{tx("AÑADIR FOTO DEL INTERIOR IZQUIERDO", "ADICIONAR FOTOGRAFIA DO INTERIOR ESQUERDO")}</span>
                              </span>
                            )}
                          </button>
                          {cart.card.photoDataUrls[1] && (
                            <button
                              type="button"
                              onClick={() => dispatch(setPhotoAt({ index: 1, dataUrl: null }))}
                              className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm font-black text-[#ee5264] shadow"
                              aria-label={tx("Eliminar foto 2", "Remover fotografia 2")}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </div>}

                      {isCollage && <div>
                        <p className="text-sm font-black">{tx("Foto 3 · Interior izquierdo inferior", "Fotografia 3 · Interior esquerdo inferior")}</p>
                        <div className="mt-2 relative overflow-hidden rounded-2xl border border-[#dfd3cc] bg-white">
                          <button type="button" onClick={() => { setUploadIndex(2); inputRef.current?.click(); }} className="focus-ring relative block aspect-[16/10] w-full overflow-hidden bg-[#f8efe8] text-left">
                            {cart.card.photoDataUrls[2] ? <img src={cart.card.photoDataUrls[2]} alt={tx("Foto 3 interior izquierdo", "Fotografia 3 do interior esquerdo")} className="h-full w-full object-cover" /> : <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[#ee5264]"><Icon name="plus" size={24} /><span className="text-xs font-black">{tx("AÑADIR FOTO 3", "ADICIONAR FOTOGRAFIA 3")}</span></span>}
                          </button>
                          {cart.card.photoDataUrls[2] && <button type="button" onClick={() => dispatch(setPhotoAt({ index: 2, dataUrl: null }))} className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm font-black text-[#ee5264] shadow" aria-label={tx("Eliminar foto 3", "Remover fotografia 3")}>×</button>}
                        </div>
                      </div>}
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

                      {/* Primary photo for the inside-right face */}
                      <div>
                        <p className="text-sm font-black">{tx(`Foto ${rightPrimaryPhotoIndex + 1} · Interior derecho superior`, `Fotografia ${rightPrimaryPhotoIndex + 1} · Interior direito superior`)}</p>
                        <div className="mt-2 relative overflow-hidden rounded-2xl border border-[#dfd3cc] bg-white">
                          <button
                            type="button"
                            onClick={() => {
                              setUploadIndex(rightPrimaryPhotoIndex);
                              inputRef.current?.click();
                            }}
                            className="focus-ring relative block aspect-[16/10] w-full overflow-hidden bg-[#f8efe8] text-left"
                          >
                            {cart.card.photoDataUrls[rightPrimaryPhotoIndex] ? (
                              <img src={cart.card.photoDataUrls[rightPrimaryPhotoIndex]} alt={`Foto ${rightPrimaryPhotoIndex + 1} interior derecho`} className="h-full w-full object-cover" />
                            ) : (
                              <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[#ee5264]">
                                <Icon name="plus" size={24} />
                                <span className="text-xs font-black">{tx(`AÑADIR FOTO ${rightPrimaryPhotoIndex + 1}`, `ADICIONAR FOTOGRAFIA ${rightPrimaryPhotoIndex + 1}`)}</span>
                              </span>
                            )}
                          </button>
                          {cart.card.photoDataUrls[rightPrimaryPhotoIndex] && (
                            <button
                              type="button"
                              onClick={() => dispatch(setPhotoAt({ index: rightPrimaryPhotoIndex, dataUrl: null }))}
                              className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm font-black text-[#ee5264] shadow"
                              aria-label={tx(`Eliminar foto ${rightPrimaryPhotoIndex + 1}`, `Remover fotografia ${rightPrimaryPhotoIndex + 1}`)}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Second inside-right photo: Magazine only */}
                      {isMagazine && (
                        <div>
                          <p className="text-sm font-black">{tx("Foto 4 · Interior derecho inferior", "Fotografia 4 · Interior direito inferior")}</p>
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
                                <img src={cart.card.photoDataUrls[3]} alt={tx("Foto 4 interior derecho", "Fotografia 4 do interior direito")} className="h-full w-full object-cover" />
                              ) : (
                                <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[#ee5264]">
                                  <Icon name="plus" size={24} />
                                  <span className="text-xs font-black">{tx("AÑADIR FOTO 4", "ADICIONAR FOTOGRAFIA 4")}</span>
                                </span>
                              )}
                            </button>
                            {cart.card.photoDataUrls[3] && (
                              <button
                                type="button"
                                onClick={() => dispatch(setPhotoAt({ index: 3, dataUrl: null }))}
                                className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm font-black text-[#ee5264] shadow"
                                aria-label={tx("Eliminar foto 4", "Remover fotografia 4")}
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
                        {tx("Mensaje de Contraportada / Cierre", "Mensagem da contracapa / Encerramento")}
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
                        <p className="text-sm font-black">{tx("Tamaño físico de la tarjeta", "Tamanho físico do cartão")}</p>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {CARD_SIZES.map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => dispatch(setSize(option.id))}
                              aria-pressed={cart.card.size === option.id}
                              className={`focus-ring rounded-2xl border p-3 text-left transition ${
                                cart.card.size === option.id
                                  ? "border-[#ee5264] bg-[#fff0e8]"
                                  : "border-[#dfd3cc] bg-white hover:border-[#ee5264]"
                              }`}
                            >
                              <span className="block text-sm font-black">{option.label}</span>
                              <span className="mt-1 block text-[11px] text-[#7c8191]">{option.dimensions}</span>
                              {settings.cardSizePrices[option.id] > 0 && <span className="mt-1 block text-[11px] font-black text-[#ee5264]">+<Price value={settings.cardSizePrices[option.id] / 100} /></span>}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-black">{tx("¿Dónde lo enviamos?", "Para onde o enviamos?")}</p>
                        <div className="mt-2 grid gap-2">
                          {(
                            [
                              ["recipient", tx("Directamente a quien lo recibe", "Diretamente a quem o recebe"), tx("Nosotros lo preparamos y lo entregamos por ti.", "Nós preparamo-lo e entregamo-lo por ti.")],
                              ["customer", tx("A mi dirección", "Para a minha morada"), tx("Recíbelo en casa, listo para entregar en mano.", "Recebe-o em casa, pronto para entregar em mão.")],
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
                      {tx("Anterior cara", "Face anterior")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const sideOrder: PostcardSide[] = ["front", "inside-left", "inside-right", "back"];
                        const currentIndex = sideOrder.indexOf(activeSection);
                        if (currentIndex < sideOrder.length - 1) {
                          setActiveSection(sideOrder[currentIndex + 1]);
                        } else {
                          openEmojiStep();
                        }
                      }}
                      className="focus-ring inline-flex items-center justify-center gap-2 rounded-full bg-[#ee5264] px-6 py-3 text-xs font-black text-white hover:bg-[#d83d54]"
                    >
                      {activeSection === "back" ? tx("Continuar a Emojis (Paso 4)", "Continuar para Emojis (Passo 4)") : tx("Siguiente cara", "Próxima face")}{" "}
                      <Icon name="arrow" size={15} />
                    </button>
                  </div>
                </section>

                {/* Section Live Preview */}
                <section className="order-1 rounded-[26px] bg-[#f8efe8] p-5 sm:p-8 lg:order-2">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[.18em] text-[#7b7180]">
                      {tx("Vista previa en vivo · Cara activa", "Pré-visualização ao vivo · Face ativa")}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black text-[#182443]">
                      {CARD_SIZES.find((option) => option.id === cart.card.size)?.label || cart.card.size} ·{" "}
                      {activeSection === "front" && tx("Portada", "Capa")}
                      {activeSection === "inside-left" && tx("Interior Izq.", "Interior Esq.")}
                      {activeSection === "inside-right" && tx("Interior Dcho.", "Interior Dir.")}
                      {activeSection === "back" && tx("Contraportada", "Contracapa")}
                    </span>
                  </div>
                  <div className="mx-auto max-w-[580px] overflow-hidden rounded-[18px]">
                    <PostcardSideView side={activeSection} compact={false} />
                  </div>
                  <p className="mt-3 text-center text-xs text-[#7b7180]">
                    {tx("Tus cambios se reflejan al instante en esta cara. En el siguiente paso podrás añadir y mover todos tus emojis.", "As tuas alterações aparecem imediatamente nesta face. No passo seguinte poderás adicionar e mover todos os teus emojis.")}
                  </p>
                  <div className="mt-5 flex justify-center">
                    <button
                      type="button"
                      onClick={openEmojiStep}
                      className="focus-ring inline-flex items-center gap-2 rounded-full bg-[#182443] px-6 py-3 text-xs font-black text-white hover:bg-[#ee5264]"
                    >
                      {tx("Ir a Emojis (Paso 4)", "Ir para Emojis (Passo 4)")} <Icon name="arrow" size={15} />
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
                eyebrow={!template.requiresFrame ? tx("PASO 3 DE 5 · EMOJIS", "PASSO 3 DE 5 · EMOJIS") : tx("PASO 4 DE 6 · EMOJIS", "PASSO 4 DE 6 · EMOJIS")}
                title={tx("Añade y coloca tus emojis en la portada", "Adiciona e posiciona os teus emojis na capa")}
                body={tx("Todos los emojis se añaden únicamente a la portada. Arrástralos sobre la tarjeta para situarlos exactamente donde te guste y cambia su tamaño con los controles.", "Todos os emojis são adicionados apenas à capa. Arrasta-os sobre o cartão para os posicionares exatamente onde quiseres e altera o tamanho com os controlos.")}
              />

              <div className="mt-10 grid gap-8 lg:grid-cols-[.85fr_1.15fr] lg:items-start">
                <section className="order-2 rounded-[24px] border border-[#eadfd8] bg-[#fffaf5] p-5 sm:p-7 lg:order-1">
                  <div className="border-b border-[#eadfd8] pb-4">
                    <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#ee5264]">{tx("Colección de emojis · Portada", "Coleção de emojis · Capa")}</p>
                    <h2 className="mt-1 text-xl font-black">{tx("Emojis para celebrar", "Emojis para celebrar")}</h2>
                    <p className="mt-1 text-xs text-[#7c8191]">
                      {tx("Elige de la colección, añade tantos como quieras y ajusta el tamaño de cada uno por separado (+ / −).", "Escolhe da coleção, adiciona quantos quiseres e ajusta o tamanho de cada um separadamente (+ / −).")}
                    </p>
                  </div>

                  <EmojiElementControls
                    items={cart.card.emojiElements}
                    language={isPortuguese ? "pt" : "es"}
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
                      {tx("Volver a secciones", "Voltar às secções")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep("preview")}
                      className="focus-ring inline-flex items-center justify-center gap-2 rounded-full bg-[#ee5264] px-6 py-3 text-xs font-black text-white hover:bg-[#d83d54]"
                    >
                      {tx("Continuar a Vista previa", "Continuar para a pré-visualização")} <Icon name="arrow" size={15} />
                    </button>
                  </div>
                </section>

                <section className="order-1 rounded-[26px] bg-[#f8efe8] p-5 sm:p-8 lg:order-2">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[.18em] text-[#7b7180]">
                      {tx("Portada · lienzo interactivo", "Capa · área interativa")}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black text-[#182443]">
                      {tx("Solo portada", "Apenas a capa")}
                    </span>
                  </div>
                  <div className="mx-auto max-w-[620px] rounded-[18px]">
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
                    {tx("Haz clic en un emoji o arrástralo sobre la tarjeta para colocarlo en cualquier posición.", "Clica num emoji ou arrasta-o sobre o cartão para o colocar em qualquer posição.")}
                  </p>
                </section>
              </div>
            </>
          )}

          {/* STEP 5: PREVIEW */}
          {step === "preview" && (
            <>
              <PageIntro
                eyebrow={!template.requiresFrame ? tx("PASO 4 DE 5 · VISTA COMPLETA", "PASSO 4 DE 5 · VISTA COMPLETA") : tx("PASO 5 DE 6 · VISTA COMPLETA", "PASSO 5 DE 6 · VISTA COMPLETA")}
                title={tx("Revisa las 4 caras de tu tarjeta", "Revê as 4 faces do teu cartão")}
                body={tx("Comprueba cómo lucirá la tarjeta física desplegada antes de revisar el resumen y añadirla a la cesta.", "Confirma como ficará o cartão físico aberto antes de rever o resumo e adicioná-lo ao carrinho.")}
              />
              <PostcardPreviewWindow />
              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setStep("customize")}
                  className="focus-ring inline-flex items-center justify-center gap-2 rounded-full border border-[#d9cbc4] bg-white px-6 py-3.5 text-sm font-black text-[#182443] hover:border-[#ee5264]"
                >
                  <Icon name="edit" size={15} /> {tx("Volver a editar", "Voltar a editar")}
                </button>
                <button
                  type="button"
                  onClick={() => setStep("summary")}
                  className="focus-ring inline-flex min-w-[240px] items-center justify-center gap-2 rounded-full bg-[#ee5264] px-7 py-3.5 text-sm font-black text-white transition hover:bg-[#d83d54]"
                >
                  {template.requiresFrame ? tx("Continuar al resumen (Paso 6)", "Continuar para o resumo (Passo 6)") : tx("Continuar al resumen (Paso 5)", "Continuar para o resumo (Passo 5)")} <Icon name="arrow" size={16} />
                </button>
              </div>
              <p className="mt-4 text-center text-xs text-[#7c8191]">
                {tx("Tu diseño ya está guardado en esta sesión.", "O teu design já está guardado nesta sessão.")}
              </p>
            </>
          )}

          {/* LAST STEP: SUMMARY */}
          {step === "summary" && (
            <SummaryStep
              cart={cart}
              stepLabel={template.requiresFrame ? tx("PASO 6 DE 6 · RESUMEN", "PASSO 6 DE 6 · RESUMO") : tx("PASO 5 DE 5 · RESUMEN", "PASSO 5 DE 5 · RESUMO")}
              onBack={() => setStep("preview")}
              onAddToCart={handleAddToCart}
              addingToCart={addingToCart || !authChecked}
              isPortuguese={isPortuguese}
              cardProduct={cardProduct}
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
  selectedId,
  onSelect,
  onContinue,
  isPortuguese,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onContinue: () => void;
  isPortuguese: boolean;
}) {
  const tx = (es: string, pt: string) => isPortuguese ? pt : es;
  const previewPhotos = [
    "/images/graduation-celebration.png",
    "/images/vDyvv.jpg",
    "/images/sticker-baby.jpg",
    "/images/sticker-lifestyle-dog.jpg",
  ];
  const traditionalPreviewPhotos = ["/images/traditional-birthday-preview.png", ...previewPhotos.slice(1)];

  return (
    <section aria-labelledby="template-step-title">
      <PageIntro
        eyebrow={tx("PASO 1 · EMPIEZA AQUÍ", "PASSO 1 · COMEÇA AQUI")}
        title={tx("Elige tu Plantilla", "Escolhe o teu modelo")}
        body={tx("Ve directamente a una de nuestras tres composiciones. Elige Tradicional, Collage o Magazine y empieza a hacerla tuya.", "Escolhe diretamente uma das nossas três composições. Escolhe Tradicional, Colagem ou Revista e começa a personalizá-la.")}
      />
      <div className="mb-5 mt-12 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.17em] text-[#ee5264]">{tx("SELECCIONA EL DISEÑO", "SELECIONA O DESIGN")}</p>
          <h2 className="mt-1 text-xl font-black text-[#182443]">{tx("Elige una de las 3 plantillas", "Escolhe um dos 3 modelos")}</h2>
        </div>
        <p className="max-w-[380px] text-xs leading-5 text-[#737b90]">
          {tx("Cada vista muestra el número de fotos y su posición real en la tarjeta.", "Cada vista mostra o número de fotografias e a sua posição real no cartão.")}
        </p>
      </div>

      <div className="mx-auto grid max-w-[860px] gap-5 md:grid-cols-2">
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
                <span className={`mx-auto block h-full overflow-hidden rounded shadow-lg transition duration-300 group-hover:scale-[1.02] ${item.magazineStyle ? "aspect-square" : "aspect-[.82/1]"}`}>
                  <CardPreview compact templateId={item.id} message={item.magazineStyle ? (isPortuguese ? "Feliz aniversário" : "Feliz cumpleaños") : (isPortuguese ? "Parabéns" : "Enhorabuena")} emojiElements={[]} photoDataUrls={item.magazineStyle || item.id === "template-2" ? Array(item.imageCount).fill(null) : Array.from({ length: item.imageCount }, (_, photoIndex) => traditionalPreviewPhotos[photoIndex % traditionalPreviewPhotos.length])} photoFit={item.id === "template-3" ? "cover" : undefined} />
                </span>
                <span
                  className={`absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full border-2 bg-white ${
                    selected ? "border-[#ee5264] text-[#ee5264]" : "border-[#d3c8c1] text-transparent"
                  }`}
                >
                  <Icon name="check" size={14} />
                </span>
                {item.magazineStyle && (
                  <span className="absolute bottom-4 left-4 rounded-full bg-[#182443] px-3 py-1.5 text-[9px] font-black uppercase tracking-[.12em] text-white">
                    {isPortuguese ? "1 + 3 fotografias · Magazine" : "1 + 3 fotos · Magazine"}
                  </span>
                )}
              </span>
              <span className="block p-5">
                <span className="text-[10px] font-black uppercase tracking-[.15em] text-[#ee5264]">{tx("Opción", "Opção")} {index + 1}</span>
                <span className="mt-1 block text-lg font-black">{isPortuguese ? item.namePt || item.name : item.name}</span>
                <span className="mt-2 block text-sm leading-6 text-[#737b90]">{isPortuguese ? item.descriptionPt || item.description : item.description}</span>
                <span className="mt-4 block text-xs font-bold text-[#59627b]">
                  {item.imageCount} {tx("fotos", "fotografias")} · {item.magazineStyle ? tx("Sin marco, va directo al editor", "Sem moldura, segue diretamente para o editor") : tx("El marco solo aparece en portada", "A moldura aparece apenas na capa")}
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
          {tx("Empezar a personalizar", "Começar a personalizar")} <Icon name="arrow" size={16} />
        </button>
        <p className="mt-3 text-center text-xs text-[#7c8191]">
          {selectedId ? tx("Plantilla seleccionada. Pulsa para continuar.", "Modelo selecionado. Clica para continuar.") : tx("Selecciona una plantilla para continuar.", "Seleciona um modelo para continuar.")}
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
  isPortuguese,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onBack: () => void;
  onContinue: () => void;
  isPortuguese: boolean;
}) {
  const tx = (es: string, pt: string) => isPortuguese ? pt : es;
  return (
    <section aria-labelledby="frame-step-title">
      <PageIntro
        eyebrow={tx("PASO 2 · ELIGE MARCO", "PASSO 2 · ESCOLHE A MOLDURA")}
        title={tx("Ahora, elige un marco", "Agora, escolhe uma moldura")}
        body={tx("El marco se aplicará únicamente a la portada de tu tarjeta.", "A moldura será aplicada apenas à capa do teu cartão.")}
      />
      <div className="mx-auto mt-12 grid max-w-[980px] grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
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
              <span className="relative block aspect-square overflow-hidden bg-[#f8efe8] p-1.5 sm:p-2">
                <img src={item.image} alt={isPortuguese ? item.namePt || item.name : item.name} className="h-full w-full object-contain object-center transition duration-300 group-hover:scale-[1.03]" />
                <span
                  className={`absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full border-2 bg-white ${
                    selected ? "border-[#ee5264] text-[#ee5264]" : "border-[#d3c8c1] text-transparent"
                  }`}
                >
                  <Icon name="check" size={14} />
                </span>
              </span>
              <span className="block px-3 py-3 text-xs font-black sm:text-sm">{isPortuguese ? item.namePt || item.name : item.name}</span>
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
          {tx("Volver a plantillas", "Voltar aos modelos")}
        </button>
        <button
          type="button"
          disabled={!selectedId}
          onClick={onContinue}
          className="focus-ring inline-flex min-w-[220px] items-center justify-center gap-2 rounded-full bg-[#ee5264] px-6 py-3.5 text-sm font-black text-white transition hover:bg-[#d83d54] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {tx("Personalizar tarjeta", "Personalizar cartão")} <Icon name="arrow" size={16} />
        </button>
      </div>
    </section>
  );
}

function SummaryStep({
  cart,
  stepLabel,
  onBack,
  onAddToCart,
  addingToCart,
  isPortuguese,
  cardProduct,
}: {
  cart: RootState["cart"];
  stepLabel: string;
  onBack: () => void;
  onAddToCart: () => void;
  addingToCart: boolean;
  isPortuguese: boolean;
  cardProduct: { name: string; priceCents: number } | null;
}) {
  const tx = (es: string, pt: string) => isPortuguese ? pt : es;
  const { settings } = usePublicSettings();
  const template = templates.find((item) => item.id === cart.card.templateId) || templates[0];
  // Template prices are edited in admin → Templates; the built-in price is only a fallback.
  const [templatePriceCents, setTemplatePriceCents] = useState(Math.round(template.price * 100));
  useEffect(() => {
    let active = true;
    fetch("/api/templates", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        const stored = (body?.templates as { slug: string; priceCents: number }[] | undefined)?.find((item) => item.slug === template.id);
        if (active && stored) setTemplatePriceCents(stored.priceCents);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [template.id]);
  const cardCents = cardProduct ? cardProduct.priceCents : templatePriceCents;
  const sizeCents = settings.cardSizePrices[cart.card.size] ?? 0;
  const totalCents = cardCents + sizeCents;
  const freeShipping = qualifiesForFreeShipping(settings.delivery, cart.card.delivery, totalCents);
  const missingCents = amountUntilFreeShippingCents(settings.delivery, cart.card.delivery, totalCents);

  return (
    <section aria-labelledby="summary-step-title" className="mx-auto max-w-[560px]">
      <PageIntro
        eyebrow={stepLabel}
        title={tx("Todo listo para tu tarjeta", "Tudo pronto para o teu cartão")}
        body={tx("Revisa el resumen y añade tu tarjeta a la cesta.", "Revê o resumo e adiciona o teu cartão ao carrinho.")}
      />
      <aside className="mt-10 rounded-[24px] bg-[#182443] p-6 text-white sm:p-7">
        <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#f8c75e]">{tx("RESUMEN DEL PEDIDO", "RESUMO DA ENCOMENDA")}</p>
        <h3 id="summary-step-title" className="mt-1 text-2xl font-black">{tx("Tu selección", "A tua seleção")}</h3>
        <div className="mt-6 space-y-3.5 border-b border-white/10 pb-5 text-sm">
          <div className="flex justify-between text-white/80">
            <span>{cardProduct?.name || template.name}</span>
            <Price value={cardCents / 100} />
          </div>
          <div className="flex justify-between text-white/80">
            <span>{tx("Tamaño", "Tamanho")} {cardSizeText(cart.card.size)}</span>
            {sizeCents ? <Price value={sizeCents / 100} /> : <span>{tx("Incluido", "Incluído")}</span>}
          </div>
        </div>
        <div className="mt-5 flex justify-between text-lg font-black">
          <span>{tx("Subtotal", "Subtotal")}</span>
          <Price value={totalCents / 100} />
        </div>
        {missingCents !== null && <p className="mt-3 text-xs text-white/60">
          {freeShipping
            ? tx("🎉 Tu pedido tiene envío gratis.", "🎉 A tua encomenda tem envio grátis.")
            : tx(`Añade ${(missingCents / 100).toFixed(2).replace(".", ",")} € más para conseguir envío gratis.`, `Adiciona mais ${(missingCents / 100).toFixed(2).replace(".", ",")} € para obteres envio grátis.`)}
        </p>}
        <div className="mt-6 space-y-3">
          <button
            type="button"
            disabled={addingToCart}
            onClick={onAddToCart}
            className="focus-ring flex w-full items-center justify-center gap-2 rounded-full bg-[#ee5264] px-6 py-3.5 text-sm font-black text-white transition hover:bg-[#d83d54] disabled:cursor-wait disabled:opacity-70"
          >
            {addingToCart ? <><Spinner size={16} />{tx("Verificando sesión…", "A verificar a sessão…")}</> : <>{tx("Añadir a la cesta", "Adicionar ao carrinho")} <Icon name="bag" size={17} /></>}
          </button>
          <button
            type="button"
            onClick={onBack}
            className="focus-ring flex w-full items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-3 text-xs font-black text-white transition hover:bg-white/20"
          >
            {tx("Volver a Vista previa", "Voltar à pré-visualização")}
          </button>
        </div>
      </aside>
    </section>
  );
}
