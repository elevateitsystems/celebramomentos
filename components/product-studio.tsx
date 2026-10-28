"use client";

import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { Icon } from "@/components/icons";
import { AuthRequiredModal, PageIntro, SiteFooter, SiteHeader, Spinner } from "@/components/site";
import { MAGNET_SAMPLE_PHOTOS } from "@/lib/data";
import { getSessionUser } from "@/lib/client-session";
import { MAX_PRODUCT_PHOTOS, productPrintFile, requiredPhotoCount, type CatalogProduct, type PrintFile, type StudioProductKind } from "@/lib/products";
import { RootState, defaultCardCustomization, saveCartItem, type CatalogSelection, type ProductSelection } from "@/lib/store";
import { PosterHanger, hangerColorFrom, orientationFrom } from "@/components/poster-hanger";
import { PublishedProducts, catalogImage, useCatalogProducts } from "@/components/published-products";

// Every studio sells the products created in admin → Products for its category:
// sizes, prices and options come from the database; the studio adds the photo
// upload and a live preview for that kind of product.

const formatCents = (cents: number) => (cents / 100).toFixed(2).replace(".", ",") + " €";

function readPhoto(event: ChangeEvent<HTMLInputElement>, onRead: (value: string) => void) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => onRead(String(reader.result));
  reader.readAsDataURL(file);
  // Allow choosing the same file again after replacing it.
  event.target.value = "";
}

function UploadButton({ photo, onPhoto, es, label }: { photo: string | null; onPhoto: (value: string) => void; es: boolean; label?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return <>
    <button type="button" onClick={() => inputRef.current?.click()} className="focus-ring mt-3 flex w-full items-center gap-3 rounded-2xl border border-dashed border-[#e7a59c] bg-white p-3 text-left transition hover:bg-[#fff0e8]"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff0e8] text-[#ee5264]"><Icon name="plus" size={18} /></span><span><span className="block text-sm font-black">{label || (photo ? (es ? "Cambiar fotografía" : "Alterar fotografia") : (es ? "Subir una fotografía" : "Carregar uma fotografia"))}</span><span className="mt-0.5 block text-xs text-[#7c8191]">JPG o PNG · {es ? "la vista previa se actualiza aquí" : "a pré-visualização atualiza aqui"}</span></span></button>
    <input ref={inputRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(event) => readPhoto(event, onPhoto)} />
  </>;
}

// The print shop's recommended file for the product (set in admin → Products),
// with a warning when the uploaded photo is smaller than recommended.
function PrintFileNote({ printFile, photo, es }: { printFile: PrintFile | null; photo: string | null; es: boolean }) {
  const [measured, setMeasured] = useState<{ src: string; width: number; height: number } | null>(null);
  useEffect(() => {
    if (!photo || !printFile) return;
    let active = true;
    const image = new Image();
    image.onload = () => { if (active) setMeasured({ src: photo, width: image.naturalWidth, height: image.naturalHeight }); };
    image.src = photo;
    return () => { active = false; };
  }, [photo, printFile]);
  if (!printFile) return null;
  const { width, height, transparentPng } = printFile;
  const orientation = width === height ? "" : width < height ? (es ? ", en vertical" : ", na vertical") : (es ? ", en horizontal" : ", na horizontal");
  const size = measured && measured.src === photo ? measured : null;
  // Short side against short side, long against long: a rotated photo is not "too small".
  const tooSmall = size && (Math.min(size.width, size.height) < Math.min(width, height) || Math.max(size.width, size.height) < Math.max(width, height));
  return <div className="mt-2 space-y-1.5 text-[11px] leading-5">
    <p className="text-[#737b90]"><span className="font-black text-[#182443]">{es ? "Archivo recomendado:" : "Ficheiro recomendado:"}</span> {width} × {height} px (300 ppp){orientation}.{transparentPng ? (es ? " Usa PNG con fondo transparente si quieres que la funda se vea a través del diseño." : " Usa PNG com fundo transparente se quiseres que a capa se veja através do design.") : ""}</p>
    {tooSmall && <p role="status" className="rounded-lg bg-[#fff6e0] px-2.5 py-1.5 font-bold text-[#8a5a00]">{es ? `Tu foto mide ${size.width} × ${size.height} px, menos de lo recomendado: puede imprimirse borrosa.` : `A tua foto tem ${size.width} × ${size.height} px, menos do que o recomendado: pode ficar desfocada na impressão.`}</p>}
  </div>;
}

// Long model lists read better grouped by brand ("iPhone", "Samsung", "Google Pixel").
function choiceGroups(choices: string[]) {
  const groups = new Map<string, string[]>();
  for (const choice of choices) {
    const brand = /^google pixel/i.test(choice) ? "Google Pixel" : choice.split(" ")[0];
    groups.set(brand, [...(groups.get(brand) || []), choice]);
  }
  return groups.size > 1 && groups.size <= 12 && Array.from(groups.values()).every((items) => items.length > 1) ? Array.from(groups.entries()) : null;
}

// Adds a studio product to the cart (or replaces the line being edited via ?edit=<id>).
function useStudioCart(kind: StudioProductKind) {
  const router = useRouter();
  const dispatch = useDispatch();
  const items = useSelector((state: RootState) => state.cart.items);
  const delivery = useSelector((state: RootState) => state.cart.card.delivery);
  const [editId, setEditId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [authPrompt, setAuthPrompt] = useState(false);

  useEffect(() => { setEditId(new URLSearchParams(window.location.search).get("edit")); }, []);
  const editingItem = editId ? items.find((item) => item.id === editId && item.product?.productKind === kind) : undefined;

  const addToCart = async (product: ProductSelection) => {
    if (adding) return;
    setAdding(true);
    const user = await getSessionUser({ refresh: true });
    if (!user) {
      setAdding(false);
      setAuthPrompt(true);
      return;
    }
    dispatch(saveCartItem({ id: editingItem?.id, quantity: editingItem?.quantity, product, card: { ...defaultCardCustomization(), delivery } }));
    // Keep the button disabled while navigating so the item cannot be added twice.
    router.push("/cart");
  };

  return { editing: editingItem?.product ?? undefined, addToCart, adding, authPrompt, closeAuthPrompt: () => setAuthPrompt(false) };
}

// Short required lists start on their first choice; long ones (phone models)
// must be picked by the customer so nobody orders the wrong model by accident.
const optionDefaults = (product: CatalogProduct) => Object.fromEntries(product.options.map((option) => { const choices = option.config?.choices || []; return [option.key, option.required && choices.length <= 8 ? choices[0] || "" : ""]; }));

// Database products of one category. ?product=<id> selects one, otherwise the
// first (featured first) product is shown.
function useStudioCatalog(kind: StudioProductKind) {
  const catalog = useCatalogProducts(kind);
  const [requestedId, setRequestedId] = useState<string | null>(null);
  const [config, setConfig] = useState<{ productId: string | null; variantId: string | null; options: Record<string, string> }>({ productId: null, variantId: null, options: {} });

  useEffect(() => { setRequestedId(new URLSearchParams(window.location.search).get("product")); }, []);

  const requested = requestedId ? catalog.products.find((product) => product.id === requestedId) || null : null;
  const unavailable = Boolean(requestedId && !catalog.loading && !catalog.error && !requested);
  const selected = requested || catalog.products[0] || null;

  useEffect(() => {
    if (!selected || config.productId === selected.id) return;
    setConfig({ productId: selected.id, variantId: selected.variants[0]?.id ?? null, options: optionDefaults(selected) });
  }, [selected, config.productId]);

  const select = (product: CatalogProduct) => {
    setRequestedId(product.id);
    const url = new URL(window.location.href);
    url.searchParams.set("product", product.id);
    url.searchParams.delete("edit");
    window.history.replaceState(null, "", url.pathname + url.search);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const applyEdit = (selection: CatalogSelection) => {
    setRequestedId(selection.productId);
    setConfig({ productId: selection.productId, variantId: selection.variantId, options: selection.options });
  };

  const ready = Boolean(selected && config.productId === selected.id);
  const variant = selected?.variants.find((item) => item.id === config.variantId) || null;
  const priceCents = selected ? variant?.priceCents ?? (selected.variants.length ? null : selected.basePriceCents) : null;
  const options = selected ? Object.fromEntries(selected.options.map((option) => [option.key, config.options[option.key] || ""])) : {};
  const missingOption = selected?.options.find((option) => option.required && !options[option.key]) || null;
  // Value of the admin option whose name matches, e.g. "Marco" or "Modelo".
  const optionValue = (pattern: RegExp) => {
    const option = selected?.options.find((item) => pattern.test(item.name) || pattern.test(item.key));
    return option ? options[option.key] || null : null;
  };
  const hasOption = (pattern: RegExp) => Boolean(selected?.options.some((item) => pattern.test(item.name) || pattern.test(item.key)));

  const toSelection = (photos: (string | null)[], studioOptions: Record<string, string>): CatalogSelection | null => {
    if (!selected || priceCents === null) return null;
    const chosen = Object.fromEntries(Object.entries({ ...studioOptions, ...options }).filter(([, value]) => value));
    return { kind: "CATALOG", productKind: kind, productId: selected.id, variantId: variant?.id ?? null, options: chosen, photos, name: selected.name, detail: [variant?.name, ...Object.values(chosen)].filter(Boolean).join(" · "), image: selected.images[0]?.asset.url || null, priceCents };
  };

  return {
    catalog,
    selected,
    unavailable,
    ready,
    variant,
    priceCents,
    options,
    missingOption,
    optionValue,
    hasOption,
    photoCount: selected ? requiredPhotoCount(selected, variant) : 1,
    printFile: selected ? productPrintFile(selected.metadata) : null,
    image: selected?.images[0]?.asset.url || null,
    select,
    applyEdit,
    setVariant: (variantId: string) => setConfig((current) => ({ ...current, variantId })),
    setOption: (key: string, value: string) => setConfig((current) => ({ ...current, options: { ...current.options, [key]: value } })),
    toSelection,
  };
}

type StudioCatalog = ReturnType<typeof useStudioCatalog>;

// Selected database product: its details, sizes and admin-defined options,
// plus the loading / empty / error states of the category.
type VariantName = (variant: CatalogProduct["variants"][number]) => string;

function CatalogControls({ studio, es, sizeLabel, variantName }: { studio: StudioCatalog; es: boolean; sizeLabel?: string; variantName?: VariantName }) {
  const { selected, catalog } = studio;
  if (catalog.loading && !selected) return <div className="mt-6 space-y-3" aria-label={es ? "Cargando producto" : "A carregar produto"}><div className="h-20 animate-pulse rounded-2xl bg-[#f6ece6]" /><div className="h-14 animate-pulse rounded-2xl bg-[#f6ece6]" /><div className="h-14 animate-pulse rounded-2xl bg-[#f6ece6]" /></div>;
  if (catalog.error && !selected) return <div role="alert" className="mt-6 rounded-2xl border border-[#f3c6c2] bg-[#fff0e8] p-4 text-sm font-bold text-[#c94758]">{catalog.error}<button type="button" onClick={catalog.reload} className="mt-3 block rounded-full bg-white px-4 py-2 text-xs font-black text-[#182443] shadow-sm">{es ? "Reintentar" : "Tentar novamente"}</button></div>;
  if (!selected) return <div className="mt-6 rounded-2xl border border-dashed border-[#e7cfc6] bg-[#fffaf5] p-5 text-center"><p className="text-sm font-black text-[#182443]">{es ? "Muy pronto disponible" : "Disponível muito em breve"}</p><p className="mt-1 text-xs leading-5 text-[#737b90]">{es ? "Estamos preparando este producto. Vuelve pronto o escríbenos si quieres un encargo especial." : "Estamos a preparar este produto. Volta em breve ou escreve-nos para uma encomenda especial."}</p></div>;
  return <div className="mt-6 space-y-6">
    {studio.unavailable && <p role="status" className="rounded-xl border border-[#f3c6c2] bg-[#fff0e8] px-3 py-2.5 text-xs font-bold text-[#c94758]">{es ? "El producto que buscabas ya no está disponible. Te mostramos otro de la misma categoría." : "O produto que procuravas já não está disponível. Mostramos-te outro da mesma categoria."}</p>}
    <div className="flex gap-3 rounded-2xl border border-[#e8d5cc] bg-[#fff6f0] p-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={catalogImage(selected)} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-[#182443]">{selected.name}</p>
        {selected.description && <p className="mt-1 text-xs leading-5 text-[#6c584c]">{selected.description}</p>}
        {catalog.products.length > 1 && <a href="#catalog" className="mt-1.5 inline-block text-[11px] font-black text-[#182443] underline underline-offset-2 hover:text-[#ee5264]">{es ? "Ver otros productos" : "Ver outros produtos"}</a>}
      </div>
    </div>
    {selected.variants.length > 0 && <fieldset>
      <legend className="text-sm font-black">{sizeLabel || (es ? "Tamaño" : "Tamanho")}</legend>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {selected.variants.map((variant) => <button key={variant.id} type="button" onClick={() => studio.setVariant(variant.id)} aria-pressed={studio.variant?.id === variant.id} className={`focus-ring rounded-xl border p-3 text-left transition ${studio.variant?.id === variant.id ? "border-[#ee5264] bg-[#fff0e8]" : "border-[#dfd3cc] hover:border-[#ee5264]"}`}><span className="block text-sm font-black text-[#182443]">{variantName ? variantName(variant) : variant.name}</span><span className="mt-1 block text-xs font-black text-[#ee5264]">{formatCents(variant.priceCents)}</span></button>)}
      </div>
    </fieldset>}
    {selected.options.map((option) => {
      const choices = option.config?.choices || [];
      const value = studio.options[option.key] || "";
      const legend = <>{option.name}{option.required ? "" : <span className="font-bold text-[#9297a4]"> · {es ? "opcional" : "opcional"}</span>}</>;
      // Long lists (e.g. phone models) use a dropdown.
      if (choices.length > 8) {
        const groups = choiceGroups(choices);
        const list = (items: string[]) => items.map((choice) => <option key={choice} value={choice}>{choice}</option>);
        return <label key={option.id} className="block text-sm font-black">{legend}<select value={value} onChange={(event) => studio.setOption(option.key, event.target.value)} className="focus-ring mt-2 w-full rounded-xl border border-[#dfd3cc] bg-white p-3 text-sm font-bold text-[#182443]"><option value="" disabled={option.required}>{option.required ? (es ? "Elige una opción…" : "Escolhe uma opção…") : (es ? "Sin elegir" : "Sem escolha")}</option>{groups ? groups.map(([label, items]) => <optgroup key={label} label={label}>{list(items)}</optgroup>) : list(choices)}</select></label>;
      }
      return <fieldset key={option.id}>
        <legend className="text-sm font-black">{legend}</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {choices.map((choice) => <button key={choice} type="button" onClick={() => studio.setOption(option.key, value === choice && !option.required ? "" : choice)} aria-pressed={value === choice} className={`focus-ring rounded-xl border px-3 py-2 text-xs font-black transition ${value === choice ? "border-[#ee5264] bg-[#fff0e8] text-[#ee5264]" : "border-[#dfd3cc] hover:border-[#ee5264]"}`}>{choice}</button>)}
        </div>
      </fieldset>;
    })}
  </div>;
}

type StudioAction = { label: string; busy: boolean; disabled?: boolean; hint?: string; onClick: () => void; authPrompt: boolean; onCloseAuth: () => void; returnTo: string };

// Add-to-cart action for the selected product.
function catalogAction(studio: StudioCatalog, cart: ReturnType<typeof useStudioCart>, es: boolean, photos: (string | null)[], studioOptions: Record<string, string>, returnTo: string): StudioAction | undefined {
  if (!studio.selected) return undefined;
  const missingPhotos = Math.max(0, studio.photoCount - photos.filter(Boolean).length);
  const hint = !studio.ready ? undefined
    : missingPhotos ? (missingPhotos === 1 ? (es ? "Sube 1 fotografía más para continuar." : "Carrega mais 1 fotografia para continuar.") : (es ? `Sube ${missingPhotos} fotografías más para continuar.` : `Carrega mais ${missingPhotos} fotografias para continuar.`))
    : studio.missingOption ? (es ? `Elige una opción de "${studio.missingOption.name}".` : `Escolhe uma opção de "${studio.missingOption.name}".`)
    : undefined;
  return {
    label: cart.editing ? (es ? "Guardar cambios" : "Guardar alterações") : (es ? "Añadir a la cesta" : "Adicionar ao carrinho"),
    busy: cart.adding,
    disabled: !studio.ready || studio.priceCents === null || Boolean(hint),
    hint,
    onClick: () => { const selection = studio.toSelection(photos, studioOptions); if (selection) void cart.addToCart(selection); },
    authPrompt: cart.authPrompt,
    onCloseAuth: cart.closeAuthPrompt,
    returnTo,
  };
}

// Price chip while the product is loading or selected.
function catalogPriceChip(studio: StudioCatalog, es: boolean) {
  if (studio.catalog.loading && !studio.selected) return <span className="inline-block h-3 w-12 animate-pulse rounded-full bg-[#f3d5d2] align-middle" aria-label={es ? "Cargando precio" : "A carregar preço"} />;
  return studio.priceCents === null ? "—" : formatCents(studio.priceCents);
}

function StudioShell({ eyebrow, title, body, controls, preview, es, studio, catalogTitle, action, sizeLabel, variantName }: { eyebrow: string; title: string; body: string; controls: React.ReactNode; preview: React.ReactNode; es: boolean; studio: StudioCatalog; catalogTitle: string; action?: StudioAction; sizeLabel?: string; variantName?: VariantName }) {
  return <><SiteHeader /><main className="bg-[#fffaf5] py-12 md:py-20"><div className="container"><PageIntro eyebrow={eyebrow} title={title} body={body} /><div className="mt-10 grid gap-7 lg:grid-cols-[.78fr_1.22fr] lg:items-start"><section className="order-2 rounded-[24px] border border-[#eadfd8] bg-white p-5 sm:p-7 lg:order-1"><div className="flex items-center justify-between border-b border-[#eadfd8] pb-5"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#ee5264]">{es ? "TUS OPCIONES" : "AS TUAS OPÇÕES"}</p><h2 className="mt-1 text-lg font-black">{es ? "Hazlo a tu manera" : "Faz à tua maneira"}</h2></div><span className="rounded-full bg-[#fff0e8] px-3 py-1.5 text-xs font-black text-[#ee5264]">{catalogPriceChip(studio, es)}</span></div><CatalogControls studio={studio} es={es} sizeLabel={sizeLabel} variantName={variantName} />{studio.selected && controls}<div className="mt-7 border-t border-[#eadfd8] pt-5">{action ? <><button type="button" onClick={action.onClick} disabled={action.busy || action.disabled} aria-busy={action.busy} className="focus-ring flex w-full items-center justify-center gap-2 rounded-full bg-[#ee5264] px-5 py-3.5 text-sm font-black text-white transition hover:bg-[#d83d54] disabled:cursor-not-allowed disabled:opacity-60">{action.busy ? <Spinner size={16} /> : null}{action.label} {!action.busy && <Icon name="arrow" size={16} />}</button>{action.hint && <p className="mt-3 text-center text-[11px] font-bold text-[#9297a4]">{action.hint}</p>}</> : <button type="button" disabled className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-full bg-[#ee5264] px-5 py-3.5 text-sm font-black text-white opacity-50">{es ? "Añadir a la cesta" : "Adicionar ao carrinho"}</button>}</div></section><section className="order-1 rounded-[26px] bg-[#f5ece5] p-4 sm:p-8 lg:sticky lg:top-28 lg:order-2"><div className="mb-5 flex items-center justify-between"><span className="text-[10px] uppercase tracking-[.18em] text-[#7b7180]">{es ? "VISTA PREVIA" : "PRÉ-VISUALIZAÇÃO"}</span><span className="flex items-center gap-1.5 text-[11px] font-bold text-[#59627b]"><Icon name="check" size={13} /> {es ? "Se actualiza al instante" : "Atualiza de imediato"}</span></div>{preview}</section></div><div className="mt-8 text-center"><Link href="/#categories" className="text-xs font-black text-[#737b90] underline underline-offset-4 hover:text-[#ee5264]">← {es ? "Volver a todos los productos" : "Voltar a todos os produtos"}</Link></div></div></main>{studio.catalog.products.length > 1 && <PublishedProducts catalog={studio.catalog} title={catalogTitle} es={es} selectedId={studio.selected?.id} onSelect={(product) => studio.select(product)} />}<SiteFooter />{action?.authPrompt && <AuthRequiredModal returnTo={action.returnTo} onClose={action.onCloseAuth} isPortuguese={!es} />}</>;
}

// Restores a cart line opened with ?edit=<id>.
function useCatalogEdit(editing: ProductSelection | undefined, studio: StudioCatalog, apply: (selection: CatalogSelection) => void) {
  const applied = useRef(false);
  useEffect(() => {
    if (!editing || applied.current) return;
    applied.current = true;
    studio.applyEdit(editing);
    apply(editing);
  }, [editing, studio, apply]);
}

// One photo slot per required photo, with a picker for the slot being edited.
function PhotoSlots({ photos, count, active, onActive, onPhoto, es, slotLabel, sample, aspect = "aspect-square", printFile = null }: { photos: (string | null)[]; count: number; active: number; onActive: (index: number) => void; onPhoto: (value: string) => void; es: boolean; slotLabel: (index: number) => string; sample?: (index: number) => string; aspect?: string; printFile?: PrintFile | null }) {
  return <div>
    <p className="text-sm font-black">{count === 1 ? (es ? "Tu fotografía" : "A tua fotografia") : (es ? `Tus fotografías (${photos.slice(0, count).filter(Boolean).length}/${count})` : `As tuas fotografias (${photos.slice(0, count).filter(Boolean).length}/${count})`)}</p>
    {count > 1 && <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
      {Array.from({ length: count }).map((_, index) => <button key={index} type="button" onClick={() => onActive(index)} aria-pressed={active === index} aria-label={slotLabel(index)} className={`focus-ring relative overflow-hidden rounded-lg border-2 bg-[#f4eee9] ${aspect} ${active === index ? "border-[#ee5264]" : "border-transparent"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {(photos[index] || sample) && <img src={photos[index] || sample?.(index)} alt="" className={`h-full w-full object-cover ${photos[index] ? "" : "opacity-40"}`} />}
        <span className="absolute inset-x-0 bottom-0 bg-[#182443]/75 py-0.5 text-center text-[8px] font-black text-white">{slotLabel(index)}</span>
      </button>)}
    </div>}
    <UploadButton photo={photos[active] || null} onPhoto={onPhoto} es={es} label={count > 1 ? `${photos[active] ? (es ? "Cambiar" : "Alterar") : (es ? "Subir" : "Carregar")} · ${slotLabel(active)}` : undefined} />
    <PrintFileNote printFile={printFile} photo={photos[active] || null} es={es} />
  </div>;
}

// ── Calendars (Gelato): one photo per month ──────────────────────────────────

const MONTHS = {
  es: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
  pt: ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"],
};

export function CalendarStudio() {
  const es = useSelector((state: RootState) => state.language.language) === "es";
  const studio = useStudioCatalog("CALENDAR");
  const cart = useStudioCart("CALENDAR");
  const [photos, setPhotos] = useState<(string | null)[]>(Array(12).fill(null));
  const [month, setMonth] = useState(0);
  useCatalogEdit(cart.editing, studio, useCallback((selection: CatalogSelection) => setPhotos(Array.from({ length: 12 }, (_, index) => selection.photos[index] || null)), []));
  const monthNames = es ? MONTHS.es : MONTHS.pt;
  const year = new Date().getFullYear() + 1;
  // Monday-first grid for the month being edited.
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const variantName = studio.variant?.name || "";
  const shape = /40/.test(variantName) ? "w-[46%]" : /A4/i.test(variantName) ? "w-[82%]" : "w-full";
  const controls = <div className="mt-6 space-y-6">
    <PhotoSlots photos={photos} count={12} active={month} onActive={setMonth} onPhoto={(value) => setPhotos((current) => current.map((photo, index) => (index === month ? value : photo)))} es={es} slotLabel={(index) => monthNames[index].slice(0, 3)} aspect="aspect-[4/3]" printFile={studio.printFile} />
    <p className="text-[11px] leading-5 text-[#9297a4]">{es ? "Elige un mes y sube su fotografía: cada mes del calendario lleva su propia foto." : "Escolhe um mês e carrega a fotografia: cada mês do calendário leva a sua própria foto."}</p>
  </div>;
  const preview = <div className="mx-auto max-w-[560px]"><div className={`mx-auto overflow-hidden rounded-[16px] bg-white shadow-2xl shadow-[#8a564c]/15 transition-all ${shape}`}><div className="flex h-5 items-center justify-center gap-3 bg-[#182443]">{Array.from({ length: 13 }).map((_, index) => <span key={index} className="h-2.5 w-1 rounded-full bg-white/70" />)}</div>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={photos[month] || studio.image || "/images/calendar-product.png"} alt={es ? `Vista previa de ${monthNames[month]}` : `Pré-visualização de ${monthNames[month]}`} className={`aspect-[1.65/1] w-full object-cover ${photos[month] ? "" : "opacity-50"}`} />
    <div className="p-4 sm:p-6"><div className="flex items-end justify-between border-b border-[#182443] pb-3"><h3 className="serif text-2xl font-bold uppercase sm:text-3xl">{monthNames[month]}</h3><span className="text-[10px] font-black">{year}</span></div><div className="mt-3 grid grid-cols-7 gap-px bg-[#eadfd8]">{Array.from({ length: 42 }).map((_, index) => { const day = index - offset + 1; return <span key={index} className="flex aspect-square items-start justify-end bg-white p-1 text-[7px] text-[#59627b]">{day >= 1 && day <= days ? day : ""}</span>; })}</div></div></div>
    <div className="mt-4 flex flex-wrap justify-center gap-1.5">{monthNames.map((name, index) => <button key={name} type="button" onClick={() => setMonth(index)} aria-pressed={month === index} className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${month === index ? "bg-[#182443] text-white" : photos[index] ? "bg-[#e8f5ed] text-[#24714b]" : "bg-white text-[#9297a4]"}`}>{name.slice(0, 3)}{photos[index] ? " ✓" : ""}</button>)}</div></div>;
  return <StudioShell eyebrow={es ? "CALENDARIOS PERSONALIZADOS" : "CALENDÁRIOS PERSONALIZADOS"} title={es ? "Un año lleno de los tuyos" : "Um ano cheio dos teus"} body={es ? "Elige el tamaño y añade una fotografía para cada mes del año." : "Escolhe o tamanho e adiciona uma fotografia para cada mês do ano."} controls={controls} preview={preview} es={es} studio={studio} catalogTitle={es ? "Calendarios disponibles" : "Calendários disponíveis"} action={catalogAction(studio, cart, es, photos.slice(0, MAX_PRODUCT_PHOTOS), {}, "/calendars")} />;
}

// ── Wall Art (Gelato poster with hanger) ─────────────────────────────────────

const FRAME_OPTION = /marco|frame|colgador|hanger|moldura/i;
const ORIENTATION_OPTION = /orienta/i;

export function WallArtStudio() {
  const es = useSelector((state: RootState) => state.language.language) === "es";
  const studio = useStudioCatalog("WALL_ART");
  const cart = useStudioCart("WALL_ART");
  const [photo, setPhoto] = useState<string | null>(null);
  useCatalogEdit(cart.editing, studio, useCallback((selection: CatalogSelection) => setPhoto(selection.photos[0] || null), []));
  const orientation = orientationFrom(studio.optionValue(ORIENTATION_OPTION));
  const controls = <div className="mt-6 space-y-6"><PhotoSlots photos={[photo]} count={1} active={0} onActive={() => undefined} onPhoto={setPhoto} es={es} slotLabel={() => ""} printFile={studio.printFile} /></div>;
  const preview = (
    <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[20px] bg-[#ece6dc] p-6">
      <PosterHanger photo={photo} alt={studio.selected?.name || (es ? "Póster con colgador" : "Poster com suporte")} color={hangerColorFrom(studio.optionValue(FRAME_OPTION))} orientation={orientation} className={`transition-all duration-300 ${orientation === "horizontal" ? "h-[78%]" : "h-[94%]"}`} />
      {studio.variant && <span className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-[11px] font-black text-[#182443] shadow-sm">{studio.variant.name}</span>}
    </div>
  );
  return <StudioShell eyebrow={es ? "ARTE DE PARED PERSONALIZADO" : "ARTE DE PAREDE PERSONALIZADA"} title={es ? "Tus recuerdos convertidos en arte" : "As tuas memórias transformadas em arte"} body={es ? "Póster de calidad museo con colgador de madera. Elige el tamaño, el colgador y la orientación, y sube tu foto." : "Poster de qualidade museu com suporte de madeira. Escolhe o tamanho, o suporte e a orientação, e carrega a tua foto."} controls={controls} preview={preview} es={es} studio={studio} catalogTitle={es ? "Más arte de pared" : "Mais arte de parede"} action={catalogAction(studio, cart, es, [photo], {}, "/wall-art")} />;
}

// ── Magnets (Prodigi, rectangular 7.6 × 5.1 cm) ──────────────────────────────

export function MagnetsStudio() {
  const es = useSelector((state: RootState) => state.language.language) === "es";
  const studio = useStudioCatalog("MAGNET");
  const cart = useStudioCart("MAGNET");
  const [photos, setPhotos] = useState<(string | null)[]>(Array(MAX_PRODUCT_PHOTOS).fill(null));
  const [active, setActive] = useState(0);
  useCatalogEdit(cart.editing, studio, useCallback((selection: CatalogSelection) => setPhotos(Array.from({ length: MAX_PRODUCT_PHOTOS }, (_, index) => selection.photos[index] || null)), []));
  // The chosen pack sets the number of magnets (one photo each).
  const count = studio.photoCount;
  useEffect(() => { setActive((current) => Math.min(current, count - 1)); }, [count]);
  const sample = (index: number) => MAGNET_SAMPLE_PHOTOS[index % MAGNET_SAMPLE_PHOTOS.length];
  const controls = <div className="mt-6 space-y-6">
    <PhotoSlots photos={photos} count={count} active={active} onActive={setActive} onPhoto={(value) => setPhotos((current) => current.map((photo, index) => (index === active ? value : photo)))} es={es} slotLabel={(index) => `${index + 1}`} sample={sample} aspect="aspect-[3/2]" printFile={studio.printFile} />
    {count > 1 && <p className="text-[11px] leading-5 text-[#9297a4]">{es ? "Cada imán lleva su propia fotografía. Las fotos atenuadas son ejemplos." : "Cada íman leva a sua própria fotografia. As fotografias esbatidas são exemplos."}</p>}
  </div>;
  const columns = count <= 1 ? "grid-cols-1 max-w-[360px]" : count <= 4 ? "grid-cols-2 max-w-[520px]" : count <= 9 ? "grid-cols-3" : "grid-cols-4";
  const preview = (
    <div className="rounded-[20px] bg-[#fdfaf5] p-5 shadow-inner sm:p-8">
      <div className={`mx-auto grid gap-3 sm:gap-4 ${columns}`}>
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="aspect-[3/2] overflow-hidden rounded-md border-[4px] border-white bg-white shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photos[index] || sample(index)} alt={es ? `Vista previa del imán ${index + 1}` : `Pré-visualização do íman ${index + 1}`} className={`h-full w-full object-cover ${photos[index] ? "" : "opacity-60"}`} />
          </div>
        ))}
      </div>
      <p className="mt-5 text-center text-[11px] font-black text-[#737b90]">{es ? "Imán rectangular · 7,6 × 5,1 cm" : "Íman retangular · 7,6 × 5,1 cm"}</p>
    </div>
  );
  return <StudioShell eyebrow={es ? "IMANES PERSONALIZADOS" : "ÍMANES PERSONALIZADOS"} title={es ? "Recuerdos que siempre tienes a la vista" : "Memórias sempre à vista"} body={es ? "Imanes rectangulares de 7,6 × 5,1 cm. Elige cuántos quieres y sube una foto para cada uno." : "Ímanes retangulares de 7,6 × 5,1 cm. Escolhe quantos queres e carrega uma foto para cada um."} controls={controls} preview={preview} es={es} studio={studio} catalogTitle={es ? "Más imanes" : "Mais ímanes"} sizeLabel={es ? "Cantidad de imanes" : "Quantidade de ímanes"} variantName={(variant) => (variant.photoCount ? `${variant.photoCount} ${variant.photoCount === 1 ? (es ? "imán" : "íman") : (es ? "imanes" : "ímanes")}` : variant.name)} action={catalogAction(studio, cart, es, photos.slice(0, count), {}, "/magnets")} />;
}

// ── Phone cases (Alerio Print / Gelato) ──────────────────────────────────────

const MODEL_OPTION = /modelo|model|móvil|movil|telem/i;

// Stylised outline of the chosen phone, so the preview visibly follows the
// model: size class (compact / regular / large) and camera by brand and range.
function phoneShape(model: string) {
  const name = model.toLowerCase().trim();
  const brand = /samsung|galaxy/.test(name) ? "samsung" : /pixel/.test(name) ? "pixel" : "iphone";
  const size: keyof typeof PHONE_SIZE = /max|plus|ultra|\bxl\b|note/.test(name) ? "large" : /mini|\bse\b|\d+e$|iphone (5s?|6s?|7|8)$/.test(name) ? "compact" : "regular";
  const lenses = brand === "samsung" ? (/ultra/.test(name) ? 4 : 3)
    : brand === "pixel" ? (/pro|\bxl\b/.test(name) ? 3 : 2)
    : /pro/.test(name) ? 3
    : /\bair\b|\bse\b|\bxr\b|\d+e$|iphone (5s?|6s?|7|8)$|iphone 6s? plus/.test(name) ? 1
    : 2;
  return { brand, size, lenses };
}

const PHONE_SIZE = { compact: "h-[400px] w-[196px]", regular: "h-[445px] w-[220px]", large: "h-[478px] w-[242px]" } as const;
const lens = "rounded-full bg-black shadow-inner ring-2 ring-white/30";

function CameraModule({ brand, lenses }: ReturnType<typeof phoneShape>) {
  if (brand === "samsung") return <div className="absolute left-4 top-5 z-20 flex flex-col gap-2.5">{Array.from({ length: lenses }).map((_, index) => <div key={index} className="h-6 w-6 rounded-full border-2 border-[#182443] bg-black shadow-md ring-2 ring-white/30" />)}</div>;
  if (brand === "pixel") return <div className="absolute inset-x-2 top-6 z-20 flex h-8 items-center gap-3 rounded-full border border-black/40 bg-[#1e232e] px-4 shadow-lg">{Array.from({ length: lenses }).map((_, index) => <div key={index} className="h-4 w-4 rounded-full bg-black ring-1 ring-white/40" />)}<div className="ml-auto h-2 w-2 rounded-full bg-white/70" /></div>;
  if (lenses === 1) return <div className="absolute left-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-[14px] border-4 border-[#182443] bg-[#222b43] shadow-lg"><span className={`h-5 w-5 ${lens}`} /></div>;
  return <div className="absolute left-3.5 top-4 z-20 h-[72px] w-[72px] rounded-[22px] border-4 border-[#182443] bg-[#222b43] shadow-lg">
    <span className={`absolute left-2 top-2 h-5 w-5 ${lens}`} />
    {lenses === 3 ? <><span className={`absolute bottom-2 left-2 h-5 w-5 ${lens}`} /><span className={`absolute right-2 top-1/2 h-5 w-5 -translate-y-1/2 ${lens}`} /></> : <span className={`absolute bottom-2 right-2 h-5 w-5 ${lens}`} />}
    <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-white/60" />
  </div>;
}

export function PhoneCaseStudio() {
  const es = useSelector((state: RootState) => state.language.language) === "es";
  const studio = useStudioCatalog("PHONE_CASE");
  const cart = useStudioCart("PHONE_CASE");
  const [photo, setPhoto] = useState<string | null>(null);
  useCatalogEdit(cart.editing, studio, useCallback((selection: CatalogSelection) => setPhoto(selection.photos[0] || null), []));
  const model = studio.optionValue(MODEL_OPTION) || "";
  const caseName = studio.variant?.name || "";
  // Each Alerio Print case is its own product; its name (or the chosen type) sets the preview style.
  const caseType = `${caseName} ${studio.selected?.name || ""}`;
  const style = /clear|transparent/i.test(caseType) ? "clear" : /tough|rígida|rigida|resistente/i.test(caseType) ? "tough" : "snap";
  const magsafe = /magsafe/i.test(caseType);
  const shape = phoneShape(model);
  const controls = <div className="mt-6 space-y-6"><PhotoSlots photos={[photo]} count={1} active={0} onActive={() => undefined} onPhoto={setPhoto} es={es} slotLabel={() => ""} printFile={studio.printFile} /></div>;
  const preview = (
    <div className="flex min-h-[560px] flex-col items-center justify-center gap-5 rounded-[22px] bg-gradient-to-br from-[#f7dacf] to-[#f4eadf] p-8">
      <div className={`relative ${PHONE_SIZE[shape.size]} overflow-hidden rounded-[42px] border-[9px] shadow-2xl transition-all ${style === "clear" ? "border-white/80 bg-white/30" : style === "tough" ? "border-[#10192e] bg-[#10192e] ring-2 ring-black/20" : "border-[#2b354f] bg-[#2b354f]"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo || studio.image || "/images/romantic-couple.png"} alt={es ? "Vista previa de la funda" : "Pré-visualização da capa"} className={`h-full w-full object-cover ${style === "clear" ? "opacity-85" : ""} ${photo ? "" : "opacity-60"}`} />
        {magsafe && <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-[5px] border-white/75 shadow-[0_0_0_1px_rgba(0,0,0,.08)]" aria-hidden="true" />}
        <CameraModule {...shape} />
      </div>
      <p className={`rounded-full px-4 py-2 text-sm font-black shadow-sm ${model ? "bg-white text-[#182443]" : "bg-white/60 text-[#9297a4]"}`}>{model ? [model, caseName].filter(Boolean).join(" · ") : (es ? "Elige tu modelo de móvil" : "Escolhe o teu modelo de telemóvel")}</p>
    </div>
  );
  return <StudioShell eyebrow={es ? "FUNDAS DE MÓVIL PERSONALIZADAS" : "CAPAS DE TELEMÓVEL PERSONALIZADAS"} title={es ? "Tu funda a medida para tu móvil" : "A tua capa à medida para o teu telemóvel"} body={es ? "Elige el tipo de funda y tu modelo de móvil, y sube tu fotografía." : "Escolhe o tipo de capa e o teu modelo de telemóvel, e carrega a tua fotografia."} controls={controls} preview={preview} es={es} studio={studio} catalogTitle={es ? "Más fundas" : "Mais capas"} sizeLabel={es ? "Tipo de funda" : "Tipo de capa"} action={catalogAction(studio, cart, es, [photo], {}, "/phone-cases")} />;
}

// ── Mugs (Printful ceramic mug with coloured handle and inside) ──────────────

// Printful colours per size, as listed in PRODUCTS.pdf. Used unless the admin
// product defines its own "Color" option.
const MUG_COLORS = {
  black: { es: "Negro", pt: "Preto", hex: "#1c1c1e" },
  navy: { es: "Azul marino", pt: "Azul-marinho", hex: "#1f2a5a" },
  red: { es: "Rojo", pt: "Vermelho", hex: "#d7262f" },
  orange: { es: "Naranja", pt: "Laranja", hex: "#f2682a" },
  blue: { es: "Azul", pt: "Azul", hex: "#2a9fd8" },
  pink: { es: "Rosa", pt: "Rosa", hex: "#f4b6c6" },
  yellow: { es: "Amarillo", pt: "Amarelo", hex: "#f8d23b" },
} as const;
type MugColor = keyof typeof MUG_COLORS;
const MUG_COLORS_BY_SIZE: Record<"11" | "15", MugColor[]> = { "11": ["black", "red", "orange", "blue", "pink", "yellow"], "15": ["black", "navy", "red", "blue", "pink"] };
const COLOR_OPTION = /^colou?r$|^cor$/i;

function mugHex(name: string | null) {
  const text = (name || "").toLowerCase();
  const match = (Object.values(MUG_COLORS) as { es: string; pt: string; hex: string }[]).find((color) => text === color.es.toLowerCase() || text === color.pt.toLowerCase());
  if (match) return match.hex;
  if (/marino|navy/.test(text)) return MUG_COLORS.navy.hex;
  if (/negr|black|pret/.test(text)) return MUG_COLORS.black.hex;
  if (/roj|red|verm/.test(text)) return MUG_COLORS.red.hex;
  if (/naranj|orange|laranj/.test(text)) return MUG_COLORS.orange.hex;
  if (/azul|blue/.test(text)) return MUG_COLORS.blue.hex;
  if (/ros|pink/.test(text)) return MUG_COLORS.pink.hex;
  if (/amarill|yellow|amarel/.test(text)) return MUG_COLORS.yellow.hex;
  return "#f3f4f6";
}

export function MugStudio() {
  const es = useSelector((state: RootState) => state.language.language) === "es";
  const studio = useStudioCatalog("MUG");
  const cart = useStudioCart("MUG");
  const [photo, setPhoto] = useState<string | null>(null);
  const [color, setColor] = useState<MugColor>("black");
  const sizeName = studio.variant?.name || "";
  const size = /15/.test(sizeName) ? "15" : "11";
  const available = /15/.test(sizeName) ? MUG_COLORS_BY_SIZE["15"] : /11/.test(sizeName) ? MUG_COLORS_BY_SIZE["11"] : (Object.keys(MUG_COLORS) as MugColor[]);
  const adminColors = studio.hasOption(COLOR_OPTION);
  useCatalogEdit(cart.editing, studio, useCallback((selection: CatalogSelection) => {
    setPhoto(selection.photos[0] || null);
    const saved = (Object.keys(MUG_COLORS) as MugColor[]).find((key) => MUG_COLORS[key].es === selection.options.color);
    if (saved) setColor(saved);
  }, []));
  // Keep the colour valid for the chosen size (e.g. yellow only exists in 11 oz).
  useEffect(() => { if (!available.includes(color)) setColor(available[0]); }, [available, color]);
  const colorName = adminColors ? studio.optionValue(COLOR_OPTION) : MUG_COLORS[color][es ? "es" : "pt"];
  const accent = adminColors ? mugHex(studio.optionValue(COLOR_OPTION)) : MUG_COLORS[color].hex;
  const controls = (
    <div className="mt-6 space-y-6">
      {!adminColors && <fieldset>
        <legend className="text-sm font-black">{es ? "Color del asa y el interior" : "Cor da asa e do interior"}</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {available.map((key) => <button key={key} type="button" onClick={() => setColor(key)} aria-pressed={color === key} className={`focus-ring flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black transition ${color === key ? "border-[#ee5264] bg-[#fff0e8] text-[#ee5264]" : "border-[#dfd3cc] hover:border-[#ee5264]"}`}><span className="h-4 w-4 shrink-0 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: MUG_COLORS[key].hex }} />{MUG_COLORS[key][es ? "es" : "pt"]}</button>)}
        </div>
      </fieldset>}
      <div>
        <p className="text-sm font-black">{es ? "Tu fotografía" : "A tua fotografia"}</p>
        <UploadButton photo={photo} onPhoto={setPhoto} es={es} />
        <PrintFileNote printFile={studio.printFile} photo={photo} es={es} />
      </div>
    </div>
  );
  const preview = (
    <div className="flex min-h-[500px] flex-col items-center justify-center rounded-[22px] bg-gradient-to-b from-[#fbf5f0] to-[#f4ebe3] p-6 sm:p-10">
      <div className="relative mx-auto flex w-full max-w-[340px] flex-col items-center">
        <div className="relative flex items-center justify-center">
          <div className={`relative ${size === "15" ? "h-[320px] w-[230px]" : "h-[290px] w-[215px]"} overflow-hidden rounded-[28px] border-4 border-white bg-white shadow-2xl shadow-[#8a564c]/30`}>
            {/* Coloured inside, visible at the rim */}
            <div className="h-7 w-full border-b border-black/10 transition-colors" style={{ backgroundColor: accent }} />
            <div className="relative h-[calc(100%-28px)] w-full overflow-hidden bg-white p-3">
              {/* Only the customer's photo is printed here; product mockups are photos of whole mugs. */}
              <div className="h-full w-full overflow-hidden rounded-xl border border-gray-100 bg-[#f9f5f1]">
                {photo
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={photo} alt={es ? "Fotografía en la taza" : "Fotografia na caneca"} className="h-full w-full object-cover" />
                  : <div className="flex h-full w-full flex-col items-center justify-center gap-2 border-2 border-dashed border-[#e7cfc6] text-center text-[#b19a8e]"><Icon name="plus" size={22} /><span className="px-4 text-xs font-black">{es ? "Tu foto aquí" : "A tua foto aqui"}</span></div>}
              </div>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/10 via-transparent to-white/40" />
              <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black/15 to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-black/15 to-transparent" />
            </div>
          </div>
          {/* Coloured handle */}
          <div className={`absolute -right-10 top-16 ${size === "15" ? "h-44 w-14" : "h-36 w-12"} rounded-r-[32px] border-[14px] border-l-0 transition-colors`} style={{ borderColor: accent, boxShadow: "4px 8px 18px rgba(0,0,0,0.12)" }} />
        </div>
        <div className="mt-6 flex items-center gap-2 rounded-full bg-white/90 px-4 py-1.5 text-xs font-black text-[#182443] shadow-md backdrop-blur">
          <span>{[sizeName, colorName].filter(Boolean).join(" · ")}</span>
        </div>
      </div>
      <p className="mt-5 text-center text-xs font-bold text-[#737b90]">{es ? "Taza de cerámica · Apta para lavavajillas y microondas" : "Caneca de cerâmica · Apta para máquina e micro-ondas"}</p>
    </div>
  );
  return <StudioShell eyebrow={es ? "TAZAS PERSONALIZADAS" : "CANECAS PERSONALIZADAS"} title={es ? "Empieza cada mañana con tus mejores recuerdos" : "Começa cada manhã com as tuas melhores memórias"} body={es ? "Taza de cerámica con asa e interior de color. Elige el tamaño y el color, y añade tu foto favorita." : "Caneca de cerâmica com asa e interior de cor. Escolhe o tamanho e a cor, e adiciona a tua foto favorita."} controls={controls} preview={preview} es={es} studio={studio} catalogTitle={es ? "Más tazas" : "Mais canecas"} action={catalogAction(studio, cart, es, [photo], adminColors ? {} : { color: MUG_COLORS[color].es }, "/mugs")} />;
}
