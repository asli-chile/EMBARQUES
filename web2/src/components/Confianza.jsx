import { clientes, partners, navieras } from '../data/servicios'
import { useReveal } from '../hooks/useReveal'
import { useLocale } from '../hooks/useLocale'

/** Segundos por logo: misma velocidad lineal aunque cada franja tenga distinto largo. */
const SECONDS_PER_LOGO = 4.5

function LogoStrip({ items, label }) {
  const track = [...items, ...items]
  const durationSec = Math.max(items.length, 1) * SECONDS_PER_LOGO

  return (
    <div className="mb-7 last:mb-0">
      <p className="section-label !mb-3">{label}</p>
      <div className="marquee-viewport overflow-hidden">
        <div className="marquee-track" style={{ animationDuration: `${durationSec}s` }}>
          {track.map((item, i) => (
            <div
              key={`${item.id ?? item.nombre}-${i}`}
              className="flex items-center justify-center h-10 md:h-12 w-[120px] md:w-[140px] shrink-0 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-320 ease-asli"
            >
              <img
                src={item.logo}
                alt={i < items.length ? item.nombre : ''}
                aria-hidden={i >= items.length}
                className="max-h-full max-w-[110px] md:max-w-[130px] object-contain"
                loading="lazy"
                decoding="async"
                width={140}
                height={48}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const Confianza = () => {
  const { t } = useLocale()
  const { ref, style } = useReveal('up')

  return (
    <section id="confianza" className="section-fit bg-asli-surface">
      <div ref={ref} style={style} className="container-asli">
        <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-8 md:mb-10">
          <span className="section-label justify-center !mb-2">{t.confianza.label}</span>
          <h2 className="font-display text-asli-dark text-[clamp(1.45rem,5.5vw,2.35rem)] font-bold tracking-tight mb-2 sm:mb-3 text-balance">
            {t.confianza.title}
          </h2>
          <p className="text-muted-strong text-sm sm:text-base md:text-lg leading-relaxed">
            <span className="sm:hidden">{t.confianza.subtitleMobile}</span>
            <span className="hidden sm:inline">{t.confianza.subtitleDesktop}</span>
          </p>
        </div>

        <LogoStrip items={clientes} label={t.confianza.clients} />
        <LogoStrip items={partners} label={t.confianza.partners} />
        <LogoStrip items={navieras} label={t.confianza.carriers} />
      </div>
    </section>
  )
}

export default Confianza
