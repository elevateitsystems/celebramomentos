// "use client";

// import type { ReactNode } from "react";
// import Link from "next/link";
// import { useSelector } from "react-redux";
// import { Icon } from "@/components/icons";
// import { ShowcaseCard } from "@/components/showcase-card";
// import { SiteFooter, SiteHeader } from "@/components/site";
// import { RootState } from "@/lib/store";

// type Category = { name: string; description: string; href: string; image: string; accent: string; price: string; position?: string; frameImage?: string };

// const reviews = [
//   { quote: "La tarjeta quedó incluso mejor de lo que imaginaba. Fue un regalo de verdad.", name: "María G.", detail: "Tarjeta personalizada" },
//   { quote: "O calendário ficou lindo e criar cada página foi muito simples.", name: "João P.", detail: "Calendário A4" },
//   { quote: "Ahora nuestras fotos favoritas forman parte de casa, no solo del móvil.", name: "Lucía R.", detail: "Arte de pared" },
// ];

// export default function Home() {
//   const language = useSelector((state: RootState) => state.language.language);
//   const es = language === "es";
//   const categories: Category[] = [
//     { name: es ? "Tarjetas" : "Cartões", description: es ? "Añade fotos y tu propio mensaje" : "Adiciona fotografias e a tua mensagem", href: "/templates", image: "/images/ljVw4.jpg", accent: "bg-[#fbe7e1]", price: "8,90 €" },
//     { name: es ? "Arte de pared" : "Arte de parede", description: es ? "Convierte recuerdos en algo precioso" : "Transforma memórias em algo bonito", href: "/wall-art", image: "/images/wall-art-product.png", accent: "bg-[#e7f1eb]", price: "29,90 €" },
//     { name: es ? "Imanes" : "Ímanes", description: es ? "Pequeños recuerdos para tu nevera" : "Pequenas memórias para o frigorífico", href: "/magnets", image: "/images/magnets-product.png", accent: "bg-[#e8e7f6]", price: "9,90 €" },
//     { name: es ? "Calendarios" : "Calendários", description: es ? "Un año con tus fotos favoritas" : "Um ano com as tuas fotografias favoritas", href: "/calendars", image: "/images/calendar-product.png", accent: "bg-[#fff1c7]", price: "16,90 €" },
//     { name: es ? "Funda de móvil personalizada" : "Capa de telemóvel personalizada", description: es ? "Lleva tus mejores momentos contigo" : "Leva os teus melhores momentos contigo", href: "/phone-cases", image: "/images/personalised-phone-cases.png", accent: "bg-[#f4e8df]", price: "19,90 €" },
//     { name: es ? "Stickers" : "Autocolantes", description: es ? "Convierte tus fotos en pequeños recuerdos" : "Transforma as tuas fotografias em pequenas memórias", href: "/customize", image: "/images/sticker-cello.jpg", accent: "bg-[#eef5f6]", price: "1,50 €" },
//   ];
//   const moments = [
//     { icon: "gift", title: es ? "Cumpleaños" : "Aniversários", body: es ? "Una tarjeta o regalo que sí guardarán." : "Um cartão ou presente que vão guardar.", tile: "bg-[#fde8e4] text-[#ee5264]", glow: "bg-[#ee5264]/15", span: "lg:col-span-2" },
//     { icon: "users", title: es ? "Recuerdos familiares" : "Memórias de família", body: es ? "Tus personas favoritas, siempre cerca." : "As tuas pessoas favoritas, sempre por perto.", tile: "bg-[#e3f1e9] text-[#2f7d57]", glow: "bg-[#2f7d57]/15", span: "lg:col-span-2" },
//     { icon: "heart", title: es ? "Aniversarios" : "Datas especiais", body: es ? "Celebra vuestra historia a vuestra manera." : "Celebra a vossa história à vossa maneira.", tile: "bg-[#efe7f9] text-[#7a52c7]", glow: "bg-[#7a52c7]/15", span: "lg:col-span-2" },
//     { icon: "tree", title: es ? "Navidad y celebraciones" : "Natal e celebrações", body: es ? "Regalos hechos con los recuerdos que amas." : "Presentes feitos com as memórias que amas.", tile: "bg-[#fff1c7] text-[#b7791f]", glow: "bg-[#f2af27]/20", span: "lg:col-span-3" },
//     { icon: "home", title: es ? "Para tu hogar" : "Para a tua casa", body: es ? "Llena tus paredes de vida y significado." : "Enche as tuas paredes de vida e significado.", tile: "bg-[#e4e6f7] text-[#4b52b8]", glow: "bg-[#4b52b8]/15", span: "sm:col-span-2 lg:col-span-3" },
//   ];

//   return <>
//     <SiteHeader />
//     <main>
//       <section id="top" className="relative overflow-hidden border-b border-[#ebdfd6] bg-[#fffaf5]">
//         <div className="absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-[#ee5264]/10 blur-3xl" />
//         <div className="container grid items-center gap-12 py-14 md:py-20 lg:grid-cols-[.88fr_1.12fr] lg:gap-16 lg:py-24">
//           <div className="relative z-10 max-w-[570px]">
//             <p className="mb-5 text-[10px] font-black uppercase tracking-[.2em] text-[#ee5264]">{es ? "TUS RECUERDOS, HECHOS REGALO" : "AS TUAS MEMÓRIAS, FEITAS PRESENTE"}</p>
//             <h1 className="serif text-[51px] font-bold leading-[.96] tracking-[-.055em] text-[#182443] sm:text-[68px] lg:text-[76px]">{es ? <>Hazlo personal.<br /><span className="text-[#ee5264]">Hazlo tuyo.</span></> : <>Torna-o pessoal.<br /><span className="text-[#ee5264]">Torna-o teu.</span></>}</h1>
//             <p className="mt-7 max-w-[520px] text-base leading-7 text-[#68718a]">{es ? "Convierte tus fotos favoritas y palabras especiales en regalos personalizados, recuerdos y cosas bonitas para tu hogar." : "Transforma as tuas fotografias favoritas e palavras especiais em presentes personalizados, recordações e coisas bonitas para a tua casa."}</p>
//             <div className="mt-9 flex flex-col gap-3 sm:flex-row"><Link href="/templates" className="focus-ring inline-flex items-center justify-center gap-3 rounded-full bg-[#ee5264] px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-[#ee5264]/20 transition hover:-translate-y-0.5 hover:bg-[#d83d54]">{es ? "Crea el tuyo" : "Cria o teu"}<Icon name="arrow" size={17} /></Link><a href="#categories" className="focus-ring inline-flex items-center justify-center rounded-full border border-[#d9cbc4] bg-white px-6 py-3.5 text-sm font-black text-[#182443] transition hover:border-[#ee5264]">{es ? "Ver todos los productos" : "Ver todos os produtos"}</a></div>
//             <p className="mt-7 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold text-[#737b90]"><span>📸 {es ? "Sube tu foto" : "Carrega a fotografia"}</span><span>•</span><span>✍️ {es ? "Añade tu mensaje" : "Adiciona a mensagem"}</span><span>•</span><span>❤️ {es ? "Crea algo único" : "Cria algo único"}</span></p>
//           </div>
//           <div className="relative"><div className="absolute -inset-5 rotate-2 rounded-[34px] bg-[#f4d4c7]" /><div className="relative overflow-hidden rounded-[28px] border-[10px] border-white shadow-2xl shadow-[#8a564c]/20"><img src="/images/home-personalised-gifts.png" alt={es ? "Tarjeta, cuadro, calendario, funda e imanes personalizados" : "Cartão, quadro, calendário, capa e ímanes personalizados"} className="aspect-[3/2] h-full w-full object-cover" /></div><div className="float absolute -bottom-5 -left-3 rounded-2xl bg-white px-4 py-3 card-shadow sm:left-6"><p className="text-[10px] font-black uppercase tracking-wider text-[#ee5264]">{es ? "CREADO POR TI" : "CRIADO POR TI"}</p><p className="mt-1 text-sm font-black">{es ? "Único, como ellos" : "Único, como eles"} ❤️</p></div></div>
//         </div>
//       </section>

//       <section id="categories" className="scroll-mt-28 bg-white py-16 md:py-24">
//         <div className="container">
//           <SectionHeading
//             eyebrow={es ? "¿QUÉ PUEDES CREAR?" : "O QUE PODES CRIAR?"}
//             title={es ? "Tus fotos pueden convertirse en mucho más" : "As tuas fotografias podem tornar-se muito mais"}
//             body={es ? "Elige una idea. Después añade tus recuerdos y hazla completamente tuya." : "Escolhe uma ideia. Depois adiciona as tuas memórias e torna-a completamente tua."}
//           />

//           <div className="mx-auto mt-14 grid max-w-[1180px] gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
//             {categories.map((category) => (
//               <Link
//                 key={category.href}
//                 href={category.href}
//                 className="group focus-ring flex flex-col overflow-hidden rounded-[28px] border border-[#eadbd3] bg-white shadow-sm transition duration-300 hover:-translate-y-2 hover:border-[#ee5264]/40 hover:shadow-2xl hover:shadow-[#8a564c]/15"
//               >
//                 {/* Image */}
//                 <div className={`relative aspect-[4/3] overflow-hidden ${category.accent}`}>
//                   {category.frameImage ? (
//                     <>
//                       <img src={category.image} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" style={{ objectPosition: category.position }} />
//                       <img src={category.frameImage} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
//                     </>
//                   ) : (
//                     <img src={category.image} alt="" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" style={{ objectPosition: category.position }} />
//                   )}
//                   <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#182443]/15 via-transparent to-transparent" />
//                   <span className="absolute right-4 top-4 rounded-full bg-white/95 px-4 py-1.5 text-sm font-black text-[#182443] shadow-lg shadow-black/10 backdrop-blur">
//                     {category.price}
//                   </span>
//                 </div>

//                 {/* Content */}
//                 <div className="flex flex-1 flex-col p-7 lg:p-8">
//                   <h3 className="serif text-2xl font-bold tracking-[-.02em] text-[#182443] lg:text-[26px]">{category.name}</h3>
//                   <p className="mt-3 flex-1 text-[15px] leading-6 text-[#68718a]">{category.description}</p>

//                   <div className="mt-6 flex items-center justify-between border-t border-[#f0e4dc] pt-5">
//                     <span className="text-sm font-black text-[#ee5264]">Personalizar</span>
//                     <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fff0e8] text-[#ee5264] transition duration-300 group-hover:translate-x-1 group-hover:bg-[#ee5264] group-hover:text-white">
//                       <Icon name="arrow" size={17} />
//                     </span>
//                   </div>
//                 </div>
//               </Link>
//             ))}
//           </div>
//         </div>
//       </section>

//       <section id="how" className="scroll-mt-28 border-y border-[#ebdfd6] bg-[#fff7f1] py-16 md:py-24">
//         <div className="container">
//           <SectionHeading eyebrow={es ? "ASÍ DE FÁCIL" : "É ASSIM TÃO FÁCIL"} title={es ? "Crea algo personal en 3 pasos" : "Cria algo pessoal em 3 passos"} body={es ? "Tú pones los recuerdos. Nosotros hacemos que el proceso sea sencillo." : "Tu trazes as memórias. Nós tornamos o processo simples."} />

//           <ol className="relative mx-auto mt-14 grid max-w-[1180px] gap-6 md:grid-cols-3 lg:gap-8">
//             <div className="pointer-events-none absolute left-[17%] right-[17%] top-[72px] hidden border-t-2 border-dashed border-[#e6b8ac] md:block" />
//             {[
//               { number: "01", icon: "grid", title: es ? "Elige tu producto" : "Escolhe o produto", body: es ? "Empieza por una tarjeta, arte de pared, imanes, calendario o funda." : "Começa por um cartão, arte de parede, ímanes, calendário ou capa.", tile: "bg-[#fde8e4] text-[#ee5264]", glow: "bg-[#ee5264]/15" },
//               { number: "02", icon: "image", title: es ? "Añade fotos y palabras" : "Adiciona fotos e palavras", body: es ? "Sube tus imágenes favoritas y escribe tu propio mensaje." : "Carrega as imagens favoritas e escreve a tua mensagem.", tile: "bg-[#e3f1e9] text-[#2f7d57]", glow: "bg-[#2f7d57]/15" },
//               { number: "03", icon: "package", title: es ? "Previsualiza y pide" : "Vê e encomenda", body: es ? "Comprueba tu creación y nosotros nos encargamos del resto." : "Confere a tua criação e nós tratamos do resto.", tile: "bg-[#efe7f9] text-[#7a52c7]", glow: "bg-[#7a52c7]/15" },
//             ].map((step) => (
//               <li key={step.number} className="group relative z-10 flex min-h-[290px] flex-col overflow-hidden rounded-[28px] border border-[#eadbd3] bg-gradient-to-b from-white to-[#fffaf5] p-8 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#8a564c]/10 lg:p-10">
//                 <div className={`pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full blur-3xl transition duration-500 group-hover:scale-125 ${step.glow}`} />
//                 <span className="serif pointer-events-none absolute right-7 top-5 text-[84px] font-bold leading-none tracking-[-.05em] text-[#182443]/[.06]">{step.number}</span>

//                 <span className={`relative flex h-[72px] w-[72px] items-center justify-center rounded-[22px] shadow-sm ring-1 ring-black/5 transition duration-300 group-hover:scale-105 ${step.tile}`}><MomentIcon name={step.icon} size={34} /></span>

//                 <h3 className="serif relative mt-8 text-2xl font-bold tracking-[-.02em] text-[#182443] lg:text-[28px]">{step.title}</h3>
//                 <p className="relative mt-3 max-w-[340px] text-[15px] leading-6 text-[#68718a]">{step.body}</p>
//               </li>
//             ))}
//           </ol>

//           <div className="mx-auto mt-10 flex max-w-[900px] flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-full border border-[#eadbd3] bg-white px-6 py-4 text-[11px] font-black uppercase tracking-[.12em] text-[#59627b] shadow-sm">
//             {(es ? ["Elige", "Sube", "Personaliza", "Previsualiza", "Pide"] : ["Escolhe", "Carrega", "Personaliza", "Pré-visualiza", "Encomenda"]).map((label, index, all) => (
//               <span key={label} className="flex items-center gap-3"><span>{label}</span>{index < all.length - 1 && <span className="text-[#ee5264]">→</span>}</span>
//             ))}
//           </div>
//         </div>
//       </section>

//       <section id="moments" className="bg-white py-16 md:py-24">
//         <div className="container">
//           <SectionHeading eyebrow={es ? "HECHO PARA EMOCIONAR" : "FEITO PARA EMOCIONAR"} title={es ? "Para los momentos que importan" : "Para os momentos que importam"} body={es ? "No es solo lo que regalas. Es todo lo que ese recuerdo significa." : "Não é apenas o que ofereces. É tudo o que essa memória significa."} />

//           <div className="mx-auto mt-14 grid max-w-[1180px] gap-6 sm:grid-cols-2 lg:grid-cols-6 lg:gap-8">
//             {moments.map((moment) => (
//               <article
//                 key={moment.title}
//                 className={`group relative flex min-h-[260px] flex-col overflow-hidden rounded-[28px] border border-[#eadbd3] bg-gradient-to-b from-white to-[#fffaf5] p-8 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#8a564c]/10 lg:p-10 ${moment.span}`}
//               >
//                 <div className={`pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full blur-3xl transition duration-500 group-hover:scale-125 ${moment.glow}`} />
//                 <div className="pointer-events-none absolute -bottom-8 -right-6 opacity-[.045] transition duration-500 group-hover:opacity-[.08] group-hover:-rotate-6"><MomentIcon name={moment.icon} size={190} stroke={1.2} /></div>

//                 <span className={`relative flex h-[68px] w-[68px] items-center justify-center rounded-[20px] shadow-sm ring-1 ring-black/5 transition duration-300 group-hover:scale-105 ${moment.tile}`}><MomentIcon name={moment.icon} size={32} /></span>

//                 <h3 className="serif relative mt-8 text-2xl font-bold tracking-[-.02em] text-[#182443] lg:text-[28px]">{moment.title}</h3>
//                 <p className="relative mt-3 max-w-[380px] text-[15px] leading-6 text-[#68718a]">{moment.body}</p>
//               </article>
//             ))}
//           </div>
//         </div>
//       </section>

//       <section id="story" className="border-y border-[#ebdfd6] bg-[#182443] py-16 text-white md:py-24"><div className="container"><SectionHeading dark eyebrow={es ? "TU FOTO. TUS PALABRAS. TU HISTORIA." : "A TUA FOTO. AS TUAS PALAVRAS. A TUA HISTÓRIA."} title={es ? "Mira cómo un recuerdo cobra vida" : "Vê como uma memória ganha vida"} body={es ? "Cada creación empieza con algo que ya es importante para ti." : "Cada criação começa com algo que já é importante para ti."} /><div className="mt-12 grid gap-10 lg:grid-cols-[.92fr_1.08fr] lg:items-start"><div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1"><Transformation before="/images/vDyvv.jpg" after="/images/wall-art-product.png" label={es ? "Tu foto → arte de pared personalizada" : "A tua foto → arte de parede personalizada"} /><Transformation before="/images/birthday-celebration.png" after="/images/uVWMM.jpg" birthdayCard label={es ? "Tu foto + tu mensaje → una tarjeta única" : "A tua foto + a tua mensagem → um cartão único"} /></div><div className="rounded-[26px] border border-white/10 bg-white/[.06] p-6 sm:p-8 lg:p-9"><h2 className="serif text-3xl font-bold leading-tight sm:text-4xl">Celebra momentos. Crea recuerdos.</h2><div className="mt-7 space-y-6 text-sm leading-7 text-white/75"><p>En <strong className="font-black text-white">Celebra Momentos</strong> creemos que los momentos especiales merecen ser recordados de una forma especial.</p><p>Una sonrisa, un cumpleaños, una fecha importante, una persona que quieres o simplemente ese recuerdo que te hace feliz. Transformamos tus fotos, tus palabras y tus ideas en productos personalizados para <strong className="font-black text-white">regalar, decorar y conservar</strong>.</p><p>Creamos <strong className="font-black text-white">tarjetas personalizadas, fotos con marcos, imanes y pegatinas</strong>, diseñados por ti y hechos para cada ocasión.</p><div><h3 className="text-lg font-black text-[#f8c75e]">Hecho especialmente para ti</h3><div className="mt-3 space-y-4"><p>Porque cada persona, cada historia y cada momento es diferente.</p><p>Tú eliges la foto, el mensaje y los detalles. Nosotros nos encargamos de convertirlos en algo único que puedas tener entre tus manos y compartir con las personas que más quieres.</p></div></div><div><h3 className="text-lg font-black text-[#f8c75e]">Pequeños detalles, grandes recuerdos</h3><div className="mt-3 space-y-4"><p>Un regalo no tiene que ser grande para ser especial.</p><p>A veces, una foto, unas palabras o un pequeño detalle son suficientes para decir <strong className="font-black text-white">“te quiero”, “feliz cumpleaños”, “gracias” o “me acuerdo de ti”</strong>.</p><p>En <strong className="font-black text-white">Celebra Momentos</strong>, queremos ayudarte a convertir esos sentimientos en recuerdos que duren.</p></div></div><p className="pt-1 text-lg font-black text-white sm:text-xl">Celebra hoy. Personaliza tu momento. Guárdalo para siempre. ❤️</p></div></div></div></div></section>

//       <section id="made-by-you" className="bg-[#fffaf5] py-16 md:py-24"><div className="container"><SectionHeading eyebrow={es ? "HECHO POR VOSOTROS" : "FEITO POR VOCÊS"} title={es ? "Creaciones de personas como tú" : "Criações de pessoas como tu"} body={es ? "Ideas reales para cumpleaños, bodas, aniversarios y días que merecen quedarse." : "Ideias reais para aniversários, casamentos e dias que merecem ficar."} /><div className="mx-auto mt-10 grid max-w-[860px] gap-6 sm:grid-cols-2"><ShowcaseCard variant="graduation" language={language} /><ShowcaseCard variant="romantic" language={language} /></div><p className="mt-7 text-center text-sm font-black">{es ? "Comparte tu creación" : "Partilha a tua criação"} <span className="text-[#ee5264]">#CelebraMomentos</span></p></div></section>

//       <section id="reviews" className="bg-[#fff7f1] py-16 md:py-24"><div className="container"><SectionHeading eyebrow={es ? "HISTORIAS REALES" : "HISTÓRIAS REAIS"} title={es ? "Pequeños detalles. Grandes reacciones." : "Pequenos detalhes. Grandes reações."} /><div className="mt-10 grid gap-4 md:grid-cols-3">{reviews.map((review) => <figure key={review.name} className="rounded-[24px] border border-[#eadbd3] bg-white p-6"><div className="text-sm tracking-[.18em] text-[#f2af27]">★★★★★</div><blockquote className="serif mt-4 text-xl font-bold leading-8">“{review.quote}”</blockquote><figcaption className="mt-5 text-xs"><span className="font-black">{review.name}</span><span className="ml-2 text-[#9297a4]">{review.detail}</span></figcaption></figure>)}</div><div className="mt-8 grid gap-3 rounded-[22px] bg-white p-5 text-xs font-black text-[#59627b] sm:grid-cols-2 lg:grid-cols-4">{[es ? "Vista previa antes de continuar" : "Pré-visualização antes de continuar", es ? "Personalizado por ti" : "Personalizado por ti", es ? "Preparado con cuidado" : "Preparado com cuidado", es ? "Hecho por encargo" : "Feito por encomenda"].map((item) => <span key={item} className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e8f5ed] text-[#24714b]"><Icon name="check" size={13} /></span>{item}</span>)}</div></div></section>

//       <section className="bg-[#fff0e8] py-14 md:py-20"><div className="container"><div className="flex flex-col items-center justify-between gap-8 overflow-hidden rounded-[30px] bg-[#ee5264] px-7 py-11 text-center text-white sm:px-11 md:flex-row md:text-left"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-white/70">{es ? "UN REGALO QUE SOLO PUEDE SER SUYO" : "UM PRESENTE QUE SÓ PODE SER DELES"}</p><h2 className="serif mt-3 text-3xl font-bold sm:text-5xl">{es ? "Regálales algo verdaderamente suyo." : "Oferece algo verdadeiramente deles."}</h2><p className="mt-3 text-sm text-white/80">{es ? "Una foto favorita. Un mensaje especial. Un recuerdo que conservarán." : "Uma fotografia favorita. Uma mensagem especial. Uma memória para guardar."}</p></div><Link href="/templates" className="focus-ring inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-black text-[#182443] transition hover:-translate-y-0.5">{es ? "Crear mi regalo personalizado" : "Criar o meu presente"}<Icon name="arrow" size={16} /></Link></div></div></section>
//     </main>
//     <SiteFooter />
//   </>;
// }

// function SectionHeading({ eyebrow, title, body, dark = false }: { eyebrow: string; title: string; body?: string; dark?: boolean }) { return <div className="mx-auto max-w-[720px] text-center"><p className={`text-[10px] font-black uppercase tracking-[.2em] ${dark ? "text-[#f8c75e]" : "text-[#ee5264]"}`}>{eyebrow}</p><h2 className={`serif mt-3 text-4xl font-bold tracking-[-.04em] sm:text-5xl ${dark ? "text-white" : "text-[#182443]"}`}>{title}</h2>{body && <p className={`mx-auto mt-4 max-w-[580px] text-sm leading-6 ${dark ? "text-white/65" : "text-[#737b90]"}`}>{body}</p>}</div>; }
// function Transformation({ before, after, label, birthdayCard = false }: { before: string; after: string; label: string; birthdayCard?: boolean }) { return <article className="rounded-[26px] border border-white/10 bg-white/[.06] p-4 sm:p-6"><div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3"><div className="aspect-square overflow-hidden rounded-2xl bg-white/10"><img src={before} alt="" className="h-full w-full object-cover" /></div><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f8c75e] font-black text-[#182443]">→</span><div className="aspect-square overflow-hidden rounded-2xl bg-white">{birthdayCard ? <img src={after} alt="" className="h-full w-full object-cover" /> : <img src={after} alt="" className="h-full w-full object-cover" />}</div></div><h3 className="mt-5 text-center text-sm font-black">{label}</h3></article>; }
// function GalleryTile({ image, label, className = "" }: { image: string; label: string; className?: string }) { return <figure className={`group relative min-h-[190px] overflow-hidden rounded-[22px] ${className}`}><img src={image} alt={label} className="absolute inset-0 h-full w-full object-cover object-center transition duration-500 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-[#182443]/75 via-transparent to-transparent" /><figcaption className="absolute bottom-4 left-4 text-sm font-black text-white">{label}</figcaption></figure>; }
// function MomentIcon({ name, size = 28, stroke = 1.7 }: { name: string; size?: number; stroke?: number }) {
//   const paths: Record<string, ReactNode> = {
//     gift: <><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13" /><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" /><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5" /></>,
//     users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
//     heart: <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />,
//     tree: <><path d="m17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z" /><path d="M12 22v-3" /></>,
//     grid: <><rect width="7" height="7" x="3" y="3" rx="1.5" /><rect width="7" height="7" x="14" y="3" rx="1.5" /><rect width="7" height="7" x="14" y="14" rx="1.5" /><rect width="7" height="7" x="3" y="14" rx="1.5" /></>,
//     image: <><path d="M16 5h6" /><path d="M19 2v6" /><path d="M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /><circle cx="9" cy="9" r="2" /></>,
//     package: <><path d="m16 16 2 2 4-4" /><path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14" /><path d="m7.5 4.27 9 5.15" /><polyline points="3.29 7 12 12 20.71 7" /><line x1="12" x2="12" y1="22" y2="12" /></>,
//     home: <><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" /></>,
//   };
//   return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
// }


"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useSelector } from "react-redux";
import { Icon } from "@/components/icons";
import { CardPreview } from "@/components/card-preview";
import { ShowcaseCard } from "@/components/showcase-card";
import { SiteFooter, SiteHeader } from "@/components/site";
import { RootState } from "@/lib/store";

type Category = { name: string; description: string; href: string; image: string; accent: string; price: string; position?: string; frameImage?: string };

const reviews = [
  { name: "María G.", tint: "bg-[#fde8e4] text-[#ee5264]", es: { quote: "La tarjeta quedó incluso mejor de lo que imaginaba. Fue un regalo de verdad.", detail: "Tarjeta personalizada" }, pt: { quote: "O cartão ficou ainda melhor do que eu imaginava. Foi um presente a sério.", detail: "Cartão personalizado" } },
  { name: "João P.", tint: "bg-[#fff1c7] text-[#b7791f]", es: { quote: "El calendario quedó precioso y crear cada página fue muy sencillo.", detail: "Calendario A4" }, pt: { quote: "O calendário ficou lindo e criar cada página foi muito simples.", detail: "Calendário A4" } },
  { name: "Lucía R.", tint: "bg-[#e3f1e9] text-[#2f7d57]", es: { quote: "Ahora nuestras fotos favoritas forman parte de casa, no solo del móvil.", detail: "Arte de pared" }, pt: { quote: "Agora as nossas fotografias favoritas fazem parte da casa, e não só do telemóvel.", detail: "Arte de parede" } },
];

export default function Home() {
  const language = useSelector((state: RootState) => state.language.language);
  const es = language === "es";
  const categories: Category[] = [
    { name: es ? "Tarjetas" : "Cartões", description: es ? "Añade fotos y tu propio mensaje" : "Adiciona fotografias e a tua mensagem", href: "/templates", image: "/images/ljVw4.jpg", accent: "bg-[#fbe7e1]", price: "8,90 €" },
    { name: es ? "Arte de pared" : "Arte de parede", description: es ? "Convierte recuerdos en algo precioso" : "Transforma memórias em algo bonito", href: "/wall-art", image: "/images/1Q9OC.jpg", accent: "bg-[#e7f1eb]", price: "29,90 €" },
    { name: es ? "Imanes" : "Ímanes", description: es ? "Pequeños recuerdos para tu nevera" : "Pequenas memórias para o frigorífico", href: "/magnets", image: "/images/magnets-product.png", accent: "bg-[#e8e7f6]", price: "9,90 €" },
    { name: es ? "Calendarios" : "Calendários", description: es ? "Un año con tus fotos favoritas" : "Um ano com as tuas fotografias favoritas", href: "/calendars", image: "/images/calendar-product.png", accent: "bg-[#fff1c7]", price: "16,90 €" },
    { name: es ? "Funda de móvil personalizada" : "Capa de telemóvel personalizada", description: es ? "Lleva tus mejores momentos contigo" : "Leva os teus melhores momentos contigo", href: "/phone-cases", image: "/images/personalised-phone-cases.png", accent: "bg-[#f4e8df]", price: "19,90 €" },
    { name: es ? "Stickers" : "Autocolantes", description: es ? "Convierte tus fotos en pequeños recuerdos" : "Transforma as tuas fotografias em pequenas memórias", href: "/customize", image: "/images/sticker-cello.jpg", accent: "bg-[#eef5f6]", price: "1,50 €" },
  ];
  const moments = [
    { icon: "gift", title: es ? "Cumpleaños" : "Aniversários", body: es ? "Una tarjeta o regalo que sí guardarán." : "Um cartão ou presente que vão guardar.", tile: "bg-[#fde8e4] text-[#ee5264]", glow: "bg-[#ee5264]/15", span: "lg:col-span-2" },
    { icon: "users", title: es ? "Recuerdos familiares" : "Memórias de família", body: es ? "Tus personas favoritas, siempre cerca." : "As tuas pessoas favoritas, sempre por perto.", tile: "bg-[#e3f1e9] text-[#2f7d57]", glow: "bg-[#2f7d57]/15", span: "lg:col-span-2" },
    { icon: "heart", title: es ? "Aniversarios" : "Datas especiais", body: es ? "Celebra vuestra historia a vuestra manera." : "Celebra a vossa história à vossa maneira.", tile: "bg-[#efe7f9] text-[#7a52c7]", glow: "bg-[#7a52c7]/15", span: "lg:col-span-2" },
    { icon: "tree", title: es ? "Navidad y celebraciones" : "Natal e celebrações", body: es ? "Regalos hechos con los recuerdos que amas." : "Presentes feitos com as memórias que amas.", tile: "bg-[#fff1c7] text-[#b7791f]", glow: "bg-[#f2af27]/20", span: "lg:col-span-3" },
    { icon: "home", title: es ? "Para tu hogar" : "Para a tua casa", body: es ? "Llena tus paredes de vida y significado." : "Enche as tuas paredes de vida e significado.", tile: "bg-[#e4e6f7] text-[#4b52b8]", glow: "bg-[#4b52b8]/15", span: "sm:col-span-2 lg:col-span-3" },
  ];

  return <>
    <SiteHeader />
    <main>
      <section id="top" className="relative overflow-hidden border-b border-[#ebdfd6] bg-[#fffaf5]">
        <div className="absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-[#ee5264]/10 blur-3xl" />
        <div className="absolute -right-20 top-0 h-80 w-80 rounded-full bg-[#f8c75e]/15 blur-3xl" />
        <div className="container grid items-center gap-12 py-14 md:py-20 lg:grid-cols-[.9fr_1.1fr] lg:gap-16 lg:py-24">
          <div className="relative z-10 max-w-[600px]">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#f0d3c9] bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[.2em] text-[#ee5264] shadow-sm"><MomentIcon name="sparkles" size={14} />{es ? "TUS RECUERDOS, HECHOS REGALO" : "AS TUAS MEMÓRIAS, FEITAS PRESENTE"}</span>
            <h1 className="serif mt-6 text-[46px] font-bold leading-[1] tracking-[-.05em] text-[#182443] sm:text-[58px] lg:text-[60px]">{es ? <>Hazlo personal.<br /><span className="text-[#ee5264]">Hazlo tuyo.</span></> : <>Torna-o pessoal.<br /><span className="text-[#ee5264]">Torna-o teu.</span></>}</h1>
            <p className="mt-6 max-w-[500px] text-[17px] leading-8 text-[#68718a]">{es ? "Convierte tus fotos favoritas y palabras especiales en regalos personalizados, recuerdos y cosas bonitas para tu hogar." : "Transforma as tuas fotografias favoritas e palavras especiais em presentes personalizados, recordações e coisas bonitas para a tua casa."}</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row"><Link href="/templates" className="focus-ring inline-flex items-center justify-center gap-3 rounded-full bg-[#ee5264] px-7 py-4 text-sm font-black text-white shadow-lg shadow-[#ee5264]/25 transition hover:-translate-y-0.5 hover:bg-[#d83d54]">{es ? "Crea el tuyo" : "Cria o teu"}<Icon name="arrow" size={17} /></Link><a href="#categories" className="focus-ring inline-flex items-center justify-center rounded-full border border-[#d9cbc4] bg-white px-7 py-4 text-sm font-black text-[#182443] transition hover:border-[#ee5264]">{es ? "Ver todos los productos" : "Ver todos os produtos"}</a></div>
            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-4 border-t border-[#ecdcd3] pt-7">
              {[
                { icon: "camera", label: es ? "Sube tu foto" : "Carrega a fotografia" },
                { icon: "pen", label: es ? "Añade tu mensaje" : "Adiciona a mensagem" },
                { icon: "sparkles", label: es ? "Crea algo único" : "Cria algo único" },
              ].map((item) => (
                <span key={item.icon} className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#ee5264] shadow-sm ring-1 ring-[#eadbd3]"><MomentIcon name={item.icon} size={19} /></span><span className="text-[13px] font-black text-[#182443]">{item.label}</span></span>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-5 rotate-2 rounded-[34px] bg-[#f4d4c7]" />
            <div className="relative overflow-hidden rounded-[28px] border-[10px] border-white shadow-2xl shadow-[#8a564c]/20">
              <img src="/images/home-personalised-gifts.png" alt={es ? "Tarjeta, cuadro, calendario, funda e imanes personalizados" : "Cartão, quadro, calendário, capa e ímanes personalizados"} className="aspect-[3/2] h-full w-full object-cover" />
              <div className="absolute right-4 top-4 z-10 rotate-[7deg] sm:right-6 sm:top-6">
                <div className="relative h-[72px] w-[72px] overflow-hidden rounded-[18px] border-[4px] border-white shadow-xl shadow-black/25 ring-1 ring-black/5 sm:h-[92px] sm:w-[92px]">
                  <img src="/images/sticker-cello.jpg" alt="" className="h-full w-full object-cover" />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/35 via-transparent to-transparent" />
                </div>
              </div>
            </div>
            <div className="float absolute -bottom-5 -left-3 rounded-2xl bg-white px-5 py-3.5 card-shadow sm:left-6"><p className="text-[10px] font-black uppercase tracking-wider text-[#ee5264]">{es ? "CREADO POR TI" : "CRIADO POR TI"}</p><p className="mt-1 flex items-center gap-1.5 text-sm font-black">{es ? "Único, como ellos" : "Único, como eles"}<span className="text-[#ee5264]"><MomentIcon name="heart" size={15} filled /></span></p></div>
          </div>
        </div>
      </section>

      <section id="categories" className="scroll-mt-28 bg-white py-16 md:py-24">
        <div className="container">
          <SectionHeading
            eyebrow={es ? "¿QUÉ PUEDES CREAR?" : "O QUE PODES CRIAR?"}
            title={es ? "Tus fotos pueden convertirse en mucho más" : "As tuas fotografias podem tornar-se muito mais"}
            body={es ? "Elige una idea. Después añade tus recuerdos y hazla completamente tuya." : "Escolhe uma ideia. Depois adiciona as tuas memórias e torna-a completamente tua."}
          />

          <div className="mx-auto mt-14 grid max-w-[1180px] gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            {categories.map((category) => (
              <Link
                key={category.href}
                href={category.href}
                className="group focus-ring flex flex-col overflow-hidden rounded-[28px] border border-[#eadbd3] bg-white shadow-sm transition duration-300 hover:-translate-y-2 hover:border-[#ee5264]/40 hover:shadow-2xl hover:shadow-[#8a564c]/15"
              >
                {/* Image */}
                <div className={`relative aspect-[4/3] overflow-hidden ${category.accent}`}>
                  {category.frameImage ? (
                    <>
                      <img src={category.image} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" style={{ objectPosition: category.position }} />
                      <img src={category.frameImage} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                    </>
                  ) : (
                    <img src={category.image} alt="" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" style={{ objectPosition: category.position }} />
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#182443]/15 via-transparent to-transparent" />
                  <span className="absolute right-4 top-4 rounded-full bg-white/95 px-4 py-1.5 text-sm font-black text-[#182443] shadow-lg shadow-black/10 backdrop-blur">
                    {category.price}
                  </span>
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col p-7 lg:p-8">
                  <h3 className="serif text-2xl font-bold tracking-[-.02em] text-[#182443] lg:text-[26px]">{category.name}</h3>
                  <p className="mt-3 flex-1 text-[15px] leading-6 text-[#68718a]">{category.description}</p>

                  <div className="mt-6 flex items-center justify-between border-t border-[#f0e4dc] pt-5">
                    <span className="text-sm font-black text-[#ee5264]">Personalizar</span>
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fff0e8] text-[#ee5264] transition duration-300 group-hover:translate-x-1 group-hover:bg-[#ee5264] group-hover:text-white">
                      <Icon name="arrow" size={17} />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="scroll-mt-28 border-y border-[#ebdfd6] bg-[#fff7f1] py-16 md:py-24">
        <div className="container">
          <SectionHeading eyebrow={es ? "ASÍ DE FÁCIL" : "É ASSIM TÃO FÁCIL"} title={es ? "Crea algo personal en 3 pasos" : "Cria algo pessoal em 3 passos"} body={es ? "Tú pones los recuerdos. Nosotros hacemos que el proceso sea sencillo." : "Tu trazes as memórias. Nós tornamos o processo simples."} />

          <ol className="relative mx-auto mt-14 grid max-w-[1180px] gap-6 md:grid-cols-3 lg:gap-8">
            <div className="pointer-events-none absolute left-[17%] right-[17%] top-[72px] hidden border-t-2 border-dashed border-[#e6b8ac] md:block" />
            {[
              { number: "01", icon: "grid", title: es ? "Elige tu producto" : "Escolhe o produto", body: es ? "Empieza por una tarjeta, arte de pared, imanes, calendario o funda." : "Começa por um cartão, arte de parede, ímanes, calendário ou capa.", tile: "bg-[#fde8e4] text-[#ee5264]", glow: "bg-[#ee5264]/15" },
              { number: "02", icon: "image", title: es ? "Añade fotos y palabras" : "Adiciona fotos e palavras", body: es ? "Sube tus imágenes favoritas y escribe tu propio mensaje." : "Carrega as imagens favoritas e escreve a tua mensagem.", tile: "bg-[#e3f1e9] text-[#2f7d57]", glow: "bg-[#2f7d57]/15" },
              { number: "03", icon: "package", title: es ? "Previsualiza y pide" : "Vê e encomenda", body: es ? "Comprueba tu creación y nosotros nos encargamos del resto." : "Confere a tua criação e nós tratamos do resto.", tile: "bg-[#efe7f9] text-[#7a52c7]", glow: "bg-[#7a52c7]/15" },
            ].map((step) => (
              <li key={step.number} className="group relative z-10 flex min-h-[290px] flex-col overflow-hidden rounded-[28px] border border-[#eadbd3] bg-gradient-to-b from-white to-[#fffaf5] p-8 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#8a564c]/10 lg:p-10">
                <div className={`pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full blur-3xl transition duration-500 group-hover:scale-125 ${step.glow}`} />
                <span className="serif pointer-events-none absolute right-7 top-5 text-[84px] font-bold leading-none tracking-[-.05em] text-[#182443]/[.06]">{step.number}</span>

                <span className={`relative flex h-[72px] w-[72px] items-center justify-center rounded-[22px] shadow-sm ring-1 ring-black/5 transition duration-300 group-hover:scale-105 ${step.tile}`}><MomentIcon name={step.icon} size={34} /></span>

                <h3 className="serif relative mt-8 text-2xl font-bold tracking-[-.02em] text-[#182443] lg:text-[28px]">{step.title}</h3>
                <p className="relative mt-3 max-w-[340px] text-[15px] leading-6 text-[#68718a]">{step.body}</p>
              </li>
            ))}
          </ol>

          <div className="mx-auto mt-10 flex max-w-[900px] flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-full border border-[#eadbd3] bg-white px-6 py-4 text-[11px] font-black uppercase tracking-[.12em] text-[#59627b] shadow-sm">
            {(es ? ["Elige", "Sube", "Personaliza", "Previsualiza", "Pide"] : ["Escolhe", "Carrega", "Personaliza", "Pré-visualiza", "Encomenda"]).map((label, index, all) => (
              <span key={label} className="flex items-center gap-3"><span>{label}</span>{index < all.length - 1 && <span className="text-[#ee5264]">→</span>}</span>
            ))}
          </div>
        </div>
      </section>

      <section id="moments" className="bg-white py-16 md:py-24">
        <div className="container">
          <SectionHeading eyebrow={es ? "HECHO PARA EMOCIONAR" : "FEITO PARA EMOCIONAR"} title={es ? "Para los momentos que importan" : "Para os momentos que importam"} body={es ? "No es solo lo que regalas. Es todo lo que ese recuerdo significa." : "Não é apenas o que ofereces. É tudo o que essa memória significa."} />

          <div className="mx-auto mt-14 grid max-w-[1180px] gap-6 sm:grid-cols-2 lg:grid-cols-6 lg:gap-8">
            {moments.map((moment) => (
              <article
                key={moment.title}
                className={`group relative flex min-h-[260px] flex-col overflow-hidden rounded-[28px] border border-[#eadbd3] bg-gradient-to-b from-white to-[#fffaf5] p-8 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#8a564c]/10 lg:p-10 ${moment.span}`}
              >
                <div className={`pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full blur-3xl transition duration-500 group-hover:scale-125 ${moment.glow}`} />
                <div className="pointer-events-none absolute -bottom-8 -right-6 opacity-[.045] transition duration-500 group-hover:opacity-[.08] group-hover:-rotate-6"><MomentIcon name={moment.icon} size={190} stroke={1.2} /></div>

                <span className={`relative flex h-[68px] w-[68px] items-center justify-center rounded-[20px] shadow-sm ring-1 ring-black/5 transition duration-300 group-hover:scale-105 ${moment.tile}`}><MomentIcon name={moment.icon} size={32} /></span>

                <h3 className="serif relative mt-8 text-2xl font-bold tracking-[-.02em] text-[#182443] lg:text-[28px]">{moment.title}</h3>
                <p className="relative mt-3 max-w-[380px] text-[15px] leading-6 text-[#68718a]">{moment.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="transformations" className="scroll-mt-28 border-y border-[#ebdfd6] bg-[#182443] py-16 text-white md:py-24">
        <div className="container">
          <SectionHeading dark eyebrow={es ? "TU FOTO. TUS PALABRAS. TU HISTORIA." : "A TUA FOTO. AS TUAS PALAVRAS. A TUA HISTÓRIA."} title={es ? "Mira cómo un recuerdo cobra vida" : "Vê como uma memória ganha vida"} body={es ? "Cada creación empieza con algo que ya es importante para ti." : "Cada criação começa com algo que já é importante para ti."} />

          <div className="mx-auto mt-14 grid max-w-[1180px] gap-6 md:grid-cols-2 lg:gap-8">
            <Transformation before="/images/vDyvv.jpg" after="/images/1Q9OC.jpg" label={es ? "Tu foto → arte de pared personalizada" : "A tua foto → arte de parede personalizada"} />
            <Transformation before="/images/birthday-celebration.png" after="/images/uVWMM.jpg" label={es ? "Tu foto + tu mensaje → una tarjeta única" : "A tua foto + a tua mensagem → um cartão único"} />
          </div>
        </div>
      </section>

      <section id="story" className="scroll-mt-28 bg-white py-16 md:py-24">
        <div className="container">
          <div className="mx-auto max-w-[760px] text-center">
            <h2 className="serif text-4xl font-bold tracking-[-.04em] text-[#182443] sm:text-5xl">{es ? "Celebra momentos. Crea recuerdos." : "Celebra momentos. Cria memórias."}</h2>
          </div>

          <div className="mx-auto mt-10 max-w-[760px] space-y-5 text-center text-base leading-8 text-[#68718a]">
            <p>{es ? <>En <strong className="font-black text-[#182443]">Celebra Momentos</strong> creemos que los momentos especiales merecen ser recordados de una forma especial.</> : <>Na <strong className="font-black text-[#182443]">Celebra Momentos</strong> acreditamos que os momentos especiais merecem ser recordados de forma especial.</>}</p>
            <p>{es ? <>Una sonrisa, un cumpleaños, una fecha importante, una persona que quieres o simplemente ese recuerdo que te hace feliz. Transformamos tus fotos, tus palabras y tus ideas en productos personalizados para <strong className="font-black text-[#182443]">regalar, decorar y conservar</strong>.</> : <>Um sorriso, um aniversário, uma data importante, uma pessoa de quem gostas ou simplesmente aquela memória que te faz feliz. Transformamos as tuas fotografias, as tuas palavras e as tuas ideias em produtos personalizados para <strong className="font-black text-[#182443]">oferecer, decorar e guardar</strong>.</>}</p>
            <p>{es ? <>Creamos <strong className="font-black text-[#182443]">tarjetas personalizadas, fotos con marcos, imanes y pegatinas</strong>, diseñados por ti y hechos para cada ocasión.</> : <>Criamos <strong className="font-black text-[#182443]">cartões personalizados, fotografias com molduras, ímanes e autocolantes</strong>, desenhados por ti e feitos para cada ocasião.</>}</p>
          </div>

          <div className="mx-auto mt-12 grid max-w-[1000px] gap-6 md:grid-cols-2 lg:gap-8">
            <article className="relative overflow-hidden rounded-[28px] border border-[#eadbd3] bg-gradient-to-b from-white to-[#fffaf5] p-8 shadow-sm lg:p-10">
              <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[#ee5264]/15 blur-3xl" />
              <span className="relative flex h-[68px] w-[68px] items-center justify-center rounded-[20px] bg-[#fde8e4] text-[#ee5264] shadow-sm ring-1 ring-black/5"><MomentIcon name="heart" size={32} /></span>
              <h3 className="serif relative mt-7 text-2xl font-bold tracking-[-.02em] text-[#182443] lg:text-[28px]">{es ? "Hecho especialmente para ti" : "Feito especialmente para ti"}</h3>
              <div className="relative mt-4 space-y-3 text-[15px] leading-7 text-[#68718a]">
                <p>{es ? "Porque cada persona, cada historia y cada momento es diferente." : "Porque cada pessoa, cada história e cada momento é diferente."}</p>
                <p>{es ? "Tú eliges la foto, el mensaje y los detalles. Nosotros nos encargamos de convertirlos en algo único que puedas tener entre tus manos y compartir con las personas que más quieres." : "Tu escolhes a fotografia, a mensagem e os detalhes. Nós tratamos de os transformar em algo único que podes ter nas tuas mãos e partilhar com as pessoas de quem mais gostas."}</p>
              </div>
            </article>

            <article className="relative overflow-hidden rounded-[28px] border border-[#eadbd3] bg-gradient-to-b from-white to-[#fffaf5] p-8 shadow-sm lg:p-10">
              <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[#f2af27]/20 blur-3xl" />
              <span className="relative flex h-[68px] w-[68px] items-center justify-center rounded-[20px] bg-[#fff1c7] text-[#b7791f] shadow-sm ring-1 ring-black/5"><MomentIcon name="gift" size={32} /></span>
              <h3 className="serif relative mt-7 text-2xl font-bold tracking-[-.02em] text-[#182443] lg:text-[28px]">{es ? "Pequeños detalles, grandes recuerdos" : "Pequenos detalhes, grandes memórias"}</h3>
              <div className="relative mt-4 space-y-3 text-[15px] leading-7 text-[#68718a]">
                <p>{es ? "Un regalo no tiene que ser grande para ser especial." : "Um presente não tem de ser grande para ser especial."}</p>
                <p>{es ? <>A veces, una foto, unas palabras o un pequeño detalle son suficientes para decir <strong className="font-black text-[#182443]">“te quiero”, “feliz cumpleaños”, “gracias” o “me acuerdo de ti”</strong>.</> : <>Por vezes, uma fotografia, algumas palavras ou um pequeno detalhe bastam para dizer <strong className="font-black text-[#182443]">“amo-te”, “parabéns”, “obrigado” ou “lembro-me de ti”</strong>.</>}</p>
                <p>{es ? <>En <strong className="font-black text-[#182443]">Celebra Momentos</strong>, queremos ayudarte a convertir esos sentimientos en recuerdos que duren.</> : <>Na <strong className="font-black text-[#182443]">Celebra Momentos</strong>, queremos ajudar-te a transformar esses sentimentos em memórias que perduram.</>}</p>
              </div>
            </article>
          </div>

          <p className="serif mx-auto mt-12 flex max-w-[760px] flex-wrap items-center justify-center gap-3 text-center text-2xl font-bold text-[#ee5264] sm:text-3xl">{es ? "Celebra hoy. Personaliza tu momento. Guárdalo para siempre." : "Celebra hoje. Personaliza o teu momento. Guarda-o para sempre."}<MomentIcon name="heart" size={28} /></p>
        </div>
      </section>

      <section id="made-by-you" className="bg-[#fffaf5] py-16 md:py-24"><div className="container"><SectionHeading eyebrow={es ? "HECHO POR VOSOTROS" : "FEITO POR VOCÊS"} title={es ? "Creaciones de personas como tú" : "Criações de pessoas como tu"} body={es ? "Ideas reales para cumpleaños, bodas, aniversarios y días que merecen quedarse." : "Ideias reais para aniversários, casamentos e dias que merecem ficar."} /><div className="mx-auto mt-10 grid max-w-[1180px] gap-6 sm:grid-cols-2 lg:grid-cols-3"><ShowcaseCard variant="graduation" language={language} /><ShowcaseCard variant="romantic" language={language} /><MagazineShowcaseCard language={language} /></div><p className="mt-7 text-center text-sm font-black">{es ? "Comparte tu creación" : "Partilha a tua criação"} <span className="text-[#ee5264]">#CelebraMomentos</span></p></div></section>

      <section id="reviews" className="bg-[#fff7f1] py-16 md:py-24">
        <div className="container">
          <SectionHeading eyebrow={es ? "HISTORIAS REALES" : "HISTÓRIAS REAIS"} title={es ? "Pequeños detalles. Grandes reacciones." : "Pequenos detalhes. Grandes reações."} />

          <div className="mx-auto mt-14 grid max-w-[1180px] gap-6 md:grid-cols-3 lg:gap-8">
            {reviews.map((review) => {
              const t = es ? review.es : review.pt;
              return (
                <figure key={review.name} className="group relative flex flex-col overflow-hidden rounded-[28px] border border-[#eadbd3] bg-gradient-to-b from-white to-[#fffaf5] p-8 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#8a564c]/10 lg:p-10">
                  <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#f2af27]/15 blur-3xl" />
                  <div className="relative flex items-center justify-between">
                    <Stars />
                    <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${review.tint}`}><MomentIcon name="quote" size={20} /></span>
                  </div>
                  <blockquote className="serif relative mt-6 flex-1 text-[22px] font-bold leading-9 tracking-[-.01em] text-[#182443]">“{t.quote}”</blockquote>
                  <figcaption className="relative mt-8 flex items-center gap-4 border-t border-[#f0e4dc] pt-6">
                    <span className={`flex h-12 w-12 items-center justify-center rounded-full text-base font-black ${review.tint}`}>{review.name[0]}</span>
                    <span><span className="block text-sm font-black text-[#182443]">{review.name}</span><span className="block text-xs text-[#9297a4]">{t.detail}</span></span>
                  </figcaption>
                </figure>
              );
            })}
          </div>

          <div className="mx-auto mt-8 grid max-w-[1180px] gap-6 rounded-[28px] border border-[#eadbd3] bg-white p-6 shadow-sm sm:grid-cols-2 lg:grid-cols-4 lg:p-8">
            {[
              { icon: "eye", label: es ? "Vista previa antes de continuar" : "Pré-visualização antes de continuar" },
              { icon: "pen", label: es ? "Personalizado por ti" : "Personalizado por ti" },
              { icon: "shield", label: es ? "Preparado con cuidado" : "Preparado com cuidado" },
              { icon: "package", label: es ? "Hecho por encargo" : "Feito por encomenda" },
            ].map((item) => (
              <span key={item.icon} className="flex items-center gap-4 text-sm font-black text-[#182443]"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#e8f5ed] text-[#24714b]"><MomentIcon name={item.icon} size={22} /></span>{item.label}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#fff0e8] py-14 md:py-24">
        <div className="container">
          <div className="relative mx-auto flex max-w-[1180px] flex-col items-center justify-between gap-10 overflow-hidden rounded-[36px] bg-gradient-to-br from-[#f0596b] via-[#ee5264] to-[#d73f55] px-8 py-14 text-center text-white shadow-2xl shadow-[#ee5264]/25 sm:px-14 md:flex-row md:py-16 md:text-left">
            <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-white/[.07]" />
            <div className="relative max-w-[640px]">
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-white/70">{es ? "UN REGALO QUE SOLO PUEDE SER SUYO" : "UM PRESENTE QUE SÓ PODE SER DELES"}</p>
              <h2 className="serif mt-4 text-4xl font-bold leading-[1.05] tracking-[-.03em] sm:text-5xl lg:text-[54px]">{es ? "Regálales algo verdaderamente suyo." : "Oferece algo verdadeiramente deles."}</h2>
              <p className="mt-4 text-base leading-7 text-white/85">{es ? "Una foto favorita. Un mensaje especial. Un recuerdo que conservarán." : "Uma fotografia favorita. Uma mensagem especial. Uma memória para guardar."}</p>
            </div>
            <Link href="/templates" className="focus-ring relative inline-flex shrink-0 items-center gap-3 rounded-full bg-white px-8 py-4 text-base font-black text-[#182443] shadow-xl shadow-black/10 transition hover:-translate-y-0.5">{es ? "Crear mi regalo personalizado" : "Criar o meu presente"}<Icon name="arrow" size={18} /></Link>
          </div>
        </div>
      </section>
    </main>
    <SiteFooter />
  </>;
}

function SectionHeading({ eyebrow, title, body, dark = false }: { eyebrow: string; title: string; body?: string; dark?: boolean }) { return <div className="mx-auto max-w-[880px] text-center"><p className={`text-[10px] font-black uppercase tracking-[.2em] ${dark ? "text-[#f8c75e]" : "text-[#ee5264]"}`}>{eyebrow}</p><h2 className={`serif mt-3 text-4xl font-bold tracking-[-.04em] sm:text-5xl ${dark ? "text-white" : "text-[#182443]"}`}>{title}</h2>{body && <p className={`mx-auto mt-4 max-w-[580px] text-sm leading-6 ${dark ? "text-white/65" : "text-[#737b90]"}`}>{body}</p>}</div>; }
function MagazineShowcaseCard({ language }: { language: "es" | "pt" }) { return <article className="group relative aspect-[.78/1] overflow-hidden rounded-[24px] border border-[#d9cbc4] bg-[#fffdf8] p-[7%] shadow-[0_22px_50px_rgba(80,48,38,.2)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_60px_rgba(80,48,38,.25)]"><div className="h-full overflow-hidden rounded-[12px] shadow-lg ring-1 ring-[#d91b2a]/20 transition duration-500 group-hover:scale-[1.02]"><CardPreview compact templateId="template-magazine" message={language === "pt" ? "Feliz aniversário" : "Feliz cumpleaños"} emojiElements={[]} photoDataUrls={[null, null, null, null]} className="h-full w-full !aspect-auto" /></div></article>; }
function Transformation({ before, after, label }: { before: string; after: string; label: string }) { return <article className="group rounded-[32px] border border-white/10 bg-white/[.06] p-5 shadow-2xl shadow-black/10 transition duration-300 hover:bg-white/[.09] sm:p-8"><div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-5"><div className="relative aspect-square overflow-hidden rounded-[22px] bg-white/10 ring-1 ring-white/10"><img src={before} alt="" className="h-full w-full object-cover" /></div><span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f8c75e] text-[#182443] shadow-lg shadow-[#f8c75e]/25 transition duration-300 group-hover:translate-x-0.5"><Icon name="arrow" size={18} /></span><div className="relative aspect-square overflow-hidden rounded-[22px] bg-white ring-1 ring-white/10"><img src={after} alt="" className="h-full w-full object-cover" /></div></div><h3 className="mt-7 text-center text-base font-black">{label}</h3></article>; }
function Stars() { return <div className="flex gap-1 text-[#f2af27]" role="img" aria-label="5 / 5">{[0, 1, 2, 3, 4].map((i) => <svg key={i} width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>)}</div>; }
function GalleryTile({ image, label, className = "" }: { image: string; label: string; className?: string }) { return <figure className={`group relative min-h-[190px] overflow-hidden rounded-[22px] ${className}`}><img src={image} alt={label} className="absolute inset-0 h-full w-full object-cover object-center transition duration-500 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-[#182443]/75 via-transparent to-transparent" /><figcaption className="absolute bottom-4 left-4 text-sm font-black text-white">{label}</figcaption></figure>; }
function MomentIcon({ name, size = 28, stroke = 1.7, filled = false }: { name: string; size?: number; stroke?: number; filled?: boolean }) {
  const paths: Record<string, ReactNode> = {
    gift: <><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13" /><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" /><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
    heart: <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />,
    tree: <><path d="m17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z" /><path d="M12 22v-3" /></>,
    grid: <><rect width="7" height="7" x="3" y="3" rx="1.5" /><rect width="7" height="7" x="14" y="3" rx="1.5" /><rect width="7" height="7" x="14" y="14" rx="1.5" /><rect width="7" height="7" x="3" y="14" rx="1.5" /></>,
    image: <><path d="M16 5h6" /><path d="M19 2v6" /><path d="M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /><circle cx="9" cy="9" r="2" /></>,
    package: <><path d="m16 16 2 2 4-4" /><path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14" /><path d="m7.5 4.27 9 5.15" /><polyline points="3.29 7 12 12 20.71 7" /><line x1="12" x2="12" y1="22" y2="12" /></>,
    camera: <><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></>,
    pen: <><path d="M12 20h9" /><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" /></>,
    sparkles: <><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" /><path d="M20 3v4" /><path d="M22 5h-4" /><path d="M4 17v2" /><path d="M5 18H3" /></>,
    eye: <><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" /></>,
    shield: <><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /><path d="m9 12 2 2 4-4" /></>,
    quote: <><path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z" /><path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z" /></>,
    home: <><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}