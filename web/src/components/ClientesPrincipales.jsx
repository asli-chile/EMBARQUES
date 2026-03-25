import { motion } from 'framer-motion'

const clientes = [
  { nombre: 'Alma',       logo: '/img/alma.png' },
  { nombre: 'Cope',       logo: '/img/cope.png' },
  { nombre: 'Hillvilla',  logo: '/img/hillvilla.png' },
  { nombre: 'Xsur',       logo: '/img/xsur.png' },
  { nombre: 'Jotrisa',    logo: '/img/jotrisa.png' },
  { nombre: 'San Andrés', logo: '/img/san-andres.png' },
  { nombre: 'Rino',       logo: '/img/rino.png' },
]

// Duplicate for seamless loop
const allClientes = [...clientes, ...clientes]

const ClientesPrincipales = () => (
  <section className="relative py-24 md:py-32 bg-asli-light overflow-hidden">

    <div className="container mx-auto px-6 lg:px-10 mb-14">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-6"
      >
        <div>
          <motion.p
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}
            className="eyebrow text-asli-primary mb-4"
          >
            Nuestros Clientes
          </motion.p>
          <motion.h2
            variants={{ hidden: { opacity: 0, y: 28 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22,1,0.36,1] } } }}
            className="font-display font-black text-asli-dark"
            style={{ fontSize: 'clamp(2rem, 4.5vw, 3.4rem)', lineHeight: 1.05, letterSpacing: '-0.02em' }}
          >
            Empresas que confían{' '}
            <em className="not-italic text-asli-primary">en nosotros</em>
          </motion.h2>
        </div>
        <motion.p
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.6, delay: 0.2 } } }}
          className="text-asli-dark/50 text-sm max-w-xs text-right font-light"
        >
          Colaboramos con las mejores empresas del sector exportador chileno
        </motion.p>
      </motion.div>
    </div>

    {/* Marquee */}
    <div className="marquee-track relative">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-asli-light to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-asli-light to-transparent z-10 pointer-events-none" />

      <div className="marquee-inner gap-5">
        {allClientes.map((c, i) => (
          <div
            key={`${c.nombre}-${i}`}
            className="flex-shrink-0 w-44 h-24 mx-2 rounded-2xl bg-white border border-asli-dark/8 shadow-sm flex items-center justify-center px-6 hover:border-asli-primary/40 hover:shadow-md transition-all duration-300"
          >
            <img
              src={c.logo}
              alt={c.nombre}
              className="max-h-12 max-w-full object-contain"
            />
          </div>
        ))}
      </div>
    </div>
  </section>
)

export default ClientesPrincipales
