import { motion } from 'framer-motion'
import ImagePlaceholder from './ImagePlaceholder'
import { useLang } from '../lib/LangContext'

const AsesoriaComercioInternacional = () => {
  const { t } = useLang()
  const features = (t.asesoria?.features || []).map((text) => ({ icon: '✓', text }))

  return (
    <section className="relative py-14 md:py-36 bg-asli-secondary overflow-hidden">

    {/* Background decoration */}
    <div
      className="absolute left-0 bottom-0 font-display font-black select-none pointer-events-none"
      style={{ fontSize: 'clamp(12rem, 22vw, 20rem)', lineHeight: 1, color: 'rgba(0,122,123,0.06)' }}
      aria-hidden
    >
      04
    </div>

    <div className="container mx-auto px-6 lg:px-10">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-20 items-center">

        {/* Left: image */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="relative rounded-3xl overflow-hidden order-2 lg:order-1"
          style={{ height: 'clamp(300px, 45vw, 540px)' }}
        >
          <div className="absolute inset-0">
            <ImagePlaceholder variant="hero" className="rounded-none" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-tr from-asli-secondary/80 via-transparent to-transparent" />

          {/* Floating badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="absolute bottom-6 left-6 glass rounded-2xl p-5"
          >
            <p className="eyebrow mb-1">{t.asesoria.badge1}</p>
            <p className="text-white font-display font-bold text-lg leading-tight">
              {t.asesoria.badge2}
            </p>
          </motion.div>

          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-asli-primary to-asli-accent" />
        </motion.div>

        {/* Right: content */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          className="order-1 lg:order-2"
        >
          <motion.p
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}
            className="eyebrow mb-4"
          >
            {t.asesoria.eyebrow}
          </motion.p>
          <motion.h2
            variants={{ hidden: { opacity: 0, y: 28 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22,1,0.36,1] } } }}
            className="font-display font-black text-white mb-4"
            style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', lineHeight: 1.05, letterSpacing: '-0.02em' }}
          >
            {t.asesoria.title}{' '}
            <em className="not-italic text-asli-primary">{t.asesoria.titleSpan}</em>
          </motion.h2>
          <motion.div
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.4 } } }}
            className="w-12 h-0.5 bg-asli-primary rounded-full mb-6"
          />
          <motion.p
            variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}
            className="text-white/60 text-lg leading-relaxed font-light mb-8"
          >
            {t.asesoria.desc}
          </motion.p>

          {/* Feature grid */}
          <motion.div
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            {features.map((f, i) => (
              <motion.div
                key={i}
                variants={{ hidden: { opacity: 0, x: -16 }, visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: [0.22,1,0.36,1] } } }}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-asli-primary/30 transition-colors duration-300"
              >
                <span className="w-6 h-6 rounded-full bg-asli-accent/20 text-asli-accent flex items-center justify-center text-xs font-bold shrink-0">
                  {f.icon}
                </span>
                <span className="text-white/80 text-sm font-medium">{f.text}</span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </div>
    </section>
  )
}

export default AsesoriaComercioInternacional
