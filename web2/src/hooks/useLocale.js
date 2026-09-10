import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  applyLocale,
  isAsliLocale,
  readLocale,
  setLocale as persistLocale,
  toggleLocale,
} from '../lib/i18n/locale'
import { dictionaries } from '../lib/i18n/dictionaries'

const LocaleContext = createContext(null)

function dateLocaleFor(locale) {
  if (locale === 'en') return 'en-US'
  if (locale === 'zh') return 'zh-CN'
  return 'es-CL'
}

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState('es')

  useEffect(() => {
    const initial = readLocale()
    setLocaleState(initial)
    applyLocale(initial)
  }, [])

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== 'asli-locale') return
      if (isAsliLocale(e.newValue)) {
        setLocaleState(e.newValue)
        applyLocale(e.newValue)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const changeLocale = useCallback((next) => {
    if (!isAsliLocale(next)) return
    persistLocale(next)
    setLocaleState(next)
  }, [])

  const onToggle = useCallback(() => {
    setLocaleState((prev) => toggleLocale(prev))
  }, [])

  const value = useMemo(
    () => ({
      locale,
      t: dictionaries[locale] ?? dictionaries.es,
      changeLocale,
      onToggle,
      dateLocale: dateLocaleFor(locale),
    }),
    [locale, changeLocale, onToggle]
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale debe usarse dentro de LocaleProvider')
  return ctx
}
