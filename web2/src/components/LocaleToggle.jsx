import { useEffect, useRef, useState } from 'react'
import { useLocale } from '../hooks/useLocale'

function FlagChile({ size = 20 }) {
  return (
    <span className="locale-toggle__flag" style={{ width: size, height: size }} aria-hidden="true">
      <svg width={size} height={size} viewBox="0 0 24 24">
        <rect width="24" height="12" y="12" fill="#D52B1E" />
        <rect width="24" height="12" fill="#fff" />
        <rect width="10" height="12" fill="#0039A6" />
        <path
          fill="#fff"
          d="M5.2 3.4l.85 2.62H8.8l-2.17 1.58.83 2.55L5.2 8.57 3.03 10.15l.83-2.55L1.7 6.02h2.75z"
        />
      </svg>
    </span>
  )
}

function FlagChina({ size = 20 }) {
  return (
    <span className="locale-toggle__flag" style={{ width: size, height: size }} aria-hidden="true">
      <svg width={size} height={size} viewBox="0 0 24 24">
        <rect width="24" height="24" fill="#DE2910" />
        <path
          fill="#FFDE00"
          d="M4.8 3.2l.72 2.22H7.9l-1.9 1.38.73 2.23L4.8 7.75 2.88 9.03l.73-2.23L1.7 5.42h2.38zm5.3 1.1l.38 1.16h1.22l-.99.72.38 1.16-.99-.72-.99.72.38-1.16-.99-.72h1.22zm2.85 2.85l.38 1.16h1.22l-.99.72.38 1.16-.99-.72-.99.72.38-1.16-.99-.72h1.22zm0 3.9l.38 1.16h1.22l-.99.72.38 1.16-.99-.72-.99.72.38-1.16-.99-.72h1.22zm-2.85 2.1l.38 1.16h1.22l-.99.72.38 1.16-.99-.72-.99.72.38-1.16-.99-.72h1.22z"
        />
      </svg>
    </span>
  )
}

function FlagUS({ size = 20 }) {
  return (
    <span className="locale-toggle__flag" style={{ width: size, height: size }} aria-hidden="true">
      <svg width={size} height={size} viewBox="0 0 24 24">
        <rect width="24" height="24" fill="#B22234" />
        <path
          fill="#fff"
          d="M0 2.77h24v1.85H0zm0 3.69h24v1.85H0zm0 3.69h24v1.85H0zm0 3.69h24v1.85H0zm0 3.69h24v1.85H0z"
        />
        <rect width="10.4" height="12.9" fill="#3C3B6E" />
      </svg>
    </span>
  )
}

const OPTIONS = [
  { locale: 'es', label: 'ES', nameKey: 'es', Flag: FlagChile },
  { locale: 'zh', label: '中文', nameKey: 'zh', Flag: FlagChina },
  { locale: 'en', label: 'EN', nameKey: 'en', Flag: FlagUS },
]

function switchTitle(locale, t) {
  if (locale === 'es') return t.locale.switchToZh || t.locale.switchToEn
  if (locale === 'zh') return t.locale.switchToEs
  return t.locale.switchToEs
}

/** Selector de idioma: Español / 中文 / English. */
export function LocaleToggle({ className = '' }) {
  const { locale, changeLocale, t } = useLocale()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const current = OPTIONS.find((o) => o.locale === locale) ?? OPTIONS[0]
  const CurrentFlag = current.Flag
  const names = t.locale.languages || { es: 'Español', zh: '中文', en: 'English' }

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const pick = (next) => {
    changeLocale(next)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className={`locale-toggle-wrap ${className}`.trim()}>
      <button
        type="button"
        className="locale-toggle"
        title={switchTitle(locale, t)}
        aria-label={t.locale.chooseLanguage || 'Elegir idioma'}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        suppressHydrationWarning
      >
        <CurrentFlag size={18} />
        <span className="locale-toggle__code">{current.label}</span>
        <svg
          className={`locale-toggle__chevron ${open ? 'is-open' : ''}`}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          className="locale-toggle__menu"
          role="listbox"
          aria-label={t.locale.chooseLanguage || 'Idiomas'}
        >
          {OPTIONS.map((opt) => {
            const active = opt.locale === locale
            const Flag = opt.Flag
            return (
              <button
                key={opt.locale}
                type="button"
                role="option"
                aria-selected={active}
                className={`locale-toggle__option ${active ? 'is-active' : ''}`}
                onClick={() => pick(opt.locale)}
              >
                <Flag size={22} />
                <span className="locale-toggle__option-name">{names[opt.nameKey]}</span>
                <span className="locale-toggle__option-code">{opt.label}</span>
                {active ? (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className="locale-toggle__check"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                ) : (
                  <span className="locale-toggle__check-spacer" aria-hidden="true" />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
