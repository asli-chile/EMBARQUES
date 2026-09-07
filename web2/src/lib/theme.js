export const THEME_KEY = 'asli-theme'

/** @typedef {'light' | 'dark'} AsliTheme */

/**
 * Lee el tema guardado. Sin preferencia previa → modo claro.
 * @returns {AsliTheme}
 */
export function readTheme() {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    /* ignore */
  }
  return 'light'
}

/**
 * Aplica el tema en <html> y meta theme-color.
 * @param {AsliTheme} theme
 */
export function applyTheme(theme) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.dataset.theme = theme
  root.style.colorScheme = theme

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0b1220' : '#11224E')
}

/**
 * Persiste y aplica.
 * @param {AsliTheme} theme
 */
export function setTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    /* ignore */
  }
  applyTheme(theme)
}

/**
 * Alterna claro ↔ oscuro.
 * @param {AsliTheme} current
 * @returns {AsliTheme}
 */
export function toggleTheme(current) {
  const next = current === 'dark' ? 'light' : 'dark'
  setTheme(next)
  return next
}

/**
 * Script inline para _document: evita flash al cargar.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_KEY)};var t=localStorage.getItem(k);if(t!=='light'&&t!=='dark'){t='light'}var r=document.documentElement;r.classList.toggle('dark',t==='dark');r.setAttribute('data-theme',t);r.style.colorScheme=t}catch(e){}})();`
