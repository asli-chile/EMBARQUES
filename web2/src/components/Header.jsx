import { useState, useEffect } from 'react'
import { goToHomeSection } from '../lib/scrollToHash'
import { SHOW_COTIZADOR } from '../lib/features'
import { useLocale } from '../hooks/useLocale'
import { ThemeToggle } from './ThemeToggle'
import { LocaleToggle } from './LocaleToggle'

function formatFechaHora(date, dateLocale) {
  const fecha = date.toLocaleDateString(dateLocale, {
    timeZone: 'America/Santiago',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const hora = date.toLocaleTimeString(dateLocale, {
    timeZone: 'America/Santiago',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  return { fecha, hora }
}

function DolarChip({
  className = '',
  dolarObservado,
  loadingDolar,
  fecha,
  hora,
  ahora,
  dateLocale,
  t,
}) {
  const valorFmt = dolarObservado
    ? dolarObservado.valor.toLocaleString(dateLocale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : ''

  return (
    <div
      className={`dolar-chip ${className}`}
      title={t.dolar.title}
      aria-label={
        dolarObservado ? t.dolar.withValue(valorFmt, fecha, hora) : t.dolar.onlyTime(fecha, hora)
      }
    >
      <div className="dolar-chip__cell">
        <span className="dolar-chip__label">
          <span className="dolar-chip__live" aria-hidden="true" />
          USD
        </span>
        {loadingDolar ? (
          <span className="dolar-chip__value dolar-chip__value--muted">…</span>
        ) : dolarObservado ? (
          <span className="dolar-chip__value">
            <span className="dolar-chip__currency">$</span>
            {valorFmt}
          </span>
        ) : (
          <span className="dolar-chip__value dolar-chip__value--muted">—</span>
        )}
      </div>

      <div className="dolar-chip__cell dolar-chip__cell--time">
        <span className="dolar-chip__label">{fecha}</span>
        <time className="dolar-chip__time" dateTime={ahora?.toISOString()}>
          {hora}
        </time>
      </div>
    </div>
  )
}

const Header = () => {
  const { t, dateLocale } = useLocale()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [dolarObservado, setDolarObservado] = useState(null)
  const [loadingDolar, setLoadingDolar] = useState(true)
  const [scrolled, setScrolled] = useState(false)
  const [ahora, setAhora] = useState(null)

  const handleToggleMenu = () => setIsMenuOpen((v) => !v)
  const handleCloseMenu = () => setIsMenuOpen(false)

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') handleToggleMenu()
    if (event.key === 'Escape' && isMenuOpen) handleCloseMenu()
  }

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? 'hidden' : 'unset'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isMenuOpen])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const tick = () => setAhora(new Date())
    tick()
    const id = window.setInterval(tick, 15_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const CACHE_KEY = 'asli_dolar_v2'
    const fetchDolarObservado = async () => {
      try {
        const cached = sessionStorage.getItem(CACHE_KEY)
        if (cached) {
          const parsed = JSON.parse(cached)
          if (parsed?.valor && Date.now() - parsed.cachedAt < 30 * 60 * 1000) {
            setDolarObservado({ valor: parsed.valor, fecha: parsed.fecha })
            setLoadingDolar(false)
            return
          }
        }
        setLoadingDolar(true)
        const response = await fetch('/api/dolar')
        if (!response.ok) return
        const data = await response.json()
        if (!data?.valor) return

        const next = { valor: data.valor, fecha: data.fecha }
        setDolarObservado(next)
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ...next, cachedAt: Date.now() }))
      } catch {
        // silencioso
      } finally {
        setLoadingDolar(false)
      }
    }

    fetchDolarObservado()
  }, [])

  const navLinks = [
    { href: '/#historia', label: t.nav.historia, section: 'historia' },
    { href: '/#servicios', label: t.nav.servicios, section: 'servicios' },
    { href: '/#proceso', label: t.nav.proceso, section: 'proceso', title: t.nav.procesoTitle },
    ...(SHOW_COTIZADOR ? [{ href: '/#cotizar', label: t.nav.cotizar, section: 'cotizar' }] : []),
    { href: '/#contacto', label: t.nav.contacto, section: 'contacto' },
    { href: '/servicios', label: t.nav.equipo },
    { href: '/tracking', label: t.nav.tracking },
    { href: '/stacking', label: t.nav.stacking },
  ]

  const handleNavClick = (event, link) => {
    if (!link.section) {
      handleCloseMenu()
      return
    }

    event.preventDefault()
    goToHomeSection(link.section, handleCloseMenu)
  }

  const { fecha, hora } = ahora ? formatFechaHora(ahora, dateLocale) : { fecha: '—', hora: '—' }

  const chipProps = {
    dolarObservado,
    loadingDolar,
    fecha,
    hora,
    ahora,
    dateLocale,
    t,
  }

  return (
    <header
      className={`site-header sticky top-0 z-50 transition-all duration-320 ease-asli pt-[env(safe-area-inset-top)] ${
        scrolled ? 'is-scrolled' : ''
      }`}
    >
      <nav className="container-asli">
        <div className="site-header__bar">
          <div className="site-header__brand">
            <a href="/" className="flex items-center" aria-label={t.nav.homeAria}>
              <img
                src="/img/LOGO%20ASLI%20SIN%20FONDO%20AZUL.png"
                alt="ASLI"
                width={176}
                height={44}
                decoding="async"
                className="logo-on-light h-10 sm:h-11 w-auto object-contain"
              />
            </a>
            <span className="site-header__brand-divider" aria-hidden="true" />
            <a
              href="https://www.prochile.gob.cl/"
              target="_blank"
              rel="noopener noreferrer"
              className="site-header__prochile"
              aria-label="ProChile"
              title="ProChile"
            >
              <img
                src="/img/prochile-sin-fondo.png"
                alt="ProChile"
                width={160}
                height={40}
                decoding="async"
                className="h-9 sm:h-10 w-auto object-contain"
              />
            </a>
          </div>

          <div className="site-header__nav">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                title={link.title || link.label}
                onClick={(e) => handleNavClick(e, link)}
                className="nav-link shrink-0"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="site-header__controls header-controls">
            <DolarChip className="hidden xl:inline-flex" {...chipProps} />
            <ThemeToggle className="hidden sm:inline-flex" />
            <span className="header-controls-divider" aria-hidden="true" />
            <LocaleToggle className="hidden sm:inline-flex" />

            <button
              type="button"
              className="xl:hidden inline-flex items-center justify-center min-h-11 min-w-11 p-2.5 text-asli-dark hover:text-asli-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-asli-primary rounded-full"
              onClick={handleToggleMenu}
              onKeyDown={handleKeyDown}
              aria-label={isMenuOpen ? t.nav.closeMenu : t.nav.openMenu}
              aria-expanded={isMenuOpen}
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-asli-ink/40 z-30 xl:hidden"
          onClick={handleCloseMenu}
          aria-hidden="true"
        />
      )}

      <div
        className={`site-header-drawer fixed left-0 right-0 z-40 transition-all duration-320 ease-asli xl:hidden top-16 ${
          isMenuOpen ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0 pointer-events-none'
        }`}
        style={{
          maxHeight: 'calc(100dvh - 4rem - env(safe-area-inset-top, 0px))',
          overflowY: 'auto',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="container-asli py-5 sm:py-6 flex flex-col gap-1">
          <div className="mb-4 flex items-center justify-between gap-3">
            <DolarChip className="dolar-chip--mobile flex-1" {...chipProps} />
            <div className="flex items-center gap-2 shrink-0">
              <ThemeToggle className="sm:hidden" />
              <LocaleToggle className="sm:hidden" />
            </div>
          </div>

          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => handleNavClick(e, link)}
              className="font-display text-lg sm:text-xl text-asli-dark hover:text-asli-primary py-3.5 min-h-12 border-b border-asli-dark/10 transition-colors duration-320 flex items-center"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </header>
  )
}

export default Header
