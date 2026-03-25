import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLang } from '../lib/LangContext'

const navLinks = [
  { label: 'Inicio',       href: '#inicio',         section: 'inicio' },
  { label: 'Servicios',    href: '#servicios',       section: 'servicios' },
  { label: 'Equipo',       href: '#equipo',          section: 'equipo' },
  { label: 'Tracking',     href: '/tracking',        section: null },
  { label: 'Itinerario',   href: '/itinerario-asli', section: null },
]

const socialLinks = [
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/asli_chile',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/company/aslichile/posts/?feedView=all',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
  },
  {
    label: 'WhatsApp',
    href: 'https://api.whatsapp.com/send/?phone=56968394225',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    ),
  },
]

const sectionIds = ['inicio', 'quienes-somos', 'servicios', 'equipo', 'socios', 'contacto']

function useActiveSection() {
  const [active, setActive] = useState('inicio')

  useEffect(() => {
    const OFFSET = 100 // px desde el top del viewport

    const detect = () => {
      // Recorre las secciones de abajo hacia arriba y devuelve
      // la primera cuyo top ya pasó el offset del header
      let current = sectionIds[0]
      for (const id of sectionIds) {
        const el = document.getElementById(id)
        if (!el) continue
        if (el.getBoundingClientRect().top <= OFFSET) {
          current = id
        }
      }
      setActive(current)
    }

    detect() // run once on mount
    window.addEventListener('scroll', detect, { passive: true })
    return () => window.removeEventListener('scroll', detect)
  }, [])

  return active
}

const Header = () => {
  const [scrolled, setScrolled]         = useState(false)
  const [menuOpen, setMenuOpen]         = useState(false)
  const [dolar, setDolar]               = useState(null)
  const [loadingDolar, setLoadingDolar] = useState(true)
  const activeSection                   = useActiveSection()
  const { lang, toggle: toggleLang, t } = useLang()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  useEffect(() => {
    fetch('https://mindicador.cl/api/dolar')
      .then(r => r.json())
      .then(d => {
        const v = d.valor ?? d.serie?.[0]?.valor
        const f = d.fecha ?? d.serie?.[0]?.fecha
        if (v) setDolar({ valor: v, fecha: f })
      })
      .catch(() => {})
      .finally(() => setLoadingDolar(false))
  }, [])

  const handleAccederApp = () => {
    if (typeof window === 'undefined') return
    const { hostname } = window.location
    const isLocal = ['localhost', '127.0.0.1', ''].includes(hostname) ||
      /^(192\.168\.|10\.|172\.)/.test(hostname)
    window.location.href = isLocal ? 'http://localhost:3001' : '/auth'
  }

  return (
    <>
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-400 ${
          scrolled
            ? 'bg-asli-dark/96 backdrop-blur-xl shadow-[0_1px_0_rgba(0,122,123,0.25)]'
            : 'bg-asli-dark/80 backdrop-blur-md'
        }`}
      >
        {/* Top micro-bar: dólar + sociales */}
        <div className="hidden lg:block border-b border-white/[0.06]">
          <div className="container mx-auto px-6 lg:px-10 flex items-center justify-between h-9">
            {/* Dólar observado */}
            <div className="flex items-center gap-2">
              <span className="eyebrow text-white/40">Dólar Observado</span>
              {loadingDolar ? (
                <div className="h-3 w-16 bg-white/10 animate-pulse rounded" />
              ) : dolar ? (
                <span className="text-asli-primary font-semibold text-xs">
                  ${dolar.valor.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              ) : (
                <span className="text-white/30 text-xs">—</span>
              )}
            </div>

            {/* Sociales */}
            <div className="flex items-center gap-2">
              {socialLinks.map(s => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="text-white/40 hover:text-asli-primary transition-colors duration-200"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Main nav bar */}
        <nav className="container mx-auto px-6 lg:px-10">
          <div className="flex items-center justify-between h-16 md:h-[68px]">

            {/* Logo */}
            <a href="/" aria-label="ASLI inicio" className="flex items-center gap-3 shrink-0">
              <img src="/img/logoblanco.png" alt="ASLI" className="h-8 md:h-10 object-contain" />
              <img src="/img/logopro.png"    alt="ASLI Pro" className="h-8 md:h-10 object-contain opacity-80" />
            </a>

            {/* Desktop nav links — centro */}
            <div className="hidden lg:flex items-center gap-0">
              {navLinks.map(link => {
                const isActive = link.section && activeSection === link.section
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    className={`relative group px-5 py-2 font-semibold transition-all duration-250 text-base ${
                      isActive
                        ? 'text-white'
                        : 'text-white/55 hover:text-white/90'
                    }`}
                  >
                    {link.label}
                    {/* Active / hover underline */}
                    <span
                      className={`absolute bottom-0 left-5 right-5 h-[2px] rounded-full bg-asli-primary transition-all duration-300 ${
                        isActive
                          ? 'scale-x-100 opacity-100'
                          : 'scale-x-0 opacity-0 group-hover:scale-x-100 group-hover:opacity-60'
                      }`}
                    />
                    {/* Active dot */}
                    {isActive && (
                      <motion.span
                        layoutId="nav-dot"
                        className="absolute -bottom-[3px] left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-asli-primary"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                  </a>
                )
              })}
            </div>

            {/* Derecha: idioma + acceder + hamburger mobile */}
            <div className="flex items-center gap-2">
              {/* Botón idioma */}
              <motion.button
                onClick={toggleLang}
                whileTap={{ scale: 0.92 }}
                title={lang === 'es' ? 'Switch to English' : 'Cambiar a Español'}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/15 hover:border-asli-primary/50 transition-all duration-250 text-white/60 hover:text-white text-xs font-semibold tracking-wide"
              >
                <span className="text-sm leading-none">{lang === 'es' ? '🇨🇱' : '🇺🇸'}</span>
                <span>{lang === 'es' ? 'ES' : 'EN'}</span>
                <svg className="w-2.5 h-2.5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </motion.button>

              <button
                onClick={handleAccederApp}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-asli-accent text-white text-sm font-semibold hover:bg-asli-accent/85 transition-all duration-300 shadow-md shadow-asli-accent/20"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">{t.nav.acceder}</span>
              </button>

              {/* Hamburger — solo mobile */}
              <button
                onClick={() => setMenuOpen(v => !v)}
                aria-label="Menú"
                className="lg:hidden w-9 h-9 flex flex-col justify-center items-center gap-[5px]"
              >
                <motion.span
                  animate={menuOpen ? { rotate: 45, y: 7 } : { rotate: 0, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="block w-5 h-[1.5px] bg-white origin-center"
                />
                <motion.span
                  animate={menuOpen ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
                  transition={{ duration: 0.2 }}
                  className="block w-5 h-[1.5px] bg-white"
                />
                <motion.span
                  animate={menuOpen ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="block w-5 h-[1.5px] bg-white origin-center"
                />
              </button>
            </div>
          </div>
        </nav>
      </motion.header>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              key="drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="fixed top-0 right-0 bottom-0 z-50 w-72 bg-asli-dark border-l border-white/10 shadow-2xl lg:hidden flex flex-col"
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-6 h-16 border-b border-white/8">
                <img src="/img/logoblanco.png" alt="ASLI" className="h-8 object-contain" />
                <button
                  onClick={() => setMenuOpen(false)}
                  className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Links */}
              <nav className="flex-1 px-6 py-8 flex flex-col gap-1">
                {navLinks.map((link, i) => {
                  const isActive = link.section && activeSection === link.section
                  return (
                    <motion.a
                      key={link.href}
                      href={link.href}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 + 0.1, duration: 0.35 }}
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-center gap-4 py-3.5 border-b border-white/5 group ${
                        isActive ? 'border-asli-primary/30' : ''
                      }`}
                    >
                      <span className={`eyebrow w-6 transition-colors ${
                        isActive ? 'text-asli-primary' : 'text-white/25 group-hover:text-asli-primary'
                      }`}>
                        0{i + 1}
                      </span>
                      <span className={`font-bold text-xl transition-colors ${
                        isActive ? 'text-white' : 'text-white/70 group-hover:text-white'
                      }`}>
                        {link.label}
                      </span>
                      {isActive && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-asli-primary" />
                      )}
                    </motion.a>
                  )
                })}
              </nav>

              {/* Bottom */}
              <div className="px-6 py-6 border-t border-white/8">
                {/* Dólar */}
                {dolar && (
                  <div className="flex items-center justify-between mb-5 text-sm">
                    <span className="eyebrow text-white/40">Dólar Obs.</span>
                    <span className="text-asli-primary font-semibold">
                      ${dolar.valor.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => { setMenuOpen(false); handleAccederApp() }}
                  className="w-full py-3 rounded-xl bg-asli-accent text-white font-semibold text-sm hover:bg-asli-accent/90 transition-all duration-300"
                >
                  Acceder a la Plataforma
                </button>
                <div className="flex justify-center gap-4 mt-5">
                  {socialLinks.map(s => (
                    <a
                      key={s.label}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={s.label}
                      className="text-white/40 hover:text-asli-primary transition-colors"
                    >
                      {s.icon}
                    </a>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

export default Header
