/*
 * Guía de stacking que acompaña al directorio de /stacking. Solo en español.
 * Mismas reglas que src/data/guias.js: cada dato con fuente; lo que sale de la
 * operación de ASLI va marcado como experiencia; destinos y puertos sin nombrar
 * uno solo. Detalle de fuentes en docs/guias-fuentes.md.
 */
export const stackingGuia = {
  acento: '#007A7B',
  acentoClaro: '#2EF2C8',
  definicion:
    'El stacking es el período en que el terminal portuario recibe los contenedores de exportación de una nave específica. Lo publica cada naviera, con día y hora de inicio y de término, y suele ser distinto para carga refrigerada y carga seca. Fuera de esa ventana, el terminal no recibe la carga y el contenedor queda para la nave siguiente.',
  definicionFuentes: [1, 2, 3],

  // "La semana del embarque": cada hito es una recalada de la travesía.
  pasos: [
    {
      recalada: 'Booking',
      foto: '/img/guias/cerezas/booking.webp',
      fotoAlt: 'Contenedores apilados vistos desde abajo',
      titulo: 'Reserva en una nave',
      texto: [
        'Todo parte con el booking: al reservar espacio en una nave y un viaje quedan definidas las fechas que importan, porque las navieras publican el stacking y los cortes nave por nave y puerto por puerto.',
      ],
      fuentes: [2, 4, 5],
    },
    {
      recalada: 'Vacío',
      foto: '/img/guias/cerezas/stacking.webp',
      fotoAlt: 'Camión con contenedor refrigerado en ruta al atardecer',
      titulo: 'Retiro del contenedor vacío',
      texto: [
        'El retiro del vacío en el depósito, la carga en el packing o la bodega y el viaje del camión se programan hacia atrás desde la ventana de stacking: la carga tiene que llegar al puerto cuando el terminal la puede recibir.',
      ],
      fuentes: [1],
    },
    {
      recalada: 'Abre',
      foto: '/img/guias/cerezas/contenedor.webp',
      fotoAlt: 'Carga de pallets dentro de un contenedor refrigerado',
      titulo: 'Abre el stacking',
      texto: [
        'Desde el día y la hora de inicio, el terminal recibe los contenedores de esa nave. Las ventanas suelen ser distintas para carga refrigerada y carga seca, y algunas navieras publican además un corte anticipado.',
        'Un ejemplo publicado por una naviera: carga seca de jueves 08:00 a domingo 15:00, y carga refrigerada de viernes 08:00 a domingo 15:00. Cada nave y cada puerto tienen las suyas.',
      ],
      fuentes: [2, 3],
    },
    {
      recalada: 'Preaviso',
      foto: '/img/guias/cerezas/documentos.webp',
      fotoAlt: 'Oficina de ASLI en Curicó',
      titulo: 'Preaviso y corte documental',
      texto: [
        'Antes de que el camión llegue se hace el preaviso al terminal, y los datos ingresados tienen que coincidir con los documentos de la carga, como el DUS. Si no coinciden, hay rechazos o demoras en la entrada.',
        'La naviera fija además un corte documental: la hora límite para entregar la documentación del embarque, distinta de la ventana física de recepción.',
      ],
      fuentes: [1, 3, 5],
    },
    {
      recalada: 'VGM',
      foto: '/img/guias/cerezas/packing.webp',
      fotoAlt: 'Cámara de frío con grúa horquilla y pallets embalados',
      titulo: 'Límite de envío del VGM',
      texto: [
        'La masa bruta verificada (VGM) de cada contenedor tiene su propio plazo. Sin el VGM informado a tiempo, la naviera no embarca el contenedor, aunque haya entrado al terminal dentro del stacking.',
      ],
      fuentes: [3, 6],
    },
    {
      recalada: 'Zarpe',
      foto: '/img/guias/cerezas/zarpe.webp',
      fotoAlt: 'Portacontenedores zarpando del puerto con remolcadores',
      titulo: 'Cierra el stacking y zarpa la nave',
      texto: [
        'Al cerrar la ventana, el terminal deja de recibir carga para esa nave. Las fechas pueden cambiar según la operación, así que conviene revisarlas cada semana y no darlas por fijas.',
      ],
      fuentes: [3],
    },
  ],

  // Qué muestra el portal de cada naviera (revisados el 3 de octubre de 2026).
  navieras: [
    {
      nombre: 'MSC',
      texto: 'Tabla pública por nave y viaje, puerto por puerto, con ETB y ETD. Separa stacking normal de carga refrigerada y de carga seca, y muestra un corte anticipado para cada una.',
      fuente: 2,
    },
    {
      nombre: 'Maersk',
      texto: 'Ventanas por servicio y puerto, separadas para carga refrigerada y seca, junto al corte documental y el límite de envío del VGM. Avisa que pueden variar según la operación.',
      fuente: 3,
    },
    {
      nombre: 'Hapag-Lloyd',
      texto: 'Buscador por puerto, servicio y nave, en español o inglés. Distingue cut-off con pre-advice, sin pre-advice para carga seca y refrigerada, y el corte de carga peligrosa y DUS.',
      fuente: 4,
    },
    {
      nombre: 'CMA CGM',
      texto: 'Secciones separadas para stacking, VGM, cortes documentales y presentación de aperturas, con una tabla por viaje, nave, puerto y ETD.',
      fuente: 5,
    },
    {
      nombre: 'PIL',
      texto: 'ASLI publica en esta web el último PDF de stacking de PIL, sincronizado automáticamente desde el correo de la naviera.',
      experiencia: true,
    },
    {
      nombre: 'COSCO',
      texto: 'Portal de documentación de su agencia en Chile, con una sección de stacking.',
      experiencia: true,
    },
    {
      nombre: 'ONE',
      texto: 'En su página de exportación, la sección desplegable "Cierres Documentales y Stacking" tiene un documento por servicio (AX1, AX2, ATS y FLX). No pide iniciar sesión.',
      fuente: 7,
    },
    {
      nombre: 'Wan Hai',
      texto: 'Itinerarios y stacking en el portal Navepac.',
      experiencia: true,
    },
  ],

  errores: [
    {
      error: 'Llegar al puerto fuera de la ventana',
      solucion: 'El terminal recibe la carga según el stacking publicado para cada nave. Fuera de la ventana, el contenedor queda para la nave siguiente.',
      fuente: 1,
    },
    {
      error: 'Confundir la ventana de reefer con la de carga seca',
      solucion: 'Muchas navieras publican ventanas distintas para cada una. Revisa la que corresponde a tu tipo de contenedor.',
      fuente: 2,
    },
    {
      error: 'Preaviso con datos distintos a los documentos',
      solucion: 'Los datos del preaviso tienen que coincidir con los documentos de la carga; si no, hay rechazos o demoras en la entrada al terminal.',
      fuente: 1,
    },
    {
      error: 'Informar el VGM después del límite',
      solucion: 'Sin VGM a tiempo, la naviera no embarca el contenedor. Tiene su propio plazo, aparte del stacking.',
      fuente: 6,
    },
    {
      error: 'Dar las fechas por fijas',
      solucion: 'Las ventanas pueden variar según la operación. Revísalas cada semana en el portal de la naviera.',
      fuente: 3,
    },
    {
      error: 'Contar con domingos y festivos',
      solucion: 'Algunas navieras advierten que los terminales no reciben carga esos días. Planifica la llegada dentro de días hábiles.',
      fuente: 2,
    },
  ],

  faqs: [
    {
      question: '¿Qué es el stacking de una naviera?',
      answer:
        'Es el período en que el terminal portuario recibe los contenedores de exportación de una nave específica. Cada naviera lo publica con día y hora de inicio y de término, y suele ser distinto para carga refrigerada y carga seca.',
    },
    {
      question: '¿Qué pasa si llego al puerto después del cierre del stacking?',
      answer:
        'El terminal no recibe la carga para esa nave y el contenedor queda para la siguiente. Por eso el retiro del vacío, la carga y el camión se programan desde la ventana de stacking hacia atrás.',
    },
    {
      question: '¿Qué diferencia hay entre el stacking y el corte documental?',
      answer:
        'El stacking es la ventana física en que el terminal recibe el contenedor. El corte documental es la hora límite para entregar la documentación del embarque. Son plazos distintos y hay que cumplir los dos, además del límite del VGM.',
    },
    {
      question: '¿Dónde veo el stacking de MSC en Chile?',
      answer:
        'MSC Chile publica una tabla pública por nave y viaje, puerto por puerto, con ventanas separadas para carga refrigerada y seca. Puedes abrirla desde el directorio de esta página.',
    },
    {
      question: '¿Dónde veo el stacking de Maersk o Hapag-Lloyd en Chile?',
      answer:
        'Maersk publica sus ventanas por servicio y puerto, con corte documental y límite de VGM. Hapag-Lloyd tiene un buscador por puerto, servicio y nave. Ambos portales se abren desde el directorio de esta página.',
    },
  ],

  fuentes: [
    {
      n: 1,
      tipo: 'Terminal portuario',
      titulo: 'Preguntas frecuentes de exportación: recepción de carga y preaviso',
      medio: 'DP World San Antonio',
      url: 'https://www.dpworld.com/es/san-antonio',
    },
    {
      n: 2,
      tipo: 'Naviera',
      titulo: 'Stacking de naves y cortes anticipados',
      medio: 'MSC Chile',
      url: 'https://deadline.mscchile.cl/Stacking_esp.html',
    },
    {
      n: 3,
      tipo: 'Naviera',
      titulo: 'Shipping to and from Chile: stacking, corte documental y VGM',
      medio: 'Maersk Chile',
      url: 'https://www.maersk.com/es-mx/local-information/latin-america/chile/export',
    },
    {
      n: 4,
      tipo: 'Naviera',
      titulo: 'Stacking Chile: cut-off por puerto, servicio y nave',
      medio: 'Hapag-Lloyd Chile',
      url: 'https://stackingchile.hlag-cl.com/',
    },
    {
      n: 5,
      tipo: 'Naviera',
      titulo: 'Stacking, VGM y cortes documentales',
      medio: 'CMA CGM Chile',
      url: 'https://www.cma-cgm-chile.cl/?page=18',
    },
    {
      n: 6,
      tipo: 'Prensa especializada',
      titulo: 'Partió la certificación de masa bruta de contenedores (VGM)',
      medio: 'MundoMarítimo · norma SOLAS de la OMI',
      url: 'https://mundomaritimo.cl/noticias/partio-certificacion-de-masa-bruta-de-contenedores-en-san-vicente-terminal-internacional-svti',
    },
    {
      n: 7,
      tipo: 'Naviera',
      titulo: 'Exportación: cierres documentales y stacking por servicio',
      medio: 'ONE (Ocean Network Express) Latinoamérica',
      url: 'https://la.one-line.com/es/exportacion',
    },
  ],
  fuentesIntro:
    'Cada dato de esta guía viene de las navieras que publican el stacking en Chile (MSC, Maersk, Hapag-Lloyd, CMA CGM y ONE), de un terminal portuario (DP World San Antonio) y de prensa especializada del sector marítimo. Lo que viene de la operación diaria de ASLI va marcado como tal. El número entre corchetes junto a cada dato te lleva a su fuente.',
}
