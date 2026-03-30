import { motion } from 'framer-motion'

const navieras = [
  { nombre: 'Avianca', logo: '/img/avianca.png' },
  { nombre: 'CMA CGM', logo: '/img/cma.png' },
  { nombre: 'LATAM Cargo', logo: '/img/latamcargo.png' },
  { nombre: 'ZIM', logo: '/img/zim.png' },
  { nombre: 'Maersk', logo: '/img/maersk.png' },
  { nombre: 'OOCL', logo: '/img/oocl.png' },
  { nombre: 'Iberia', logo: '/img/iberia.png' },
  { nombre: 'MSC', logo: '/img/msc.png' },
  { nombre: 'PIL', logo: '/img/pil.png' },
  { nombre: 'Sky', logo: '/img/skylogo.png' },
  { nombre: 'COSCO', logo: '/img/cosco.png' },
  { nombre: 'Yang Ming', logo: '/img/yangming.png' },
  { nombre: 'ONE', logo: '/img/one.png' },
  { nombre: 'JetSmart', logo: '/img/jetsmart.png' },
  { nombre: 'Wan Hai', logo: '/img/wanhai.png' },
  { nombre: 'Hapag-Lloyd', logo: '/img/hapag.png' },
  { nombre: 'Evergreen', logo: '/img/evergreen.png' },
  { nombre: 'Emirates SkyCargo', logo: '/img/emirates.png' },
  { nombre: 'American Airlines Cargo', logo: '/img/AmericanAirlinesCargo.png' },
]

// Duplicado completo para el marquee (translateX -50%)
const rowLoop = [...navieras, ...navieras]

const LogoCard = ({ n }) => (
  <div className="group mx-2 flex h-20 w-36 flex-shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-white/30 bg-white/[0.22] px-2 py-2 shadow-[0_10px_24px_rgba(0,0,0,0.24)] backdrop-blur-md transition-all duration-300 hover:border-asli-primary/55 hover:bg-white/[0.28]">
    <div className="relative flex h-11 w-full flex-1 min-h-0 items-center justify-center px-1">
      <img
        src={n.logo}
        alt={n.nombre}
        className="max-h-11 w-auto max-w-full object-contain object-center opacity-100 transition-opacity drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]"
      />
    </div>
    <span className="text-white/45 text-[9px] text-center leading-tight group-hover:text-white/70 transition-colors line-clamp-2">
      {n.nombre}
    </span>
  </div>
)

const NavierasPrincipales = () => (
  <section className="relative overflow-hidden bg-transparent py-16 md:py-24">

    <div className="container mx-auto px-6 lg:px-10 mb-14">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
      >
        <motion.p
          variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}
          className="eyebrow mb-4 text-center"
        >
          Conectados globalmente
        </motion.p>
        <motion.h2
          variants={{ hidden: { opacity: 0, y: 28 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22,1,0.36,1] } } }}
          className="font-display font-black text-white text-center"
          style={{ fontSize: 'clamp(2rem, 4.5vw, 3.4rem)', lineHeight: 1.05, letterSpacing: '-0.02em' }}
        >
          Navieras y{' '}
          <em className="not-italic text-asli-primary">aerolíneas</em>
        </motion.h2>
      </motion.div>
    </div>

    <div className="marquee-track relative mb-4">
      <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-24 bg-gradient-to-r from-asli-deep to-transparent" />
      <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-24 bg-gradient-to-l from-asli-deep to-transparent" />
      <div className="marquee-inner" style={{ animationDuration: '45s' }}>
        {rowLoop.map((n, i) => (
          <LogoCard key={`r1-${i}-${n.logo}`} n={n} />
        ))}
      </div>
    </div>

    <div className="marquee-track relative">
      <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-24 bg-gradient-to-r from-asli-deep to-transparent" />
      <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-24 bg-gradient-to-l from-asli-deep to-transparent" />
      <div className="marquee-inner" style={{ animationDuration: '55s', animationDirection: 'reverse' }}>
        {rowLoop.map((n, i) => (
          <LogoCard key={`r2-${i}-${n.logo}`} n={n} />
        ))}
      </div>
    </div>
  </section>
)

export default NavierasPrincipales
