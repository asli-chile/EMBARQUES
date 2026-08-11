import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import '../src/index.css'
import PageSkeleton from '../src/components/PageSkeleton'
import { scrollToHash } from '../src/lib/scrollToHash'

function MyApp({ Component, pageProps }) {
  const router = useRouter()
  const [phase, setPhase] = useState('skeleton') // skeleton | entering | ready

  useEffect(() => {
    const minMs = 900
    const start = Date.now()
    let done = false
    let timers = []

    const finishSkeleton = () => {
      if (done) return
      done = true
      const left = Math.max(0, minMs - (Date.now() - start))
      timers.push(
        window.setTimeout(() => {
          setPhase('entering')
          timers.push(window.setTimeout(() => setPhase('ready'), 200))
        }, left)
      )
    }

    if (document.readyState === 'complete') {
      finishSkeleton()
    } else {
      window.addEventListener('load', finishSkeleton, { once: true })
    }

    timers.push(window.setTimeout(finishSkeleton, 1700))

    return () => {
      timers.forEach(clearTimeout)
      window.removeEventListener('load', finishSkeleton)
    }
  }, [])

  useEffect(() => {
    const onStart = () => setPhase('skeleton')
    const onDone = () => {
      setPhase('entering')
      window.setTimeout(() => setPhase('ready'), 100)
    }

    router.events.on('routeChangeStart', onStart)
    router.events.on('routeChangeComplete', onDone)
    router.events.on('routeChangeError', onDone)

    return () => {
      router.events.off('routeChangeStart', onStart)
      router.events.off('routeChangeComplete', onDone)
      router.events.off('routeChangeError', onDone)
    }
  }, [router.events])

  // Tras el skeleton / cambio de ruta, ir a la sección del hash (#contacto, etc.)
  useEffect(() => {
    if (phase !== 'ready') return
    if (typeof window === 'undefined') return
    if (!window.location.hash) return

    const t = window.setTimeout(() => {
      scrollToHash(window.location.hash)
    }, 120)

    return () => window.clearTimeout(t)
  }, [phase, router.asPath])

  if (phase === 'skeleton') {
    return <PageSkeleton />
  }

  return (
    <div
      style={{
        opacity: phase === 'ready' || phase === 'entering' ? 1 : 0,
        transform: phase === 'entering' || phase === 'ready' ? 'none' : 'translateY(16px)',
        transition: 'opacity 0.9s cubic-bezier(0.22, 1, 0.36, 1), transform 0.9s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <Component {...pageProps} />
    </div>
  )
}

export default MyApp
