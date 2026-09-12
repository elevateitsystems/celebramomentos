"use client";

import Link from "next/link";
import { useSelector } from "react-redux";
import { Icon } from "@/components/icons";
import { SiteFooter, SiteHeader } from "@/components/site";
import { RootState } from "@/lib/store";

type Category = { name: string; description: string; href: string; image: string; label: string; accent: string };

const reviews = [
  { quote: "La tarjeta llegó preciosa y personalizarla fue facilísimo.", name: "María G.", detail: "Tarjeta de cumpleaños" },
  { quote: "O calendário ficou ainda mais bonito do que imaginávamos.", name: "João P.", detail: "Calendário A4" },
  { quote: "Convertimos nuestras fotos favoritas en un rincón muy nuestro.", name: "Lucía R.", detail: "Galería de pared" },
];

export default function Home() {
  const language = useSelector((state: RootState) => state.language.language);
  const es = language === "es";
  const categories: Category[] = [
    { name: es ? "Tarjetas" : "Cartões", description: es ? "Fotos, palabras y emojis para cada ocasión." : "Fotografias, palavras e emojis para cada ocasião.", href: "/templates", image: "/images/balloon-frame.png", label: "Desde 8,90 €", accent: "bg-[#ffe4de]" },
    { name: es ? "Calendarios" : "Calendários", description: es ? "A4 o A5, siempre con tus mejores recuerdos." : "A4 ou A5, sempre com as tuas melhores memórias.", href: "/calendars", image: "/images/calendar-product.png", label: es ? "A4 · A5 · Con fechas" : "A4 · A5 · Com datas", accent: "bg-[#fff1c7]" },
    { name: es ? "Arte de pared" : "Arte de parede", description: es ? "Una selección cuidada para dar vida a tu casa." : "Uma seleção cuidada para dar vida à tua casa.", href: "/wall-art", image: "/images/wall-art-product.png", label: es ? "Productos seleccionados" : "Produtos selecionados", accent: "bg-[#e7f1eb]" },
    { name: es ? "Imanes" : "Ímanes", description: es ? "Pequeños recuerdos para ver todos los días." : "Pequenas memórias para ver todos os dias.", href: "/magnets", image: "/images/magnets-product.png", label: es ? "Packs de 4 o 9" : "Conjuntos de 4 ou 9", accent: "bg-[#e8e7f6]" },
  ];

  return <>
    <SiteHeader />
    <main>
      <section id="top" className="relative overflow-hidden border-b border-[#ebdfd6] bg-[#fffaf5]">
        <div className="absolute -right-20 top-10 h-72 w-72 rounded-full bg-[#f8c75e]/20 blur-3xl" />
        <div className="absolute -left-20 bottom-0 h-60 w-60 rounded-full bg-[#ee5264]/10 blur-3xl" />
        <div className="container grid items-center gap-14 py-16 md:py-24 lg:grid-cols-[.9fr_1.1fr] lg:gap-20 lg:py-24">
          <div className="relative z-10 max-w-[570px]">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#e8c7bd] bg-[#fff0e8] px-3.5 py-2 text-[10px] font-black tracking-[.13em] text-[#d83d54]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ee5264]" />
              {es ? "TARJETAS CON UN POQUITO MÁS DE CORAZÓN" : "CARTÕES COM UM POUCO MAIS DE CORAÇÃO"}
            </div>
            <h1 className="serif text-[49px] font-bold leading-[.98] tracking-[-.05em] text-[#182443] sm:text-[65px] lg:text-[74px]">
              {es ? <>Pequeños gestos.<br /><span className="text-[#ee5264]">Momentos</span> para recordar.</> : <>Pequenos gestos.<br /><span className="text-[#ee5264]">Momentos</span> para recordar.</>}
            </h1>
            <p className="mt-7 max-w-[500px] text-[16px] leading-7 text-[#68718a]">
              {es ? "Crea una tarjeta única con tus fotos, tus palabras y ese toque que solo tú sabes darle. Nosotros la imprimimos y la llevamos hasta su puerta." : "Cria um cartão único com as tuas fotografias, as tuas palavras e aquele toque que só tu sabes dar. Nós imprimimos e entregamos à porta."}
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/customize" className="focus-ring inline-flex items-center justify-center gap-3 rounded-full bg-[#ee5264] px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-[#ee5264]/20 transition hover:-translate-y-0.5 hover:bg-[#d83d54]">
                {es ? "Crear mi tarjeta" : "Criar o meu cartão"} <Icon name="arrow" size={17} />
              </Link>
              <a href="#categories" className="focus-ring inline-flex items-center justify-center rounded-full border border-[#d9cbc4] bg-white px-6 py-3.5 text-sm font-black text-[#182443] transition hover:border-[#ee5264]">
                {es ? "Ver productos" : "Ver produtos"}
              </a>
            </div>
            <div className="mt-7 flex items-center gap-3 text-xs font-bold text-[#7c8191]">
              <div className="flex -space-x-2"><span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#fffaf5] bg-[#f3b6a8]">M</span><span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#fffaf5] bg-[#f5d47a]">J</span><span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#fffaf5] bg-[#b8d9ce]">A</span></div>
              {es ? "Diseñado por ti · Entregado con cariño" : "Criado por ti · Entregue com carinho"}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[570px]">
            <div className="float absolute -left-2 top-12 z-10 hidden rounded-2xl bg-white px-4 py-3 card-shadow sm:block">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#ee5264]">{es ? "Tu foto + tus palabras" : "A tua foto + as tuas palavras"}</p>
              <p className="mt-1 text-sm font-bold text-[#182443]">= {es ? "un momento único" : "um momento único"}</p>
            </div>
            <div className="relative aspect-[1.1/1] rotate-2 rounded-[28px] bg-[#f6d9cc] p-3 shadow-2xl shadow-[#8a564c]/20 sm:p-5">
              <div className="relative h-full overflow-hidden rounded-[20px] bg-white">
                <img src="/images/balloon-frame.png" alt={es ? "Tarjeta de cumpleaños personalizada" : "Cartão de aniversário personalizado"} className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-white/55" />
                <div className="absolute inset-5 flex flex-col justify-between rounded-[14px] border border-white/80 bg-white/60 p-5 backdrop-blur-[2px] sm:inset-8 sm:p-8">
                  <div className="flex items-center justify-between"><span className="rounded-full bg-[#182443] px-3 py-1.5 text-[9px] font-black tracking-[.15em] text-white">PARA ANA</span><span className="text-xl">🎂</span></div>
                  <div><p className="serif text-[35px] font-bold leading-[.96] text-[#182443] sm:text-[52px]">Feliz<br /><span className="text-[#ee5264]">Cumpleaños</span><br />🎂</p><p className="mt-4 max-w-[180px] text-[11px] font-bold leading-4 text-[#59627b] sm:text-[13px]">{es ? "Porque los mejores días merecen algo más que un mensaje." : "Porque os melhores dias merecem mais do que uma mensagem."}</p></div>
                  <div className="flex items-end justify-between"><span className="serif text-lg italic text-[#ee5264]">{es ? "Con cariño, Marta" : "Com carinho, Marta"}</span><Icon name="heart" size={28} /></div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-4 -right-2 rounded-2xl bg-[#182443] px-4 py-3 text-white card-shadow sm:-right-7">
              <div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f8c75e] text-[#182443]"><Icon name="truck" size={15} /></span><div><p className="text-[10px] font-black uppercase tracking-wider text-white/60">{es ? "Entrega con cariño" : "Entrega com carinho"}</p><p className="text-sm font-bold">España + Portugal</p></div></div>
            </div>
          </div>
        </div>
      </section>

      <section id="categories" className="scroll-mt-28 bg-white py-16 md:py-24">
        <div className="container">
          <div className="mx-auto max-w-[680px] text-center"><p className="text-[10px] font-black tracking-[.2em] text-[#ee5264]">{es ? "ELIGE LO QUE QUIERES CREAR" : "ESCOLHE O QUE QUERES CRIAR"}</p><h2 className="serif mt-3 text-4xl font-bold tracking-[-.04em] sm:text-5xl">{es ? "¿Por dónde empezamos?" : "Por onde começamos?"}</h2><p className="mx-auto mt-4 max-w-[540px] text-sm leading-6 text-[#737b90]">{es ? "Cuatro productos claros, una forma sencilla de convertir tus fotos en algo que se toca, se regala y se recuerda." : "Quatro produtos claros, uma forma simples de transformar fotografias em algo que se toca, se oferece e se recorda."}</p></div>
          <div className="mt-11 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => <Link key={category.href} href={category.href} className="group focus-ring overflow-hidden rounded-[24px] border border-[#eadbd3] bg-[#fffaf5] transition duration-300 hover:-translate-y-1.5 hover:border-[#e9aaa0] hover:shadow-xl hover:shadow-[#8a564c]/10"><div className={`relative aspect-[1.12/1] overflow-hidden ${category.accent}`}><img src={category.image} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /><span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.12em] shadow-sm">{category.label}</span></div><div className="p-5"><span className="flex items-center justify-between gap-3"><span className="text-lg font-black">{category.name}</span><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#ee5264] transition group-hover:bg-[#ee5264] group-hover:text-white"><Icon name="arrow" size={16} /></span></span><span className="mt-2 block text-sm leading-6 text-[#737b90]">{category.description}</span></div></Link>)}
          </div>
        </div>
      </section>

      <section id="how" className="scroll-mt-28 border-y border-[#ebdfd6] bg-[#fff7f1] py-16 md:py-20">
        <div className="container grid gap-10 lg:grid-cols-[.72fr_1.28fr] lg:items-center">
          <div><p className="text-[10px] font-black tracking-[.2em] text-[#ee5264]">{es ? "ASÍ DE FÁCIL" : "É TÃO FÁCIL"}</p><h2 className="serif mt-3 text-4xl font-bold tracking-[-.04em] sm:text-5xl">{es ? "De tu móvil a tus manos." : "Do teu telemóvel para as tuas mãos."}</h2><p className="mt-4 max-w-[430px] text-sm leading-6 text-[#737b90]">{es ? "Sin menús infinitos. Elige, personaliza y revisa antes de continuar." : "Sem menus infinitos. Escolhe, personaliza e revê antes de continuar."}</p></div>
          <ol className="grid gap-3 sm:grid-cols-3">{[["01", es ? "Elige" : "Escolhe", es ? "Empieza por el producto que quieres crear." : "Começa pelo produto que queres criar."], ["02", es ? "Personaliza" : "Personaliza", es ? "Añade tus fotos y elige sus opciones." : "Adiciona fotografias e escolhe as opções."], ["03", es ? "Revisa" : "Revê", es ? "Comprueba el resultado antes de pedir." : "Confere o resultado antes de encomendar."]].map(([number, title, body], index) => <li key={number} className="rounded-[22px] border border-[#eadbd3] bg-white p-5"><span className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-black ${index === 1 ? "bg-[#f8c75e]" : "bg-[#fff0e8] text-[#ee5264]"}`}>{number}</span><h3 className="mt-5 text-base font-black">{title}</h3><p className="mt-2 text-xs leading-5 text-[#737b90]">{body}</p></li>)}</ol>
        </div>
      </section>

      <section className="bg-white py-16 md:py-24">
        <div className="container">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-[10px] font-black tracking-[.2em] text-[#ee5264]">{es ? "FAVORITOS" : "FAVORITOS"}</p><h2 className="serif mt-3 text-4xl font-bold tracking-[-.04em] sm:text-5xl">{es ? "Ideas que ya vienen bonitas" : "Ideias que já vêm bonitas"}</h2></div><Link href="/templates" className="inline-flex items-center gap-2 text-sm font-black hover:text-[#ee5264]">{es ? "Ver tarjetas" : "Ver cartões"} <Icon name="arrow" size={15} /></Link></div>
          <div className="mt-10 grid gap-5 md:grid-cols-3"><FeaturedCard href="/calendars" image="/images/calendar-product.png" title={es ? "Calendario de pared" : "Calendário de parede"} meta={es ? "A4 · Con fechas" : "A4 · Com datas"} price="desde 16,90 €" /><FeaturedCard href="/wall-art" image="/images/wall-art-product.png" title={es ? "Galería de tres marcos" : "Galeria de três molduras"} meta={es ? "Selección natural" : "Seleção natural"} price="desde 39,90 €" /><FeaturedCard href="/magnets" image="/images/magnets-product.png" title={es ? "Pack de 9 imanes" : "Conjunto de 9 ímanes"} meta="6 × 6 cm" price="desde 14,90 €" /></div>
        </div>
      </section>

      <section className="border-y border-[#ebdfd6] bg-[#182443] py-16 text-white md:py-20">
        <div className="container"><div className="mx-auto max-w-[620px] text-center"><p className="text-[10px] font-black tracking-[.2em] text-[#f8c75e]">{es ? "HECHO PARA EMOCIONAR" : "FEITO PARA EMOCIONAR"}</p><h2 className="serif mt-3 text-4xl font-bold tracking-[-.04em] sm:text-5xl">{es ? "Momentos que ya encontraron su sitio" : "Momentos que já encontraram o seu lugar"}</h2></div><div className="mt-10 grid gap-4 md:grid-cols-3">{reviews.map((review) => <figure key={review.name} className="rounded-[22px] border border-white/10 bg-white/[.06] p-6"><div className="text-sm tracking-[.18em] text-[#f8c75e]">★★★★★</div><blockquote className="serif mt-4 text-xl font-bold leading-8">“{review.quote}”</blockquote><figcaption className="mt-5 text-xs"><span className="font-black">{review.name}</span><span className="ml-2 text-white/50">{review.detail}</span></figcaption></figure>)}</div></div>
      </section>

      <section className="bg-[#fff0e8] py-14 md:py-20"><div className="container flex flex-col items-center justify-between gap-7 rounded-[28px] bg-[#ee5264] px-6 py-10 text-center text-white sm:px-10 md:flex-row md:text-left"><div><p className="text-[10px] font-black tracking-[.18em] text-white/70">{es ? "EMPIEZA CON UNA FOTO" : "COMEÇA COM UMA FOTOGRAFIA"}</p><h2 className="serif mt-2 text-3xl font-bold sm:text-4xl">{es ? "El resto lo hacemos sencillo." : "O resto tornamos simples."}</h2></div><a href="#categories" className="focus-ring inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-[#182443] transition hover:-translate-y-0.5">{es ? "Elegir producto" : "Escolher produto"} <Icon name="arrow" size={16} /></a></div></section>
    </main>
    <SiteFooter />
  </>;
}

function FeaturedCard({ href, image, title, meta, price }: { href: string; image: string; title: string; meta: string; price: string }) {
  return <Link href={href} className="group focus-ring overflow-hidden rounded-[22px] border border-[#eadbd3] bg-[#fffaf5] transition hover:-translate-y-1 hover:shadow-xl hover:shadow-[#8a564c]/10"><div className="aspect-[4/3] overflow-hidden bg-[#f8efe8]"><img src={image} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /></div><div className="flex items-start justify-between gap-4 p-5"><div><h3 className="font-black">{title}</h3><p className="mt-1 text-xs text-[#737b90]">{meta}</p></div><span className="whitespace-nowrap text-xs font-black text-[#ee5264]">{price}</span></div></Link>;
}
