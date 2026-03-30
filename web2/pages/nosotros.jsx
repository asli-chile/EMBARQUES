import Head from 'next/head'
import { motion } from 'framer-motion'
import Header from '../src/components/Header'
import Footer from '../src/components/Footer'
import NavierasPrincipales from '../src/components/NavierasPrincipales'
import ImagePlaceholder from '../src/components/ImagePlaceholder'
import { useLang } from '../src/lib/LangContext'

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
}

const VP_ONCE = { once: true, amount: 0.15 }

const EQUIPO = [
  { nombre: 'Mario Basaez', cargo: { es: 'Fundador y CEO', en: 'Founder & CEO', zh: '创始人兼首席执行官' }, foto: '/img/mariobasaez.png' },
  { nombre: 'Hans Vasquez', cargo: { es: 'Operaciones', en: 'Operations', zh: '运营' }, foto: '/img/hansv.png' },
  { nombre: 'Poliana Cisternas', cargo: { es: 'Ejecutiva Comercial', en: 'Commercial Executive', zh: '商务顾问' }, foto: '/img/poli.jpg' },
  { nombre: 'Rocio Villareal', cargo: { es: 'Inocuidad Alimentaria', en: 'Food Safety', zh: '食品安全' }, foto: '/img/rocio.png' },
  { nombre: 'Stefanie Cordova', cargo: { es: 'Administración y Finanzas', en: 'Administration and Finance', zh: '行政与财务' }, foto: '/img/stefanie.png' },
  { nombre: 'Rodrigo Casillo', cargo: { es: 'Ejecutivo comercial zona sur', en: 'Southern Zone Executive', zh: '南部区域业务顾问' }, foto: null },
  { nombre: 'Nina Scotti', cargo: { es: 'Ventas e Importaciones', en: 'Sales and Imports', zh: '销售与进口' }, foto: '/img/nina.png' },
  { nombre: 'Ricardo Lazo', cargo: { es: 'Comercio Exterior', en: 'Foreign Trade', zh: '国际贸易' }, foto: '/img/ricardolazo.png' },
  { nombre: 'Alex Cardenas', cargo: { es: 'Coordinador de Transportes', en: 'Transport Coordinator', zh: '运输协调员' }, foto: '/img/alex.png' },
  { nombre: 'Rodrigo Caceres', cargo: { es: 'Atención al Cliente', en: 'Customer Service', zh: '客户服务' }, foto: '/img/rodrigo.png' },
]

const I18N = {
  es: {
    title: 'Nosotros | ASLI Logística',
    desc: 'ASLI Logística y Comercio Exterior. Empresa especializada en coordinación logística de exportaciones e importaciones desde Curicó, Chile.',
    who: 'Quiénes somos',
    whoText:
      'ASLI Logística y Comercio Exterior es una empresa ubicada en Curicó, especializada en la coordinación logística de exportaciones e importaciones. Acompañamos a empresas de distintos sectores —especialmente del rubro frutícola— asegurando control, continuidad y visibilidad en cada etapa del proceso logístico.',
    approach: 'Nuestro enfoque',
    approachA: 'Logística gestionada',
    approachB: 'desde origen',
    approachText:
      'Creemos en una logística gestionada desde origen, donde cada etapa de la cadena está integrada para asegurar eficiencia operativa y cumplimiento en destino.',
    quote: '"No solo movemos carga — coordinamos la operación desde origen."',
    years: 'años de experiencia',
    exp: 'Experiencia y respaldo',
    expTitle: 'Contamos con experiencia en:',
    expList: [
      'Operaciones de exportación e importación',
      'Múltiples tipos de carga (perecible, refrigerada, congelada y general)',
      'Logística frutícola y cadena de frío',
      'Coordinación multimodal',
      'Operaciones de alta exigencia en temporada (especialmente cereza)',
    ],
    teamEyebrow: 'El equipo',
    team: 'Nuestro equipo',
    teamText:
      'Profesionales con experiencia en logística internacional y comercio exterior, con más de 20 años de trayectoria en el rubro.',
    partners: 'Red de trabajo internacional',
    partnersText:
      'Operamos con una red de navieras, aerolíneas y agentes internacionales en los principales mercados, asegurando continuidad operativa y cobertura global.',
    location: 'Ubicación',
    locA: 'Curicó, en el corazón',
    locB: 'de la zona frutícola',
    locText:
      'Estamos ubicados en Curicó, lo que nos permite una coordinación directa desde origen y una operación más eficiente. En el corazón de la zona frutícola más importante de Chile.',
    ctaTitle: '¿Querés trabajar con nosotros?',
    ctaText: 'Coordiná tu próxima operación con nuestro equipo.',
    ctaBtn: 'Contactar al equipo',
  },
  en: {
    title: 'About Us | ASLI Logistics',
    desc: 'ASLI Logistics and Foreign Trade. Specialized in export and import logistics coordination from Curico, Chile.',
    who: 'Who we are',
    whoText:
      'ASLI Logistics and Foreign Trade is based in Curico and specializes in export and import logistics coordination. We support companies from different sectors—especially fruit exporters—ensuring control, continuity, and visibility at every stage.',
    approach: 'Our approach',
    approachA: 'Logistics managed',
    approachB: 'from origin',
    approachText:
      'We believe in origin-managed logistics, where each stage of the chain is integrated to ensure operational efficiency and compliance at destination.',
    quote: '"We do not just move cargo — we coordinate the operation from origin."',
    years: 'years of experience',
    exp: 'Experience and support',
    expTitle: 'We have experience in:',
    expList: [
      'Export and import operations',
      'Multiple cargo types (perishable, refrigerated, frozen, and general)',
      'Fruit logistics and cold chain',
      'Multimodal coordination',
      'High-demand seasonal operations (especially cherries)',
    ],
    teamEyebrow: 'Team',
    team: 'Our team',
    teamText: 'Professionals with international logistics and foreign trade experience, with over 20 years in the industry.',
    partners: 'International network',
    partnersText:
      'We operate with a network of shipping lines, airlines, and international agents in key markets, ensuring continuity and global coverage.',
    location: 'Location',
    locA: 'Curico, in the heart',
    locB: 'of the fruit region',
    locText:
      'We are based in Curico, enabling direct origin coordination and more efficient operations in Chile’s main fruit-producing region.',
    ctaTitle: 'Want to work with us?',
    ctaText: 'Coordinate your next operation with our team.',
    ctaBtn: 'Contact the team',
  },
  zh: {
    title: '关于我们 | ASLI 物流',
    desc: 'ASLI 物流与国际贸易，位于智利库里科，专注进出口物流协调。',
    who: '关于我们',
    whoText:
      'ASLI 物流与国际贸易位于库里科，专注于进出口物流协调。我们服务多个行业，尤其果品行业，确保每个环节都具备管控、连续性与可视化。',
    approach: '我们的方法',
    approachA: '从起点管理的',
    approachB: '综合物流',
    approachText:
      '我们强调从起点管理物流，让供应链每一阶段协同运作，确保效率与目的地合规。',
    quote: '“我们不只是运输货物——我们从起点协调整项业务。”',
    years: '年行业经验',
    exp: '经验与保障',
    expTitle: '我们的经验包括：',
    expList: [
      '进出口操作经验',
      '多种货物类型（易腐、冷藏、冷冻和普货）',
      '果品物流与冷链经验',
      '多式联运协调',
      '旺季高强度操作经验（尤其樱桃季）',
    ],
    teamEyebrow: '团队',
    team: '我们的团队',
    teamText: '团队成员拥有国际物流与外贸经验，行业历程超过 20 年。',
    partners: '国际合作网络',
    partnersText:
      '我们与主要市场中的船公司、航空公司和国际代理合作，保障运营连续性与全球覆盖。',
    location: '位置',
    locA: '库里科，位于',
    locB: '果品核心产区',
    locText:
      '我们位于库里科，可实现从起点的直接协调，提高整体运营效率，覆盖智利最重要的果品区域。',
    ctaTitle: '想与我们合作吗？',
    ctaText: '和我们的团队一起协调您的下一次操作。',
    ctaBtn: '联系团队',
  },
}

export default function NosotrosPage() {
  const { lang } = useLang()
  const tr = I18N[lang] || I18N.es

  return (
    <>
      <Head>
        <title>{tr.title}</title>
        <meta name="description" content={tr.desc} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div className="min-h-screen flex flex-col bg-asli-dark">
        <Header />
        <main className="flex-grow">
          <section className="relative pt-36 pb-20 md:pb-28 overflow-hidden bg-gradient-to-b from-asli-deep to-asli-dark">
            <div className="absolute inset-0 overflow-hidden opacity-20"><ImagePlaceholder variant="hero" src="/img/edificio.webp" /></div>
            <div className="absolute inset-0 bg-gradient-to-r from-asli-deep via-asli-deep/85 to-asli-deep/60" />
            <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-asli-primary/50 to-transparent" />
            <div className="relative z-10 container mx-auto px-6 lg:px-10 max-w-4xl">
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="flex items-center gap-3 mb-5">
                <span className="w-6 h-px bg-asli-primary" />
                <span className="eyebrow">{tr.who}</span>
              </motion.div>
              <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75, delay: 0.15, ease: [0.22, 1, 0.36, 1] }} className="font-display font-black text-white leading-tight mb-6" style={{ fontSize: 'clamp(2rem, 5vw, 3.8rem)', letterSpacing: '-0.025em' }}>
                {tr.who}
              </motion.h1>
              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }} className="text-white/65 text-lg leading-relaxed max-w-3xl">{tr.whoText}</motion.p>
            </div>
          </section>

          <section className="py-20 md:py-28 bg-asli-dark border-y border-white/[0.06]">
            <div className="container mx-auto px-6 lg:px-10">
              <div className="grid lg:grid-cols-2 gap-16 items-center">
                <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={VP_ONCE}>
                  <div className="flex items-center gap-3 mb-4"><span className="w-6 h-px bg-asli-primary" /><span className="eyebrow">{tr.approach}</span></div>
                  <h2 className="font-display font-black text-white leading-tight mb-6" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', letterSpacing: '-0.02em' }}>{tr.approachA}<br /><span className="text-asli-primary">{tr.approachB}</span></h2>
                  <p className="text-white/65 text-[16px] leading-relaxed mb-5">{tr.approachText}</p>
                  <div className="border-l-2 border-asli-primary pl-5 py-1"><p className="text-white font-semibold text-lg italic">{tr.quote}</p></div>
                </motion.div>
                <motion.div variants={fadeUp} custom={1} initial="hidden" whileInView="visible" viewport={VP_ONCE} className="relative">
                  <div className="relative rounded-2xl overflow-hidden aspect-[4/3] shadow-2xl shadow-black/40 ring-1 ring-white/10"><div className="absolute inset-0"><ImagePlaceholder variant="hero" src="/img/world.webp" className="rounded-none" /></div><div className="absolute inset-0 bg-gradient-to-t from-asli-dark/40 to-transparent" /></div>
                </motion.div>
              </div>
            </div>
          </section>

          <section className="py-20 md:py-28 bg-asli-secondary/25 border-b border-white/[0.06]">
            <div className="container mx-auto px-6 lg:px-10">
              <div className="grid lg:grid-cols-2 gap-16 items-center">
                <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={VP_ONCE} className="relative order-2 lg:order-1">
                  <div className="relative rounded-2xl overflow-hidden aspect-video shadow-2xl shadow-black/30 ring-1 ring-white/10"><div className="absolute inset-0"><ImagePlaceholder variant="hero" src="/img/barco.webp" className="rounded-none" /></div></div>
                  <div className="absolute -bottom-4 -right-4 glass rounded-xl px-5 py-4 shadow-xl hidden md:block"><p className="font-display font-black text-asli-primary" style={{ fontSize: '1.8rem', lineHeight: 1 }}>20+</p><p className="text-white/55 text-xs mt-1 tracking-wide">{tr.years}</p></div>
                </motion.div>
                <motion.div variants={fadeUp} custom={1} initial="hidden" whileInView="visible" viewport={VP_ONCE} className="order-1 lg:order-2">
                  <div className="flex items-center gap-3 mb-4"><span className="w-6 h-px bg-asli-primary" /><span className="eyebrow">{tr.exp}</span></div>
                  <h2 className="font-display font-black text-white leading-tight mb-6" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', letterSpacing: '-0.02em' }}>{tr.expTitle}</h2>
                  <ul className="space-y-4">
                    {tr.expList.map((item) => (
                      <li key={item} className="flex items-start gap-4 group"><div className="shrink-0 w-6 h-6 rounded-full bg-asli-primary/15 border border-asli-primary/30 flex items-center justify-center mt-0.5 group-hover:bg-asli-primary group-hover:border-asli-primary transition-all duration-300"><svg className="w-3 h-3 text-asli-primary group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg></div><p className="text-white/70 text-[15px] leading-relaxed group-hover:text-white/90 transition-colors">{item}</p></li>
                    ))}
                  </ul>
                </motion.div>
              </div>
            </div>
          </section>

          <section className="py-20 md:py-28 bg-asli-dark border-b border-white/[0.06]">
            <div className="container mx-auto px-6 lg:px-10">
              <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={VP_ONCE} className="mb-14">
                <div className="flex items-center gap-3 mb-4"><span className="w-6 h-px bg-asli-primary" /><span className="eyebrow">{tr.teamEyebrow}</span></div>
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4"><h2 className="font-display font-black text-white leading-tight" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', letterSpacing: '-0.02em' }}>{tr.team}</h2><p className="text-white/55 text-base max-w-sm leading-relaxed">{tr.teamText}</p></div>
              </motion.div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
                {EQUIPO.map((persona, i) => (
                  <motion.div key={persona.nombre} variants={fadeUp} custom={i * 0.3} initial="hidden" whileInView="visible" viewport={VP_ONCE} className="group text-center rounded-2xl p-2 transition-all duration-300 hover:bg-white/[0.03]">
                    <div className="relative rounded-2xl overflow-hidden aspect-square mb-4 shadow-lg shadow-black/30 ring-1 ring-white/10"><div className="absolute inset-0 transition-transform duration-500 group-hover:scale-105">{persona.foto ? <img src={persona.foto} alt={persona.nombre} className="absolute inset-0 w-full h-full object-cover object-top" /> : <ImagePlaceholder variant="default" className="absolute inset-0 h-full w-full min-h-0 rounded-none border-white/15" />}</div><div className="absolute inset-0 bg-gradient-to-t from-asli-dark/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400" /></div>
                    <h3 className="text-white font-semibold text-sm leading-snug mb-1">{persona.nombre}</h3>
                    <p className="text-asli-primary text-xs">{persona.cargo[lang] || persona.cargo.es}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          <section className="py-8 bg-asli-deep border-t border-white/[0.06]">
            <div className="container mx-auto px-6 lg:px-10 py-16">
              <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={VP_ONCE} className="text-center mb-12">
                <div className="flex items-center justify-center gap-3 mb-4"><span className="w-6 h-px bg-asli-primary" /><span className="eyebrow">Partners</span><span className="w-6 h-px bg-asli-primary" /></div>
                <h2 className="font-display font-black text-white leading-tight mb-5" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', letterSpacing: '-0.02em' }}>{tr.partners}</h2>
                <p className="text-white/60 text-base leading-relaxed max-w-xl mx-auto">{tr.partnersText}</p>
              </motion.div>
            </div>
            <NavierasPrincipales />
          </section>

          <section className="py-20 bg-asli-dark border-y border-white/[0.06]">
            <div className="container mx-auto px-6 lg:px-10">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={VP_ONCE}>
                  <div className="flex items-center gap-3 mb-4"><span className="w-6 h-px bg-asli-primary" /><span className="eyebrow">{tr.location}</span></div>
                  <h2 className="font-display font-black text-white leading-tight mb-5" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', letterSpacing: '-0.02em' }}>{tr.locA}<br /><span className="text-asli-primary">{tr.locB}</span></h2>
                  <p className="text-white/65 text-base leading-relaxed mb-8">{tr.locText}</p>
                  <div className="flex items-center gap-3 glass rounded-xl px-5 py-4 w-fit"><svg className="w-5 h-5 text-asli-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg><div><p className="text-white font-medium">Curico, Chile</p><p className="text-white/45 text-xs">Region del Maule</p></div></div>
                </motion.div>
                <motion.div variants={fadeUp} custom={1} initial="hidden" whileInView="visible" viewport={VP_ONCE} className="relative"><div className="relative rounded-2xl overflow-hidden aspect-video shadow-2xl shadow-black/30 ring-1 ring-white/10"><div className="absolute inset-0"><ImagePlaceholder variant="hero" src="/img/edificio.webp" className="rounded-none" /></div><div className="absolute inset-0 bg-gradient-to-t from-asli-dark/30 to-transparent" /></div></motion.div>
              </div>
            </div>
          </section>

          <section className="py-20 bg-asli-deep border-t border-white/[0.06]">
            <div className="container mx-auto px-6 lg:px-10 text-center">
              <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={VP_ONCE}>
                <h3 className="font-display font-black text-white mb-4 leading-tight" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', letterSpacing: '-0.02em' }}>{tr.ctaTitle}</h3>
                <p className="text-white/60 text-lg mb-8 max-w-md mx-auto">{tr.ctaText}</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center"><a href="/contacto" className="group inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-asli-primary text-white font-semibold hover:bg-asli-primary/85 transition-all duration-300 shadow-lg shadow-asli-primary/20 hover:-translate-y-px">{tr.ctaBtn}<svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg></a></div>
              </motion.div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  )
}
