import { servicios, navieras } from '../data/servicios'
import { useReveal } from '../hooks/useReveal'

const stats = [
  { value: '2021', label: 'Año de fundación' },
  { value: String(servicios.length), label: 'Líneas de servicio' },
  { value: `${navieras.length}+`, label: 'Navieras y aerolíneas' },
  { value: '24/7', label: 'Operación conectada' },
]

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
  const header = useReveal('up')

  return (
    <section className="section-band bg-white border-y border-asli-dark/5">
      <div className="container-asli">
        <div
          ref={header.ref}
          style={header.style}
          className="text-center max-w-xl mx-auto mb-6"
        >
          <h2 className="font-display text-asli-dark text-[clamp(1.35rem,2.8vw,1.9rem)] font-bold tracking-tight text-balance">
            Trayectoria que respalda cada operación
          </h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-6">
          {stats.map((stat, index) => (
            <Stat key={stat.label} stat={stat} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}

export default Estadisticas
