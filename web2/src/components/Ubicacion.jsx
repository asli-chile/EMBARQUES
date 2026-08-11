import { useReveal } from '../hooks/useReveal'

const Ubicacion = () => {
  const info = useReveal('left')
  const map = useReveal('right', 280)

  const handleGoogleMaps = () => {
    window.open('https://maps.app.goo.gl/cGrni677vZDk5pp26', '_blank')
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
    <section id="contacto" className="section-fit bg-[#F7F5F2]">
      <div className="container-asli">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
          <div ref={info.ref} style={info.style} className="lg:col-span-5">
            <div className="card-soft p-5 sm:p-6 md:p-8 h-full">
              <span className="section-label !mb-2">Contacto</span>
              <h2 className="font-display text-[clamp(1.45rem,3.2vw,2.35rem)] font-bold tracking-tight mb-3 text-asli-dark">
                Hablemos de tu próxima operación
              </h2>
              <p className="text-muted-strong text-[0.95rem] sm:text-base leading-relaxed mb-5 sm:mb-6">
                Cuéntanos qué necesitas exportar o importar. En la primera conversación
                revisamos tu caso con sinceridad, te orientamos y te proponemos un camino
                concreto — sin compromiso y sin rodeos.
              </p>

              <div className="space-y-4 mb-5 sm:mb-6">
                <div>
                  <p className="text-muted text-xs uppercase tracking-wider mb-1 font-bold">
                    Dirección
                  </p>
                  <p className="text-asli-dark font-semibold text-base">
                    Longitudinal Sur Km. 186
                    <br />
                    3340000 Curicó, Maule
                  </p>
                </div>
                <div>
                  <p className="text-muted text-xs uppercase tracking-wider mb-1 font-bold">
                    Contacto
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
                Escribir por WhatsApp
                <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>

          <div
            ref={map.ref}
            style={map.style}
            className="lg:col-span-7 overflow-hidden rounded-[16px] sm:rounded-[20px] shadow-asli-med min-h-[230px] sm:min-h-[260px] lg:min-h-[min(52vh,400px)] border border-asli-dark/5"
          >
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d4022.7608648636206!2d-71.20605142340338!3d-34.97436577716874!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x966457bfbad3103d%3A0x1a06a30ef08571a5!2sASLI%20-%20Log%C3%ADstica%20y%20Comercio%20Exterior!5e1!3m2!1ses-419!2scl!4v1768069231458!5m2!1ses-419!2scl"
              width="100%"
              height="100%"
              style={{ minHeight: '230px', border: 0, display: 'block' }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Ubicación ASLI - Logística y Comercio Exterior"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

export default Ubicacion
