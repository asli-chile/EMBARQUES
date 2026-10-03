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
const HINT = 'font-normal text-asli-dark/50'

const CARGO_TYPES = ['reefer', 'dry', 'lcl', 'aerea', 'nose']
const VOLUME_UNITS = ['contenedores', 'm3', 'kg']
/** Unidad de volumen que corresponde a cada tipo de carga. */
const UNIT_FOR_CARGO = { reefer: 'contenedores', dry: 'contenedores', lcl: 'm3', aerea: 'kg' }
const INCOTERMS = ['EXW', 'FCA', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP']

/*
 * Semanas ISO (lunes a domingo), como las que usan navieras y packings.
 * Las semanas se cuentan en UTC para que el huso horario no corra el lunes.
 */
function isoWeekOf(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return { year: d.getUTCFullYear(), week: Math.ceil(((d - yearStart) / 86400000 + 1) / 7) }
}

function weeksInIsoYear(year) {
  // El 28 de diciembre siempre cae en la última semana ISO del año.
  return isoWeekOf(new Date(year, 11, 28)).week
}

function isoWeekMonday(year, week) {
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const monday = new Date(jan4)
  monday.setUTCDate(jan4.getUTCDate() - (jan4.getUTCDay() || 7) + 1 + (week - 1) * 7)
  return monday
}

/**
 * Semanas que se pueden pedir: desde la siguiente a la actual. La semana en
 * curso nunca se ofrece, porque con los tiempos de coordinación (booking,
 * stacking, transporte) ya no se alcanza a embarcar en ella.
 */
function availableWeeks(year, now) {
  if (!now || year < now.year) return []
  const first = year === now.year ? now.week + 1 : 1
  const last = weeksInIsoYear(year)
  return Array.from({ length: Math.max(last - first + 1, 0) }, (_, i) => first + i)
}

/*
 * Lo que trae cada landing al llegar con ?servicio=<slug>. El resto del
 * formulario queda en blanco.
 */
const SERVICE_DEFAULTS = {
  'exportacion-fruta-fresca': { tipo: 'exportacion', carga: 'reefer' },
  'importacion-mercancias-chile': { tipo: 'importacion' },
  'transporte-aereo-carga': { carga: 'aerea' },
}

/**
 * Contacto y cotizaciones. Es el destino de todos los "Cotizar" del sitio y
 * envía por /api/contact.
 *
 * Pide lo mismo que el equipo comercial pide para cotizar: producto, destino,
 * tipo de carga, volumen, semana de embarque y tarifa objetivo. Así la
 * solicitud llega lista para cotizar y no como un "hola, quiero cotizar".
 */
export default function ContactoPage() {
  const { t, dateLocale } = useLocale()
  const c = t.contactPage
  const router = useRouter()
  const [form, setForm] = useState({
    tipo: 'exportacion',
    producto: '',
    origen: '',
    destino: '',
    carga: '',
    volumen: '',
    unidad: 'contenedores',
    semana: '',
    anio: '',
    incoterm: '',
    tarifa: '',
    mensaje: '',
    nombre: '',
    empresa: '',
    email: '',
    telefono: '',
    website: '',
  })
  const [status, setStatus] = useState('idle')
  const [source, setSource] = useState('contacto')
  const [now, setNow] = useState(null)

  // La semana actual se calcula en el navegador: la página es estática y en el
  // servidor quedaría congelada en la fecha del build.
  useEffect(() => {
    const current = isoWeekOf(new Date())
    setNow(current)
    // Si ya no quedan semanas este año (última semana ISO), parte en el siguiente.
    const firstYear = availableWeeks(current.year, current).length ? current.year : current.year + 1
    setForm((prev) => (prev.anio ? prev : { ...prev, anio: String(firstYear) }))
  }, [])

  const years = now
    ? [now.year, now.year + 1].filter((year) => availableWeeks(year, now).length > 0)
    : []
  const weeks = availableWeeks(Number(form.anio), now)
  const dayMonth = new Intl.DateTimeFormat(dateLocale, { day: 'numeric', month: 'short', timeZone: 'UTC' })
  const weekRange = (week) => {
    const monday = isoWeekMonday(Number(form.anio), week)
    const sunday = new Date(monday)
    sunday.setUTCDate(monday.getUTCDate() + 6)
    return `${dayMonth.format(monday)} – ${dayMonth.format(sunday)}`
  }

  const updateYear = (event) => {
    const anio = event.target.value
    // Al cambiar de año, la semana elegida puede no existir o ya haber pasado.
    setForm((prev) => ({
      ...prev,
      anio,
      semana: availableWeeks(Number(anio), now).includes(Number(prev.semana)) ? prev.semana : '',
    }))
  }

  // Desde una guía: ?producto=Cerezas&carga=reefer&desde=exportar/cerezas
  useEffect(() => {
    if (!router.isReady) return
    const producto = typeof router.query.producto === 'string' ? router.query.producto.slice(0, 80) : ''
    const carga = typeof router.query.carga === 'string' && CARGO_TYPES.includes(router.query.carga) ? router.query.carga : ''
    if (!producto && !carga) return
    const desde = typeof router.query.desde === 'string' ? router.query.desde : ''
    if (/^[a-z0-9/-]{1,60}$/.test(desde)) setSource(desde)
    setForm((prev) => ({
      ...prev,
      producto: prev.producto || producto,
      ...(carga ? { carga, unidad: UNIT_FOR_CARGO[carga] || prev.unidad } : {}),
    }))
  }, [router.isReady, router.query.producto, router.query.carga, router.query.desde])

  useEffect(() => {
    if (!router.isReady) return
    const slug = typeof router.query.servicio === 'string' ? router.query.servicio : ''
    const landing = slug ? localizeLanding(getLanding(slug), t) : null
    if (!landing) return
    setSource(landing.slug)
    const defaults = SERVICE_DEFAULTS[landing.slug] || {}
    setForm((prev) => ({
      ...prev,
      ...defaults,
      unidad: UNIT_FOR_CARGO[defaults.carga] || prev.unidad,
      mensaje: prev.mensaje || c.serviceIntro(landing.h1),
    }))
  }, [router.isReady, router.query.servicio, t, c])

  const update = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))

  const updateCargo = (event) => {
    const carga = event.target.value
    setForm((prev) => ({ ...prev, carga, unidad: UNIT_FOR_CARGO[carga] || prev.unidad }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatus('sending')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, pagina: source }),
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
                {status === 'sent' ? (
                  <p role="status" className="text-asli-dark text-lg leading-relaxed">
                    {c.success}
                  </p>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-8">
                    <fieldset className="space-y-5">
                      <legend className="font-display text-asli-dark text-2xl font-bold tracking-tight mb-5">
                        {c.cargoTitle}
                      </legend>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
                          <label htmlFor="producto" className={LABEL}>
                            {c.product}
                          </label>
                          <input
                            id="producto"
                            name="producto"
                            required
                            placeholder={c.productPlaceholder}
                            value={form.producto}
                            onChange={update('producto')}
                            className={FIELD}
                          />
                        </div>
                        <div>
                          <label htmlFor="origen" className={LABEL}>
                            {c.origin} <span className={HINT}>({c.optional})</span>
                          </label>
                          <input
                            id="origen"
                            name="origen"
                            placeholder={c.originPlaceholder}
                            value={form.origen}
                            onChange={update('origen')}
                            className={FIELD}
                          />
                        </div>
                        <div>
                          <label htmlFor="destino" className={LABEL}>
                            {c.destination}
                          </label>
                          <input
                            id="destino"
                            name="destino"
                            required
                            placeholder={c.destinationPlaceholder}
                            value={form.destino}
                            onChange={update('destino')}
                            className={FIELD}
                          />
                        </div>
                      </div>

                      <div role="radiogroup" aria-labelledby="carga-label">
                        <p id="carga-label" className={LABEL}>
                          {c.cargoType}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {CARGO_TYPES.map((value) => (
                            <label
                              key={value}
                              className={`flex items-center gap-3 rounded-asli border px-4 py-3 cursor-pointer transition-colors ${
                                form.carga === value
                                  ? 'border-asli-primary bg-asli-primary/5'
                                  : 'border-asli-dark/15 hover:border-asli-primary/50'
                              }`}
                            >
                              <input
                                type="radio"
                                name="carga"
                                value={value}
                                checked={form.carga === value}
                                onChange={updateCargo}
                                className="accent-[rgb(var(--asli-primary-rgb))]"
                              />
                              <span className="text-sm text-asli-dark">{c.cargoTypes[value]}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label htmlFor="volumen" className={LABEL}>
                            {c.volume}
                          </label>
                          <div className="flex gap-2">
                            <input
                              id="volumen"
                              name="volumen"
                              inputMode="decimal"
                              placeholder={c.volumePlaceholder}
                              value={form.volumen}
                              onChange={update('volumen')}
                              className={`${FIELD} min-w-0`}
                            />
                            <select
                              aria-label={c.volumeUnitAria}
                              name="unidad"
                              value={form.unidad}
                              onChange={update('unidad')}
                              className={`${FIELD} !w-auto shrink-0`}
                            >
                              {VOLUME_UNITS.map((unit) => (
                                <option key={unit} value={unit}>
                                  {c.volumeUnits[unit]}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label htmlFor="semana" className={LABEL}>
                            {c.week}
                          </label>
                          <div className="flex gap-2">
                            <select
                              id="semana"
                              name="semana"
                              value={form.semana}
                              onChange={update('semana')}
                              className={`${FIELD} min-w-0`}
                            >
                              <option value="">{c.weekPlaceholder}</option>
                              {weeks.map((week) => (
                                <option key={week} value={week}>
                                  {c.weekOption(week, weekRange(week))}
                                </option>
                              ))}
                            </select>
                            <select
                              aria-label={c.yearAria}
                              name="anio"
                              value={form.anio}
                              onChange={updateYear}
                              className={`${FIELD} !w-auto shrink-0`}
                            >
                              {years.map((year) => (
                                <option key={year} value={year}>
                                  {year}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label htmlFor="incoterm" className={LABEL}>
                            {c.incoterm} <span className={HINT}>({c.optional})</span>
                          </label>
                          <select
                            id="incoterm"
                            name="incoterm"
                            value={form.incoterm}
                            onChange={update('incoterm')}
                            className={FIELD}
                          >
                            <option value="">{c.incotermUnknown}</option>
                            {INCOTERMS.map((term) => (
                              <option key={term} value={term}>
                                {term}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label htmlFor="tarifa" className={LABEL}>
                            {c.targetRate} <span className={HINT}>({c.optional})</span>
                          </label>
                          <input
                            id="tarifa"
                            name="tarifa"
                            placeholder={c.targetRatePlaceholder}
                            aria-describedby="tarifa-hint"
                            value={form.tarifa}
                            onChange={update('tarifa')}
                            className={FIELD}
                          />
                          <p id="tarifa-hint" className="text-xs text-asli-dark/60 mt-1.5">
                            {c.targetRateHint}
                          </p>
                        </div>
                      </div>

                      <div>
                        <label htmlFor="mensaje" className={LABEL}>
                          {c.message} <span className={HINT}>({c.optional})</span>
                        </label>
                        <textarea
                          id="mensaje"
                          name="mensaje"
                          rows={4}
                          placeholder={c.messagePlaceholder}
                          value={form.mensaje}
                          onChange={update('mensaje')}
                          className={FIELD}
                        />
                      </div>
                    </fieldset>

                    <fieldset className="space-y-5">
                      <legend className="font-display text-asli-dark text-2xl font-bold tracking-tight mb-5">
                        {c.contactTitle}
                      </legend>
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
                            {c.company} <span className={HINT}>({c.optional})</span>
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
                            {c.phone} <span className={HINT}>({c.optional})</span>
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
                    </fieldset>

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
                  <h2 className="font-display text-lg font-bold text-asli-dark mb-2">{c.directTitle}</h2>
                  <p className="text-muted-strong text-sm leading-relaxed mb-4">{c.directBody}</p>
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
