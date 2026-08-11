import { useEffect } from 'react'
import '../src/index.css'
import { LangProvider } from '../src/lib/LangContext'

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    let lenis, rafId
    const initLenis = async () => {
      const { default: Lenis } = await import('lenis')
      lenis = new Lenis({ duration: 1.2, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true, wheelMultiplier: 0.9 })
      const raf = time => { lenis.raf(time); rafId = requestAnimationFrame(raf) }
      rafId = requestAnimationFrame(raf)
    }
    initLenis()
    return () => { if (rafId) cancelAnimationFrame(rafId); if (lenis) lenis.destroy() }
  }, [])

  return (
    <LangProvider>
      <Component {...pageProps} />
    </LangProvider>
  )
}

export default MyApp
