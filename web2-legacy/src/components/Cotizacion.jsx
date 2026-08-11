import { useState } from 'react'
import { useLang } from '../lib/LangContext'

/**
 * Sección: Cotización rápida
 * Formulario simple para solicitar cotización referencial
 */
const Cotizacion = () => {
  const { lang } = useLang()
  const tr = lang === 'en'
    ? {
        selectService: 'Select service type', export: 'Export', import: 'Import', land: 'Land transport', full: 'Full service',
        selectCargo: 'Select cargo type', fresh: 'Fresh fruit', frozen: 'Frozen fruit', other: 'Other cargo',
        ok: 'Thank you for your interest. We will contact you soon with a detailed quotation.',
        title: 'Quick quotation', sub: 'Complete the form and we will send a reference quotation',
        service: 'Service type', origin: 'Origin', destination: 'Destination', cargo: 'Cargo type',
        originPh: 'Origin city or port', destinationPh: 'Destination city or port', btn: 'Request quotation',
        note: '* This quotation is referential. We will contact you with a detailed proposal.',
      }
    : lang === 'zh'
      ? {
          selectService: '请选择服务类型', export: '出口', import: '进口', land: '陆运', full: '完整服务',
          selectCargo: '请选择货物类型', fresh: '鲜果', frozen: '冷冻果', other: '其他货物',
          ok: '感谢您的咨询。我们将尽快与您联系并提供详细报价。',
          title: '快速报价', sub: '填写表单，我们将发送参考报价',
          service: '服务类型', origin: '起点', destination: '目的地', cargo: '货物类型',
          originPh: '起点城市或港口', destinationPh: '目的地城市或港口', btn: '申请报价',
          note: '* 本报价为参考报价，我们将与您联系提供详细方案。',
        }
      : {
          selectService: 'Seleccione tipo de servicio', export: 'Exportación', import: 'Importación', land: 'Transporte terrestre', full: 'Servicio completo',
          selectCargo: 'Seleccione tipo de carga', fresh: 'Fruta fresca', frozen: 'Fruta congelada', other: 'Otra carga',
          ok: 'Gracias por tu interés. Nos pondremos en contacto contigo pronto para enviarte una cotización detallada.',
          title: 'Cotización rápida', sub: 'Completa el formulario y te enviaremos una cotización referencial',
          service: 'Tipo de servicio', origin: 'Origen', destination: 'Destino', cargo: 'Tipo de carga',
          originPh: 'Ciudad o puerto de origen', destinationPh: 'Ciudad o puerto de destino', btn: 'Solicitar cotización',
          note: '* Esta cotización es referencial. Te contactaremos para enviarte una propuesta detallada.',
        }

  const [formData, setFormData] = useState({
    tipoServicio: '',
    origen: '',
    destino: '',
    tipoCarga: '',
  })

  const tiposServicio = [
    { value: '', label: tr.selectService },
    { value: 'exportacion', label: tr.export },
    { value: 'importacion', label: tr.import },
    { value: 'transporte', label: tr.land },
    { value: 'completo', label: tr.full },
  ]

  const tiposCarga = [
    { value: '', label: tr.selectCargo },
    { value: 'fruta-fresca', label: tr.fresh },
    { value: 'fruta-congelada', label: tr.frozen },
    { value: 'otra', label: tr.other },
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
    if (process.env.NODE_ENV === 'development') {
      console.log('Cotización:', formData)
    }
    alert(
      tr.ok
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
              {tr.title}
            </h2>
            <p className="text-lg text-gray-700">
              {tr.sub}
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
                  {tr.service}
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
                  {tr.origin}
                </label>
                <input
                  type="text"
                  id="origen"
                  name="origen"
                  value={formData.origen}
                  onChange={handleChange}
                  placeholder={tr.originPh}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-asli-primary focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="destino"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  {tr.destination}
                </label>
                <input
                  type="text"
                  id="destino"
                  name="destino"
                  value={formData.destino}
                  onChange={handleChange}
                  placeholder={tr.destinationPh}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-asli-primary focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="tipoCarga"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  {tr.cargo}
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
                  {tr.btn}
                </button>
                <p className="text-sm text-gray-500 text-center mt-4">
                  {tr.note}
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

