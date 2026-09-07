import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { applyTheme, readTheme, setTheme as persistTheme, toggleTheme } from '../lib/theme'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState('light')

  useEffect(() => {
    const initial = readTheme()
    setThemeState(initial)
    applyTheme(initial)
  }, [])

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== 'asli-theme') return
      if (e.newValue === 'light' || e.newValue === 'dark') {
        setThemeState(e.newValue)
        applyTheme(e.newValue)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const changeTheme = useCallback((next) => {
    persistTheme(next)
    setThemeState(next)
  }, [])

  const onToggle = useCallback(() => {
    setThemeState((prev) => toggleTheme(prev))
  }, [])

  const value = useMemo(
    () => ({ theme, changeTheme, onToggle }),
    [theme, changeTheme, onToggle]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme debe usarse dentro de ThemeProvider')
  }
  return [ctx.theme, ctx.changeTheme, ctx.onToggle]
}
