import { clientes, partners, navieras } from '../data/servicios'
import { useReveal } from '../hooks/useReveal'

function LogoStrip({ items, label }) {
  const track = [...items, ...items]

  return (
    <div className="mb-7 last:mb-0">
      <p className="section-label !mb-3">{label}</p>
      <div className="marquee-viewport overflow-hidden">
        <div className="marquee-track">
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
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const Confianza = () => {
  const { ref, style } = useReveal('up')

  return (
    <section id="confianza" className="section-fit bg-white">
      <div ref={ref} style={style} className="container-asli">
        <div className="text-center max-w-2xl mx-auto mb-8 md:mb-10">
          <span className="section-label justify-center !mb-2">Red operativa</span>
          <h2 className="font-display text-asli-dark text-[clamp(1.55rem,3.2vw,2.35rem)] font-bold tracking-tight mb-2 text-balance">
            Confianza demostrada en cada operación
          </h2>
          <p className="text-muted-strong text-base md:text-lg leading-relaxed">
            Clientes del agro-exportador, alianzas institucionales y las principales
            navieras y aerolíneas del sector.
          </p>
        </div>

        <LogoStrip items={clientes} label="Clientes" />
        <LogoStrip items={partners} label="Somos parte de" />
        <LogoStrip items={navieras} label="Navieras y aerolíneas" />
      </div>
    </section>
  )
}

export default Confianza
