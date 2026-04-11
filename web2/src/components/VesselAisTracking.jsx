import { useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLang } from '../lib/LangContext'

function hasValidCoords(lat, lng) {
  const la = Number(lat)
  const lo = Number(lng)
  return Number.isFinite(la) && Number.isFinite(lo) && (la !== 0 || lo !== 0)
}

export default function VesselAisTracking() {
  const { t } = useLang()
  const tr = t.tracking.ais

  const [nameQuery, setNameQuery] = useState('')
  const [results, setResults] = useState([])
  const [searchAttempted, setSearchAttempted] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState(null)

  const [selected, setSelected] = useState(null)
  const [vessel, setVessel] = useState(null)
  const [vesselLoading, setVesselLoading] = useState(false)
  const [vesselError, setVesselError] = useState(null)
  const [extended, setExtended] = useState(false)

  const runSearch = useCallback(async () => {
    const q = nameQuery.trim()
    setSearchError(null)
    setResults([])
    setSearchAttempted(false)
    setSelected(null)
    setVessel(null)
    setVesselError(null)

    if (q.length < 3) {
      setSearchError(tr.minChars)
      return
    }

    setSearchLoading(true)
    try {
      const r = await fetch(`/api/shiptracking/search?name=${encodeURIComponent(q)}`)
      const json = await r.json()
      if (!json.ok) {
        if (json.code === 'NO_CONFIG') setSearchError(tr.notConfigured)
        else if (json.code === 'ERR_RATE_LIMIT') setSearchError(tr.rateLimit)
        else if (json.code === 'ERR_NO_CREDITS') setSearchError(tr.noCredits)
        else setSearchError(json.message || tr.error)
        return
      }
      setSearchAttempted(true)
      setResults(Array.isArray(json.data) ? json.data : [])
    } catch {
      setSearchError(tr.error)
    } finally {
      setSearchLoading(false)
    }
  }, [nameQuery, tr])

  const loadVessel = useCallback(
    async (row) => {
      setSelected(row)
      setVessel(null)
      setVesselError(null)
      setVesselLoading(true)

      const mmsi = row.mmsi != null ? String(row.mmsi) : ''
      const imo = row.imo != null ? String(row.imo) : ''
      if (!mmsi && !imo) {
        setVesselError(tr.noIdentifier)
        setVesselLoading(false)
        return
      }
      const qp =
        mmsi.length > 0
          ? `mmsi=${encodeURIComponent(mmsi)}`
          : `imo=${encodeURIComponent(imo)}`
      const ext = extended ? '&response=extended' : ''

      try {
        const r = await fetch(`/api/shiptracking/vessel?${qp}${ext}`)
        const json = await r.json()
        if (!json.ok) {
          if (json.code === 'NO_CONFIG') setVesselError(tr.notConfigured)
          else if (json.code === 'ERR_VESSEL_NOT_FOUND') setVesselError(tr.noPosition)
          else if (json.code === 'ERR_RATE_LIMIT') setVesselError(tr.rateLimit)
          else if (json.code === 'ERR_NO_CREDITS') setVesselError(tr.noCredits)
          else setVesselError(json.message || tr.error)
          return
        }
        setVessel(json.data)
      } catch {
        setVesselError(tr.error)
      } finally {
        setVesselLoading(false)
      }
    },
    [extended, tr],
  )

  const lat = vessel ? Number(vessel.lat) : NaN
  const lng = vessel ? Number(vessel.lng) : NaN
  const showMap = vessel && hasValidCoords(lat, lng)
  const bbox = showMap
    ? `${lng - 0.35},${lat - 0.25},${lng + 0.35},${lat + 0.25}`
    : ''
  const embedSrc = showMap
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat}%2C${lng}`
    : ''
  const osmLink = showMap ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=9/${lat}/${lng}` : ''

  return (
    <div
      data-page-reveal
      className="mb-14 md:mb-16 rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8"
    >
      <div className="mb-6 max-w-2xl">
        <h2 className="font-display font-bold text-white text-xl md:text-2xl tracking-tight mb-2">
          {tr.title}
        </h2>
        <p className="text-white/45 text-sm leading-relaxed">{tr.sub}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6 max-w-xl">
        <input
          type="text"
          value={nameQuery}
          onChange={(e) => setNameQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runSearch()}
          placeholder={tr.placeholder}
          className="flex-1 min-w-0 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-asli-primary/50 focus:bg-white/[0.06] transition-all duration-200"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={runSearch}
          disabled={searchLoading}
          className="shrink-0 px-6 py-3 rounded-xl bg-asli-primary/90 text-white text-sm font-semibold hover:bg-asli-primary border border-asli-primary/40 transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          {searchLoading ? tr.searching : tr.search}
        </button>
      </div>

      <label className="flex items-center gap-2 mb-6 text-white/50 text-xs cursor-pointer select-none">
        <input
          type="checkbox"
          checked={extended}
          onChange={(e) => {
            setExtended(e.target.checked)
            setVessel(null)
            setVesselError(null)
          }}
          className="rounded border-white/20 bg-white/5 text-asli-primary focus:ring-asli-primary/30"
        />
        {tr.extendedHint}
      </label>

      {searchError && (
        <p className="mb-4 text-amber-400/90 text-sm" role="alert">
          {searchError}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        <div>
          <p className="text-white/35 text-xs uppercase tracking-wide mb-3">{tr.resultsTitle}</p>
          <div className="rounded-xl border border-white/8 bg-black/20 max-h-[320px] overflow-y-auto">
            {!searchAttempted && results.length === 0 && !searchLoading && !searchError && (
              <p className="p-4 text-white/30 text-sm">{tr.hint}</p>
            )}
            {searchAttempted && results.length === 0 && !searchLoading && !searchError && (
              <p className="p-4 text-white/30 text-sm">{tr.noResults}</p>
            )}
            <ul className="divide-y divide-white/6">
              {results.map((row) => {
                const active =
                  selected &&
                  selected.mmsi === row.mmsi &&
                  String(selected.imo ?? '') === String(row.imo ?? '')
                return (
                  <li key={`${row.mmsi}-${row.imo ?? 'x'}-${row.vessel_name}`}>
                    <button
                      type="button"
                      onClick={() => loadVessel(row)}
                      className={`w-full text-left px-4 py-3.5 transition-colors ${
                        active
                          ? 'bg-asli-primary/15 border-l-2 border-asli-primary'
                          : 'hover:bg-white/[0.04] border-l-2 border-transparent'
                      }`}
                    >
                      <p className="text-white font-semibold text-sm">{row.vessel_name}</p>
                      <p className="text-white/40 text-xs mt-1">
                        {tr.mmsi}: {row.mmsi}
                        {row.imo != null ? ` · ${tr.imo}: ${row.imo}` : ''}
                      </p>
                      {row.vessel_type && (
                        <p className="text-white/35 text-xs mt-0.5">{row.vessel_type}</p>
                      )}
                      {row.area && (
                        <p className="text-white/30 text-xs mt-0.5">
                          {tr.area}: {row.area}
                        </p>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>

        <div>
          <p className="text-white/35 text-xs uppercase tracking-wide mb-3">{tr.detailTitle}</p>
          <div className="rounded-xl border border-white/8 bg-black/20 min-h-[200px] p-4 md:p-5">
            <AnimatePresence mode="wait">
              {vesselLoading && (
                <motion.p
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-white/40 text-sm"
                >
                  {tr.loadingDetail}
                </motion.p>
              )}
              {!vesselLoading && vesselError && (
                <motion.p
                  key="err"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-amber-400/90 text-sm"
                  role="alert"
                >
                  {vesselError}
                </motion.p>
              )}
              {!vesselLoading && !vesselError && !vessel && (
                <motion.p
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-white/30 text-sm"
                >
                  {tr.selectVessel}
                </motion.p>
              )}
              {!vesselLoading && vessel && (
                <motion.div
                  key="v"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div>
                    <p className="text-white font-semibold text-lg">{vessel.vessel_name}</p>
                    <p className="text-white/40 text-xs mt-1">
                      MMSI {vessel.mmsi}
                      {vessel.imo != null ? ` · IMO ${vessel.imo}` : ''}
                    </p>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <dt className="text-white/35">{tr.speed}</dt>
                    <dd className="text-white/80">
                      {vessel.speed != null ? `${vessel.speed} kn` : '—'}
                    </dd>
                    <dt className="text-white/35">{tr.course}</dt>
                    <dd className="text-white/80">
                      {vessel.course != null ? `${vessel.course}°` : '—'}
                    </dd>
                    <dt className="text-white/35">{tr.navStatus}</dt>
                    <dd className="text-white/80">{vessel.nav_status ?? '—'}</dd>
                    <dt className="text-white/35">{tr.received}</dt>
                    <dd className="text-white/80">{vessel.received ?? '—'}</dd>
                    {vessel.destination && (
                      <>
                        <dt className="text-white/35">{tr.destination}</dt>
                        <dd className="text-white/80 col-span-1">{vessel.destination}</dd>
                      </>
                    )}
                    {vessel.eta && (
                      <>
                        <dt className="text-white/35">ETA</dt>
                        <dd className="text-white/80">{String(vessel.eta)}</dd>
                      </>
                    )}
                    {vessel.next_port && (
                      <>
                        <dt className="text-white/35">{tr.nextPort}</dt>
                        <dd className="text-white/80 col-span-2">{vessel.next_port}</dd>
                      </>
                    )}
                  </dl>

                  {showMap && (
                    <div className="pt-2">
                      <div className="relative w-full overflow-hidden rounded-xl border border-white/10 aspect-[16/10] bg-black/40">
                        <iframe
                          title={tr.mapTitle}
                          src={embedSrc}
                          className="absolute inset-0 h-full w-full border-0"
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                        />
                      </div>
                      <a
                        href={osmLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex mt-3 text-asli-primary text-sm font-medium hover:underline"
                      >
                        {tr.openMap}
                      </a>
                    </div>
                  )}

                  {!showMap && vessel && (
                    <p className="text-white/35 text-sm pt-1">{tr.noPosition}</p>
                  )}

                  <p className="text-white/25 text-[11px] leading-relaxed pt-2 border-t border-white/8">
                    {tr.attribution}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
