import { useReveal } from '../hooks/useReveal'
import { useLocale } from '../hooks/useLocale'

const MAPS_URL = 'https://maps.app.goo.gl/cGrni677vZDk5pp26'

const Ubicacion = () => {
  const { t } = useLocale()
  const info = useReveal('left')
  const map = useReveal('right', 280)

  const handleGoogleMaps = () => {
    window.open(MAPS_URL, '_blank')
  }

  const handleWaze = () => {
    window.open(
      'https://www.waze.com/en/live-map/directions/asli-logistica-y-comercio-exterior-ruta-5-sur?place=w.189269418.1892694183.25097777',
      '_blank'
    )
  }

  const handleAppleMaps = () => {
    window.open(
      'https://maps.apple.com/place?map=satellite&place-id=IEA0826463ACE71BC&address=Caletera+Ruta+5%2C+Curic%C3%B3%2C+Chile&coordinate=-34.9743702%2C-71.2034765&name=ASLI+-+Log%C3%ADstica+y+Comercio+Exterior&_provider=9902',
      '_blank'
    )
  }

  return (
    <section id="contacto" className="section-fit bg-asli-light">
      <div className="container-asli">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
          <div ref={info.ref} style={info.style} className="lg:col-span-5">
            <div className="card-soft p-5 sm:p-6 md:p-8 h-full !shadow-none sm:!shadow-[var(--shadow-low)] border-0 sm:border rounded-none sm:rounded-[var(--radius-lg)] -mx-4 sm:mx-0 bg-transparent sm:bg-[var(--color-surface)]">
              <span className="section-label !mb-2">{t.contacto.label}</span>
              <h2 className="font-display text-[clamp(1.45rem,5.5vw,2.35rem)] font-bold tracking-tight mb-3 text-asli-dark">
                {t.contacto.title}
              </h2>
              <p className="text-muted-strong text-[0.92rem] sm:text-base leading-relaxed mb-5 sm:mb-6">
                {t.contacto.body}
              </p>

              <div className="space-y-4 mb-5 sm:mb-6">
                <div>
                  <p className="text-muted text-xs uppercase tracking-wider mb-1 font-bold">
                    {t.contacto.addressLabel}
                  </p>
                  <p className="text-asli-dark font-semibold text-base">
                    Longitudinal Sur Km. 186
                    <br />
                    3340000 Curicó, Maule
                  </p>
                </div>
                <div>
                  <p className="text-muted text-xs uppercase tracking-wider mb-1 font-bold">
                    {t.contacto.contactLabel}
                  </p>
                  <p className="text-asli-dark font-semibold text-base">Mario Basaez</p>
                  <a
                    href="tel:+56968394225"
                    className="text-asli-primary hover:text-asli-accent transition-colors duration-320 text-base font-bold min-h-11 inline-flex items-center"
                  >
                    +56 9 6839 4225
                  </a>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 sm:gap-2.5 mb-5">
                <button
                  type="button"
                  onClick={handleGoogleMaps}
                  className="btn-primary !py-2.5 !px-4 text-sm min-h-11"
                >
                  Google Maps
                </button>
                <button
                  type="button"
                  onClick={handleWaze}
                  className="btn-secondary !py-2.5 !px-4 text-sm min-h-11"
                >
                  Waze
                </button>
                <button
                  type="button"
                  onClick={handleAppleMaps}
                  className="btn-secondary !py-2.5 !px-4 text-sm min-h-11"
                >
                  Apple Maps
                </button>
              </div>

              <a
                href="https://api.whatsapp.com/send/?phone=56968394225&text&type=phone_number&app_absent=0"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-asli-accent font-semibold hover:gap-3 transition-all duration-320 ease-asli min-h-11"
              >
                {t.contacto.whatsapp}
                <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>

          <div
            ref={map.ref}
            style={map.style}
            className="lg:col-span-7 overflow-hidden rounded-none sm:rounded-[20px] shadow-asli-med min-h-[220px] sm:min-h-[260px] lg:min-h-[min(52vh,400px)] border-y sm:border border-asli-dark/5 -mx-4 sm:mx-0 relative"
          >
            <button
              type="button"
              onClick={handleGoogleMaps}
              className="absolute inset-0 w-full h-full min-h-[220px] text-left"
              aria-label={t.contacto.openMapsAria}
            >
              <img
                src="/img/mapa-asli.webp"
                alt={t.contacto.mapAlt}
                width={1280}
                height={820}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover object-center"
              />
              <span className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 inline-flex items-center gap-2 rounded-full bg-asli-surface/95 px-3.5 py-2 text-sm font-semibold text-asli-dark shadow-sm">
                {t.contacto.openMaps}
                <span aria-hidden="true">→</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Ubicacion
