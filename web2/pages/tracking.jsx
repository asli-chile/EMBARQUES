import Header from '../src/components/Header'
import Footer from '../src/components/Footer'
import Seo from '../src/components/Seo'
import Tracking from '../src/components/Tracking'
import { useLocale } from '../src/hooks/useLocale'

const TrackingPage = () => {
  const { t } = useLocale()
  const tp = t.trackingPage

  return (
    <>
      <Seo title={tp.seoTitle} description={tp.seoDescription} path="/tracking" />
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
                {tp.titleBefore} <span className="text-asli-accent">{tp.titleAccent}</span>
              </h1>
              <p className="text-white/75 text-lg md:text-xl leading-relaxed">{tp.lead}</p>
            </div>
          </section>

          <div className="container-asli py-10 md:py-14">
            <Tracking />
          </div>

          <section className="bg-asli-secondary py-16 md:py-20 text-center text-white">
            <div className="container-asli max-w-2xl">
              <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight mb-4">
                {tp.helpTitle}
              </h2>
              <p className="text-white/70 mb-8 text-lg">{tp.helpBody}</p>
              <a
                href={`https://mail.google.com/mail/?view=cm&to=informaciones@asli.cl&su=${encodeURIComponent(tp.mailSubject)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary hover-lift"
              >
                {tp.contactCta}
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
