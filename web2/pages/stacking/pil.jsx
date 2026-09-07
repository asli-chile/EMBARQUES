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
          <section className="container-asli py-10 md:py-12">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-asli-dark mb-3">
              {tp.title}
            </h1>
            <p className="text-asli-dark/70 mb-6">{tp.lead}</p>

            {loading && (
              <div className="bg-asli-surface border border-asli-dark/10 p-6 rounded-lg shadow-asli-med">
                {tp.loading}
              </div>
            )}

            {!loading && error && (
              <div className="bg-asli-surface border border-asli-dark/10 text-asli-dark p-6 rounded-lg shadow-asli-med">
                <p className="font-display text-lg font-bold mb-2">{tp.emptyTitle}</p>
                <p className="text-asli-dark/70">{error}</p>
              </div>
            )}

            {!loading && !error && pdfUrl && (
              <>
                <div className="mb-4 text-sm text-asli-dark/70">
                  {meta?.source?.subject
                    ? `${tp.subject}: ${meta.source.subject}`
                    : tp.subjectUnavailable}
                  {meta?.source?.sentAt
                    ? ` | ${tp.emailDate}: ${new Date(meta.source.sentAt).toLocaleString(dateLocale)}`
                    : ''}
                </div>
                <div className="bg-asli-surface border border-asli-dark/10 rounded-lg shadow-asli-med overflow-hidden">
                  <iframe src={pdfUrl} title="Stacking PIL PDF" className="w-full h-[75vh]" />
                </div>
              </>
            )}
          </section>
        </main>
        <Footer />
      </div>
    </>
  )
}
