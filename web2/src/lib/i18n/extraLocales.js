/**
 * Claves i18n compartidas nuevas (aún no en dictionaries.js).
 * - esExtras / enExtras: homeSeo, presentacion, serviceLanding, locale
 * - enLandings: traducciones EN de las 8 landings (ES usa landings.js)
 * - esLandings: {} — ServiceLanding usa landings.js como fuente
 */

export const esExtras = {
  homeSeo: {
    title: 'ASLI — Asesoría logística, exportación e importación | Curicó',
    description:
      'Asesoría logística en Curicó para PYMEs y exportadores: exportación de fruta fresca, importación de mercancías, contenedores, carga aérea y marítima. ASLI, Maule.',
  },
  presentacion: {
    seoTitle: 'Presentación corporativa ASLI | Logística Curicó',
    seoDescription:
      'Presentación de ASLI: asesoría logística, exportación e importación desde Curicó, Maule. Conoce la empresa y descarga el PDF corporativo.',
    h1Before: 'Presentación corporativa',
    h1Accent: 'ASLI',
    lead: 'Asesoría logística y comercio exterior desde Curicó: conoce la empresa y descarga el PDF.',
    panelTitle: 'Presentación ASLI',
    downloadPdf: 'Descargar PDF',
    iframeTitle: 'Presentación ASLI',
    ctaTitle: '¿Tienes preguntas sobre nuestros servicios?',
    ctaBody: 'Contáctanos y te ayudamos con cualquier consulta.',
    ctaMail: 'Contactar',
    mailSubject: 'Consulta sobre servicios',
  },
  serviceLanding: {
    breadcrumbAria: 'Miga de pan',
    home: 'Inicio',
    services: 'Servicios',
    quoteService: 'Cotizar este servicio',
    talkTeam: 'Hablar con el equipo',
    relatedTitle: 'Servicios relacionados',
    faqTitle: 'Preguntas frecuentes',
    finalCtaTitle: '¿Listo para cotizar?',
    finalCtaBody: 'Cuéntanos tu operación y armamos la mejor solución logística contigo.',
    finalCtaButton: 'Escribir a ASLI',
    mailSubjectPrefix: 'Cotización:',
    officeTitle: 'ASLI · Curicó, Maule',
    officeHours: (street) => `${street}. Atención lun–vie 09:00–18:00.`,
    viewAllServices: 'Ver todos los servicios →',
    trackingLink: 'Tracking de cargas →',
    stackingLink: 'Stacking de navieras →',
  },
  locale: {
    switchToEn: 'Switch to English',
    switchToEs: 'Cambiar a español',
    switchToZh: '切换到中文',
    chooseLanguage: 'Elegir idioma',
    languages: {
      es: 'Español',
      en: 'English',
      zh: '中文',
    },
  },
}

export const enExtras = {
  homeSeo: {
    title: 'ASLI — Logistics advisory, export and import | Curicó',
    description:
      'Logistics advisory in Curicó for SMEs and exporters: fresh fruit exports, merchandise imports, containers, air and ocean freight. ASLI, Maule.',
  },
  presentacion: {
    seoTitle: 'ASLI corporate presentation | Logistics Curicó',
    seoDescription:
      'ASLI presentation: logistics advisory, export and import from Curicó, Maule. Learn about the company and download the corporate PDF.',
    h1Before: 'Corporate presentation',
    h1Accent: 'ASLI',
    lead: 'Logistics advisory and foreign trade from Curicó: learn about the company and download the PDF.',
    panelTitle: 'ASLI presentation',
    downloadPdf: 'Download PDF',
    iframeTitle: 'ASLI presentation',
    ctaTitle: 'Questions about our services?',
    ctaBody: 'Contact us and we will help with any inquiry.',
    ctaMail: 'Contact us',
    mailSubject: 'Service inquiry',
  },
  serviceLanding: {
    breadcrumbAria: 'Breadcrumb',
    home: 'Home',
    services: 'Services',
    quoteService: 'Quote this service',
    talkTeam: 'Talk to the team',
    relatedTitle: 'Related services',
    faqTitle: 'Frequently asked questions',
    finalCtaTitle: 'Ready to get a quote?',
    finalCtaBody: 'Tell us about your operation and we will build the best logistics solution with you.',
    finalCtaButton: 'Email ASLI',
    mailSubjectPrefix: 'Quote:',
    officeTitle: 'ASLI · Curicó, Maule',
    officeHours: (street) => `${street}. Mon–Fri 09:00–18:00.`,
    viewAllServices: 'View all services →',
    trackingLink: 'Cargo tracking →',
    stackingLink: 'Carrier stacking →',
  },
  locale: {
    switchToEn: 'Switch to English',
    switchToEs: 'Cambiar a español',
    switchToZh: '切换到中文',
    chooseLanguage: 'Choose language',
    languages: {
      es: 'Español',
      en: 'English',
      zh: '中文',
    },
  },
}

/** ES landings: vacío — ServiceLanding usa landings.js */
export const esLandings = {}

/** Traducciones EN de las 8 landings (mismas claves de contenido que landings.js) */
export const enLandings = {
  'exportacion-fruta-fresca': {
    title: 'Fresh fruit exports from Chile | ASLI Curicó',
    description:
      'Advisory and logistics for fresh and frozen fruit exports from Chile. Documentation, carriers, customs and tracking from Curicó, Maule.',
    h1: 'Fresh fruit exports from Chile',
    label: 'Agribusiness exports',
    lead:
      'We coordinate fresh and frozen fruit exports with a focus on seasonal timelines, cold chain and documentation without surprises.',
    imageAlt: 'Fresh fruit exports — ASLI logistics',
    serviceType: 'Fresh fruit exports',
    sections: [
      {
        heading: 'Agribusiness logistics with real support',
        body: [
          'At ASLI we support fruit exporters in Maule and across Chile at every stage: ocean booking, documentation, customs coordination and tracking to destination.',
          'We work with fresh and frozen products, aligning stacking windows, phytosanitary requirements and reefer container conditions to protect cargo quality.',
        ],
      },
      {
        heading: 'What the service includes',
        body: [
          'Building the export operation, carrier coordination, documentary management and support with customs procedures.',
          'Operational tracking so you know cargo status and can plan packing, harvest and dispatch with clear information.',
        ],
      },
      {
        heading: 'Who it is for',
        body: [
          'Fresh and frozen fruit exporters, packings and agribusiness SMEs that need a close team in Curicó — not only a remote intermediary.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Does ASLI export fresh fruit from Curicó?',
        answer:
          'Yes. We operate from Curicó, Maule Region, and coordinate fresh and frozen fruit exports to international destinations, with documentation, carriers and customs.',
      },
      {
        question: 'Do you handle reefer containers for fruit?',
        answer:
          'Yes. We coordinate reefer containers and the associated multimodal operation to maintain the cold chain by product type and destination.',
      },
      {
        question: 'Can you advise an SME that is just starting to export?',
        answer:
          'Yes. We support new and established exporters: we explain requirements, prepare documentation and coordinate the operation end to end.',
      },
    ],
  },
  'asesoria-exportadores-pymes': {
    title: 'Advisory for exporters and SMEs Chile | ASLI Curicó',
    description:
      'Logistics advisory for SMEs and exporters in Chile: export, import, documentation and foreign trade from Curicó, Maule.',
    h1: 'Logistics advisory for SMEs and exporters',
    label: 'Commercial advisory',
    lead:
      'We support small and mid-sized companies and exporters who need operational clarity — not jargon or delays.',
    imageAlt: 'Logistics advisory for SMEs and exporters — ASLI',
    serviceType: 'Logistics advisory for exporters and SMEs',
    sections: [
      {
        heading: 'Advisory built for those who truly operate',
        body: [
          'Many SMEs lose time and margin between paperwork, carriers and customs. At ASLI we turn the process into concrete steps: what is missing, when it ships and who responds.',
          'We advise on exports and imports with a local team in Curicó that knows Chilean agribusiness and foreign trade realities.',
        ],
      },
      {
        heading: 'What we solve with you',
        body: [
          'Defining route and mode (ocean, air or road), documentary preparation, carrier coordination and operation tracking.',
          'We also guide exporters who want to organize their first season or scale without improvising on every booking.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Do you advise SMEs that do not export yet?',
        answer:
          'Yes. We help you understand requirements, prepare documentation and coordinate the first operation with close support.',
      },
      {
        question: 'Does advisory include imports?',
        answer:
          'Yes. We advise on both exports and merchandise imports, with a focus on realistic timelines and customs compliance.',
      },
    ],
  },
  'importacion-mercancias-chile': {
    title: 'Merchandise imports into Chile | ASLI',
    description:
      'Advisory on merchandise imports into Chile: customs procedures, containers, logistics coordination and tracking from Curicó.',
    h1: 'Merchandise imports into Chile',
    label: 'Imports',
    lead:
      'We bring your product in with order: customs, realistic timelines and logistics coordination so you know what to expect at every inbound stage.',
    imageAlt: 'Merchandise imports into Chile — ASLI',
    serviceType: 'Merchandise imports',
    sections: [
      {
        heading: 'Import without the maze',
        body: [
          'We coordinate merchandise imports into Chile: from shipment planning through entry, with a focus on documentation, customs and related transport.',
          'We explain realistic lead times and cargo status so your company can plan stock, production or distribution.',
        ],
      },
      {
        heading: 'Service coverage',
        body: [
          'Ocean and air imports, container management, documentary support and coordination with agents and lines by cargo type.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Does ASLI manage imports into Chile?',
        answer:
          'Yes. We advise and coordinate merchandise imports, including customs procedures, containers and operational tracking.',
      },
      {
        question: 'Can I import by air and ocean?',
        answer:
          'Yes. We evaluate the best mode by urgency, product type and budget, and coordinate the full operation.',
      },
    ],
  },
  'gestion-contenedores': {
    title: 'Container management Chile | Dry and reefer | ASLI',
    description:
      'Dry and reefer container management for export and import in Chile: availability, stacking, costs and dispatch times.',
    h1: 'Dry and reefer container management',
    label: 'Containers',
    lead:
      'We manage containers with a focus on space, cost and dispatch times, so profitability is not lost in operational details.',
    imageAlt: 'Container management — ASLI logistics',
    serviceType: 'Container management',
    sections: [
      {
        heading: 'Containers without improvisation',
        body: [
          'We coordinate availability, equipment type (dry or reefer), stacking and dispatch linked to your export or import.',
          'The goal is to reduce delays, hidden costs and friction between packing, road transport and the carrier.',
        ],
      },
      {
        heading: 'Ideal if',
        body: [
          'You import or export containerized cargo and need one counterpart who organizes the operation and keeps you informed on time.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Do you manage containers for fresh fruit?',
        answer:
          'Yes. We coordinate reefer containers and the associated operation for fresh and frozen fruit exports.',
      },
      {
        question: 'Does it include container imports?',
        answer:
          'Yes. We support containerized imports with logistics coordination and tracking through entry into Chile.',
      },
    ],
  },
  'transporte-aereo-carga': {
    title: 'Air imports and exports | ASLI',
    description:
      'Air cargo: air imports and exports with trusted airlines and close tracking from Chile.',
    h1: 'Air imports and exports',
    label: 'Air cargo',
    lead:
      'For urgent or high-value cargo: air options with trusted airlines and close tracking through delivery.',
    imageAlt: 'Air cargo — ASLI imports and exports',
    serviceType: 'Air cargo transport',
    sections: [
      {
        heading: 'When time leads',
        body: [
          'We coordinate air imports and exports, choosing service by deadline, product type and budget.',
          'Ideal for samples, high-value cargo, urgent replenishment or products that cannot wait for ocean transit times.',
        ],
      },
      {
        heading: 'What it includes',
        body: [
          'Air quote and booking, documentary coordination and operational tracking through delivery or handoff to road transport.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Do you handle air exports from Chile?',
        answer:
          'Yes. We coordinate air exports with trusted airlines and operational support.',
      },
      {
        question: 'Air imports as well?',
        answer:
          'Yes. We manage air imports of merchandise with a focus on timelines and documentation.',
      },
    ],
  },
  'transporte-maritimo': {
    title: 'Ocean freight and carrier coordination | ASLI',
    description:
      'Ocean freight and carrier coordination for exports and imports from Chile. Routes, rates and tracking.',
    h1: 'Ocean freight and carrier coordination',
    label: 'Ocean',
    lead:
      'We connect your cargo with leading global carriers, choosing route and service by deadline, product and budget.',
    imageAlt: 'Ocean freight and carriers — ASLI',
    serviceType: 'Ocean freight',
    sections: [
      {
        heading: 'Carriers with operational judgment',
        body: [
          'We negotiate and coordinate ocean services for exports and imports, with an eye on ETD, transit, equipment type and commercial terms.',
          'From Curicó we operate with a network of lines and partners to give you real options — not just a loose rate.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Which carriers do you work with?',
        answer:
          'We coordinate with leading international lines by destination, season and cargo type. We propose concrete options for your operation.',
      },
      {
        question: 'Does it include vessel tracking?',
        answer:
          'Yes. You can check cargo tracking from our site and we support you on operational follow-up of the booking.',
      },
    ],
  },
  'servicios-aduaneros': {
    title: 'Customs and documentary services | ASLI',
    description:
      'Customs services and documentary advisory for imports and exports in Chile. Certificates, permits and regulatory compliance.',
    h1: 'Customs services and documentary advisory',
    label: 'Customs',
    lead:
      'Customs processing and paperwork without the maze: we review requirements and guide you to stay compliant without losing valuable days.',
    imageAlt: 'Customs and documentation — ASLI',
    serviceType: 'Customs services',
    sections: [
      {
        heading: 'Compliance with agility',
        body: [
          'We support documentary and customs management linked to your imports and exports, aiming to reduce observations and delays.',
          'Certificates, permits and requirements by destination or product: we guide you in plain language with realistic timelines.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Does ASLI handle customs procedures?',
        answer:
          'Yes. We offer customs services and documentary advisory to speed up imports and exports with regulatory compliance.',
      },
      {
        question: 'Do you help with AEO certification or agri requirements?',
        answer:
          'We have a specialized food-safety team and support fruit exporters on regulatory compliance and AEO (OEA) certification.',
      },
    ],
  },
  'asesoria-logistica-integral': {
    title: 'Integral logistics advisory Curicó | ASLI',
    description:
      'Integral logistics advisory in Curicó, Maule: multimodal, documentary and operational support for export and import in Chile.',
    h1: 'Integral logistics advisory in Curicó, Maule',
    label: 'Integral logistics',
    lead:
      'One conversation to build the complete solution: multimodal, documentary and operational, tailored to your season and cargo type.',
    imageAlt: 'ASLI integral logistics advisory in Curicó',
    serviceType: 'Integral logistics advisory',
    sections: [
      {
        heading: 'The full flow, one team',
        body: [
          'At ASLI we integrate export and import advisory, ocean, air and road transport, containers and customs.',
          'We operate from Longitudinal Sur Km. 186, Curicó, with presence in the Maule Region and national coverage for foreign trade.',
        ],
      },
      {
        heading: 'Why Curicó',
        body: [
          'We are where agribusiness exporters are: close to packings and growers, with fast response and on-site support when the operation requires it.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Where is ASLI?',
        answer:
          'At Longitudinal Sur Km. 186, Curicó, Maule Region, Chile. We are available Monday to Friday, 09:00–18:00.',
      },
      {
        question: 'What logistics services do you offer?',
        answer:
          'Export and import advisory, ocean, air and road transport, container management, customs services and integral logistics advisory.',
      },
    ],
  },
}
