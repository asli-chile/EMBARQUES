import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import dict from './translations'

const LangContext = createContext(null)
const LANG_STORAGE_KEY = 'asli_lang'
const DEFAULT_LANG = 'es'
const SUPPORTED_LANGS = ['es', 'en', 'zh']

export function LangProvider({ children }) {
  const [lang, setLang] = useState(DEFAULT_LANG)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = window.localStorage.getItem(LANG_STORAGE_KEY)
    if (saved && SUPPORTED_LANGS.includes(saved)) {
      setLang(saved)
      return
    }

    const browserLang = (navigator.language || '').toLowerCase()
    if (browserLang.startsWith('zh')) {
      setLang('zh')
      return
    }
    if (browserLang.startsWith('en')) {
      setLang('en')
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(LANG_STORAGE_KEY, lang)
    document.documentElement.lang = lang
  }, [lang])

  const t = useMemo(() => dict[lang] || dict[DEFAULT_LANG], [lang])

  const cycleLang = () => {
    setLang((prev) => {
      const idx = SUPPORTED_LANGS.indexOf(prev)
      return SUPPORTED_LANGS[(idx + 1) % SUPPORTED_LANGS.length]
    })
  }

  return (
    <LangContext.Provider value={{ lang, setLang, cycleLang, t, supportedLangs: SUPPORTED_LANGS }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  return useContext(LangContext)
}
