import Header from './Header'
import Footer from './Footer'
import Seo, { buildServicePageJsonLd } from './Seo'
import { getRelatedLandings } from '../data/landings'
import { SITE } from '../lib/site'
import { useLocale } from '../hooks/useLocale'
import { localizeLanding, localizeLandings } from '../lib/i18n/localizeLanding'
import { htmlLang } from '../lib/i18n/locale'

const MAIL_COTIZAR =
  'https://mail.google.com/mail/?view=cm&fs=1&to=informaciones@asli.cl&su='

/**
 * Plantilla SEO para landings de servicio (H1, secciones, FAQ, Schema, enlaces internos).
 */
export default function ServiceLanding({ landing: landingProp }) {
  const { t, locale } = useLocale()
  const sl = t.serviceLanding
  const landing = localizeLanding(landingProp, t)
  const related = localizeLandings(getRelatedLandings(landing.slug), t)
  const jsonLd = buildServicePageJsonLd({
    path: `/${landing.slug}`,
    name: landing.h1,
    description: landing.description,
    faqs: landing.faqs,
    serviceType: landing.serviceType,
    breadcrumbHome: sl.home,
    breadcrumbServices: sl.services,
  })
  const mailHref = `${MAIL_COTIZAR}${encodeURIComponent(`${sl.mailSubjectPrefix} ${landing.h1}`)}`
  const hours =
    typeof sl.officeHours === 'function' ? sl.officeHours(SITE.address.street) : sl.officeHours

  return (
    <>
      <Seo
        title={landing.title}
        description={landing.description}
        path={`/${landing.slug}`}
        jsonLd={{
          ...jsonLd,
          '@graph': jsonLd['@graph']?.map((node) =>
            node['@type'] === 'Service' ? { ...node, inLanguage: htmlLang(locale) } : node
          ),
        }}
      />

      <div className="min-h-screen flex flex-col bg-asli-light">
        <Header />
        <main className="flex-grow">
          <section className="relative overflow-hidden bg-asli-ink text-white py-16 md:py-24">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-25"
              style={{ backgroundImage: `url('${landing.image}')` }}
              aria-hidden="true"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-asli-ink via-asli-ink/85 to-asli-ink/55" />
            <div className="relative z-10 container-asli max-w-3xl">
              <nav className="text-sm text-white/60 mb-5" aria-label={sl.breadcrumbAria}>
                <a href="/" className="hover:text-white transition-colors">
                  {sl.home}
                </a>
                <span className="mx-2" aria-hidden="true">
                  /
                </span>
                <a href="/servicios" className="hover:text-white transition-colors">
                  {sl.services}
                </a>
                <span className="mx-2" aria-hidden="true">
                  /
                </span>
                <span className="text-white/90">{landing.label}</span>
              </nav>
              <p className="section-label !text-asli-accent !mb-3">{landing.label}</p>
              <h1 className="font-display text-[clamp(1.85rem,5vw,3.25rem)] font-bold leading-[1.08] tracking-tight mb-5 text-balance">
                {landing.h1}
              </h1>
              <p className="text-white/80 text-lg md:text-xl leading-relaxed max-w-2xl">
                {landing.lead}
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <a
                  href={mailHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary !py-3 !px-6 justify-center"
                >
                  {sl.quoteService}
                </a>
                <a
                  href="/#contacto"
                  className="btn-ghost-dark !py-3 !px-6 !text-white !border-white/30 hover:!bg-white hover:!text-asli-ink justify-center"
                >
                  {sl.talkTeam}
                </a>
              </div>
            </div>
          </section>

          <section className="py-14 md:py-20">
            <div className="container-asli grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
              <div className="lg:col-span-7 space-y-10">
                {landing.sections.map((section) => (
                  <article key={section.heading}>
                    <h2 className="font-display text-asli-dark text-2xl md:text-3xl font-bold tracking-tight mb-4">
                      {section.heading}
                    </h2>
                    {section.body.map((paragraph) => (
                      <p
                        key={paragraph.slice(0, 48)}
                        className="text-muted-strong text-base md:text-lg leading-relaxed mb-4"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </article>
                ))}
              </div>

              <aside className="lg:col-span-5">
                <div className="card-soft overflow-hidden mb-6">
                  <img
                    src={landing.image}
                    alt={landing.imageAlt}
                    width={800}
                    height={480}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-52 object-cover"
                  />
                  <div className="p-6">
                    <h2 className="font-display text-lg font-bold text-asli-dark mb-2">
                      {sl.officeTitle}
                    </h2>
                    <p className="text-muted-strong text-sm leading-relaxed mb-4">{hours}</p>
                    <a
                      href={`tel:${SITE.phone}`}
                      className="block text-asli-primary font-semibold text-sm mb-1"
                    >
                      {SITE.phoneDisplay}
                    </a>
                    <a
                      href={`mailto:${SITE.email}`}
                      className="block text-asli-primary font-semibold text-sm"
                    >
                      {SITE.email}
                    </a>
                  </div>
                </div>

                {related.length > 0 ? (
                  <div className="card-soft p-6">
                    <h2 className="font-display text-lg font-bold text-asli-dark mb-4">
                      {sl.relatedTitle}
                    </h2>
                    <ul className="space-y-3">
                      {related.map((item) => (
                        <li key={item.slug}>
                          <a
                            href={`/${item.slug}`}
                            className="text-asli-primary font-semibold text-sm hover:underline"
                          >
                            {item.h1}
                          </a>
                        </li>
                      ))}
                      <li>
                        <a
                          href="/servicios"
                          className="text-asli-dark/70 font-semibold text-sm hover:text-asli-primary"
                        >
                          {sl.viewAllServices}
                        </a>
                      </li>
                      <li>
                        <a
                          href="/tracking"
                          className="text-asli-dark/70 font-semibold text-sm hover:text-asli-primary"
                        >
                          {sl.trackingLink}
                        </a>
                      </li>
                      <li>
                        <a
                          href="/stacking"
                          className="text-asli-dark/70 font-semibold text-sm hover:text-asli-primary"
                        >
                          {sl.stackingLink}
                        </a>
                      </li>
                    </ul>
                  </div>
                ) : null}
              </aside>
            </div>
          </section>

          {landing.faqs?.length ? (
            <section className="bg-asli-surface py-14 md:py-20 border-y border-asli-dark/5">
              <div className="container-asli max-w-3xl">
                <h2 className="font-display text-asli-dark text-2xl md:text-3xl font-bold tracking-tight mb-8">
                  {sl.faqTitle}
                </h2>
                <div className="space-y-6">
                  {landing.faqs.map((faq) => (
                    <details
                      key={faq.question}
                      className="group border-b border-asli-dark/10 pb-5"
                    >
                      <summary className="font-display text-lg font-semibold text-asli-dark cursor-pointer list-none flex items-start justify-between gap-4">
                        <span>{faq.question}</span>
                        <span
                          className="text-asli-primary shrink-0 transition-transform group-open:rotate-45"
                          aria-hidden="true"
                        >
                          +
                        </span>
                      </summary>
                      <p className="text-muted-strong mt-3 leading-relaxed">{faq.answer}</p>
                    </details>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          <section className="py-14 md:py-20 text-center">
            <div className="container-asli max-w-2xl">
              <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight mb-4 text-asli-dark">
                {sl.finalCtaTitle}
              </h2>
              <p className="text-muted-strong mb-8 text-lg">{sl.finalCtaBody}</p>
              <a
                href={mailHref}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                {sl.finalCtaButton}
              </a>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  )
}
