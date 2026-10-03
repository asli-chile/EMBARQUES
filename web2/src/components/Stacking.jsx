import NavieraPicker from './NavieraPicker'
import { useLocale } from '../hooks/useLocale'

/** Directorio de stacking — clic en naviera abre el portal oficial */
const Stacking = () => {
  const { t } = useLocale()
  const tp = t.stackingPage
  const navieras = [
    { value: 'cma', label: 'CMA CGM', logo: '/img/navieras/cma.webp', url: 'https://www.cma-cgm-chile.cl/?page=18' },
    { value: 'cosco', label: 'COSCO', logo: '/img/navieras/cosco.webp', url: 'https://documentacioncoscochile.at-portal.com/stackings' },
    { value: 'hapag-lloyd', label: 'Hapag-Lloyd', logo: '/img/navieras/hapag.webp', url: 'https://stackingchile.hlag-cl.com/' },
    { value: 'maersk', label: 'Maersk', logo: '/img/navieras/maersk.webp', url: 'https://sway.cloud.microsoft/U5rT4hqClDmMHjqE?ref=Link' },
    { value: 'msc', label: 'MSC', logo: '/img/navieras/msc.webp', url: 'https://deadline.mscchile.cl/Stacking_esp.html' },
    { value: 'pil', label: 'PIL', logo: '/img/navieras/pil.webp', url: '/stacking/pil' },
    { value: 'one', label: 'ONE', logo: '/img/navieras/one.webp', url: 'https://la.one-line.com/es/exportacion' },
    { value: 'wanhai', label: 'Wan Hai', logo: '/img/navieras/wanhai.webp', url: 'https://www.navepac.com/#/itinerarios-stacking' },
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

export default Stacking
