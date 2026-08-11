import { useState } from 'react'
import { useReveal } from '../hooks/useReveal'

/**
 * Formulario de tracking — selecciona naviera y redirige al sitio oficial
 */
const Tracking = () => {
  const [naviera, setNaviera] = useState('')
  const { ref, style } = useReveal()

  const navieras = [
    { value: '', label: 'Seleccione una naviera' },
    { value: 'msc', label: 'MSC', url: 'https://www.msc.com/es/track-a-shipment' },
    { value: 'maersk', label: 'Maersk', url: 'https://www.maersk.com/tracking/' },
    { value: 'pil', label: 'PIL', url: 'https://www.pilship.com/digital-solutions/?tab=customer&id=track-trace&label=containerTandT&module=TrackTraceBL&refNo=' },
    { value: 'oocl', label: 'OOCL', url: 'https://www.oocl.com/eng/ourservices/eservices/cargotracking/Pages/cargotracking.aspx' },
    { value: 'cma', label: 'CMA CGM', url: 'https://www.cma-cgm.com/' },
    { value: 'evergreen', label: 'Evergreen', url: 'https://ct.shipmentlink.com/servlet/TDB1_CargoTracking.do' },
    { value: 'wanhai', label: 'Wan Hai', url: 'https://www.wanhai.com/views/cargo_track_v2/tracking_query.xhtml?file_num=65580&parent_id=64738&top_file_num=64735' },
    { value: 'one', label: 'ONE', url: 'https://ecomm.one-line.com/one-ecom/manage-shipment/cargo-tracking' },
    { value: 'hapag-lloyd', label: 'Hapag-Lloyd', url: 'https://www.hapag-lloyd.com/en/online-business/track/track-by-booking-solution.html' },
    { value: 'cosco', label: 'COSCO', url: 'https://elines.coscoshipping.com/ebusiness/cargoTracking/' },
    { value: 'yangming', label: 'Yang Ming', url: 'https://www.yangming.com/en/esolution/tracking/cargo_tracking' },
    { value: 'otra', label: 'Otra naviera' },
  ]

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!naviera || naviera === '' || naviera === 'otra') {
      alert('Por favor, seleccione una naviera de la lista para acceder al tracking.')
      return
    }

    const navieraSeleccionada = navieras.find((nav) => nav.value === naviera)

    if (navieraSeleccionada && navieraSeleccionada.url) {
      window.open(navieraSeleccionada.url, '_blank', 'noopener,noreferrer')
    } else {
      alert('Por favor, seleccione una naviera de la lista para acceder al tracking.')
    }
  }

  return (
    <section className="grain-surface bg-asli-light py-20 md:py-28">
      <div ref={ref} style={style} className="relative z-[2] container-asli">
        <div className="max-w-xl mx-auto text-center mb-12">
          <h2 className="font-display text-asli-dark text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-tight mb-4">
            Consulta el estado de tu carga
          </h2>
          <p className="text-asli-dark/65 text-base md:text-lg leading-relaxed">
            Selecciona la naviera y serás redirigido a su página oficial de tracking.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="max-w-xl mx-auto bg-white border border-asli-dark/10 p-6 md:p-10 shadow-asli-med"
        >
          <div className="space-y-6">
            <div>
              <label htmlFor="naviera" className="section-label !mb-2">
                Naviera
              </label>
              <select
                id="naviera"
                value={naviera}
                onChange={(e) => setNaviera(e.target.value)}
                className="w-full px-4 py-3.5 bg-asli-light border border-asli-dark/15 text-asli-dark focus:outline-none focus:ring-2 focus:ring-asli-primary/30 focus:border-asli-primary transition-colors duration-320"
                style={{ borderRadius: 'var(--radius-md)' }}
                required
              >
                {navieras.map((nav) => (
                  <option key={nav.value} value={nav.value}>
                    {nav.label}
                  </option>
                ))}
              </select>
            </div>

            <button type="submit" className="btn-primary w-full">
              Ir a tracking de la naviera
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}

export default Tracking
