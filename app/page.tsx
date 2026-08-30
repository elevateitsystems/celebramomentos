"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";

type Language = "es" | "pt";
type Template = { id: string; name: string; eyebrow: string; description: string; image: string; tone: string; price: string };

const copy = {
  es: {
    nav: ["Diseños", "Cómo funciona", "Extras", "Ayuda"],
    announcement: "Envío gratis en pedidos de 35€ o más · Entregamos en España y Portugal",
    heroKicker: "TARJETAS CON UN POQUITO MÁS DE CORAZÓN",
    heroTitle: <>Pequeños gestos.<br /><span>Momentos</span> para recordar.</>,
    heroBody: "Crea una tarjeta única con tus fotos, tus palabras y ese toque que solo tú sabes darle. Nosotros la imprimimos y la llevamos hasta su puerta.",
    create: "Crear mi tarjeta",
    explore: "Ver diseños",
    trust: "Diseñado por ti · Entregado con cariño",
    stepsKicker: "ASÍ DE FÁCIL",
    stepsTitle: "Tu idea, en tres pequeños pasos",
    steps: [["01", "Elige un diseño", "Encuentra una plantilla que se parezca a esa persona especial."], ["02", "Hazla tuya", "Añade fotos, palabras y emojis. Sin límites para tu creatividad."], ["03", "La hacemos llegar", "La imprimimos con mimo y la enviamos a España o Portugal." ]],
    benefitsKicker: "POR QUÉ CELEBRA MOMENTOS",
    benefitsTitle: "Bonito por fuera. Especial por dentro.",
    benefits: [["01", "Hecho para ti", "Cada tarjeta nace de tu foto, tus palabras y tu forma de celebrar."], ["02", "Calidad que se nota", "Papel premium, impresión cuidada y detalles que dan gusto guardar."], ["03", "Siempre a tiempo", "Envíos claros a España y Portugal, con opciones para cuando importa."]],
    templatesKicker: "PARA CADA MOMENTO",
    templatesTitle: "Diseños que empiezan la conversación",
    templatesBody: "Elige una base bonita. El mensaje importante lo pones tú.",
    customize: "Personalizar diseño",
    from: "Desde",
    extrasKicker: "UN POQUITO MÁS DE MAGIA",
    extrasTitle: "Completa el momento",
    extrasBody: "Añade un detalle pequeño que diga: he pensado en ti.",
    sticker: "Stickers personalizados",
    stickerBody: "Tu foto favorita, convertida en un pequeño círculo de alegría.",
    chocolate: "Chocolates artesanos",
    chocolateBody: "Una sorpresa dulce para acompañar sus palabras.",
    add: "Añadir",
    reviewsKicker: "HECHO PARA EMOCIONAR",
    reviewsTitle: "Lo que dicen quienes ya lo han probado",
    deliveryKicker: "LLEGA CUANDO IMPORTA",
    deliveryTitle: "Una tarjeta pensada para quedarse",
    deliveryBody: "Impresión cuidada, papel con tacto y un envío sencillo de seguir. Porque el momento empieza cuando la ves en el buzón.",
    deliveryPoints: ["Papel premium de 300 g", "Envíos a España y Portugal", "Seguimiento en cada pedido"],
    finalKicker: "¿A QUIÉN LE DEDICAMOS UN MOMENTO?",
    finalTitle: "Lo bonito no tiene por qué esperar",
    finalBody: "Empieza con una foto. Termina con una sonrisa.",
    footer: "Tarjetas que convierten un día cualquiera en un momento para recordar.",
    footerLinks: ["Privacidad", "Cookies", "Términos", "Contacto"],
    editorKicker: "TU TARJETA, TU HISTORIA",
    editorTitle: "Personaliza tu diseño",
    editorBody: "Hazlo tuyo en un par de minutos. Puedes cambiarlo todo antes de pedir.",
    message: "Tu mensaje",
    photo: "Tu foto",
    upload: "Subir una foto",
    uploadHint: "JPG o PNG · hasta 10 MB",
    emoji: "Añade un emoji",
    size: "Tamaño",
    a4: "A4 · 21 × 29,7 cm",
    a3: "A3 · 29,7 × 42 cm",
    preview: "Vista previa",
    continue: "Continuar con extras",
    reset: "Restablecer",
    cart: "Tu selección",
    emptyCart: "Todavía no has añadido nada.",
    cartCard: "Tarjeta personalizada",
    checkout: "Ver resumen",
    cookie: "Usamos cookies para mejorar tu experiencia. Puedes elegir cuáles aceptar.",
    cookieAccept: "Aceptar todas",
    cookieReject: "Solo necesarias",
    cookieSettings: "Configurar",
  },
  pt: {
    nav: ["Designs", "Como funciona", "Extras", "Ajuda"],
    announcement: "Envio grátis em pedidos de 35€ ou mais · Entregamos em Espanha e Portugal",
    heroKicker: "CARTÕES COM UM POUCO MAIS DE CORAÇÃO",
    heroTitle: <>Pequenos gestos.<br /><span>Momentos</span> para recordar.</>,
    heroBody: "Cria um cartão único com as tuas fotografias, as tuas palavras e aquele toque que só tu sabes dar. Nós imprimimos e entregamos à porta.",
    create: "Criar o meu cartão",
    explore: "Ver designs",
    trust: "Criado por ti · Entregue com carinho",
    stepsKicker: "É TÃO FÁCIL",
    stepsTitle: "A tua ideia, em três pequenos passos",
    steps: [["01", "Escolhe um design", "Encontra um modelo que combine com essa pessoa especial."], ["02", "Torna-o teu", "Adiciona fotografias, palavras e emojis. Dá asas à criatividade."], ["03", "Nós entregamos", "Imprimimos com carinho e enviamos para Espanha ou Portugal."]],
    benefitsKicker: "PORQUÊ CELEBRA MOMENTOS",
    benefitsTitle: "Bonito por fora. Especial por dentro.",
    benefits: [["01", "Feito para ti", "Cada cartão nasce da tua fotografia, das tuas palavras e da tua forma de celebrar."], ["02", "Qualidade que se sente", "Papel premium, impressão cuidada e detalhes que dá gosto guardar."], ["03", "Sempre a tempo", "Envios claros para Espanha e Portugal, com opções para quando importa."]],
    templatesKicker: "PARA CADA MOMENTO",
    templatesTitle: "Designs que começam uma conversa",
    templatesBody: "Escolhe uma base bonita. A mensagem importante é tua.",
    customize: "Personalizar design",
    from: "Desde",
    extrasKicker: "UM POUCO MAIS DE MAGIA",
    extrasTitle: "Completa o momento",
    extrasBody: "Adiciona um detalhe pequeno que diga: pensei em ti.",
    sticker: "Stickers personalizados",
    stickerBody: "A tua fotografia favorita, transformada num pequeno círculo de alegria.",
    chocolate: "Chocolates artesanais",
    chocolateBody: "Uma surpresa doce para acompanhar as tuas palavras.",
    add: "Adicionar",
    reviewsKicker: "FEITO PARA EMOCIONAR",
    reviewsTitle: "O que dizem quem já experimentou",
    deliveryKicker: "CHEGA QUANDO IMPORTA",
    deliveryTitle: "Um cartão pensado para ficar",
    deliveryBody: "Impressão cuidada, papel com textura e um envio fácil de seguir. Porque o momento começa quando o encontras na caixa do correio.",
    deliveryPoints: ["Papel premium de 300 g", "Envios para Espanha e Portugal", "Acompanhamento em cada pedido"],
    finalKicker: "A QUEM VAMOS DEDICAR UM MOMENTO?",
    finalTitle: "O que é bonito não tem de esperar",
    finalBody: "Começa com uma fotografia. Termina com um sorriso.",
    footer: "Cartões que transformam um dia normal num momento para recordar.",
    footerLinks: ["Privacidade", "Cookies", "Termos", "Contacto"],
    editorKicker: "O TEU CARTÃO, A TUA HISTÓRIA",
    editorTitle: "Personaliza o teu design",
    editorBody: "Torna-o teu em poucos minutos. Podes mudar tudo antes de encomendar.",
    message: "A tua mensagem",
    photo: "A tua fotografia",
    upload: "Carregar fotografia",
    uploadHint: "JPG ou PNG · até 10 MB",
    emoji: "Adiciona um emoji",
    size: "Tamanho",
    a4: "A4 · 21 × 29,7 cm",
    a3: "A3 · 29,7 × 42 cm",
    preview: "Pré-visualização",
    continue: "Continuar com extras",
    reset: "Recomeçar",
    cart: "A tua seleção",
    emptyCart: "Ainda não adicionaste nada.",
    cartCard: "Cartão personalizado",
    checkout: "Ver resumo",
    cookie: "Usamos cookies para melhorar a tua experiência. Podes escolher quais aceitar.",
    cookieAccept: "Aceitar todas",
    cookieReject: "Só necessárias",
    cookieSettings: "Configurar",
  },
} as const;

const templates: Template[] = [
  { id: "confetti", name: "Confeti de alegría", eyebrow: "CUMPLEAÑOS", description: "Para celebrar a lo grande, aunque sea con un pequeño detalle.", image: "/images/romantic-red.jpg", tone: "#fff3ee", price: "desde 8,90 €" },
  { id: "floral", name: "Flores para ti", eyebrow: "GRACIAS", description: "Un rincón bonito para decir todo eso que a veces cuesta.", image: "/images/floral.jpg", tone: "#f7f4ed", price: "desde 8,90 €" },
  { id: "frame", name: "Siempre contigo", eyebrow: "MOMENTOS", description: "Una foto, unas palabras y un recuerdo que dura mucho más.", image: "/images/frame.jpg", tone: "#f8f1e7", price: "desde 8,90 €" },
];

const reviews = [
  ["María G.", "La tarjeta llegó perfecta y la sorpresa fue enorme. Se nota el cariño en cada detalle.", "Cumpleaños"],
  ["João P.", "Muito fácil de personalizar e o resultado ficou lindo. Voltarei a encomendar.", "Aniversário"],
  ["Lucía R.", "Por fin una forma bonita de enviar una foto que no se quede perdida en el móvil.", "Amistad"],
  ["Ana S.", "El papel es precioso y el envío llegó justo cuando lo necesitaba. Un 10.", "Gracias"],
];

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    arrow: <><path d="M4 12h15" /><path d="m13 6 6 6-6 6" /></>,
    bag: <><path d="M5 8h14l1 12H4L5 8Z" /><path d="M8 8a4 4 0 0 1 8 0" /></>,
    heart: <path d="M20.8 8.7c0 5.5-8.8 10.3-8.8 10.3S3.2 14.2 3.2 8.7A4.7 4.7 0 0 1 12 6.3a4.7 4.7 0 0 1 8.8 2.4Z" />,
    check: <path d="m5 12 4 4L19 6" />,
    plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
    close: <><path d="m6 6 12 12" /><path d="m18 6-12 12" /></>,
    spark: <><path d="m12 3-1.4 5.6L5 10l5.6 1.4L12 17l1.4-5.6L19 10l-5.6-1.4L12 3Z" /><path d="m19 16-.7 2.3L16 19l2.3.7L19 22l.7-2.3L22 19l-2.3-.7L19 16Z" /></>,
    truck: <><path d="M3 6h11v10H3z" /><path d="M14 10h4l3 3v3h-7z" /><circle cx="7" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    menu: <><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export default function Home() {
  const [language, setLanguage] = useState<Language>("es");
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0]);
  const [message, setMessage] = useState("Feliz vuelta al sol, Ana ✨");
  const [emoji, setEmoji] = useState("✨");
  const [size, setSize] = useState<"A4" | "A3">("A4");
  const [photo, setPhoto] = useState<string | null>(null);
  const [sticker, setSticker] = useState(0);
  const [chocolate, setChocolate] = useState(0);
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [cookieOpen, setCookieOpen] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const t = copy[language];
  const total = useMemo(() => 8.9 + (sticker ? sticker === 1 ? 1.5 : sticker === 2 ? 2.7 : 3 : 0) + chocolate * 5.9, [sticker, chocolate]);

  const chooseTemplate = (template: Template) => {
    setSelectedTemplate(template);
    document.getElementById("customizer")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handlePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(String(reader.result));
    reader.readAsDataURL(file);
  };

  const reset = () => { setMessage("Feliz vuelta al sol, Ana ✨"); setEmoji("✨"); setPhoto(null); setSize("A4"); };

  return (
    <main>
      <div className="bg-[#182443] px-4 py-2 text-center text-[11px] font-bold tracking-[.08em] text-white/90">{t.announcement}</div>
      <header className="sticky top-0 z-30 border-b border-[#ebdfd6]/80 bg-[#fffaf5]/90 backdrop-blur-md">
        <div className="container flex h-[76px] items-center justify-between gap-6">
          <a href="#top" className="flex items-center gap-3" aria-label="Celebra Momentos, inicio"><img src="/images/logo.png" alt="Celebra Momentos" className="h-12 w-12 object-contain" /><span className="hidden text-[15px] font-black tracking-[-.03em] sm:block">Celebra<br /><span className="text-[#ee5264]">Momentos</span></span></a>
          <nav className="hidden items-center gap-8 text-[13px] font-bold text-[#59627b] lg:flex">{t.nav.map((item, index) => <a key={item} href={index === 0 ? "#templates" : index === 1 ? "#how" : index === 2 ? "#extras" : "#footer"} className="transition-colors hover:text-[#ee5264]">{item}</a>)}</nav>
          <div className="flex items-center gap-2">
            <div className="hidden rounded-full border border-[#dfd3cc] bg-white p-1 text-[11px] font-black sm:flex"><button onClick={() => setLanguage("es")} className={`rounded-full px-3 py-1.5 ${language === "es" ? "bg-[#182443] text-white" : "text-[#7b8193]"}`}>ES</button><button onClick={() => setLanguage("pt")} className={`rounded-full px-3 py-1.5 ${language === "pt" ? "bg-[#182443] text-white" : "text-[#7b8193]"}`}>PT</button></div>
            <button onClick={() => setCartOpen(true)} className="focus-ring relative flex h-10 items-center gap-2 rounded-full border border-[#dfd3cc] bg-white px-3 text-[12px] font-bold text-[#182443] transition hover:border-[#ee5264]" aria-label="Abrir selección"><Icon name="bag" size={18} /><span className="hidden md:inline">{language === "es" ? "Mi selección" : "A minha seleção"}</span>{(sticker || chocolate) > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ee5264] px-1 text-[10px] text-white">{1 + (sticker > 0 ? 1 : 0) + (chocolate > 0 ? chocolate : 0)}</span>}</button>
            <button onClick={() => setMobileMenu(!mobileMenu)} className="focus-ring flex h-10 w-10 items-center justify-center rounded-full border border-[#dfd3cc] bg-white lg:hidden" aria-label="Abrir menú"><Icon name="menu" size={18} /></button>
          </div>
        </div>
        {mobileMenu && <div className="border-t border-[#ebdfd6] bg-white px-5 py-4 lg:hidden"><nav className="container flex flex-col gap-4 text-sm font-bold text-[#59627b]">{t.nav.map((item, index) => <a key={item} href={index === 0 ? "#templates" : index === 1 ? "#how" : index === 2 ? "#extras" : "#footer"} onClick={() => setMobileMenu(false)}>{item}</a>)}<div className="flex gap-2 pt-1"><button onClick={() => setLanguage("es")} className={`rounded-full border px-3 py-1 text-xs ${language === "es" ? "border-[#182443] bg-[#182443] text-white" : "border-[#dfd3cc]"}`}>Español</button><button onClick={() => setLanguage("pt")} className={`rounded-full border px-3 py-1 text-xs ${language === "pt" ? "border-[#182443] bg-[#182443] text-white" : "border-[#dfd3cc]"}`}>Português</button></div></nav></div>}
      </header>

      <section id="top" className="relative overflow-hidden border-b border-[#ebdfd6] bg-[#fffaf5]">
        <div className="absolute -right-20 top-10 h-72 w-72 rounded-full bg-[#f8c75e]/20 blur-3xl" /><div className="absolute -left-20 bottom-0 h-60 w-60 rounded-full bg-[#ee5264]/10 blur-3xl" />
        <div className="container grid items-center gap-14 py-16 md:py-24 lg:grid-cols-[.9fr_1.1fr] lg:gap-20 lg:py-24">
          <div className="relative z-10 max-w-[570px]">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#e8c7bd] bg-[#fff0e8] px-3.5 py-2 text-[10px] font-black tracking-[.13em] text-[#d83d54]"><span className="h-1.5 w-1.5 rounded-full bg-[#ee5264]" />{t.heroKicker}</div>
            <h1 className="serif text-[49px] font-bold leading-[.98] tracking-[-.05em] text-[#182443] sm:text-[65px] lg:text-[74px]">{t.heroTitle}</h1>
            <p className="mt-7 max-w-[500px] text-[16px] leading-7 text-[#68718a]">{t.heroBody}</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row"><a href="/customize" className="focus-ring inline-flex items-center justify-center gap-3 rounded-full bg-[#ee5264] px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-[#ee5264]/20 transition hover:-translate-y-0.5 hover:bg-[#d83d54]">{t.create}<Icon name="arrow" size={17} /></a><a href="#templates" className="focus-ring inline-flex items-center justify-center rounded-full border border-[#d9cbc4] bg-white px-6 py-3.5 text-sm font-black text-[#182443] transition hover:border-[#ee5264]">{t.explore}</a></div>
            <div className="mt-7 flex items-center gap-3 text-xs font-bold text-[#7c8191]"><div className="flex -space-x-2"><span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#fffaf5] bg-[#f3b6a8] text-xs">M</span><span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#fffaf5] bg-[#f5d47a] text-xs">J</span><span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#fffaf5] bg-[#b8d9ce] text-xs">A</span></div>{t.trust}</div>
          </div>
          <div className="relative mx-auto w-full max-w-[570px]">
            <div className="absolute -left-2 top-12 z-10 hidden rounded-2xl bg-white px-4 py-3 card-shadow sm:block float"><p className="text-[10px] font-black uppercase tracking-wider text-[#ee5264]">Tu foto + tus palabras</p><p className="mt-1 text-sm font-bold text-[#182443]">= un momento único</p></div>
            <div className="relative aspect-[1.1/1] rotate-2 rounded-[28px] bg-[#f6d9cc] p-3 shadow-2xl shadow-[#8a564c]/20 sm:p-5"><div className="relative h-full overflow-hidden rounded-[20px] bg-[#fff]"><img src="/images/confetti.jpg" alt="Fondo de tarjeta con confeti" className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 bg-white/55" /><div className="absolute inset-5 flex flex-col justify-between rounded-[14px] border border-white/80 bg-white/60 p-5 backdrop-blur-[2px] sm:inset-8 sm:p-8"><div className="flex items-center justify-between"><span className="rounded-full bg-[#182443] px-3 py-1.5 text-[9px] font-black tracking-[.15em] text-white">PARA ANA</span><span className="text-xl">✨</span></div><div><p className="serif text-[35px] font-bold leading-[.96] text-[#182443] sm:text-[52px]">Feliz<br /><span className="text-[#ee5264]">vuelta</span><br />al sol</p><p className="mt-4 max-w-[180px] text-[11px] font-bold leading-4 text-[#59627b] sm:text-[13px]">Porque los mejores días merecen algo más que un mensaje.</p></div><div className="flex items-end justify-between"><span className="serif text-lg italic text-[#ee5264]">Con cariño, Marta</span><Icon name="heart" size={28} /></div></div></div></div>
            <div className="absolute -bottom-4 -right-2 rounded-2xl bg-[#182443] px-4 py-3 text-white card-shadow sm:-right-7"><div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f8c75e] text-[#182443]"><Icon name="truck" size={15} /></span><div><p className="text-[10px] font-black uppercase tracking-wider text-white/60">Entrega con cariño</p><p className="text-sm font-bold">España + Portugal</p></div></div></div>
          </div>
        </div>
      </section>

      <section id="how" className="bg-white py-20 md:py-24"><div className="container"><div className="mx-auto max-w-[600px] text-center"><p className="text-[10px] font-black tracking-[.2em] text-[#ee5264]">{t.stepsKicker}</p><h2 className="serif mt-3 text-4xl font-bold tracking-[-.04em] sm:text-5xl">{t.stepsTitle}</h2></div><div className="mt-14 grid gap-9 md:grid-cols-3">{t.steps.map(([number, title, body], index) => <div key={number} className="relative text-center md:text-left"><span className={`mb-5 flex h-11 w-11 items-center justify-center rounded-full text-sm font-black ${index === 1 ? "bg-[#f8c75e] text-[#182443]" : "bg-[#fff0e8] text-[#ee5264]"}`}>{number}</span><h3 className="text-lg font-black">{title}</h3><p className="mt-2 max-w-[280px] text-sm leading-6 text-[#737b90]">{body}</p>{index < 2 && <span className="absolute right-5 top-5 hidden text-2xl text-[#e5d8d0] md:block">→</span>}</div>)}</div></div></section>

      <section className="bg-white py-16 md:py-20"><div className="container"><div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="text-[10px] font-black tracking-[.2em] text-[#ee5264]">{t.benefitsKicker}</p><h2 className="serif mt-3 max-w-[570px] text-4xl font-bold tracking-[-.04em] sm:text-5xl">{t.benefitsTitle}</h2></div><span className="hidden text-5xl text-[#f8c75e] md:block">✦</span></div><div className="mt-11 grid gap-4 md:grid-cols-3">{t.benefits.map(([number, title, body], index) => <article key={number} className="rounded-[22px] border border-[#eadbd3] bg-[#fffaf5] p-6 transition hover:-translate-y-1 hover:shadow-lg"><span className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-black ${index === 1 ? "bg-[#f8c75e] text-[#182443]" : "bg-[#fff0e8] text-[#ee5264]"}`}>{number}</span><h3 className="mt-5 text-lg font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-[#737b90]">{body}</p></article>)}</div></div></section><section id="templates" className="border-y border-[#ebdfd6] bg-[#fff7f1] py-20 md:py-24"><div className="container"><div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="text-[10px] font-black tracking-[.2em] text-[#ee5264]">{t.templatesKicker}</p><h2 className="serif mt-3 text-4xl font-bold tracking-[-.04em] sm:text-5xl">{t.templatesTitle}</h2></div><p className="max-w-[300px] text-sm leading-6 text-[#737b90]">{t.templatesBody}</p></div><div className="mt-12 grid gap-5 md:grid-cols-3">{templates.map((template) => <article key={template.id} className="group rounded-[22px] border border-[#eadbd3] bg-white p-3 transition duration-300 hover:-translate-y-1 hover:border-[#e9aaa0] hover:shadow-xl hover:shadow-[#8a564c]/10"><div className="relative aspect-[1.12/1] overflow-hidden rounded-[16px]" style={{ backgroundColor: template.tone }}><img src={template.image} alt={template.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /><div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-[9px] font-black tracking-[.14em] text-[#182443]">{template.eyebrow}</div><button onClick={() => chooseTemplate(template)} className="focus-ring absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#ee5264] text-white opacity-0 shadow-lg transition group-hover:opacity-100" aria-label={`${t.customize}: ${template.name}`}><Icon name="arrow" size={17} /></button></div><div className="px-2 pb-2 pt-5"><div className="flex items-start justify-between gap-2"><h3 className="text-[17px] font-black">{template.name}</h3><span className="whitespace-nowrap text-xs font-bold text-[#ee5264]">{template.price}</span></div><p className="mt-2 min-h-[48px] text-sm leading-6 text-[#737b90]">{language === "es" ? template.description : template.id === "confetti" ? "Para celebrar em grande, mesmo com um pequeno gesto." : template.id === "floral" ? "Um cantinho bonito para dizer tudo o que às vezes custa." : "Uma fotografia, algumas palavras e uma recordação que dura."}</p><button onClick={() => chooseTemplate(template)} className="focus-ring mt-4 flex items-center gap-2 text-sm font-black text-[#182443] transition group-hover:text-[#ee5264]">{t.customize}<Icon name="arrow" size={15} /></button></div></article>)}</div></div></section>

      <section id="customizer" className="bg-white py-20 md:py-28"><div className="container"><div className="mb-12 max-w-[600px]"><p className="text-[10px] font-black tracking-[.2em] text-[#ee5264]">{t.editorKicker}</p><h2 className="serif mt-3 text-4xl font-bold tracking-[-.04em] sm:text-5xl">{t.editorTitle}</h2><p className="mt-4 text-sm leading-6 text-[#737b90]">{t.editorBody}</p></div><div className="grid gap-8 lg:grid-cols-[.78fr_1.22fr] lg:items-start">
          <div className="order-2 rounded-[24px] border border-[#eadfd8] bg-[#fffaf5] p-5 sm:p-7 lg:order-1"><div className="flex items-center justify-between border-b border-[#eadfd8] pb-5"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#ee5264]">{selectedTemplate.eyebrow}</p><h3 className="mt-1 font-black">{selectedTemplate.name}</h3></div><button onClick={reset} className="text-xs font-bold text-[#7c8191] underline underline-offset-4 hover:text-[#ee5264]">{t.reset}</button></div><label className="mt-6 block text-sm font-black">{t.message}<textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} className="focus-ring mt-2 w-full resize-none rounded-2xl border border-[#dfd3cc] bg-white p-3 text-sm leading-6 text-[#182443] placeholder:text-[#adb1bd]" /></label><div className="mt-5"><p className="text-sm font-black">{t.emoji}</p><div className="mt-2 flex gap-2">{["✨", "❤️", "🎉", "🌷", "😊"].map((item) => <button key={item} onClick={() => { setEmoji(item); setMessage((value) => value.replace(/[✨❤️🎉🌷😊]$/, "") + item); }} className={`focus-ring flex h-10 w-10 items-center justify-center rounded-xl border text-lg transition ${emoji === item ? "border-[#ee5264] bg-[#fff0e8]" : "border-[#dfd3cc] bg-white hover:border-[#ee5264]"}`}>{item}</button>)}</div></div><div className="mt-6"><p className="text-sm font-black">{t.photo}</p><button onClick={() => fileRef.current?.click()} className="focus-ring mt-2 flex w-full items-center gap-3 rounded-2xl border border-dashed border-[#e7a59c] bg-white p-3 text-left transition hover:bg-[#fff0e8]"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff0e8] text-[#ee5264]"><Icon name="plus" size={18} /></span><span><span className="block text-sm font-black">{t.upload}</span><span className="mt-0.5 block text-xs text-[#7c8191]">{t.uploadHint}</span></span></button><input ref={fileRef} onChange={handlePhoto} type="file" accept="image/png,image/jpeg" className="hidden" /></div><div className="mt-6"><p className="text-sm font-black">{t.size}</p><div className="mt-2 grid grid-cols-2 gap-2">{(["A4", "A3"] as const).map((option) => <button key={option} onClick={() => setSize(option)} className={`focus-ring rounded-2xl border p-3 text-left transition ${size === option ? "border-[#ee5264] bg-[#fff0e8]" : "border-[#dfd3cc] bg-white hover:border-[#ee5264]"}`}><span className="block text-sm font-black">{option}</span><span className="mt-1 block text-[11px] text-[#7c8191]">{option === "A4" ? t.a4 : t.a3}</span></button>)}</div></div></div>
          <div className="order-1 rounded-[26px] bg-[#f8efe8] p-5 sm:p-10 lg:order-2"><div className="mb-5 flex items-center justify-between"><span className="text-[10px] font-black uppercase tracking-[.18em] text-[#7b7180]">{t.preview}</span><span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-[#182443]">{size} · {selectedTemplate.eyebrow}</span></div><div className="mx-auto max-w-[640px] rounded-[18px] bg-white p-3 shadow-xl shadow-[#8a564c]/10 sm:p-5"><div className={`relative overflow-hidden rounded-[10px] bg-[#fff0e8] ${size === "A3" ? "aspect-[.78/1]" : "aspect-[.82/1]"}`}><img src={photo || selectedTemplate.image} alt="Vista previa de tu tarjeta" className={`absolute inset-0 h-full w-full ${photo ? "object-cover" : "object-cover"} opacity-60`} /><div className="absolute inset-0 bg-white/50" /><div className="absolute inset-[8%] flex flex-col justify-between rounded-[8px] border border-white/90 bg-white/60 p-[7%] backdrop-blur-[1px]"><div className="flex justify-between"><span className="rounded-full bg-[#182443] px-3 py-1.5 text-[9px] font-black tracking-[.12em] text-white">PARA ALGUIEN ESPECIAL</span><span className="text-xl">{emoji}</span></div><div><p className="serif max-w-[460px] whitespace-pre-line break-words text-[clamp(28px,5vw,58px)] font-bold leading-[.98] tracking-[-.05em] text-[#182443]">{message || "Tu mensaje aquí"}</p><div className="mt-5 h-1 w-16 rounded-full bg-[#ee5264]" /></div><div className="flex items-end justify-between"><span className="serif text-[clamp(13px,2vw,18px)] italic text-[#ee5264]">Con todo mi cariño</span><Icon name="heart" size={28} /></div></div></div></div><button onClick={() => setCartOpen(true)} className="focus-ring mt-6 flex w-full items-center justify-center gap-3 rounded-full bg-[#ee5264] px-5 py-3.5 text-sm font-black text-white transition hover:bg-[#d83d54]">{t.continue}<Icon name="arrow" size={17} /></button></div>
        </div></div></section>

      <section id="extras" className="border-y border-[#ebdfd6] bg-[#fff7f1] py-20 md:py-24"><div className="container"><div className="mx-auto max-w-[620px] text-center"><p className="text-[10px] font-black tracking-[.2em] text-[#ee5264]">{t.extrasKicker}</p><h2 className="serif mt-3 text-4xl font-bold tracking-[-.04em] sm:text-5xl">{t.extrasTitle}</h2><p className="mt-4 text-sm leading-6 text-[#737b90]">{t.extrasBody}</p></div><div className="mt-12 grid gap-5 md:grid-cols-2"><div className="group grid overflow-hidden rounded-[24px] border border-[#eadbd3] bg-white sm:grid-cols-[.92fr_1.08fr]"><div className="relative min-h-[230px] overflow-hidden bg-[#f5ede3]"><img src="/images/sticker-dog.jpg" alt="Sticker personalizado con fotografía" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /><span className="absolute left-4 top-4 rounded-full bg-white px-3 py-1.5 text-[10px] font-black tracking-[.12em] text-[#182443]">7,62 cm · CÍRCULO</span></div><div className="flex flex-col justify-center p-6 sm:p-8"><span className="text-[10px] font-black tracking-[.18em] text-[#ee5264]">01 · EXTRA</span><h3 className="mt-2 text-xl font-black">{t.sticker}</h3><p className="mt-3 text-sm leading-6 text-[#737b90]">{t.stickerBody}</p><div className="mt-5 flex items-center justify-between"><span className="text-sm font-black">desde 1,50 €</span><button onClick={() => { setSticker(sticker ? 0 : 1); setCartOpen(true); }} className="focus-ring rounded-full bg-[#182443] px-4 py-2.5 text-xs font-black text-white transition hover:bg-[#ee5264]">{sticker ? "Añadido ✓" : t.add}</button></div></div></div><div className="group grid overflow-hidden rounded-[24px] border border-[#eadbd3] bg-white sm:grid-cols-[.92fr_1.08fr]"><div className="relative min-h-[230px] overflow-hidden bg-[#fbefda]"><img src="/images/chocolate-small.jpg" alt="Caja de chocolates artesanos" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /><span className="absolute left-4 top-4 rounded-full bg-white px-3 py-1.5 text-[10px] font-black tracking-[.12em] text-[#182443]">AÑADE UN CAPRICHO</span></div><div className="flex flex-col justify-center p-6 sm:p-8"><span className="text-[10px] font-black tracking-[.18em] text-[#ee5264]">02 · EXTRA</span><h3 className="mt-2 text-xl font-black">{t.chocolate}</h3><p className="mt-3 text-sm leading-6 text-[#737b90]">{t.chocolateBody}</p><div className="mt-5 flex items-center justify-between"><span className="text-sm font-black">desde 5,90 €</span><button onClick={() => { setChocolate(chocolate ? 0 : 1); setCartOpen(true); }} className="focus-ring rounded-full bg-[#182443] px-4 py-2.5 text-xs font-black text-white transition hover:bg-[#ee5264]">{chocolate ? "Añadido ✓" : t.add}</button></div></div></div></div></div></section>

      <section className="overflow-hidden bg-[#182443] py-20 text-white md:py-24"><div className="container"><div className="mb-12 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-[10px] font-black tracking-[.2em] text-[#f8c75e]">{t.reviewsKicker}</p><h2 className="serif mt-3 max-w-[650px] text-4xl font-bold tracking-[-.04em] sm:text-5xl">{t.reviewsTitle}</h2></div><div className="flex flex-col gap-1 text-sm font-bold text-white/70"><span><span className="text-[#f8c75e]">★★★★★</span> 4,9/5 en Google</span><span className="text-[10px] font-normal text-white/45">Google Reviews · demo data · live source ready</span></div></div></div><div className="overflow-hidden"><div className="marquee flex gap-4 px-5">{[...reviews, ...reviews].map(([name, text, tag], index) => <article key={`${name}-${index}`} className="w-[290px] flex-none rounded-[20px] border border-white/10 bg-white/[.07] p-5 sm:w-[340px]"><div className="flex items-center justify-between"><span className="text-sm font-black">{name}</span><span className="text-xs tracking-widest text-[#f8c75e]">★★★★★</span></div><p className="mt-5 min-h-[72px] text-sm leading-6 text-white/75">“{text}”</p><span className="mt-5 inline-block rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.12em] text-white/55">{tag}</span></article>)}</div></div></section>

      <section className="bg-[#fffaf5] py-20 md:py-28"><div className="container grid items-center gap-12 md:grid-cols-[.95fr_1.05fr] md:gap-20"><div className="relative mx-auto max-w-[410px]"><div className="absolute -inset-3 rotate-[-3deg] rounded-[25px] border border-[#eec7b9]" /><div className="relative aspect-[1.05/1] overflow-hidden rounded-[20px] bg-white p-3 shadow-xl"><div className="relative h-full overflow-hidden rounded-[14px]"><img src="/images/floral.jpg" alt="Tarjeta floral" className="h-full w-full object-cover" /><div className="absolute inset-0 bg-white/45" /><div className="absolute inset-6 flex flex-col justify-end"><span className="serif text-3xl font-bold text-[#182443]">Gracias por<br /><span className="text-[#ee5264]">estar siempre.</span></span></div></div></div></div><div><p className="text-[10px] font-black tracking-[.2em] text-[#ee5264]">{t.deliveryKicker}</p><h2 className="serif mt-3 text-4xl font-bold leading-tight tracking-[-.04em] sm:text-5xl">{t.deliveryTitle}</h2><p className="mt-5 max-w-[470px] text-sm leading-7 text-[#737b90]">{t.deliveryBody}</p><div className="mt-7 grid gap-4">{t.deliveryPoints.map((point, index) => <div key={point} className="flex items-center gap-3 text-sm font-bold"><span className={`flex h-7 w-7 items-center justify-center rounded-full ${index === 1 ? "bg-[#f8c75e]" : "bg-[#fff0e8] text-[#ee5264]"}`}><Icon name="check" size={15} /></span>{point}</div>)}</div></div></div></section>

      <section className="px-4 pb-20"><div className="mx-auto max-w-[1160px] overflow-hidden rounded-[28px] bg-[#f8c75e] px-7 py-14 text-center sm:px-10 md:py-20"><p className="text-[10px] font-black tracking-[.2em] text-[#806723]">{t.finalKicker}</p><h2 className="serif mx-auto mt-3 max-w-[660px] text-4xl font-bold tracking-[-.04em] text-[#182443] sm:text-6xl">{t.finalTitle}</h2><p className="mt-5 text-sm font-bold text-[#63552a]">{t.finalBody}</p><a href="/customize" className="focus-ring mt-8 inline-flex items-center gap-3 rounded-full bg-[#182443] px-6 py-3.5 text-sm font-black text-white transition hover:bg-[#ee5264]">{t.create}<Icon name="arrow" size={17} /></a></div></section>

      <footer id="footer" className="border-t border-[#ebdfd6] bg-white py-12"><div className="container grid gap-10 md:grid-cols-[1.5fr_1fr_1fr] md:gap-20"><div><div className="flex items-center gap-3"><img src="/images/logo.png" alt="Celebra Momentos" className="h-12 w-12 object-contain" /><span className="text-[15px] font-black tracking-[-.03em]">Celebra<br /><span className="text-[#ee5264]">Momentos</span></span></div><p className="mt-5 max-w-[300px] text-sm leading-6 text-[#737b90]">{t.footer}</p></div><div><p className="text-xs font-black uppercase tracking-[.15em] text-[#182443]">{language === "es" ? "Explora" : "Explora"}</p><div className="mt-5 flex flex-col gap-3 text-sm text-[#737b90]"><a href="#templates" className="hover:text-[#ee5264]">{t.nav[0]}</a><a href="#how" className="hover:text-[#ee5264]">{t.nav[1]}</a><a href="#extras" className="hover:text-[#ee5264]">{t.nav[2]}</a></div></div><div><p className="text-xs font-black uppercase tracking-[.15em] text-[#182443]">{language === "es" ? "Información" : "Informação"}</p><div className="mt-5 flex flex-col gap-3 text-sm text-[#737b90]">{t.footerLinks.map((link) => <a key={link} href="#footer" className="hover:text-[#ee5264]">{link}</a>)}</div></div></div><div className="container mt-10 flex flex-col gap-3 border-t border-[#ebdfd6] pt-5 text-xs text-[#9297a4] sm:flex-row sm:items-center sm:justify-between"><span>© 2026 Celebra Momentos</span><span className="flex items-center gap-2"><Icon name="lock" size={13} /> Compra sencilla · Atención humana</span></div></footer>

      {cookieOpen && <div className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-[760px] rounded-[18px] border border-[#eadbd3] bg-white p-4 shadow-2xl shadow-[#182443]/15 sm:bottom-6 sm:flex sm:items-center sm:gap-5"><p className="flex-1 text-xs leading-5 text-[#66708a]">{t.cookie}</p><div className="mt-3 flex flex-wrap gap-2 sm:mt-0"><button onClick={() => setCookieOpen(false)} className="focus-ring rounded-full bg-[#182443] px-3.5 py-2 text-[11px] font-black text-white">{t.cookieAccept}</button><button onClick={() => setCookieOpen(false)} className="focus-ring rounded-full border border-[#dfd3cc] px-3.5 py-2 text-[11px] font-black text-[#182443]">{t.cookieReject}</button><button onClick={() => setCookieOpen(false)} className="px-2 py-2 text-[11px] font-bold text-[#737b90] underline underline-offset-2">{t.cookieSettings}</button></div></div>}

      {cartOpen && <div className="fixed inset-0 z-50"><button aria-label="Cerrar selección" onClick={() => setCartOpen(false)} className="absolute inset-0 bg-[#182443]/30 backdrop-blur-[2px]" /><aside className="absolute bottom-0 right-0 top-0 flex w-full max-w-[450px] flex-col bg-[#fffaf5] shadow-2xl"><div className="flex items-center justify-between border-b border-[#ebdfd6] px-6 py-5"><div><p className="text-[10px] font-black uppercase tracking-[.17em] text-[#ee5264]">{t.cart}</p><h2 className="mt-1 text-xl font-black">{selectedTemplate.name}</h2></div><button onClick={() => setCartOpen(false)} className="focus-ring flex h-9 w-9 items-center justify-center rounded-full border border-[#dfd3cc] bg-white" aria-label="Cerrar"><Icon name="close" size={17} /></button></div><div className="flex-1 overflow-y-auto p-6"><div className="flex gap-4 rounded-2xl border border-[#eadbd3] bg-white p-3"><img src={photo || selectedTemplate.image} alt="Tu tarjeta" className="h-24 w-20 rounded-xl object-cover" /><div><p className="text-sm font-black">{t.cartCard}</p><p className="mt-1 text-xs text-[#737b90]">{size} · {selectedTemplate.eyebrow}</p><p className="mt-3 text-sm font-black">8,90 €</p></div></div><div className="mt-5 space-y-3">{sticker > 0 && <div className="flex items-center justify-between rounded-2xl border border-[#eadbd3] bg-white p-4 text-sm"><span><span className="block font-black">Sticker personalizado</span><span className="text-xs text-[#737b90]">{sticker} unidad{sticker > 1 ? "es" : ""}</span></span><span className="font-black">{sticker === 1 ? "1,50" : sticker === 2 ? "2,70" : "3,00"} €</span></div>}{chocolate > 0 && <div className="flex items-center justify-between rounded-2xl border border-[#eadbd3] bg-white p-4 text-sm"><span><span className="block font-black">Chocolate artesanal</span><span className="text-xs text-[#737b90]">{chocolate} caja</span></span><span className="font-black">{(chocolate * 5.9).toFixed(2).replace(".", ",")} €</span></div>}</div><div className="mt-8 rounded-2xl bg-[#182443] p-5 text-white"><div className="flex justify-between text-sm text-white/70"><span>Subtotal</span><span>{total.toFixed(2).replace(".", ",")} €</span></div><div className="mt-3 flex justify-between text-sm text-white/70"><span>Envío estándar</span><span className="text-[#f8c75e]">Gratis</span></div><div className="mt-5 flex justify-between border-t border-white/10 pt-4 text-lg font-black"><span>Total</span><span>{total.toFixed(2).replace(".", ",")} €</span></div></div></div><div className="border-t border-[#ebdfd6] bg-white p-6"><button onClick={() => setCartOpen(false)} className="focus-ring flex w-full items-center justify-center gap-3 rounded-full bg-[#ee5264] px-5 py-3.5 text-sm font-black text-white transition hover:bg-[#d83d54]">{t.checkout}<Icon name="arrow" size={17} /></button><p className="mt-3 flex justify-center items-center gap-1.5 text-center text-[11px] text-[#8a8f9e]"><Icon name="lock" size={12} /> {language === "es" ? "Pago seguro · sin compromiso" : "Pagamento seguro · sem compromisso"}</p></div></aside></div>}
    </main>
  );
}
