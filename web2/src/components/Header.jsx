import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useLang } from '../lib/LangContext'

const NAV_LINKS = [
  { href: '/', key: 'inicio' },
  { href: '/servicios', key: 'servicios' },
  { href: '/nosotros', key: 'nosotros' },
  { href: '/contacto', key: 'contacto' },
]

const IconLinkedIn = () => (
  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
)

const IconInstagram = () => (
  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
)

const IconWhatsApp = () => (
  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
)

const Header = () => {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const router = useRouter()
  const { lang, setLang, t } = useLang()

  const langOptions = [
    { id: 'es', label: t.common.langEs },
    { id: 'en', label: t.common.langEn },
    { id: 'zh', label: t.common.langZh },
  ]

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close mobile menu on route change
  useEffect(() => { setOpen(false) }, [router.pathname])

  const isActive = (href) =>
    href === '/' ? router.pathname === '/' : router.pathname.startsWith(href)

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-asli-dark/96 backdrop-blur-lg shadow-xl shadow-black/30 border-b border-white/[0.06]'
          : 'bg-gradient-to-b from-black/50 to-transparent backdrop-blur-none'
      }`}
    >
      {/* ── Top bar: solo a partir de 1100px (por debajo, solo logo + hamburguesa) ── */}
      <div
        className={`hidden min-[1100px]:block transition-all duration-300 border-b border-white/[0.06] ${scrolled ? 'py-1' : 'py-1.5'}`}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Social links */}
          <div className="flex items-center gap-2 text-[11px]">
            <a
              href="https://www.linkedin.com/company/aslichile"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-sky-400/35 bg-sky-500/15 text-sky-200 hover:bg-sky-500 hover:text-white hover:border-sky-400 transition-all duration-250 shadow-[0_6px_18px_rgba(14,116,144,0.18)] hover:shadow-[0_8px_24px_rgba(14,116,144,0.3)]"
            >
              <IconLinkedIn /> LinkedIn
            </a>
            <a
              href="https://www.instagram.com/asli_chile"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-pink-400/35 bg-pink-500/15 text-pink-200 hover:bg-pink-500 hover:text-white hover:border-pink-400 transition-all duration-250 shadow-[0_6px_18px_rgba(190,24,93,0.18)] hover:shadow-[0_8px_24px_rgba(190,24,93,0.3)]"
            >
              <IconInstagram /> Instagram
            </a>
            <a
              href="https://api.whatsapp.com/send/?phone=56968394225"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-400/35 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500 hover:text-white hover:border-emerald-400 transition-all duration-250 shadow-[0_6px_18px_rgba(5,150,105,0.18)] hover:shadow-[0_8px_24px_rgba(5,150,105,0.3)]"
            >
              <IconWhatsApp /> WhatsApp
            </a>
          </div>

          {/* Tagline */}
          <p className="hidden lg:block text-[11px] text-white/35 tracking-[0.1em] uppercase">{t.header.taglineTop}</p>

          <div className="flex items-center gap-2">
            <div className="hidden xl:flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.04] p-1">
              {langOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setLang(option.id)}
                  aria-label={`${t.common.language}: ${option.label}`}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide transition-colors ${
                    lang === option.id ? 'bg-asli-primary text-white' : 'text-white/65 hover:text-white hover:bg-white/[0.08]'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <a
              href="/embarques"
              className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full bg-asli-primary/15 border border-asli-primary/25 text-asli-primary hover:bg-asli-primary hover:text-white hover:border-asli-primary transition-all duration-300"
            >
              {t.header.clientAccess}
            </a>
          </div>
        </div>
      </div>

      {/* ── Main nav ── */}
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-3 group shrink-0">
          <img
            src="/img/logoblanco.png"
            alt="ASLI"
            className="h-8 min-[1100px]:h-9 w-auto max-w-[140px] min-[1100px]:max-w-[160px] object-contain object-left transition-opacity group-hover:opacity-90"
            style={{ filter: 'drop-shadow(0 2px 12px rgba(0,0,0,0.35))' }}
          />
          <div className="hidden min-[1100px]:block leading-tight">
            <p className="text-white font-bold tracking-[0.18em] text-[15px]">{t.header.companyName}</p>
            <p className="text-white/40 tracking-[0.3em] text-[9px] uppercase">{t.header.companyTag}</p>
          </div>
        </a>

        {/* Desktop nav links */}
        <div className="hidden min-[1100px]:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`relative px-4 py-2 text-[13px] font-medium rounded-lg transition-all duration-200 ${
                isActive(link.href)
                  ? 'text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              {t.nav[link.key]}
              {isActive(link.href) && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-3.5 h-[2px] bg-asli-primary rounded-full" />
              )}
            </a>
          ))}
        </div>

        {/* Desktop CTA */}
        <a
          href="/contacto"
          className="hidden min-[1100px]:inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-asli-primary text-white text-[13px] font-semibold hover:bg-asli-primary/85 transition-all duration-300 shadow-lg shadow-asli-primary/20 hover:shadow-asli-primary/35 hover:-translate-y-px"
        >
          {t.header.requestQuote}
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </a>

        {/* Hamburger button */}
        <button
          type="button"
          onClick={() => setOpen((p) => !p)}
          className="flex min-[1100px]:hidden w-10 h-10 flex-col items-center justify-center gap-[5px] rounded-xl border border-white/15 hover:border-white/30 hover:bg-white/[0.05] transition-all duration-200"
          aria-label={open ? t.header.closeMenu : t.header.openMenu}
        >
          <span
            className={`block w-5 h-[1.5px] bg-white rounded-full transition-all duration-300 origin-center ${
              open ? 'rotate-45 translate-y-[6.5px]' : ''
            }`}
          />
          <span
            className={`block w-5 h-[1.5px] bg-white rounded-full transition-all duration-300 ${
              open ? 'opacity-0 scale-x-0' : ''
            }`}
          />
          <span
            className={`block w-5 h-[1.5px] bg-white rounded-full transition-all duration-300 origin-center ${
              open ? '-rotate-45 -translate-y-[6.5px]' : ''
            }`}
          />
        </button>
      </nav>

      {/* ── Mobile menu ── */}
      <div
        className={`min-[1100px]:hidden overflow-hidden transition-all duration-350 ease-in-out ${
          open ? 'max-h-[min(85vh,520px)] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="border-t border-white/[0.06] bg-asli-dark/98 backdrop-blur-xl px-4 pt-3 pb-5">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive(link.href)
                    ? 'text-white bg-white/[0.07] border-l-2 border-asli-primary pl-3.5'
                    : 'text-white/65 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                {t.nav[link.key]}
              </a>
            ))}
          </nav>
          <div className="mt-4 pt-4 border-t border-white/[0.06] flex flex-col gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-2">
              {langOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setLang(option.id)}
                  className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
                    lang === option.id ? 'bg-asli-primary text-white' : 'text-white/65 hover:text-white hover:bg-white/[0.08]'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <a
              href="/embarques"
              onClick={() => setOpen(false)}
              className="w-full py-3 rounded-xl border border-asli-primary/35 bg-asli-primary/10 text-asli-primary text-sm font-semibold text-center hover:bg-asli-primary/20 transition-colors"
            >
              {t.header.clientAccess}
            </a>
            <a
              href="/contacto"
              className="w-full py-3 rounded-xl bg-asli-primary text-white text-sm font-semibold text-center hover:bg-asli-primary/90 transition-colors"
            >
              {t.header.requestQuote}
            </a>
            <a
              href="https://api.whatsapp.com/send/?phone=56968394225"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 rounded-xl border border-white/15 text-white/70 text-sm font-medium text-center hover:border-emerald-500/40 hover:text-emerald-400 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <IconWhatsApp /> {t.header.whatsappWrite}
            </a>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
