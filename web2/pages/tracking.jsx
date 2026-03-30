import Head from 'next/head'
import { motion } from 'framer-motion'
import Header from '../src/components/Header'
import Footer from '../src/components/Footer'
import Tracking from '../src/components/Tracking'
import { useLang } from '../src/lib/LangContext'

const TrackingPage = () => {
  const { t, lang } = useLang()

  return (
    <>
    <Head>
      <title>{lang === 'en' ? 'Cargo Tracking — ASLI Logistics' : lang === 'zh' ? '货物追踪 — ASLI 物流' : 'Tracking de Cargas — ASLI Logística'}</title>
      <meta name="description" content={lang === 'en' ? 'Track your cargo in real time. Access official tracking directly with the shipping line or airline.' : lang === 'zh' ? '实时查询货物状态，直接进入船公司或航空公司的官方追踪系统。' : 'Consulta el estado de tus cargas en tiempo real. Accede al seguimiento oficial directamente con la naviera o aerolínea.'} />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    </Head>

    <div className="min-h-screen flex flex-col bg-asli-dark">
      <Header />

      <main className="flex-grow pt-24 md:pt-28">

        {/* Hero */}
        <section className="relative py-20 md:py-28 bg-asli-dark overflow-hidden">
          {/* Background decoration */}
          <div
            className="absolute right-0 top-1/2 -translate-y-1/2 font-display font-black text-white/[0.025] select-none pointer-events-none leading-none"
            style={{ fontSize: 'clamp(10rem, 20vw, 18rem)' }}
            aria-hidden
          >
            TRACK
          </div>

          {/* Teal radial glow */}
          <div
            className="absolute left-1/4 top-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(0,122,123,0.08) 0%, transparent 70%)' }}
          />

          <div className="container mx-auto px-6 lg:px-10 relative z-10">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
              className="max-w-2xl"
            >
              <motion.div
                variants={{ hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0, transition: { duration: 0.6 } } }}
                className="flex items-center gap-3 mb-5"
              >
                <span className="w-8 h-px bg-asli-primary" />
                <span className="eyebrow">{t.tracking.eyebrow}</span>
              </motion.div>

              <motion.h1
                variants={{ hidden: { opacity: 0, y: 28 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22,1,0.36,1] } } }}
                className="font-display font-black text-white mb-5"
                style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', lineHeight: 1.05, letterSpacing: '-0.03em' }}
              >
                Tracking{' '}
                <em className="not-italic text-asli-primary">{t.tracking.titleSpan}</em>
              </motion.h1>

              <motion.p
                variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.1 } } }}
                className="text-white/55 text-lg md:text-xl leading-relaxed font-light"
              >
                {t.tracking.sub}
              </motion.p>
            </motion.div>
          </div>
        </section>

        {/* Tracking component */}
        <Tracking />

        {/* CTA */}
        <section className="py-20 md:py-28 bg-asli-secondary">
          <div className="container mx-auto px-6 lg:px-10">
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-2xl mx-auto text-center"
            >
              <p className="eyebrow mb-4">{t.tracking.ctaEyebrow}</p>
              <h2
                className="font-display font-black text-white mb-5"
                style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', lineHeight: 1.1, letterSpacing: '-0.02em' }}
              >
                {t.tracking.ctaTitle}{' '}
                <em className="not-italic text-asli-primary">{t.tracking.ctaSpan}</em>
              </h2>
              <p className="text-white/55 text-lg font-light mb-8">
                {t.tracking.ctaSub}
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <a
                  href="https://mail.google.com/mail/?view=cm&to=informaciones@asli.cl&su=Consulta sobre tracking"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-asli-accent text-white font-semibold hover:bg-asli-accent/90 transition-all duration-300 shadow-lg shadow-asli-accent/20"
                >
                  {t.tracking.ctaBtn}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </a>
                <a
                  href="https://api.whatsapp.com/send/?phone=56968394225"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full border border-white/20 text-white font-semibold hover:border-white/40 transition-all duration-300"
                >
                  WhatsApp
                </a>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  </>
  )
}

export default TrackingPage
