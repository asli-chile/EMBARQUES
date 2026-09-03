import NavieraPicker from './NavieraPicker'

/**
 * Selector de tracking — clic en naviera redirige al sitio oficial
 */
const Tracking = () => {
  const navieras = [
    { value: 'msc', label: 'MSC', logo: '/img/msc.webp', url: 'https://www.msc.com/es/track-a-shipment' },
    { value: 'maersk', label: 'Maersk', logo: '/img/maersk.webp', url: 'https://www.maersk.com/tracking/' },
    { value: 'pil', label: 'PIL', logo: '/img/pil.webp', url: 'https://www.pilship.com/digital-solutions/?tab=customer&id=track-trace&label=containerTandT&module=TrackTraceBL&refNo=' },
    { value: 'oocl', label: 'OOCL', logo: '/img/oocl.webp', url: 'https://www.oocl.com/eng/ourservices/eservices/cargotracking/Pages/cargotracking.aspx' },
    { value: 'cma', label: 'CMA CGM', logo: '/img/cma.webp', url: 'https://www.cma-cgm.com/' },
    { value: 'evergreen', label: 'Evergreen', logo: '/img/evergreen.png', url: 'https://ct.shipmentlink.com/servlet/TDB1_CargoTracking.do' },
    { value: 'wanhai', label: 'Wan Hai', logo: '/img/wanhai.webp', url: 'https://www.wanhai.com/views/cargo_track_v2/tracking_query.xhtml?file_num=65580&parent_id=64738&top_file_num=64735' },
    { value: 'one', label: 'ONE', logo: '/img/one.webp', url: 'https://ecomm.one-line.com/one-ecom/manage-shipment/cargo-tracking' },
    { value: 'hapag-lloyd', label: 'Hapag-Lloyd', logo: '/img/hapag.png', url: 'https://www.hapag-lloyd.com/en/online-business/track/track-by-booking-solution.html' },
    { value: 'cosco', label: 'COSCO', logo: '/img/cosco.webp', url: 'https://elines.coscoshipping.com/ebusiness/cargoTracking/' },
    { value: 'yangming', label: 'Yang Ming', logo: '/img/yangming.webp', url: 'https://www.yangming.com/en/esolution/tracking/cargo_tracking' },
  ]

  return (
    <div
      className="w-full bg-white border border-asli-dark/10 p-5 sm:p-6 md:p-8 shadow-asli-med"
      style={{ borderRadius: 'var(--radius-md)' }}
    >
      <NavieraPicker navieras={navieras} />
    </div>
  )
}

export default Tracking
