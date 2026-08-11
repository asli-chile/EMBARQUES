import Head from 'next/head'
import Header from '../src/components/Header'
import Footer from '../src/components/Footer'
import Tracking from '../src/components/Tracking'

const TrackingPage = () => {
  return (
    <>
      <Head>
        <title>Tracking de Cargas — ASLI</title>
        <meta
          name="description"
          content="Consulta el estado de tus cargas en tiempo real. Accede al seguimiento oficial de tu carga directamente con la naviera."
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
                Tracking de <span className="text-asli-accent">cargas</span>
              </h1>
              <p className="text-white/75 text-lg md:text-xl leading-relaxed">
                Consulta el estado de tu carga en tiempo real, directo con la naviera.
              </p>
            </div>
          </section>

          <Tracking />

          <section className="bg-asli-secondary py-16 md:py-20 text-center text-white">
            <div className="container-asli max-w-2xl">
              <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight mb-4">
                ¿Necesitas ayuda con el seguimiento de tu carga?
              </h2>
              <p className="text-white/70 mb-8 text-lg">
                Contáctanos y te ayudamos con cualquier consulta sobre el estado de tu envío.
              </p>
              <a
                href="https://mail.google.com/mail/?view=cm&to=informaciones@asli.cl&su=Consulta sobre tracking"
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

export default TrackingPage
