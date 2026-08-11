/**
 * Componente de imagen flexible.
 * Cuando se pasa `src` renderiza una imagen real.
 * variant: default | light | lightCard | hero | compact | logo | inline
 */
const ImagePlaceholder = ({ className = '', variant = 'default', src = null, alt = '' }) => {
  // ── Real image ──────────────────────────────────────────
  if (src) {
    if (variant === 'logo') {
      return (
        <img
          src={src}
          alt={alt || 'ASLI Logística'}
          className={`h-9 w-auto object-contain object-left ${className}`}
        />
      )
    }
    if (variant === 'hero' || variant === 'inline') {
      return (
        <img
          src={src}
          alt={alt || 'ASLI Logística'}
          className={`absolute inset-0 w-full h-full object-cover ${variant === 'hero' ? 'object-[50%_17%]' : ''} ${className}`}
        />
      )
    }
    return (
      <img
        src={src}
        alt={alt || 'ASLI Logística'}
        className={`w-full h-full object-cover ${className}`}
      />
    )
  }

  // ── Fallback placeholder ────────────────────────────────
  const base =
    'flex flex-col items-center justify-center text-center border border-dashed rounded-lg'

  const byVariant = {
    default:
      'border-white/30 bg-white/[0.06] text-white/70 px-4 py-6 text-xs',
    light:
      'border-asli-dark/25 bg-asli-dark/[0.06] text-asli-dark/70 px-4 py-6 text-xs',
    lightCard:
      'border-asli-dark/20 bg-white text-asli-dark/65 px-2 py-3 text-[10px] leading-tight',
    hero:
      'absolute inset-0 w-full h-full min-h-[12rem] rounded-none border-white/25 bg-white/[0.05] text-white/75 px-6 py-10 text-sm',
    compact: 'border-white/25 bg-white/[0.05] text-white/60 px-2 py-2 text-[10px] leading-tight',
    logo:
      'border-white/35 bg-white/[0.08] text-white/80 h-8 md:h-9 min-w-[120px] px-3 py-1 text-[10px] font-semibold rounded-md',
    inline:
      'absolute inset-0 border-white/20 bg-white/[0.04] text-white/50 text-[9px] px-1 py-2',
  }

  const short = variant === 'logo' || variant === 'compact' || variant === 'inline' || variant === 'lightCard'

  return (
    <div
      className={`${base} ${byVariant[variant] || byVariant.default} ${className}`}
      role="img"
      aria-label="Imagen representativa"
    >
      {short ? (
        <span className="font-medium leading-tight">Imagen</span>
      ) : (
        <>
          <span className="font-semibold">Imagen representativa</span>
          <span className="opacity-80 mt-1 font-normal">Aquí debe ir una imagen</span>
        </>
      )}
    </div>
  )
}

export default ImagePlaceholder
