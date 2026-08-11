import Head from 'next/head'
import Header from '../src/components/Header'
import Footer from '../src/components/Footer'
import { useLang } from '../src/lib/LangContext'

const I18N = {
  es: {
    title: 'Presentación - ASLI - Asesorías y Servicios Logísticos Integrales',
    desc: 'Conoce más sobre ASLI - Asesorías y Servicios Logísticos Integrales. Descarga nuestra presentación corporativa.',
    heroTitle: 'PRESENTACIÓN DE LA EMPRESA',
    heroSub: 'Conoce más sobre ASLI y nuestros servicios',
    boxTitle: 'Presentación ASLI',
    download: 'Descargar PDF',
    ctaTitle: '¿Tienes preguntas sobre nuestros servicios?',
    ctaSub: 'Contáctanos y te ayudaremos con cualquier consulta',
    ctaBtn: 'CONTACTAR',
    iframeTitle: 'Presentación ASLI',
  },
  en: {
    title: 'Presentation - ASLI - Integral Logistics Advisory and Services',
    desc: 'Learn more about ASLI and download our corporate presentation.',
    heroTitle: 'COMPANY PRESENTATION',
    heroSub: 'Learn more about ASLI and our services',
    boxTitle: 'ASLI Presentation',
    download: 'Download PDF',
    ctaTitle: 'Do you have questions about our services?',
    ctaSub: 'Contact us and we will help you with any inquiry',
    ctaBtn: 'CONTACT',
    iframeTitle: 'ASLI presentation',
  },
  zh: {
    title: '企业介绍 - ASLI 综合物流服务',
    desc: '了解更多 ASLI 信息并下载我们的企业介绍。',
    heroTitle: '公司介绍',
    heroSub: '进一步了解 ASLI 及我们的服务',
    boxTitle: 'ASLI 企业介绍',
    download: '下载 PDF',
    ctaTitle: '对我们的服务有疑问吗？',
    ctaSub: '联系我们，我们将协助您解决任何问题',
    ctaBtn: '联系',
    iframeTitle: 'ASLI 企业介绍',
  },
}

const PresentacionPage = () => {
  const { lang } = useLang()
  const tr = I18N[lang] || I18N.es

  return (
    <>
      <Head>
        <title>{tr.title}</title>
        <meta
          name="description"
          content={tr.desc}
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <div className="min-h-screen flex flex-col bg-asli-dark">
        <Header />
        <main className="flex-grow">
          {/* Hero Section */}
          <section className="py-20 md:py-32 bg-asli-dark">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-4xl mx-auto">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
                  {tr.heroTitle}
                </h1>
                <p className="text-xl md:text-2xl text-white/90 leading-relaxed">
                  {tr.heroSub}
                </p>
              </div>
            </div>
          </section>

          {/* PDF Viewer Section */}
          <section className="py-8 md:py-16 bg-asli-dark">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-5xl mx-auto">
                <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
                  <div className="bg-asli-primary text-white px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl md:text-2xl font-bold">
                      {tr.boxTitle}
                    </h2>
                    <a
                      href="/presentacion-asli.pdf"
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white text-asli-primary px-4 py-2 rounded-md hover:bg-opacity-90 transition-all duration-200 text-sm font-semibold flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      {tr.download}
                    </a>
                  </div>
                  <div className="w-full bg-gray-100" style={{ minHeight: '800px' }}>
                    <iframe
                      src="/presentacion-asli.pdf#toolbar=1&navpanes=1&scrollbar=1"
                      className="w-full border-0"
                      style={{ minHeight: '800px', height: 'calc(100vh - 300px)' }}
                      title={tr.iframeTitle}
                      allow="fullscreen"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-16 md:py-24 bg-asli-secondary/30">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-3xl mx-auto text-center">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                  {tr.ctaTitle}
                </h2>
                <p className="text-xl text-white/90 mb-8">
                  {tr.ctaSub}
                </p>
                <a
                  href="https://mail.google.com/mail/?view=cm&to=informaciones@asli.cl&su=Consulta sobre servicios"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-asli-primary text-white px-8 py-4 rounded-md hover:bg-opacity-90 transition-all duration-200 text-lg font-semibold"
                >
                  {tr.ctaBtn}
                </a>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  )
}

export default PresentacionPage
