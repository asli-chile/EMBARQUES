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
import { useLocale } from '../src/hooks/useLocale'
import { htmlLang } from '../src/lib/i18n/locale'

/**
 * Home ASLI — landing conversional con scroll suave y reveals
 */
const Home = () => {
  const { t, locale } = useLocale()
  const seo = t.homeSeo

  return (
    <>
      <Seo
        title={seo.title}
        description={seo.description}
        path="/"
        jsonLd={buildHomeJsonLd({
          inLanguage: htmlLang(locale),
          description: seo.description,
          websiteDescription: t.footer?.tagline,
        })}
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
