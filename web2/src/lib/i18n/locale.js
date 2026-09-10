export const LOCALE_KEY = 'asli-locale'

/** @typedef {'es' | 'en' | 'zh'} AsliLocale */

const LOCALES = new Set(['es', 'en', 'zh'])

/** @param {string | null | undefined} value @returns {value is AsliLocale} */
export function isAsliLocale(value) {
  return LOCALES.has(value)
}

/** @param {AsliLocale} locale */
export function htmlLang(locale) {
  if (locale === 'zh') return 'zh-CN'
  return locale
}

/** @param {AsliLocale} locale */
export function ogLocale(locale) {
  if (locale === 'zh') return 'zh_CN'
  if (locale === 'en') return 'en_US'
  return 'es_CL'
}

/** @returns {AsliLocale} */
export function readLocale() {
  try {
    if (typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search).get('lang')
      if (isAsliLocale(q)) {
        try {
          localStorage.setItem(LOCALE_KEY, q)
        } catch {
          /* ignore */
        }
        return q
      }
    }
    const stored = localStorage.getItem(LOCALE_KEY)
    if (isAsliLocale(stored)) return stored
  } catch {
    /* ignore */
  }
  if (typeof navigator !== 'undefined') {
    const lang = navigator.language?.toLowerCase() ?? ''
    if (lang.startsWith('zh')) return 'zh'
    if (lang.startsWith('en')) return 'en'
  }
  return 'es'
}

/** @param {AsliLocale} locale */
export function applyLocale(locale) {
  document.documentElement.lang = htmlLang(locale)
  document.documentElement.dataset.locale = locale
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
  const order = ['es', 'zh', 'en']
  const idx = order.indexOf(current)
  const next = order[(idx + 1) % order.length]
  setLocale(next)
  return next
}

export const LOCALE_BOOT_SCRIPT = `(function(){try{var k=${JSON.stringify(LOCALE_KEY)};var q=new URLSearchParams(location.search).get('lang');var t=null;if(q==='es'||q==='en'||q==='zh'){t=q;try{localStorage.setItem(k,t)}catch(e){}}else{t=localStorage.getItem(k);if(t!=='es'&&t!=='en'&&t!=='zh'){var nav=(navigator.language||'').toLowerCase();t=nav.indexOf('zh')===0?'zh':nav.indexOf('en')===0?'en':'es'}}document.documentElement.lang=t==='zh'?'zh-CN':t;document.documentElement.setAttribute('data-locale',t)}catch(e){}})();`
