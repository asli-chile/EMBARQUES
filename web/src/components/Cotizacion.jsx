import { useState } from 'react'

/**
 * Sección: Cotización rápida
 * Formulario simple para solicitar cotización referencial
 */
const Cotizacion = () => {
  const [formData, setFormData] = useState({
    tipoServicio: '',
    origen: '',
    destino: '',
    tipoCarga: '',
  })

  const tiposServicio = [
    { value: '', label: 'Seleccione tipo de servicio' },
    { value: 'exportacion', label: 'Exportación' },
    { value: 'importacion', label: 'Importación' },
    { value: 'transporte', label: 'Transporte terrestre' },
    { value: 'completo', label: 'Servicio completo' },
  ]

  const tiposCarga = [
    { value: '', label: 'Seleccione tipo de carga' },
    { value: 'fruta-fresca', label: 'Fruta fresca' },
    { value: 'fruta-congelada', label: 'Fruta congelada' },
    { value: 'otra', label: 'Otra carga' },
  ]

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    // TODO: Implementar envío de cotización cuando se integre con backend
    console.log('Cotización:', formData)
    alert(
      'Gracias por tu interés. Nos pondremos en contacto contigo pronto para enviarte una cotización detallada.'
    )
    // Reset form
    setFormData({
      tipoServicio: '',
      origen: '',
      destino: '',
      tipoCarga: '',
    })
  }

  return (
    <section id="cotizar" className="py-16 md:py-24 bg-asli-light">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-asli-dark mb-4">
              Cotización rápida
            </h2>
            <p className="text-lg text-gray-700">
              Completa el formulario y te enviaremos una cotización referencial
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-lg shadow-md p-6 md:p-8"
          >
            <div className="space-y-6">
              <div>
                <label
                  htmlFor="tipoServicio"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Tipo de servicio
                </label>
                <select
                  id="tipoServicio"
                  name="tipoServicio"
                  value={formData.tipoServicio}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-asli-primary focus:border-transparent"
                  required
                >
                  {tiposServicio.map((tipo) => (
                    <option key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="origen"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Origen
                </label>
                <input
                  type="text"
                  id="origen"
                  name="origen"
                  value={formData.origen}
                  onChange={handleChange}
                  placeholder="Ciudad o puerto de origen"
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-asli-primary focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="destino"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Destino
                </label>
                <input
                  type="text"
                  id="destino"
                  name="destino"
                  value={formData.destino}
                  onChange={handleChange}
                  placeholder="Ciudad o puerto de destino"
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-asli-primary focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="tipoCarga"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Tipo de carga
                </label>
                <select
                  id="tipoCarga"
                  name="tipoCarga"
                  value={formData.tipoCarga}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-asli-primary focus:border-transparent"
                  required
                >
                  {tiposCarga.map((tipo) => (
                    <option key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full bg-asli-primary text-white px-6 py-3 rounded-md text-lg font-semibold hover:bg-opacity-90 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  Solicitar cotización
                </button>
                <p className="text-sm text-gray-500 text-center mt-4">
                  * Esta cotización es referencial. Te contactaremos para
                  enviarte una propuesta detallada.
                </p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </section>
  )
}

export default Cotizacion

