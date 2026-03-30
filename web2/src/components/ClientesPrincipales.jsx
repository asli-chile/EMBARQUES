import { motion } from 'framer-motion'

const clientes = [
  { nombre: 'Alma', logo: '/img/alma.png' },
  { nombre: 'Cope', logo: '/img/cope.png' },
  { nombre: 'Hillvilla', logo: '/img/hillvilla.png' },
  { nombre: 'Xsur', logo: '/img/xsur.png' },
  { nombre: 'Jotrisa', logo: '/img/jotrisa.png' },
  { nombre: 'San Andrés', logo: '/img/san-andres.png' },
  { nombre: 'Rino', logo: '/img/rino.png' },
]

const allClientes = [...clientes, ...clientes]

const ClientesPrincipales = ({ embedded = false }) => (
  <section className={`relative overflow-hidden bg-transparent ${embedded ? 'pb-2 pt-0 md:pb-4' : 'py-24 md:py-32'}`}>
    {!embedded && (
      <div className="container mx-auto mb-14 px-6 lg:px-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          className="flex flex-col justify-between gap-6 md:flex-row md:items-end"
        >
          <div>
            <motion.p
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}
              className="eyebrow mb-4 text-asli-primary"
            >
              Nuestros Clientes
            </motion.p>
            <motion.h2
              variants={{ hidden: { opacity: 0, y: 28 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } } }}
              className="font-display font-black text-white"
              style={{ fontSize: 'clamp(2rem, 4.5vw, 3.4rem)', lineHeight: 1.05, letterSpacing: '-0.02em' }}
            >
              Empresas que confían{' '}
              <em className="not-italic text-asli-primary">en nosotros</em>
            </motion.h2>
          </div>
          <motion.p
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.6, delay: 0.2 } } }}
            className="max-w-xs text-right text-sm font-light text-white/50 md:text-left"
          >
            Colaboramos con las mejores empresas del sector exportador chileno
          </motion.p>
        </motion.div>
      </div>
    )}

    <div className="marquee-track relative">
      <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-28 bg-gradient-to-r from-asli-deep to-transparent md:w-32" />
      <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-28 bg-gradient-to-l from-asli-deep to-transparent md:w-32" />

      <div className="marquee-inner gap-5">
        {allClientes.map((c, i) => (
          <div
            key={`${c.nombre}-${i}`}
            className="group mx-2 flex h-24 w-44 flex-shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl border border-white/30 bg-white/[0.22] px-3 py-2 shadow-[0_10px_24px_rgba(0,0,0,0.24)] backdrop-blur-md transition-all duration-300 hover:border-asli-primary/55 hover:bg-white/[0.28]"
          >
            <div className="relative flex h-12 w-full min-h-0 flex-1 items-center justify-center px-1">
              <img
                src={c.logo}
                alt={c.nombre}
                className="max-h-12 w-auto max-w-full object-contain object-center opacity-100 transition-opacity drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]"
              />
            </div>
            <span className="text-center text-[10px] font-medium text-white/45 transition-colors group-hover:text-white/70">
              {c.nombre}
            </span>
          </div>
        ))}
      </div>
    </div>
  </section>
)

export default ClientesPrincipales
