import Header from '../src/components/Header'
import Footer from '../src/components/Footer'
import Seo from '../src/components/Seo'
import Stacking from '../src/components/Stacking'
import { useLocale } from '../src/hooks/useLocale'

const StackingPage = () => {
  const { t } = useLocale()
  const tp = t.stackingPage

  return (
    <>
      <Seo title={tp.seoTitle} description={tp.seoDescription} path="/stacking" />
      <div className="min-h-screen flex flex-col bg-asli-light">
        <Header />
        <main className="flex-grow flex flex-col">
          <section className="relative flex-grow grid lg:grid-cols-2 min-h-0">
            <div className="relative overflow-hidden bg-asli-ink text-white flex items-center">
              <div
                className="ken-burns absolute inset-0 bg-cover bg-center opacity-30"
                style={{ backgroundImage: `url('/img/logistica.webp')` }}
                aria-hidden="true"
              />
              <div className="cine-vignette" />
              <div className="absolute inset-0 bg-gradient-to-br from-asli-ink via-asli-ink/90 to-asli-ink/70" />
              <div className="letterbox-bar top hidden lg:block" />
              <div className="letterbox-bar bottom hidden lg:block" />
              <div className="relative z-10 container-asli py-10 sm:py-12 lg:py-16 lg:pr-8 xl:pr-12">
                <p className="section-label text-asli-accent/90 !mb-3">{tp.label}</p>
                <h1 className="font-display text-[clamp(2rem,5vw,3.25rem)] font-bold leading-[1.05] tracking-tight mb-4 text-balance">
                  {tp.titleBefore} <span className="text-asli-accent">{tp.titleAccent}</span>
                </h1>
                <p className="text-white/75 text-base md:text-lg leading-relaxed max-w-md">{tp.lead}</p>
              </div>
            </div>

            <div className="grain-surface bg-asli-light flex items-center">
              <div className="container-asli w-full py-10 sm:py-12 lg:py-16 lg:pl-8 xl:pl-12">
                <div className="max-w-md mx-auto lg:mx-0 lg:max-w-md xl:max-w-lg w-full">
                  <Stacking />
                </div>
              </div>
            </div>
          </section>

          <section className="bg-asli-secondary py-10 md:py-12 text-center text-white shrink-0">
            <div className="container-asli max-w-2xl">
              <h2 className="font-display text-xl md:text-2xl font-bold tracking-tight mb-3">
                {tp.helpTitle}
              </h2>
              <p className="text-white/70 mb-6 text-base md:text-lg">{tp.helpBody}</p>
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

export default StackingPage
