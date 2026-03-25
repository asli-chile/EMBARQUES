import { motion } from 'framer-motion'

const partners = [
  { nombre: 'Agronexo',      logo: '/img/agronexo.png' },
  { nombre: 'Fedefruta',     logo: '/img/fedefruta.png' },
  { nombre: 'Maulealimenta', logo: '/img/maulealimenta.png' },
  { nombre: 'ProChile',      logo: '/img/prochile2.png' },
]

const SomosParteDe = () => (
  <section id="socios" className="relative py-24 md:py-32 bg-asli-dark overflow-hidden">

    <div
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
      style={{ background: 'radial-gradient(circle, rgba(0,122,123,0.06) 0%, transparent 70%)' }}
      aria-hidden
    />

    <div className="container mx-auto px-6 lg:px-10">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        className="text-center mb-16"
      >
        <motion.p
          variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}
          className="eyebrow mb-4"
        >
          Alianzas Estratégicas
        </motion.p>
        <motion.h2
          variants={{ hidden: { opacity: 0, y: 28 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22,1,0.36,1] } } }}
          className="font-display font-black text-white"
          style={{ fontSize: 'clamp(2rem, 4.5vw, 3.4rem)', lineHeight: 1.05, letterSpacing: '-0.02em' }}
        >
          Somos parte de{' '}
          <em className="not-italic text-asli-primary">un ecosistema mayor</em>
        </motion.h2>
        <motion.p
          variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.2 } } }}
          className="text-white/50 text-lg mt-4 font-light max-w-xl mx-auto"
        >
          Respaldados por alianzas con líderes de la industria logística y agroexportadora
        </motion.p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 max-w-3xl mx-auto">
        {partners.map((p, i) => (
          <motion.div
            key={p.nombre}
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="group h-28 rounded-2xl glass border border-white/8 flex items-center justify-center px-6 hover:border-asli-primary/40 hover:bg-asli-primary/5 transition-all duration-300"
          >
            <img
              src={p.logo}
              alt={p.nombre}
              className="max-h-14 max-w-full object-contain opacity-70 group-hover:opacity-100 transition-opacity duration-300"
            />
          </motion.div>
        ))}
      </div>
    </div>
  </section>
)

export default SomosParteDe
