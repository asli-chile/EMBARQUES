/**
 * Scroll suave a un ancla (#contacto, #servicios, etc.)
 * Reintenta un poco por si el skeleton/hidratación aún no montó la sección.
 */
export function scrollToHash(hash, { retries = 20, delay = 80 } = {}) {
  if (!hash || hash === '#') return

  const id = hash.startsWith('#') ? hash.slice(1) : hash

  const tryScroll = (left) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    if (left > 0) {
      window.setTimeout(() => tryScroll(left - 1), delay)
    }
  }

  tryScroll(retries)
}

/**
 * Navega a una sección del home. Si ya estamos en /, solo hace scroll.
 */
export function goToHomeSection(hash, closeMenu) {
  if (typeof window === 'undefined') return

  const targetHash = hash.startsWith('#') ? hash : `#${hash}`
  const onHome = window.location.pathname === '/' || window.location.pathname === ''

  closeMenu?.()

  if (onHome) {
    if (window.location.hash !== targetHash) {
      window.history.pushState(null, '', `/${targetHash}`)
    }
    scrollToHash(targetHash)
    return
  }

  window.location.href = `/${targetHash}`
}
