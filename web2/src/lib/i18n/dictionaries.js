const es = {
  nav: {
    historia: 'Historia',
    servicios: 'Servicios',
    proceso: 'Proceso',
    procesoTitle: 'Cómo trabajamos',
    cotizar: 'Cotizar',
    contacto: 'Contacto',
    equipo: 'Equipo',
    tracking: 'Tracking',
    stacking: 'Stacking',
    openMenu: 'Abrir menú',
    closeMenu: 'Cerrar menú',
    homeAria: 'ASLI - Inicio',
  },
  theme: {
    toLight: 'Cambiar a modo claro',
    toDark: 'Cambiar a modo oscuro',
  },
  locale: {
    switchToEn: 'Switch to English',
    switchToEs: 'Cambiar a español',
  },
  dolar: {
    title: 'Dólar observado · hora Chile',
    withValue: (valor, fecha, hora) =>
      `Dólar observado ${valor} pesos. ${fecha} ${hora}`,
    onlyTime: (fecha, hora) => `Hora Chile ${fecha} ${hora}`,
  },
  hero: {
    label: 'Asesoría logística · Curicó, Maule',
    titleBefore: 'Asesoría logística para',
    titleAccent: 'exportar e importar',
    bodyMobile:
      'ASLI en Curicó: exportación de fruta fresca, importación de mercancías, contenedores, aéreo y marítimo — con documentación, navieras y aduanas.',
    bodyDesktop:
      'En tu operación, ASLI está en cada paso. Acompañamos a exportadores, importadores y PYMEs — sobre todo del agro — en fruta fresca, contenedores, carga aérea y marítima: documentación, navieras, aduanas y seguimiento desde Curicó, Maule.',
    ctaServices: 'Ver servicios',
    ctaQuote: 'Cotizar',
    imageAlt: 'Oficinas ASLI en Curicó',
    imageCaption: 'Curicó · Maule',
    imageSub: 'Nuestra base operativa',
  },
  stats: {
    title: 'Trayectoria que respalda cada operación',
    subtitle:
      'Desde 2021 trabajamos con exportadores e importadores que necesitan control, cercanía y una logística que no se trabe en temporada alta.',
    founded: 'Año de fundación',
    lines: 'Líneas de servicio',
    carriers: 'Navieras y aerolíneas',
    connected: 'Operación conectada',
  },
  historia: {
    label: 'Nuestra historia',
    titleBefore: 'Nacimos en Curicó para',
    titleAccent: 'acercar la logística grande',
    titleAfter: 'a quien exporta e importa de verdad',
    lead:
      'ASLI — Asesorías y Servicios Logísticos Integrales — se fundó en Curicó en 2021 con una convicción simple: la PyME agroexportadora merece el mismo estándar operativo que las grandes compañías, sin perder cercanía ni claridad.',
    imageAlt: 'Oficinas ASLI en Curicó',
    imageCaption: 'Curicó · Región del Maule · Chile',
    quote:
      '“Asesorar, acompañar y respaldar a los exportadores, ayudándolos a operar con el mismo estándar de las grandes compañías.”',
    quoteAuthor: '— Mario Basaez, Fundador y Gerente General',
    p1: 'En el camino vimos un problema recurrente: para muchos productores y exportadores medianos, la logística no es solo un costo — es la barrera que frena el crecimiento. Documentación confusa, tiempos poco claros y poca persona a quien llamar cuando algo se complica.',
    p2: 'Por eso ASLI existe como equipo cercano y experto: explicamos en lenguaje claro, armamos la ruta multimodal (marítimo, aéreo o terrestre), cuidamos aduanas y certificados, y hacemos seguimiento hasta el destino. Especialmente en fruta fresca y congelada, donde cada hora cuenta.',
    p3: 'Hoy seguimos en Curicó, conectados con navieras, aerolíneas y aliados del agro-exportador, con la misma promesa de siempre: operación seria, trato humano y respuestas cuando las necesitas.',
    chipFounded: 'Fundación',
    chipOrigin: 'Origen',
    chipClose: 'Cercanía',
  },
  servicios: {
    label: 'Lo que hacemos por ti',
    title: 'Servicios logísticos con acompañamiento real',
    subtitleMobile:
      'Asesoría, multimodal y aduanas: armamos la operación completa para que te enfoques en tu negocio.',
    subtitleDesktop:
      'Desde la asesoría de exportación e importación hasta el transporte multimodal y la gestión aduanera: armamos la operación completa para que puedas enfocarte en tu negocio, no en perseguir papeles o navieras.',
    learnMore: 'Conocer más',
    viewAll: 'Ver todos los servicios',
    quoteNow: 'Cotizar ahora',
    items: {
      1: {
        titulo: 'Asesoría En Exportaciones',
        descripcion:
          'Te acompañamos de punta a punta: armamos la documentación, coordinamos con navieras y aduanas, y dejamos la operación lista para que tu carga salga sin sorpresas.',
        alt: 'Asesoría en exportaciones ASLI — documentación, navieras y aduanas',
      },
      2: {
        titulo: 'Asesoría En Importaciones',
        descripcion:
          'Traemos tu producto con orden: trámites aduaneros, tiempos reales y coordinación logística para que sepas qué esperar en cada etapa del ingreso.',
        alt: 'Asesoría en importaciones ASLI — ingreso de mercancías a Chile',
      },
      3: {
        titulo: 'Asesoría Documental',
        descripcion:
          'Certificados, permisos y papelería aduanera sin laberinto. Revisamos requisitos y te guiamos para cumplir normativa sin perder días valiosos.',
        alt: 'Asesoría documental y papelería aduanera ASLI',
      },
      4: {
        titulo: 'Transporte Marítimo',
        descripcion:
          'Conectamos tu carga con las principales navieras del mundo, eligiendo ruta y servicio según plazo, tipo de producto y presupuesto.',
        alt: 'Transporte marítimo y coordinación naviera ASLI',
      },
      5: {
        titulo: 'Transporte Aéreo',
        descripcion:
          'Para cargas urgentes o de alto valor: opciones aéreas con aerolíneas confiables y seguimiento cercano hasta la entrega.',
        alt: 'Transporte aéreo de carga — importaciones y exportaciones ASLI',
      },
      6: {
        titulo: 'Transporte Terrestre',
        descripcion:
          'Movemos tu carga desde y hacia puertos y aeropuertos con una red terrestre confiable, coordinada con el resto de la operación.',
        alt: 'Transporte terrestre hacia puertos y aeropuertos — ASLI',
      },
      7: {
        titulo: 'Gestión de Contenedores',
        descripcion:
          'Administramos contenedores con foco en espacio, costo y tiempos de despacho, para que no se te vaya la rentabilidad en detalles operativos.',
        alt: 'Gestión e importación de contenedores ASLI',
      },
      8: {
        titulo: 'Servicios Aduaneros',
        descripcion:
          'Tramitación aduanera completa y cumplimiento normativo, con el objetivo de agilizar importaciones y exportaciones sin improvisar.',
        alt: 'Servicios aduaneros ASLI para importaciones y exportaciones',
      },
      9: {
        titulo: 'Asesoría Logística Integral',
        descripcion:
          'Una sola conversación para armar la solución completa: multimodal, documental y operativa, adaptada a tu temporada y a tu tipo de carga.',
        alt: 'Asesoría logística integral ASLI en Curicó, Maule',
      },
    },
  },
  proceso: {
    label: 'Cómo trabajamos',
    title: 'Un método simple, con personas detrás',
    subtitleMobile: 'Te acompañamos desde la primera conversación hasta que la carga llega.',
    subtitleDesktop:
      'No entregamos una cotización y desaparecemos. Te acompañamos desde la primera conversación hasta que la carga llega: con criterio, plazos claros y alguien a quien llamar.',
    steps: [
      {
        num: '01',
        title: 'Escuchamos',
        desc: 'Partimos por ti: qué cargas, a dónde van, en qué plazos y qué restricciones tienes. Traducimos eso a un plan operable, sin tecnicismos de más.',
      },
      {
        num: '02',
        title: 'Coordinamos',
        desc: 'Armamos la ruta multimodal — naviera, aérea o terrestre — con documentación, aduanas y proveedores alineados. Tú sabes qué sigue en cada etapa.',
      },
      {
        num: '03',
        title: 'Operamos',
        desc: 'Ejecutamos y hacemos seguimiento hasta el destino. Cuando algo se mueve o se complica, tienes contacto directo con alguien que conoce tu operación.',
      },
    ],
  },
  confianza: {
    label: 'Red operativa',
    title: 'Confianza que se construye operación a operación',
    subtitleMobile: 'Clientes del agro, alianzas y las principales navieras y aerolíneas del sector.',
    subtitleDesktop:
      'Trabajamos con clientes del agro-exportador, alianzas institucionales y las principales navieras y aerolíneas del sector. Esa red no es decoración: es la base para que tu carga avance con respaldo real.',
    clients: 'Clientes',
    partners: 'Somos parte de',
    carriers: 'Navieras y aerolíneas',
  },
  cotizar: {
    label: 'Cotización',
    title: 'Cotiza tu próxima operación',
    body: 'Cuéntanos origen, destino y tipo de carga. Te respondemos con una propuesta concreta para exportación, importación o transporte.',
    ctaMail: 'Solicitar cotización',
    ctaWhatsapp: 'WhatsApp',
    mailSubject: 'Solicitud de cotización',
    mailBody:
      'Hola ASLI,\n\nMe gustaría cotizar una operación.\n\nTipo (exportación / importación / otro):\nOrigen:\nDestino:\nCarga / contenedor:\nFecha estimada:\n\nGracias.',
    waText: 'Hola ASLI, me gustaría cotizar una operación logística.',
  },
  contacto: {
    label: 'Contacto',
    title: 'Hablemos de tu próxima operación',
    body: 'Cuéntanos qué necesitas exportar o importar. En la primera conversación revisamos tu caso y te proponemos un camino concreto — sin compromiso.',
    addressLabel: 'Dirección',
    contactLabel: 'Contacto',
    whatsapp: 'Escribir por WhatsApp',
    openMaps: 'Abrir en Google Maps',
    openMapsAria: 'Abrir ubicación de ASLI en Google Maps',
    mapAlt: 'Mapa de ASLI en Longitudinal Sur Km. 186, Curicó',
  },
  footer: {
    tagline: 'Logística y Comercio Exterior',
    slogan: 'Nuestro límite es tu destino',
    services: 'Servicios',
    company: 'Empresa',
    exportFruit: 'Exportación de fruta fresca',
    importGoods: 'Importación de mercancías',
    smeAdvice: 'Asesoría a PYMEs y exportadores',
    containers: 'Gestión de contenedores',
    airCargo: 'Carga aérea',
    seaCargo: 'Transporte marítimo',
    customs: 'Servicios aduaneros',
    stacking: 'Stacking navieras',
    team: 'Equipo especializado',
    quoteTool: 'Cotizador',
    ourStory: 'Nuestra historia',
    tracking: 'Tracking de cargas',
    contact: 'Contacto',
    presentation: 'Presentación',
    integralAdvice: 'Asesoría logística integral',
    rights: 'Todos los derechos reservados.',
    visit: 'Visítanos',
    contactUs: 'Contáctanos',
    mailSubject: 'Consulta desde el sitio web',
    mailBody: 'Hola, me gustaría obtener más información sobre sus servicios.',
  },
}

const en = {
  nav: {
    historia: 'History',
    servicios: 'Services',
    proceso: 'Process',
    procesoTitle: 'How we work',
    cotizar: 'Get a quote',
    contacto: 'Contact',
    equipo: 'Team',
    tracking: 'Tracking',
    stacking: 'Stacking',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    homeAria: 'ASLI - Home',
  },
  theme: {
    toLight: 'Switch to light mode',
    toDark: 'Switch to dark mode',
  },
  locale: {
    switchToEn: 'Switch to English',
    switchToEs: 'Cambiar a español',
  },
  dolar: {
    title: 'Observed USD · Chile time',
    withValue: (valor, fecha, hora) => `Observed USD ${valor} CLP. ${fecha} ${hora}`,
    onlyTime: (fecha, hora) => `Chile time ${fecha} ${hora}`,
  },
  hero: {
    label: 'Logistics advisory · Curicó, Maule',
    titleBefore: 'Logistics advisory to',
    titleAccent: 'export and import',
    bodyMobile:
      'ASLI in Curicó: fresh fruit exports, merchandise imports, containers, air and ocean freight — with documentation, carriers and customs.',
    bodyDesktop:
      'In your operation, ASLI is with you at every step. We support exporters, importers and SMEs — especially agribusiness — with fresh fruit, containers, air and ocean freight: documentation, carriers, customs and tracking from Curicó, Maule.',
    ctaServices: 'View services',
    ctaQuote: 'Get a quote',
    imageAlt: 'ASLI offices in Curicó',
    imageCaption: 'Curicó · Maule',
    imageSub: 'Our operating base',
  },
  stats: {
    title: 'A track record behind every shipment',
    subtitle:
      'Since 2021 we work with exporters and importers who need control, closeness and logistics that hold up in peak season.',
    founded: 'Year founded',
    lines: 'Service lines',
    carriers: 'Carriers & airlines',
    connected: 'Connected operations',
  },
  historia: {
    label: 'Our story',
    titleBefore: 'We started in Curicó to',
    titleAccent: 'bring big-league logistics',
    titleAfter: 'to those who truly export and import',
    lead:
      'ASLI — Asesorías y Servicios Logísticos Integrales — was founded in Curicó in 2021 with a simple belief: agribusiness SMEs deserve the same operating standard as large companies, without losing closeness or clarity.',
    imageAlt: 'ASLI offices in Curicó',
    imageCaption: 'Curicó · Maule Region · Chile',
    quote:
      '“Advise, accompany and back exporters, helping them operate with the same standard as large companies.”',
    quoteAuthor: '— Mario Basaez, Founder and General Manager',
    p1: 'Along the way we saw a recurring problem: for many mid-sized growers and exporters, logistics is not just a cost — it is the barrier that stalls growth. Confusing paperwork, unclear timelines and few people to call when something goes wrong.',
    p2: 'That is why ASLI exists as a close, expert team: we explain in plain language, build the multimodal route (ocean, air or road), handle customs and certificates, and track cargo to destination — especially fresh and frozen fruit, where every hour counts.',
    p3: 'Today we remain in Curicó, connected with carriers, airlines and agribusiness partners, with the same promise as always: serious operations, human treatment and answers when you need them.',
    chipFounded: 'Founded',
    chipOrigin: 'Origin',
    chipClose: 'Closeness',
  },
  servicios: {
    label: 'What we do for you',
    title: 'Logistics services with real support',
    subtitleMobile:
      'Advisory, multimodal freight and customs: we assemble the full operation so you can focus on your business.',
    subtitleDesktop:
      'From export and import advisory to multimodal transport and customs management: we assemble the full operation so you can focus on your business — not chasing paperwork or carriers.',
    learnMore: 'Learn more',
    viewAll: 'View all services',
    quoteNow: 'Get a quote now',
    items: {
      1: {
        titulo: 'Export Advisory',
        descripcion:
          'We support you end to end: we prepare documentation, coordinate with carriers and customs, and leave the operation ready so your cargo ships without surprises.',
        alt: 'ASLI export advisory — documentation, carriers and customs',
      },
      2: {
        titulo: 'Import Advisory',
        descripcion:
          'We bring your product in with order: customs procedures, realistic timelines and logistics coordination so you know what to expect at every step.',
        alt: 'ASLI import advisory — goods entering Chile',
      },
      3: {
        titulo: 'Documentation Advisory',
        descripcion:
          'Certificates, permits and customs paperwork without the maze. We review requirements and guide you to stay compliant without losing valuable days.',
        alt: 'ASLI documentation and customs paperwork advisory',
      },
      4: {
        titulo: 'Ocean Freight',
        descripcion:
          'We connect your cargo with leading global carriers, choosing route and service by deadline, product type and budget.',
        alt: 'ASLI ocean freight and carrier coordination',
      },
      5: {
        titulo: 'Air Freight',
        descripcion:
          'For urgent or high-value cargo: air options with trusted airlines and close tracking through delivery.',
        alt: 'ASLI air cargo — imports and exports',
      },
      6: {
        titulo: 'Road Transport',
        descripcion:
          'We move your cargo to and from ports and airports with a reliable road network, coordinated with the rest of the operation.',
        alt: 'ASLI road transport to ports and airports',
      },
      7: {
        titulo: 'Container Management',
        descripcion:
          'We manage containers with focus on space, cost and dispatch times, so profitability is not lost in operational details.',
        alt: 'ASLI container management and imports',
      },
      8: {
        titulo: 'Customs Services',
        descripcion:
          'Full customs processing and regulatory compliance, aiming to speed up imports and exports without improvising.',
        alt: 'ASLI customs services for imports and exports',
      },
      9: {
        titulo: 'Integral Logistics Advisory',
        descripcion:
          'One conversation to build the complete solution: multimodal, documentary and operational, tailored to your season and cargo type.',
        alt: 'ASLI integral logistics advisory in Curicó, Maule',
      },
    },
  },
  proceso: {
    label: 'How we work',
    title: 'A simple method, with people behind it',
    subtitleMobile: 'We stay with you from the first conversation until the cargo arrives.',
    subtitleDesktop:
      'We do not hand over a quote and disappear. We stay with you from the first conversation until the cargo arrives — with judgment, clear timelines and someone to call.',
    steps: [
      {
        num: '01',
        title: 'We listen',
        desc: 'We start with you: what cargo, where it goes, which deadlines and constraints you have. We turn that into an operable plan, without unnecessary jargon.',
      },
      {
        num: '02',
        title: 'We coordinate',
        desc: 'We build the multimodal route — ocean, air or road — with documentation, customs and suppliers aligned. You know what comes next at every stage.',
      },
      {
        num: '03',
        title: 'We operate',
        desc: 'We execute and track through to destination. When something moves or gets complicated, you have direct contact with someone who knows your operation.',
      },
    ],
  },
  confianza: {
    label: 'Operating network',
    title: 'Trust built shipment by shipment',
    subtitleMobile: 'Agribusiness clients, partnerships and leading carriers and airlines.',
    subtitleDesktop:
      'We work with agribusiness clients, institutional partners and leading carriers and airlines. That network is not decoration: it is the base so your cargo moves with real backing.',
    clients: 'Clients',
    partners: 'We are part of',
    carriers: 'Carriers & airlines',
  },
  cotizar: {
    label: 'Quote',
    title: 'Get a quote for your next shipment',
    body: 'Tell us origin, destination and cargo type. We reply with a concrete proposal for export, import or transport.',
    ctaMail: 'Request a quote',
    ctaWhatsapp: 'WhatsApp',
    mailSubject: 'Quote request',
    mailBody:
      'Hello ASLI,\n\nI would like a quote for an operation.\n\nType (export / import / other):\nOrigin:\nDestination:\nCargo / container:\nEstimated date:\n\nThank you.',
    waText: 'Hello ASLI, I would like a quote for a logistics operation.',
  },
  contacto: {
    label: 'Contact',
    title: "Let's talk about your next shipment",
    body: 'Tell us what you need to export or import. In the first conversation we review your case and propose a concrete path — no commitment.',
    addressLabel: 'Address',
    contactLabel: 'Contact',
    whatsapp: 'Message on WhatsApp',
    openMaps: 'Open in Google Maps',
    openMapsAria: 'Open ASLI location in Google Maps',
    mapAlt: 'Map of ASLI at Longitudinal Sur Km. 186, Curicó',
  },
  footer: {
    tagline: 'Logistics and Foreign Trade',
    slogan: 'Our limit is your destination',
    services: 'Services',
    company: 'Company',
    exportFruit: 'Fresh fruit exports',
    importGoods: 'Merchandise imports',
    smeAdvice: 'SME and exporter advisory',
    containers: 'Container management',
    airCargo: 'Air cargo',
    seaCargo: 'Ocean freight',
    customs: 'Customs services',
    stacking: 'Carrier stacking',
    team: 'Specialized team',
    quoteTool: 'Quote tool',
    ourStory: 'Our story',
    tracking: 'Cargo tracking',
    contact: 'Contact',
    presentation: 'Presentation',
    integralAdvice: 'Integral logistics advisory',
    rights: 'All rights reserved.',
    visit: 'Visit us',
    contactUs: 'Contact us',
    mailSubject: 'Inquiry from the website',
    mailBody: 'Hello, I would like more information about your services.',
  },
}

export const dictionaries = { es, en }
