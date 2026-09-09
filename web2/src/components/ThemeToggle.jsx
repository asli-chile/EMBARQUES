import { useTheme } from '../hooks/useTheme'
import { useLocale } from '../hooks/useLocale'

const SIZE = 26
const WIDTH = Math.round(SIZE * 2.15)
const PAD = Math.max(2, Math.round(SIZE * 0.12))
const KNOB = SIZE - PAD * 2

/** Switch día/noche animado (luna + estrellas / sol + nube). */
export function ThemeToggle({ className = '' }) {
  const [theme, , onToggle] = useTheme()
  const { t } = useLocale()
  const isDark = theme === 'dark'
  const label = isDark ? t.theme.toLight : t.theme.toDark

  return (
    <button
      type="button"
      role="switch"
      className={`theme-toggle ${className}`.trim()}
      onClick={onToggle}
      title={label}
      aria-label={label}
      aria-checked={isDark}
      suppressHydrationWarning
      style={{
        width: WIDTH,
        height: SIZE,
        background: isDark
          ? 'linear-gradient(145deg, #0f172a 0%, #1e3a5f 55%, #0c4a6e 100%)'
          : 'linear-gradient(145deg, #7dd3fc 0%, #38bdf8 45%, #0ea5e9 100%)',
        borderColor: isDark ? 'rgba(148,163,184,0.35)' : 'rgba(14,165,233,0.45)',
      }}
    >
      <span
        aria-hidden
        className="theme-toggle__stars"
        style={{ opacity: isDark ? 1 : 0 }}
      >
        <span className="theme-toggle__star" style={{ width: 2, height: 2, top: '22%', left: '18%' }} />
        <span className="theme-toggle__star theme-toggle__star--dim" style={{ width: 1.5, height: 1.5, top: '55%', left: '28%' }} />
        <span className="theme-toggle__star" style={{ width: 2, height: 2, top: '35%', left: '42%' }} />
      </span>

      <span
        aria-hidden
        className="theme-toggle__cloud"
        style={{
          opacity: isDark ? 0 : 1,
          width: SIZE * 0.55,
          height: SIZE * 0.28,
          right: PAD + 2,
          bottom: PAD + 1,
        }}
      />

      <span
        aria-hidden
        className="theme-toggle__knob"
        style={{
          width: KNOB,
          height: KNOB,
          top: PAD,
          left: PAD,
          transform: isDark ? `translateX(${WIDTH - KNOB - PAD * 2}px)` : 'translateX(0)',
          background: isDark
            ? 'linear-gradient(145deg, #e2e8f0 0%, #94a3b8 100%)'
            : 'linear-gradient(145deg, #fef08a 0%, #facc15 55%, #eab308 100%)',
          boxShadow: isDark
            ? 'inset -3px -2px 0 0 rgba(15,23,42,0.35)'
            : '0 1px 4px rgba(161,98,7,0.35)',
        }}
      />
    </button>
  )
}
