import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Header from '../src/components/Header'
import Footer from '../src/components/Footer'
import Seo, { buildPageJsonLd } from '../src/components/Seo'
import { useLocale } from '../src/hooks/useLocale'
import { getLanding } from '../src/data/landings'
import { localizeLanding } from '../src/lib/i18n/localizeLanding'
import { SITE, whatsappUrl } from '../src/lib/site'
import { trackLead } from '../src/lib/analytics'

const FIELD =
  'w-full rounded-asli border border-asli-dark/15 bg-asli-light px-4 py-3 text-base text-asli-dark placeholder:text-asli-dark/40 focus:outline-none focus:border-asli-primary focus:ring-2 focus:ring-asli-primary/25 transition-colors'
const LABEL = 'block text-sm font-semibold text-asli-dark mb-1.5'

/**
 * Contacto y cotizaciones. Es el destino de todos los "Cotizar" del sitio:
 * antes abrían Gmail web, que en el celular de quien no usa Gmail termina en
 * la pantalla de login de Google. El formulario envía por /api/contact.
 *
 * `?servicio=<slug de landing>` deja el mensaje empezado con ese servicio.
 */
export default function ContactoPage() {
  const { t } = useLocale()
  const c = t.contactPage
  const router = useRouter()
  const [form, setForm] = useState({
    nombre: '',
    empresa: '',
    email: '',
    telefono: '',
    tipo: 'exportacion',
    mensaje: '',
    website: '',
  })
  const [status, setStatus] = useState('idle')
  const [source, setSource] = useState('contacto')

  useEffect(() => {
    if (!router.isReady) return
    const slug = typeof router.query.servicio === 'string' ? router.query.servicio : ''
    const landing = slug ? localizeLanding(getLanding(slug), t) : null
    if (!landing) return
    setSource(landing.slug)
    setForm((prev) => (prev.mensaje ? prev : { ...prev, mensaje: `${c.serviceIntro(landing.h1)}\n\n` }))
  }, [router.isReady, router.query.servicio, t, c])

  const update = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatus('sending')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, origen: source }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) throw new Error(data.error || 'send failed')
      trackLead('form', source)
      setStatus('sent')
    } catch {
      setStatus('error')
    }
  }

  const waHref = whatsappUrl(c.whatsappText)
  const jsonLd = buildPageJsonLd({
    type: 'ContactPage',
    path: '/contacto',
    name: c.seoTitle,
    description: c.seoDescription,
    breadcrumb: [{ name: t.serviceLanding.home, path: '/' }, { name: c.label, path: '/contacto' }],
  })

  return (
    <>
      <Seo title={c.seoTitle} description={c.seoDescription} path="/contacto" jsonLd={jsonLd} />
      <div className="min-h-screen flex flex-col bg-asli-light">
        <Header />
        <main className="flex-grow">
          <section className="relative overflow-hidden bg-asli-ink text-white py-14 md:py-20">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-25"
              style={{ backgroundImage: `url('/img/container.webp')` }}
              aria-hidden="true"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-asli-ink via-asli-ink/85 to-asli-ink/55" />
            <div className="relative z-10 container-asli max-w-3xl">
              <p className="section-label !text-asli-accent !mb-3">{c.label}</p>
              <h1 className="font-display text-white text-[clamp(1.85rem,5vw,3.25rem)] font-bold leading-[1.08] tracking-tight mb-5 text-balance">
                {c.title}
              </h1>
              <p className="text-white/80 text-lg md:text-xl leading-relaxed max-w-2xl">{c.lead}</p>
            </div>
          </section>

          <section className="py-12 md:py-16">
            <div className="container-asli grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
              <div className="lg:col-span-7 card-soft p-6 md:p-8">
                <h2 className="font-display text-asli-dark text-2xl font-bold tracking-tight mb-6">
                  {c.formTitle}
                </h2>

                {status === 'sent' ? (
                  <p role="status" className="text-asli-dark text-lg leading-relaxed">
                    {c.success}
                  </p>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label htmlFor="nombre" className={LABEL}>
                          {c.name}
                        </label>
                        <input
                          id="nombre"
                          name="nombre"
                          required
                          autoComplete="name"
                          value={form.nombre}
                          onChange={update('nombre')}
                          className={FIELD}
                        />
                      </div>
                      <div>
                        <label htmlFor="empresa" className={LABEL}>
                          {c.company} <span className="font-normal text-asli-dark/50">({c.optional})</span>
                        </label>
                        <input
                          id="empresa"
                          name="empresa"
                          autoComplete="organization"
                          value={form.empresa}
                          onChange={update('empresa')}
                          className={FIELD}
                        />
                      </div>
                      <div>
                        <label htmlFor="email" className={LABEL}>
                          {c.email}
                        </label>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          required
                          autoComplete="email"
                          value={form.email}
                          onChange={update('email')}
                          className={FIELD}
                        />
                      </div>
                      <div>
                        <label htmlFor="telefono" className={LABEL}>
                          {c.phone} <span className="font-normal text-asli-dark/50">({c.optional})</span>
                        </label>
                        <input
                          id="telefono"
                          name="telefono"
                          type="tel"
                          autoComplete="tel"
                          value={form.telefono}
                          onChange={update('telefono')}
                          className={FIELD}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="tipo" className={LABEL}>
                        {c.type}
                      </label>
                      <select id="tipo" name="tipo" value={form.tipo} onChange={update('tipo')} className={FIELD}>
                        {Object.entries(c.types).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="mensaje" className={LABEL}>
                        {c.message}
                      </label>
                      <textarea
                        id="mensaje"
                        name="mensaje"
                        required
                        rows={6}
                        placeholder={c.messagePlaceholder}
                        value={form.mensaje}
                        onChange={update('mensaje')}
                        className={FIELD}
                      />
                    </div>

                    {/* Trampa para bots: invisible para personas, /api/contact descarta lo que la llene. */}
                    <div className="hidden" aria-hidden="true">
                      <label htmlFor="website">Website</label>
                      <input
                        id="website"
                        name="website"
                        tabIndex={-1}
                        autoComplete="off"
                        value={form.website}
                        onChange={update('website')}
                      />
                    </div>

                    {status === 'error' ? (
                      <p role="alert" className="text-sm font-semibold text-red-600 dark:text-red-400">
                        {c.error}
                      </p>
                    ) : null}

                    <button
                      type="submit"
                      disabled={status === 'sending'}
                      className="btn-primary w-full sm:w-auto disabled:opacity-60 disabled:cursor-wait"
                    >
                      {status === 'sending' ? c.sending : c.submit}
                    </button>
                  </form>
                )}
              </div>

              <aside className="lg:col-span-5 space-y-6">
                <div className="card-soft p-6">
                  <h2 className="font-display text-lg font-bold text-asli-dark mb-4">{c.directTitle}</h2>
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackLead('whatsapp', source)}
                    className="btn-primary w-full justify-center mb-4"
                  >
                    {c.whatsapp}
                  </a>
                  <a
                    href={`tel:${SITE.phone}`}
                    onClick={() => trackLead('phone', source)}
                    className="block text-asli-primary font-semibold mb-1"
                  >
                    {c.call}: {SITE.phoneDisplay}
                  </a>
                  <a
                    href={`mailto:${SITE.email}`}
                    onClick={() => trackLead('email', source)}
                    className="block text-asli-primary font-semibold"
                  >
                    {SITE.email}
                  </a>
                </div>

                <div className="card-soft p-6">
                  <h2 className="font-display text-lg font-bold text-asli-dark mb-3">{c.addressTitle}</h2>
                  <address className="not-italic text-muted-strong leading-relaxed mb-1">
                    {SITE.address.street}, {SITE.address.city}, Región del {SITE.address.region}, Chile
                  </address>
                  <p className="text-muted-strong mb-4">{c.hours}</p>
                  <a
                    href={SITE.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-asli-primary font-semibold"
                  >
                    {c.openMaps}
                    <span aria-hidden="true">→</span>
                  </a>
                </div>
              </aside>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  )
}
