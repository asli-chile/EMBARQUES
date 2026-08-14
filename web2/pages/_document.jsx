import { Head, Html, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="es">
      <Head>
        <link rel="icon" href="/favicon.ico?v=5" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png?v=5" />
        <link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png?v=5" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=5" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#11224E" />
        <meta name="application-name" content="ASLI" />
        <meta name="apple-mobile-web-app-title" content="ASLI" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Syne:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
