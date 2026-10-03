import Header from '../../src/components/Header'
import Footer from '../../src/components/Footer'
import Seo, { buildPageJsonLd } from '../../src/components/Seo'
import { guias, guiasProximas } from '../../src/data/guias'
import { absoluteUrl } from '../../src/lib/site'
import { useLocale } from '../../src/hooks/useLocale'

const TITULO = 'Guías para exportar fruta desde Chile | ASLI'
const DESCRIPCION =
  'Guías prácticas para exportar fruta desde Chile: temporada, enfriado, contenedor reefer, atmósfera, documentos SAG y aduana, y stacking. Por ASLI, Curicó.'

/** Portada de la sección de guías. Solo en español, como las guías. */
export default function ExportarPage() {
  const { t, locale } = useLocale()
  const jsonLd = buildPageJsonLd({
    type: 'CollectionPage',
    path: '/exportar',
    name: TITULO,
    description: DESCRIPCION,
    breadcrumb: [
      { name: 'Inicio', path: '/' },
      { name: 'Exportar', path: '/exportar' },
    ],
    extra: { hasPart: guias.map((g) => ({ '@id': `${absoluteUrl(`/exportar/${g.slug}`)}#article` })) },
  })

  return (
    <>
      <Seo title={TITULO} description={DESCRIPCION} path="/exportar" contentLang="es" jsonLd={jsonLd} />
      <div className="min-h-screen flex flex-col bg-asli-light">
        <Header />
        {locale !== 'es' && t.guides?.onlySpanish ? (
          <p className="bg-asli-ink text-white/80 text-sm text-center py-2 px-4">{t.guides.onlySpanish}</p>
        ) : null}
        <main className="flex-grow" lang="es">
          <section className="relative overflow-hidden bg-asli-ink text-white py-16 md:py-24">
            <div
              className="pointer-events-none absolute -top-40 -left-32 w-[640px] h-[640px] rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(0,122,123,0.5), transparent 68%)' }}
              aria-hidden="true"
            />
            <div className="relative container-asli max-w-3xl">
              <p className="section-label !text-asli-accent !mb-3">Guías de exportación</p>
              <h1 className="font-display text-white text-[clamp(2.2rem,6vw,4rem)] font-bold leading-[1] tracking-tight mb-5 text-balance">
                Cómo exportar fruta desde Chile, paso a paso
              </h1>
              <p className="text-white/80 text-lg md:text-xl leading-relaxed">
                Guías prácticas escritas desde la operación: temporada, frío, contenedor, documentos y puerto. Con sus
                fuentes, para que sepas de dónde sale cada dato.
              </p>
            </div>
          </section>

          <section className="py-14 md:py-20">
            <div className="container-asli grid grid-cols-1 md:grid-cols-3 gap-5">
              {guias.map((g) => (
                <a
                  key={g.slug}
                  href={`/exportar/${g.slug}`}
                  className="group card-soft overflow-hidden flex flex-col"
                >
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={g.imagenMovil}
                      alt={g.imagenAlt}
                      width={800}
                      height={1000}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-asli group-hover:scale-105"
                    />
                  </div>
                  <div className="p-6 flex flex-col flex-grow">
                    <h2 className="font-display text-xl font-bold text-asli-dark tracking-tight mb-2 group-hover:text-asli-primary transition-colors">
                      {g.h1Antes} {g.h1Acento} {g.h1Despues}
                    </h2>
                    <p className="text-muted-strong text-sm leading-relaxed mb-4 flex-grow">{g.resumen}</p>
                    <span className="text-asli-primary font-bold text-sm">
                      Leer la guía <span aria-hidden="true">→</span>
                    </span>
                  </div>
                </a>
              ))}
              {guiasProximas.map((g) => (
                <div key={g.titulo} className="rounded-[22px] border border-dashed border-asli-dark/20 p-6 flex flex-col justify-end min-h-[18rem]">
                  <p className="section-label !mb-2">Próximamente</p>
                  <h2 className="font-display text-xl font-bold text-asli-dark/70 tracking-tight mb-2">{g.titulo}</h2>
                  <p className="text-muted-strong text-sm leading-relaxed">{g.texto}</p>
                </div>
              ))}
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  )
}
