/**
 * Landings SEO por keyword — una URL = una intención de búsqueda.
 * Usadas por pages/[slug].jsx y el sitemap.
 */
export const landings = [
  {
    slug: 'exportacion-fruta-fresca',
    priority: '1.0',
    title: 'Exportación de fruta fresca Chile | ASLI Curicó',
    description:
      'Asesoría y logística para exportación de fruta fresca y congelada desde Chile. Documentación, navieras, aduanas y seguimiento desde Curicó, Maule.',
    h1: 'Exportación de fruta fresca desde Chile',
    label: 'Agroexportación',
    lead:
      'Coordinamos la exportación de fruta fresca y congelada con foco en tiempos de temporada, cadena de frío y documentación sin sorpresas.',
    image: '/img/expo.webp',
    imageAlt: 'Exportación de fruta fresca — logística ASLI',
    serviceType: 'Exportación de fruta fresca',
    related: [
      'asesoria-exportadores-pymes',
      'transporte-maritimo',
      'servicios-aduaneros',
    ],
    sections: [
      {
        heading: 'Logística agroexportadora con acompañamiento real',
        body: [
          'En ASLI acompañamos a exportadoras de fruta del Maule y de Chile en cada etapa: booking naviero, documentación, coordinación aduanera y seguimiento hasta el destino.',
          'Trabajamos con productos frescos y congelados, alineando plazos de stacking, requisitos fitosanitarios y condiciones de contenedor reefer para proteger la calidad de la carga.',
        ],
      },
      {
        heading: 'Qué incluye el servicio',
        body: [
          'Armado de la operación de exportación, coordinación con navieras, gestión documental y apoyo en trámites aduaneros.',
          'Seguimiento operativo para que sepas el estado de tu carga y puedas planificar packing, cosecha y despacho con información clara.',
        ],
      },
      {
        heading: 'Para quién es',
        body: [
          'Exportadoras de fruta fresca y congelada, packings y PYMEs agroexportadoras que necesitan un equipo cercano en Curicó, no solo un intermediario remoto.',
        ],
      },
    ],
    faqs: [
      {
        question: '¿ASLI exporta fruta fresca desde Curicó?',
        answer:
          'Sí. Operamos desde Curicó, Región del Maule, y coordinamos exportaciones de fruta fresca y congelada hacia destinos internacionales, con documentación, navieras y aduanas.',
      },
      {
        question: '¿Manejan contenedores reefer para fruta?',
        answer:
          'Sí. Coordinamos contenedores reefer y la operación multimodal asociada para mantener la cadena de frío según el tipo de producto y destino.',
      },
      {
        question: '¿Pueden asesorar a una PYME que recién empieza a exportar?',
        answer:
          'Sí. Acompañamos a exportadores nuevos y establecidos: explicamos requisitos, armamos la documentación y coordinamos la operación de punta a punta.',
      },
    ],
  },
  {
    slug: 'asesoria-exportadores-pymes',
    priority: '0.95',
    title: 'Asesoría a exportadores y PYMEs | ASLI',
    description:
      'Asesoría logística para PYMEs y exportadores en Chile: exportación, importación, documentación y comercio exterior desde Curicó, Maule.',
    h1: 'Asesoría logística para PYMEs y exportadores',
    label: 'Asesoría comercial',
    lead:
      'Acompañamos a pequeñas y medianas empresas y a exportadores que necesitan claridad operativa, no jerga ni demoras.',
    image: '/img/logistica.webp',
    imageAlt: 'Asesoría logística a PYMEs y exportadores — ASLI',
    serviceType: 'Asesoría logística a exportadores y PYMEs',
    related: [
      'exportacion-fruta-fresca',
      'importacion-mercancias-chile',
      'asesoria-logistica-integral',
    ],
    sections: [
      {
        heading: 'Asesoría pensada para quien opera de verdad',
        body: [
          'Muchas PYMEs pierden tiempo y margen entre papeles, navieras y aduanas. En ASLI traducimos el proceso a pasos concretos: qué falta, cuándo sale y quién responde.',
          'Asesoramos exportaciones e importaciones con un equipo local en Curicó que conoce la realidad del agro y del comercio exterior chileno.',
        ],
      },
      {
        heading: 'Qué resolvemos contigo',
        body: [
          'Definición de ruta y modalidad (marítimo, aéreo o terrestre), armado documental, coordinación con líneas y seguimiento de la operación.',
          'También orientamos a exportadores que buscan ordenar su primera temporada o escalar sin improvisar en cada booking.',
        ],
      },
    ],
    faqs: [
      {
        question: '¿Dan asesoría a PYMEs que aún no exportan?',
        answer:
          'Sí. Te ayudamos a entender requisitos, armar la documentación y coordinar la primera operación con acompañamiento cercano.',
      },
      {
        question: '¿La asesoría incluye importaciones?',
        answer:
          'Sí. Asesoramos tanto exportaciones como importaciones de mercancías, con foco en tiempos reales y cumplimiento aduanero.',
      },
    ],
  },
  {
    slug: 'importacion-mercancias-chile',
    priority: '0.95',
    title: 'Importación de mercancías a Chile | ASLI',
    description:
      'Asesoría en importación de mercancías a Chile: trámites aduaneros, contenedores, coordinación logística y seguimiento desde Curicó.',
    h1: 'Importación de mercancías a Chile',
    label: 'Importaciones',
    lead:
      'Traemos tu producto con orden: aduanas, tiempos reales y coordinación logística para que sepas qué esperar en cada etapa del ingreso.',
    image: '/img/impo.webp',
    imageAlt: 'Importación de mercancías a Chile — ASLI',
    serviceType: 'Importación de mercancías',
    related: [
      'gestion-contenedores',
      'transporte-aereo-carga',
      'servicios-aduaneros',
    ],
    sections: [
      {
        heading: 'Importar sin laberinto',
        body: [
          'Coordinamos la importación de mercancías a Chile: desde la planificación del embarque hasta el ingreso, con foco en documentación, aduanas y transporte asociado.',
          'Te explicamos plazos realistas y el estado de la carga para que tu empresa pueda planificar stock, producción o distribución.',
        ],
      },
      {
        heading: 'Cobertura del servicio',
        body: [
          'Importaciones marítimas y aéreas, gestión de contenedores, apoyo documental y coordinación con agentes y líneas según el tipo de carga.',
        ],
      },
    ],
    faqs: [
      {
        question: '¿ASLI gestiona importaciones a Chile?',
        answer:
          'Sí. Asesoramos y coordinamos importaciones de mercancías, incluyendo trámites aduaneros, contenedores y seguimiento operativo.',
      },
      {
        question: '¿Puedo importar por vía aérea y marítima?',
        answer:
          'Sí. Evaluamos la mejor modalidad según urgencia, tipo de producto y presupuesto, y coordinamos la operación completa.',
      },
    ],
  },
  {
    slug: 'gestion-contenedores',
    priority: '0.9',
    title: 'Gestión e importación de contenedores | ASLI',
    description:
      'Gestión de contenedores para exportación e importación: espacio, costos, tiempos de despacho y coordinación logística en Chile.',
    h1: 'Gestión e importación de contenedores',
    label: 'Contenedores',
    lead:
      'Administramos contenedores con foco en espacio, costo y tiempos de despacho, para que la rentabilidad no se escape en detalles operativos.',
    image: '/img/container.webp',
    imageAlt: 'Gestión de contenedores — logística ASLI',
    serviceType: 'Gestión de contenedores',
    related: [
      'importacion-mercancias-chile',
      'transporte-maritimo',
      'exportacion-fruta-fresca',
    ],
    sections: [
      {
        heading: 'Contenedores sin improvisación',
        body: [
          'Coordinamos disponibilidad, tipo de equipo (dry o reefer), stacking y despacho asociados a tu exportación o importación.',
          'El objetivo es reducir demoras, costos ocultos y fricción entre packing, transporte terrestre y naviera.',
        ],
      },
      {
        heading: 'Ideal si',
        body: [
          'Importas o exportas carga containerizada y necesitas un interlocutor que ordene la operación y te avise a tiempo.',
        ],
      },
    ],
    faqs: [
      {
        question: '¿Gestionan contenedores para fruta fresca?',
        answer:
          'Sí. Coordinamos contenedores reefer y la operación asociada para exportaciones de fruta fresca y congelada.',
      },
      {
        question: '¿Incluye importación de contenedores?',
        answer:
          'Sí. Apoyamos importaciones containerizadas con coordinación logística y seguimiento hasta el ingreso en Chile.',
      },
    ],
  },
  {
    slug: 'transporte-aereo-carga',
    priority: '0.9',
    title: 'Importaciones y exportaciones aéreas | ASLI',
    description:
      'Transporte aéreo de carga: importaciones y exportaciones aéreas con aerolíneas confiables y seguimiento cercano desde Chile.',
    h1: 'Importaciones y exportaciones aéreas',
    label: 'Carga aérea',
    lead:
      'Para cargas urgentes o de alto valor: opciones aéreas con aerolíneas confiables y seguimiento cercano hasta la entrega.',
    image: '/img/aereo.webp',
    imageAlt: 'Transporte aéreo de carga — importaciones y exportaciones ASLI',
    serviceType: 'Transporte aéreo de carga',
    related: [
      'importacion-mercancias-chile',
      'asesoria-exportadores-pymes',
      'transporte-maritimo',
    ],
    sections: [
      {
        heading: 'Cuando el tiempo manda',
        body: [
          'Coordinamos importaciones y exportaciones aéreas eligiendo servicio según plazo, tipo de producto y presupuesto.',
          'Ideal para muestras, carga de alto valor, reposición urgente o productos que no toleran los tiempos del marítimo.',
        ],
      },
      {
        heading: 'Qué incluye',
        body: [
          'Cotización y reserva aérea, coordinación documental y seguimiento operativo hasta la entrega o el traspaso a transporte terrestre.',
        ],
      },
    ],
    faqs: [
      {
        question: '¿Hacen exportaciones aéreas desde Chile?',
        answer:
          'Sí. Coordinamos exportaciones aéreas con aerolíneas confiables y acompañamiento operativo.',
      },
      {
        question: '¿También importaciones aéreas?',
        answer:
          'Sí. Gestionamos importaciones aéreas de mercancías con foco en tiempos y documentación.',
      },
    ],
  },
  {
    slug: 'transporte-maritimo',
    priority: '0.9',
    title: 'Transporte marítimo y coordinación naviera | ASLI',
    description:
      'Transporte marítimo y coordinación con navieras para exportaciones e importaciones desde Chile. Rutas, tarifas y seguimiento.',
    h1: 'Transporte marítimo y coordinación naviera',
    label: 'Marítimo',
    lead:
      'Conectamos tu carga con las principales navieras del mundo, eligiendo ruta y servicio según plazo, producto y presupuesto.',
    image: '/img/maritimo.webp',
    imageAlt: 'Transporte marítimo y navieras — ASLI',
    serviceType: 'Transporte marítimo',
    related: [
      'exportacion-fruta-fresca',
      'gestion-contenedores',
      'servicios-aduaneros',
    ],
    sections: [
      {
        heading: 'Navieras con criterio operativo',
        body: [
          'Negociamos y coordinamos servicios marítimos para exportaciones e importaciones, con mirada en ETD, tránsito, tipo de equipo y condiciones comerciales.',
          'Desde Curicó operamos con una red de líneas y partners para darte opciones reales, no solo una tarifa suelta.',
        ],
      },
    ],
    faqs: [
      {
        question: '¿Con qué navieras trabajan?',
        answer:
          'Coordinamos con las principales líneas internacionales según destino, temporada y tipo de carga. Te proponemos opciones concretas para tu operación.',
      },
      {
        question: '¿Incluyen seguimiento de la nave?',
        answer:
          'Sí. Puedes consultar tracking de cargas desde nuestro sitio y te acompañamos en el seguimiento operativo de la reserva.',
      },
    ],
  },
  {
    slug: 'servicios-aduaneros',
    priority: '0.85',
    title: 'Servicios aduaneros y documental | ASLI',
    description:
      'Servicios aduaneros y asesoría documental para importaciones y exportaciones en Chile. Certificados, permisos y cumplimiento normativo.',
    h1: 'Servicios aduaneros y asesoría documental',
    label: 'Aduanas',
    lead:
      'Tramitación aduanera y papelería sin laberinto: revisamos requisitos y te guiamos para cumplir normativa sin perder días valiosos.',
    image: '/img/aduana.webp',
    imageAlt: 'Servicios aduaneros y documentación — ASLI',
    serviceType: 'Servicios aduaneros',
    related: [
      'importacion-mercancias-chile',
      'exportacion-fruta-fresca',
      'asesoria-logistica-integral',
    ],
    sections: [
      {
        heading: 'Cumplimiento con agilidad',
        body: [
          'Apoyamos la gestión documental y aduanera asociada a tus importaciones y exportaciones, con el objetivo de reducir observaciones y demoras.',
          'Certificados, permisos y requisitos según destino o producto: te orientamos con lenguaje claro y plazos realistas.',
        ],
      },
    ],
    faqs: [
      {
        question: '¿ASLI hace trámites aduaneros?',
        answer:
          'Sí. Ofrecemos servicios aduaneros y asesoría documental para agilizar importaciones y exportaciones con cumplimiento normativo.',
      },
      {
        question: '¿Ayudan con certificación OEA o requisitos agro?',
        answer:
          'Contamos con equipo especializado en seguridad alimentaria y acompañamiento a exportadoras de frutas en cumplimiento normativo y certificación OEA.',
      },
    ],
  },
  {
    slug: 'asesoria-logistica-integral',
    priority: '0.85',
    title: 'Asesoría logística integral Curicó | ASLI',
    description:
      'Asesoría logística integral en Curicó, Maule: multimodal, documental y operativa para exportación e importación en Chile.',
    h1: 'Asesoría logística integral en Curicó, Maule',
    label: 'Logística integral',
    lead:
      'Una sola conversación para armar la solución completa: multimodal, documental y operativa, adaptada a tu temporada y tipo de carga.',
    image: '/img/logistica.webp',
    imageAlt: 'Asesoría logística integral ASLI en Curicó',
    serviceType: 'Asesoría logística integral',
    related: [
      'asesoria-exportadores-pymes',
      'transporte-maritimo',
      'transporte-aereo-carga',
    ],
    sections: [
      {
        heading: 'Todo el flujo, un solo equipo',
        body: [
          'En ASLI integramos asesoría de exportación e importación, transporte marítimo, aéreo y terrestre, contenedores y aduanas.',
          'Operamos desde Longitudinal Sur Km. 186, Curicó, con presencia en la Región del Maule y cobertura nacional para comercio exterior.',
        ],
      },
      {
        heading: 'Por qué Curicó',
        body: [
          'Estamos donde está el agro exportador: cerca de packings y productores, con respuesta rápida y acompañamiento presencial cuando la operación lo requiere.',
        ],
      },
    ],
    faqs: [
      {
        question: '¿Dónde está ASLI?',
        answer:
          'En Longitudinal Sur Km. 186, Curicó, Región del Maule, Chile. Atendemos de lunes a viernes de 09:00 a 18:00.',
      },
      {
        question: '¿Qué servicios logísticos ofrecen?',
        answer:
          'Asesoría en exportaciones e importaciones, transporte marítimo, aéreo y terrestre, gestión de contenedores, servicios aduaneros y asesoría logística integral.',
      },
    ],
  },
]

export const landingSlugs = landings.map((l) => l.slug)

export function getLanding(slug) {
  return landings.find((l) => l.slug === slug) || null
}

export function getRelatedLandings(slug, limit = 3) {
  const current = getLanding(slug)
  if (!current?.related?.length) {
    return landings.filter((l) => l.slug !== slug).slice(0, limit)
  }
  return current.related
    .map((s) => getLanding(s))
    .filter(Boolean)
    .slice(0, limit)
}
