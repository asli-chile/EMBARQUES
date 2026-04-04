import Head from 'next/head'
import { motion } from 'framer-motion'
import Header from '../src/components/Header'
import Footer from '../src/components/Footer'
import ImagePlaceholder from '../src/components/ImagePlaceholder'
import { useLang } from '../src/lib/LangContext'
import { ejecutivosByLang } from '../src/lib/ejecutivosTranslations'

const COPY = {
  es: {
    pageTitle: 'Hablar con un ejecutivo | ASLI',
    pageDesc: 'Contacta al ejecutivo ASLI según el servicio que necesitas.',
    heroTitle: 'Habla con un ejecutivo',
    heroSub:
      'Selecciona el ejecutivo según el servicio que necesitas y contáctalo directamente por correo. Para consultas generales, contacta a Rodrigo Castillo.',
    sendMail: 'Enviar correo',
  },
  en: {
    pageTitle: 'Talk to an Executive | ASLI',
    pageDesc: 'Contact the ASLI executive based on the service you need.',
    heroTitle: 'Talk to an executive',
    heroSub:
      'Select the executive based on the service you need and contact them directly by email. For general inquiries, contact Rodrigo Castillo.',
    sendMail: 'Send email',
  },
  zh: {
    pageTitle: '联系业务顾问 | ASLI',
    pageDesc: '根据您需要的服务联系对应的 ASLI 顾问。',
    heroTitle: '联系业务顾问',
    heroSub:
      '请选择符合您需求的顾问并通过邮件直接联系。一般咨询请联系 Rodrigo Castillo。',
    sendMail: '发送邮件',
  },
}

const mailHref = (ej, email, nombre, servicio) =>
  `https://mail.google.com/mail/?view=cm&to=${email}&su=${encodeURIComponent(
    `${ej.mailSubjectPrefix} ${servicio}`
  )}&body=${encodeURIComponent(`${ej.mailGreeting} ${nombre}, ${ej.mailAsk} ${servicio}.`)}`

const EjecutivosPage = () => {
  const { lang } = useLang()
  const tr = COPY[lang] || COPY.es
  const ej = ejecutivosByLang[lang] || ejecutivosByLang.es
  const gc = ej.generalContact

  return (
    <>
      <Head>
        <title>{tr.pageTitle}</title>
        <meta name="description" content={tr.pageDesc} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div className="min-h-screen flex flex-col bg-asli-dark">
        <Header />

        <main className="flex-grow">
          <section className="relative pt-36 pb-20 md:pb-28 overflow-hidden bg-gradient-to-b from-asli-deep to-asli-dark">
            <div className="absolute inset-0 overflow-hidden opacity-20">
              <ImagePlaceholder
                variant="hero"
                src="/img/mano.webp"
                alt="ASLI — contacto con ejecutivos"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-asli-deep via-asli-deep/85 to-asli-deep/70" />

            <div className="relative z-10 container mx-auto px-6 lg:px-10 max-w-4xl">
              <h1
                className="font-display font-black text-white leading-tight mb-6"
                style={{ fontSize: 'clamp(2rem, 5vw, 3.8rem)', letterSpacing: '-0.025em' }}
              >
                {tr.heroTitle}
              </h1>
              <p className="text-white/65 text-lg leading-relaxed max-w-3xl">{tr.heroSub}</p>
            </div>
          </section>

          <section className="py-16 md:py-24 border-y border-white/[0.06]">
            <div className="container mx-auto px-6 lg:px-10">
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {ej.members.map((item, idx) => (
                  <motion.article
                    key={item.email}
                    initial={{ opacity: 0, y: 28 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.55, delay: idx * 0.05 }}
                    className="flex h-full flex-col rounded-2xl border border-white/[0.1] bg-white/[0.03] p-6 shadow-[0_18px_36px_rgba(0,0,0,0.22)]"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <ImagePlaceholder
                        variant="lightCard"
                        className="!w-14 !h-14 shrink-0 !p-1 !rounded-xl"
                      />
                      <div className="min-w-0 flex-1">
                        <h2 className="text-white font-semibold leading-tight not-italic">{item.nombre}</h2>
                        <p className="text-white/60 text-sm">{item.cargo}</p>
                      </div>
                    </div>

                    <p className="text-asli-primary text-sm font-semibold mb-2">{item.servicio}</p>
                    <p className="flex-1 text-white/70 text-sm leading-relaxed mb-5">{item.descripcion}</p>

                    <a
                      href={mailHref(ej, item.email, item.nombre, item.servicio)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-auto inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-asli-primary text-white text-sm font-semibold hover:bg-asli-primary/85 transition-all duration-200"
                    >
                      {tr.sendMail}
                    </a>
                  </motion.article>
                ))}

                <motion.article
                  key={gc.email}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.55, delay: ej.members.length * 0.05 }}
                  className="flex h-full flex-col rounded-2xl border border-asli-primary/35 bg-asli-primary/[0.06] p-6 shadow-[0_18px_36px_rgba(0,0,0,0.22)]"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <ImagePlaceholder
                      variant="lightCard"
                      className="!w-14 !h-14 shrink-0 !p-1 !rounded-xl"
                    />
                    <div className="min-w-0 flex-1">
                      <h2 className="text-white font-semibold leading-tight not-italic">{gc.nombre}</h2>
                      <p className="text-white/60 text-sm">{gc.cargo}</p>
                    </div>
                  </div>

                  <p className="text-asli-primary text-sm font-semibold mb-2">{gc.servicio}</p>
                  <p className="flex-1 text-white/70 text-sm leading-relaxed mb-5">{gc.descripcion}</p>

                  <a
                    href={mailHref(ej, gc.email, gc.nombre, gc.servicio)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-auto inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-asli-primary text-white text-sm font-semibold hover:bg-asli-primary/85 transition-all duration-200"
                  >
                    {tr.sendMail}
                  </a>
                </motion.article>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  )
}

export default EjecutivosPage
