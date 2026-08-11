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
      className="section-fit relative overflow-hidden bg-[#F7F5F2] !py-5 sm:!py-10 lg:!py-[unset]"
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8 lg:gap-10 items-center">
          <div className="lg:col-span-6">
            <p className="section-label !mb-2" style={title}>
              Logística y comercio exterior
            </p>

            <h1
              className="font-display text-asli-dark text-[clamp(1.75rem,7.2vw,3.35rem)] font-bold leading-[1.12] tracking-tight text-balance mb-3 sm:mb-4"
              style={title}
            >
              De Curicó al destino,{' '}
              <span className="text-asli-primary">ASLI está en cada paso</span>
            </h1>

            <p
              className="text-muted-strong text-[0.95rem] sm:text-base md:text-lg max-w-xl mb-4 sm:mb-6 leading-relaxed"
              style={text}
            >
              Somos un equipo de Curicó que acompaña a exportadores e importadores — sobre
              todo del agro — en cada etapa: documentación, navieras, aduanas y seguimiento.
              Hablamos claro, respondemos rápido y operamos contigo, no solo para ti.
            </p>

            <div className="flex flex-col gap-2.5 sm:flex-row sm:gap-3" style={cta}>
              <button
                type="button"
                onClick={handleServiciosClick}
                className="btn-primary !py-3 !px-7 !text-[0.95rem] w-full sm:w-auto justify-center"
              >
                Ver servicios
                <span aria-hidden="true">→</span>
              </button>
              <button
                type="button"
                onClick={handleAccederApp}
                className="btn-secondary !py-3 !px-7 !text-[0.95rem] w-full sm:w-auto justify-center"
              >
                Acceder a la app
              </button>
            </div>
          </div>

          <div className="lg:col-span-6" style={image}>
            <div className="relative rounded-[16px] sm:rounded-[20px] overflow-hidden shadow-asli-high border border-asli-dark/5 aspect-[16/11] max-h-[min(36vh,260px)] sm:max-h-[min(48vh,380px)] lg:max-h-[min(52vh,420px)] mx-auto w-full">
              <img
                src="/img/HERO.webp"
                alt="Operaciones logísticas ASLI"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-asli-dark/50 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 sm:bottom-5 sm:left-5">
                <p className="text-white font-display font-semibold text-sm sm:text-lg">
                  Curicó · Maule · Chile
                </p>
                <p className="text-white/75 text-xs sm:text-sm mt-0.5">
                  Especialistas en fruta fresca y congelada
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
