import { motion } from 'framer-motion'
import ImagePlaceholder from './ImagePlaceholder'
import { useLang } from '../lib/LangContext'

const Hero = () => {
  const { t } = useLang()
  const stats = [
    { value: '2021', label: t.hero.stat1l },
    { value: '9+', label: t.hero.stat2l },
    { value: '15+', label: t.hero.stat3l },
    { value: '100%', label: t.hero.stat4l },
  ]

  const handleScroll = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleAccederApp = () => {
    if (typeof window === 'undefined') return
    const { hostname } = window.location
    const isLocal = ['localhost', '127.0.0.1', ''].includes(hostname) ||
      /^(192\.168\.|10\.|172\.)/.test(hostname)
    window.location.href = isLocal ? 'http://localhost:3001' : '/auth'
  }

  return (
    <section
      id="inicio"
      className="relative min-h-screen flex items-end pb-0 bg-asli-dark overflow-hidden"
    >
      <div className="absolute inset-0 overflow-hidden">
        <ImagePlaceholder
          variant="hero"
          src="/frontis.webp"
          alt="ASLI"
        />
      </div>

      {/* Layered overlays for depth */}
      <div className="absolute inset-0 bg-gradient-to-r from-asli-dark via-asli-dark/80 to-asli-dark/30" />
      <div className="absolute inset-0 bg-gradient-to-t from-asli-dark via-transparent to-asli-dark/60" />

      {/* Grain texture */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Teal accent line left */}
      <motion.div
        initial={{ scaleY: 0, originY: 1 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 1.2, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="absolute left-6 lg:left-10 top-28 bottom-[240px] w-px bg-gradient-to-b from-transparent via-asli-primary to-transparent"
      />

      {/* Main content */}
      <div className="relative z-10 w-full container mx-auto px-6 lg:px-10 pt-32 pb-0">
        <div className="max-w-4xl">

          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="flex items-center gap-3 mb-6"
          >
            <span className="w-8 h-px bg-asli-primary" />
            <span className="eyebrow">{t.hero.eyebrow}</span>
          </motion.div>

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="mb-6"
          >
            <ImagePlaceholder
              variant="logo"
              className="h-16 md:h-20 min-w-[180px] md:min-w-[220px]"
            />
          </motion.div>

          {/* Headline — staggered words */}
          <div className="overflow-hidden mb-3">
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.1, delay: 0.4 }}
              className="font-display font-black text-white leading-none"
              style={{ fontSize: 'clamp(2.8rem, 7vw, 6rem)', letterSpacing: '-0.03em' }}
            >
              {[t.hero.line1, t.hero.line2].map((line, li) => (
                <motion.span
                  key={li}
                  initial={{ y: '110%' }}
                  animate={{ y: 0 }}
                  transition={{ duration: 0.9, delay: 0.45 + li * 0.12, ease: [0.22, 1, 0.36, 1] }}
                  className="block"
                >
                  {line}
                </motion.span>
              ))}
              <motion.span
                initial={{ y: '110%' }}
                animate={{ y: 0 }}
                transition={{ duration: 0.9, delay: 0.69, ease: [0.22, 1, 0.36, 1] }}
                className="block italic text-asli-primary"
                style={{ WebkitTextStroke: '0px' }}
              >
                {t.hero.line3}
              </motion.span>
            </motion.h1>
          </div>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.9 }}
            className="text-white/60 text-lg md:text-xl max-w-xl leading-relaxed mb-10 font-light"
          >
            {t.hero.sub}
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 1.05 }}
            className="flex flex-col sm:flex-row flex-wrap gap-3 mb-12 md:mb-16"
          >
            <button
              onClick={() => handleScroll('servicios')}
              className="group inline-flex items-center justify-center gap-3 px-7 py-4 rounded-full bg-asli-primary text-white font-semibold hover:bg-asli-primary/90 transition-all duration-300 shadow-lg shadow-asli-primary/25 w-full sm:w-auto"
            >
              {t.hero.cta1}
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
            <button
              onClick={handleAccederApp}
              className="group inline-flex items-center justify-center gap-3 px-7 py-4 rounded-full bg-asli-accent text-white font-semibold hover:bg-asli-accent/90 transition-all duration-300 shadow-lg shadow-asli-accent/20 w-full sm:w-auto"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              {t.hero.cta2}
            </button>
            <button
              onClick={() => handleScroll('contacto')}
              className="inline-flex items-center justify-center gap-3 px-7 py-4 rounded-full border border-white/20 text-white/80 font-semibold hover:border-white/40 hover:text-white transition-all duration-300 w-full sm:w-auto"
            >
              {t.hero.cta3}
            </button>
          </motion.div>
        </div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="border-t border-white/10 grid grid-cols-2 md:grid-cols-4"
        >
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={`py-5 px-4 md:px-6 ${
                // mobile: borde derecho solo en col izquierda (índices 0 y 2)
                // desktop: borde derecho en todos menos el último
                i % 2 === 0 && i !== stats.length - 1
                  ? 'border-r border-white/10 md:border-r-0'
                  : ''
              } ${
                i < stats.length - 1 ? 'md:border-r md:border-white/10' : ''
              }`}
            >
              <p
                className="font-display font-black text-asli-primary mb-1"
                style={{ fontSize: 'clamp(1.6rem, 4vw, 2.8rem)', lineHeight: 1 }}
              >
                {stat.value}
              </p>
              <p className="text-white/50 text-xs font-light tracking-wide leading-snug">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 right-8 hidden lg:flex flex-col items-center gap-2"
      >
        <p className="eyebrow rotate-90 origin-center" style={{ writingMode: 'vertical-rl' }}>
          Scroll
        </p>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
          className="w-px h-12 bg-gradient-to-b from-asli-primary to-transparent"
        />
      </motion.div>
    </section>
  )
}

export default Hero
