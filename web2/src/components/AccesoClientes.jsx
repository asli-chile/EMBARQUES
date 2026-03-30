import { useLang } from '../lib/LangContext'
/**
 * Sección: Acceso clientes
 * Fondo #11224E, información sobre plataforma privada
 */
const AccesoClientes = () => {
  const { lang } = useLang()
  const tr = {
    es: {
      title: 'Acceso clientes',
      desc: 'Nuestra plataforma privada te permite gestionar todas tus operaciones logísticas desde un solo lugar. Accede a información en tiempo real, documentos, estados de carga y mucho más.',
      features: ['Dashboards en tiempo real', 'Estados de operaciones', 'Documentos y certificados', 'Control logístico completo'],
      btn: 'Ingresar a la plataforma',
      aria: 'Ingresar a la plataforma de clientes (Embarques)',
    },
    en: {
      title: 'Client access',
      desc: 'Our private platform lets you manage all your logistics operations from one place, with real-time information, documents, and cargo status.',
      features: ['Real-time dashboards', 'Operation status', 'Documents and certificates', 'Full logistics control'],
      btn: 'Enter platform',
      aria: 'Enter client platform (Embarques)',
    },
    zh: {
      title: '客户入口',
      desc: '我们的私有平台让您在一个地方管理全部物流操作，查看实时信息、单证和货物状态。',
      features: ['实时仪表盘', '业务状态', '单证与证书', '全流程物流管控'],
      btn: '进入平台',
      aria: '进入客户平台（Embarques）',
    },
  }[lang] || {
    title: 'Acceso clientes',
    desc: 'Nuestra plataforma privada te permite gestionar todas tus operaciones logísticas desde un solo lugar. Accede a información en tiempo real, documentos, estados de carga y mucho más.',
    features: ['Dashboards en tiempo real', 'Estados de operaciones', 'Documentos y certificados', 'Control logístico completo'],
    btn: 'Ingresar a la plataforma',
    aria: 'Ingresar a la plataforma de clientes (Embarques)',
  }

  return (
    <section className="py-16 md:py-24 bg-asli-dark">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            {tr.title}
          </h2>
          <p className="text-lg text-gray-200 mb-8 leading-relaxed">
            {tr.desc}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10 text-left">
            {tr.features.map((caracteristica, index) => (
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

          <a
            href="/embarques"
            className="inline-block bg-asli-primary text-white px-8 py-3 rounded-md text-lg font-semibold hover:bg-opacity-90 transition-all duration-200 shadow-md hover:shadow-lg"
            aria-label={tr.aria}
          >
            {tr.btn}
          </a>
        </div>
      </div>
    </section>
  )
}

export default AccesoClientes

