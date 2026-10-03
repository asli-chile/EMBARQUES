/*
 * Guías de exportación (/exportar/<slug>). Solo en español.
 *
 * Reglas de contenido:
 * - Cada dato técnico lleva `fuente` (número de la lista `fuentes`). Lo que no
 *   tenga fuente pública confiable no se publica. Detalle en docs/guias-fuentes.md.
 * - Ningún dato del ERP ni de clientes. El ERP solo se usa para revisar que la
 *   guía calce con la práctica real de ASLI.
 * - Destinos: "cualquier parte del mundo". Los requisitos por mercado se dicen en
 *   forma genérica, sin nombrar países ni un solo puerto.
 * - `experiencia: true` marca lo que sale de la operación de ASLI y no de una
 *   fuente publicada.
 */
export const guias = [
  {
    slug: 'cerezas',
    producto: 'Cerezas',
    singular: 'cereza',
    // Color de producto: solo como acento sobre la paleta ASLI.
    // acento sobre fondo claro; acentoClaro sobre fondo oscuro.
    acento: '#B0143A',
    acentoClaro: '#FF5A7E',
    title: 'Cómo exportar cerezas desde Chile: guía paso a paso | ASLI',
    description:
      'Guía práctica para exportar cerezas desde Chile: temporada, enfriado, contenedor reefer, atmósfera, certificado fitosanitario SAG, DUS, VGM y stacking. ASLI, Curicó.',
    h1Antes: 'Cómo exportar',
    h1Acento: 'cerezas',
    h1Despues: 'desde Chile',
    ceja: 'Guía de exportación · Cereza fresca',
    resumen:
      'Para exportar cerezas desde Chile hay que enfriar la fruta cerca de 0 °C en las primeras horas tras la cosecha, embalarla en bolsas de atmósfera modificada, reservar un contenedor reefer seteado entre -1 y 0 °C, obtener el certificado fitosanitario del SAG y el DUS, y entregar el contenedor dentro del stacking de la naviera.',
    imagen: '/img/guias/cerezas/portada.webp',
    imagenMovil: '/img/guias/cerezas/portada-800.webp',
    imagenAlt: 'Cerezas frescas recién cosechadas, listas para el packing',
    imagenOg: '/img/guias/cerezas/og.jpg',
    imagenAsli: '/img/guias/cerezas/asli.webp',
    imagenCierre: '/img/guias/cerezas/cierre.webp',
    publicada: '2026-10-02',
    actualizada: '2026-10-02',

    // Panel de la portada, con forma de pantalla de controlador reefer.
    seteo: [
      { etiqueta: 'Temperatura', valor: '-1 a 0', unidad: '°C', fuente: 9 },
      { etiqueta: 'Humedad relativa', valor: '90–95', unidad: '%', fuente: 3 },
      { etiqueta: 'O₂ en atmósfera controlada', valor: '3–10', unidad: '%', fuente: 3 },
      { etiqueta: 'CO₂ en atmósfera controlada', valor: '10–15', unidad: '%', fuente: 3 },
    ],

    // Temporada: intensidad relativa por mes (0–3), solo para dibujar la barra.
    temporada: {
      dato: 'Nov – Ene',
      peak: 'Peak en diciembre',
      meses: [
        { mes: 'oct', nivel: 1 },
        { mes: 'nov', nivel: 2 },
        { mes: 'dic', nivel: 3 },
        { mes: 'ene', nivel: 2 },
        { mes: 'feb', nivel: 0 },
      ],
      texto: 'Se comercializa de mediados de noviembre a mediados de enero. El peak de ventas va de Navidad al Año Nuevo lunar.',
      fuente: 1,
    },

    ficha: [
      {
        icono: 'origen',
        etiqueta: 'Origen',
        valor: '45,9 %',
        texto: 'de la superficie de cerezo de Chile está en la Región del Maule.',
        fuente: 2,
      },
      {
        icono: 'reloj',
        etiqueta: 'Enfriado',
        valor: '4 horas',
        texto: 'es el plazo ideal para bajar la fruta a entre -1 y 0 °C después de cosechar. Lo habitual es el hidroenfriado.',
        fuente: 3,
      },
      {
        icono: 'contenedor',
        etiqueta: 'Contenedor',
        valor: 'Reefer 40′',
        texto: 'con temperatura, humedad y ventilación ingresadas antes de encender la unidad y cargar.',
        fuente: 4,
      },
      {
        icono: 'atmosfera',
        etiqueta: 'Vida útil',
        valor: 'Hasta 6 semanas',
        texto: 'según cómo viaje la fruta y la variedad.',
        fuente: 3,
        // Barras: semanas de vida en frío según la atmósfera (escala hasta 6).
        comparacion: [
          { etiqueta: 'En aire', desde: 2, hasta: 2, texto: '2 sem.' },
          { etiqueta: 'Con bolsa de atmósfera modificada', desde: 3, hasta: 3, texto: '3 sem.' },
          { etiqueta: 'En atmósfera controlada', desde: 4, hasta: 6, texto: '4–6 sem.' },
        ],
      },
    ],

    // La travesía: cada paso es una recalada en la ruta del barco.
    pasos: [
      {
        recalada: 'Huerto',
        foto: '/img/guias/cerezas/huerto.webp',
        fotoAlt: 'Cerezas con rocío recién cosechadas',
        titulo: 'Cosecha y enfriado inmediato',
        texto: [
          'La calidad de la cereza se decide en las primeras horas. El daño y las pudriciones son proporcionales al tiempo que la fruta pasa caliente y a lo brusco del manejo.',
          'Las cajas de cosecha van a la sombra y cubiertas camino al packing, y la fruta se baja a entre -1 y 0 °C, idealmente dentro de 4 horas. El hidroenfriado ayuda además a que el pedicelo no se deshidrate.',
        ],
        fuentes: [3],
      },
      {
        recalada: 'Packing',
        foto: '/img/guias/cerezas/packing.webp',
        fotoAlt: 'Cámara de frío con grúa horquilla y pallets embalados',
        titulo: 'Selección y embalaje con atmósfera modificada',
        texto: [
          'Se embala solo fruta sin defectos ni pudrición. La bolsa de atmósfera modificada dentro de la caja baja el oxígeno y sube el CO₂, frena la respiración y suma al menos una semana de vida en frío.',
        ],
        fuentes: [3],
      },
      {
        recalada: 'Booking',
        foto: '/img/guias/cerezas/booking.webp',
        fotoAlt: 'Contenedores apilados vistos desde abajo',
        titulo: 'Reserva de espacio con la naviera',
        texto: [
          'En diciembre se concentra el grueso de la temporada, y el espacio en las naves se toma con anticipación. Al reservar se define la semana de embarque, el tipo de contenedor y si la carga va con atmósfera controlada.',
        ],
        fuentes: [1],
      },
      {
        recalada: 'Contenedor',
        foto: '/img/guias/cerezas/contenedor.webp',
        fotoAlt: 'Carga de pallets dentro de un contenedor refrigerado',
        titulo: 'Retiro del reefer y seteo',
        texto: [
          'El contenedor refrigerado se retira vacío en el depósito. Antes de encender la unidad y cargar se ingresan los valores de temperatura, humedad y ventilación y, si corresponde, la atmósfera controlada. Un seteo mal ingresado viaja así todo el tránsito.',
          'La carga debe dejar circular el aire: los espacios libres no deberían superar el 5 % del piso.',
        ],
        fuentes: [4],
      },
      {
        recalada: 'Documentos',
        foto: '/img/guias/cerezas/documentos.webp',
        fotoAlt: 'Oficina de ASLI en Curicó',
        titulo: 'Fitosanitario, DUS y VGM',
        texto: [
          'El SAG emite el certificado fitosanitario de exportación, que acredita que el envío cumple los requisitos del país de destino. Se solicita en el Sistema Multipuerto del SAG. Algunos mercados exigen además protocolos o planes de trabajo propios.',
          'El DUS lo presenta un agente de aduana en dos etapas: aceptación a trámite y legalización. Y sin la masa bruta verificada (VGM) informada a tiempo, la naviera no embarca el contenedor.',
        ],
        fuentes: [5, 6, 7],
      },
      {
        recalada: 'Stacking',
        foto: '/img/guias/cerezas/stacking.webp',
        fotoAlt: 'Camión con contenedor refrigerado en ruta al atardecer',
        titulo: 'Transporte a puerto dentro del stacking',
        texto: [
          'Cada naviera fija una ventana de recepción, el stacking, para que los contenedores de cada nave entren al puerto. El camión tiene que calzar con esa ventana en los puertos de la zona central: fuera de ella, la carga se queda para la nave siguiente.',
        ],
        fuentes: [8],
      },
      {
        recalada: 'Zarpe',
        foto: '/img/guias/cerezas/zarpe.webp',
        fotoAlt: 'Portacontenedores zarpando del puerto con remolcadores',
        titulo: 'Zarpe y tránsito',
        texto: [
          'Durante el viaje la fruta depende del seteo y de la atmósfera elegidos. La atmósfera controlada extiende la vida a 4–6 semanas según la variedad, frente a unas 3 semanas con bolsa, y conviene en los tránsitos largos.',
        ],
        fuentes: [3],
      },
      {
        recalada: 'Destino',
        foto: '/img/guias/cerezas/destino.webp',
        fotoAlt: 'Grúas de un terminal portuario de noche',
        titulo: 'Llegada a cualquier parte del mundo',
        texto: [
          'En destino, las bolsas de atmósfera modificada se abren al sacar la fruta de la cámara. A mayor temperatura, el CO₂ acumulado y la falta de oxígeno producen sabores extraños.',
        ],
        fuentes: [3],
      },
    ],

    errores: [
      {
        error: 'Demorar el enfriado después de la cosecha',
        solucion: 'Bajar la fruta a entre -1 y 0 °C dentro de las primeras 4 horas. Cada hora caliente se paga en color y pudriciones.',
        fuente: 3,
      },
      {
        error: 'Manejo brusco en cosecha y packing',
        solucion: 'Los golpes y la compresión producen pitting y machucones que aparecen recién en destino. Manejo suave en todo el proceso.',
        fuente: 3,
      },
      {
        error: 'Humedad baja en frío y transporte',
        solucion: 'Mantener la humedad relativa en 90–95 %. Con menos, el pedicelo se seca y se oscurece.',
        fuente: 3,
      },
      {
        error: 'Seteo del contenedor mal ingresado',
        solucion: 'Revisar temperatura, humedad y ventilación antes de encender la unidad y cargar, contra las instrucciones de la exportadora.',
        fuente: 4,
      },
      {
        error: 'Perder la ventana de stacking o entregar el VGM tarde',
        solucion: 'Programar el retiro del vacío, la carga y el camión según el stacking de la naviera, e informar el VGM antes del cierre documental.',
        fuente: 7,
      },
      {
        error: 'Documentos que no coinciden entre sí',
        solucion: 'Factura, certificado fitosanitario, DUS y BL tienen que decir lo mismo. Cualquier diferencia genera observaciones y demoras.',
        experiencia: true,
      },
    ],

    comoLoHaceAsli: [
      'Estamos en Curicó, en la región que concentra la mayor superficie de cerezo del país. Coordinamos la temporada contigo semana a semana: booking con la naviera, seteo del contenedor, transporte dentro del stacking, documentación con agentes de aduana aliados y seguimiento hasta el destino.',
      'Tú hablas con un solo equipo de principio a fin, y nosotros nos encargamos de que cada pieza llegue a tiempo.',
    ],

    faqs: [
      {
        question: '¿A qué temperatura se transporta la cereza en el contenedor?',
        answer:
          'Entre -1 y 0 °C, con humedad relativa de 90 a 95 %. Si la carga va en atmósfera controlada, los rangos habituales son 3–10 % de oxígeno y 10–15 % de CO₂.',
      },
      {
        question: '¿Cuándo es la temporada de exportación de cerezas en Chile?',
        answer:
          'Las cerezas chilenas se comercializan de mediados de noviembre a mediados de enero, con el peak de ventas entre Navidad y el Año Nuevo lunar.',
      },
      {
        question: '¿Qué documentos necesito para exportar cerezas?',
        answer:
          'El certificado fitosanitario de exportación del SAG, el DUS que presenta un agente de aduana y la masa bruta verificada (VGM) del contenedor. Algunos mercados exigen además protocolos o planes de trabajo propios.',
      },
      {
        question: '¿Conviene enviar la cereza en atmósfera controlada?',
        answer:
          'Conviene en tránsitos largos: la atmósfera controlada extiende la vida de la cereza a 4–6 semanas según la variedad, frente a unas 3 semanas con bolsa de atmósfera modificada.',
      },
      {
        question: '¿Qué empresa me ayuda a exportar cerezas desde el Maule?',
        answer:
          'ASLI, desde Curicó, coordina exportaciones de cerezas en contenedor reefer: booking con la naviera, seteo del contenedor, transporte dentro del stacking, documentos con agentes de aduana aliados y seguimiento hasta cualquier parte del mundo.',
      },
    ],

    fuentes: [
      {
        n: 1,
        tipo: 'Organismo público',
        titulo: 'Inicio de la temporada de cerezas chilenas',
        medio: 'Embajada de Chile en Tailandia · Ministerio de Relaciones Exteriores',
        url: 'https://www.chile.gob.cl/tailandia/noticias/inicio-de-la-temporada-de-cerezas-chilenas',
      },
      {
        n: 2,
        tipo: 'Prensa especializada',
        titulo: 'Maule: la zona del cerezo chileno con una superficie de 27.817 hectáreas',
        medio: 'Portalfrutícola, con datos del Catastro Frutícola CIREN-ODEPA',
        url: 'https://www.portalfruticola.com/?p=509424',
      },
      {
        n: 3,
        tipo: 'Investigación',
        titulo: 'Commodity Storage Manual: Cherries, Sweet and Tart (rev. 2018)',
        medio: 'WFLO / Global Cold Chain Alliance, revisado por la Universidad de Florida',
        url: 'https://www.gcca.org/system/files/WFLO-Commodity-Storage-Manual-2018Cherries_~_Sweet_%26_Tart%5B1%5D.pdf',
      },
      {
        n: 4,
        tipo: 'Naviera',
        titulo: 'Reefer Cargo Handling',
        medio: 'Hapag-Lloyd',
        url: 'https://www.hapag-lloyd.com/content/dam/website/downloads/pdf/ReeferCargoHandling.pdf',
      },
      {
        n: 5,
        tipo: 'Organismo público',
        titulo: 'Emisión de certificado fitosanitario de exportación y reexportación',
        medio: 'ChileAtiende · Servicio Agrícola y Ganadero (SAG)',
        url: 'https://www.chileatiende.gob.cl/fichas/2551-emision-de-certificado-fitosanitario-de-exportacion-y-reexportacion-de-productos-agricolas-y-forestales',
      },
      {
        n: 6,
        tipo: 'Organismo público',
        titulo: 'Compendio de Normas Aduaneras, Anexo 35: Documento Único de Salida',
        medio: 'Servicio Nacional de Aduanas',
        url: 'https://www.aduana.cl/anexo-35-documento-unico-de-salida-y-su-continuacion/aduana/2007-02-21/134024.html',
      },
      {
        n: 7,
        tipo: 'Prensa especializada',
        titulo: 'Partió la certificación de masa bruta de contenedores (VGM)',
        medio: 'MundoMarítimo · norma SOLAS de la OMI',
        url: 'https://mundomaritimo.cl/noticias/partio-certificacion-de-masa-bruta-de-contenedores-en-san-vicente-terminal-internacional-svti',
      },
      {
        n: 8,
        tipo: 'Naviera',
        titulo: 'Shipping to and from Chile: exportación y ventanas de stacking',
        medio: 'Maersk Chile',
        url: 'https://www.maersk.com/es-mx/local-information/latin-america/chile/export',
      },
      {
        n: 9,
        tipo: 'Investigación',
        titulo: 'Cherry (Sweet): Recommendations for Maintaining Postharvest Quality',
        medio: 'Postharvest Technology Center, Universidad de California, Davis',
        url: 'https://postharvest.ucdavis.edu/node/5231',
      },
    ],
    // Fecha de consulta: queda en docs/guias-fuentes.md, no en la página.
    consultadas: '2 de octubre de 2026',
    fuentesIntro:
      'Cada dato técnico de esta guía viene de fuentes reconocidas del comercio exterior y la poscosecha: organismos públicos de Chile (SAG, Servicio Nacional de Aduanas y Cancillería), centros de investigación en poscosecha (Universidad de California en Davis y Global Cold Chain Alliance), navieras internacionales (Maersk y Hapag-Lloyd) y prensa especializada del sector frutícola y marítimo. El número entre corchetes junto a cada dato te lleva a su fuente.',

    contacto: { producto: 'Cerezas', carga: 'reefer' },
    related: ['exportacion-fruta-fresca', 'gestion-contenedores', 'transporte-terrestre'],
  },
]

/** Guías anunciadas que todavía no se publican (se muestran sin enlace en /exportar). */
export const guiasProximas = [
  { titulo: 'Arándanos en atmósfera controlada', texto: 'Seteo, atmósfera y tiempos para que el arándano llegue firme.' },
  { titulo: 'Fruta congelada', texto: 'Frambuesa, arándano, kiwi y más: cadena de frío a -18 °C o menos.' },
]

export const guiaSlugs = guias.map((g) => g.slug)

export function getGuia(slug) {
  return guias.find((g) => g.slug === slug) || null
}
