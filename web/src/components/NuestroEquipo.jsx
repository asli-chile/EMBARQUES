import { motion } from 'framer-motion'

const equipo = [
  { nombre: 'Mario Basaez',      cargo: 'Fundador y Gerente General',          imagen: '/img/mariobasaez.png' },
  { nombre: 'Hans Vasquez',      cargo: 'Subgerente de Operaciones',            imagen: '/img/hansv.png' },
  { nombre: 'Poliana Cisternas', cargo: 'Subgerente Comercial',                 imagen: '/img/poli.jpg' },
  { nombre: 'Rocio Villareal',   cargo: 'Subgerente Seguridad Alimentaria',     imagen: '/img/rocio.png' },
  { nombre: 'Ricardo Lazo',      cargo: 'Subgerente Comercio Exterior',         imagen: '/img/ricardolazo.png' },
  { nombre: 'Nina Scotti',       cargo: 'Ejecutiva Comercial e Importaciones',  imagen: '/img/nina.png' },
  { nombre: 'Alex Cárdenas',     cargo: 'Coordinador de Transportes',           imagen: '/img/alex.png' },
  { nombre: 'Stefania Cordova',  cargo: 'Subgerente Administración y Finanzas', imagen: '/img/stefanie.png' },
  { nombre: 'Rodrigo Cáceres',   cargo: 'Customer Services',                    imagen: '/img/rodrigo.png' },
]

const MemberCard = ({ member, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 36 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-60px' }}
    transition={{ duration: 0.7, delay: (index % 3) * 0.1, ease: [0.22, 1, 0.36, 1] }}
    className="group relative"
  >
    <div className="relative overflow-hidden rounded-2xl aspect-[3/4] bg-asli-secondary/50">
      {/* Photo */}
      <img
        src={member.imagen}
        alt={member.nombre}
        className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
        onError={e => { e.target.src = '/img/logoblanco.png'; e.target.className = 'w-full h-full object-contain p-8 opacity-20' }}
      />

      {/* Base gradient — más fuerte en mobile para que el texto sea siempre legible */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-asli-primary/0 group-hover:bg-asli-primary/10 transition-all duration-500" />

      {/* Teal bottom border */}
      <div className="absolute bottom-0 inset-x-0 h-0.5 bg-asli-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />

      {/* Name / cargo */}
      <div className="absolute bottom-0 inset-x-0 p-3 md:p-5">
        <p className="text-white font-display font-bold text-sm md:text-lg leading-tight mb-0.5 drop-shadow-sm">
          {member.nombre}
        </p>
        <p className="text-asli-primary text-[10px] md:text-xs font-medium tracking-wide uppercase leading-snug drop-shadow-sm">
          {member.cargo}
        </p>
      </div>
    </div>
  </motion.div>
)

const NuestroEquipo = () => (
  <section id="equipo" className="relative py-14 md:py-36 bg-asli-dark overflow-hidden">

    <div
      className="absolute right-0 top-0 font-display font-black text-white/[0.025] select-none pointer-events-none"
      style={{ fontSize: 'clamp(12rem, 25vw, 22rem)', lineHeight: 1 }}
      aria-hidden
    >
      05
    </div>

    <div className="container mx-auto px-6 lg:px-10">
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
          Nuestro Equipo
        </motion.p>
        <motion.h2
          variants={{ hidden: { opacity: 0, y: 28 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22,1,0.36,1] } } }}
          className="font-display font-black text-white max-w-xl"
          style={{ fontSize: 'clamp(2.2rem, 5vw, 3.8rem)', lineHeight: 1.05, letterSpacing: '-0.02em' }}
        >
          Profesionales que{' '}
          <em className="not-italic text-asli-primary">hacen la diferencia</em>
        </motion.h2>
      </motion.div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-6">
        {equipo.map((m, i) => (
          <MemberCard key={m.nombre} member={m} index={i} />
        ))}
      </div>
    </div>
  </section>
)

export default NuestroEquipo
