import Head from 'next/head'
import Image from 'next/image'
import { useRef, useEffect, useState } from 'react'
import { motion, useInView, useMotionValue, animate, useScroll, useTransform } from 'framer-motion'
import Header from '../src/components/Header'
import Footer from '../src/components/Footer'
import ImagePlaceholder from '../src/components/ImagePlaceholder'
import ClientesPrincipales from '../src/components/ClientesPrincipales'
import NavierasPrincipales from '../src/components/NavierasPrincipales'
import SomosParteDe from '../src/components/SomosParteDe'
import { useLang } from '../src/lib/LangContext'

/* ══════════════════════════════════════════════════════
   ANIMATION VARIANTS
══════════════════════════════════════════════════════ */
const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.11, delayChildren: 0.05 } },
}

const fadeSlideUp = {
  hidden:  { opacity: 0, y: 48 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.72, ease: [0.22, 1, 0.36, 1] } },
}

const fadeSlideLeft = {
  hidden:  { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
}

const fadeSlideRight = {
  hidden:  { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
}

const scaleIn = {
  hidden:  { opacity: 0, scale: 0.88 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] } },
}

const VP = { once: true, amount: 0.18 }

/* ══════════════════════════════════════════════════════
   PARALLAX WRAPPER
══════════════════════════════════════════════════════ */
function ParallaxImg({ src = '/frontis.webp', alt = '', speed = 15, className = '', imgClassName = '' }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [`-${speed}%`, `${speed}%`])
  return (
    <div ref={ref} className={`absolute inset-0 overflow-hidden ${className}`}>
      <motion.img
        src={src}
        alt={alt}
        aria-hidden
        style={{ y }}
        className={`absolute inset-0 w-full h-full object-cover scale-125 ${imgClassName}`}
      />
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   ANIMATED COUNTER
══════════════════════════════════════════════════════ */
function Counter({ value }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })
  const mv = useMotionValue(0)
  const [display, setDisplay] = useState('0')

  // Parse numeric part and suffix/prefix
  const numeric = parseInt(value.replace(/\D/g, '')) || 0
  const prefix  = value.match(/^[^\d]*/)?.[0] || ''
  const suffix  = value.match(/[^\d]*$/)?.[0] || ''

  useEffect(() => {
    if (!isInView || numeric === 0) {
      setDisplay(value)
      return
    }
    const controls = animate(mv, numeric, {
      duration: 1.8,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(prefix + Math.floor(v).toString() + suffix),
    })
    return controls.stop
  }, [isInView, numeric]) // eslint-disable-line

  return <span ref={ref}>{display}</span>
}

/* ══════════════════════════════════════════════════════
   GLOWING ORB (decorative)
══════════════════════════════════════════════════════ */
function Orb({ className }) {
  return (
    <motion.div
      className={`absolute rounded-full pointer-events-none ${className}`}
      animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.65, 0.4] }}
      transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
    />
  )
}

const AUDIENCIA_ICONS = [
  (
    <svg key="i0" className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.4} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
    </svg>
  ),
  (
    <svg key="i1" className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.4} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  (
    <svg key="i2" className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.4} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
]

/* ══════════════════════════════════════════════════════
   SHARED
══════════════════════════════════════════════════════ */
function Eyebrow({ children, center = false }) {
  return (
    <div className={`flex items-center gap-3 mb-4 ${center ? 'justify-center' : ''}`}>
      <span className="w-6 h-px bg-asli-primary" />
      <span className="eyebrow">{children}</span>
      {center && <span className="w-6 h-px bg-asli-primary" />}
    </div>
  )
}

function H2({ children, center = false }) {
  return (
    <h2
      className={`font-display font-black text-white leading-tight ${center ? 'text-center' : ''}`}
      style={{ fontSize: 'clamp(1.9rem, 3.8vw, 3.1rem)', letterSpacing: '-0.022em' }}
    >
      {children}
    </h2>
  )
}

/* ══════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════ */
export default function Home() {
  const { t } = useLang()
  const h = t.home
  const audiencia = h.audienceCards.map((item, i) => ({ ...item, icon: AUDIENCIA_ICONS[i] }))

  return (
    <>
      <Head>
        <title>{h.metaTitle}</title>
        <meta name="description" content={h.metaDesc} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div className="min-h-screen flex flex-col bg-asli-dark overflow-x-hidden">
        <Header />
        <main className="flex-grow">

          {/* ══════════════════════════════════════════════════════
              HERO
          ══════════════════════════════════════════════════════ */}
          <section
            id="inicio"
            className="relative flex min-h-screen min-h-[100dvh] flex-col overflow-x-hidden bg-asli-dark"
          >
            {/* Parallax BG */}
            <ParallaxImg src="/frontis.webp" imgClassName="object-[50%_17%]" />

            {/* Overlays */}
            <div className="absolute inset-0 bg-gradient-to-r from-asli-dark via-asli-dark/82 to-asli-dark/25 z-10" />
            <div className="absolute inset-0 bg-gradient-to-t from-asli-dark via-transparent to-asli-dark/55 z-10" />

            {/* Grain */}
            <div className="absolute inset-0 z-10 opacity-[0.035] pointer-events-none"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }}
            />

            {/* Ambient orbs */}
            <Orb className="pointer-events-none w-[min(24rem,70vw)] h-[min(24rem,70vw)] max-w-[100vw] bg-asli-primary/10 blur-[100px] top-1/4 -right-4 sm:right-10 z-10" />
            <Orb className="pointer-events-none w-64 h-64 max-w-[90vw] bg-asli-accent/8 blur-[80px] bottom-40 right-1/3 z-10" />

            {/* Accent vertical line — oculta en móvil muy bajo para no chocar con el contenido */}
            <motion.div
              initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
              transition={{ duration: 1.3, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
              style={{ originY: 0 }}
              className="absolute left-6 lg:left-10 top-28 bottom-32 md:bottom-24 hidden sm:block w-px bg-gradient-to-b from-transparent via-asli-primary to-transparent z-20"
            />

            {/* Main content — fills space between header and stats bar */}
            <div className="relative z-20 flex min-h-0 flex-1 flex-col justify-center container mx-auto px-4 sm:px-6 lg:px-10 pt-[max(3.5rem,env(safe-area-inset-top,0px)+2.5rem)] pb-4 sm:pt-20 md:pt-24 sm:pb-6">
              <div className="max-w-3xl">

                {/* Eyebrow */}
                <motion.div
                  initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.7, delay: 0.2 }}
                  className="flex items-center gap-3 mb-5"
                >
                  <span className="w-8 h-px bg-asli-primary" />
                  <span className="eyebrow [text-shadow:0_1px_10px_rgba(0,0,0,0.85),0_0_20px_rgba(0,0,0,0.45)]">
                    {h.heroEyebrow}
                  </span>
                </motion.div>

                {/* Headline — line by line reveal */}
                <div className="overflow-hidden mb-4 space-y-[5px]">
                  {[h.heroLine1, h.heroLine2].map((line, i) => (
                    <div key={i} className="overflow-hidden">
                      <motion.h1
                        initial={{ y: '110%', opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.9, delay: 0.42 + i * 0.13, ease: [0.22, 1, 0.36, 1] }}
                        className="font-display font-black text-white leading-[1.06] block [text-shadow:0_2px_20px_rgba(0,0,0,0.45),0_1px_3px_rgba(0,0,0,0.8)]"
                        style={{ fontSize: 'clamp(1.85rem, 4.4vw, 3.85rem)', letterSpacing: '-0.025em' }}
                      >
                        {line}
                      </motion.h1>
                    </div>
                  ))}
                  <div className="overflow-hidden pt-0.5">
                    <motion.h1
                      initial={{ y: '110%', opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.9, delay: 0.68, ease: [0.22, 1, 0.36, 1] }}
                      className="font-display font-black italic text-asli-primary leading-[1.06] block [text-shadow:0_2px_18px_rgba(0,0,0,0.5),0_1px_2px_rgba(0,0,0,0.7),0_0_18px_rgba(0,0,0,0.3)]"
                      style={{ fontSize: 'clamp(1.85rem, 4.4vw, 3.85rem)', letterSpacing: '-0.025em' }}
                    >
                      {h.heroLine3}
                    </motion.h1>
                  </div>
                </div>

                {/* Body text */}
                <motion.p
                  initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.92 }}
                  className="text-white/60 text-base md:text-lg max-w-2xl leading-relaxed mb-1 font-light [text-shadow:0_1px_14px_rgba(0,0,0,0.75),0_0_2px_rgba(0,0,0,0.6)]"
                >
                  {h.heroBody1}
                </motion.p>
                <motion.p
                  initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 1.02 }}
                  className="text-white/45 text-sm md:text-base max-w-xl leading-relaxed mb-4 sm:mb-8 font-light [text-shadow:0_1px_12px_rgba(0,0,0,0.7),0_0_1px_rgba(0,0,0,0.5)]"
                >
                  {h.heroBody2}
                </motion.p>

                {/* CTAs */}
                <motion.div
                  initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 1.12 }}
                  className="flex flex-col sm:flex-row gap-2 sm:gap-3"
                >
                  <motion.a
                    href="/ejecutivos"
                    whileHover={{ scale: 1.04, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    className="group inline-flex items-center justify-center gap-3 px-8 py-3.5 rounded-full bg-asli-primary text-white font-semibold shadow-xl shadow-asli-primary/30 w-full sm:w-auto relative overflow-hidden"
                  >
                    <motion.span
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full"
                      animate={{ x: ['−100%', '200%'] }}
                      transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 2.5, ease: 'linear' }}
                    />
                    <span className="relative z-10 flex items-center gap-3">
                      {h.quoteBtn}
                      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </span>
                  </motion.a>
                  <motion.a
                    href="/ejecutivos"
                    whileHover={{ scale: 1.04, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    className="inline-flex items-center justify-center gap-3 px-8 py-3.5 rounded-full border border-white/25 text-white/80 font-semibold hover:border-white/50 hover:text-white transition-all duration-300 w-full sm:w-auto"
                  >
                    {h.talkBtn}
                  </motion.a>
                </motion.div>
              </div>
            </div>

            {/* Stats bar — pinned to bottom */}
            <motion.div
              initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, delay: 1.28 }}
              className="relative z-20 border-t border-white/10 grid grid-cols-3 shrink-0 pb-[env(safe-area-inset-bottom,0px)]"
            >
              {h.stats.map((stat, i, arr) => (
                <motion.div
                  key={stat.label}
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                  className={`py-3 px-2 sm:py-4 sm:px-4 md:px-6 transition-colors duration-300 text-center flex flex-col items-center justify-center min-w-0 ${
                    i < arr.length - 1 ? 'border-r border-white/10' : ''
                  }`}
                >
                  <p className="font-display font-black text-asli-primary mb-0.5 [text-shadow:0_2px_16px_rgba(0,0,0,0.45),0_1px_2px_rgba(0,0,0,0.65)]"
                    style={{ fontSize: 'clamp(1.15rem, 2.8vw, 2.2rem)', lineHeight: 1 }}>
                    <Counter value={stat.value} />
                  </p>
                  <p className="text-white/40 text-[10px] sm:text-xs font-light tracking-wide leading-tight [text-shadow:0_1px_8px_rgba(0,0,0,0.75)] px-0.5">{stat.label}</p>
                </motion.div>
              ))}
            </motion.div>

            {/* Scroll indicator */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: 1.7 }}
              className="absolute bottom-20 right-8 hidden lg:flex flex-col items-center gap-2 z-20"
            >
              <span
                className="eyebrow [text-shadow:0_1px_8px_rgba(0,0,0,0.8)]"
                style={{ writingMode: 'vertical-rl' }}
              >
                {h.scroll}
              </span>
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
                className="w-px h-10 bg-gradient-to-b from-asli-primary to-transparent"
              />
            </motion.div>
          </section>

          {/* ══════════════════════════════════════════════════════
              INDUSTRIAS
          ══════════════════════════════════════════════════════ */}
          <section className="relative py-24 md:py-32 overflow-hidden border-y border-white/[0.06] bg-asli-deep" style={{ clipPath: 'polygon(0 3%, 100% 0, 100% 100%, 0 100%)' }}>
            <div className="absolute inset-0 z-0">
              <img
                src="/flores.webp"
                alt=""
                aria-hidden
                className="h-full w-full object-cover object-center"
              />
            </div>
            <div className="absolute inset-0 z-[1] bg-gradient-to-r from-asli-deep via-asli-deep/88 to-asli-deep/65" />
            <div className="absolute inset-0 z-[2] bg-gradient-to-t from-asli-deep/80 via-transparent to-asli-deep/50" />

            <Orb className="w-80 h-80 bg-asli-primary/8 blur-[90px] top-0 left-1/2 z-10" />

            <div className="relative z-20 container mx-auto px-6 lg:px-10 pt-8">
              <div className="max-w-3xl">
                <motion.div
                  variants={staggerContainer} initial="hidden" whileInView="visible" viewport={VP}
                >
                  <motion.div variants={fadeSlideLeft}>
                    <Eyebrow>{h.industries}</Eyebrow>
                  </motion.div>
                  <motion.h2
                    variants={fadeSlideLeft}
                    className="font-display font-black text-white leading-tight mb-6"
                    style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', letterSpacing: '-0.022em' }}
                  >
                    {h.industriesTitle1}<br />
                    <span className="text-asli-primary">{h.industriesTitle2}</span>
                  </motion.h2>
                  <motion.p variants={fadeSlideLeft} className="text-white/65 text-lg leading-relaxed mb-3">
                    {h.industriesP1}
                  </motion.p>
                  <motion.p variants={fadeSlideLeft} className="text-white/50 text-lg leading-relaxed mb-10">
                    {h.industriesP2}
                  </motion.p>

                  {/* Industry pills */}
                  <motion.div variants={staggerContainer} className="flex flex-wrap gap-3 mb-10">
                    {h.industryPills.map((item) => (
                      <motion.span
                        key={item}
                        variants={scaleIn}
                        whileHover={{ scale: 1.06, borderColor: 'rgba(0,122,123,0.5)', color: 'white' }}
                        className="px-4 py-2 rounded-full border border-white/15 text-white/60 text-sm glass transition-colors duration-300 cursor-default"
                      >
                        {item}
                      </motion.span>
                    ))}
                  </motion.div>

                  {/* CTA */}
                  <motion.div variants={fadeSlideLeft} className="flex flex-col sm:flex-row gap-3">
                    <motion.a
                      href="/ejecutivos"
                      whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-asli-primary text-white text-sm font-semibold shadow-lg shadow-asli-primary/25"
                    >
                      {h.coordOperation}
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                    </motion.a>
                    <motion.a
                      href="/servicios"
                      whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/20 text-white/75 text-sm font-semibold hover:border-white/40 hover:text-white transition-all duration-300"
                    >
                      {h.viewServices}
                    </motion.a>
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════════════════════
              A QUIÉN APOYAMOS
          ══════════════════════════════════════════════════════ */}
          <section className="relative overflow-hidden border-b border-white/[0.06] py-12 sm:py-16 md:py-20">
            <div className="absolute inset-0 z-0">
              <Image
                src="/img/mano.webp"
                alt=""
                width={1920}
                height={1280}
                className="h-full w-full object-cover object-center"
                sizes="100vw"
                priority={false}
              />
            </div>
            <div className="absolute inset-0 z-[1] bg-gradient-to-br from-asli-dark/78 via-asli-dark/65 to-asli-dark/72" />
            <div className="absolute inset-0 z-[2] bg-gradient-to-t from-asli-dark/75 via-asli-dark/25 to-asli-dark/55" />
            <div
              className="pointer-events-none absolute inset-0 z-[3] bg-[#0a1f3d]/40"
              aria-hidden
            />

            <Orb className="pointer-events-none bottom-0 right-0 z-[8] h-72 w-72 bg-asli-accent/6 blur-[80px]" />

            <div className="container relative z-20 mx-auto px-4 sm:px-6 lg:px-10">
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.12 }}
                className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4 md:gap-5"
              >
                <motion.div
                  variants={fadeSlideUp}
                  className="col-span-1 mb-4 w-full max-w-4xl justify-self-center text-center sm:col-span-3 sm:mb-6 md:mb-8 [&_.eyebrow]:[text-shadow:0_1px_6px_rgba(0,0,0,0.95),0_0_14px_rgba(0,0,0,0.55)]"
                >
                  <Eyebrow center>{h.audienceEyebrow}</Eyebrow>
                  <h2
                    className="font-display mt-3 text-center font-black leading-[1.12] text-white [text-shadow:0_2px_20px_rgba(0,0,0,0.82),0_1px_3px_rgba(0,0,0,0.95)]"
                    style={{ fontSize: 'clamp(1.5rem, 3.2vw, 2.65rem)', letterSpacing: '-0.022em' }}
                  >
                    {h.audienceTitle1}<br />
                    <span className="text-asli-primary [text-shadow:0_0_28px_rgba(0,0,0,0.75),0_2px_14px_rgba(0,0,0,0.85),0_1px_2px_rgba(0,0,0,0.9)]">
                      {h.audienceTitle2}
                    </span>
                  </h2>
                  <p className="mx-auto mt-3 max-w-2xl text-sm leading-snug text-white/55 sm:mt-4 sm:text-base md:text-lg sm:leading-relaxed [text-shadow:0_1px_10px_rgba(0,0,0,0.92),0_0_18px_rgba(0,0,0,0.45)]">
                    {h.audienceP}
                  </p>
                </motion.div>

                {audiencia.map((item) => (
                  <motion.div
                    key={item.label}
                    variants={scaleIn}
                    whileHover={{ y: -6, scale: 1.02 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="glass group cursor-default rounded-xl border border-white/[0.12] bg-white/[0.06] p-4 text-center shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-md transition-all duration-400 hover:border-asli-primary/35 hover:shadow-[0_20px_40px_rgba(0,0,0,0.25)] sm:rounded-2xl sm:p-5 md:p-6"
                  >
                    <motion.div
                      whileHover={{ rotate: [0, -8, 8, 0], scale: 1.15 }}
                      transition={{ duration: 0.5 }}
                      className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-asli-primary/20 bg-asli-primary/10 text-asli-primary transition-all duration-300 group-hover:border-asli-primary group-hover:bg-asli-primary group-hover:text-white sm:mb-4 sm:h-14 sm:w-14 sm:rounded-2xl [&_svg]:h-6 [&_svg]:w-6 sm:[&_svg]:h-7 sm:[&_svg]:w-7"
                    >
                      {item.icon}
                    </motion.div>
                    <h3 className="mb-2 text-base font-bold leading-snug text-white sm:text-lg [text-shadow:0_1px_8px_rgba(0,0,0,0.92),0_2px_16px_rgba(0,0,0,0.55)]">
                      {item.label}
                    </h3>
                    <p className="text-xs leading-relaxed text-white/60 sm:text-sm [text-shadow:0_1px_6px_rgba(0,0,0,0.88)]">
                      {item.desc}
                    </p>
                  </motion.div>
                ))}

                <motion.div variants={fadeSlideUp} className="col-span-1 mt-4 text-center sm:col-span-3 sm:mt-6 md:mt-8">
                  <motion.a
                    href="/ejecutivos"
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-7 py-3.5 text-sm font-semibold text-white transition-all duration-300 hover:border-asli-primary hover:bg-asli-primary [text-shadow:0_1px_8px_rgba(0,0,0,0.9)] drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]"
                  >
                    {h.quoteNoCommit}
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </motion.a>
                </motion.div>
              </motion.div>
            </div>
          </section>

          {/* ══════════════════════════════════════════════════════
              PROPUESTA DE VALOR
          ══════════════════════════════════════════════════════ */}
          <section className="relative border-y border-white/[0.06] bg-asli-dark py-24 md:py-32 overflow-hidden"
            style={{ clipPath: 'polygon(0 0, 100% 4%, 100% 100%, 0 96%)' }}>
            <ParallaxImg src="/img/mundo.webp" className="z-0" imgClassName="object-center" />
            <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-r from-asli-dark/[0.98] via-asli-dark/94 to-asli-dark/86" />
            <div className="pointer-events-none absolute inset-0 z-[11] bg-gradient-to-l from-asli-dark/20 via-asli-dark/55 to-asli-dark/90" />
            <Orb className="pointer-events-none top-1/4 left-0 z-[12] h-96 w-96 bg-asli-primary/8 blur-[110px]" />

            <div className="relative z-20 container mx-auto px-6 lg:px-10 py-8">
              <div className="grid items-center gap-14 lg:grid-cols-2">
                {/* Left */}
                <motion.div
                  variants={staggerContainer} initial="hidden" whileInView="visible" viewport={VP}
                >
                  <motion.div
                    variants={fadeSlideLeft}
                    className="[&_.eyebrow]:font-semibold [&_.eyebrow]:text-teal-200 [&_.eyebrow]:[text-shadow:0_1px_4px_rgba(0,0,0,0.95)] [&_span.h-px]:bg-teal-300"
                  >
                    <Eyebrow>{h.value}</Eyebrow>
                  </motion.div>
                  <motion.h2
                    variants={fadeSlideLeft}
                    className="font-display mb-6 font-black leading-tight text-white [text-shadow:0_2px_16px_rgba(0,0,0,0.55)]"
                    style={{ fontSize: 'clamp(2rem, 3.8vw, 3.1rem)', letterSpacing: '-0.022em' }}
                  >
                    {h.valueTitle1}<br />
                    <span className="text-teal-200 [text-shadow:0_2px_14px_rgba(0,0,0,0.75),0_0_28px_rgba(0,122,123,0.35)]">
                      {h.valueTitle2}
                    </span>
                  </motion.h2>
                  <motion.p
                    variants={fadeSlideLeft}
                    className="text-lg font-medium leading-relaxed text-white/90 [text-shadow:0_1px_8px_rgba(0,0,0,0.65)]"
                  >
                    {h.valueP}
                  </motion.p>
                </motion.div>

                {/* Right: checklist — panel para separar texto del brillo del globo */}
                <motion.div
                  variants={staggerContainer} initial="hidden" whileInView="visible" viewport={VP}
                  className="space-y-3 rounded-2xl border border-white/[0.1] bg-asli-dark/70 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md md:p-8"
                >
                  {h.valueBullets.map((item, i) => (
                    <motion.div
                      key={item}
                      variants={fadeSlideRight}
                      whileHover={{ x: 6 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                      className="group flex cursor-default items-start gap-4"
                    >
                      <motion.div
                        whileHover={{ scale: 1.2, rotate: 360 }}
                        transition={{ duration: 0.4 }}
                        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-teal-400/50 bg-asli-primary/25 shadow-[0_0_12px_rgba(0,0,0,0.4)] transition-all duration-300 group-hover:border-asli-primary group-hover:bg-asli-primary"
                      >
                        <svg className="h-3 w-3 text-teal-200 transition-colors group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </motion.div>
                      <p className="text-[15px] font-medium leading-relaxed text-white/95 [text-shadow:0_1px_3px_rgba(0,0,0,0.85)] transition-colors duration-300 group-hover:text-white">
                        {item}
                      </p>
                    </motion.div>
                  ))}

                  {/* CTA */}
                  <motion.div variants={fadeSlideRight} className="mt-8 flex flex-col gap-3 sm:flex-row">
                    <motion.a
                      href="/contacto"
                      whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}
                      className="inline-flex items-center gap-2 rounded-full bg-asli-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-asli-primary/30"
                    >
                      {h.wantMore}
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                    </motion.a>
                    <motion.a
                      href="/ejecutivos"
                      whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}
                      className="inline-flex items-center gap-2 rounded-full border-2 border-white/35 bg-white/[0.08] px-6 py-3 text-sm font-semibold text-white shadow-[0_2px_12px_rgba(0,0,0,0.35)] transition-all duration-300 hover:border-white/55 hover:bg-white/[0.12] hover:text-white"
                    >
                      {h.talkExec}
                    </motion.a>
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════════════════════
              SERVICIOS
          ══════════════════════════════════════════════════════ */}
          <section id="servicios" className="relative py-24 md:py-32 overflow-hidden bg-asli-dark border-b border-white/[0.06]">
            {/* Parallax BG */}
            <ParallaxImg src="/img/serv.webp" />
            <div className="absolute inset-0 bg-gradient-to-r from-asli-dark/98 via-asli-dark/92 to-asli-dark/70 z-10" />
            <div
              className="pointer-events-none absolute inset-0 z-[11] bg-[#0a1f3d]/60"
              aria-hidden
            />

            <div className="relative z-20 container mx-auto px-6 lg:px-10">
              <div className="grid lg:grid-cols-2 gap-14 items-start">
                {/* Left */}
                <motion.div
                  variants={staggerContainer} initial="hidden" whileInView="visible" viewport={VP}
                  className="[&_.eyebrow]:[text-shadow:0_1px_6px_rgba(0,0,0,0.95),0_0_14px_rgba(0,0,0,0.55)]"
                >
                  <motion.div variants={fadeSlideLeft}><Eyebrow>{h.services}</Eyebrow></motion.div>
                  <motion.h2
                    variants={fadeSlideLeft}
                    className="font-display font-black text-white leading-tight mb-6 [text-shadow:0_2px_20px_rgba(0,0,0,0.82),0_1px_3px_rgba(0,0,0,0.95)]"
                    style={{ fontSize: 'clamp(2rem, 3.8vw, 3.1rem)', letterSpacing: '-0.022em' }}
                  >
                    {h.servicesTitle1}<br />
                    <span className="text-asli-primary [text-shadow:0_0_28px_rgba(0,0,0,0.75),0_2px_14px_rgba(0,0,0,0.85),0_1px_2px_rgba(0,0,0,0.9)]">
                      {h.servicesTitle2}
                    </span>
                  </motion.h2>
                  <motion.p
                    variants={fadeSlideLeft}
                    className="text-white/55 text-lg leading-relaxed mb-10 [text-shadow:0_1px_10px_rgba(0,0,0,0.92),0_0_18px_rgba(0,0,0,0.45)]"
                  >
                    {h.servicesP}
                  </motion.p>
                  <motion.div variants={fadeSlideLeft} className="flex flex-wrap gap-3">
                    <motion.a
                      href="/servicios"
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      className="group inline-flex items-center gap-3 px-7 py-4 rounded-full bg-asli-primary text-white font-semibold shadow-xl shadow-asli-primary/20 [text-shadow:0_1px_6px_rgba(0,0,0,0.45)] drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]"
                    >
                      {h.viewAllServices}
                      <svg className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </motion.a>
                    <motion.a
                      href="/contacto"
                      whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}
                      className="inline-flex items-center gap-2 px-7 py-4 rounded-full border border-white/20 text-white/75 font-semibold text-sm hover:border-asli-primary/50 hover:text-white transition-all duration-300 [text-shadow:0_1px_8px_rgba(0,0,0,0.9)] drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]"
                    >
                      {h.requestQuote}
                    </motion.a>
                  </motion.div>
                </motion.div>

                {/* Right: service cards with mini-image */}
                <motion.div
                  variants={staggerContainer} initial="hidden" whileInView="visible" viewport={VP}
                  className="space-y-3 pt-2 lg:pt-14"
                >
                  {h.serviciosHome.map((item, i) => (
                    <motion.div
                      key={item.label}
                      variants={fadeSlideRight}
                      whileHover={{ x: 6, scale: 1.02 }}
                      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                      className="relative flex items-center gap-4 glass rounded-xl px-5 py-4 overflow-hidden group border border-white/[0.07] hover:border-asli-primary/35 cursor-default"
                    >
                      {/* mini bg placeholder */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                        <ImagePlaceholder variant="inline" className="h-full w-full opacity-40" />
                      </div>
                      <span className="shrink-0 min-w-[1.75rem] font-display font-black text-teal-200 tabular-nums transition-colors duration-300 text-base sm:text-lg relative z-10 [text-shadow:0_1px_2px_rgba(0,0,0,0.85)] group-hover:text-white group-hover:[text-shadow:0_0_16px_rgba(255,255,255,0.35),0_1px_2px_rgba(0,0,0,0.8)]">
                        0{i + 1}
                      </span>
                      <p className="text-white/70 text-[15px] leading-snug group-hover:text-white transition-colors duration-300 relative z-10 [text-shadow:0_1px_8px_rgba(0,0,0,0.9),0_0_16px_rgba(0,0,0,0.5)]">
                        {item.label}
                      </p>
                      <svg
                        className="ml-auto shrink-0 w-4 h-4 text-asli-primary opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300 relative z-10 drop-shadow-[0_1px_4px_rgba(0,0,0,0.75)]"
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════════════════════
              ESPECIALIZACIÓN
          ══════════════════════════════════════════════════════ */}
          <section className="py-24 md:py-32 bg-asli-deep relative overflow-hidden border-y border-white/[0.06]">
            <Orb className="w-80 h-80 bg-asli-primary/7 blur-[90px] bottom-0 left-1/3" />

            <div className="container mx-auto px-6 lg:px-10 relative z-10">
              <div className="grid lg:grid-cols-2 gap-14 items-center">

                {/* Left: parallax image */}
                <motion.div
                  initial="hidden" whileInView="visible" viewport={VP}
                  variants={fadeSlideLeft}
                  className="relative order-2 lg:order-1"
                >
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.5 }}
                    className="rounded-2xl overflow-hidden aspect-[4/3] shadow-2xl shadow-black/50 relative"
                  >
                    <ParallaxImg src="/img/expo.webp" speed={8} />
                    <div className="absolute inset-0 bg-gradient-to-t from-asli-dark/60 to-transparent z-10" />
                  </motion.div>
                </motion.div>

                {/* Right: text + list */}
                <motion.div
                  variants={staggerContainer} initial="hidden" whileInView="visible" viewport={VP}
                  className="order-1 lg:order-2"
                >
                  <motion.div variants={fadeSlideRight}><Eyebrow>{h.specialization}</Eyebrow></motion.div>
                  <motion.h2
                    variants={fadeSlideRight}
                    className="font-display font-black text-white leading-tight mb-5"
                    style={{ fontSize: 'clamp(2rem, 3.8vw, 3.1rem)', letterSpacing: '-0.022em' }}
                  >
                    {h.specTitle1}<br />
                    <span className="text-asli-primary">{h.specTitle2}</span>
                  </motion.h2>
                  <motion.p variants={fadeSlideRight} className="text-white/60 text-base leading-relaxed mb-8">
                    {h.specP}
                  </motion.p>

                  <div className="space-y-2.5 mb-8">
                    {h.cargoTypes.map((item, i) => (
                      <motion.div
                        key={item.label}
                        variants={fadeSlideRight}
                        whileHover={{ x: 6 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                        className="flex items-center gap-3 group cursor-default"
                      >
                        <span className="text-xl">{item.icon}</span>
                        <span className="text-white/70 text-[15px] group-hover:text-white transition-colors duration-200">
                          {item.label}{' '}
                          <span className="text-white/30 text-sm italic">({item.sub})</span>
                        </span>
                      </motion.div>
                    ))}
                  </div>

                  {/* CTA */}
                  <motion.div variants={fadeSlideRight} className="flex flex-wrap gap-3">
                    <motion.a
                      href="/contacto"
                      whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-asli-primary text-white text-sm font-semibold shadow-lg shadow-asli-primary/20"
                    >
                      {h.consultAvailability}
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                    </motion.a>
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════════════════════
              PROCESO
          ══════════════════════════════════════════════════════ */}
          <section
            className="relative overflow-hidden border-b border-white/[0.06] bg-asli-dark py-24 md:py-32"
            style={{ clipPath: 'polygon(0 4%, 100% 0, 100% 96%, 0 100%)' }}
          >
            <div className="absolute inset-0 z-0">
              <Image
                src="/img/puertas.webp"
                alt=""
                width={1920}
                height={1080}
                className="h-full w-full object-cover object-center"
                sizes="100vw"
              />
            </div>
            <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-asli-dark/94 via-asli-dark/88 to-asli-dark/92" />
            <Orb className="z-[2] h-96 w-96 -translate-x-1/2 -translate-y-1/2 bg-asli-primary/6 blur-[120px] top-1/2 left-1/2" />

            <div className="container relative z-20 mx-auto px-6 py-8 lg:px-10">
              <motion.div
                variants={staggerContainer} initial="hidden" whileInView="visible" viewport={VP}
                className="text-center mb-16"
              >
                <motion.div variants={fadeSlideUp}><Eyebrow center>{h.process}</Eyebrow></motion.div>
                <motion.h2
                  variants={fadeSlideUp}
                  className="font-display font-black text-white leading-tight"
                  style={{ fontSize: 'clamp(2rem, 3.8vw, 3.1rem)', letterSpacing: '-0.022em' }}
                >
                  {h.processTitle}
                </motion.h2>
              </motion.div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {h.proceso.map((step, i) => (
                  <motion.div
                    key={step.num}
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.65, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                    className="group relative glass rounded-2xl p-6 border border-white/[0.07] cursor-default ease-out motion-safe:transition-[transform,box-shadow,border-color] motion-safe:duration-300 motion-safe:hover:-translate-y-2.5 motion-safe:hover:scale-[1.04] hover:border-asli-primary/40 hover:shadow-[0_16px_28px_rgba(0,0,0,0.22)]"
                  >
                    {/* Glow on hover — misma duración que el resto */}
                    <div className="pointer-events-none absolute inset-0 rounded-2xl bg-asli-primary/0 transition-colors duration-300 ease-out group-hover:bg-asli-primary/5" />

                    <div className="relative z-10 mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-asli-primary/20 bg-asli-primary/10 transition-[transform,background-color,border-color] duration-300 ease-out group-hover:scale-110 group-hover:rotate-[5deg] group-hover:border-asli-primary group-hover:bg-asli-primary">
                      <span className="font-display text-sm font-black text-asli-primary transition-colors duration-300 ease-out group-hover:text-white">
                        {step.num}
                      </span>
                    </div>
                    <p className="relative z-10 text-[15px] font-semibold leading-snug text-white transition-colors duration-300 ease-out">
                      {step.title}
                    </p>

                    {/* Connector dot (not last) */}
                    {i < h.proceso.length - 1 && (
                      <div className="absolute top-1/2 -right-2 w-4 h-px bg-asli-primary/30 hidden lg:block" />
                    )}
                  </motion.div>
                ))}
              </div>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={VP} transition={{ duration: 0.6, delay: 0.5 }}
                className="mt-12 text-center"
              >
                <motion.a
                  href="/contacto"
                  whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-3 px-8 py-4 rounded-full border border-asli-primary/40 text-asli-primary font-semibold hover:bg-asli-primary hover:text-white transition-all duration-300 text-sm"
                >
                  {h.startOperation}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </motion.a>
              </motion.div>
            </div>
          </section>

          {/* ══════════════════════════════════════════════════════
              CONFIANZA
          ══════════════════════════════════════════════════════ */}
          <section className="bg-asli-deep border-t border-white/[0.06] overflow-hidden">
            <div className="container mx-auto px-6 lg:px-10 pt-20 pb-6">
              <motion.div
                variants={staggerContainer} initial="hidden" whileInView="visible" viewport={VP}
                className="text-center mb-14"
              >
                <motion.div variants={fadeSlideUp}><Eyebrow center>{h.trust}</Eyebrow></motion.div>
                <motion.h2
                  variants={fadeSlideUp}
                  className="font-display font-black text-white leading-tight"
                  style={{ fontSize: 'clamp(2rem, 3.8vw, 3.1rem)', letterSpacing: '-0.022em' }}
                >
                  {h.trustTitle1}{' '}
                  <span className="text-asli-primary">{h.trustTitleSpan}</span>
                </motion.h2>
                <motion.p
                  variants={fadeSlideUp}
                  className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-white/50 md:text-base"
                >
                  {h.trustP}
                </motion.p>
              </motion.div>
            </div>

            <ClientesPrincipales embedded />

            <NavierasPrincipales />

            <SomosParteDe />

            {/* Quote */}
            <div className="container mx-auto px-6 lg:px-10 py-16 text-center">
              <motion.p
                initial={{ opacity: 0, scale: 0.96 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="font-display font-black italic text-white/80 leading-tight max-w-3xl mx-auto mb-10"
                style={{ fontSize: 'clamp(1.4rem, 3vw, 2.2rem)' }}
              >
                &ldquo;{h.quoteLine1}{' '}
                <span className="text-asli-primary">{h.quoteLine2}</span>&rdquo;
              </motion.p>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={VP} transition={{ duration: 0.6, delay: 0.2 }}
                className="flex flex-col sm:flex-row gap-3 justify-center"
              >
                <motion.a
                  href="/contacto"
                  whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-asli-primary text-white text-sm font-semibold shadow-lg shadow-asli-primary/25"
                >
                  {h.joinClients}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </motion.a>
                <motion.a
                  href="/ejecutivos"
                  whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full border border-white/20 text-white/70 text-sm font-semibold hover:border-white/40 hover:text-white transition-all duration-300"
                >
                  {h.talkExecShort}
                </motion.a>
              </motion.div>
            </div>
          </section>

          {/* ══════════════════════════════════════════════════════
              CTA FINAL
          ══════════════════════════════════════════════════════ */}
          <section className="relative py-28 md:py-40 overflow-hidden border-t border-white/[0.06]">
            <ParallaxImg src="/img/ofi.webp" />
            <div className="absolute inset-0 bg-gradient-to-r from-asli-dark/97 via-asli-dark/90 to-asli-dark/65 z-10" />
            <div className="absolute inset-0 bg-gradient-to-t from-asli-dark/60 to-transparent z-10" />
            <Orb className="w-96 h-96 bg-asli-primary/12 blur-[100px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10" />

            <div className="relative z-20 container mx-auto px-6 lg:px-10 text-center">
              <motion.div
                variants={staggerContainer} initial="hidden" whileInView="visible" viewport={VP}
                className="max-w-2xl mx-auto"
              >
                <motion.div variants={fadeSlideUp}><Eyebrow center>{h.start}</Eyebrow></motion.div>
                <motion.h2
                  variants={fadeSlideUp}
                  className="font-display font-black text-white leading-tight mb-6"
                  style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)', letterSpacing: '-0.025em' }}
                >
                  {h.finalTitleA}<br />
                  <span className="text-asli-primary">{h.finalTitleB}</span>
                </motion.h2>
                <motion.p variants={fadeSlideUp} className="text-white/60 text-lg leading-relaxed mb-10">
                  {h.finalCtaP}
                </motion.p>

                <motion.div variants={fadeSlideUp} className="flex flex-col sm:flex-row gap-4 justify-center">
                  <motion.a
                    href="/ejecutivos"
                    whileHover={{ scale: 1.06, y: -3 }}
                    whileTap={{ scale: 0.97 }}
                    className="group inline-flex items-center justify-center gap-3 px-10 py-4 rounded-full bg-asli-primary text-white font-semibold shadow-2xl shadow-asli-primary/30 relative overflow-hidden"
                  >
                    <motion.span
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full"
                      animate={{ x: ['−100%', '200%'] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 2, ease: 'linear' }}
                    />
                    <span className="relative z-10 flex items-center gap-3">
                      {h.quoteBtn}
                      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </span>
                  </motion.a>
                  <motion.a
                    href="/ejecutivos"
                    whileHover={{ scale: 1.04, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    className="inline-flex items-center justify-center gap-3 px-10 py-4 rounded-full border border-white/25 text-white/85 font-semibold hover:border-white/50 hover:text-white transition-all duration-300"
                  >
                    {h.talkBtn}
                  </motion.a>
                </motion.div>
              </motion.div>
            </div>
          </section>

          {/* ══════════════════════════════════════════════════════
              CONTACTO RÁPIDO
          ══════════════════════════════════════════════════════ */}
          <section id="contacto" className="py-16 bg-asli-deep border-t border-white/[0.06]">
            <div className="container mx-auto px-6 lg:px-10">
              <p className="eyebrow text-white/40 mb-3">{h.contactEyebrow}</p>
              <motion.p
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={VP} transition={{ duration: 0.6 }}
                className="text-white/55 text-base leading-relaxed max-w-xl mb-8"
              >
                {h.quickContactText}
              </motion.p>

              <motion.div
                variants={staggerContainer} initial="hidden" whileInView="visible" viewport={VP}
                className="grid sm:grid-cols-3 gap-4"
              >
                {[
                  {
                    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
                    label: h.labelEmail, value: 'informaciones@asli.cl', href: 'mailto:informaciones@asli.cl',
                    accent: 'text-asli-primary',
                  },
                  {
                    icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>,
                    label: h.labelWhatsApp, value: '+56 9 6839 4225', href: 'https://api.whatsapp.com/send/?phone=56968394225',
                    accent: 'text-emerald-400',
                  },
                  {
                    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
                    label: h.location, value: h.locationValue, href: null,
                    accent: 'text-asli-primary',
                  },
                ].map((item) => {
                  const Tag = item.href ? motion.a : motion.div
                  return (
                    <Tag
                      key={item.label}
                      variants={scaleIn}
                      whileHover={{ y: -4, scale: 1.03 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                      {...(item.href ? { href: item.href, target: item.href.startsWith('http') ? '_blank' : undefined, rel: 'noopener noreferrer' } : {})}
                      className="flex items-center gap-4 glass rounded-xl px-5 py-4 border border-white/[0.07] hover:border-white/20 transition-colors duration-300 cursor-default"
                    >
                      <div className={`shrink-0 w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center ${item.accent}`}>
                        {item.icon}
                      </div>
                      <div>
                        <p className="text-white/35 text-xs uppercase tracking-widest mb-0.5">{item.label}</p>
                        <p className="text-white font-medium text-sm">{item.value}</p>
                      </div>
                    </Tag>
                  )
                })}
              </motion.div>
            </div>
          </section>

        </main>
        <Footer />
      </div>
    </>
  )
}
