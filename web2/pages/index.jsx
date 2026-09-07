import Header from '../src/components/Header'
import Hero from '../src/components/Hero'
import Estadisticas from '../src/components/Estadisticas'
import NuestraHistoria from '../src/components/NuestraHistoria'
import Servicios from '../src/components/Servicios'
import Proceso from '../src/components/Proceso'
import Confianza from '../src/components/Confianza'
import Cotizar from '../src/components/Cotizar'
import Ubicacion from '../src/components/Ubicacion'
import Footer from '../src/components/Footer'
import Seo, { buildHomeJsonLd } from '../src/components/Seo'

/**
 * Home ASLI — landing conversional con scroll suave y reveals
 */
const Home = () => {
  return (
    <>
      <Seo
        title="ASLI — Asesoría logística, exportación e importación | Curicó"
        description="Asesoría logística en Curicó para PYMEs y exportadores: exportación de fruta fresca, importación de mercancías, contenedores, carga aérea y marítima. ASLI, Maule."
        path="/"
        jsonLd={buildHomeJsonLd()}
      />
      <div className="min-h-screen flex flex-col bg-asli-light">
        <Header />
        <main className="flex-grow">
          <Hero />
          <Estadisticas />
          <NuestraHistoria />
          <Servicios limit={6} />
          <Proceso />
          <Confianza />
          <Cotizar />
          <Ubicacion />
        </main>
        <Footer />
      </div>
    </>
  )
}

export default Home
