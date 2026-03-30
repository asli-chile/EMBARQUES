import { motion } from 'framer-motion'

const partners = [
  { nombre: 'Agronexo', logo: '/img/agronexo.png' },
  { nombre: 'CCS', logo: '/img/ccs.png' },
  { nombre: 'Fedefruta', logo: '/img/fedefruta.png' },
  { nombre: 'Maule Alimenta', logo: '/img/maulealimenta.png' },
  { nombre: 'ProChile', logo: '/img/prochile.png' },
]

const allPartners = [...partners, ...partners]

const SomosParteDe = () => (
  <div id="socios" className="relative overflow-hidden pt-8 pb-2 md:pt-12 md:pb-6">
    <div className="container relative z-10 mx-auto mb-10 px-6 lg:px-10 md:mb-12">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        className="text-center"
      >
        <motion.p
          variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}
          className="eyebrow mb-4"
        >
          Partners
        </motion.p>
        <motion.h2
          variants={{ hidden: { opacity: 0, y: 28 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } } }}
          className="font-display font-black text-white"
          style={{ fontSize: 'clamp(1.75rem, 3.8vw, 3rem)', lineHeight: 1.05, letterSpacing: '-0.02em' }}
        >
          Somos parte de{' '}
          <em className="not-italic text-asli-primary">un ecosistema mayor</em>
        </motion.h2>
        <motion.p
          variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.2 } } }}
          className="mx-auto mt-3 max-w-xl text-base font-light text-white/50 md:text-lg"
        >
          Respaldados por alianzas con líderes de la industria logística y agroexportadora.
        </motion.p>
      </motion.div>
    </div>

    <div className="marquee-track relative">
      <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-28 bg-gradient-to-r from-asli-deep to-transparent md:w-32" />
      <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-28 bg-gradient-to-l from-asli-deep to-transparent md:w-32" />

      <div className="marquee-inner gap-5" style={{ animationDuration: '40s' }}>
        {allPartners.map((p, i) => (
          <div
            key={`${p.nombre}-${i}`}
            className="group mx-2 flex h-24 w-44 flex-shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl border border-white/30 bg-white/[0.22] px-3 py-2 shadow-[0_10px_24px_rgba(0,0,0,0.24)] backdrop-blur-md transition-all duration-300 hover:border-asli-primary/55 hover:bg-white/[0.28]"
          >
            <div className="relative flex h-12 w-full min-h-0 flex-1 items-center justify-center px-1">
              <img
                src={p.logo}
                alt={p.nombre}
                className="max-h-12 w-auto max-w-full object-contain object-center opacity-100 transition-opacity drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]"
              />
            </div>
            <span className="text-center text-[10px] font-medium text-white/45 transition-colors group-hover:text-white/70">
              {p.nombre}
            </span>
          </div>
        ))}
      </div>
    </div>
  </div>
)

export default SomosParteDe
