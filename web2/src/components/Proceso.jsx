import { useReveal } from '../hooks/useReveal'

const steps = [
  {
    num: '01',
    title: 'Escuchamos',
    desc: 'Partimos por ti: qué cargas, a dónde van, en qué plazos y qué restricciones tienes. Traducimos eso a un plan operable, sin tecnicismos de más.',
  },
  {
    num: '02',
    title: 'Coordinamos',
    desc: 'Armamos la ruta multimodal — naviera, aérea o terrestre — con documentación, aduanas y proveedores alineados. Tú sabes qué sigue en cada etapa.',
  },
  {
    num: '03',
    title: 'Operamos',
    desc: 'Ejecutamos y hacemos seguimiento hasta el destino. Cuando algo se mueve o se complica, tienes contacto directo con alguien que conoce tu operación.',
  },
]

function StepCard({ step, index }) {
  const { ref, style } = useReveal('up', index * 180)

  return (
    <div ref={ref} style={style} className="relative z-10">
      <div className="card-soft p-5 sm:p-6 md:p-7 text-center h-full">
        <div className="mx-auto mb-3 sm:mb-4 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-asli-primary/10 text-asli-primary font-display font-bold text-base flex items-center justify-center">
          {step.num}
        </div>
        <h3 className="font-display text-lg md:text-xl font-bold text-asli-dark mb-2">{step.title}</h3>
        <p className="text-muted-strong text-sm md:text-base leading-relaxed">{step.desc}</p>
      </div>
    </div>
  )
}

const Proceso = () => {
  const header = useReveal('up')

  return (
    <section id="proceso" className="section-fit bg-[#F7F5F2]">
      <div className="container-asli">
        <div
          ref={header.ref}
          style={header.style}
          className="text-center max-w-2xl mx-auto mb-6 sm:mb-8 md:mb-10"
        >
          <span className="section-label justify-center !mb-2">Cómo trabajamos</span>
          <h2 className="font-display text-asli-dark text-[clamp(1.5rem,5.5vw,2.5rem)] font-bold tracking-tight mb-2 sm:mb-3 text-balance">
            Un método simple, con personas detrás
          </h2>
          <p className="text-muted-strong text-sm sm:text-base md:text-lg leading-relaxed">
            <span className="sm:hidden">
              Te acompañamos desde la primera conversación hasta que la carga llega.
            </span>
            <span className="hidden sm:inline">
              No entregamos una cotización y desaparecemos. Te acompañamos desde la primera
              conversación hasta que la carga llega: con criterio, plazos claros y alguien a
              quien llamar.
            </span>
          </p>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-5 md:gap-6">
          <div className="step-line hidden md:block" aria-hidden="true" />
          {steps.map((step, index) => (
            <StepCard key={step.num} step={step} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}

export default Proceso
