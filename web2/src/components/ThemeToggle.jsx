import { useTheme } from '../hooks/useTheme'
import { useLocale } from '../hooks/useLocale'

/** Botón sol/luna para alternar modo claro y oscuro. */
export function ThemeToggle({ className = '' }) {
  const [theme, , onToggle] = useTheme()
  const { t } = useLocale()
  const isDark = theme === 'dark'
  const label = isDark ? t.theme.toLight : t.theme.toDark

  return (
    <button
      type="button"
      className={`theme-toggle ${className}`.trim()}
      onClick={onToggle}
      title={label}
      aria-label={label}
      aria-pressed={isDark}
      suppressHydrationWarning
    >
      {isDark ? (
        <svg className="h-[1.125rem] w-[1.125rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.75"
            d="M12 3v1.5M12 19.5V21M4.5 12H3m18 0h-1.5M6.34 6.34 5.28 5.28m12.38 12.38 1.06 1.06M6.34 17.66l-1.06 1.06m12.38-12.38 1.06-1.06M16.5 12a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z"
          />
        </svg>
      ) : (
        <svg className="h-[1.125rem] w-[1.125rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.75"
            d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"
          />
        </svg>
      )}
    </button>
  )
}
