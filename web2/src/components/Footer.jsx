import { useLang } from '../lib/LangContext'
const IconLinkedIn = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
)

const IconInstagram = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
)

const IconWhatsApp = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
)

const NAV_LINKS = [
  { href: '/', key: 'inicio' },
  { href: '/servicios', key: 'servicios' },
  { href: '/nosotros', key: 'nosotros' },
  { href: '/contacto', key: 'contacto' },
]
//asli_chile
const SOCIAL = [
  {
    href:  'https://www.linkedin.com/company/aslichile',
    label: 'LinkedIn',
    icon:  <IconLinkedIn />,
    color: 'text-sky-200 border-sky-400/35 bg-sky-500/15 hover:text-white hover:bg-sky-500 hover:border-sky-400 shadow-[0_6px_18px_rgba(14,116,144,0.18)] hover:shadow-[0_8px_24px_rgba(14,116,144,0.3)]',
  },
  {
    href:  'https://www.instagram.com/asli_chile',
    label: 'Instagram',
    icon:  <IconInstagram />,
    color: 'text-pink-200 border-pink-400/35 bg-pink-500/15 hover:text-white hover:bg-pink-500 hover:border-pink-400 shadow-[0_6px_18px_rgba(190,24,93,0.18)] hover:shadow-[0_8px_24px_rgba(190,24,93,0.3)]',
  },
  {
    href:  'https://api.whatsapp.com/send/?phone=56968394225',
    label: 'WhatsApp',
    icon:  <IconWhatsApp />,
    color: 'text-emerald-200 border-emerald-400/35 bg-emerald-500/15 hover:text-white hover:bg-emerald-500 hover:border-emerald-400 shadow-[0_6px_18px_rgba(5,150,105,0.18)] hover:shadow-[0_8px_24px_rgba(5,150,105,0.3)]',
  },
]

const Footer = () => {
  const year = new Date().getFullYear()
  const { t } = useLang()

  return (
    <footer className="bg-asli-deep border-t border-white/[0.06]">
      <div className="container mx-auto px-6 lg:px-10 pt-14 pb-8">

        {/* Top grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-12">

          {/* Brand column */}
          <div className="md:col-span-4">
            <a href="/" className="inline-flex items-center gap-3 mb-5 group">
              <img
                src="/img/logoblanco.png"
                alt="ASLI Logística"
                title="ASLI"
                className="h-9 w-[74px] object-cover object-left transition-opacity group-hover:opacity-80"
              />
              <div className="leading-tight">
                <p className="text-white/90 text-[11px] sm:text-xs font-semibold">
                  {t.header.companyName}
                </p>
                <p className="text-white/70 text-[11px] sm:text-xs">
                  {t.header.companyTag}
                </p>
              </div>
            </a>

            <p className="text-white/55 text-sm leading-relaxed mb-6 max-w-xs">
              <span className="block">{t.header.companyName}</span>
              <span className="block">{t.header.companyTag}</span>
            </p>

            {/* Social icons */}
            <div className="flex items-center gap-3">
              {SOCIAL.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-all duration-300 hover:-translate-y-[2px] ${s.color}`}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Nav column */}
          <div className="md:col-span-3 md:col-start-6">
            <p className="text-white text-xs font-semibold uppercase tracking-[0.2em] mb-5">{t.nav.inicio === 'Home' ? 'Navigation' : t.nav.inicio === '首页' ? '导航' : 'Navegación'}</p>
            <nav className="flex flex-col gap-3">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-white/55 text-sm hover:text-asli-primary transition-colors duration-200 w-fit"
                >
                  {t.nav[link.key]}
                </a>
              ))}
            </nav>
          </div>

          {/* Contact column */}
          <div className="md:col-span-3 md:col-start-10">
            <p className="text-white text-xs font-semibold uppercase tracking-[0.2em] mb-5">{t.nav.contacto}</p>
            <div className="flex flex-col gap-3">
              <a
                href="mailto:informaciones@asli.cl"
                className="flex items-center gap-2.5 text-white/55 text-sm hover:text-asli-primary transition-colors group"
              >
                <svg className="w-3.5 h-3.5 shrink-0 text-asli-primary/60 group-hover:text-asli-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                informaciones@asli.cl
              </a>
              <a
                href="https://api.whatsapp.com/send/?phone=56968394225"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 text-white/55 text-sm hover:text-emerald-400 transition-colors group"
              >
                <svg className="w-3.5 h-3.5 shrink-0 text-emerald-500/60 group-hover:text-emerald-400 transition-colors" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                +56 9 6839 4225
              </a>
              <div className="flex items-center gap-2.5 text-white/55 text-sm">
                <svg className="w-3.5 h-3.5 shrink-0 text-asli-primary/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Curicó, Región del Maule
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/[0.06] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-white/30 text-xs text-center sm:text-left leading-relaxed">
            <span className="block">{t.header.companyName}</span>
            <span className="block">{t.header.companyTag}</span>
          </p>
          <div className="flex items-center gap-1.5 text-white/25 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-asli-primary/60 animate-pulse" />
            Curicó, Chile
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
