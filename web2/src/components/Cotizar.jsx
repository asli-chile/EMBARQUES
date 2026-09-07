import { SHOW_COTIZADOR } from '../lib/features'
import { useReveal } from '../hooks/useReveal'
import { useLocale } from '../hooks/useLocale'

/**
 * Sección de cotización — ancla #cotizar para menú y CTAs.
 */
export default function Cotizar() {
  const { t } = useLocale()
  const { ref, style } = useReveal('up')

  if (!SHOW_COTIZADOR) return null

  const MAIL_URL =
    'https://mail.google.com/mail/?view=cm&fs=1&to=informaciones@asli.cl&su=' +
    encodeURIComponent(t.cotizar.mailSubject) +
    '&body=' +
    encodeURIComponent(t.cotizar.mailBody)

  const WHATSAPP_URL =
    'https://wa.me/56968394225?text=' + encodeURIComponent(t.cotizar.waText)

  return (
    <section id="cotizar" className="section-fit bg-asli-surface border-y border-asli-dark/5">
      <div ref={ref} style={style} className="container-asli max-w-3xl text-center">
        <span className="section-label justify-center !mb-3">{t.cotizar.label}</span>
        <h2 className="font-display text-asli-dark text-[clamp(1.6rem,5vw,2.5rem)] font-bold tracking-tight mb-4 text-balance">
          {t.cotizar.title}
        </h2>
        <p className="text-muted-strong text-base sm:text-lg leading-relaxed mb-8 max-w-xl mx-auto">
          {t.cotizar.body}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href={MAIL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary hover-lift w-full sm:w-auto justify-center"
          >
            {t.cotizar.ctaMail}
            <span aria-hidden="true">→</span>
          </a>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost-dark w-full sm:w-auto justify-center"
          >
            {t.cotizar.ctaWhatsapp}
          </a>
        </div>
      </div>
    </section>
  )
}
