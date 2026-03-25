import { motion } from 'framer-motion'

const Ubicacion = () => {
  const openMap = (type) => {
    const urls = {
      google: 'https://maps.app.goo.gl/cGrni677vZDk5pp26',
      waze:   'https://www.waze.com/en/live-map/directions/asli-logistica-y-comercio-exterior-ruta-5-sur?place=w.189269418.1892694183.25097777',
      apple:  'https://maps.apple.com/place?map=satellite&place-id=IEA0826463ACE71BC',
    }
    window.open(urls[type], '_blank')
  }

  return (
    <section id="contacto" className="relative py-14 md:py-36 bg-asli-dark overflow-hidden">

      <div
        className="absolute right-0 bottom-0 font-display font-black text-white/[0.03] select-none pointer-events-none"
        style={{ fontSize: 'clamp(12rem, 22vw, 20rem)', lineHeight: 1 }}
        aria-hidden
      >
        08
      </div>

      <div className="container mx-auto px-6 lg:px-10">

        {/* Header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          className="mb-10 md:mb-16"
        >
          <motion.p
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}
            className="eyebrow mb-4"
          >
            Encuéntranos
          </motion.p>
          <motion.h2
            variants={{ hidden: { opacity: 0, y: 28 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22,1,0.36,1] } } }}
            className="font-display font-black text-white"
            style={{ fontSize: 'clamp(2.2rem, 5vw, 3.8rem)', lineHeight: 1.05, letterSpacing: '-0.02em' }}
          >
            Nuestras{' '}
            <em className="not-italic text-asli-primary">oficinas</em>
          </motion.h2>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">

          {/* Info column */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-2 flex flex-col gap-6"
          >
            {/* Address */}
            <div className="glass rounded-2xl p-6 border border-white/8">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-xl bg-asli-primary/20 flex items-center justify-center text-asli-primary">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <p className="eyebrow">Dirección</p>
              </div>
              <p className="text-white font-semibold text-lg leading-snug">Longitudinal Sur Km. 186</p>
              <p className="text-white/60 text-sm mt-1">3340000 Curicó, Región del Maule, Chile</p>
            </div>

            {/* Contact */}
            <div className="glass rounded-2xl p-6 border border-white/8">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-xl bg-asli-accent/20 flex items-center justify-center text-asli-accent">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <p className="eyebrow">Contacto</p>
              </div>
              <p className="text-white font-semibold">Mario Basaez</p>
              <a href="tel:+56968394225" className="text-asli-primary hover:text-asli-accent transition-colors duration-200 font-medium">
                +56 9 6839 4225
              </a>
              <p className="text-white/50 text-sm mt-1">contacto@asli.cl</p>
            </div>

            {/* Map buttons */}
            <div className="flex flex-col gap-3">
              {[
                { id: 'google', label: 'Abrir en Google Maps', color: 'bg-asli-primary hover:bg-asli-primary/90' },
                { id: 'waze',   label: 'Navegar con Waze',    color: 'bg-asli-secondary hover:bg-asli-secondary/80 border border-white/15' },
                { id: 'apple',  label: 'Apple Maps',          color: 'glass hover:border-asli-primary/40' },
              ].map(btn => (
                <button
                  key={btn.id}
                  onClick={() => openMap(btn.id)}
                  className={`w-full py-3 rounded-xl text-white font-semibold text-sm transition-all duration-300 ${btn.color}`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Map */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-3 rounded-3xl overflow-hidden border border-white/10"
          >
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d4022.7608648636206!2d-71.20605142340338!3d-34.97436577716874!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x966457bfbad3103d%3A0x1a06a30ef08571a5!2sASLI%20-%20Log%C3%ADstica%20y%20Comercio%20Exterior!5e1!3m2!1ses-419!2scl!4v1768069231458!5m2!1ses-419!2scl"
              width="100%"
              height="100%"
              style={{ minHeight: '280px', height: 'clamp(280px, 50vw, 480px)', border: 0, display: 'block' }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Ubicación ASLI"
            />
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default Ubicacion
