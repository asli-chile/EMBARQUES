/**
 * Sección: Por qué ASLI
 * Texto institucional con diferenciales reales
 */
const PorQueAsli = () => {
  const diferenciales = [
    {
      titulo: 'Acompañamiento completo',
      descripcion:
        'Estamos contigo en cada etapa del proceso, desde la planificación hasta la entrega final, asegurando transparencia y comunicación constante.',
    },
    {
      titulo: 'Claridad operativa',
      descripcion:
        'Procesos definidos y documentados. Sabrás en todo momento el estado de tu operación, sin sorpresas ni imprevistos.',
    },
    {
      titulo: 'Experiencia en fruta',
      descripcion:
        'Especialización comprobada en el manejo de fruta fresca y congelada, con conocimiento profundo de requisitos fitosanitarios, cadena de frío y tiempos críticos.',
    },
    {
      titulo: 'Control de procesos',
      descripcion:
        'Sistemas y procedimientos que garantizan el seguimiento detallado de cada operación, minimizando riesgos y maximizando eficiencia.',
    },
  ]

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-asli-dark mb-4">
              Por qué ASLI
            </h2>
            <p className="text-lg text-gray-700 leading-relaxed">
              Somos una agencia logística con enfoque en resultados concretos y
              relaciones de largo plazo. Nuestro compromiso es ofrecerte
              soluciones que realmente funcionen, con el respaldo de años de
              experiencia en el mercado internacional.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
            {diferenciales.map((diferencial, index) => (
              <div key={index} className="space-y-3">
                <h3 className="text-xl font-semibold text-asli-primary">
                  {diferencial.titulo}
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  {diferencial.descripcion}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default PorQueAsli

