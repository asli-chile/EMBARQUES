import { useReveal } from '../hooks/useReveal'

/**
 * Nuestra Historia — relato cercano del origen de ASLI
 */
const NuestraHistoria = () => {
  const left = useReveal('up')
  const quote = useReveal('up', 120)
  const body = useReveal('up', 220)
  const stats = useReveal('up', 320)

  return (
    <section id="historia" className="relative overflow-hidden bg-[#F7F5F2] py-10 sm:py-14 md:py-24">
      <div
        className="pointer-events-none absolute -left-10 top-1/2 -translate-y-1/2 font-display font-black select-none text-asli-dark/[0.04] hidden sm:block"
        style={{ fontSize: 'clamp(10rem, 22vw, 18rem)', lineHeight: 0.85 }}
        aria-hidden="true"
      >
        2021
      </div>

      <div className="container-asli relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 lg:gap-14 items-start">
          <div ref={left.ref} style={left.style} className="lg:col-span-5 lg:sticky lg:top-28">
            <span className="section-label !mb-2 sm:!mb-3">Nuestra historia</span>
            <h2 className="font-display text-asli-dark text-[clamp(1.55rem,6.5vw,2.85rem)] font-bold tracking-tight text-balance mb-3 sm:mb-4">
              Nacimos en Curicó para{' '}
              <span className="text-asli-primary">acercar la logística grande</span> a quien
              exporta e importa de verdad
            </h2>
            <p className="text-muted-strong text-[0.92rem] sm:text-base md:text-lg leading-relaxed mb-5 sm:mb-6">
              ASLI — Asesorías y Servicios Logísticos Integrales — se fundó en Curicó en 2021
              con una convicción simple: la PyME agroexportadora merece el mismo estándar
              operativo que las grandes compañías, sin perder cercanía ni claridad.
            </p>
            <div className="relative -mx-4 sm:mx-0 rounded-none sm:rounded-[20px] overflow-hidden border-y sm:border border-asli-dark/5 shadow-asli-med aspect-[16/10] max-h-[200px] sm:max-h-none">
              <img
                src="/img/edificio.webp"
                alt="Oficinas ASLI en Curicó"
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-asli-dark/55 via-transparent to-transparent" />
              <p className="absolute bottom-3 left-4 right-4 sm:bottom-4 sm:left-4 sm:right-4 text-white font-display font-semibold text-sm sm:text-base">
                Curicó · Región del Maule · Chile
              </p>
            </div>
          </div>

          <div className="lg:col-span-7 flex flex-col gap-5 md:gap-7">
            <blockquote
              ref={quote.ref}
              style={quote.style}
              className="border-l-4 border-asli-primary pl-4 sm:pl-5 md:pl-6 py-3 sm:py-4 bg-white/70 rounded-r-[18px]"
            >
              <p className="font-display text-asli-dark text-[1.05rem] sm:text-xl md:text-2xl font-bold leading-snug text-balance">
                “Asesorar, acompañar y respaldar a los exportadores, ayudándolos a operar con
                el mismo estándar de las grandes compañías.”
              </p>
              <footer className="mt-3 text-asli-primary text-sm font-bold tracking-wide">
                — Mario Basaez, Fundador y Gerente General
              </footer>
            </blockquote>

            <div ref={body.ref} style={body.style} className="space-y-4 sm:space-y-5 text-muted-strong text-[0.92rem] sm:text-base md:text-lg leading-relaxed">
              <p>
                En el camino vimos un problema recurrente: para muchos productores y
                exportadores medianos, la logística no es solo un costo — es la barrera que
                frena el crecimiento. Documentación confusa, tiempos poco claros y poca
                persona a quien llamar cuando algo se complica.
              </p>
              <p className="hidden sm:block">
                Por eso ASLI existe como equipo cercano y experto: explicamos en lenguaje
                claro, armamos la ruta multimodal (marítimo, aéreo o terrestre), cuidamos
                aduanas y certificados, y hacemos seguimiento hasta el destino. Especialmente
                en fruta fresca y congelada, donde cada hora cuenta.
              </p>
              <p>
                Hoy seguimos en Curicó, conectados con navieras, aerolíneas y aliados del
                agro-exportador, con la misma promesa de siempre: operación seria, trato
                humano y respuestas cuando las necesitas.
              </p>
            </div>

            <div
              ref={stats.ref}
              style={stats.style}
              className="grid grid-cols-3 gap-2 sm:gap-4 pt-5 sm:pt-6 border-t border-asli-dark/10"
            >
              {[
                { v: '2021', l: 'Fundación' },
                { v: 'Curicó', l: 'Origen' },
                { v: 'PyME', l: 'Cercanía' },
              ].map((item) => (
                <div key={item.l} className="text-center sm:text-left">
                  <p className="font-display text-asli-primary text-xl sm:text-2xl md:text-3xl font-bold">
                    {item.v}
                  </p>
                  <p className="text-muted text-[0.65rem] sm:text-xs md:text-sm font-semibold uppercase tracking-wider mt-1">
                    {item.l}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default NuestraHistoria
