/**
 * Sección: Acceso clientes
 * Fondo #11224E, información sobre plataforma privada
 */
const AccesoClientes = () => {
  const handleAccesoClick = () => {
    // TODO: Redirigir a ruta de login cuando esté implementada
    window.location.href = '/clientes'
  }

  const caracteristicas = [
    'Dashboards en tiempo real',
    'Estados de operaciones',
    'Documentos y certificados',
    'Control logístico completo',
  ]

  return (
    <section className="py-16 md:py-24 bg-asli-dark">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Acceso clientes
          </h2>
          <p className="text-lg text-gray-200 mb-8 leading-relaxed">
            Nuestra plataforma privada te permite gestionar todas tus
            operaciones logísticas desde un solo lugar. Accede a información en
            tiempo real, documentos, estados de carga y mucho más.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10 text-left">
            {caracteristicas.map((caracteristica, index) => (
              <div
                key={index}
                className="flex items-center space-x-3 text-gray-200"
              >
                <svg
                  className="w-5 h-5 text-asli-accent flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>{caracteristica}</span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAccesoClick}
            className="bg-asli-primary text-white px-8 py-3 rounded-md text-lg font-semibold hover:bg-opacity-90 transition-all duration-200 shadow-md hover:shadow-lg"
            aria-label="Ingresar a la plataforma de clientes"
          >
            Ingresar a la plataforma
          </button>
        </div>
      </div>
    </section>
  )
}

export default AccesoClientes

