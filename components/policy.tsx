import { SiteFooter, SiteHeader } from "./site";

export function PolicyPage({ type }: { type: "privacy" | "cookies" | "terms" }) {
  const content = {
    privacy: {
      eyebrow: "TRANSPARENCIA Y SEGURIDAD",
      title: "Política de Privacidad",
      intro: "En Celebra Momentos nos tomamos muy en serio la protección de tus datos personales y los de tus seres queridos. A continuación detallamos cómo recopilamos, utilizamos y protegemos tu información conforme al Reglamento General de Protección de Datos (RGPD UE 2016/679) y la Ley Orgánica de Protección de Datos y Garantía de Derechos Digitales (LOPDGDD 3/2018).",
      sections: [
        [
          "1. Responsable del Tratamiento de Datos",
          "El responsable del tratamiento de los datos recabados en este sitio web es Celebra Momentos S.L., con domicilio fiscal en España y dirección de correo electrónico de contacto: celebramomentos@outlook.com. Nos comprometemos a garantizar la confidencialidad, integridad y disponibilidad de tus datos personales en todo momento.",
        ],
        [
          "2. Datos que recopilamos y finalidad",
          "Recopilamos únicamente la información necesaria para gestionar tus pedidos personalizados y ofrecerte la mejor experiencia: datos identificativos y de contacto (nombre, apellidos, correo electrónico, teléfono), datos de entrega (dirección postal completa del comprador y del destinatario en caso de envío directo), y contenidos personalizados (fotografías subidas y dedicatorias redactadas para la impresión de las postales). La finalidad exclusiva es la preparación, impresión, empaquetado y envío de tu pedido.",
        ],
        [
          "3. Base legal para el tratamiento",
          "La base jurídica que legitima el tratamiento de tus datos es la ejecución del contrato de compraventa y personalización del producto solicitado por el usuario, así como el consentimiento explícito otorgado al cargar imágenes y redactar dedicatorias para su estampación.",
        ],
        [
          "4. Conservación de imágenes y datos personales",
          "Las fotografías y textos proporcionados para la personalización de las postales y stickers se conservan únicamente durante el tiempo estrictamente necesario para la producción, envío y atención a posibles incidencias o reclamaciones posventa (un plazo máximo de 30 días tras la entrega), transcurrido el cual son eliminados de forma segura de nuestros servidores de producción.",
        ],
        [
          "5. Destinatarios y cesión a terceros",
          "No vendemos ni cedemos tus datos a terceros para fines publicitarios. Tus datos de envío únicamente se comunican a los operadores logísticos y empresas de mensajería (Correos, SEUR, MRW u homologados) estrictamente para hacer posible la entrega física de la tarjeta en el domicilio indicado.",
        ],
        [
          "6. Tus Derechos ARCO+",
          "Puedes ejercer en cualquier momento tus derechos de acceso, rectificación, supresión (derecho al olvido), limitación del tratamiento, portabilidad y oposición enviando un correo electrónico a celebramomentos@outlook.com acompañando copia de tu documento de identidad. Asimismo, tienes derecho a presentar una reclamación ante la Agencia Española de Protección de Datos (AEPD) si consideras que tus derechos han sido vulnerados.",
        ],
      ],
    },
    cookies: {
      eyebrow: "CONTROL Y ELECCIÓN",
      title: "Política de Cookies",
      intro: "Esta web utiliza cookies y tecnologías similares para garantizar el correcto funcionamiento del configurador interactivo, recordar tus preferencias de diseño y optimizar tu experiencia de navegación, conforme a la Directiva e-Privacy y el artículo 22 de la Ley de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE).",
      sections: [
        [
          "1. ¿Qué son las cookies?",
          "Una cookie es un pequeño archivo de texto que un sitio web descarga en tu dispositivo (ordenador, tableta o smartphone) cuando lo visitas. Permiten que la página web reconozca tu dispositivo, recuerde tus acciones o elecciones (como el idioma, la sesión de personalización o los artículos en la cesta) para que no tengas que volver a configurarlos cada vez que vuelves.",
        ],
        [
          "2. Cookies técnicas y necesarias (Exentas de consentimiento)",
          "Son aquellas indispensables para el funcionamiento del sitio y la prestación del servicio expresamente solicitado por el usuario. En Celebra Momentos incluyen: cookies de sesión para mantener el estado del editor de tarjetas, la persistencia de los artículos añadidos al carrito de compra y la configuración de seguridad.",
        ],
        [
          "3. Cookies analíticas y de preferencias (Opcionales)",
          "Nos permiten cuantificar el número de usuarios y realizar la medición y análisis estadístico del uso que hacen del configurador. Estas cookies se activan únicamente si el usuario presta su consentimiento expreso mediante el banner de cookies disponible en su primera visita.",
        ],
        [
          "4. Cómo configurar o desactivar las cookies en tu navegador",
          "Puedes permitir, bloquear o eliminar las cookies instaladas en tu equipo mediante la configuración de las opciones de tu navegador de Internet (Chrome, Firefox, Safari, Edge). Ten en cuenta que si deshabilitas las cookies técnicas necesarias, algunas funciones del configurador y de la cesta de la compra podrían no funcionar con normalidad.",
        ],
      ],
    },
    terms: {
      eyebrow: "CONDICIONES DE CONTRATACIÓN",
      title: "Términos y Condiciones Generales",
      intro: "Las presentes Condiciones Generales regulan la compra de tarjetas postales personalizadas y extras a través del sitio web Celebra Momentos. Al realizar un pedido a través de nuestra plataforma, aceptas de manera plena y sin reservas estas condiciones contractuales.",
      sections: [
        [
          "1. Identidad y Objeto del Servicio",
          "Celebra Momentos presta servicios de diseño interactivo, impresión personalizada de alta calidad en papeles prémium y envío de tarjetas, calendarios, arte de pared e imanes, así como complementos opcionales (stickers personalizados y mensajes impresos en sobres).",
        ],
        [
          "2. Responsabilidad sobre los Contenidos del Cliente",
          "El cliente declara y garantiza ser titular legítimo o contar con las autorizaciones oportunas sobre los textos, nombres, dedicatorias y fotografías que carga en el configurador. Queda terminantemente prohibido encargar la impresión de contenidos difamatorios, ilícitos, ofensivos o que vulneren derechos de propiedad intelectual o de imagen de terceros.",
        ],
        [
          "3. Precios, Envíos y Gastos de Entrega",
          "Todos los precios mostrados en el sitio web incluyen el Impuesto sobre el Valor Añadido (IVA) vigente en España. Los gastos de envío se calculan según el importe del pedido: en compras de importe igual o superior a 35,00 € el envío es GRATUITO. Para pedidos inferiores a 35,00 €: entrega estándar a 5,00 € y entrega express a 8,00 €.",
        ],
        [
          "4. Plazos de Preparación y Entrega",
          "Las tarjetas se imprimen y preparan con dedicación artesanal en un plazo de 24 a 48 horas laborables. Los envíos estándar suelen entregarse en un plazo estimado de 3 a 5 días laborables, mientras que la modalidad express se entrega en 1 a 2 días laborables a través de mensajería urgente.",
        ],
        [
          "5. Política de Devoluciones y Derecho de Desistimiento",
          "De conformidad con el artículo 103.c) del Real Decreto Legislativo 1/2007, de 16 de noviembre, por el que se aprueba el texto refundido de la Ley General para la Defensa de los Consumidores y Usuarios, el derecho legal de desistimiento no es aplicable al suministro de bienes confeccionados conforme a las especificaciones del consumidor o claramente personalizados (tarjetas impresas con tus fotos y textos propios). No obstante, ante cualquier defecto de fabricación, rotura o error atribuible a nuestra imprenta, Celebra Momentos procederá a la reimpresión y reenvío inmediato sin coste alguno para el cliente.",
        ],
        [
          "6. Legislación aplicable y Jurisdicción",
          "Las relaciones contractuales entre Celebra Momentos y los usuarios se rigen por la legislación española. Para la resolución de cualquier controversia, las partes se someten a los juzgados y tribunales del domicilio del consumidor o usuario.",
        ],
      ],
    },
  }[type];

  return (
    <>
      <SiteHeader />
      <main className="bg-[#fffaf5] py-16 md:py-24">
        <div className="container max-w-[860px]">
          <p className="text-[10px] font-black tracking-[.2em] text-[#ee5264]">{content.eyebrow}</p>
          <h1 className="serif mt-3 text-4xl font-bold tracking-[-.04em] sm:text-6xl text-[#182443]">{content.title}</h1>
          <p className="mt-5 max-w-[720px] text-sm leading-7 text-[#737b90]">{content.intro}</p>
          <div className="mt-12 space-y-8 rounded-[24px] border border-[#eadbd3] bg-white p-6 sm:p-10 shadow-sm">
            {content.sections.map(([title, body]) => (
              <section key={title} className="border-b border-[#f3eae4] pb-6 last:border-b-0 last:pb-0">
                <h2 className="text-lg font-black text-[#182443]">{title}</h2>
                <p className="mt-2 text-sm leading-7 text-[#737b90]">{body}</p>
              </section>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
