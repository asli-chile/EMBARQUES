import { useLang } from '../lib/LangContext'

const PorQueAsli = () => {
  const { t } = useLang()
  const { title, intro, items } = t.porQue

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-asli-dark mb-4">
              {title}
            </h2>
            <p className="text-lg text-gray-700 leading-relaxed">
              {intro}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
            {items.map((diferencial, index) => (
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
