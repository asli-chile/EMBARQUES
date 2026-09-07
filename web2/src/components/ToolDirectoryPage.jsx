import Header from './Header'
import Footer from './Footer'
import Seo from './Seo'

/**
 * Cáscara compartida para herramientas de directorio (Tracking / Stacking).
 * Hero cinematográfico corto + zona de contenido + CTA de ayuda.
 */
export default function ToolDirectoryPage({
  seoTitle,
  seoDescription,
  seoPath,
  heroImage,
  label,
  titleBefore,
  titleAccent,
  lead,
  helpTitle,
  helpBody,
  contactCta,
  mailSubject,
  children,
}) {
  return (
    <>
      <Seo title={seoTitle} description={seoDescription} path={seoPath} />
      <div className="min-h-screen flex flex-col bg-asli-light">
        <Header />
        <main className="flex-grow">
          <section className="relative overflow-hidden bg-asli-ink text-white py-16 md:py-20 lg:py-24">
            <div
              className="ken-burns absolute inset-0 bg-cover bg-center opacity-35"
              style={{ backgroundImage: `url('${heroImage}')` }}
              aria-hidden="true"
            />
            <div className="cine-vignette" />
            <div className="absolute inset-0 bg-gradient-to-r from-asli-ink via-asli-ink/85 to-asli-ink/45" />
            <div className="letterbox-bar top" />
            <div className="letterbox-bar bottom" />
            <div className="relative z-10 container-asli max-w-3xl">
              {label ? <p className="section-label text-asli-accent/90 !mb-3">{label}</p> : null}
              <h1 className="font-display text-[clamp(2.25rem,5.5vw,4rem)] font-bold leading-[1.02] tracking-tight mb-5 text-balance">
                {titleBefore} <span className="text-asli-accent">{titleAccent}</span>
              </h1>
              <p className="text-white/75 text-lg md:text-xl leading-relaxed max-w-2xl">{lead}</p>
            </div>
          </section>

          <section className="grain-surface py-12 md:py-16 lg:py-20">
            <div className="container-asli">{children}</div>
          </section>

          <section className="bg-asli-secondary py-14 md:py-16 text-center text-white">
            <div className="container-asli max-w-2xl">
              <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight mb-4">
                {helpTitle}
              </h2>
              <p className="text-white/70 mb-8 text-lg leading-relaxed">{helpBody}</p>
              <a
                href={`https://mail.google.com/mail/?view=cm&to=informaciones@asli.cl&su=${encodeURIComponent(mailSubject)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary hover-lift"
              >
                {contactCta}
              </a>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  )
}
