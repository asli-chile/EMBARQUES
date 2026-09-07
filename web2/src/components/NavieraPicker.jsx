import { useReveal } from '../hooks/useReveal'
import { useLocale } from '../hooks/useLocale'

function CarrierCard({ nav, index, actionLabel, externalHint, goTo }) {
  const { ref, style } = useReveal('up', Math.min(index, 8) * 70)
  const internal = String(nav.url).startsWith('/')

  return (
    <div ref={ref} style={style}>
      <a
        href={nav.url}
        target={internal ? undefined : '_blank'}
        rel={internal ? undefined : 'noopener noreferrer'}
        aria-label={goTo(nav.label)}
        title={nav.label}
        className="group card-soft flex flex-col h-full p-5 sm:p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asli-primary/40 hover:border-asli-primary/25 hover:ring-2 hover:ring-asli-primary/15"
      >
        <div className="flex items-center justify-center h-20 sm:h-24 mb-5 rounded-[var(--radius-md)] bg-asli-light/80 border border-asli-dark/5 px-4">
          {nav.logo ? (
            <img
              src={nav.logo}
              alt=""
              className="max-h-12 sm:max-h-14 max-w-full object-contain transition-transform duration-320 group-hover:scale-[1.04]"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span className="font-display text-sm font-bold text-asli-dark text-center">
              {nav.label}
            </span>
          )}
        </div>

        <div className="flex flex-col flex-grow gap-2">
          <h3 className="font-display text-lg font-bold text-asli-dark tracking-tight">
            {nav.label}
          </h3>
          <p className="text-muted text-sm leading-snug flex-grow">{externalHint}</p>
          <span className="inline-flex items-center gap-1.5 mt-3 text-sm font-semibold text-asli-primary group-hover:gap-2.5 transition-all duration-320">
            {actionLabel}
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
              className="shrink-0"
            >
              <path
                d="M3 8h10M9 4l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
      </a>
    </div>
  )
}

const NavieraPicker = ({ navieras, label, actionLabel, externalHint, countHint }) => {
  const { t } = useLocale()
  const tp = t.trackingPage
  const pickerLabel = label || tp.pickerLabel
  const cta = actionLabel || tp.actionLabel
  const hint = externalHint || tp.externalHint
  const options = navieras.filter((nav) => nav.value && nav.value !== 'otra' && nav.url)
  const resolvedCount =
    typeof countHint === 'function' ? countHint(options.length) : countHint

  return (
    <div>
      <div className="mb-8 md:mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="section-label !mb-2">{pickerLabel}</p>
          {resolvedCount ? (
            <p className="text-muted text-sm md:text-base">{resolvedCount}</p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
        {options.map((nav, index) => (
          <CarrierCard
            key={nav.value}
            nav={nav}
            index={index}
            actionLabel={cta}
            externalHint={hint}
            goTo={tp.goTo}
          />
        ))}
      </div>
    </div>
  )
}

export default NavieraPicker
