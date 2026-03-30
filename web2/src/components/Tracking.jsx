import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ImagePlaceholder from './ImagePlaceholder'

const navieras = [
  { value: 'msc',         label: 'MSC',          url: 'https://www.msc.com/es/track-a-shipment' },
  { value: 'maersk',      label: 'Maersk',        url: 'https://www.maersk.com/tracking/' },
  { value: 'cma',         label: 'CMA CGM',       url: 'https://www.cma-cgm.com/' },
  { value: 'cosco',       label: 'COSCO',         url: 'https://elines.coscoshipping.com/ebusiness/cargoTracking/' },
  { value: 'hapag',       label: 'Hapag-Lloyd',   url: 'https://www.hapag-lloyd.com/en/online-business/track/track-by-booking-solution.html' },
  { value: 'one',         label: 'ONE',           url: 'https://ecomm.one-line.com/one-ecom/manage-shipment/cargo-tracking' },
  { value: 'oocl',        label: 'OOCL',          url: 'https://www.oocl.com/eng/ourservices/eservices/cargotracking/Pages/cargotracking.aspx' },
  { value: 'pil',         label: 'PIL',           url: 'https://www.pilship.com/digital-solutions/?tab=customer&id=track-trace&label=containerTandT&module=TrackTraceBL' },
  { value: 'yangming',    label: 'Yang Ming',     url: 'https://www.yangming.com/en/esolution/tracking/cargo_tracking' },
  { value: 'evergreen',   label: 'Evergreen',     url: 'https://ct.shipmentlink.com/servlet/TDB1_CargoTracking.do' },
  { value: 'wanhai',      label: 'Wan Hai',       url: 'https://www.wanhai.com/views/cargo_track_v2/tracking_query.xhtml' },
  { value: 'zim',         label: 'ZIM',           url: 'https://www.zim.com/tools/track-a-shipment' },
]

const aereas = [
  { value: 'latam',    label: 'LATAM Cargo',       url: 'https://www.latamcargo.com/es/rastrear' },
  { value: 'avianca',  label: 'Avianca Cargo',     url: 'https://www.avianca.com/co/es/informacion-de-vuelo/rastrear-carga/' },
  { value: 'iberia',   label: 'Iberia Cargo',      url: 'https://iberia.com' },
  { value: 'emirates', label: 'Emirates SkyCargo', url: 'https://www.emirates.com/mx/spanish/freight/tracking/' },
]

const Tracking = () => {
  const [query, setQuery]   = useState('')
  const [tab, setTab]       = useState('maritimo') // 'maritimo' | 'aereo'
  const [hovered, setHovered] = useState(null)

  const list   = tab === 'maritimo' ? navieras : aereas
  const filtered = query.trim()
    ? list.filter(n => n.label.toLowerCase().includes(query.toLowerCase()))
    : list

  const handleOpen = (url) => {
    if (!url) return
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <section className="py-16 md:py-24 bg-asli-dark">
      <div className="container mx-auto px-6 lg:px-10">

        {/* Tabs */}
        <div className="flex gap-2 mb-8 p-1 rounded-xl bg-white/[0.04] border border-white/8 w-fit">
          {[
            { id: 'maritimo', label: '🚢  Marítimo' },
            { id: 'aereo',    label: '✈️  Aéreo' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setQuery('') }}
              className={`relative px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-250 ${
                tab === t.id
                  ? 'text-white'
                  : 'text-white/45 hover:text-white/70'
              }`}
            >
              {tab === t.id && (
                <motion.span
                  layoutId="tab-bg"
                  className="absolute inset-0 rounded-lg bg-asli-primary/30 border border-asli-primary/40"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-8 max-w-sm">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar naviera o aerolínea…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-asli-primary/50 focus:bg-white/[0.06] transition-all duration-200"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Cards grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3"
          >
            {filtered.length > 0 ? filtered.map((n, i) => (
              <motion.button
                key={n.value}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
                onClick={() => handleOpen(n.url)}
                onMouseEnter={() => setHovered(n.value)}
                onMouseLeave={() => setHovered(null)}
                className="group relative flex flex-col items-center justify-center gap-3 p-5 rounded-2xl bg-white/[0.03] border border-white/8 hover:border-asli-primary/50 hover:bg-asli-primary/8 transition-all duration-300 cursor-pointer"
              >
                {/* Glow on hover */}
                {hovered === n.value && (
                  <motion.div
                    layoutId="card-glow"
                    className="absolute inset-0 rounded-2xl bg-asli-primary/5"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}

                <div className="relative z-10 h-10 w-full max-w-[80px] flex items-center justify-center">
                  <ImagePlaceholder variant="compact" className="h-10 w-full py-1" />
                </div>

                <span className="relative z-10 text-white/50 group-hover:text-white text-xs font-semibold transition-colors duration-300 text-center leading-tight">
                  {n.label}
                </span>

                {/* Arrow icon */}
                <span className="relative z-10 absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <svg className="w-3 h-3 text-asli-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </span>
              </motion.button>
            )) : (
              <div className="col-span-full py-12 text-center text-white/30 text-sm">
                No se encontró ninguna naviera con ese nombre
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Nota */}
        <p className="mt-8 text-white/25 text-xs text-center">
          Al hacer clic serás redirigido al sitio oficial de tracking de cada naviera o aerolínea
        </p>
      </div>
    </section>
  )
}

export default Tracking
