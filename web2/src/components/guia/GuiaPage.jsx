import { Fira_Mono } from 'next/font/google'
import Header from '../Header'
import Footer from '../Footer'
import Seo, { buildGuideJsonLd } from '../Seo'
import Travesia from './Travesia'
import { Fuentes } from './Fuente'
import s from './Guia.module.css'
import { getLanding } from '../../data/landings'
import { absoluteUrl, whatsappUrl } from '../../lib/site'
import { trackLead } from '../../lib/analytics'
import { useLocale } from '../../hooks/useLocale'

// Solo para las cifras técnicas (pantalla del reefer, recaladas, fuentes).
const firaMono = Fira_Mono({ subsets: ['latin'], weight: '500', display: 'swap', variable: '--font-fira-mono' })

const ICONOS = {
  origen: (
    <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Zm0-8.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
  ),
  reloj: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v4.5l3 2" />,
  contenedor: <path d="M3 7h18v10H3zM7 7v10M11 7v10M15 7v10M19 7v10" />,
  atmosfera: <path d="M4 12h10a3 3 0 1 0-3-3M4 16h14a3 3 0 1 1-3 3M4 8h4" />,
  mano: <path d="M5 19c9 0 14-5 14-14-9 0-14 5-14 14Zm0 0 6-6" />,
}

function Icono({ nombre }) {
  return (
    <span className={s.icono} aria-hidden="true">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {ICONOS[nombre]}
      </svg>
    </span>
  )
}

/**
 * Plantilla de una guía de exportación. Contenido en src/data/guias.js.
 * Las guías están solo en español: en inglés o chino se muestra un aviso.
 */
export default function GuiaPage({ guia }) {
  const { t, locale } = useLocale()
  const path = `/exportar/${guia.slug}`
  const contacto = `/contacto?producto=${encodeURIComponent(guia.contacto.producto)}&carga=${guia.contacto.carga}&desde=exportar/${guia.slug}`
  const wa = whatsappUrl(
    `Hola ASLI, quiero cotizar la exportación de ${guia.producto.toLowerCase()}.\nDestino:\nTipo de carga y volumen:\nSemana de embarque:`
  )
  const relacionadas = (guia.related || []).map(getLanding).filter(Boolean)
  const h1 = `${guia.h1Antes} ${guia.h1Acento} ${guia.h1Despues}`
  const jsonLd = buildGuideJsonLd({
    path,
    headline: h1,
    description: guia.description,
    image: absoluteUrl(guia.imagenOg || guia.imagen),
    datePublished: guia.publicada,
    dateModified: guia.actualizada,
    faqs: guia.faqs,
    breadcrumb: [
      { name: 'Inicio', path: '/' },
      { name: 'Exportar', path: '/exportar' },
      { name: guia.producto, path },
    ],
  })
  // Textos del cierre que cambian según el producto (los congelados no tienen temporada).
  const cta = guia.cta || 'Cotizar mi temporada'
  const cierreCeja = guia.cierreCeja || 'Tu próxima temporada'
  const cierreObjeto = guia.cierreObjeto || `tus ${guia.producto.toLowerCase()}`
  const muchosMeses = guia.temporada.meses.length > 6
  const estiloAcento = { '--acento': guia.acento, '--acento-claro': guia.acentoClaro || guia.acento }

  return (
    <>
      <Seo
        title={guia.title}
        description={guia.description}
        path={path}
        type="article"
        image={guia.imagenOg ? absoluteUrl(guia.imagenOg) : undefined}
        imageAlt={guia.imagenAlt}
        contentLang="es"
        jsonLd={jsonLd}
      />
      <div className={`min-h-screen flex flex-col bg-asli-light ${s.guia} ${firaMono.variable}`} style={estiloAcento}>
        <Header />
        {locale !== 'es' && t.guides?.onlySpanish ? (
          <p className="bg-asli-ink text-white/80 text-sm text-center py-2 px-4" lang={locale === 'zh' ? 'zh-CN' : locale}>
            {t.guides.onlySpanish}
          </p>
        ) : null}

        <main className="flex-grow" lang="es">
          {/* ---------- portada ---------- */}
          <section className={s.portada}>
            <div className={s.portadaFoto} aria-hidden="true">
              <picture>
                <source media="(max-width: 767px)" srcSet={guia.imagenMovil} />
                <img src={guia.imagen} alt="" width={1600} height={1000} fetchPriority="high" decoding="async" />
              </picture>
            </div>
            <div className={`${s.mancha} ${s.manchaTeal}`} aria-hidden="true" />
            <div className={`${s.mancha} ${s.manchaAcento}`} aria-hidden="true" />
            <svg className={s.arco} viewBox="0 0 1440 220" preserveAspectRatio="none" aria-hidden="true">
              <path
                d="M-20 200 C 360 40, 1080 40, 1460 170"
                fill="none"
                stroke="#2EF2C8"
                strokeOpacity=".35"
                strokeWidth="2"
                strokeDasharray="2 12"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>

            <div className="container-asli relative pt-10 pb-16 md:pt-14 md:pb-24 lg:pt-16 lg:pb-28">
              <nav className={`${s.mono} text-xs text-white/55 mb-8 hero-enter`} aria-label="Miga de pan">
                <a href="/" className="hover:text-white">Inicio</a>
                <span className="mx-2" aria-hidden="true">/</span>
                <a href="/exportar" className="hover:text-white">Exportar</a>
                <span className="mx-2" aria-hidden="true">/</span>
                <span className="text-white/85">{guia.producto}</span>
              </nav>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-end">
                <div className="lg:col-span-7">
                  <p className={`${s.ceja} ${s.mono} mb-4 hero-enter`}>{guia.ceja}</p>
                  <h1 className={`${s.h1} mb-6 hero-enter`}>
                    {guia.h1Antes} <span className={s.h1Acento}>{guia.h1Acento}</span>
                    <br />
                    {guia.h1Despues}
                  </h1>
                  <p className={`${s.resumen} mb-8 hero-enter hero-enter-delay-1`}>{guia.resumen}</p>
                  <div className="flex flex-col sm:flex-row gap-3 hero-enter hero-enter-delay-2">
                    <a href={contacto} className={s.botonLleno}>
                      {cta}
                    </a>
                    <a href="#travesia" className={s.botonBorde}>
                      Ver el paso a paso <span aria-hidden="true">↓</span>
                    </a>
                  </div>
                </div>

                <div className="lg:col-span-5 hero-enter hero-enter-delay-3">
                  <div className={s.panel} role="group" aria-label="Seteo recomendado del contenedor reefer">
                    <div className={`${s.panelCabeza} ${s.mono}`}>
                      <span>Reefer · seteo de viaje</span>
                      <span className="inline-flex items-center gap-2">
                        <span className={s.led} aria-hidden="true" /> {guia.producto}
                      </span>
                    </div>
                    {guia.seteo.map((l) => (
                      <div key={l.etiqueta} className={s.lectura}>
                        <span className={s.lecturaEtiqueta}>
                          {l.etiqueta}
                          <Fuentes numeros={[l.fuente]} />
                        </span>
                        <span className={`${s.lecturaValor} ${s.mono}`}>
                          {l.valor}
                          <span className={s.lecturaUnidad}>{l.unidad}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ---------- ficha ---------- */}
          <section className="py-16 md:py-24" aria-labelledby="ficha-titulo">
            <div className="container-asli">
              <div className="max-w-2xl mb-10">
                <p className={`${s.etiqueta} ${s.mono} mb-3`}>Ficha técnica</p>
                <h2 id="ficha-titulo" className="font-display text-asli-dark text-[clamp(1.8rem,3.6vw,2.6rem)] font-bold leading-tight tracking-tight">
                  Lo esencial antes de embarcar
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                <article className="card-soft p-6 md:p-7 lg:row-span-2 flex flex-col">
                  <p className={`${s.etiqueta} ${s.mono} mb-5`}>Temporada</p>
                  <p className={`${s.dato} mb-1`}>{guia.temporada.dato}</p>
                  <p className="text-muted-strong font-semibold mb-auto pb-8">{guia.temporada.peak}</p>
                  <div
                    className={s.temporadaBarra}
                    style={{ gridTemplateColumns: `repeat(${guia.temporada.meses.length}, minmax(0, 1fr))`, gap: muchosMeses ? '3px' : undefined }}
                    role="img"
                    aria-label={`${guia.temporada.dato}. ${guia.temporada.peak}`}
                  >
                    {guia.temporada.meses.map((m, i) => (
                      <div key={`${m.mes}-${i}`} className={s.mes}>
                        <div
                          className={s.mesBarra}
                          style={{
                            height: `${[6, 34, 68, 100][m.nivel]}%`,
                            opacity: m.nivel === 0 ? 0.18 : 0.35 + m.nivel * 0.22,
                          }}
                        />
                        <span className={`${s.mesNombre} ${s.mono}`}>{muchosMeses ? m.mes.charAt(0) : m.mes}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-muted-strong text-base leading-relaxed mt-6">
                    {guia.temporada.texto}
                    <Fuentes numeros={[guia.temporada.fuente]} />
                  </p>
                </article>

                {guia.ficha.map((f) => (
                  <article key={f.etiqueta} className="card-soft p-6 md:p-7">
                    <div className="flex items-center gap-3 mb-5">
                      <Icono nombre={f.icono} />
                      <p className={`${s.etiqueta} ${s.mono}`}>{f.etiqueta}</p>
                    </div>
                    <p className={`${s.dato} mb-2`}>{f.valor}</p>
                    <p className="text-muted-strong text-base leading-relaxed">
                      {f.texto}
                      <Fuentes numeros={[f.fuente]} />
                    </p>
                    {f.comparacion ? (
                      <ul className="mt-5 space-y-3">
                        {f.comparacion.map((c) => (
                          <li key={c.etiqueta}>
                            <div className="flex items-baseline justify-between gap-3 text-sm mb-1.5">
                              <span className="text-asli-dark font-semibold">{c.etiqueta}</span>
                              <span className={`${s.mono} ${s.etiqueta} shrink-0`}>{c.texto}</span>
                            </div>
                            <div className={s.vidaPista} aria-hidden="true">
                              <span className={s.vidaBarra} style={{ width: `${(c.desde / (f.escala || 6)) * 100}%` }} />
                              {c.hasta > c.desde ? (
                                <span
                                  className={s.vidaRango}
                                  style={{
                                    left: `${(c.desde / (f.escala || 6)) * 100}%`,
                                    width: `${((c.hasta - c.desde) / (f.escala || 6)) * 100}%`,
                                  }}
                                />
                              ) : null}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* ---------- la travesía ---------- */}
          <section id="travesia" className={`${s.travesia} py-16 md:py-24`} aria-labelledby="travesia-titulo">
            <div className="container-asli">
              <div className="max-w-2xl mb-6 md:mb-10">
                <p className={`${s.ceja} ${s.mono} mb-3`}>Paso a paso</p>
                <h2 id="travesia-titulo" className="font-display text-white text-[clamp(1.9rem,4.2vw,3.2rem)] font-bold leading-[1.02] tracking-tight mb-4">
                  La travesía de tu {guia.singular}
                </h2>
                <p className="text-white/70 text-lg leading-relaxed">
                  Del huerto a cualquier parte del mundo, en {guia.pasos.length} recaladas. Baja con el barco.
                </p>
              </div>
              <Travesia pasos={guia.pasos} />
            </div>
          </section>

          {/* ---------- errores ---------- */}
          <section className="py-16 md:py-24" aria-labelledby="errores-titulo">
            <div className="container-asli">
              <div className="max-w-2xl mb-10">
                <p className={`${s.etiqueta} ${s.mono} mb-3`}>Para no perder la temporada</p>
                <h2 id="errores-titulo" className="font-display text-asli-dark text-[clamp(1.8rem,3.6vw,2.6rem)] font-bold leading-tight tracking-tight">
                  Errores comunes y cómo evitarlos
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                {guia.errores.map((e) => (
                  <article key={e.error} className="card-soft p-6 md:p-7">
                    <p className={`font-display text-lg font-bold mb-3 flex gap-3 ${s.error}`}>
                      <span aria-hidden="true">✕</span>
                      <span>{e.error}</span>
                    </p>
                    <p className="text-muted-strong leading-relaxed flex gap-3">
                      <span aria-hidden="true" className={`font-bold ${s.solucion}`}>✓</span>
                      <span>
                        {e.solucion}
                        {e.fuente ? <Fuentes numeros={[e.fuente]} /> : null}
                        {e.experiencia ? (
                          <span className={`${s.mono} ${s.etiqueta} ml-2 text-[0.68rem]`}>· experiencia ASLI</span>
                        ) : null}
                      </span>
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* ---------- cómo lo hace ASLI ---------- */}
          <section className="bg-asli-surface py-16 md:py-24 border-y border-asli-dark/5" aria-labelledby="asli-titulo">
            <div className="container-asli grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
              <div className="lg:col-span-5 overflow-hidden rounded-[22px] border border-asli-dark/10">
                <img
                  src={guia.imagenAsli}
                  alt="Oficinas de ASLI en Curicó, Región del Maule"
                  width={960}
                  height={720}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="lg:col-span-7">
                <p className={`${s.etiqueta} ${s.mono} mb-3`}>Desde Curicó</p>
                <h2 id="asli-titulo" className="font-display text-asli-dark text-[clamp(1.8rem,3.6vw,2.6rem)] font-bold leading-tight tracking-tight mb-5">
                  Cómo lo hacemos en ASLI
                </h2>
                {guia.comoLoHaceAsli.map((p, i) => (
                  <p key={i} className="text-muted-strong text-lg leading-relaxed mb-4">
                    {p}
                  </p>
                ))}
                <div className="flex flex-wrap gap-x-6 gap-y-2 mt-6">
                  {relacionadas.map((l) => (
                    <a key={l.slug} href={`/${l.slug}`} className="text-asli-primary font-semibold hover:underline">
                      {l.h1} →
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ---------- preguntas frecuentes ---------- */}
          <section className="py-16 md:py-24" aria-labelledby="faq-titulo">
            <div className="container-asli max-w-3xl">
              <h2 id="faq-titulo" className="font-display text-asli-dark text-[clamp(1.8rem,3.6vw,2.6rem)] font-bold leading-tight tracking-tight mb-8">
                Preguntas frecuentes
              </h2>
              <div className="space-y-5">
                {guia.faqs.map((f) => (
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

          {/* ---------- fuentes ---------- */}
          <section className="pb-16 md:pb-24" aria-labelledby="fuentes-titulo">
            <div className="container-asli max-w-3xl">
              <h2 id="fuentes-titulo" className="font-display text-asli-dark text-2xl font-bold tracking-tight mb-2">
                Fuentes
              </h2>
              <p className="text-muted-strong leading-relaxed mb-8">{guia.fuentesIntro}</p>
              <ol className="space-y-3">
                {guia.fuentes.map((f) => (
                  <li key={f.n} id={`fuente-${f.n}`} className="flex gap-4 scroll-mt-28">
                    <span className={`${s.mono} ${s.etiqueta} pt-0.5 shrink-0`}>[{f.n}]</span>
                    <span className="text-sm leading-relaxed">
                      {f.tipo ? (
                        <span className={`${s.mono} ${s.etiqueta} block text-[0.68rem] mb-0.5`}>{f.tipo}</span>
                      ) : null}
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

          {/* ---------- cierre ---------- */}
          <section className={`${s.cierre} py-20 md:py-28`} aria-labelledby="cierre-titulo">
            <div className={s.cierreFoto} aria-hidden="true">
              <img src={guia.imagenCierre} alt="" width={1600} height={700} loading="lazy" decoding="async" />
            </div>
            <div className="container-asli max-w-3xl">
              <p className={`${s.ceja} ${s.mono} mb-4`}>{cierreCeja}</p>
              <h2 id="cierre-titulo" className="font-display text-white text-[clamp(2rem,4.6vw,3.4rem)] font-bold leading-[1.02] tracking-tight mb-5">
                Cotiza la exportación de {cierreObjeto}
              </h2>
              <p className="text-white/75 text-lg leading-relaxed mb-8 max-w-xl">
                Cuéntanos la semana de embarque, el volumen y el destino. Te respondemos con una propuesta concreta, a
                cualquier parte del mundo.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <a href={contacto} className={s.botonLleno}>
                  {cta}
                </a>
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackLead('whatsapp', `exportar/${guia.slug}`)}
                  className={s.botonBorde}
                >
                  Escribir por WhatsApp
                </a>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  )
}
