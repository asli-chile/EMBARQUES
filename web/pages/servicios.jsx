import Head from 'next/head'
import Header from '../src/components/Header'
import Footer from '../src/components/Footer'

const ServiciosPage = () => {
  const servicios = [
    {
      id: 1,
      titulo: 'Asesoría En Exportaciones',
      descripcion:
        'Gestión completa del proceso de exportación, desde la documentación hasta la coordinación con navieras y aduanas.',
      imagen: '/img/expo.webp',
    },
    {
      id: 2,
      titulo: 'Asesoría En Importaciones',
      descripcion:
        'Facilitamos la importación de tus productos, manejando trámites aduaneros y coordinación logística.',
      imagen: '/img/impo.webp',
    },
    {
      id: 3,
      titulo: 'Asesoría Documental',
      descripcion:
        'Asesoría especializada en documentación aduanera, certificados, permisos y toda la tramitación necesaria.',
      imagen: '/img/docs.webp',
    },
    {
      id: 4,
      titulo: 'Transporte Marítimo',
      descripcion:
        'Coordinación con las principales navieras del mundo para el transporte seguro de tu carga.',
      imagen: '/img/maritimo.webp',
    },
    {
      id: 5,
      titulo: 'Transporte Aéreo',
      descripcion:
        'Soluciones de transporte aéreo para cargas urgentes o de alto valor.',
      imagen: '/img/aereo.webp',
    },
    {
      id: 6,
      titulo: 'Transporte Terrestre',
      descripcion:
        'Red de transporte terrestre confiable para mover tu carga desde y hacia puertos y aeropuertos.',
      imagen: '/img/camion.webp',
    },
    {
      id: 7,
      titulo: 'Gestión de Contenedores',
      descripcion:
        'Administración eficiente de contenedores, optimizando espacio y costos.',
      imagen: '/img/container.webp',
    },
    {
      id: 8,
      titulo: 'Servicios Aduaneros',
      descripcion:
        'Tramitación aduanera completa, cumplimiento normativo y agilización de procesos.',
      imagen: '/img/aduana.webp',
    },
    {
      id: 9,
      titulo: 'Asesoría Logística Integral',
      descripcion:
        'Soluciones logísticas completas y personalizadas para cada necesidad de tu empresa.',
      imagen: '/img/logistica.webp',
    },
  ]

  return (
    <>
      <Head>
        <title>Servicios - ASLI - Asesorías y Servicios Logísticos Integrales</title>
        <meta
          name="description"
          content="Conoce todos nuestros servicios logísticos: exportaciones, importaciones, transporte marítimo, aéreo y terrestre, gestión de contenedores, servicios aduaneros y asesoría logística integral."
        />
        <link
          rel="icon"
          type="image/png"
          href="/img/logoblanco.png"
        />
        <link
          rel="apple-touch-icon"
          href="/img/logoblanco.png"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <div className="min-h-screen flex flex-col bg-asli-dark">
        <Header />
        <main className="flex-grow">
          {/* Hero Section */}
          <section className="py-20 md:py-32 bg-asli-dark">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-4xl mx-auto">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
                  NUESTROS SERVICIOS
                </h1>
                <p className="text-xl md:text-2xl text-white/90 leading-relaxed">
                  Soluciones logísticas integrales y especializadas para tu empresa
                </p>
              </div>
            </div>
          </section>

          {/* Tarjetas de Contacto - Grid de 3 columnas */}
          <section className="py-8 md:py-12 bg-asli-dark">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
                {/* Tarjeta Nina - Servicios de Importación */}
                <div className="bg-white/10 backdrop-blur-md rounded-lg p-8 border border-white/20 shadow-xl">
                  <h2 className="text-xl md:text-2xl font-bold text-white mb-6 text-center">
                    Servicios de Importación
                  </h2>
                  <div className="flex flex-col items-center mb-6">
                    <img
                      src="/img/nina.png"
                      alt="Nina Scotti - Ejecutiva de Operaciones e Importaciones"
                      className="w-32 h-32 rounded-full object-cover border-4 border-asli-primary mb-4 shadow-lg"
                    />
                    <h3 className="text-lg font-bold text-white mb-2 text-center">
                      Nina Scotti
                    </h3>
                    <p className="text-asli-primary font-semibold mb-3 text-center text-sm">
                      Ejecutiva de Operaciones e Importaciones
                    </p>
                    <p className="text-gray-300 text-sm text-center mb-2 leading-relaxed">
                      Profesional especializada en procesos de importación, dedicada a acompañar a nuestros clientes en cada etapa de la operación, desde la planificación inicial hasta la recepción final de la carga. Brinda asesoría permanente, coordinando documentación, tiempos y actores involucrados, asegurando que cada importación se realice de manera eficiente, segura y conforme a la normativa vigente, optimizando costos y minimizando riesgos operativos.
                    </p>
                    <p className="text-white/80 text-xs text-center flex items-center justify-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                        </svg>
                        Habla español, inglés, italiano
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <a
                      href="https://mail.google.com/mail/?view=cm&to=nina.scotti@asli.cl"
                      className="bg-asli-primary text-white px-4 py-2.5 rounded-md hover:bg-opacity-90 transition-all duration-200 text-center font-semibold text-sm flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      ENVIAR CORREO
                    </a>
                    <a
                      href="https://wa.me/+5691566637?text=Hola,%20me%20interesa%20información%20sobre%20servicios%20de%20importación"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-asli-accent text-white px-4 py-2.5 rounded-md hover:bg-opacity-90 transition-all duration-200 text-center font-semibold text-sm flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                      ENVIAR MENSAJE
                    </a>
                  </div>
                </div>

                {/* Tarjeta Alex - Transporte Terrestre */}
                <div className="bg-white/10 backdrop-blur-md rounded-lg p-8 border border-white/20 shadow-xl">
                  <h2 className="text-xl md:text-2xl font-bold text-white mb-6 text-center">
                    Transporte Terrestre
                  </h2>
                  <div className="flex flex-col items-center mb-6">
                    <img
                      src="/img/alex.png"
                      alt="Alex Cárdenas - Coordinador de Transportes"
                      className="w-32 h-32 rounded-full object-cover border-4 border-asli-primary mb-4 shadow-lg"
                    />
                    <h3 className="text-lg font-bold text-white mb-2 text-center">
                      Alex Cárdenas
                    </h3>
                    <p className="text-asli-primary font-semibold mb-3 text-center text-sm">
                      Coordinador de Transportes
                    </p>
                    <p className="text-gray-300 text-sm text-center mb-3 leading-relaxed">
                      Profesional responsable de la gestión de transportes terrestres, respaldado por una amplia red de contactos estratégicos a nivel nacional. Gracias a esta red, ASLI logra tarifas altamente competitivas en transporte terrestre, permitiendo optimizar los costos logísticos y asegurar un servicio eficiente, confiable y oportuno para cada operación.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <a
                      href="https://mail.google.com/mail/?view=cm&to=alex.cardenas@asli.cl"
                      className="bg-asli-primary text-white px-4 py-2.5 rounded-md hover:bg-opacity-90 transition-all duration-200 text-center font-semibold text-sm flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      ENVIAR CORREO
                    </a>
                    <a
                      href="https://wa.me/+5698294929?text=Hola,%20me%20interesa%20información%20sobre%20transporte%20terrestre"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-asli-accent text-white px-4 py-2.5 rounded-md hover:bg-opacity-90 transition-all duration-200 text-center font-semibold text-sm flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                      ENVIAR MENSAJE
                    </a>
                  </div>
                </div>

                {/* Tarjeta Poliana - Exportaciones Marítimas */}
                <div className="bg-white/10 backdrop-blur-md rounded-lg p-8 border border-white/20 shadow-xl">
                  <h2 className="text-xl md:text-2xl font-bold text-white mb-6 text-center">
                    Exportaciones Marítimas
                  </h2>
                  <div className="flex flex-col items-center mb-6">
                    <img
                      src="/img/poli.jpg"
                      alt="Poliana Cisternas - Subgerente Comercial"
                      className="w-32 h-32 rounded-full object-cover border-4 border-asli-primary mb-4 shadow-lg"
                    />
                    <h3 className="text-lg font-bold text-white mb-2 text-center">
                      Poliana Cisternas
                    </h3>
                    <p className="text-asli-primary font-semibold mb-3 text-center text-sm">
                      Subgerente Comercial
                    </p>
                    <p className="text-gray-300 text-sm text-center mb-2 leading-relaxed">
                      Profesional especializada en exportaciones marítimas, con amplia experiencia en el trabajo directo con líneas navieras. Actúa como el principal nexo entre ASLI y las navieras, gestionando negociaciones estratégicas que permiten obtener tarifas de flete marítimo altamente competitivas y condiciones comerciales optimizadas, contribuyendo a una operación de exportación más eficiente, segura y rentable para nuestros clientes.
                    </p>
                    <p className="text-white/80 text-xs text-center flex items-center justify-center gap-2 flex-wrap mb-3">
                      <span className="inline-flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                        </svg>
                        Habla español, inglés, alemán
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <a
                      href="https://mail.google.com/mail/?view=cm&to=poliana.cisternas@asli.cl"
                      className="bg-asli-primary text-white px-4 py-2.5 rounded-md hover:bg-opacity-90 transition-all duration-200 text-center font-semibold text-sm flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      ENVIAR CORREO
                    </a>
                    <a
                      href="https://wa.me/+56942858494?text=Hola,%20necesito%20cotizar%20y%20conseguir%20tarifas%20para%20exportaciones%20marítimas"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-asli-accent text-white px-4 py-2.5 rounded-md hover:bg-opacity-90 transition-all duration-200 text-center font-semibold text-sm flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                      ENVIAR MENSAJE
                    </a>
                  </div>
                </div>

                {/* Contenedor para las dos últimas tarjetas - Centradas */}
                <div className="md:col-span-3 md:flex md:justify-center md:items-start md:gap-6 lg:gap-8">
                  {/* Tarjeta Rocio - Certificación OEA */}
                  <div className="bg-white/10 backdrop-blur-md rounded-lg p-8 border border-white/20 shadow-xl w-full md:w-[400px] flex flex-col h-full">
                    <h2 className="text-xl md:text-2xl font-bold text-white mb-6 text-center">
                      Certificación OEA
                    </h2>
                    <div className="flex flex-col items-center mb-6 flex-grow">
                      <img
                        src="/img/rocio.png"
                        alt="Rocio Villareal - Subgerente de Seguridad Alimentaria"
                        className="w-32 h-32 rounded-full object-cover border-4 border-asli-primary mb-4 shadow-lg"
                      />
                      <h3 className="text-lg font-bold text-white mb-2 text-center">
                        Rocio Villareal
                      </h3>
                      <p className="text-asli-primary font-semibold mb-3 text-center text-sm">
                        Subgerente de Seguridad Alimentaria
                      </p>
                      <p className="text-gray-300 text-sm text-center mb-2 leading-relaxed">
                        Profesional especializada en el acompañamiento de exportadoras de frutas en el cumplimiento de los requisitos normativos para la obtención de la certificación OEA (Operador Económico Autorizado). Asesora a las empresas durante todo el proceso de implementación y certificación, permitiéndoles acceder a importantes beneficios, como menor nivel de inspecciones, mayor agilidad en los trámites aduaneros y un fortalecimiento integral de sus procesos de comercio exterior, contribuyendo a operaciones más seguras, eficientes y competitivas.
                      </p>
                    </div>
                    <div className="flex flex-col gap-3">
                      <a
                        href="https://mail.google.com/mail/?view=cm&to=rocio.villarroel@asli.cl"
                        className="bg-asli-primary text-white px-4 py-2.5 rounded-md hover:bg-opacity-90 transition-all duration-200 text-center font-semibold text-sm flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        ENVIAR CORREO
                      </a>
                      <a
                        href="https://wa.me/+56977066665?text=Hola,%20me%20interesa%20información%20sobre%20certificación%20OEA"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-asli-accent text-white px-4 py-2.5 rounded-md hover:bg-opacity-90 transition-all duration-200 text-center font-semibold text-sm flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                        ENVIAR MENSAJE
                      </a>
                    </div>
                  </div>

                  {/* Tarjeta Hans - Operaciones */}
                  <div className="bg-white/10 backdrop-blur-md rounded-lg p-8 border border-white/20 shadow-xl w-full md:w-[400px] flex flex-col h-full">
                  <h2 className="text-xl md:text-2xl font-bold text-white mb-6 text-center">
                    Operaciones
                  </h2>
                  <div className="flex flex-col items-center mb-6 flex-grow">
                    <img
                      src="/img/hansv.png"
                      alt="Hans Vasquez - Subgerente de Operaciones"
                      className="w-32 h-32 rounded-full object-cover border-4 border-asli-primary mb-4 shadow-lg"
                    />
                    <h3 className="text-lg font-bold text-white mb-2 text-center">
                      Hans Vasquez
                    </h3>
                    <p className="text-asli-primary font-semibold mb-3 text-center text-sm">
                      Subgerente de Operaciones
                    </p>
                    <p className="text-gray-300 text-sm text-center mb-3 leading-relaxed">
                      Responsable de coordinar y supervisar el funcionamiento integral de las operaciones de ASLI. Es el principal punto de contacto para la organización de reuniones y para resolver consultas relacionadas con nuestros procesos operativos, asegurando una comunicación clara, oportuna y orientada a entregar soluciones eficientes a nuestros clientes.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <a
                      href="https://mail.google.com/mail/?view=cm&to=hans.vasquez@asli.cl"
                      className="bg-asli-primary text-white px-4 py-2.5 rounded-md hover:bg-opacity-90 transition-all duration-200 text-center font-semibold text-sm flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      ENVIAR CORREO
                    </a>
                    <a
                      href="https://wa.me/+56991717784?text=Hola,%20necesito%20coordinar%20una%20reunión%20o%20tengo%20consultas%20sobre%20procesos%20operativos"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-asli-accent text-white px-4 py-2.5 rounded-md hover:bg-opacity-90 transition-all duration-200 text-center font-semibold text-sm flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                      ENVIAR MENSAJE
                    </a>
                  </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Servicios Grid */}
          <section className="py-16 md:py-24 bg-asli-dark">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {servicios.map((servicio) => {
                  const tieneImagenFondo = servicio.imagen

                  return (
                    <div
                      key={servicio.id}
                      className={`group rounded-lg p-6 transition-all duration-300 ease-in-out relative overflow-hidden w-full transform hover:scale-105 ${
                        tieneImagenFondo
                          ? 'bg-cover bg-center bg-no-repeat'
                          : 'bg-asli-secondary/50 hover:bg-asli-secondary/70'
                      }`}
                      style={{
                        minHeight: '320px',
                        height: 'auto',
                        ...(tieneImagenFondo && {
                          backgroundImage: `url(${servicio.imagen})`,
                          minHeight: '320px',
                        }),
                      }}
                    >
                      {/* Overlay oscuro para mejorar legibilidad cuando hay imagen de fondo */}
                      {tieneImagenFondo && (
                        <div className="absolute inset-0 bg-asli-dark/70 group-hover:bg-asli-dark/85 rounded-lg transition-all duration-300"></div>
                      )}
                      <div className="mb-4 relative z-10">
                        <div className={`w-16 h-16 rounded-lg flex items-center justify-center mb-4 ${
                          tieneImagenFondo ? 'bg-asli-primary/30' : 'bg-asli-primary/20'
                        }`}>
                          <svg
                            className="w-8 h-8 text-asli-primary"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                      </div>
                      <h3 className={`text-2xl font-semibold mb-4 relative z-10 ${
                        tieneImagenFondo ? 'text-white drop-shadow-lg' : 'text-white'
                      }`}>
                        {servicio.titulo}
                      </h3>
                      <p className={`leading-relaxed text-base relative z-10 ${
                        tieneImagenFondo ? 'text-white drop-shadow-md' : 'text-gray-300'
                      }`}>
                        {servicio.descripcion}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-16 md:py-24 bg-asli-secondary/30">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-3xl mx-auto text-center">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                  ¿Necesitas más información sobre nuestros servicios?
                </h2>
                <p className="text-xl text-white/90 mb-8">
                  Contáctanos y te ayudaremos a encontrar la mejor solución para tu empresa
                </p>
                <a
                  href="https://mail.google.com/mail/?view=cm&to=informaciones@asli.cl&su=Cotización de servicios"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-asli-primary text-white px-8 py-4 rounded-md hover:bg-opacity-90 transition-all duration-200 text-lg font-semibold"
                >
                  COTIZAR AQUI
                </a>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  )
}

export default ServiciosPage
