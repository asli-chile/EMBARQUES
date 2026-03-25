import Head from 'next/head'
import Header from '../src/components/Header'
import Hero from '../src/components/Hero'
import QuienesSomos from '../src/components/QuienesSomos'
import NuestraHistoria from '../src/components/NuestraHistoria'
import Servicios from '../src/components/Servicios'
import NuestroEquipo from '../src/components/NuestroEquipo'
import AsesoriaComercioInternacional from '../src/components/AsesoriaComercioInternacional'
import ClientesPrincipales from '../src/components/ClientesPrincipales'
import SomosParteDe from '../src/components/SomosParteDe'
import NavierasPrincipales from '../src/components/NavierasPrincipales'
import Ubicacion from '../src/components/Ubicacion'
import Footer from '../src/components/Footer'

/**
 * Página de inicio (Home) de ASLI
 * Integra todas las secciones según el diseño actual
 */
const Home = () => {
  return (
    <>
      <Head>
        <title>ASLI - Asesorías y Servicios Logísticos Integrales</title>
        <meta
          name="description"
          content="ASLI - Asesorías y Servicios Logísticos Integrales Ltda. Exportación, importación, coordinación naviera y transporte terrestre especializado en fruta fresca y congelada. Curicó, Maule."
        />
        <link
          rel="icon"
          type="image/png"
          href="/img/logoblanco.png"
        />
        <link
          rel="apple-touch-icon"
          href="/img/logoblanco.png"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <div className="min-h-screen flex flex-col bg-asli-dark">
        <Header />
        <main className="flex-grow">
          <Hero />
          <QuienesSomos />
          <NuestraHistoria />
          <Servicios />
          <NuestroEquipo />
          <AsesoriaComercioInternacional />
          <ClientesPrincipales />
          <SomosParteDe />
          <NavierasPrincipales />
          <Ubicacion />
        </main>
        <Footer />
      </div>
    </>
  )
}

export default Home
