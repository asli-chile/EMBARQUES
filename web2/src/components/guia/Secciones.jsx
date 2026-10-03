import Travesia from './Travesia'
import { Fuentes } from './Fuente'
import s from './Guia.module.css'

/*
 * Secciones compartidas por las guías de /exportar y la guía de /stacking.
 * Van dentro de un contenedor con la clase s.guia (paleta y acento).
 */

export function SeccionTravesia({ ceja = 'Paso a paso', titulo, bajada, pasos }) {
  return (
    <section id="travesia" className={`${s.travesia} py-16 md:py-24`} aria-labelledby="travesia-titulo">
      <div className="container-asli">
        <div className="max-w-2xl mb-6 md:mb-10">
          <p className={`${s.ceja} ${s.mono} mb-3`}>{ceja}</p>
          <h2
            id="travesia-titulo"
            className="font-display text-white text-[clamp(1.9rem,4.2vw,3.2rem)] font-bold leading-[1.02] tracking-tight mb-4"
          >
            {titulo}
          </h2>
          <p className="text-white/70 text-lg leading-relaxed">{bajada}</p>
        </div>
        <Travesia pasos={pasos} />
      </div>
    </section>
  )
}

export function SeccionErrores({ ceja, errores }) {
  return (
    <section className="py-16 md:py-24" aria-labelledby="errores-titulo">
      <div className="container-asli">
        <div className="max-w-2xl mb-10">
          <p className={`${s.etiqueta} ${s.mono} mb-3`}>{ceja}</p>
          <h2
            id="errores-titulo"
            className="font-display text-asli-dark text-[clamp(1.8rem,3.6vw,2.6rem)] font-bold leading-tight tracking-tight"
          >
            Errores comunes y cómo evitarlos
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          {errores.map((e) => (
            <article key={e.error} className="card-soft p-6 md:p-7">
              <p className={`font-display text-lg font-bold mb-3 flex gap-3 ${s.error}`}>
                <span aria-hidden="true">✕</span>
                <span>{e.error}</span>
              </p>
              <p className="text-muted-strong leading-relaxed flex gap-3">
                <span aria-hidden="true" className={`font-bold ${s.solucion}`}>
                  ✓
                </span>
                <span>
                  {e.solucion}
                  {e.fuente ? <Fuentes numeros={[e.fuente]} /> : null}
                  {e.experiencia ? <MarcaExperiencia /> : null}
                </span>
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export function SeccionFaqs({ faqs }) {
  return (
    <section className="py-16 md:py-24" aria-labelledby="faq-titulo">
      <div className="container-asli max-w-3xl">
        <h2
          id="faq-titulo"
          className="font-display text-asli-dark text-[clamp(1.8rem,3.6vw,2.6rem)] font-bold leading-tight tracking-tight mb-8"
        >
          Preguntas frecuentes
        </h2>
        <div className="space-y-5">
          {faqs.map((f) => (
            <details key={f.question} className="group border-b border-asli-dark/10 pb-5">
              <summary className="font-display text-lg font-semibold text-asli-dark cursor-pointer list-none flex items-start justify-between gap-4">
                <span>{f.question}</span>
                <span className="text-asli-primary shrink-0 transition-transform group-open:rotate-45" aria-hidden="true">
                  +
                </span>
              </summary>
              <p className="text-muted-strong mt-3 leading-relaxed">{f.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

export function SeccionFuentes({ intro, fuentes }) {
  return (
    <section className="pb-16 md:pb-24" aria-labelledby="fuentes-titulo">
      <div className="container-asli max-w-3xl">
        <h2 id="fuentes-titulo" className="font-display text-asli-dark text-2xl font-bold tracking-tight mb-2">
          Fuentes
        </h2>
        <p className="text-muted-strong leading-relaxed mb-8">{intro}</p>
        <ol className="space-y-3">
          {fuentes.map((f) => (
            <li key={f.n} id={`fuente-${f.n}`} className="flex gap-4 scroll-mt-28">
              <span className={`${s.mono} ${s.etiqueta} pt-0.5 shrink-0`}>[{f.n}]</span>
              <span className="text-sm leading-relaxed">
                {f.tipo ? <span className={`${s.mono} ${s.etiqueta} block text-[0.68rem] mb-0.5`}>{f.tipo}</span> : null}
                <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-asli-primary font-semibold hover:underline">
                  {f.titulo}
                </a>
                <span className="block text-muted-strong">{f.medio}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

export function MarcaExperiencia() {
  return <span className={`${s.mono} ${s.etiqueta} ml-2 text-[0.68rem]`}>· experiencia ASLI</span>
}
