import { useState, useEffect } from 'react'
import { goToHomeSection } from '../lib/scrollToHash'

function formatFechaHora(date) {
  const fecha = date.toLocaleDateString('es-CL', {
    timeZone: 'America/Santiago',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const hora = date.toLocaleTimeString('es-CL', {
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
}) {
  return (
    <div
      className={`dolar-chip ${className}`}
      title="Dólar observado · hora Chile"
      aria-label={
        dolarObservado
          ? `Dólar observado ${dolarObservado.valor.toLocaleString('es-CL', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} pesos. ${fecha} ${hora}`
          : `Hora Chile ${fecha} ${hora}`
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
            {dolarObservado.valor.toLocaleString('es-CL', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
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

/**
 * Header claro sticky — estilo agencia conversional
 */
const Header = () => {
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
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const fetchDolarObservado = async () => {
      try {
        setLoadingDolar(true)
        const response = await fetch('https://mindicador.cl/api/dolar')
        const data = await response.json()

        if (data?.valor) {
          setDolarObservado({ valor: data.valor, fecha: data.fecha })
        } else if (data?.serie?.length > 0) {
          const valorMasReciente = data.serie[0]
          setDolarObservado({
            valor: valorMasReciente.valor,
            fecha: valorMasReciente.fecha,
          })
        }
      } catch {
        // silencioso
      } finally {
        setLoadingDolar(false)
      }
    }

    fetchDolarObservado()
  }, [])

  const navLinks = [
    { href: '/#servicios', label: 'Servicios', section: 'servicios' },
    { href: '/#proceso', label: 'Cómo trabajamos', section: 'proceso' },
    { href: '/servicios', label: 'Equipo' },
    { href: '/#contacto', label: 'Contacto', section: 'contacto' },
  ]

  const handleNavClick = (event, link) => {
    if (!link.section) {
      handleCloseMenu()
      return
    }

    event.preventDefault()
    goToHomeSection(link.section, handleCloseMenu)
  }

  const { fecha, hora } = ahora ? formatFechaHora(ahora) : { fecha: '—', hora: '—' }

  const chipProps = {
    dolarObservado,
    loadingDolar,
    fecha,
    hora,
    ahora,
  }

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-320 ease-asli ${
        scrolled
          ? 'bg-white/90 backdrop-blur-xl shadow-asli-low border-b border-asli-dark/5'
          : 'bg-[#F7F5F2]/90 backdrop-blur-md'
      }`}
    >
      <nav className="container-asli">
        <div className="flex items-center justify-between h-[4.5rem] gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <a href="/" className="flex items-center min-w-0" aria-label="ASLI - Inicio">
              <img
                src="/img/LOGO%20ASLI%20SIN%20FONDO%20AZUL.png"
                alt="ASLI"
                className="h-9 sm:h-10 md:h-11 w-auto object-contain"
              />
            </a>
            <span className="h-7 w-px bg-asli-dark/15 shrink-0" aria-hidden="true" />
            <a
              href="https://www.prochile.gob.cl/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center shrink-0"
              aria-label="ProChile"
              title="ProChile"
            >
              <img
                src="/img/prochile-sin-fondo.png"
                alt="ProChile"
                className="h-8 sm:h-9 md:h-10 w-auto object-contain"
              />
            </a>
          </div>

          <div className="hidden lg:flex items-center gap-7">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleNavClick(e, link)}
                className="nav-link"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <DolarChip className="hidden lg:inline-flex" {...chipProps} />

            <button
              type="button"
              className="lg:hidden p-2 text-asli-dark hover:text-asli-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-asli-primary rounded-full"
              onClick={handleToggleMenu}
              onKeyDown={handleKeyDown}
              aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
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
          className="fixed inset-0 bg-asli-dark/40 z-30 lg:hidden"
          onClick={handleCloseMenu}
          aria-hidden="true"
        />
      )}

      <div
        className={`fixed top-[4.5rem] left-0 right-0 bg-white border-t border-asli-dark/5 shadow-asli-high z-40 transition-all duration-320 ease-asli lg:hidden ${
          isMenuOpen
            ? 'translate-y-0 opacity-100'
            : '-translate-y-2 opacity-0 pointer-events-none'
        }`}
        style={{ maxHeight: 'calc(100vh - 4.5rem)', overflowY: 'auto' }}
      >
        <div className="container-asli py-6 flex flex-col gap-1">
          <DolarChip className="dolar-chip--mobile mb-5 w-full" {...chipProps} />

          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => handleNavClick(e, link)}
              className="font-display text-xl text-asli-dark hover:text-asli-primary py-3 border-b border-asli-dark/5 transition-colors duration-320"
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
