import Head from 'next/head'
import Header from '../src/components/Header'
import Footer from '../src/components/Footer'

const PresentacionPage = () => {
  return (
    <>
      <Head>
        <title>Presentación — ASLI</title>
        <meta
          name="description"
          content="Conoce más sobre ASLI — Asesorías y Servicios Logísticos Integrales. Descarga nuestra presentación corporativa."
        />
        <link rel="icon" type="image/png" href="/img/logoblanco.png" />
        <link rel="apple-touch-icon" href="/img/logoblanco.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <div className="min-h-screen flex flex-col bg-asli-light">
        <Header />
        <main className="flex-grow">
          <section className="relative overflow-hidden bg-asli-dark text-white py-20 md:py-28">
            <div
              className="ken-burns absolute inset-0 bg-cover bg-center opacity-30"
              style={{ backgroundImage: `url('/img/logistica.webp')` }}
              aria-hidden="true"
            />
            <div className="cine-vignette" />
            <div className="absolute inset-0 bg-gradient-to-r from-asli-dark via-asli-dark/80 to-asli-dark/50" />
            <div className="letterbox-bar top" />
            <div className="letterbox-bar bottom" />
            <div className="relative z-10 container-asli max-w-3xl">
              <h1 className="font-display text-[clamp(2.5rem,6vw,4.5rem)] font-bold leading-[1] tracking-tight mb-5 text-balance">
                Presentación de la <span className="text-asli-accent">empresa</span>
              </h1>
              <p className="text-white/75 text-lg md:text-xl leading-relaxed">
                Conoce más sobre ASLI y nuestros servicios.
              </p>
            </div>
          </section>

          <section className="grain-surface py-16 md:py-20">
            <div className="relative z-[2] container-asli">
              <div className="max-w-5xl mx-auto border border-asli-dark/10 bg-white shadow-asli-high overflow-hidden">
                <div className="bg-asli-dark text-white px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
                  <h2 className="font-display text-xl md:text-2xl font-bold tracking-tight">
                    Presentación ASLI
                  </h2>
                  <a
                    href="/presentacion-asli.pdf"
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-asli-dark font-semibold text-sm hover:bg-asli-primary hover:text-white transition-colors duration-320 ease-asli"
                    style={{ borderRadius: 'var(--radius-md)' }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Descargar PDF
                  </a>
                </div>
                <div className="w-full bg-asli-light" style={{ minHeight: '800px' }}>
                  <iframe
                    src="/presentacion-asli.pdf#toolbar=1&navpanes=1&scrollbar=1"
                    className="w-full border-0"
                    style={{ minHeight: '800px', height: 'calc(100vh - 300px)' }}
                    title="Presentación ASLI"
                    allow="fullscreen"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="bg-asli-secondary py-16 md:py-20 text-center text-white">
            <div className="container-asli max-w-2xl">
              <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight mb-4">
                ¿Tienes preguntas sobre nuestros servicios?
              </h2>
              <p className="text-white/70 mb-8 text-lg">
                Contáctanos y te ayudamos con cualquier consulta.
              </p>
              <a
                href="https://mail.google.com/mail/?view=cm&to=informaciones@asli.cl&su=Consulta sobre servicios"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary hover-lift"
              >
                Contactar
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
