import NavieraPicker from './NavieraPicker'
import { useLocale } from '../hooks/useLocale'

/** Directorio de stacking — clic en naviera abre el portal oficial */
const Stacking = () => {
  const { t } = useLocale()
  const tp = t.stackingPage
  const navieras = [
    { value: 'cma', label: 'CMA CGM', logo: '/img/cma.webp', url: 'https://www.cma-cgm-chile.cl/?page=18' },
    { value: 'cosco', label: 'COSCO', logo: '/img/cosco.webp', url: 'https://documentacioncoscochile.at-portal.com/stackings' },
    { value: 'hapag-lloyd', label: 'Hapag-Lloyd', logo: '/img/hapag.png', url: 'https://stackingchile.hlag-cl.com/' },
    { value: 'maersk', label: 'Maersk', logo: '/img/maersk.webp', url: 'https://sway.cloud.microsoft/U5rT4hqClDmMHjqE?ref=Link' },
    { value: 'msc', label: 'MSC', logo: '/img/msc.webp', url: 'https://deadline.mscchile.cl/Stacking_esp.html' },
    { value: 'pil', label: 'PIL', logo: '/img/pil.webp', url: '/stacking/pil' },
    { value: 'one', label: 'ONE', logo: '/img/one.webp', url: 'https://la.one-line.com/es/exportacion' },
    { value: 'wanhai', label: 'Wan Hai', logo: '/img/wanhai.webp', url: 'https://www.navepac.com/#/itinerarios-stacking' },
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
