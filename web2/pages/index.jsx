import Head from 'next/head'
import Header from '../src/components/Header'
import Hero from '../src/components/Hero'
import Estadisticas from '../src/components/Estadisticas'
import Servicios from '../src/components/Servicios'
import Proceso from '../src/components/Proceso'
import Confianza from '../src/components/Confianza'
import Ubicacion from '../src/components/Ubicacion'
import Footer from '../src/components/Footer'

/**
 * Home ASLI — landing conversional con scroll suave y reveals
 */
const Home = () => {
  return (
    <>
      <Head>
        <title>ASLI — Asesorías y Servicios Logísticos Integrales</title>
        <meta
          name="description"
          content="ASLI — Asesorías y Servicios Logísticos Integrales Ltda. Exportación, importación, coordinación naviera y transporte terrestre especializado en fruta fresca y congelada. Curicó, Maule."
        />
        <link rel="icon" type="image/png" href="/img/logoblanco.png" />
        <link rel="apple-touch-icon" href="/img/logoblanco.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <div className="min-h-screen flex flex-col bg-[#F7F5F2]">
        <Header />
        <main className="flex-grow">
          <Hero />
          <Estadisticas />
          <Servicios limit={6} />
          <Proceso />
          <Confianza />
          <Ubicacion />
        </main>
        <Footer />
      </div>
    </>
  )
}

export default Home
