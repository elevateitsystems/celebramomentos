"use client";

import { ChangeEvent, useRef, useState } from "react";
import Link from "next/link";
import { useSelector } from "react-redux";
import { Icon } from "@/components/icons";
import { PageIntro, SiteFooter, SiteHeader, Toast } from "@/components/site";
import { RootState } from "@/lib/store";

function readPhoto(event: ChangeEvent<HTMLInputElement>, onRead: (value: string) => void) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => onRead(String(reader.result));
  reader.readAsDataURL(file);
}

function UploadButton({ photo, onPhoto, es }: { photo: string | null; onPhoto: (value: string) => void; es: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return <>
    <button type="button" onClick={() => inputRef.current?.click()} className="focus-ring mt-3 flex w-full items-center gap-3 rounded-2xl border border-dashed border-[#e7a59c] bg-white p-3 text-left transition hover:bg-[#fff0e8]"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff0e8] text-[#ee5264]"><Icon name="plus" size={18} /></span><span><span className="block text-sm font-black">{photo ? (es ? "Cambiar fotografía" : "Alterar fotografia") : (es ? "Subir una fotografía" : "Carregar uma fotografia")}</span><span className="mt-0.5 block text-xs text-[#7c8191]">JPG o PNG · {es ? "la vista previa se actualiza aquí" : "a pré-visualização atualiza aqui"}</span></span></button>
    <input ref={inputRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(event) => readPhoto(event, onPhoto)} />
  </>;
}

function StudioShell({ eyebrow, title, body, controls, preview, price, es }: { eyebrow: string; title: string; body: string; controls: React.ReactNode; preview: React.ReactNode; price: string; es: boolean }) {
  const [notice, setNotice] = useState("");
  return <><SiteHeader /><main className="bg-[#fffaf5] py-12 md:py-20"><div className="container"><PageIntro eyebrow={eyebrow} title={title} body={body} /><div className="mt-10 grid gap-7 lg:grid-cols-[.78fr_1.22fr] lg:items-start"><section className="order-2 rounded-[24px] border border-[#eadfd8] bg-white p-5 sm:p-7 lg:order-1"><div className="flex items-center justify-between border-b border-[#eadfd8] pb-5"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#ee5264]">{es ? "TUS OPCIONES" : "AS TUAS OPÇÕES"}</p><h2 className="mt-1 text-lg font-black">{es ? "Hazlo a tu manera" : "Faz à tua maneira"}</h2></div><span className="rounded-full bg-[#fff0e8] px-3 py-1.5 text-xs font-black text-[#ee5264]">{price}</span></div>{controls}<div className="mt-7 border-t border-[#eadfd8] pt-5"><button type="button" onClick={() => setNotice(es ? "Tu vista está guardada en esta demo. Para un pedido completo, elige una tarjeta personalizada." : "A tua vista está guardada nesta demo. Para uma encomenda completa, escolhe um cartão personalizado.")} className="focus-ring flex w-full items-center justify-center gap-2 rounded-full bg-[#ee5264] px-5 py-3.5 text-sm font-black text-white transition hover:bg-[#d83d54]">{es ? "Continuar" : "Continuar"} <Icon name="arrow" size={16} /></button><p className="mt-3 text-center text-[11px] text-[#9297a4]">{es ? "Vista de demostración · no se realizará ningún pedido" : "Vista de demonstração · nenhuma encomenda será realizada"}</p></div></section><section className="order-1 rounded-[26px] bg-[#f5ece5] p-4 sm:p-8 lg:sticky lg:top-28 lg:order-2"><div className="mb-5 flex items-center justify-between"><span className="text-[10px] font-black uppercase tracking-[.18em] text-[#7b7180]">{es ? "VISTA PREVIA" : "PRÉ-VISUALIZAÇÃO"}</span><span className="flex items-center gap-1.5 text-[11px] font-bold text-[#59627b]"><Icon name="check" size={13} /> {es ? "Se actualiza al instante" : "Atualiza de imediato"}</span></div>{preview}</section></div><div className="mt-8 text-center"><Link href="/#categories" className="text-xs font-black text-[#737b90] underline underline-offset-4 hover:text-[#ee5264]">← {es ? "Volver a todos los productos" : "Voltar a todos os produtos"}</Link></div></div></main><SiteFooter />{notice && <Toast message={notice} onClose={() => setNotice("")} />}</>;
}

export function CalendarStudio() {
  const es = useSelector((state: RootState) => state.language.language) === "es";
  const [size, setSize] = useState<"A4" | "A5">("A4");
  const [dated, setDated] = useState(true);
  const [photo, setPhoto] = useState<string | null>(null);
  const months = es ? ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"] : ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
  const price = size === "A4" ? "18,90 €" : "16,90 €";
  const controls = <div className="mt-6 space-y-6"><div><p className="text-sm font-black">{es ? "Tamaño" : "Tamanho"}</p><div className="mt-3 grid grid-cols-2 gap-3">{(["A4", "A5"] as const).map((option) => <button key={option} type="button" onClick={() => setSize(option)} className={`focus-ring rounded-2xl border p-4 text-left transition ${size === option ? "border-[#ee5264] bg-[#fff0e8]" : "border-[#dfd3cc] hover:border-[#ee5264]"}`}><span className="flex items-center justify-between"><span className="text-base font-black">{option}</span><span className={`h-4 w-4 rounded-full border ${size === option ? "border-[5px] border-[#ee5264]" : "border-[#b7b0ac]"}`} /></span><span className="mt-2 block text-xs text-[#737b90]">{option === "A4" ? "21 × 29,7 cm" : "14,8 × 21 cm"}</span></button>)}</div></div><div><p className="text-sm font-black">{es ? "Tipo de calendario" : "Tipo de calendário"}</p><button type="button" onClick={() => setDated(!dated)} className={`focus-ring mt-3 flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition ${dated ? "border-[#ee5264] bg-[#fff0e8]" : "border-[#dfd3cc]"}`}><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${dated ? "bg-[#ee5264] text-white" : "bg-[#f4eee9]"}`}><Icon name="check" size={18} /></span><span className="flex-1"><span className="block text-sm font-black">{es ? "Con fechas" : "Com datas"}</span><span className="mt-1 block text-xs leading-5 text-[#737b90]">{es ? "12 meses listos para empezar en enero." : "12 meses prontos para começar em janeiro."}</span></span></button></div><div><p className="text-sm font-black">{es ? "Foto de portada" : "Fotografia de capa"}</p><UploadButton photo={photo} onPhoto={setPhoto} es={es} /></div></div>;
  const preview = <div className="mx-auto max-w-[560px]"><div className={`mx-auto overflow-hidden bg-white shadow-2xl shadow-[#8a564c]/15 transition-all ${size === "A5" ? "w-[70%] rounded-[14px]" : "w-full rounded-[18px]"}`}><div className="flex h-5 items-center justify-center gap-3 bg-[#182443]">{Array.from({ length: 13 }).map((_, index) => <span key={index} className="h-2.5 w-1 rounded-full bg-white/70" />)}</div><img src={photo || "/images/calendar-product.png"} alt={es ? "Vista previa del calendario" : "Pré-visualização do calendário"} className="aspect-[1.65/1] w-full object-cover" /><div className="p-4 sm:p-6"><div className="flex items-end justify-between border-b border-[#182443] pb-3"><h3 className="serif text-3xl font-bold">{dated ? (es ? "ENERO" : "JANEIRO") : (es ? "TU MES" : "O TEU MÊS")}</h3><span className="text-[10px] font-black">2027</span></div><div className="mt-3 grid grid-cols-7 gap-px bg-[#eadfd8]">{Array.from({ length: 35 }).map((_, index) => <span key={index} className="flex aspect-square items-start justify-end bg-white p-1 text-[7px] text-[#59627b]">{dated && index > 2 && index < 34 ? index - 2 : ""}</span>)}</div></div></div><div className="mt-4 flex flex-wrap justify-center gap-1.5">{months.map((month, index) => <span key={month} className={`rounded-full px-2.5 py-1 text-[9px] font-black ${index === 0 ? "bg-[#182443] text-white" : "bg-white text-[#9297a4]"}`}>{month}</span>)}</div></div>;
  return <StudioShell eyebrow={es ? "CALENDARIOS PERSONALIZADOS" : "CALENDÁRIOS PERSONALIZADOS"} title={es ? "Un año lleno de los tuyos" : "Um ano cheio dos teus"} body={es ? "Elige A4 o A5, añade tu foto y revisa cómo quedará tu calendario con fechas." : "Escolhe A4 ou A5, adiciona a tua fotografia e vê como ficará o calendário com datas."} controls={controls} preview={preview} price={price} es={es} />;
}

export function WallArtStudio() {
  const es = useSelector((state: RootState) => state.language.language) === "es";
  const products = [
    {
      id: "framed-poster",
      name: es ? "Póster enmarcado Fine Art" : "Poster emoldurado Fine Art",
      detail: es ? "Marco de madera listo para colgar con plexiglass protector" : "Moldura de madeira pronta a pendurar com plexiglass",
      basePrice: 29.9,
      type: "framed" as const,
    },
    {
      id: "matte-poster",
      name: es ? "Póster mate clásico" : "Poster mate clássico",
      detail: es ? "Papel mate prémium de 200 g/m² de calidad museo" : "Papel mate premium de 200 g/m² de qualidade museu",
      basePrice: 14.9,
      type: "poster" as const,
    },
    {
      id: "wood-print",
      name: es ? "Impresión en madera" : "Impressão em madeira",
      detail: es ? "Impresión directa sobre madera de abedul con vetas visibles" : "Impressão direta sobre madeira de bétula com veios visíveis",
      basePrice: 24.9,
      type: "wood" as const,
    },
  ] as const;

  const [selectedProduct, setSelectedProduct] = useState<(typeof products)[number]["id"]>("framed-poster");
  const [size, setSize] = useState<"21x30" | "30x40" | "50x70">("30x40");
  const [frame, setFrame] = useState<"white" | "wood" | "dark-wood" | "black">("wood");
  const [orientation, setOrientation] = useState<"vertical" | "horizontal">("vertical");
  const [photo, setPhoto] = useState<string | null>(null);

  const product = products.find((item) => item.id === selectedProduct)!;

  // Frame colors as requested by client: White, Wood, Dark Wood, Black
  const frameStyles: Record<"white" | "wood" | "dark-wood" | "black", { nameEs: string; namePt: string; border: string; bg: string }> = {
    white: { nameEs: "Blanco", namePt: "Branco", border: "#f3f3f3", bg: "#ffffff" },
    wood: { nameEs: "Madera natural", namePt: "Madeira natural", border: "#caa57b", bg: "#caa57b" },
    "dark-wood": { nameEs: "Madera oscura", namePt: "Madeira escura", border: "#4a3525", bg: "#4a3525" },
    black: { nameEs: "Negro", namePt: "Preto", border: "#18181b", bg: "#18181b" },
  };

  const sizeMultipliers = { "21x30": 1, "30x40": 1.35, "50x70": 1.85 };
  const currentPrice = (product.basePrice * sizeMultipliers[size]).toFixed(2).replace(".", ",") + " €";

  const controls = (
    <div className="mt-6 space-y-6">
      <div>
        <p className="text-sm font-black">{es ? "Tipo de producto Gelato" : "Tipo de produto Gelato"}</p>
        <div className="mt-3 grid gap-2.5">
          {products.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedProduct(item.id)}
              className={`focus-ring flex items-start justify-between rounded-2xl border p-4 text-left transition ${
                selectedProduct === item.id ? "border-[#ee5264] bg-[#fff0e8]" : "border-[#dfd3cc] hover:border-[#ee5264]"
              }`}
            >
              <div>
                <span className="block text-sm font-black">{item.name}</span>
                <span className="mt-1 block text-xs text-[#737b90]">{item.detail}</span>
              </div>
              <span className="text-xs font-black text-[#ee5264] whitespace-nowrap ml-3">
                {es ? "desde " : "a partir de "}{(item.basePrice).toFixed(2).replace(".", ",")} €
              </span>
            </button>
          ))}
        </div>
      </div>

      {product.type === "framed" && (
        <div>
          <p className="text-sm font-black">{es ? "Color del marco (4 opciones Gelato)" : "Cor da moldura (4 opções Gelato)"}</p>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(["white", "wood", "dark-wood", "black"] as const).map((colorKey) => (
              <button
                key={colorKey}
                type="button"
                onClick={() => setFrame(colorKey)}
                className={`focus-ring flex flex-col items-center gap-2 rounded-2xl border p-3 text-center transition ${
                  frame === colorKey ? "border-[#ee5264] bg-[#fff0e8]" : "border-[#dfd3cc] hover:border-[#ee5264]"
                }`}
              >
                <span
                  className="h-8 w-8 rounded-full border-2 border-white shadow-sm ring-1 ring-black/15"
                  style={{ backgroundColor: frameStyles[colorKey].bg }}
                />
                <span className="text-xs font-black text-[#182443]">
                  {es ? frameStyles[colorKey].nameEs : frameStyles[colorKey].namePt}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-sm font-black">{es ? "Tamaño" : "Tamanho"}</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {(["21x30", "30x40", "50x70"] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setSize(opt)}
              className={`focus-ring rounded-xl border p-3 text-center transition ${
                size === opt ? "border-[#ee5264] bg-[#fff0e8] text-[#ee5264]" : "border-[#dfd3cc]"
              }`}
            >
              <span className="block text-xs font-black">{opt.replace("x", " × ")} cm</span>
              <span className="block text-[10px] text-[#737b90] mt-0.5">
                {opt === "21x30" ? "A4" : opt === "30x40" ? "Mediano" : "Grande"}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-black">{es ? "Orientación" : "Orientação"}</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {(["vertical", "horizontal"] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setOrientation(opt)}
              className={`focus-ring rounded-xl border p-2.5 text-xs font-black transition ${
                orientation === opt ? "border-[#ee5264] bg-[#fff0e8] text-[#ee5264]" : "border-[#dfd3cc]"
              }`}
            >
              {opt === "vertical" ? (es ? "Vertical (Retrato)" : "Vertical (Retrato)") : (es ? "Horizontal (Paisaje)" : "Horizontal (Paisagem)")}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-black">{es ? "Tu fotografía" : "A tua fotografia"}</p>
        <UploadButton photo={photo} onPhoto={setPhoto} es={es} />
      </div>
    </div>
  );

  const picture = <img src={photo || "/images/wall-art-product.png"} alt="Arte de pared" className="h-full w-full object-cover" />;

  const preview = (
    <div className="relative aspect-[4/3] overflow-hidden rounded-[20px] bg-[#ece2d6] p-6 sm:p-10 flex items-center justify-center">
      <div className="absolute bottom-0 left-0 right-0 h-[22%] bg-[#d2beaa] shadow-inner" />

      {product.type === "framed" ? (
        <div
          className={`relative z-10 transition-all shadow-2xl ${
            orientation === "vertical" ? "h-[78%] aspect-[3/4]" : "w-[78%] aspect-[4/3]"
          } p-3 rounded-sm`}
          style={{ backgroundColor: frameStyles[frame].bg }}
        >
          <div className="h-full w-full overflow-hidden bg-white p-2.5 shadow-inner">
            {picture}
          </div>
        </div>
      ) : product.type === "wood" ? (
        <div
          className={`relative z-10 transition-all shadow-2xl overflow-hidden rounded-md border-r-8 border-b-8 border-[#b48d61] ${
            orientation === "vertical" ? "h-[76%] aspect-[3/4]" : "w-[76%] aspect-[4/3]"
          }`}
          style={{
            backgroundImage: "repeating-linear-gradient(45deg, rgba(200, 160, 110, 0.15) 0, rgba(200, 160, 110, 0.15) 10px, transparent 10px, transparent 20px)",
            backgroundColor: "#ddba90",
          }}
        >
          <div className="h-full w-full opacity-90 mix-blend-multiply">
            {picture}
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#8b653c]/30 via-transparent to-white/10" />
        </div>
      ) : (
        <div
          className={`relative z-10 transition-all shadow-xl bg-white p-1 rounded-xs ${
            orientation === "vertical" ? "h-[78%] aspect-[3/4]" : "w-[78%] aspect-[4/3]"
          }`}
        >
          <div className="h-full w-full overflow-hidden shadow-sm">
            {picture}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <StudioShell
      eyebrow={es ? "ARTE DE PARED · CATÁLOGO GELATO" : "ARTE DE PAREDE · CATÁLOGO GELATO"}
      title={es ? "Tus recuerdos convertidos en arte" : "As tuas memórias transformadas em arte"}
      body={es ? "Elige póster enmarcado Fine Art (blanco, madera natural, madera oscura o negro), póster mate clásico o impresión sobre madera natural." : "Escolhe poster emoldurado Fine Art (branco, madeira natural, madeira escura ou preto), poster mate clássico ou impressão em madeira natural."}
      controls={controls}
      preview={preview}
      price={currentPrice}
      es={es}
    />
  );
}

export function MagnetsStudio() {
  const es = useSelector((state: RootState) => state.language.language) === "es";
  const [quantity, setQuantity] = useState<4 | 9>(9);
  const [shape, setShape] = useState<"square" | "round">("square");
  const [photos, setPhotos] = useState<(string | null)[]>(Array(9).fill(null));
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const price = quantity === 4 ? "9,90 €" : "14,90 €";
  // Removed sticker-cello.jpg per client requirement
  const samplePhotos = [
    "/images/sticker-family.jpg",
    "/images/sticker-lifestyle-dog.jpg",
    "/images/sticker-baby.jpg",
    "/images/sticker-lifestyle-sports.jpg",
    "/images/sticker-dog.jpg",
  ];
  const photoFor = (index: number) => photos[index] || samplePhotos[index % samplePhotos.length];
  const updatePhoto = (value: string) => setPhotos((current) => current.map((photo, index) => (index === selectedPhoto ? value : photo)));
  const controls = (
    <div className="mt-6 space-y-6">
      <div>
        <p className="text-sm font-black">{es ? "Tamaño del pack" : "Tamanho do conjunto"}</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {([4, 9] as const).map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => {
                setQuantity(amount);
                setSelectedPhoto((current) => Math.min(current, amount - 1));
              }}
              className={`focus-ring rounded-2xl border p-4 text-left transition ${
                quantity === amount ? "border-[#ee5264] bg-[#fff0e8]" : "border-[#dfd3cc] hover:border-[#ee5264]"
              }`}
            >
              <span className="flex items-center justify-between">
                <span className="text-lg font-black">{amount}</span>
                <span className="text-xs font-black text-[#ee5264]">{amount === 4 ? "9,90 €" : "14,90 €"}</span>
              </span>
              <span className="mt-2 block text-xs text-[#737b90]">{es ? "imanes de 6 × 6 cm" : "ímanes de 6 × 6 cm"}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-sm font-black">{es ? "Forma" : "Forma"}</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {(["square", "round"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setShape(option)}
              className={`focus-ring flex items-center gap-3 rounded-2xl border p-3 text-sm font-black transition ${
                shape === option ? "border-[#ee5264] bg-[#fff0e8]" : "border-[#dfd3cc]"
              }`}
            >
              <span className={`h-7 w-7 bg-[#182443] ${option === "round" ? "rounded-full" : "rounded-md"}`} />
              {option === "square" ? (es ? "Cuadrado" : "Quadrado") : (es ? "Redondo" : "Redondo")}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-sm font-black">{es ? "Fotos de los imanes" : "Fotografias dos ímanes"}</p>
        <div className={`mt-3 grid gap-2 ${quantity === 4 ? "grid-cols-4" : "grid-cols-3"}`}>
          {Array.from({ length: quantity }).map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setSelectedPhoto(index)}
              className={`focus-ring relative aspect-square overflow-hidden rounded-lg border-2 ${
                selectedPhoto === index ? "border-[#ee5264]" : "border-transparent"
              }`}
              aria-label={`${es ? "Seleccionar imán" : "Selecionar íman"} ${index + 1}`}
            >
              <img src={photoFor(index)} alt="" className="h-full w-full object-cover" />
              <span className="absolute inset-x-0 bottom-0 bg-[#182443]/75 py-1 text-[9px] font-black text-white">
                {index + 1}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm font-bold">{es ? `Foto del imán ${selectedPhoto + 1}` : `Fotografia do íman ${selectedPhoto + 1}`}</p>
        <UploadButton photo={photos[selectedPhoto]} onPhoto={updatePhoto} es={es} />
        <p className="mt-2 text-[11px] leading-5 text-[#9297a4]">{es ? "Cada imán lleva una fotografía individual." : "Cada íman leva uma fotografia individual."}</p>
      </div>
    </div>
  );
  const preview = (
    <div className={`grid gap-3 rounded-[20px] bg-[#fdfaf5] p-5 shadow-inner sm:gap-4 sm:p-8 ${quantity === 4 ? "mx-auto max-w-[460px] grid-cols-2" : "grid-cols-3"}`}>
      {Array.from({ length: quantity }).map((_, index) => (
        <div
          key={index}
          className={`aspect-square overflow-hidden border-[5px] border-white bg-white shadow-lg ${shape === "round" ? "rounded-full" : "rounded-xl"}`}
        >
          <img src={photoFor(index)} alt={es ? `Vista previa del imán ${index + 1}` : `Pré-visualização do íman ${index + 1}`} className="h-full w-full object-cover" />
        </div>
      ))}
    </div>
  );
  return (
    <StudioShell
      eyebrow={es ? "IMANES PERSONALIZADOS" : "ÍMANES PERSONALIZADOS"}
      title={es ? "Recuerdos que siempre tienes a la vista" : "Memórias sempre à vista"}
      body={es ? "Elige 4 o 9, cuadrados o redondos, y convierte cada foto en un pequeño detalle cotidiano." : "Escolhe 4 ou 9, quadrados ou redondos, e transforma cada fotografia num pequeno detalhe diário."}
      controls={controls}
      preview={preview}
      price={price}
      es={es}
    />
  );
}

export function PhoneCaseStudio() {
  const es = useSelector((state: RootState) => state.language.language) === "es";

  // Phone brand & model catalog as requested by client
  const phoneCatalog = {
    apple: {
      name: "Apple iPhone",
      models: [
        { id: "ip16promax", name: "iPhone 16 Pro Max", camera: "triple-large" },
        { id: "ip16pro", name: "iPhone 16 Pro", camera: "triple" },
        { id: "ip16", name: "iPhone 16", camera: "dual-vertical" },
        { id: "ip15promax", name: "iPhone 15 Pro Max", camera: "triple-large" },
        { id: "ip15pro", name: "iPhone 15 Pro", camera: "triple" },
        { id: "ip15", name: "iPhone 15", camera: "dual-diagonal" },
        { id: "ip14pro", name: "iPhone 14 Pro", camera: "triple" },
        { id: "ip14", name: "iPhone 14", camera: "dual-diagonal" },
        { id: "ip13", name: "iPhone 13", camera: "dual-diagonal" },
      ],
    },
    samsung: {
      name: "Samsung Galaxy",
      models: [
        { id: "s24ultra", name: "Galaxy S24 Ultra", camera: "samsung-pills" },
        { id: "s24plus", name: "Galaxy S24+", camera: "samsung-pills" },
        { id: "s24", name: "Galaxy S24", camera: "samsung-pills" },
        { id: "s23ultra", name: "Galaxy S23 Ultra", camera: "samsung-pills" },
        { id: "s23", name: "Galaxy S23", camera: "samsung-pills" },
        { id: "a54", name: "Galaxy A54 5G", camera: "samsung-pills" },
      ],
    },
    google: {
      name: "Google Pixel",
      models: [
        { id: "p9pro", name: "Pixel 9 Pro XL", camera: "pixel-bar" },
        { id: "p9", name: "Pixel 9", camera: "pixel-bar" },
        { id: "p8pro", name: "Pixel 8 Pro", camera: "pixel-bar" },
        { id: "p8", name: "Pixel 8", camera: "pixel-bar" },
        { id: "p7pro", name: "Pixel 7 Pro", camera: "pixel-bar" },
      ],
    },
    xiaomi: {
      name: "Xiaomi",
      models: [
        { id: "mi14", name: "Xiaomi 14", camera: "triple-square" },
        { id: "mi13pro", name: "Xiaomi 13 Pro", camera: "triple-square" },
        { id: "redmi13", name: "Redmi Note 13 Pro", camera: "triple-square" },
      ],
    },
  } as const;

  type BrandKey = keyof typeof phoneCatalog;

  const [brand, setBrand] = useState<BrandKey>("apple");
  const [modelId, setModelId] = useState<string>("ip15pro");
  const [caseType, setCaseType] = useState<"snap" | "tough" | "clear">("tough");
  const [finish, setFinish] = useState<"matte" | "glossy">("matte");
  const [photo, setPhoto] = useState<string | null>(null);

  const currentModels = phoneCatalog[brand].models;
  const currentModel = currentModels.find((m) => m.id === modelId) || currentModels[0];

  const casePrices = {
    snap: 19.9,
    tough: 24.9,
    clear: 19.9,
  };

  const price = casePrices[caseType].toFixed(2).replace(".", ",") + " €";

  const controls = (
    <div className="mt-6 space-y-6">
      {/* 1. Phone Brand */}
      <div>
        <p className="text-sm font-black">{es ? "Marca de móvil" : "Marca do telemóvel"}</p>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(Object.keys(phoneCatalog) as BrandKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setBrand(key);
                setModelId(phoneCatalog[key].models[0].id);
              }}
              className={`focus-ring rounded-xl border p-2.5 text-center text-xs font-black transition ${
                brand === key ? "border-[#ee5264] bg-[#fff0e8] text-[#ee5264]" : "border-[#dfd3cc] hover:border-[#ee5264]"
              }`}
            >
              {phoneCatalog[key].name}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Specific Model */}
      <div>
        <label className="block text-sm font-black">
          {es ? `Modelo de ${phoneCatalog[brand].name}` : `Modelo do ${phoneCatalog[brand].name}`}
          <select
            value={currentModel.id}
            onChange={(e) => setModelId(e.target.value)}
            className="focus-ring mt-2 w-full rounded-xl border border-[#dfd3cc] bg-white p-3 text-sm font-bold text-[#182443]"
          >
            {currentModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* 3. Case Protection Type */}
      <div>
        <p className="text-sm font-black">{es ? "Tipo de funda Gelato" : "Tipo de capa Gelato"}</p>
        <div className="mt-3 grid gap-2">
          {[
            {
              id: "tough" as const,
              title: es ? "Funda Tough (Doble protección)" : "Capa Tough (Dupla proteção)",
              desc: es ? "Carcasa rígida con forro interior de silicona amortiguadora." : "Capa rígida com forro interior em silicone amortecedor.",
              price: "24,90 €",
            },
            {
              id: "snap" as const,
              title: es ? "Funda Snap (Fina)" : "Capa Snap (Fina)",
              desc: es ? "Diseño ultraligero y ajustado que mantiene el perfil fino del móvil." : "Design ultraleve e ajustado que mantém o perfil fino do telemóvel.",
              price: "19,90 €",
            },
            {
              id: "clear" as const,
              title: es ? "Funda Transparente (Clear)" : "Capa Transparente (Clear)",
              desc: es ? "Carcasa flexible con laterales transparentes para lucir el color original." : "Capa flexível com laterais transparentes para ver a cor original.",
              price: "19,90 €",
            },
          ].map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => setCaseType(type.id)}
              className={`focus-ring flex items-start justify-between rounded-2xl border p-3.5 text-left transition ${
                caseType === type.id ? "border-[#ee5264] bg-[#fff0e8]" : "border-[#dfd3cc] hover:border-[#ee5264]"
              }`}
            >
              <div>
                <span className="block text-xs font-black">{type.title}</span>
                <span className="mt-0.5 block text-[11px] text-[#737b90]">{type.desc}</span>
              </div>
              <span className="text-xs font-black text-[#ee5264] ml-2 whitespace-nowrap">{type.price}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Finish */}
      <div>
        <p className="text-sm font-black">{es ? "Acabado" : "Acabamento"}</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {[
            { id: "matte" as const, label: es ? "Mate (Tacto suave anti-huellas)" : "Mate (Toque suave anti-dedadas)" },
            { id: "glossy" as const, label: es ? "Brillante (Colores vivos cristal)" : "Brilhante (Cores vivas cristal)" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFinish(item.id)}
              className={`focus-ring rounded-xl border p-3 text-center text-xs font-black transition ${
                finish === item.id ? "border-[#ee5264] bg-[#fff0e8] text-[#ee5264]" : "border-[#dfd3cc] hover:border-[#ee5264]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-black">{es ? "Tu fotografía" : "A tua fotografia"}</p>
        <UploadButton photo={photo} onPhoto={setPhoto} es={es} />
      </div>
    </div>
  );

  // Live camera module rendering based on brand/model camera layout
  const renderCameraModule = () => {
    if (currentModel.camera === "samsung-pills") {
      return (
        <div className="absolute left-4 top-5 flex flex-col gap-2.5 z-20">
          <div className="h-6 w-6 rounded-full border-2 border-[#182443] bg-black shadow-md ring-2 ring-white/30" />
          <div className="h-6 w-6 rounded-full border-2 border-[#182443] bg-black shadow-md ring-2 ring-white/30" />
          <div className="h-6 w-6 rounded-full border-2 border-[#182443] bg-black shadow-md ring-2 ring-white/30" />
        </div>
      );
    }
    if (currentModel.camera === "pixel-bar") {
      return (
        <div className="absolute inset-x-2 top-6 h-8 rounded-full border border-black/40 bg-[#1e232e] shadow-lg flex items-center px-4 gap-3 z-20">
          <div className="h-4 w-4 rounded-full bg-black ring-1 ring-white/40" />
          <div className="h-4 w-4 rounded-full bg-black ring-1 ring-white/40" />
          <div className="h-2 w-2 rounded-full bg-white/70 ml-auto" />
        </div>
      );
    }
    // Default: iPhone styled rounded camera island
    return (
      <div className="absolute left-3.5 top-4 h-[72px] w-[72px] rounded-[22px] border-4 border-[#182443] bg-[#222b43] shadow-lg z-20">
        <span className="absolute left-2 top-2 h-5 w-5 rounded-full bg-black ring-2 ring-white/30 shadow-inner" />
        <span className="absolute bottom-2 right-2 h-5 w-5 rounded-full bg-black ring-2 ring-white/30 shadow-inner" />
        <span className="absolute right-2 top-2 h-3.5 w-3.5 rounded-full bg-black" />
        <span className="absolute left-3 bottom-3 h-2 w-2 rounded-full bg-white/60" />
      </div>
    );
  };

  const preview = (
    <div className="flex min-h-[520px] items-center justify-center rounded-[22px] bg-gradient-to-br from-[#f7dacf] to-[#f4eadf] p-8">
      <div
        className={`relative overflow-hidden rounded-[42px] border-[9px] shadow-2xl transition-all h-[445px] w-[220px] ${
          caseType === "clear"
            ? "border-white/80 bg-white/30 backdrop-blur-xs"
            : caseType === "tough"
            ? "border-[#10192e] bg-[#10192e] ring-2 ring-black/20"
            : "border-[#2b354f] bg-[#2b354f]"
        }`}
      >
        <img
          src={photo || "/images/sticker-lifestyle-dog.jpg"}
          alt="Vista previa de la funda"
          className={`h-full w-full object-cover ${caseType === "clear" ? "opacity-85" : ""} ${
            finish === "glossy" ? "contrast-[1.05]" : ""
          }`}
        />
        {/* Subtle glossy sheen reflection overlay */}
        {finish === "glossy" && (
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent" />
        )}
        {/* Camera module */}
        {renderCameraModule()}

        {/* Model water-mark indicator */}
        <div className="absolute inset-x-0 bottom-3 text-center pointer-events-none">
          <span className="rounded-full bg-black/55 px-2.5 py-0.5 text-[9px] font-black tracking-wide text-white/90 backdrop-blur">
            {currentModel.name}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <StudioShell
      eyebrow={es ? "FUNDAS MÓVIL · VARIEDAD DE MARCAS Y MODELOS" : "CAPAS DE TELEMÓVEL · VARIEDADE DE MARCAS E MODELOS"}
      title={es ? "Tu funda a medida para cada modelo" : "A tua capa à medida para cada modelo"}
      body={es ? "Compatible con Apple iPhone, Samsung Galaxy, Google Pixel y Xiaomi. Elige tu modelo, protección Tough o Snap y acabado mate o brillante." : "Compatível com Apple iPhone, Samsung Galaxy, Google Pixel e Xiaomi. Escolhe o teu modelo, proteção Tough ou Snap e acabamento mate ou brilhante."}
      controls={controls}
      preview={preview}
      price={price}
      es={es}
    />
  );
}

export function StickerStudio() {
  const es = useSelector((state: RootState) => state.language.language) === "es";
  const [format, setFormat] = useState<"circular" | "rectangular">("circular");
  const [pack, setPack] = useState<1 | 4 | 10>(4);
  const [finish, setFinish] = useState<"matte" | "glossy" | "clear">("matte");
  const [photo, setPhoto] = useState<string | null>(null);

  const packPrices = {
    1: 1.5,
    4: 4.9,
    10: 9.9,
  };

  const currentPrice = packPrices[pack].toFixed(2).replace(".", ",") + " €";

  const controls = (
    <div className="mt-6 space-y-6">
      {/* Gelato physical product specification notice */}
      <div className="rounded-2xl border border-[#e8d5cc] bg-[#fff6f0] p-4 text-xs leading-5 text-[#6c584c]">
        <p className="font-black text-[#ee5264] flex items-center gap-1.5 uppercase tracking-wide text-[10px]">
          <Icon name="check" size={13} />
          {es ? "Especificación física de catálogo Gelato" : "Especificação física do catálogo Gelato"}
        </p>
        <p className="mt-1">
          {es
            ? "El producto físico es una lámina adhesiva rectangular de 4 × 3 pulgadas (10,16 × 7,62 cm). Para ofrecer pegatinas redondas, la plantilla de personalización centra un diseño circular de 3 pulgadas (7,62 cm), logrando la apariencia perfecta de sticker circular."
            : "O produto físico é uma folha adesiva retangular de 4 × 3 polegadas (10,16 × 7,62 cm). Para oferecer autocolantes redondos, o modelo centra um design circular de 3 polegadas (7,62 cm), obtendo a aparência perfeita de autocolante circular."}
        </p>
      </div>

      {/* Format selection */}
      <div>
        <p className="text-sm font-black">{es ? "Formato de diseño en la lámina 4×3\"" : "Formato de design na folha 4×3\""}</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setFormat("circular")}
            className={`focus-ring flex flex-col items-start rounded-2xl border p-3.5 text-left transition ${
              format === "circular" ? "border-[#ee5264] bg-[#fff0e8]" : "border-[#dfd3cc] hover:border-[#ee5264]"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="h-5 w-5 rounded-full border-2 border-[#ee5264] bg-[#ee5264]/20" />
              <span className="text-xs font-black">{es ? "Circular 3\" (Recomendado)" : "Circular 3\" (Recomendado)"}</span>
            </div>
            <span className="mt-1 block text-[11px] text-[#737b90]">
              {es ? "Diseño redondo centrado con línea de despegue" : "Design redondo centrado com linha de destaque"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFormat("rectangular")}
            className={`focus-ring flex flex-col items-start rounded-2xl border p-3.5 text-left transition ${
              format === "rectangular" ? "border-[#ee5264] bg-[#fff0e8]" : "border-[#dfd3cc] hover:border-[#ee5264]"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="h-5 w-5 rounded-md border-2 border-[#182443] bg-[#182443]/20" />
              <span className="text-xs font-black">{es ? "Rectangular 4×3\"" : "Retangular 4×3\""}</span>
            </div>
            <span className="mt-1 block text-[11px] text-[#737b90]">
              {es ? "Aprovecha toda la lámina rectangular" : "Aproveita toda a folha retangular"}
            </span>
          </button>
        </div>
      </div>

      {/* Pack quantity */}
      <div>
        <p className="text-sm font-black">{es ? "Cantidad" : "Quantidade"}</p>
        <div className="mt-3 grid grid-cols-3 gap-2.5">
          {([1, 4, 10] as const).map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => setPack(amount)}
              className={`focus-ring rounded-xl border p-3 text-center transition ${
                pack === amount ? "border-[#ee5264] bg-[#fff0e8] text-[#ee5264]" : "border-[#dfd3cc]"
              }`}
            >
              <span className="block text-base font-black">{amount} {amount === 1 ? (es ? "unidad" : "unidade") : "stickers"}</span>
              <span className="block text-xs font-black text-[#ee5264] mt-0.5">{packPrices[amount].toFixed(2).replace(".", ",")} €</span>
            </button>
          ))}
        </div>
      </div>

      {/* Material Finish */}
      <div>
        <p className="text-sm font-black">{es ? "Acabado de vinilo" : "Acabamento de vinil"}</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { id: "matte" as const, label: es ? "Vinilo mate" : "Vinil mate" },
            { id: "glossy" as const, label: es ? "Vinilo brillante" : "Vinil brilhante" },
            { id: "clear" as const, label: es ? "Transparente" : "Transparente" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFinish(item.id)}
              className={`focus-ring rounded-xl border p-2.5 text-center text-xs font-black transition ${
                finish === item.id ? "border-[#ee5264] bg-[#fff0e8] text-[#ee5264]" : "border-[#dfd3cc] hover:border-[#ee5264]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-black">{es ? "Tu fotografía" : "A tua fotografia"}</p>
        <UploadButton photo={photo} onPhoto={setPhoto} es={es} />
      </div>
    </div>
  );

  const preview = (
    <div className="flex min-h-[500px] flex-col items-center justify-center rounded-[22px] bg-[#f8efe8] p-6 sm:p-10">
      {/* 4x3 inch physical rectangular backing sheet representation */}
      <div className="relative aspect-[4/3] w-full max-w-[420px] rounded-[16px] border-2 border-dashed border-[#b6a69d] bg-white p-5 shadow-2xl shadow-[#8a564c]/15">
        <span className="absolute -top-3 left-4 rounded-full bg-[#182443] px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
          {es ? "Lámina física 4 × 3 pulgadas" : "Folha física 4 × 3 polegadas"}
        </span>

        {format === "circular" ? (
          /* Circular 3 inch design in the center of 4x3 sheet with peel corner */
          <div className="relative mx-auto flex h-full aspect-square items-center justify-center">
            <div className="relative h-full w-full overflow-hidden rounded-full border-[5px] border-white shadow-xl ring-2 ring-[#ee5264]/40">
              <img
                src={photo || "/images/sticker-lifestyle-sports.jpg"}
                alt="Vista previa del sticker circular"
                className="h-full w-full object-cover"
              />
              {/* Circular peel back corner effect matching client reference */}
              <div
                className="absolute -right-1 -top-1 h-10 w-10 origin-top-right rotate-45 bg-gradient-to-br from-white via-[#dedede] to-[#b3b3b3] shadow-md border-b border-l border-black/15"
                style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }}
              />
            </div>
            <div className="pointer-events-none absolute -bottom-2 rounded-full bg-white/95 px-3 py-1 text-[10px] font-black text-[#ee5264] shadow-md">
              {es ? "Diseño circular 3\" (7,62 cm)" : "Design circular 3\" (7,62 cm)"}
            </div>
          </div>
        ) : (
          /* Rectangular full bleed option */
          <div className="relative h-full w-full overflow-hidden rounded-xl border-[4px] border-white shadow-lg">
            <img
              src={photo || "/images/sticker-lifestyle-sports.jpg"}
              alt="Vista previa del sticker rectangular"
              className="h-full w-full object-cover"
            />
          </div>
        )}
      </div>

      <p className="mt-5 text-center text-xs font-bold text-[#737b90]">
        {es
          ? `Lámina adhesiva de alta adherencia · Acabado ${finish === "matte" ? "mate" : finish === "glossy" ? "brillante" : "transparente"}`
          : `Folha adesiva de alta aderência · Acabamento ${finish === "matte" ? "mate" : finish === "glossy" ? "brilhante" : "transparente"}`}
      </p>
    </div>
  );

  return (
    <StudioShell
      eyebrow={es ? "STICKERS PERSONALIZADOS · GELATO WORKAROUND" : "AUTOCOLANTES PERSONALIZADOS · GELATO WORKAROUND"}
      title={es ? "Tus fotos en stickers resistentes" : "As tuas fotos em autocolantes resistentes"}
      body={es ? "Lámina física de 4 × 3 pulgadas con opción de diseño circular de 3 pulgadas o formato rectangular completo." : "Folha física de 4 × 3 polegadas com opção de design circular de 3 polegadas ou formato retangular completo."}
      controls={controls}
      preview={preview}
      price={currentPrice}
      es={es}
    />
  );
}
