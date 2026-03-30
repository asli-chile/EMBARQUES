import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import ImagePlaceholder from './ImagePlaceholder'

const fadeUp = {
  hidden:  { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
}

function CountUp({ target, suffix = '', inView }) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!inView) return
    let start = null
    const duration = 2000
    const step = (ts) => {
      if (!start) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [inView, target])
  return <>{count}{suffix}</>
}

const stats = [
  { value: 3, suffix: '+', label: 'Años de experiencia', sub: 'Desde 2021 en el mercado' },
  { value: 100, suffix: '%', label: 'Satisfacción', sub: 'Compromiso con la excelencia' },
  { value: 9, suffix: '', label: 'Servicios integrales', sub: 'Cobertura multimodal completa' },
]

const QuienesSomos = () => {
  const ref     = useRef(null)
  const inView  = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="quienes-somos" className="relative py-14 md:py-36 bg-asli-secondary overflow-hidden">

      <div className="container mx-auto px-6 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-24 items-center">

          {/* Left: text */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
          >
            <motion.p variants={fadeUp} className="eyebrow mb-4">
              Quiénes Somos
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className="font-display font-black text-white mb-6"
              style={{ fontSize: 'clamp(2.2rem, 5vw, 3.8rem)', lineHeight: 1.05, letterSpacing: '-0.02em' }}
            >
              Tu mejor opción en{' '}
              <em className="not-italic text-asli-primary">logística integral</em>
            </motion.h2>
            <motion.div variants={fadeUp} className="w-12 h-0.5 bg-asli-primary rounded-full mb-6" />
            <motion.p variants={fadeUp} className="text-white/60 text-lg leading-relaxed mb-4 font-light">
              Somos una empresa especializada en servicios logísticos integrales,
              con un enfoque profesional y comprometido con la excelencia.
            </motion.p>
            <motion.p variants={fadeUp} className="text-white/60 text-lg leading-relaxed font-light">
              Desde nuestra fundación en 2021 en Curicó, hemos construido una red
              sólida de alianzas estratégicas que nos permite ofrecer soluciones
              completas y eficientes para cada cliente.
            </motion.p>
          </motion.div>

          {/* Right: stat cards */}
          <div ref={ref} className="grid grid-cols-1 gap-4">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.7, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-center gap-6 p-6 rounded-2xl glass hover:border-asli-primary/30 transition-all duration-300 group"
              >
                <div
                  className="font-display font-black text-asli-primary shrink-0 group-hover:scale-105 transition-transform duration-300"
                  style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', lineHeight: 1, minWidth: '5rem' }}
                >
                  <CountUp target={stat.value} suffix={stat.suffix} inView={inView} />
                </div>
                <div>
                  <p className="text-white font-semibold text-lg leading-tight mb-1">{stat.label}</p>
                  <p className="text-white/40 text-sm font-light">{stat.sub}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Building image */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 md:mt-20 relative rounded-3xl overflow-hidden"
          style={{ height: 'clamp(220px, 35vw, 420px)' }}
        >
          <div className="absolute inset-0">
            <ImagePlaceholder variant="hero" className="rounded-none" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-asli-secondary/80 via-transparent to-transparent" />
          <div className="absolute bottom-8 left-8">
            <p className="eyebrow mb-1">Nuestra sede</p>
            <p className="text-white font-display font-bold text-2xl">Curicó, Región del Maule</p>
          </div>
          {/* Teal border accent */}
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-asli-primary via-asli-accent to-transparent" />
        </motion.div>
      </div>
    </section>
  )
}

export default QuienesSomos
