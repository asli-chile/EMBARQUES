import { useEffect, useState } from 'react'
import Header from '../../src/components/Header'
import Footer from '../../src/components/Footer'
import Seo from '../../src/components/Seo'
import { useLocale } from '../../src/hooks/useLocale'

export default function PilStackingPage() {
  const { t, dateLocale } = useLocale()
  const tp = t.stackingPil
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pdfUrl, setPdfUrl] = useState('')
  const [meta, setMeta] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/stacking/latest')
        const data = await res.json()
        if (!res.ok || !data.ok) {
          throw new Error(data.message || tp.loadError)
        }
        setPdfUrl(data.data.pdfUrl)
        setMeta(data.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : tp.unknownError)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tp.loadError, tp.unknownError])

  return (
    <>
      <Seo title={tp.seoTitle} description={tp.seoDescription} path="/stacking/pil" noindex />
      <div className="min-h-screen flex flex-col bg-asli-light">
        <Header />
        <main className="flex-grow">
          <section className="relative overflow-hidden bg-asli-ink text-white py-14 md:py-16">
            <div
              className="ken-burns absolute inset-0 bg-cover bg-center opacity-30"
              style={{ backgroundImage: `url('/img/docs.webp')` }}
              aria-hidden="true"
            />
            <div className="cine-vignette" />
            <div className="absolute inset-0 bg-gradient-to-r from-asli-ink via-asli-ink/85 to-asli-ink/50" />
            <div className="relative z-10 container-asli max-w-3xl">
              <p className="section-label text-asli-accent/90 !mb-3">{tp.label}</p>
              <h1 className="font-display text-[clamp(2rem,4.5vw,3.25rem)] font-bold leading-[1.05] tracking-tight mb-4 text-balance">
                {tp.title}
              </h1>
              <p className="text-white/75 text-base md:text-lg leading-relaxed mb-6">{tp.lead}</p>
              <a href="/stacking" className="inline-flex items-center gap-2 text-sm font-semibold text-asli-accent hover:text-white transition-colors duration-320">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path
                    d="M13 8H3M7 4L3 8l4 4"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {tp.backLabel}
              </a>
            </div>
          </section>

          <section className="grain-surface py-10 md:py-14">
            <div className="container-asli">
              {loading && (
                <div className="card-soft p-6 md:p-8 text-muted-strong">{tp.loading}</div>
              )}

              {!loading && error && (
                <div className="card-soft p-6 md:p-8">
                  <p className="font-display text-lg font-bold text-asli-dark mb-2">{tp.emptyTitle}</p>
                  <p className="text-muted">{error}</p>
                </div>
              )}

              {!loading && !error && pdfUrl && (
                <>
                  <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-muted">
                    <span>
                      {meta?.source?.subject
                        ? `${tp.subject}: ${meta.source.subject}`
                        : tp.subjectUnavailable}
                    </span>
                    {meta?.source?.sentAt ? (
                      <span>
                        {tp.emailDate}: {new Date(meta.source.sentAt).toLocaleString(dateLocale)}
                      </span>
                    ) : null}
                  </div>
                  <div
                    className="overflow-hidden border border-asli-dark/10 bg-asli-surface shadow-asli-med"
                    style={{ borderRadius: 'var(--radius-lg)' }}
                  >
                    <iframe src={pdfUrl} title="Stacking PIL PDF" className="w-full h-[75vh] block" />
                  </div>
                </>
              )}
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  )
}
