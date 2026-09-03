import { useEffect, useState } from 'react'
import Header from '../../src/components/Header'
import Footer from '../../src/components/Footer'
import Seo from '../../src/components/Seo'

export default function PilStackingPage() {
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
          throw new Error(data.message || 'No se pudo cargar el stacking')
        }
        setPdfUrl(data.data.pdfUrl)
        setMeta(data.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <>
      <Seo
        title="Stacking PIL"
        description="Visualiza el último PDF de stacking recibido de PIL."
        path="/stacking/pil"
      />
      <div className="min-h-screen flex flex-col bg-asli-light">
        <Header />
        <main className="flex-grow">
          <section className="container-asli py-10 md:py-12">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-asli-dark mb-3">
              Último Stacking PIL
            </h1>
            <p className="text-asli-dark/70 mb-6">
              Documento recibido por correo y sincronizado automáticamente.
            </p>

            {loading && (
              <div className="bg-white border border-asli-dark/10 p-6 rounded-lg shadow-asli-med">
                Cargando documento...
              </div>
            )}

            {!loading && error && (
              <div className="bg-white border border-asli-dark/10 text-asli-dark p-6 rounded-lg shadow-asli-med">
                <p className="font-display text-lg font-bold mb-2">Aún no hay PDF para mostrar</p>
                <p className="text-asli-dark/70">{error}</p>
              </div>
            )}

            {!loading && !error && pdfUrl && (
              <>
                <div className="mb-4 text-sm text-asli-dark/70">
                  {meta?.source?.subject ? `Asunto: ${meta.source.subject}` : 'Asunto no disponible'}
                  {meta?.source?.sentAt ? ` | Fecha correo: ${new Date(meta.source.sentAt).toLocaleString('es-CL')}` : ''}
                </div>
                <div className="bg-white border border-asli-dark/10 rounded-lg shadow-asli-med overflow-hidden">
                  <iframe
                    src={pdfUrl}
                    title="Stacking PIL PDF"
                    className="w-full h-[75vh]"
                  />
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
