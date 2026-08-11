import Head from 'next/head'
import Header from '../src/components/Header'
import Footer from '../src/components/Footer'
import { servicios, equipoContactos } from '../src/data/servicios'
import { useReveal } from '../src/hooks/useReveal'

function ContactCard({ persona, index }) {
  const { ref, style } = useReveal('up', Math.min(index, 4) * 160)

  return (
    <div ref={ref} style={style}>
      <article className="card-soft p-6 md:p-8 flex flex-col h-full">
        <p className="section-label !mb-4">{persona.area}</p>
        <div className="flex items-center gap-4 mb-5">
          <img
            src={persona.foto}
            alt={persona.nombre}
            className="w-20 h-20 object-cover rounded-full border-2 border-asli-primary"
          />
          <div>
            <h3 className="font-display text-lg font-bold text-asli-dark">{persona.nombre}</h3>
            <p className="text-asli-primary text-sm font-semibold">{persona.cargo}</p>
          </div>
        </div>
        <p className="text-muted-strong text-base leading-relaxed mb-3 flex-grow">{persona.bio}</p>
        {persona.idiomas && (
          <p className="text-muted text-sm mb-5">{persona.idiomas}</p>
        )}
        <div className="flex flex-col gap-2.5 mt-auto">
          <a
            href={`https://mail.google.com/mail/?view=cm&to=${persona.email}`}
            className="btn-primary !py-2.5 text-sm w-full"
          >
            Enviar correo
          </a>
          <a
            href={`https://wa.me/${persona.whatsapp.replace('+', '')}?text=${encodeURIComponent(persona.whatsappText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-7 py-2.5 bg-asli-accent text-white font-semibold text-sm hover:bg-opacity-90 transition-all duration-320 ease-asli w-full rounded-full"
          >
            WhatsApp
          </a>
        </div>
      </article>
    </div>
  )
}

function ServiceTile({ servicio, index }) {
  const { ref, style } = useReveal('up', Math.min(index, 5) * 140)

  return (
    <div ref={ref} style={style}>
      <article className="group card-soft overflow-hidden flex flex-col h-full">
        <div className="relative h-44 overflow-hidden">
          <img
            src={servicio.imagen}
            alt=""
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-asli group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-asli-dark/45 to-transparent" />
          <span className="absolute bottom-3 left-4 font-display text-white/90 text-xs tracking-[0.18em]">
            {String(index + 1).padStart(2, '0')}
          </span>
        </div>
        <div className="p-6">
          <h3 className="font-display text-xl font-bold text-asli-dark mb-2 tracking-tight">
            {servicio.titulo}
          </h3>
          <p className="text-asli-dark/80 text-sm leading-relaxed">{servicio.descripcion}</p>
        </div>
      </article>
    </div>
  )
}

const ServiciosPage = () => {
  return (
    <>
      <Head>
        <title>Servicios — ASLI</title>
        <meta
          name="description"
          content="Conoce todos nuestros servicios logísticos: exportaciones, importaciones, transporte marítimo, aéreo y terrestre, gestión de contenedores, servicios aduaneros y asesoría logística integral."
        />
        <link rel="icon" type="image/png" href="/img/logoblanco.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div className="min-h-screen flex flex-col bg-[#F7F5F2]">
        <Header />
        <main className="flex-grow">
          <section className="py-16 md:py-24">
            <div className="container-asli max-w-3xl text-center mx-auto">
              <span className="section-label justify-center">Catálogo</span>
              <h1 className="font-display text-[clamp(2.25rem,5vw,3.5rem)] font-bold tracking-tight mb-5 text-asli-dark text-balance">
                Nuestros servicios
              </h1>
              <p className="text-muted-strong text-xl md:text-2xl leading-relaxed">
                Soluciones logísticas integrales — del origen al destino.
              </p>
            </div>
          </section>

          <section className="pb-16 md:pb-20">
            <div className="container-asli">
              <div className="mb-10 max-w-2xl">
                <span className="section-label">Equipo especializado</span>
                <h2 className="font-display text-asli-dark text-2xl md:text-3xl font-bold tracking-tight mb-3">
                  Habla con quien opera tu carga
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 md:gap-6">
                {equipoContactos.map((persona, index) => (
                  <ContactCard key={persona.id} persona={persona} index={index} />
                ))}
              </div>
            </div>
          </section>

          <section className="bg-white py-16 md:py-20 border-y border-asli-dark/5">
            <div className="container-asli">
              <div className="mb-10 max-w-2xl">
                <span className="section-label">Cobertura</span>
                <h2 className="font-display text-asli-dark text-2xl md:text-3xl font-bold tracking-tight">
                  Nueve líneas de servicio
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
                {servicios.map((servicio, index) => (
                  <ServiceTile key={servicio.id} servicio={servicio} index={index} />
                ))}
              </div>
            </div>
          </section>

          <section className="py-16 md:py-20 text-center">
            <div className="container-asli max-w-2xl">
              <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight mb-4 text-asli-dark">
                ¿Necesitas cotizar?
              </h2>
              <p className="text-muted-strong mb-8 text-xl">
                Cuéntanos tu operación y te ayudamos a armar la mejor solución.
              </p>
              <a
                href="https://mail.google.com/mail/?view=cm&to=informaciones@asli.cl&su=Cotización de servicios"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                Cotizar aquí
              </a>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  )
}

export default ServiciosPage
