import { servicios } from '../data/servicios'
import { useReveal } from '../hooks/useReveal'
import { SHOW_COTIZADOR } from '../lib/features'
import { useLocale } from '../hooks/useLocale'

function ServiceCard({ servicio, index }) {
  const { t } = useLocale()
  const { ref, style } = useReveal('up', Math.min(index, 5) * 60)
  const copy = t.servicios.items[servicio.id] || {}
  const titulo = copy.titulo || servicio.titulo
  const descripcion = copy.descripcion || servicio.descripcion
  const alt = copy.alt || servicio.alt || titulo

  return (
    <div ref={ref} style={style}>
      <article className="card-soft overflow-hidden flex flex-col h-full group">
        <div className="relative h-36 sm:h-32 overflow-hidden">
          <img
            src={servicio.imagen}
            alt={alt}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-asli group-hover:scale-105"
            loading="lazy"
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-asli-ink/40 to-transparent" />
          <span className="absolute bottom-2 left-3 font-display text-white/90 text-[0.7rem] tracking-[0.18em]">
            {String(index + 1).padStart(2, '0')}
          </span>
        </div>
        <div className="p-4 md:p-5 flex flex-col flex-grow">
          <h3 className="font-display text-base md:text-lg font-bold text-asli-dark tracking-tight mb-1.5">
            {titulo}
          </h3>
          <p className="text-muted-strong text-sm leading-relaxed mb-3 flex-grow line-clamp-3 sm:line-clamp-4">
            {descripcion}
          </p>
          <a
            href={servicio.href || '/servicios'}
            className="inline-flex items-center gap-2 text-asli-primary font-bold text-sm hover:gap-3 transition-all duration-320 ease-asli min-h-10"
          >
            {t.servicios.learnMore}
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </article>
    </div>
  )
}

const Servicios = ({ limit = null, showCta = true }) => {
  const { t } = useLocale()
  const items = limit ? servicios.slice(0, limit) : servicios
  const header = useReveal('up')

  return (
    <section id="servicios" className="section-fit bg-asli-surface">
      <div className="container-asli">
        <div
          ref={header.ref}
          style={header.style}
          className="text-center max-w-2xl mx-auto mb-6 md:mb-8"
        >
          <span className="section-label justify-center !mb-2">{t.servicios.label}</span>
          <h2 className="font-display text-asli-dark text-[clamp(1.65rem,3.4vw,2.5rem)] font-bold tracking-tight mb-3 text-balance">
            {t.servicios.title}
          </h2>
          <p className="text-muted-strong text-sm sm:text-base md:text-lg leading-relaxed">
            <span className="sm:hidden">{t.servicios.subtitleMobile}</span>
            <span className="hidden sm:inline">{t.servicios.subtitleDesktop}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {items.map((servicio, index) => (
            <ServiceCard key={servicio.id} servicio={servicio} index={index} />
          ))}
        </div>

        {showCta && (
          <div className="mt-6 md:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 sm:gap-3">
            <a
              href="/servicios"
              className="btn-primary !py-3 sm:!py-2.5 !px-6 !text-sm w-full sm:w-auto justify-center"
            >
              {t.servicios.viewAll}
            </a>
            <a
              href={
                SHOW_COTIZADOR
                  ? '/#cotizar'
                  : `https://mail.google.com/mail/?view=cm&to=informaciones@asli.cl&su=${encodeURIComponent(t.cotizar.mailSubject)}`
              }
              {...(SHOW_COTIZADOR
                ? {}
                : { target: '_blank', rel: 'noopener noreferrer' })}
              className="btn-ghost-dark !py-3 sm:!py-2.5 !px-6 !text-sm w-full sm:w-auto justify-center"
            >
              {t.servicios.quoteNow}
            </a>
          </div>
        )}
      </div>
    </section>
  )
}

export default Servicios
