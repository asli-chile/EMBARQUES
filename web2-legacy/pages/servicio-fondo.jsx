import Head from 'next/head'
import Header from '../src/components/Header'
import AnimatedHeaderNetwork from '../src/components/AnimatedHeaderNetwork'

export default function ServicioFondoPage() {
  return (
    <>
      <Head>
        <title>Prueba de fondo | ASLI</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="fixed inset-0 z-0 h-[100dvh] min-h-[100dvh] w-full max-w-none bg-gradient-to-b from-blue-900 via-blue-950 to-[#020308]">
        <AnimatedHeaderNetwork />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col text-white">
        <Header />
        <main className="flex-grow" />
      </div>
    </>
  )
}
