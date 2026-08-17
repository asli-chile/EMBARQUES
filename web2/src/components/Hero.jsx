/**
 * Hero — fachada ASLI como plano visual; tipografía compacta en mobile
 */
import { useEffect, useState } from 'react'

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'
const DURATION = '1.35s'

function useEnter(delay = 0) {
  const [on, setOn] = useState(false)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setOn(true)
      return
    }
    const id = window.setTimeout(() => setOn(true), 180 + delay)
    return () => window.clearTimeout(id)
  }, [delay])

  return {
    opacity: on ? 1 : 0,
    transform: on ? 'translate3d(0,0,0)' : 'translate3d(0, 36px, 0)',
    transition: `opacity ${DURATION} ${EASE} ${delay}ms, transform ${DURATION} ${EASE} ${delay}ms`,
  }
}

const Hero = () => {
  const title = useEnter(0)
  const text = useEnter(160)
  const cta = useEnter(300)
  const image = useEnter(200)

  const handleServiciosClick = () => {
    document.getElementById('servicios')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section
      id="inicio"
      className="section-fit relative overflow-hidden bg-[#F7F5F2] !py-3 sm:!py-8 lg:!py-[unset]"
    >
      <div
        className="pointer-events-none absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full opacity-25"
        style={{
          background: 'radial-gradient(circle, rgba(0,122,123,0.28), transparent 70%)',
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-32 -left-20 w-[380px] h-[380px] rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(102,153,0,0.22), transparent 70%)',
        }}
      />

      <div className="relative z-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-10 lg:items-center lg:container-asli">
          {/* Copy */}
          <div className="container-asli lg:col-span-5 lg:px-0 order-1">
            <p className="section-label !mb-1.5" style={title}>
              Logística y comercio exterior
            </p>

            <h1
              className="font-display text-asli-dark text-[clamp(1.9rem,7.5vw,3.2rem)] font-bold leading-[1.08] tracking-tight text-balance mb-2.5 sm:mb-3"
              style={title}
            >
              En tu operación,{' '}
              <span className="text-asli-primary">ASLI está en cada paso</span>
            </h1>

            <p
              className="text-muted-strong text-[0.92rem] sm:text-base md:text-lg max-w-xl mb-3.5 sm:mb-5 leading-relaxed"
              style={text}
            >
              <span className="sm:hidden">
                Equipo de Curicó con exportadores e importadores del agro: documentación,
                navieras, aduanas y seguimiento.
              </span>
              <span className="hidden sm:inline">
                Somos un equipo de Curicó que acompaña a exportadores e importadores — sobre
                todo del agro — en cada etapa: documentación, navieras, aduanas y seguimiento.
                Hablamos claro, respondemos rápido y operamos contigo, no solo para ti.
              </span>
            </p>

            <div className="flex mb-4 lg:mb-0" style={cta}>
              <button
                type="button"
                onClick={handleServiciosClick}
                className="btn-primary !py-3 !px-4 sm:!px-7 !text-[0.9rem] w-full sm:w-auto justify-center"
              >
                Ver servicios
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>

          {/* Fachada — plano visual dominante */}
          <div className="lg:col-span-7 order-2" style={image}>
            <div
              className="relative overflow-hidden w-full
                h-[min(46vh,320px)] sm:h-[min(48vh,400px)] lg:h-[min(62vh,520px)]
                sm:mx-auto sm:max-w-[calc(100%-3rem)] lg:max-w-none lg:mx-0
                rounded-none sm:rounded-[20px]
                border-y sm:border border-asli-dark/5 shadow-asli-high"
            >
              <img
                src="/img/oficina.png"
                alt="Oficinas ASLI en Curicó"
                className="absolute inset-0 w-full h-full object-cover object-[center_32%] sm:object-[center_28%] lg:object-[center_30%]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-asli-dark/60 via-asli-dark/10 to-transparent" />
              <div className="absolute bottom-3.5 left-4 right-4 sm:bottom-5 sm:left-5 sm:right-5">
                <p className="text-white font-display font-semibold text-base sm:text-lg tracking-tight">
                  Curicó · Maule
                </p>
                <p className="text-white/80 text-xs sm:text-sm mt-0.5">
                  Nuestra base operativa
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero
