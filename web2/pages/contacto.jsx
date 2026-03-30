import Head from 'next/head'
import { useState } from 'react'
import { motion } from 'framer-motion'
import Header from '../src/components/Header'
import Footer from '../src/components/Footer'
import ImagePlaceholder from '../src/components/ImagePlaceholder'
import { useLang } from '../src/lib/LangContext'

const fadeUp = {
  hidden:  { opacity: 0, y: 36 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.7, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
}

const VP_ONCE = { once: true, amount: 0.15 }

const DATOS = [
  {
    label: 'Email',
    value: 'informaciones@asli.cl',
    href:  'mailto:informaciones@asli.cl',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    color: 'text-asli-primary bg-asli-primary/10 border-asli-primary/20 hover:bg-asli-primary hover:border-asli-primary hover:text-white',
  },
  {
    label: 'WhatsApp',
    value: '+56 9 6839 4225',
    href:  'https://api.whatsapp.com/send/?phone=56968394225',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
      </svg>
    ),
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500 hover:border-emerald-500 hover:text-white',
  },
  {
    label: 'LinkedIn',
    value: 'ASLI Chile',
    href:  'https://www.linkedin.com/company/aslichile',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
    color: 'text-sky-400 bg-sky-500/10 border-sky-500/20 hover:bg-sky-500 hover:border-sky-500 hover:text-white',
  },
  {
    label: 'Ubicación',
    value: 'Curicó, Chile',
    href:  null,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    color: 'text-asli-primary bg-asli-primary/10 border-asli-primary/20',
  },
]

const inputCls =
  'w-full rounded-xl bg-asli-dark border border-white/10 px-4 py-3.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-asli-primary/60 focus:ring-1 focus:ring-asli-primary/20 transition-all duration-200'

const INITIAL_FORM = {
  nombre: '',
  empresa: '',
  email: '',
  telefono: '',
  tipo: '',
  mensaje: '',
}

const COPY = {
  es: {
    title: 'Contacto | ASLI Logística',
    desc: 'Coordina tu próxima operación de exportación o importación con ASLI. Contacto directo con ejecutivos logísticos.',
    eyebrow: 'Contacto',
    heroTitleA: 'Coordina tu próxima operación',
    heroTitleB: 'con nosotros',
    heroSub: 'Estamos disponibles para apoyar tus procesos de exportación e importación, con seguimiento y control en cada etapa.',
    contactData: 'Datos de contacto',
    opQuestion: '¿Tienes una operación en proceso?',
    opHelp: 'Te ayudamos a coordinarla de forma eficiente y sin contratiempos. También puedes contactarnos directamente vía WhatsApp o LinkedIn.',
    formTitle: 'Formulario de contacto',
    sent: '¡Solicitud enviada!',
    sentSub: 'Te responderemos a la brevedad con una propuesta ajustada a tus necesidades.',
    reset: 'Restablecer',
    name: 'Nombre',
    company: 'Empresa',
    email: 'Email',
    phone: 'Teléfono',
    operationType: 'Tipo de operación',
    select: 'Seleccionar...',
    export: 'Exportación',
    import: 'Importación',
    both: 'Ambas',
    message: 'Mensaje',
    namePh: 'Tu nombre',
    companyPh: 'Nombre de la empresa',
    emailPh: 'correo@empresa.cl',
    phonePh: '+56 9 ...',
    msgPh: 'Cuéntanos sobre tu operación, tipo de carga, destino y cualquier detalle relevante...',
    send: 'Enviar solicitud',
    responseTime: 'Te responderemos en menos de 24 horas hábiles.',
  },
  en: {
    title: 'Contact | ASLI Logistics',
    desc: 'Coordinate your next export or import operation with ASLI. Direct contact with logistics executives.',
    eyebrow: 'Contact',
    heroTitleA: 'Coordinate your next operation',
    heroTitleB: 'with us',
    heroSub: 'We are available to support your export and import processes, with tracking and control at every stage.',
    contactData: 'Contact details',
    opQuestion: 'Do you have an operation in progress?',
    opHelp: 'We help you coordinate it efficiently and without setbacks. You can also contact us directly via WhatsApp or LinkedIn.',
    formTitle: 'Contact form',
    sent: 'Request sent!',
    sentSub: 'We will reply shortly with a proposal tailored to your needs.',
    reset: 'Reset',
    name: 'Name',
    company: 'Company',
    email: 'Email',
    phone: 'Phone',
    operationType: 'Operation type',
    select: 'Select...',
    export: 'Export',
    import: 'Import',
    both: 'Both',
    message: 'Message',
    namePh: 'Your name',
    companyPh: 'Company name',
    emailPh: 'email@company.com',
    phonePh: '+56 9 ...',
    msgPh: 'Tell us about your operation, cargo type, destination, and any relevant details...',
    send: 'Send request',
    responseTime: 'We will respond within 24 business hours.',
  },
  zh: {
    title: '联系我们 | ASLI 物流',
    desc: '与 ASLI 协调您的下一次进出口操作，直接联系物流顾问。',
    eyebrow: '联系',
    heroTitleA: '与我们一起协调',
    heroTitleB: '您的下一次操作',
    heroSub: '我们可支持您的进出口流程，并在每个阶段提供追踪与管控。',
    contactData: '联系方式',
    opQuestion: '您是否有正在进行的操作？',
    opHelp: '我们可帮助您高效、顺畅地协调流程。也可通过 WhatsApp 或 LinkedIn 直接联系我们。',
    formTitle: '联系表单',
    sent: '提交成功！',
    sentSub: '我们将尽快回复并提供贴合您需求的方案。',
    reset: '重置',
    name: '姓名',
    company: '公司',
    email: '邮箱',
    phone: '电话',
    operationType: '业务类型',
    select: '请选择...',
    export: '出口',
    import: '进口',
    both: '两者',
    message: '留言',
    namePh: '请输入姓名',
    companyPh: '公司名称',
    emailPh: 'email@company.com',
    phonePh: '+56 9 ...',
    msgPh: '请告诉我们您的操作、货物类型、目的地及其他相关信息...',
    send: '发送请求',
    responseTime: '我们将在 24 个工作小时内回复。',
  },
}

const ContactoPage = () => {
  const [enviado, setEnviado] = useState(false)
  const [form, setForm] = useState({ ...INITIAL_FORM })
  const { lang } = useLang()
  const tr = COPY[lang] || COPY.es

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleReset = () => {
    setForm({ ...INITIAL_FORM })
    setEnviado(false)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const asunto = encodeURIComponent('Solicitud desde web ASLI')
    const cuerpo = encodeURIComponent(
      `Nombre: ${form.nombre}\nEmpresa: ${form.empresa}\nEmail: ${form.email}\nTelefono: ${form.telefono}\nTipo de operacion: ${form.tipo}\n\nMensaje:\n${form.mensaje}`
    )
    window.open(`mailto:informaciones@asli.cl?subject=${asunto}&body=${cuerpo}`, '_blank')
    setEnviado(true)
  }

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

          {/* ── Hero de página ── */}
          <section className="relative pt-36 pb-20 md:pb-28 overflow-hidden bg-gradient-to-b from-asli-deep to-asli-dark">
            <div className="absolute inset-0 overflow-hidden opacity-20">
              <ImagePlaceholder variant="hero" src="/img/HERO.webp" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-asli-deep via-asli-deep/85 to-asli-deep/70" />
            <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-asli-primary/50 to-transparent" />

            <div className="relative z-10 container mx-auto px-6 lg:px-10 max-w-4xl">
              <motion.div
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="flex items-center gap-3 mb-5"
              >
                <span className="w-6 h-px bg-asli-primary" />
                <span className="eyebrow">{tr.eyebrow}</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.75, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                className="font-display font-black text-white leading-tight mb-6"
                style={{ fontSize: 'clamp(2rem, 5vw, 3.8rem)', letterSpacing: '-0.025em' }}
              >
                {tr.heroTitleA}<br />
                <span className="text-asli-primary italic">{tr.heroTitleB}</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.3 }}
                className="text-white/65 text-lg leading-relaxed max-w-2xl"
              >
                {tr.heroSub}
              </motion.p>
            </div>
          </section>

          {/* ── Contenido principal ── */}
          <section className="py-16 md:py-24 border-y border-white/[0.06]">
            <div className="container mx-auto px-6 lg:px-10">
              <div className="grid lg:grid-cols-5 gap-10 items-start">

                {/* ── Columna izquierda: datos + info ── */}
                <motion.div
                  variants={fadeUp} initial="hidden" whileInView="visible" viewport={VP_ONCE}
                  className="lg:col-span-2 space-y-6"
                >
                  {/* Datos de contacto */}
                  <div>
                    <h2 className="text-white font-bold text-lg mb-5">{tr.contactData}</h2>
                    <div className="space-y-3">
                      {DATOS.map((dato) => {
                        const Tag = dato.href ? 'a' : 'div'
                        return (
                          <Tag
                            key={dato.label}
                            {...(dato.href
                              ? { href: dato.href, target: dato.href.startsWith('http') ? '_blank' : undefined, rel: 'noopener noreferrer' }
                              : {})}
                            className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 group ${dato.color}`}
                          >
                            <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-300 bg-white/5 border border-white/10 group-hover:bg-transparent group-hover:border-transparent`}>
                              {dato.icon}
                            </div>
                            <div>
                              <p className="text-[11px] uppercase tracking-widest opacity-60 mb-0.5">{dato.label}</p>
                              <p className="font-medium text-sm">{dato.value}</p>
                            </div>
                          </Tag>
                        )
                      })}
                    </div>
                  </div>

                  {/* WhatsApp note */}
                  <div className="glass rounded-2xl p-6 border border-white/[0.08]">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-asli-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <div>
                        <p className="text-white font-semibold text-sm mb-1.5">{tr.opQuestion}</p>
                        <p className="text-white/55 text-sm leading-relaxed">
                          {tr.opHelp}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* ── Columna derecha: formulario ── */}
                <motion.div
                  variants={fadeUp} custom={1} initial="hidden" whileInView="visible" viewport={VP_ONCE}
                  className="lg:col-span-3"
                >
                  <div className="glass rounded-2xl p-7 md:p-9 border border-white/[0.08] shadow-[0_22px_50px_rgba(0,0,0,0.22)]">
                    <h2 className="text-white font-bold text-lg mb-6">{tr.formTitle}</h2>

                    {enviado ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 rounded-full bg-asli-primary/15 border border-asli-primary/30 flex items-center justify-center mx-auto mb-5">
                          <svg className="w-8 h-8 text-asli-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <h3 className="text-white font-bold text-xl mb-2">{tr.sent}</h3>
                        <p className="text-white/60 leading-relaxed max-w-sm mx-auto">
                          {tr.sentSub}
                        </p>
                        <button
                          type="button"
                          onClick={handleReset}
                          className="mt-8 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-white/20 text-white/85 text-sm font-semibold hover:border-asli-primary/50 hover:text-white hover:bg-white/[0.04] transition-all duration-300"
                        >
                          {tr.reset}
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-white/50 text-xs uppercase tracking-wider mb-2">{tr.name}</label>
                            <input
                              type="text"
                              name="nombre"
                              required
                              placeholder={tr.namePh}
                              value={form.nombre}
                              onChange={handleChange}
                              className={inputCls}
                            />
                          </div>
                          <div>
                            <label className="block text-white/50 text-xs uppercase tracking-wider mb-2">{tr.company}</label>
                            <input
                              type="text"
                              name="empresa"
                              placeholder={tr.companyPh}
                              value={form.empresa}
                              onChange={handleChange}
                              className={inputCls}
                            />
                          </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-white/50 text-xs uppercase tracking-wider mb-2">{tr.email}</label>
                            <input
                              type="email"
                              name="email"
                              required
                              placeholder={tr.emailPh}
                              value={form.email}
                              onChange={handleChange}
                              className={inputCls}
                            />
                          </div>
                          <div>
                            <label className="block text-white/50 text-xs uppercase tracking-wider mb-2">{tr.phone}</label>
                            <input
                              type="tel"
                              name="telefono"
                              placeholder={tr.phonePh}
                              value={form.telefono}
                              onChange={handleChange}
                              className={inputCls}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-white/50 text-xs uppercase tracking-wider mb-2">{tr.operationType}</label>
                          <select
                            name="tipo"
                            value={form.tipo}
                            onChange={handleChange}
                            className={`${inputCls} cursor-pointer`}
                          >
                            <option value="" className="bg-asli-dark">{tr.select}</option>
                            <option value="exportacion" className="bg-asli-dark">{tr.export}</option>
                            <option value="importacion" className="bg-asli-dark">{tr.import}</option>
                            <option value="ambas" className="bg-asli-dark">{tr.both}</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-white/50 text-xs uppercase tracking-wider mb-2">{tr.message}</label>
                          <textarea
                            name="mensaje"
                            rows={5}
                            required
                            placeholder={tr.msgPh}
                            value={form.mensaje}
                            onChange={handleChange}
                            className={`${inputCls} resize-none`}
                          />
                        </div>

                        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:items-stretch">
                          <button
                            type="button"
                            onClick={handleReset}
                            className="sm:w-40 shrink-0 inline-flex items-center justify-center px-4 py-4 rounded-xl border border-white/20 text-white/80 text-sm font-semibold hover:border-white/35 hover:text-white hover:bg-white/[0.04] transition-all duration-300"
                          >
                            {tr.reset}
                          </button>
                          <button
                            type="submit"
                            className="group sm:flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-asli-primary text-white font-semibold hover:bg-asli-primary/85 transition-all duration-300 shadow-lg shadow-asli-primary/20 hover:-translate-y-px ring-1 ring-asli-primary/30"
                          >
                            {tr.send}
                            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                          </button>
                        </div>

                        <p className="text-white/30 text-xs text-center">
                          {tr.responseTime}
                        </p>
                      </form>
                    )}
                  </div>
                </motion.div>
              </div>
            </div>
          </section>

        </main>

        <Footer />
      </div>
    </>
  )
}

export default ContactoPage
