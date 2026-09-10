import Header from '../src/components/Header'
import Footer from '../src/components/Footer'
import Seo from '../src/components/Seo'
import { useLocale } from '../src/hooks/useLocale'

const PresentacionPage = () => {
  const { t } = useLocale()
  const p = t.presentacion

  return (
    <>
      <Seo title={p.seoTitle} description={p.seoDescription} path="/presentacion" />
      <div className="min-h-screen flex flex-col bg-asli-light">
        <Header />
        <main className="flex-grow">
          <section className="relative overflow-hidden bg-asli-ink text-white py-20 md:py-28">
            <div
              className="ken-burns absolute inset-0 bg-cover bg-center opacity-30"
              style={{ backgroundImage: `url('/img/logistica.webp')` }}
              aria-hidden="true"
            />
            <div className="cine-vignette" />
            <div className="absolute inset-0 bg-gradient-to-r from-asli-ink via-asli-ink/80 to-asli-ink/50" />
            <div className="letterbox-bar top" />
            <div className="letterbox-bar bottom" />
            <div className="relative z-10 container-asli max-w-3xl">
              <h1 className="font-display text-[clamp(2.5rem,6vw,4.5rem)] font-bold leading-[1] tracking-tight mb-5 text-balance">
                {p.h1Before} <span className="text-asli-accent">{p.h1Accent}</span>
              </h1>
              <p className="text-white/75 text-lg md:text-xl leading-relaxed">{p.lead}</p>
            </div>
          </section>

          <section className="grain-surface py-16 md:py-20">
            <div className="relative z-[2] container-asli">
              <div className="max-w-5xl mx-auto border border-asli-dark/10 bg-asli-surface shadow-asli-high overflow-hidden">
                <div className="bg-asli-ink text-white px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
                  <h2 className="font-display text-xl md:text-2xl font-bold tracking-tight">
                    {p.panelTitle}
                  </h2>
                  <a
                    href="/presentacion-asli.pdf"
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-asli-surface text-asli-dark font-semibold text-sm hover:bg-asli-primary hover:text-white transition-colors duration-320 ease-asli"
                    style={{ borderRadius: 'var(--radius-md)' }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.75"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    {p.downloadPdf}
                  </a>
                </div>
                <div className="w-full bg-asli-light" style={{ minHeight: '800px' }}>
                  <iframe
                    src="/presentacion-asli.pdf#toolbar=1&navpanes=1&scrollbar=1"
                    className="w-full border-0"
                    style={{ minHeight: '800px', height: 'calc(100vh - 300px)' }}
                    title={p.iframeTitle}
                    allow="fullscreen"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="bg-asli-secondary py-16 md:py-20 text-center text-white">
            <div className="container-asli max-w-2xl">
              <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight mb-4">
                {p.ctaTitle}
              </h2>
              <p className="text-white/70 mb-8 text-lg">{p.ctaBody}</p>
              <a
                href={`https://mail.google.com/mail/?view=cm&to=informaciones@asli.cl&su=${encodeURIComponent(p.mailSubject)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary hover-lift"
              >
                {p.ctaMail}
              </a>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  )
}

export default PresentacionPage
