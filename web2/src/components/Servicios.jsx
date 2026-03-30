import { motion } from 'framer-motion'
import ImagePlaceholder from './ImagePlaceholder'

const servicios = [
  { id: 1, titulo: 'Asesoría en Exportaciones',  desc: 'Gestión completa del proceso exportador, desde documentación hasta coordinación con navieras y aduanas.',  icon: '⚓' },
  { id: 2, titulo: 'Asesoría en Importaciones',  desc: 'Facilitamos la importación de tus productos, manejando trámites aduaneros y coordinación logística.',       icon: '📦' },
  { id: 3, titulo: 'Asesoría Documental',         desc: 'Documentación aduanera, certificados, permisos y toda la tramitación necesaria para operar.',                icon: '📋' },
  { id: 4, titulo: 'Transporte Marítimo',         desc: 'Coordinación con las principales navieras del mundo para el transporte seguro de tu carga.',                 icon: '🚢' },
  { id: 5, titulo: 'Transporte Aéreo',            desc: 'Soluciones de transporte aéreo para cargas urgentes o de alto valor con las mejores aerolíneas.',             icon: '✈️' },
  { id: 6, titulo: 'Transporte Terrestre',        desc: 'Red de transporte terrestre confiable para mover tu carga desde y hacia puertos y aeropuertos.',              icon: '🚛' },
  { id: 7, titulo: 'Gestión de Contenedores',     desc: 'Administración eficiente de contenedores, optimizando espacio, costos y tiempos de despacho.',               icon: '🗃️' },
  { id: 8, titulo: 'Servicios Aduaneros',         desc: 'Tramitación aduanera completa, cumplimiento normativo y agilización de procesos de importación/exportación.', icon: '🏛️' },
  { id: 9, titulo: 'Logística Integral',          desc: 'Soluciones logísticas completas y personalizadas para cada necesidad operativa de tu empresa.',               icon: '🌐' },
]

const Servicios = () => (
  <section id="servicios" className="relative py-14 md:py-36 bg-asli-dark overflow-hidden">

    <div className="container mx-auto px-6 lg:px-10">

      {/* Header */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        className="mb-10 md:mb-16 max-w-2xl"
      >
        <motion.p
          variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}
          className="eyebrow mb-4"
        >
          Nuestros Servicios
        </motion.p>
        <motion.h2
          variants={{ hidden: { opacity: 0, y: 28 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22,1,0.36,1] } } }}
          className="font-display font-black text-white"
          style={{ fontSize: 'clamp(2.2rem, 5vw, 3.8rem)', lineHeight: 1.05, letterSpacing: '-0.02em' }}
        >
          Soluciones que{' '}
          <em className="not-italic text-asli-primary">mueven el mundo</em>
        </motion.h2>
      </motion.div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {servicios.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 36 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, delay: (i % 3) * 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="group relative rounded-2xl overflow-hidden cursor-default"
            style={{ minHeight: '240px' }}
          >
            {/* Placeholder imagen */}
            <div className="absolute inset-0 overflow-hidden transition-transform duration-700 ease-out group-hover:scale-105">
              <ImagePlaceholder variant="hero" className="rounded-none" />
            </div>

            {/* Permanent overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-asli-dark via-asli-dark/60 to-asli-dark/20" />

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-asli-primary/0 group-hover:bg-asli-primary/10 transition-all duration-500" />

            {/* Teal top border on hover */}
            <div className="absolute top-0 inset-x-0 h-0.5 bg-asli-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />

            {/* Content */}
            <div className="relative z-10 h-full flex flex-col justify-end p-5 md:p-6">
              <div className="mb-2">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-asli-primary/20 border border-asli-primary/30 text-lg mb-2">
                  {s.icon}
                </span>
              </div>
              <h3 className="font-display font-bold text-white text-lg leading-tight mb-2 group-hover:text-asli-primary transition-colors duration-300">
                {s.titulo}
              </h3>
              {/* Descripción: siempre visible en mobile, solo en hover en desktop */}
              <p className="text-white/60 text-xs leading-relaxed font-light sm:max-h-0 sm:group-hover:max-h-24 overflow-hidden sm:transition-all sm:duration-500 sm:ease-out">
                {s.desc}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
)

export default Servicios
