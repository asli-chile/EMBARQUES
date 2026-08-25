/**
 * Flags de secciones que aún no van a producción.
 * En `npm run dev` quedan activas. En Vercel, solo si se define la env.
 */
export const SHOW_COTIZADOR =
  process.env.NODE_ENV === 'development' ||
  process.env.NEXT_PUBLIC_SHOW_COTIZADOR === 'true'
