const NavieraPicker = ({ navieras, label = 'Naviera' }) => {
  const options = navieras.filter((nav) => nav.value && nav.value !== 'otra' && nav.url)

  return (
    <div>
      <p className="section-label !mb-3">{label}</p>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
        {options.map((nav) => {
          const internal = String(nav.url).startsWith('/')
          return (
            <a
              key={nav.value}
              href={nav.url}
              target={internal ? undefined : '_blank'}
              rel={internal ? undefined : 'noopener noreferrer'}
              aria-label={`Ir a ${nav.label}`}
              className="group flex items-center justify-center h-14 sm:h-16 p-2 border border-asli-dark/10 bg-asli-light hover:border-asli-primary/40 hover:shadow-asli-low hover:ring-2 hover:ring-asli-primary/20 transition-all duration-320"
              style={{ borderRadius: 'var(--radius-md)' }}
              title={nav.label}
            >
              {nav.logo ? (
                <img
                  src={nav.logo}
                  alt=""
                  className="max-h-8 sm:max-h-10 max-w-full object-contain grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-320"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <span className="text-[0.65rem] sm:text-xs font-medium text-asli-dark text-center leading-tight">
                  {nav.label}
                </span>
              )}
            </a>
          )
        })}
      </div>
    </div>
  )
}

export default NavieraPicker
