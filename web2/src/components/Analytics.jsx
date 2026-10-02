import Script from 'next/script'
import { Analytics as VercelAnalytics } from '@vercel/analytics/react'
import { GA_ID } from '../lib/analytics'

/**
 * Medición del sitio público.
 * - Vercel Web Analytics: siempre (hay que activarlo una vez en el panel de Vercel).
 * - GA4: solo si existe NEXT_PUBLIC_GA_ID.
 */
export function Analytics() {
  return (
    <>
      <VercelAnalytics />
      {GA_ID ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA_ID}');`}
          </Script>
        </>
      ) : null}
    </>
  )
}
