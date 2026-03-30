import Head from 'next/head'
import { motion } from 'framer-motion'
import Header from '../src/components/Header'
import Footer from '../src/components/Footer'
import NavierasPrincipales from '../src/components/NavierasPrincipales'
import ImagePlaceholder from '../src/components/ImagePlaceholder'

const fadeUp = {
  hidden:  { opacity: 0, y: 40 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.75, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
}

const VP_ONCE = { once: true, amount: 0.15 }

const EXPERIENCIA = [
  'Operaciones de exportación e importación',
  'Múltiples tipos de carga (perecible, refrigerada, congelada y general)',
  'Logística frutícola y cadena de frío',
  'Coordinación multimodal',
  'Operaciones de alta exigencia en temporada (especialmente cereza)',
]

const EQUIPO = [
  { nombre: 'Mario Basaez',       cargo: 'Fundador y CEO',             foto: '/img/mariobasaez.png' },
  { nombre: 'Hans Vásquez',       cargo: 'Operaciones',                 foto: '/img/hansv.png' },
  { nombre: 'Poliana Cisternas',  cargo: 'Ejecutiva Comercial',         foto: '/img/poli.jpg' },
  { nombre: 'Rocío Villareal',    cargo: 'Inocuidad Alimentaria',       foto: '/img/rocio.png' },
  { nombre: 'Stefanie Córdova',   cargo: 'Administración y Finanzas',   foto: '/img/stefanie.png' },
  { nombre: 'Rodrigo Casillo',    cargo: 'Ejecutivo comercial zona sur', foto: null },
  { nombre: 'Nina Scotti',        cargo: 'Ventas e Importaciones',      foto: '/img/nina.png' },
  { nombre: 'Ricardo Lazo',       cargo: 'Comercio Exterior',           foto: '/img/ricardolazo.png' },
  { nombre: 'Alex Cárdenas',      cargo: 'Coordinador de Transportes',  foto: '/img/alex.png' },
  { nombre: 'Rodrigo Cáceres',    cargo: 'Atención al Cliente',         foto: '/img/rodrigo.png' },
]

const NosotrosPage = () => {
  return (
    <>
      <Head>
        <title>Nosotros | ASLI Logística</title>
        <meta
          name="description"
          content="ASLI Logística y Comercio Exterior. Empresa especializada en coordinación logística de exportaciones e importaciones desde Curicó, Chile."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div className="min-h-screen flex flex-col bg-asli-dark">
        <Header />

        <main className="flex-grow">

          {/* ── Hero de página ── */}
          <section className="relative pt-36 pb-20 md:pb-28 overflow-hidden bg-gradient-to-b from-asli-deep to-asli-dark">
            <div className="absolute inset-0 overflow-hidden opacity-20">
              <ImagePlaceholder variant="hero" src="/img/edificio.webp" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-asli-deep via-asli-deep/85 to-asli-deep/60" />
            <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-asli-primary/50 to-transparent" />

            <div className="relative z-10 container mx-auto px-6 lg:px-10 max-w-4xl">
              <motion.div
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="flex items-center gap-3 mb-5"
              >
                <span className="w-6 h-px bg-asli-primary" />
                <span className="eyebrow">Quiénes somos</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.75, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                className="font-display font-black text-white leading-tight mb-6"
                style={{ fontSize: 'clamp(2rem, 5vw, 3.8rem)', letterSpacing: '-0.025em' }}
              >
                Quiénes somos
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.3 }}
                className="text-white/65 text-lg leading-relaxed max-w-3xl"
              >
                ASLI Logística y Comercio Exterior es una empresa ubicada en Curicó,
                especializada en la coordinación logística de exportaciones e importaciones.
                Acompañamos a empresas de distintos sectores —especialmente del rubro
                frutícola— asegurando control, continuidad y visibilidad en cada etapa
                del proceso logístico.
              </motion.p>
            </div>
          </section>

          {/* ── Nuestro enfoque ── */}
          <section className="py-20 md:py-28 bg-asli-dark border-y border-white/[0.06]">
            <div className="container mx-auto px-6 lg:px-10">
              <div className="grid lg:grid-cols-2 gap-16 items-center">

                {/* Left: text */}
                <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={VP_ONCE}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="w-6 h-px bg-asli-primary" />
                    <span className="eyebrow">Nuestro enfoque</span>
                  </div>
                  <h2
                    className="font-display font-black text-white leading-tight mb-6"
                    style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', letterSpacing: '-0.02em' }}
                  >
                    Logística gestionada<br />
                    <span className="text-asli-primary">desde origen</span>
                  </h2>
                  <p className="text-white/65 text-[16px] leading-relaxed mb-5">
                    Creemos en una logística gestionada desde origen, donde cada etapa de
                    la cadena está integrada para asegurar eficiencia operativa y cumplimiento en destino.
                  </p>
                  <div className="border-l-2 border-asli-primary pl-5 py-1">
                    <p className="text-white font-semibold text-lg italic">
                      "No solo movemos carga — coordinamos la operación desde origen."
                    </p>
                  </div>
                </motion.div>

                {/* Right: image */}
                <motion.div
                  variants={fadeUp} custom={1} initial="hidden" whileInView="visible" viewport={VP_ONCE}
                  className="relative"
                >
                  <div className="relative rounded-2xl overflow-hidden aspect-[4/3] shadow-2xl shadow-black/40 ring-1 ring-white/10">
                    <div className="absolute inset-0">
                      <ImagePlaceholder variant="hero" src="/img/world.webp" className="rounded-none" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-asli-dark/40 to-transparent" />
                  </div>
                </motion.div>
              </div>
            </div>
          </section>

          {/* ── Experiencia y respaldo ── */}
          <section className="py-20 md:py-28 bg-asli-secondary/25 border-b border-white/[0.06]">
            <div className="container mx-auto px-6 lg:px-10">
              <div className="grid lg:grid-cols-2 gap-16 items-center">

                {/* Left: image */}
                <motion.div
                  variants={fadeUp} initial="hidden" whileInView="visible" viewport={VP_ONCE}
                  className="relative order-2 lg:order-1"
                >
                  <div className="relative rounded-2xl overflow-hidden aspect-video shadow-2xl shadow-black/30 ring-1 ring-white/10">
                    <div className="absolute inset-0">
                      <ImagePlaceholder variant="hero" src="/img/barco.webp" className="rounded-none" />
                    </div>
                  </div>
                  <div className="absolute -bottom-4 -right-4 glass rounded-xl px-5 py-4 shadow-xl hidden md:block">
                    <p className="font-display font-black text-asli-primary" style={{ fontSize: '1.8rem', lineHeight: 1 }}>20+</p>
                    <p className="text-white/55 text-xs mt-1 tracking-wide">años de experiencia</p>
                  </div>
                </motion.div>

                {/* Right: list */}
                <motion.div
                  variants={fadeUp} custom={1} initial="hidden" whileInView="visible" viewport={VP_ONCE}
                  className="order-1 lg:order-2"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span className="w-6 h-px bg-asli-primary" />
                    <span className="eyebrow">Experiencia y respaldo</span>
                  </div>
                  <h2
                    className="font-display font-black text-white leading-tight mb-6"
                    style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', letterSpacing: '-0.02em' }}
                  >
                    Contamos con experiencia en:
                  </h2>
                  <ul className="space-y-4">
                    {EXPERIENCIA.map((item) => (
                      <li key={item} className="flex items-start gap-4 group">
                        <div className="shrink-0 w-6 h-6 rounded-full bg-asli-primary/15 border border-asli-primary/30 flex items-center justify-center mt-0.5 group-hover:bg-asli-primary group-hover:border-asli-primary transition-all duration-300">
                          <svg className="w-3 h-3 text-asli-primary group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <p className="text-white/70 text-[15px] leading-relaxed group-hover:text-white/90 transition-colors">{item}</p>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </div>
            </div>
          </section>

          {/* ── Nuestro equipo ── */}
          <section className="py-20 md:py-28 bg-asli-dark border-b border-white/[0.06]">
            <div className="container mx-auto px-6 lg:px-10">
              <motion.div
                variants={fadeUp} initial="hidden" whileInView="visible" viewport={VP_ONCE}
                className="mb-14"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-6 h-px bg-asli-primary" />
                  <span className="eyebrow">El equipo</span>
                </div>
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                  <h2
                    className="font-display font-black text-white leading-tight"
                    style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', letterSpacing: '-0.02em' }}
                  >
                    Nuestro equipo
                  </h2>
                  <p className="text-white/55 text-base max-w-sm leading-relaxed">
                    Profesionales con experiencia en logística internacional y comercio exterior,
                    con más de 20 años de trayectoria en el rubro.
                  </p>
                </div>
              </motion.div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
                {EQUIPO.map((persona, i) => (
                  <motion.div
                    key={persona.nombre}
                    variants={fadeUp} custom={i * 0.3} initial="hidden" whileInView="visible" viewport={VP_ONCE}
                    className="group text-center rounded-2xl p-2 transition-all duration-300 hover:bg-white/[0.03]"
                  >
                    {/* Photo */}
                    <div className="relative rounded-2xl overflow-hidden aspect-square mb-4 shadow-lg shadow-black/30 ring-1 ring-white/10">
                      <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-105">
                        {persona.foto ? (
                          <img
                            src={persona.foto}
                            alt={persona.nombre}
                            className="absolute inset-0 w-full h-full object-cover object-top"
                          />
                        ) : (
                          <ImagePlaceholder
                            variant="default"
                            className="absolute inset-0 h-full w-full min-h-0 rounded-none border-white/15"
                          />
                        )}
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-asli-dark/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400" />
                    </div>

                    {/* Name + role */}
                    <h3 className="text-white font-semibold text-sm leading-snug mb-1">{persona.nombre}</h3>
                    <p className="text-asli-primary text-xs">{persona.cargo}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Red de trabajo internacional ── */}
          <section className="py-8 bg-asli-deep border-t border-white/[0.06]">
            <div className="container mx-auto px-6 lg:px-10 py-16">
              <motion.div
                variants={fadeUp} initial="hidden" whileInView="visible" viewport={VP_ONCE}
                className="text-center mb-12"
              >
                <div className="flex items-center justify-center gap-3 mb-4">
                  <span className="w-6 h-px bg-asli-primary" />
                  <span className="eyebrow">Partners</span>
                  <span className="w-6 h-px bg-asli-primary" />
                </div>
                <h2
                  className="font-display font-black text-white leading-tight mb-5"
                  style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', letterSpacing: '-0.02em' }}
                >
                  Red de trabajo internacional
                </h2>
                <p className="text-white/60 text-base leading-relaxed max-w-xl mx-auto">
                  Operamos con una red de navieras, aerolíneas y agentes internacionales
                  en los principales mercados, asegurando continuidad operativa y cobertura global.
                </p>
              </motion.div>
            </div>

            <NavierasPrincipales />
          </section>

          {/* ── Ubicación ── */}
          <section className="py-20 bg-asli-dark border-y border-white/[0.06]">
            <div className="container mx-auto px-6 lg:px-10">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={VP_ONCE}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="w-6 h-px bg-asli-primary" />
                    <span className="eyebrow">Ubicación</span>
                  </div>
                  <h2
                    className="font-display font-black text-white leading-tight mb-5"
                    style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', letterSpacing: '-0.02em' }}
                  >
                    Curicó, en el corazón<br />
                    <span className="text-asli-primary">de la zona frutícola</span>
                  </h2>
                  <p className="text-white/65 text-base leading-relaxed mb-8">
                    Estamos ubicados en Curicó, lo que nos permite una coordinación directa
                    desde origen y una operación más eficiente. En el corazón de la zona frutícola
                    más importante de Chile.
                  </p>

                  <div className="flex items-center gap-3 glass rounded-xl px-5 py-4 w-fit">
                    <svg className="w-5 h-5 text-asli-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div>
                      <p className="text-white font-medium">Curicó, Chile</p>
                      <p className="text-white/45 text-xs">Región del Maule</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  variants={fadeUp} custom={1} initial="hidden" whileInView="visible" viewport={VP_ONCE}
                  className="relative"
                >
                  <div className="relative rounded-2xl overflow-hidden aspect-video shadow-2xl shadow-black/30 ring-1 ring-white/10">
                    <div className="absolute inset-0">
                      <ImagePlaceholder variant="hero" src="/img/edificio.webp" className="rounded-none" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-asli-dark/30 to-transparent" />
                  </div>
                </motion.div>
              </div>
            </div>
          </section>

          {/* ── CTA ── */}
          <section className="py-20 bg-asli-deep border-t border-white/[0.06]">
            <div className="container mx-auto px-6 lg:px-10 text-center">
              <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={VP_ONCE}>
                <h3
                  className="font-display font-black text-white mb-4 leading-tight"
                  style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', letterSpacing: '-0.02em' }}
                >
                  ¿Querés trabajar con nosotros?
                </h3>
                <p className="text-white/60 text-lg mb-8 max-w-md mx-auto">
                  Coordiná tu próxima operación con nuestro equipo.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a
                    href="/contacto"
                    className="group inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-asli-primary text-white font-semibold hover:bg-asli-primary/85 transition-all duration-300 shadow-lg shadow-asli-primary/20 hover:-translate-y-px"
                  >
                    Contactar al equipo
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
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

export default NosotrosPage
