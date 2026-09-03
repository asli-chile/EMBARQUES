import NavieraPicker from './NavieraPicker'

/**
 * Selector de stacking — clic en naviera redirige al sitio oficial
 */
const Stacking = () => {
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
    <div
      className="w-full bg-white border border-asli-dark/10 p-5 sm:p-6 md:p-8 shadow-asli-med"
      style={{ borderRadius: 'var(--radius-md)' }}
    >
      <NavieraPicker navieras={navieras} />
    </div>
  )
}

export default Stacking
