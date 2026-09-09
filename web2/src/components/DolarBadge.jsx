import { useEffect, useState } from 'react'
import { useLocale } from '../hooks/useLocale'

function formatHora(date, dateLocale) {
  return date.toLocaleTimeString(dateLocale, {
    timeZone: 'America/Santiago',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/** Indicador minimalista de dólar observado (esquina del hero). */
export function DolarBadge({ className = '' }) {
  const { t, dateLocale } = useLocale()
  const [dolar, setDolar] = useState(null)
  const [loading, setLoading] = useState(true)
  const [ahora, setAhora] = useState(null)

  useEffect(() => {
    const tick = () => setAhora(new Date())
    tick()
    const id = window.setInterval(tick, 60_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const CACHE_KEY = 'asli_dolar_v2'
    const fetchDolar = async () => {
      try {
        const cached = sessionStorage.getItem(CACHE_KEY)
        if (cached) {
          const parsed = JSON.parse(cached)
          if (parsed?.valor && Date.now() - parsed.cachedAt < 30 * 60 * 1000) {
            setDolar({ valor: parsed.valor, fecha: parsed.fecha })
            setLoading(false)
            return
          }
        }
        const response = await fetch('/api/dolar')
        if (!response.ok) return
        const data = await response.json()
        if (!data?.valor) return
        const next = { valor: data.valor, fecha: data.fecha }
        setDolar(next)
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ...next, cachedAt: Date.now() }))
      } catch {
        // silencioso
      } finally {
        setLoading(false)
      }
    }
    fetchDolar()
  }, [])

  const valorFmt = dolar
    ? dolar.valor.toLocaleString(dateLocale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : ''
  const hora = ahora ? formatHora(ahora, dateLocale) : ''

  return (
    <div
      className={`dolar-badge ${className}`.trim()}
      title={t.dolar.title}
      aria-label={
        dolar
          ? t.dolar.withValue(valorFmt, dolar.fecha || '', hora)
          : t.dolar.onlyTime('', hora)
      }
    >
      <span className="dolar-badge__live" aria-hidden="true" />
      <span className="dolar-badge__label">USD</span>
      {loading ? (
        <span className="dolar-badge__value dolar-badge__value--muted">…</span>
      ) : dolar ? (
        <span className="dolar-badge__value">${valorFmt}</span>
      ) : (
        <span className="dolar-badge__value dolar-badge__value--muted">—</span>
      )}
      {hora ? <span className="dolar-badge__time">{hora}</span> : null}
    </div>
  )
}
