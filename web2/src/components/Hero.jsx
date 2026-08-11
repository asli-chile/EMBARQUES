/**
 * Hero — primera pantalla compacta; tipografía y media adaptadas a mobile
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
    transform: on ? 'translate3d(0,0,0)' : 'translate3d(0, 40px, 0)',
    transition: `opacity ${DURATION} ${EASE} ${delay}ms, transform ${DURATION} ${EASE} ${delay}ms`,
  }
}

const Hero = () => {
  const title = useEnter(0)
  const text = useEnter(180)
  const cta = useEnter(360)
  const image = useEnter(220)

  const handleAccederApp = () => {
    if (typeof window === 'undefined') return

    const hostname = window.location.hostname
    const isLocal =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.')

    if (isLocal) {
      window.location.replace('http://localhost:3001')
      return
    }

    window.location.href = '/auth'
  }

  const handleServiciosClick = () => {
    document.getElementById('servicios')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section
      id="inicio"
      className="section-fit relative overflow-hidden bg-[#F7F5F2] !py-4 sm:!py-10 lg:!py-[unset]"
    >
      <div
        className="pointer-events-none absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full opacity-30"
        style={{
          background: 'radial-gradient(circle, rgba(0,122,123,0.28), transparent 70%)',
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-32 -left-20 w-[380px] h-[380px] rounded-full opacity-25"
        style={{
          background: 'radial-gradient(circle, rgba(102,153,0,0.22), transparent 70%)',
        }}
      />

      <div className="relative z-10 container-asli w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-8 lg:gap-10 items-center">
          <div className="lg:col-span-6">
            <p className="section-label !mb-1.5 sm:!mb-2" style={title}>
              Logística y comercio exterior
            </p>

            <h1
              className="font-display text-asli-dark text-[clamp(1.85rem,8vw,3.35rem)] font-bold leading-[1.1] tracking-tight text-balance mb-2.5 sm:mb-4"
              style={title}
            >
              En tu operación,{' '}
              <span className="text-asli-primary">ASLI está en cada paso</span>
            </h1>

            <p
              className="text-muted-strong text-[0.92rem] sm:text-base md:text-lg max-w-xl mb-4 sm:mb-6 leading-relaxed"
              style={text}
            >
              <span className="sm:hidden">
                Equipo de Curicó que acompaña a exportadores e importadores del agro:
                documentación, navieras, aduanas y seguimiento — claro, rápido y contigo.
              </span>
              <span className="hidden sm:inline">
                Somos un equipo de Curicó que acompaña a exportadores e importadores — sobre
                todo del agro — en cada etapa: documentación, navieras, aduanas y seguimiento.
                Hablamos claro, respondemos rápido y operamos contigo, no solo para ti.
              </span>
            </p>

            <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-2.5 sm:flex sm:flex-row sm:gap-3" style={cta}>
              <button
                type="button"
                onClick={handleServiciosClick}
                className="btn-primary !py-3 !px-5 sm:!px-7 !text-[0.92rem] w-full sm:w-auto justify-center"
              >
                Ver servicios
                <span aria-hidden="true">→</span>
              </button>
              <button
                type="button"
                onClick={handleAccederApp}
                className="btn-secondary !py-3 !px-5 sm:!px-7 !text-[0.92rem] w-full sm:w-auto justify-center"
              >
                Acceder a la app
              </button>
            </div>
          </div>

          <div className="lg:col-span-6 -mx-4 sm:mx-0" style={image}>
            <div className="relative overflow-hidden shadow-asli-high border-y sm:border border-asli-dark/5 rounded-none sm:rounded-[20px] aspect-[16/10] sm:aspect-[16/11] max-h-[min(34vh,240px)] sm:max-h-[min(48vh,380px)] lg:max-h-[min(52vh,420px)] mx-auto w-full">
              <img
                src="/img/edificio.webp"
                alt="Oficinas ASLI en Curicó"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-asli-dark/55 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-4 right-4 sm:bottom-5 sm:left-5">
                <p className="text-white font-display font-semibold text-sm sm:text-lg">
                  Oficinas ASLI · Curicó
                </p>
                <p className="text-white/80 text-xs sm:text-sm mt-0.5">
                  Logística y comercio exterior
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
