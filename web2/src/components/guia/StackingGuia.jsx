import { stackingGuia as g } from '../../data/stacking'
import { useLocale } from '../../hooks/useLocale'
import { firaMono } from './fuenteMono'
import { Fuentes } from './Fuente'
import { SeccionTravesia, SeccionErrores, SeccionFaqs, SeccionFuentes, MarcaExperiencia } from './Secciones'
import s from './Guia.module.css'

// Los tres plazos que se confunden: cada uno con su fuente.
const PLAZOS = [
  {
    nombre: 'Stacking',
    texto: 'La ventana física en que el terminal recibe el contenedor de una nave.',
    fuentes: [1, 2],
  },
  {
    nombre: 'Corte documental',
    texto: 'La hora límite para entregar la documentación del embarque.',
    fuentes: [3, 5],
  },
  {
    nombre: 'Límite VGM',
    texto: 'El plazo para informar la masa bruta verificada de cada contenedor.',
    fuentes: [3, 6],
  },
]

/**
 * Guía "Qué es el stacking", debajo del directorio de navieras en /stacking.
 * Solo en español: en inglés o chino se muestra un aviso.
 */
export default function StackingGuia() {
  const { t, locale } = useLocale()

  return (
    <div
      className={`${s.guia} ${firaMono.variable}`}
      style={{ '--acento': g.acento, '--acento-claro': g.acentoClaro }}
      lang="es"
    >
      {locale !== 'es' && t.guides?.onlySpanish ? (
        <p className="bg-asli-ink text-white/80 text-sm text-center py-2 px-4">{t.guides.onlySpanish}</p>
      ) : null}

      {/* ---------- definición ---------- */}
      <section className="py-16 md:py-24" aria-labelledby="que-es-titulo">
        <div className="container-asli grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
          <div className="lg:col-span-6">
            <p className={`${s.etiqueta} ${s.mono} mb-3`}>Guía rápida</p>
            <h2
              id="que-es-titulo"
              className="font-display text-asli-dark text-[clamp(1.9rem,4vw,3rem)] font-bold leading-[1.05] tracking-tight mb-5"
            >
              ¿Qué es el stacking?
            </h2>
            <p className="text-muted-strong text-lg leading-relaxed">
              {g.definicion}
              <Fuentes numeros={g.definicionFuentes} />
            </p>
          </div>
          <div className="lg:col-span-6">
            <p className={`${s.etiqueta} ${s.mono} mb-4`}>Tres plazos distintos, los tres obligatorios</p>
            <ol className="space-y-3">
              {PLAZOS.map((p, i) => (
                <li key={p.nombre} className="card-soft p-5 flex gap-4 items-start">
                  <span className={`${s.dato} !text-2xl shrink-0 w-8`}>{i + 1}</span>
                  <span>
                    <span className="block font-display text-lg font-bold text-asli-dark">{p.nombre}</span>
                    <span className="text-muted-strong leading-relaxed">
                      {p.texto}
                      <Fuentes numeros={p.fuentes} />
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ---------- la semana del embarque ---------- */}
      <SeccionTravesia
        ceja="Paso a paso"
        titulo="La semana del embarque"
        bajada={`Del booking al zarpe, en ${g.pasos.length} hitos. Baja con el barco.`}
        pasos={g.pasos}
      />

      {/* ---------- portales por naviera ---------- */}
      <section className="py-16 md:py-24" aria-labelledby="navieras-titulo">
        <div className="container-asli">
          <div className="max-w-2xl mb-10">
            <p className={`${s.etiqueta} ${s.mono} mb-3`}>Cada portal es distinto</p>
            <h2
              id="navieras-titulo"
              className="font-display text-asli-dark text-[clamp(1.8rem,3.6vw,2.6rem)] font-bold leading-tight tracking-tight mb-3"
            >
              Qué muestra el stacking de cada naviera
            </h2>
            <p className="text-muted-strong leading-relaxed">
              Los abres desde el directorio de arriba. Esto es lo que vas a encontrar en cada uno.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {g.navieras.map((n) => (
              <article key={n.nombre} className="card-soft p-6">
                <h3 className="font-display text-xl font-bold text-asli-dark mb-2">{n.nombre}</h3>
                <p className="text-muted-strong text-sm leading-relaxed">
                  {n.texto}
                  {n.fuente ? <Fuentes numeros={[n.fuente]} /> : null}
                  {n.experiencia ? <MarcaExperiencia /> : null}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <SeccionErrores ceja="Para no perder la nave" errores={g.errores} />
      <SeccionFaqs faqs={g.faqs} />
      <SeccionFuentes intro={g.fuentesIntro} fuentes={g.fuentes} />
    </div>
  )
}
