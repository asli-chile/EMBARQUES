import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react'
import dict from './translations'

const LangContext = createContext(null)
const LANG_STORAGE_KEY = 'asli_lang'
const DEFAULT_LANG = 'es'
const SUPPORTED_LANGS = ['es', 'en', 'zh']

function detectLangFromBrowser() {
  if (typeof navigator === 'undefined') return null
  const browserLang = (navigator.language || '').toLowerCase()
  if (browserLang.startsWith('zh')) return 'zh'
  if (browserLang.startsWith('en')) return 'en'
  return null
}

export function LangProvider({ children }) {
  const [lang, setLang] = useState(DEFAULT_LANG)

  // useLayoutEffect: aplica idioma guardado / navegador ANTES del paint y ANTES
  // de los useEffect de persistencia. Si esto fuera useEffect, el efecto [lang]
  // escribiría "es" en localStorage y borraría el idioma guardado (en/zh).
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const saved = window.localStorage.getItem(LANG_STORAGE_KEY)
      if (saved && SUPPORTED_LANGS.includes(saved)) {
        setLang(saved)
        return
      }
      const detected = detectLangFromBrowser()
      if (detected) setLang(detected)
    } catch {
      // private mode / storage bloqueado
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, lang)
    } catch {
      // ignore
    }
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
    <LangContext.Provider
      value={{ lang, setLang, cycleLang, t, supportedLangs: SUPPORTED_LANGS }}
    >
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) {
    return {
      lang: DEFAULT_LANG,
      setLang: () => {},
      cycleLang: () => {},
      t: dict[DEFAULT_LANG],
      supportedLangs: SUPPORTED_LANGS,
    }
  }
  return ctx
}
