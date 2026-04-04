import Head from 'next/head'
import { useRef } from 'react'
import Header from '../src/components/Header'
import Footer from '../src/components/Footer'
import ImagePlaceholder from '../src/components/ImagePlaceholder'
import { useLang } from '../src/lib/LangContext'
import { usePageScrollReveal } from '../src/hooks/usePageScrollReveal'

const SERVICIOS_ES = [
  {
    num:    '01',
    img:    '/img/logistica.webp',
    titulo: 'Planificación y coordinación logística',
    descripcion:
      'Evaluamos cada operación para definir rutas, tiempos de tránsito y costos, optimizando la planificación desde origen.',
    tags: ['Rutas óptimas', 'Tiempos de tránsito', 'Control de costos'],
  },
  {
    num:    '02',
    img:    '/img/maritimo.webp',
    titulo: 'Transporte internacional marítimo y aéreo (FCL / LCL)',
    descripcion:
      'Gestión de exportaciones e importaciones vía marítima y aérea, coordinadas desde origen hasta destino final.',
    tags: ['FCL', 'LCL', 'REEFER', 'Air cargo'],
  },
  {
    num:    '03',
    img:    '/img/camion.webp',
    titulo: 'Transporte terrestre y coordinación en origen',
    descripcion:
      'Coordinación de transporte entre origen (campo/packing), puertos, aeropuertos y destino final, asegurando continuidad operativa.',
    tags: ['Campo a puerto', 'Packing', 'Coordinación multimodal'],
  },
  {
    num:    '04',
    img:    '/img/aduana.webp',
    titulo: 'Gestión aduanera y documentación de comercio exterior',
    descripcion:
      'Coordinación de procesos aduaneros y gestión documental para exportaciones e importaciones, asegurando cumplimiento normativo.',
    tags: ['DUS', 'Certificados', 'SAG', 'Cumplimiento normativo'],
  },
  {
    num:    '05',
    img:    '/img/expo.webp',
    titulo: 'Gestión integral de operaciones de comercio exterior (end-to-end)',
    descripcion:
      'Coordinación completa de la operación logística, integrando transporte, documentación, tiempos, costos y soporte administrativo-contable, incluyendo soluciones puerta a puerta.',
    tags: ['End-to-end', 'Puerta a puerta', 'Soporte administrativo'],
  },
  {
    num:    '06',
    img:    '/img/docs.webp',
    titulo: 'Asesoría en certificación OEA (Operador Económico Autorizado)',
    descripcion:
      'Acompañamos a empresas en el proceso de preparación para la certificación OEA, enfocado en cumplimiento normativo, seguridad y eficiencia operativa.',
    tags: ['OEA', 'Cumplimiento', 'Seguridad', 'Eficiencia'],
  },
]

const SERVICIOS_EN = [
  {
    num: '01',
    img: '/img/logistica.webp',
    titulo: 'Logistics planning and coordination',
    descripcion: 'We evaluate each operation to define routes, transit times, and costs, optimizing planning from origin.',
    tags: ['Optimal routes', 'Transit times', 'Cost control'],
  },
  {
    num: '02',
    img: '/img/maritimo.webp',
    titulo: 'International sea and air transport (FCL / LCL)',
    descripcion: 'Export and import management by sea and air, coordinated from origin to final destination.',
    tags: ['FCL', 'LCL', 'REEFER', 'Air cargo'],
  },
  {
    num: '03',
    img: '/img/camion.webp',
    titulo: 'Land transport and origin coordination',
    descripcion: 'Transport coordination between origin (field/packing), ports, airports, and final destination.',
    tags: ['Field to port', 'Packing', 'Multimodal coordination'],
  },
  {
    num: '04',
    img: '/img/aduana.webp',
    titulo: 'Customs management and foreign trade documentation',
    descripcion: 'Customs process coordination and document management for exports and imports, ensuring compliance.',
    tags: ['DUS', 'Certificates', 'SAG', 'Regulatory compliance'],
  },
  {
    num: '05',
    img: '/img/expo.webp',
    titulo: 'End-to-end foreign trade operation management',
    descripcion: 'Complete logistics operation coordination including transport, documentation, timing, costs, and admin support.',
    tags: ['End-to-end', 'Door to door', 'Administrative support'],
  },
  {
    num: '06',
    img: '/img/docs.webp',
    titulo: 'OEA certification advisory (Authorized Economic Operator)',
    descripcion: 'We support companies in preparing for OEA certification, focused on compliance, security, and efficiency.',
    tags: ['OEA', 'Compliance', 'Security', 'Efficiency'],
  },
]

const SERVICIOS_ZH = [
  {
    num: '01',
    img: '/img/logistica.webp',
    titulo: '物流规划与协调',
    descripcion: '我们评估每项业务以制定路线、时效与成本，从起点优化整体规划。',
    tags: ['最优路线', '运输时效', '成本控制'],
  },
  {
    num: '02',
    img: '/img/maritimo.webp',
    titulo: '国际海运与空运（FCL / LCL）',
    descripcion: '覆盖海运与空运的进出口管理，从起点到最终目的地全程协调。',
    tags: ['FCL', 'LCL', '冷藏柜', '空运'],
  },
  {
    num: '03',
    img: '/img/camion.webp',
    titulo: '陆运与起点端协调',
    descripcion: '协调产地（农场/包装厂）、港口、机场与目的地之间的陆路运输。',
    tags: ['产地到港口', '包装厂', '多式联运协调'],
  },
  {
    num: '04',
    img: '/img/aduana.webp',
    titulo: '报关管理与外贸单证',
    descripcion: '协调进出口报关流程与单证管理，确保法规合规与流程效率。',
    tags: ['DUS', '证书', 'SAG', '合规'],
  },
  {
    num: '05',
    img: '/img/expo.webp',
    titulo: '外贸业务全流程管理（端到端）',
    descripcion: '整合运输、单证、时效、成本与行政支持，提供完整端到端协调。',
    tags: ['端到端', '门到门', '行政支持'],
  },
  {
    num: '06',
    img: '/img/docs.webp',
    titulo: 'OEA 认证咨询（授权经济运营商）',
    descripcion: '协助企业准备 OEA 认证，重点覆盖合规、安全与运营效率。',
    tags: ['OEA', '合规', '安全', '效率'],
  },
]

const COPY = {
  es: {
    title: 'Servicios | ASLI Logística',
    desc: 'Servicios logísticos integrales para exportación e importación. Transporte marítimo, aéreo, terrestre, gestión aduanera y certificación OEA.',
    eyebrow: 'Servicios',
    heroA: 'Servicios logísticos integrales',
    heroB: 'para exportación e importación',
    heroSub: 'Coordinamos operaciones desde origen, incluyendo soluciones puerta a puerta para todo tipo de carga.',
    ctaTitle: 'Coordina tu operación con',
    ctaSub: 'Te apoyamos con seguimiento y control operativo de punta a punta.',
    talk: 'Hablar con un ejecutivo',
    quote: 'Solicitar cotización',
  },
  en: {
    title: 'Services | ASLI Logistics',
    desc: 'Comprehensive logistics services for export and import. Sea, air, and land transport, customs management, and OEA certification.',
    eyebrow: 'Services',
    heroA: 'Comprehensive logistics services',
    heroB: 'for export and import',
    heroSub: 'We coordinate operations from origin, including door-to-door solutions for all cargo types.',
    ctaTitle: 'Coordinate your operation with',
    ctaSub: 'We support you with end-to-end tracking and operational control.',
    talk: 'Talk to an executive',
    quote: 'Request a quote',
  },
  zh: {
    title: '服务 | ASLI 物流',
    desc: '为进出口提供综合物流服务：海运、空运、陆运、报关管理与 OEA 认证咨询。',
    eyebrow: '服务',
    heroA: '综合物流服务',
    heroB: '覆盖进出口业务',
    heroSub: '我们从起点协调全流程，并提供适用于各类货物的门到门方案。',
    ctaTitle: '与 ASLI 一起协调您的业务',
    ctaSub: '我们提供端到端追踪与运营管控支持。',
    talk: '联系业务顾问',
    quote: '申请报价',
  },
}

const ServiciosPage = () => {
  const { lang } = useLang()
  const tr = COPY[lang] || COPY.es
  const servicios = lang === 'zh' ? SERVICIOS_ZH : lang === 'en' ? SERVICIOS_EN : SERVICIOS_ES
  const parallaxRef = useRef(null)
  const rootRef = usePageScrollReveal(parallaxRef)

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

      <div ref={rootRef} className="min-h-screen flex flex-col bg-asli-dark">
        <Header />

        <main className="flex-grow">

          {/* ── Hero de página ── */}
          <section className="relative pt-36 pb-20 md:pb-28 overflow-hidden bg-gradient-to-b from-asli-deep to-asli-dark">
            {/* Bg image (parallax) */}
            <div ref={parallaxRef} className="absolute inset-0 overflow-hidden opacity-20 will-change-transform">
              <ImagePlaceholder variant="hero" src="/img/expo.webp" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-asli-deep to-asli-deep/70" />

            {/* Accent line */}
            <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-asli-primary/50 to-transparent" />

            <div className="relative z-10 container mx-auto px-6 lg:px-10 max-w-4xl">
              <div data-hero-item className="flex items-center gap-3 mb-5">
                <span className="w-6 h-px bg-asli-primary" />
                <span className="eyebrow">{tr.eyebrow}</span>
              </div>

              <h1
                data-hero-item
                className="font-display font-black text-white leading-tight mb-6"
                style={{ fontSize: 'clamp(2rem, 5vw, 3.8rem)', letterSpacing: '-0.025em' }}
              >
                {tr.heroA}<br />
                <span className="text-asli-primary italic">{tr.heroB}</span>
              </h1>

              <p data-hero-item className="text-white/65 text-lg leading-relaxed max-w-2xl">
                {tr.heroSub}
              </p>
            </div>
          </section>

          {/* ── Lista de servicios ── */}
          <section data-page-section className="py-16 md:py-24 border-y border-white/[0.06]">
            <div className="container mx-auto px-6 lg:px-10">
              <div className="space-y-6">
                {servicios.map((svc) => (
                  <article
                    key={svc.num}
                    data-page-reveal
                    className="group grid md:grid-cols-12 gap-0 rounded-2xl overflow-hidden border border-white/[0.07] hover:border-asli-primary/25 transition-all duration-500 hover:shadow-[0_18px_36px_rgba(0,0,0,0.24)]"
                  >
                    {/* Image panel */}
                    <div className="md:col-span-3 relative aspect-video md:aspect-auto md:min-h-[200px] overflow-hidden">
                      <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-105">
                        <ImagePlaceholder variant="hero" src={svc.img} className="rounded-none" />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-asli-dark/60 md:block hidden" />
                      <div className="absolute inset-0 bg-gradient-to-t from-asli-dark/80 to-transparent md:hidden" />
                    </div>

                    {/* Content panel */}
                    <div className="md:col-span-9 bg-asli-deep/60 group-hover:bg-asli-deep/80 transition-colors duration-300 px-7 py-7 flex flex-col justify-center backdrop-blur-[1px]">
                      <div className="flex items-start gap-5">
                        {/* Number */}
                        <span
                          className="shrink-0 font-display font-black text-asli-primary/30 group-hover:text-asli-primary/60 transition-colors duration-300 leading-none mt-1"
                          style={{ fontSize: '2.2rem' }}
                        >
                          {svc.num}
                        </span>

                        {/* Text */}
                        <div className="flex-1">
                          <h2 className="font-bold text-white text-lg md:text-xl leading-snug mb-3 group-hover:text-white transition-colors">
                            {svc.titulo}
                          </h2>
                          <p className="text-white/60 text-[15px] leading-relaxed mb-4">
                            {svc.descripcion}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {svc.tags.map((tag) => (
                              <span
                                key={tag}
                                className="px-3 py-1 rounded-full text-xs font-medium border border-white/[0.08] text-white/40 group-hover:border-asli-primary/30 group-hover:text-asli-primary/70 transition-all duration-300"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* ── CTA ── */}
          <section data-page-section className="py-20 bg-asli-secondary/25 border-t border-white/[0.06]">
            <div className="container mx-auto px-6 lg:px-10 text-center">
              <div data-page-reveal>
                <h3
                  className="font-display font-black text-white mb-4 leading-tight"
                  style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.5rem)', letterSpacing: '-0.02em' }}
                >
                  {tr.ctaTitle}{' '}
                  <span className="text-asli-primary">ASLI</span>
                </h3>
                <p className="text-white/65 text-lg mb-8 max-w-md mx-auto leading-relaxed">
                  {tr.ctaSub}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a
                    href="/ejecutivos"
                    className="group inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-asli-primary text-white font-semibold hover:bg-asli-primary/85 transition-all duration-300 shadow-xl shadow-asli-primary/20 hover:-translate-y-px"
                  >
                    {tr.talk}
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </a>
                  <a
                    href="/contacto"
                    className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full border border-white/20 text-white/80 font-semibold hover:border-white/40 hover:text-white transition-all duration-300"
                  >
                    {tr.quote}
                  </a>
                </div>
              </div>
            </div>
          </section>

        </main>

        <Footer />
      </div>
    </>
  )
}

export default ServiciosPage
