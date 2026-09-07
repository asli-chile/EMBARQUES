export const LOCALE_KEY = 'asli-locale'

/** @typedef {'es' | 'en'} AsliLocale */

/** @returns {AsliLocale} */
export function readLocale() {
  try {
    const stored = localStorage.getItem(LOCALE_KEY)
    if (stored === 'es' || stored === 'en') return stored
  } catch {
    /* ignore */
  }
  if (typeof navigator !== 'undefined') {
    const lang = navigator.language?.toLowerCase() ?? ''
    if (lang.startsWith('en')) return 'en'
  }
  return 'es'
}

/** @param {AsliLocale} locale */
export function applyLocale(locale) {
  document.documentElement.lang = locale
}

/** @param {AsliLocale} locale */
export function setLocale(locale) {
  try {
    localStorage.setItem(LOCALE_KEY, locale)
  } catch {
    /* ignore */
  }
  applyLocale(locale)
}

/** @param {AsliLocale} current @returns {AsliLocale} */
export function toggleLocale(current) {
  const next = current === 'es' ? 'en' : 'es'
  setLocale(next)
  return next
}

export const LOCALE_BOOT_SCRIPT = `(function(){try{var k=${JSON.stringify(LOCALE_KEY)};var t=localStorage.getItem(k);if(t!=='es'&&t!=='en'){t=(navigator.language||'').toLowerCase().indexOf('en')===0?'en':'es'}document.documentElement.lang=t}catch(e){}})();`
