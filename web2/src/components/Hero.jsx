/**
 * Hero — primera pantalla compacta para caber bien en el viewport
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
  const logo = useEnter(0)
  const title = useEnter(220)
  const text = useEnter(420)
  const cta = useEnter(620)
  const image = useEnter(280)

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
      className="section-fit relative overflow-hidden bg-[#F7F5F2]"
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          <div className="lg:col-span-6">
            <img
              src="/img/LOGO%20ASLI%20SIN%20FONDO%20AZUL.png"
              alt="ASLI"
              width={420}
              height={140}
              className="h-12 sm:h-14 w-auto object-contain mb-5"
              style={logo}
            />

            <p className="section-label !mb-2" style={title}>
              Logística y comercio exterior
            </p>

            <h1
              className="font-display text-asli-dark text-[clamp(2rem,4.2vw,3.35rem)] font-bold leading-[1.1] tracking-tight text-balance mb-4"
              style={title}
            >
              Del origen al destino,{' '}
              <span className="text-asli-primary">ASLI está en cada paso</span>
            </h1>

            <p
              className="text-muted-strong text-base md:text-lg max-w-lg mb-6 leading-relaxed"
              style={text}
            >
              Exportación, importación y coordinación multimodal para tu carga.
              Clara, rápida y pensada para operar — no solo para verse bien.
            </p>

            <div className="flex flex-col sm:flex-row gap-3" style={cta}>
              <button type="button" onClick={handleServiciosClick} className="btn-primary !py-3 !px-7 !text-[0.95rem]">
                Ver servicios
                <span aria-hidden="true">→</span>
              </button>
              <button type="button" onClick={handleAccederApp} className="btn-secondary !py-3 !px-7 !text-[0.95rem]">
                Acceder a la app
              </button>
            </div>
          </div>

          <div className="lg:col-span-6" style={image}>
            <div className="relative rounded-[20px] overflow-hidden shadow-asli-high border border-asli-dark/5 aspect-[16/11] max-h-[min(52vh,420px)] mx-auto w-full">
              <img
                src="/img/HERO.webp"
                alt="Operaciones logísticas ASLI"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-asli-dark/50 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 sm:bottom-5 sm:left-5">
                <p className="text-white font-display font-semibold text-base sm:text-lg">
                  Curicó · Maule · Chile
                </p>
                <p className="text-white/75 text-sm mt-0.5">
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
