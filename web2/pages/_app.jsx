import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { Fira_Sans, Fira_Sans_Condensed } from 'next/font/google'
import '../src/index.css'
import { scrollToHash } from '../src/lib/scrollToHash'
import { ThemeProvider } from '../src/hooks/useTheme'
import { LocaleProvider } from '../src/hooks/useLocale'
import { Analytics } from '../src/components/Analytics'

/*
 * Tipografía de marca: Fira Sans (texto) y Fira Sans Condensed (títulos), la
 * misma del portal ASLI. next/font las sirve desde el propio dominio y solo
 * con el subconjunto latino.
 *
 * Antes se pedían Syne + Manrope + Noto Sans SC a Google Fonts desde
 * _document, y Next incrustaba ese CSS en cada página: 417 KB de @font-face
 * bloqueando el pintado, la mayoría para chino. Para chino ahora se usan las
 * fuentes del sistema (PingFang SC / Microsoft YaHei), que además cargan en
 * China, donde Google Fonts no llega.
 */
const firaSans = Fira_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

const firaSansCondensed = Fira_Sans_Condensed({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  display: 'swap',
})

function MyApp({ Component, pageProps }) {
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!window.location.hash) return
    const t = window.setTimeout(() => scrollToHash(window.location.hash), 80)
    return () => window.clearTimeout(t)
  }, [router.asPath])

  return (
    <>
      <style jsx global>{`
        :root {
          --font-fira-sans: ${firaSans.style.fontFamily};
          --font-fira-condensed: ${firaSansCondensed.style.fontFamily};
        }
      `}</style>
      <LocaleProvider>
        <ThemeProvider>
          <Component {...pageProps} />
        </ThemeProvider>
      </LocaleProvider>
      <Analytics />
    </>
  )
}

export default MyApp
