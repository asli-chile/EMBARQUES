import { useState, useEffect } from 'react'
import { goToHomeSection } from '../lib/scrollToHash'
import { SHOW_COTIZADOR } from '../lib/features'
import { useLocale } from '../hooks/useLocale'
import { ThemeToggle } from './ThemeToggle'
import { LocaleToggle } from './LocaleToggle'

const Header = () => {
  const { t } = useLocale()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

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
          <div className="mb-4 flex items-center justify-end gap-2">
            <ThemeToggle className="sm:hidden" />
            <LocaleToggle className="sm:hidden" />
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
