import Header from '../src/components/Header'
import Footer from '../src/components/Footer'
import Seo from '../src/components/Seo'
import { useLocale } from '../src/hooks/useLocale'

/** 404 propia: la de Next salía en inglés y sin ningún enlace de vuelta al sitio. */
export default function NotFoundPage() {
  const { t } = useLocale()
  const nf = t.notFound

  return (
    <>
      <Seo title={nf.seoTitle} description={nf.body} path="/404" noindex />
      <div className="min-h-screen flex flex-col bg-asli-light">
        <Header />
        <main className="flex-grow flex items-center">
          <section className="container-asli max-w-2xl py-20 md:py-28 text-center">
            <p className="section-label justify-center !mb-3">404</p>
            <h1 className="font-display text-asli-dark text-[clamp(1.85rem,5vw,3rem)] font-bold tracking-tight mb-4 text-balance">
              {nf.title}
            </h1>
            <p className="text-muted-strong text-lg leading-relaxed mb-8">{nf.body}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a href="/" className="btn-primary justify-center">
                {nf.home}
              </a>
              <a href="/servicios" className="btn-ghost-dark justify-center">
                {nf.services}
              </a>
              <a href="/contacto" className="btn-ghost-dark justify-center">
                {nf.contact}
              </a>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  )
}
