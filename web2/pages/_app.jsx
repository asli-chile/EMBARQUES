import { useEffect } from 'react'
import { useRouter } from 'next/router'
import '../src/index.css'
import { scrollToHash } from '../src/lib/scrollToHash'

function MyApp({ Component, pageProps }) {
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!window.location.hash) return
    const t = window.setTimeout(() => scrollToHash(window.location.hash), 80)
    return () => window.clearTimeout(t)
  }, [router.asPath])

  return <Component {...pageProps} />
}

export default MyApp
