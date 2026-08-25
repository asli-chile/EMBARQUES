import { scrollToHash } from '../lib/scrollToHash'
import { SHOW_COTIZADOR } from '../lib/features'

/**
 * Footer — marca, servicios, contacto
 */
const Footer = () => {
  const handleVisitanosClick = () => {
    if (window.location.pathname === '/' || window.location.pathname === '') {
      scrollToHash('#contacto')
      return
    }
    window.location.href = '/#contacto'
  }

  const handleContactanosClick = () => {
    const email = 'informaciones@asli.cl'
    const subject = encodeURIComponent('Consulta desde el sitio web')
    const body = encodeURIComponent(
      'Hola, me gustaría obtener más información sobre sus servicios.'
    )
    window.open(
      `https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${subject}&body=${body}`,
      '_blank'
    )
  }

  return (
    <footer className="bg-asli-dark text-white/80">
      <div className="container-asli py-14 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-12">
          <div>
            <img
              src="/img/logoblanco.png"
              alt="ASLI"
              width={176}
              height={44}
              loading="lazy"
              decoding="async"
              className="h-11 mb-4 object-contain"
            />
            <p className="text-white/75 text-sm uppercase tracking-[0.14em] font-bold mb-3">
              Logística y Comercio Exterior
            </p>
            <p className="font-display text-asli-accent font-semibold text-lg italic">
              Nuestro límite es tu destino
            </p>
          </div>

          <div>
            <h4 className="font-display text-white text-lg font-semibold mb-4">Servicios</h4>
            <ul className="space-y-2.5 text-base">
              <li>
                <a href="/exportacion-fruta-fresca" className="hover:text-asli-primary transition-colors duration-320">
                  Exportación de fruta fresca
                </a>
              </li>
              <li>
                <a href="/importacion-mercancias-chile" className="hover:text-asli-primary transition-colors duration-320">
                  Importación de mercancías
                </a>
              </li>
              <li>
                <a href="/asesoria-exportadores-pymes" className="hover:text-asli-primary transition-colors duration-320">
                  Asesoría a PYMEs y exportadores
                </a>
              </li>
              <li>
                <a href="/gestion-contenedores" className="hover:text-asli-primary transition-colors duration-320">
                  Gestión de contenedores
                </a>
              </li>
              <li>
                <a href="/transporte-aereo-carga" className="hover:text-asli-primary transition-colors duration-320">
                  Carga aérea
                </a>
              </li>
              <li>
                <a href="/transporte-maritimo" className="hover:text-asli-primary transition-colors duration-320">
                  Transporte marítimo
                </a>
              </li>
              <li>
                <a href="/servicios" className="hover:text-asli-primary transition-colors duration-320">
                  Equipo especializado
                </a>
              </li>
              {SHOW_COTIZADOR ? (
                <li>
                  <a href="/#cotizar" className="hover:text-asli-primary transition-colors duration-320">
                    Cotizador
                  </a>
                </li>
              ) : null}
            </ul>
          </div>

          <div>
            <h4 className="font-display text-white text-lg font-semibold mb-4">Empresa</h4>
            <ul className="space-y-2.5 text-base">
              <li>
                <a href="/#historia" className="hover:text-asli-primary transition-colors duration-320">
                  Nuestra historia
                </a>
              </li>
              <li>
                <a href="/tracking" className="hover:text-asli-primary transition-colors duration-320">
                  Tracking de cargas
                </a>
              </li>
              <li>
                <a href="/#contacto" className="hover:text-asli-primary transition-colors duration-320">
                  Contacto
                </a>
              </li>
              <li>
                <a href="/presentacion" className="hover:text-asli-primary transition-colors duration-320">
                  Presentación
                </a>
              </li>
              <li>
                <a href="/asesoria-logistica-integral" className="hover:text-asli-primary transition-colors duration-320">
                  Asesoría logística integral
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <p className="text-base text-white/75 max-w-xl">
            © {new Date().getFullYear()} ASLI — Asesorías y Servicios Logísticos
            Integrales Ltda. Todos los derechos reservados.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button type="button" onClick={handleVisitanosClick} className="btn-secondary !bg-transparent !text-white !border-white/30 hover:!border-white hover:!bg-white hover:!text-asli-dark !py-2.5 !px-5 text-sm">
              Visítanos
            </button>
            <button type="button" onClick={handleContactanosClick} className="btn-primary !py-2.5 !px-5 text-sm">
              Contáctanos
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
