import { useReveal } from '../hooks/useReveal'

const steps = [
  {
    num: '01',
    title: 'Escuchamos',
    desc: 'Entendemos tu carga, destino, plazos y restricciones. Sin tecnicismos innecesarios.',
  },
  {
    num: '02',
    title: 'Coordinamos',
    desc: 'Armamos la ruta multimodal: naviera, aéreo o terrestre, documentación y aduanas.',
  },
  {
    num: '03',
    title: 'Operamos',
    desc: 'Ejecutamos y hacemos seguimiento hasta el destino, con contacto directo cuando lo necesitas.',
  },
]

function StepCard({ step, index }) {
  const { ref, style } = useReveal('up', index * 180)

  return (
    <div ref={ref} style={style} className="relative z-10">
      <div className="card-soft p-6 md:p-7 text-center">
        <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-asli-primary/10 text-asli-primary font-display font-bold text-base flex items-center justify-center">
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
          className="text-center max-w-2xl mx-auto mb-8 md:mb-10"
        >
          <span className="section-label justify-center !mb-2">Método</span>
          <h2 className="font-display text-asli-dark text-[clamp(1.65rem,3.4vw,2.5rem)] font-bold tracking-tight mb-2 text-balance">
            Simple, claro y sin marearte
          </h2>
          <p className="text-muted-strong text-base md:text-lg leading-relaxed">
            Un flujo pensado para exportadores e importadores: escuchamos, coordinamos y
            operamos con criterio.
          </p>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
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
