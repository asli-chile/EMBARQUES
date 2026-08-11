import { servicios } from '../data/servicios'
import { useReveal } from '../hooks/useReveal'

function ServiceCard({ servicio, index }) {
  const { ref, style } = useReveal('up', Math.min(index, 5) * 120)

  return (
    <div ref={ref} style={style}>
      <article className="card-soft overflow-hidden flex flex-col h-full group">
        <div className="relative h-28 sm:h-32 overflow-hidden">
          <img
            src={servicio.imagen}
            alt=""
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-asli group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-asli-dark/40 to-transparent" />
          <span className="absolute bottom-2 left-3 font-display text-white/90 text-[0.7rem] tracking-[0.18em]">
            {String(index + 1).padStart(2, '0')}
          </span>
        </div>
        <div className="p-4 md:p-5 flex flex-col flex-grow">
          <h3 className="font-display text-base md:text-lg font-bold text-asli-dark tracking-tight mb-1.5">
            {servicio.titulo}
          </h3>
          <p className="text-muted-strong text-sm leading-snug mb-3 flex-grow line-clamp-2">
            {servicio.descripcion}
          </p>
          <a
            href="/servicios"
            className="inline-flex items-center gap-2 text-asli-primary font-bold text-sm hover:gap-3 transition-all duration-320 ease-asli"
          >
            Conocer más
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </article>
    </div>
  )
}

const Servicios = ({ limit = null, showCta = true }) => {
  const items = limit ? servicios.slice(0, limit) : servicios
  const header = useReveal('up')

  return (
    <section id="servicios" className="section-fit bg-white">
      <div className="container-asli">
        <div
          ref={header.ref}
          style={header.style}
          className="text-center max-w-2xl mx-auto mb-6 md:mb-8"
        >
          <span className="section-label justify-center !mb-2">Todo lo que necesitas</span>
          <h2 className="font-display text-asli-dark text-[clamp(1.65rem,3.4vw,2.5rem)] font-bold tracking-tight mb-2 text-balance">
            Nuestros servicios logísticos
          </h2>
          <p className="text-muted-strong text-base md:text-lg leading-relaxed">
            Exportar, importar y mover carga con coordinación naviera, aérea, terrestre y
            aduanera.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 md:gap-4">
          {items.map((servicio, index) => (
            <ServiceCard key={servicio.id} servicio={servicio} index={index} />
          ))}
        </div>

        {showCta && (
          <div className="mt-6 md:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href="/servicios" className="btn-primary !py-2.5 !px-6 !text-sm">
              Ver todos los servicios
            </a>
            <a
              href="https://mail.google.com/mail/?view=cm&to=informaciones@asli.cl&su=Cotización de servicios"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost-dark !py-2.5 !px-6 !text-sm"
            >
              Cotizar ahora
            </a>
          </div>
        )}
      </div>
    </section>
  )
}

export default Servicios
