import { useLocale } from '../hooks/useLocale'

/** Alterna ES ↔ EN. */
export function LocaleToggle({ className = '' }) {
  const { locale, onToggle, t } = useLocale()
  const label = locale === 'es' ? 'EN' : 'ES'
  const title = locale === 'es' ? t.locale.switchToEn : t.locale.switchToEs

  return (
    <button
      type="button"
      className={`locale-toggle ${className}`.trim()}
      onClick={onToggle}
      title={title}
      aria-label={title}
      suppressHydrationWarning
    >
      {label}
    </button>
  )
}
