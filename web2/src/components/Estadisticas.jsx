import { servicios, navieras } from '../data/servicios'
import { useReveal } from '../hooks/useReveal'
import { useLocale } from '../hooks/useLocale'

function Stat({ stat, index }) {
  const { ref, style } = useReveal('up', index * 180)

  return (
    <div ref={ref} style={style} className="text-center">
      <div className="font-display text-asli-primary text-[clamp(2rem,4vw,2.85rem)] font-bold leading-none tracking-tight tabular-nums">
        {stat.value}
      </div>
      <p className="text-muted-strong text-sm md:text-base mt-2 font-semibold">{stat.label}</p>
    </div>
  )
}

const Estadisticas = () => {
  const { t } = useLocale()
  const header = useReveal('up')

  const stats = [
    { value: '2021', label: t.stats.founded },
    { value: String(servicios.length), label: t.stats.lines },
    { value: `${navieras.length}+`, label: t.stats.carriers },
    { value: '24/7', label: t.stats.connected },
  ]

  return (
    <section className="section-band bg-asli-surface border-y border-asli-dark/5 !py-6 sm:!py-8 md:!py-10">
      <div className="container-asli">
        <div
          ref={header.ref}
          style={header.style}
          className="text-center max-w-2xl mx-auto mb-5 sm:mb-6"
        >
          <h2 className="font-display text-asli-dark text-[clamp(1.35rem,5.5vw,2.1rem)] font-bold tracking-tight text-balance mb-2">
            {t.stats.title}
          </h2>
          <p className="text-muted-strong text-sm md:text-base leading-relaxed">
            {t.stats.subtitle}
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-5 sm:gap-x-6 sm:gap-y-6">
          {stats.map((stat, index) => (
            <Stat key={stat.label} stat={stat} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}

export default Estadisticas
