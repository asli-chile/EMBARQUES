import Head from 'next/head'
import { motion } from 'framer-motion'
import Header from '../src/components/Header'
import Footer from '../src/components/Footer'
import ImagePlaceholder from '../src/components/ImagePlaceholder'

const fadeUp = {
  hidden:  { opacity: 0, y: 40 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.75, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
}

const VP_ONCE = { once: true, amount: 0.15 }

const SERVICIOS = [
  {
    num:    '01',
    img:    '/img/logistica.webp',
    titulo: 'Planificación y coordinación logística',
    descripcion:
      'Evaluamos cada operación para definir rutas, tiempos de tránsito y costos, optimizando la planificación desde origen.',
    tags: ['Rutas óptimas', 'Tiempos de tránsito', 'Control de costos'],
  },
  {
    num:    '02',
    img:    '/img/maritimo.webp',
    titulo: 'Transporte internacional marítimo y aéreo (FCL / LCL)',
    descripcion:
      'Gestión de exportaciones e importaciones vía marítima y aérea, coordinadas desde origen hasta destino final.',
    tags: ['FCL', 'LCL', 'REEFER', 'Air cargo'],
  },
  {
    num:    '03',
    img:    '/img/camion.webp',
    titulo: 'Transporte terrestre y coordinación en origen',
    descripcion:
      'Coordinación de transporte entre origen (campo/packing), puertos, aeropuertos y destino final, asegurando continuidad operativa.',
    tags: ['Campo a puerto', 'Packing', 'Coordinación multimodal'],
  },
  {
    num:    '04',
    img:    '/img/aduana.webp',
    titulo: 'Gestión aduanera y documentación de comercio exterior',
    descripcion:
      'Coordinación de procesos aduaneros y gestión documental para exportaciones e importaciones, asegurando cumplimiento normativo.',
    tags: ['DUS', 'Certificados', 'SAG', 'Cumplimiento normativo'],
  },
  {
    num:    '05',
    img:    '/img/expo.webp',
    titulo: 'Gestión integral de operaciones de comercio exterior (end-to-end)',
    descripcion:
      'Coordinación completa de la operación logística, integrando transporte, documentación, tiempos, costos y soporte administrativo-contable, incluyendo soluciones puerta a puerta.',
    tags: ['End-to-end', 'Puerta a puerta', 'Soporte administrativo'],
  },
  {
    num:    '06',
    img:    '/img/docs.webp',
    titulo: 'Asesoría en certificación OEA (Operador Económico Autorizado)',
    descripcion:
      'Acompañamos a empresas en el proceso de preparación para la certificación OEA, enfocado en cumplimiento normativo, seguridad y eficiencia operativa.',
    tags: ['OEA', 'Cumplimiento', 'Seguridad', 'Eficiencia'],
  },
]

const ServiciosPage = () => {
  return (
    <>
      <Head>
        <title>Servicios | ASLI Logística</title>
        <meta
          name="description"
          content="Servicios logísticos integrales para exportación e importación. Transporte marítimo, aéreo, terrestre, gestión aduanera y certificación OEA."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div className="min-h-screen flex flex-col bg-asli-dark">
        <Header />

        <main className="flex-grow">

          {/* ── Hero de página ── */}
          <section className="relative pt-36 pb-20 md:pb-28 overflow-hidden bg-gradient-to-b from-asli-deep to-asli-dark">
            {/* Bg image */}
            <div className="absolute inset-0 overflow-hidden opacity-20">
              <ImagePlaceholder variant="hero" src="/img/expo.webp" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-asli-deep to-asli-deep/70" />

            {/* Accent line */}
            <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-asli-primary/50 to-transparent" />

            <div className="relative z-10 container mx-auto px-6 lg:px-10 max-w-4xl">
              <motion.div
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="flex items-center gap-3 mb-5"
              >
                <span className="w-6 h-px bg-asli-primary" />
                <span className="eyebrow">Servicios</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.75, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="font-display font-black text-white leading-tight mb-6"
                style={{ fontSize: 'clamp(2rem, 5vw, 3.8rem)', letterSpacing: '-0.025em' }}
              >
                Servicios logísticos integrales<br />
                <span className="text-asli-primary italic">para exportación e importación</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.35 }}
                className="text-white/65 text-lg leading-relaxed max-w-2xl"
              >
                Coordinamos operaciones desde origen, incluyendo soluciones puerta a puerta
                para todo tipo de carga.
              </motion.p>
            </div>
          </section>

          {/* ── Lista de servicios ── */}
          <section className="py-16 md:py-24 border-y border-white/[0.06]">
            <div className="container mx-auto px-6 lg:px-10">
              <div className="space-y-6">
                {SERVICIOS.map((svc, i) => (
                  <motion.article
                    key={svc.num}
                    variants={fadeUp} custom={i * 0.3} initial="hidden" whileInView="visible" viewport={VP_ONCE}
                    className="group grid md:grid-cols-12 gap-0 rounded-2xl overflow-hidden border border-white/[0.07] hover:border-asli-primary/25 transition-all duration-500 hover:shadow-[0_18px_36px_rgba(0,0,0,0.24)]"
                  >
                    {/* Image panel */}
                    <div className="md:col-span-3 relative aspect-video md:aspect-auto md:min-h-[200px] overflow-hidden">
                      <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-105">
                        <ImagePlaceholder variant="hero" src={svc.img} className="rounded-none" />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-asli-dark/60 md:block hidden" />
                      <div className="absolute inset-0 bg-gradient-to-t from-asli-dark/80 to-transparent md:hidden" />
                    </div>

                    {/* Content panel */}
                    <div className="md:col-span-9 bg-asli-deep/60 group-hover:bg-asli-deep/80 transition-colors duration-300 px-7 py-7 flex flex-col justify-center backdrop-blur-[1px]">
                      <div className="flex items-start gap-5">
                        {/* Number */}
                        <span
                          className="shrink-0 font-display font-black text-asli-primary/30 group-hover:text-asli-primary/60 transition-colors duration-300 leading-none mt-1"
                          style={{ fontSize: '2.2rem' }}
                        >
                          {svc.num}
                        </span>

                        {/* Text */}
                        <div className="flex-1">
                          <h2 className="font-bold text-white text-lg md:text-xl leading-snug mb-3 group-hover:text-white transition-colors">
                            {svc.titulo}
                          </h2>
                          <p className="text-white/60 text-[15px] leading-relaxed mb-4">
                            {svc.descripcion}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {svc.tags.map((tag) => (
                              <span
                                key={tag}
                                className="px-3 py-1 rounded-full text-xs font-medium border border-white/[0.08] text-white/40 group-hover:border-asli-primary/30 group-hover:text-asli-primary/70 transition-all duration-300"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.article>
                ))}
              </div>
            </div>
          </section>

          {/* ── CTA ── */}
          <section className="py-20 bg-asli-secondary/25 border-t border-white/[0.06]">
            <div className="container mx-auto px-6 lg:px-10 text-center">
              <motion.div
                variants={fadeUp} initial="hidden" whileInView="visible" viewport={VP_ONCE}
              >
                <h3
                  className="font-display font-black text-white mb-4 leading-tight"
                  style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.5rem)', letterSpacing: '-0.02em' }}
                >
                  Coordina tu operación con{' '}
                  <span className="text-asli-primary">ASLI</span>
                </h3>
                <p className="text-white/65 text-lg mb-8 max-w-md mx-auto leading-relaxed">
                  Te apoyamos con seguimiento y control operativo de punta a punta.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a
                    href="/ejecutivos"
                    className="group inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-asli-primary text-white font-semibold hover:bg-asli-primary/85 transition-all duration-300 shadow-xl shadow-asli-primary/20 hover:-translate-y-px"
                  >
                    Hablar con un ejecutivo
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </a>
                  <a
                    href="/contacto"
                    className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full border border-white/20 text-white/80 font-semibold hover:border-white/40 hover:text-white transition-all duration-300"
                  >
                    Solicitar cotización
                  </a>
                </div>
              </motion.div>
            </div>
          </section>

        </main>

        <Footer />
      </div>
    </>
  )
}

export default ServiciosPage
