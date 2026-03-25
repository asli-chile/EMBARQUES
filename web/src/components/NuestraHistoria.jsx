import { motion } from 'framer-motion'

const fadeUp = {
  hidden:  { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
}

const paragraphs = [
  'ASLI nace a partir de la experiencia y convicción de su Gerente General, Mario Basaez, profesional formado en el corazón de la industria exportadora chilena. Durante años de trabajo en Copefrut, una de las empresas más grandes del sector, Mario fue testigo directo del alto nivel de exigencia, coordinación y precisión que requiere una operación logística de exportación exitosa.',
  'Sin embargo, esa misma experiencia le permitió identificar una realidad que se repetía con frecuencia: para los pequeños y medianos exportadores, la logística se transformaba en la principal barrera para crecer. Procesos complejos, falta de acompañamiento técnico, decisiones críticas sin asesoría adecuada.',
  'Con esa inquietud como motor, surge ASLI: una empresa distinta. Cercana, experta y comprometida, que no solo ofrece servicios logísticos, sino que acompaña a sus clientes en cada etapa del proceso, entregando asesoría real, honesta y estratégica.',
]

const NuestraHistoria = () => (
  <section className="relative py-14 md:py-36 bg-asli-light overflow-hidden">

    {/* Large decorative number */}
    <div
      className="absolute left-0 top-1/2 -translate-y-1/2 font-display font-black select-none pointer-events-none"
      style={{ fontSize: 'clamp(14rem, 28vw, 26rem)', lineHeight: 1, color: 'rgba(0,63,90,0.06)' }}
      aria-hidden
    >
      02
    </div>

    <div className="container mx-auto px-6 lg:px-10 relative z-10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">

        {/* Left: label + title */}
        <div className="lg:col-span-4">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
            className="lg:sticky lg:top-32"
          >
            <motion.p variants={fadeUp} className="eyebrow text-asli-primary mb-4">
              Nuestra Historia
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className="font-display font-black text-asli-dark mb-6"
              style={{ fontSize: 'clamp(2.2rem, 4.5vw, 3.5rem)', lineHeight: 1.05, letterSpacing: '-0.02em' }}
            >
              Un propósito{' '}
              <em className="not-italic text-asli-primary">claro</em>{' '}
              desde el origen
            </motion.h2>
            <motion.div variants={fadeUp} className="w-12 h-0.5 bg-asli-primary rounded-full mb-6" />
            <motion.p variants={fadeUp} className="text-asli-dark/50 text-sm font-light leading-relaxed">
              Fundada en Curicó, Región del Maule, 2021
            </motion.p>
          </motion.div>
        </div>

        {/* Right: content */}
        <div className="lg:col-span-8 flex flex-col gap-6">

          {/* Pull quote */}
          <motion.blockquote
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="border-l-4 border-asli-primary pl-6 py-4 bg-asli-primary/5 rounded-r-2xl"
          >
            <p className="font-display font-bold italic text-asli-secondary text-xl md:text-2xl leading-relaxed">
              "Asesorar, acompañar y respaldar a los exportadores, ayudándolos
              a operar con el mismo estándar de las grandes compañías."
            </p>
            <footer className="mt-3 eyebrow text-asli-primary">
              — Mario Basaez, Fundador y Gerente General
            </footer>
          </motion.blockquote>

          {/* Paragraphs */}
          {paragraphs.map((p, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.7, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="text-asli-dark/70 text-lg leading-relaxed font-light"
            >
              {p}
            </motion.p>
          ))}

          {/* Bottom stat row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="grid grid-cols-3 gap-4 mt-4 pt-8 border-t border-asli-dark/10"
          >
            {[
              { v: '2021', l: 'Año de fundación' },
              { v: 'Maule', l: 'Región de origen' },
              { v: 'PyME', l: 'Foco exportador' },
            ].map(item => (
              <div key={item.l} className="text-center">
                <p className="font-display font-black text-asli-primary text-3xl mb-1">{item.v}</p>
                <p className="text-asli-dark/50 text-xs font-light uppercase tracking-wider">{item.l}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  </section>
)

export default NuestraHistoria
