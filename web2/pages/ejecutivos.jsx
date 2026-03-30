import Head from 'next/head'
import { motion } from 'framer-motion'
import Header from '../src/components/Header'
import Footer from '../src/components/Footer'
import ImagePlaceholder from '../src/components/ImagePlaceholder'

const EJECUTIVOS = [
  {
    nombre: 'Poliana Cisternas',
    cargo: 'Subgerente Comercial',
    servicio: 'Exportaciones maritimas',
    descripcion:
      'Especialista en coordinacion y negociacion con navieras para optimizar tarifas, espacios y condiciones de embarque en operaciones de exportacion.',
    email: 'poliana.cisternas@asli.cl',
  },
  {
    nombre: 'Nina Scotti',
    cargo: 'Ejecutiva de Operaciones e Importaciones',
    servicio: 'Importaciones y coordinacion documental',
    descripcion:
      'Acompana cada importacion desde la planificacion hasta la recepcion final, coordinando documentos, tiempos y actores para una operacion fluida.',
    email: 'nina.scotti@asli.cl',
  },
  {
    nombre: 'Alex Cardenas',
    cargo: 'Coordinador de Transportes',
    servicio: 'Transporte terrestre en origen y destino',
    descripcion:
      'Gestiona unidades y coordinacion terrestre entre campo, packing, puertos y aeropuertos para asegurar continuidad operativa y tiempos de retiro.',
    email: 'alex.cardenas@asli.cl',
  },
  {
    nombre: 'Rocio Villarroel',
    cargo: 'Subgerente de Seguridad Alimentaria',
    servicio: 'Asesoria en certificacion OEA',
    descripcion:
      'Asesora empresas en cumplimiento normativo y preparacion para certificacion OEA, fortaleciendo seguridad, trazabilidad y eficiencia en comercio exterior.',
    email: 'rocio.villarroel@asli.cl',
  },
  {
    nombre: 'Hans Vasquez',
    cargo: 'Subgerente de Operaciones',
    servicio: 'Supervision operativa integral',
    descripcion:
      'Coordina y supervisa el flujo operativo completo para mantener control de hitos clave, comunicacion directa y resolucion rapida de incidencias.',
    email: 'hans.vasquez@asli.cl',
  },
]

const mailHref = (email, nombre, servicio) =>
  `https://mail.google.com/mail/?view=cm&to=${email}&su=${encodeURIComponent(
    `Consulta por ${servicio}`
  )}&body=${encodeURIComponent(
    `Hola ${nombre}, me gustaria recibir informacion sobre ${servicio}.`
  )}`

const INFORMACIONES_EMAIL = 'informaciones@asli.cl'

const mailHrefInformaciones = () =>
  `https://mail.google.com/mail/?view=cm&to=${INFORMACIONES_EMAIL}&su=${encodeURIComponent(
    'Consulta general — ASLI'
  )}&body=${encodeURIComponent(
    'Hola,\n\nEscribo para la siguiente consulta:\n\n'
  )}`

const EjecutivosPage = () => {
  return (
    <>
      <Head>
        <title>Hablar con un ejecutivo | ASLI</title>
        <meta
          name="description"
          content="Contacta al ejecutivo ASLI segun el servicio que necesitas."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div className="min-h-screen flex flex-col bg-asli-dark">
        <Header />

        <main className="flex-grow">
          <section className="relative pt-36 pb-20 md:pb-28 overflow-hidden bg-gradient-to-b from-asli-deep to-asli-dark">
            <div className="absolute inset-0 overflow-hidden opacity-20">
              <ImagePlaceholder variant="hero" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-asli-deep via-asli-deep/85 to-asli-deep/70" />

            <div className="relative z-10 container mx-auto px-6 lg:px-10 max-w-4xl">
              <h1
                className="font-display font-black text-white leading-tight mb-6"
                style={{ fontSize: 'clamp(2rem, 5vw, 3.8rem)', letterSpacing: '-0.025em' }}
              >
                Habla con un ejecutivo
              </h1>
              <p className="text-white/65 text-lg leading-relaxed max-w-3xl">
                Selecciona el ejecutivo según el servicio que necesitas y contáctalo directamente por correo. Para
                consultas generales puedes escribir al correo de informaciones.
              </p>
            </div>
          </section>

          <section className="py-16 md:py-24 border-y border-white/[0.06]">
            <div className="container mx-auto px-6 lg:px-10">
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {EJECUTIVOS.map((item, idx) => (
                  <motion.article
                    key={item.email}
                    initial={{ opacity: 0, y: 28 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.55, delay: idx * 0.05 }}
                    className="rounded-2xl border border-white/[0.1] bg-white/[0.03] p-6 shadow-[0_18px_36px_rgba(0,0,0,0.22)]"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <ImagePlaceholder
                        variant="lightCard"
                        className="!w-14 !h-14 shrink-0 !p-1 !rounded-xl"
                      />
                      <div>
                        <h2 className="text-white font-semibold leading-tight">{item.nombre}</h2>
                        <p className="text-white/60 text-sm">{item.cargo}</p>
                      </div>
                    </div>

                    <p className="text-asli-primary text-sm font-semibold mb-2">{item.servicio}</p>
                    <p className="text-white/70 text-sm leading-relaxed mb-5">{item.descripcion}</p>

                    <a
                      href={mailHref(item.email, item.nombre, item.servicio)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-asli-primary text-white text-sm font-semibold hover:bg-asli-primary/85 transition-all duration-200"
                    >
                      Enviar correo
                    </a>
                  </motion.article>
                ))}

                <motion.article
                  key="informaciones-generales"
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.55, delay: EJECUTIVOS.length * 0.05 }}
                  className="rounded-2xl border border-asli-primary/35 bg-asli-primary/[0.06] p-6 shadow-[0_18px_36px_rgba(0,0,0,0.22)] sm:col-span-2 xl:col-span-1"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-asli-primary/30 bg-asli-primary/10"
                      aria-hidden
                    >
                      <svg
                        className="h-7 w-7 text-asli-primary"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-white font-semibold leading-tight">Informaciones</h2>
                      <p className="text-white/60 text-sm">Consultas varias</p>
                    </div>
                  </div>

                  <p className="text-asli-primary text-sm font-semibold mb-2">Correo general</p>
                  <p className="text-white/70 text-sm leading-relaxed mb-2">
                    Para información general, cotizaciones amplias o cuando no sepas a qué ejecutivo escribir.
                  </p>
                  <p className="text-white/45 text-xs mb-5 font-mono break-all">{INFORMACIONES_EMAIL}</p>

                  <a
                    href={mailHrefInformaciones()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-asli-primary text-white text-sm font-semibold hover:bg-asli-primary/85 transition-all duration-200"
                  >
                    Enviar correo
                  </a>
                </motion.article>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  )
}

export default EjecutivosPage
