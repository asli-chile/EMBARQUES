import NavieraPicker from './NavieraPicker'
import { useLocale } from '../hooks/useLocale'

/** Directorio de tracking — clic en naviera abre el portal oficial */
const Tracking = () => {
  const { t } = useLocale()
  const tp = t.trackingPage
  const navieras = [
    { value: 'msc', label: 'MSC', logo: '/img/navieras/msc.webp', url: 'https://www.msc.com/es/track-a-shipment' },
    { value: 'maersk', label: 'Maersk', logo: '/img/navieras/maersk.webp', url: 'https://www.maersk.com/tracking/' },
    { value: 'pil', label: 'PIL', logo: '/img/navieras/pil.webp', url: 'https://www.pilship.com/digital-solutions/?tab=customer&id=track-trace&label=containerTandT&module=TrackTraceBL&refNo=' },
    { value: 'oocl', label: 'OOCL', logo: '/img/navieras/oocl.webp', url: 'https://www.oocl.com/eng/ourservices/eservices/cargotracking/Pages/cargotracking.aspx' },
    { value: 'cma', label: 'CMA CGM', logo: '/img/navieras/cma.webp', url: 'https://www.cma-cgm.com/' },
    { value: 'evergreen', label: 'Evergreen', logo: '/img/navieras/evergreen.webp', url: 'https://ct.shipmentlink.com/servlet/TDB1_CargoTracking.do' },
    { value: 'wanhai', label: 'Wan Hai', logo: '/img/navieras/wanhai.webp', url: 'https://www.wanhai.com/views/cargo_track_v2/tracking_query.xhtml?file_num=65580&parent_id=64738&top_file_num=64735' },
    { value: 'one', label: 'ONE', logo: '/img/navieras/one.webp', url: 'https://ecomm.one-line.com/one-ecom/manage-shipment/cargo-tracking' },
    { value: 'hapag-lloyd', label: 'Hapag-Lloyd', logo: '/img/navieras/hapag.webp', url: 'https://www.hapag-lloyd.com/en/online-business/track/track-by-booking-solution.html' },
    { value: 'cosco', label: 'COSCO', logo: '/img/navieras/cosco.webp', url: 'https://elines.coscoshipping.com/ebusiness/cargoTracking/' },
    { value: 'yangming', label: 'Yang Ming', logo: '/img/navieras/yangming.webp', url: 'https://www.yangming.com/en/esolution/tracking/cargo_tracking' },
  ]

  return (
    <NavieraPicker
      navieras={navieras}
      label={tp.pickerLabel}
      actionLabel={tp.actionLabel}
      externalHint={tp.externalHint}
      countHint={tp.countHint}
    />
  )
}

export default Tracking
