import { useReveal } from '../hooks/useReveal'
import { useLocale } from '../hooks/useLocale'

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
  const { t } = useLocale()
  const header = useReveal('up')
  const steps = t.proceso.steps

  return (
    <section id="proceso" className="section-fit bg-asli-light">
      <div className="container-asli">
        <div
          ref={header.ref}
          style={header.style}
          className="text-center max-w-2xl mx-auto mb-6 sm:mb-8 md:mb-10"
        >
          <span className="section-label justify-center !mb-2">{t.proceso.label}</span>
          <h2 className="font-display text-asli-dark text-[clamp(1.5rem,5.5vw,2.5rem)] font-bold tracking-tight mb-2 sm:mb-3 text-balance">
            {t.proceso.title}
          </h2>
          <p className="text-muted-strong text-sm sm:text-base md:text-lg leading-relaxed">
            <span className="sm:hidden">{t.proceso.subtitleMobile}</span>
            <span className="hidden sm:inline">{t.proceso.subtitleDesktop}</span>
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
