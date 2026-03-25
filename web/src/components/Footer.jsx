import { motion } from 'framer-motion'
import { useLang } from '../lib/LangContext'

const igPath = 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z'
const liPath = 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z'

const Footer = () => {
  const year = new Date().getFullYear()
  const { t } = useLang()
  const f = t.footer

  const openGmail = () => {
    const email   = 'informaciones@asli.cl'
    const subject = encodeURIComponent('Consulta desde el sitio web')
    const body    = encodeURIComponent('Hola, me gustaría obtener más información sobre sus servicios.')
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${subject}&body=${body}`, '_blank')
  }

  return (
    <footer className="bg-asli-deep border-t border-asli-primary/20">

      {/* ── Compact CTA strip ── */}
      <div className="border-b border-white/[0.06]">
        <div className="container mx-auto px-6 lg:px-10 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="eyebrow block mb-1">{f.cta}</span>
            <p className="text-white font-semibold text-lg leading-tight">
              {f.cta === '¿Listo para crecer?' ? 'Cotiza tu operación con ASLI' : 'Get a quote from ASLI'}
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={openGmail}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-asli-accent text-white text-sm font-semibold hover:bg-asli-accent/90 transition-all duration-300"
            >
              {f.ctaBtn}
            </button>
            <a
              href="https://api.whatsapp.com/send/?phone=56968394225"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-white/15 text-white/70 text-sm font-semibold hover:border-asli-primary/50 hover:text-white transition-all duration-300"
            >
              {f.whatsapp}
            </a>
          </div>
        </div>
      </div>

      {/* ── Main footer — compacto ── */}
      <div className="container mx-auto px-6 lg:px-10 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">

          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <img src="/img/logoblanco.png" alt="ASLI" className="h-8 object-contain mb-3" />
            <p className="eyebrow text-white/30 mb-1.5">{f.servicios === 'Servicios' ? 'Logística y Comercio Exterior' : 'Logistics & Foreign Trade'}</p>
            <p className="text-asli-primary font-display font-bold italic text-base leading-snug whitespace-pre-line">
              {f.tagline}
            </p>
            {/* Socials */}
            <div className="flex gap-2 mt-4">
              {[
                { href: 'https://www.instagram.com/asli_chile',           label: 'Instagram', d: igPath },
                { href: 'https://www.linkedin.com/company/aslichile',     label: 'LinkedIn',  d: liPath },
              ].map(s => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                  className="w-8 h-8 rounded-lg glass border border-white/10 flex items-center justify-center text-white/40 hover:text-asli-primary hover:border-asli-primary/40 transition-all duration-300">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d={s.d} /></svg>
                </a>
              ))}
            </div>
          </div>

          {/* Servicios */}
          <div>
            <p className="eyebrow mb-3">{f.servicios}</p>
            <ul className="space-y-2">
              {f.srvList.map(s => (
                <li key={s}>
                  <a href="#servicios" className="text-white/45 hover:text-asli-primary transition-colors duration-200 text-xs font-light">{s}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Empresa */}
          <div>
            <p className="eyebrow mb-3">{f.empresa}</p>
            <ul className="space-y-2">
              {f.empList.map((l, i) => {
                const hrefs = ['#quienes-somos', '#equipo', '#socios', '/itinerario-asli', '/presentacion']
                return (
                  <li key={l}>
                    <a href={hrefs[i]} className="text-white/45 hover:text-asli-primary transition-colors duration-200 text-xs font-light">{l}</a>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Contacto */}
          <div>
            <p className="eyebrow mb-3">{f.servicios === 'Servicios' ? 'Contacto' : 'Contact'}</p>
            <div className="space-y-2">
              <p className="text-white/45 text-xs font-light leading-relaxed">Longitudinal Sur Km. 186<br/>Curicó, Maule, Chile</p>
              <a href="tel:+56968394225" className="block text-asli-primary hover:text-asli-accent transition-colors duration-200 text-xs font-medium">+56 9 6839 4225</a>
              <a href="mailto:contacto@asli.cl" className="block text-white/40 hover:text-asli-primary transition-colors duration-200 text-xs font-light">contacto@asli.cl</a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-5 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-white/25 text-xs font-light text-center sm:text-left">
            &copy; {year} ASLI – Asesorías y Servicios Logísticos Integrales Ltda. {f.rights}
          </p>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-asli-accent animate-pulse" />
            <span className="text-white/25 text-xs font-light">Curicó, Chile</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
