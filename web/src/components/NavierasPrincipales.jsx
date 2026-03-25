import { motion } from 'framer-motion'

const navieras = [
  { nombre: 'Avianca',  logo: '/img/avianca.png' },
  { nombre: 'CMA CGM', logo: '/img/cma.png' },
  { nombre: 'LATAM',   logo: '/img/latamcargo.png' },
  { nombre: 'ZIM',     logo: '/img/zim.png' },
  { nombre: 'Maersk',  logo: '/img/maersk.png' },
  { nombre: 'OOCL',    logo: '/img/oocl.png' },
  { nombre: 'Iberia',  logo: '/img/iberia.png' },
  { nombre: 'MSC',     logo: '/img/msc.png' },
  { nombre: 'PIL',     logo: '/img/pil.png' },
  { nombre: 'Sky',     logo: '/img/skylogo.png' },
  { nombre: 'COSCO',   logo: '/img/cosco.png' },
  { nombre: 'Yangming',logo: '/img/yangming.png' },
  { nombre: 'ONE',     logo: '/img/one.png' },
  { nombre: 'JetSmart',logo: '/img/jetsmart.png' },
  { nombre: 'Wan Hai', logo: '/img/wanhai.png' },
]

// Split into two rows
const row1 = [...navieras.slice(0, 8), ...navieras.slice(0, 8)]
const row2 = [...navieras.slice(7), ...navieras.slice(7)]

const LogoCard = ({ n }) => (
  <div className="flex-shrink-0 mx-2 w-36 h-20 glass rounded-xl flex items-center justify-center px-4 border border-white/8 hover:border-asli-primary/40 hover:bg-asli-primary/5 transition-all duration-300 group">
    <img
      src={n.logo}
      alt={n.nombre}
      className="max-h-10 max-w-full object-contain opacity-60 group-hover:opacity-100 transition-opacity duration-300"
      onError={e => { e.target.style.display = 'none'; e.target.parentElement.innerHTML += `<span class="text-white/30 text-xs text-center">${n.nombre}</span>` }}
    />
  </div>
)

const NavierasPrincipales = () => (
  <section className="relative py-24 md:py-32 bg-asli-secondary overflow-hidden">

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
          Conectados Globalmente
        </motion.p>
        <motion.h2
          variants={{ hidden: { opacity: 0, y: 28 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22,1,0.36,1] } } }}
          className="font-display font-black text-white text-center"
          style={{ fontSize: 'clamp(2rem, 4.5vw, 3.4rem)', lineHeight: 1.05, letterSpacing: '-0.02em' }}
        >
          Navieras &{' '}
          <em className="not-italic text-asli-primary">Aerolíneas</em>
        </motion.h2>
      </motion.div>
    </div>

    {/* Row 1 */}
    <div className="marquee-track relative mb-4">
      <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-asli-secondary to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-asli-secondary to-transparent z-10 pointer-events-none" />
      <div className="marquee-inner" style={{ animationDuration: '45s' }}>
        {row1.map((n, i) => <LogoCard key={`r1-${i}`} n={n} />)}
      </div>
    </div>

    {/* Row 2 — reverse direction */}
    <div className="marquee-track relative">
      <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-asli-secondary to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-asli-secondary to-transparent z-10 pointer-events-none" />
      <div className="marquee-inner" style={{ animationDuration: '55s', animationDirection: 'reverse' }}>
        {row2.map((n, i) => <LogoCard key={`r2-${i}`} n={n} />)}
      </div>
    </div>
  </section>
)

export default NavierasPrincipales
