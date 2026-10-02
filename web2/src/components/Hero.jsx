/**
 * Hero — fachada ASLI como plano visual; tipografía compacta en mobile
 */
import { goToHomeSection } from '../lib/scrollToHash'
import { SHOW_COTIZADOR } from '../lib/features'
import { useLocale } from '../hooks/useLocale'
import { DolarBadge } from './DolarBadge'

/*
 * La entrada del hero es animación CSS (.hero-enter en index.css), no estado
 * de React. Antes el H1 salía del servidor con opacity:0 y recién aparecía
 * después de hidratar: el texto más importante de la página dependía del JS y
 * atrasaba el LCP en móvil. Con CSS arranca en el primer pintado.
 */
const Hero = () => {
  const { t } = useLocale()

  const handleServiciosClick = () => {
    goToHomeSection('servicios')
  }

  const handleCotizarClick = () => {
    goToHomeSection('cotizar')
  }

  return (
    <section
      id="inicio"
      className="section-fit relative overflow-hidden bg-asli-light !py-3 sm:!py-8 lg:!py-[unset]"
    >
      <DolarBadge className="hero-dolar" />

      <div
        className="pointer-events-none absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full opacity-25"
        style={{
          background: 'radial-gradient(circle, rgba(0,122,123,0.28), transparent 70%)',
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-32 -left-20 w-[380px] h-[380px] rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(102,153,0,0.22), transparent 70%)',
        }}
      />

      <div className="relative z-10 w-full pt-9 sm:pt-10 lg:pt-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-10 lg:items-center lg:container-asli">
          <div className="container-asli lg:col-span-5 lg:px-0 order-1">
            <p className="section-label !mb-1.5 hero-enter">
              {t.hero.label}
            </p>

            <h1
              className="font-display text-asli-dark text-[clamp(1.9rem,7.5vw,3.2rem)] font-bold leading-[1.08] tracking-tight text-balance mb-2.5 sm:mb-3 hero-enter"
            >
              {t.hero.titleBefore}{' '}
              <span className="text-asli-primary">{t.hero.titleAccent}</span>
            </h1>

            <p
              className="text-muted-strong text-[0.92rem] sm:text-base md:text-lg max-w-xl mb-3.5 sm:mb-5 leading-relaxed hero-enter hero-enter-delay-1"
            >
              <span className="sm:hidden">{t.hero.bodyMobile}</span>
              <span className="hidden sm:inline">{t.hero.bodyDesktop}</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-2.5 mb-4 lg:mb-0 hero-enter hero-enter-delay-3">
              <button
                type="button"
                onClick={handleServiciosClick}
                className="btn-primary !py-3 !px-4 sm:!px-7 !text-[0.9rem] w-full sm:w-auto justify-center"
              >
                {t.hero.ctaServices}
                <span aria-hidden="true">→</span>
              </button>
              {SHOW_COTIZADOR ? (
                <button
                  type="button"
                  onClick={handleCotizarClick}
                  className="btn-ghost-dark !py-3 !px-4 sm:!px-7 !text-[0.9rem] w-full sm:w-auto justify-center"
                >
                  {t.hero.ctaQuote}
                </button>
              ) : (
                <a
                  href="/contacto"
                  className="btn-ghost-dark !py-3 !px-4 sm:!px-7 !text-[0.9rem] w-full sm:w-auto justify-center"
                >
                  {t.hero.ctaQuote}
                </a>
              )}
            </div>
          </div>

          <div className="lg:col-span-7 order-2 hero-enter hero-enter-delay-2">
            <div
              className="relative overflow-hidden w-full
                h-[min(46vh,320px)] sm:h-[min(48vh,400px)] lg:h-[min(62vh,520px)]
                sm:mx-auto sm:max-w-[calc(100%-3rem)] lg:max-w-none lg:mx-0
                rounded-none sm:rounded-[20px]
                border-y sm:border border-asli-dark/5 shadow-asli-high"
            >
              <img
                src="/img/oficina.webp"
                alt={t.hero.imageAlt}
                width={1252}
                height={712}
                fetchPriority="high"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover object-[center_32%] sm:object-[center_28%] lg:object-[center_30%]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-asli-ink/60 via-asli-ink/10 to-transparent" />
              <div className="absolute bottom-3.5 left-4 right-4 sm:bottom-5 sm:left-5 sm:right-5">
                <p className="text-white font-display font-semibold text-base sm:text-lg tracking-tight">
                  {t.hero.imageCaption}
                </p>
                <p className="text-white/80 text-xs sm:text-sm mt-0.5">
                  {t.hero.imageSub}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero
