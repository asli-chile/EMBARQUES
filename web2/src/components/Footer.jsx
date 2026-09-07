import { scrollToHash } from '../lib/scrollToHash'
import { SHOW_COTIZADOR } from '../lib/features'
import { useLocale } from '../hooks/useLocale'

/**
 * Footer — marca, servicios, contacto
 */
const Footer = () => {
  const { t } = useLocale()

  const handleVisitanosClick = () => {
    if (window.location.pathname === '/' || window.location.pathname === '') {
      scrollToHash('#contacto')
      return
    }
    window.location.href = '/#contacto'
  }

  const handleContactanosClick = () => {
    const email = 'informaciones@asli.cl'
    const subject = encodeURIComponent(t.footer.mailSubject)
    const body = encodeURIComponent(t.footer.mailBody)
    window.open(
      `https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${subject}&body=${body}`,
      '_blank'
    )
  }

  return (
    <footer className="bg-asli-ink text-white/80">
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
              {t.footer.tagline}
            </p>
            <p className="font-display text-asli-accent font-semibold text-lg italic">
              {t.footer.slogan}
            </p>
          </div>

          <div>
            <h4 className="font-display text-white text-lg font-semibold mb-4">{t.footer.services}</h4>
            <ul className="space-y-2.5 text-base">
              <li>
                <a href="/exportacion-fruta-fresca" className="hover:text-asli-primary transition-colors duration-320">
                  {t.footer.exportFruit}
                </a>
              </li>
              <li>
                <a href="/importacion-mercancias-chile" className="hover:text-asli-primary transition-colors duration-320">
                  {t.footer.importGoods}
                </a>
              </li>
              <li>
                <a href="/asesoria-exportadores-pymes" className="hover:text-asli-primary transition-colors duration-320">
                  {t.footer.smeAdvice}
                </a>
              </li>
              <li>
                <a href="/gestion-contenedores" className="hover:text-asli-primary transition-colors duration-320">
                  {t.footer.containers}
                </a>
              </li>
              <li>
                <a href="/transporte-aereo-carga" className="hover:text-asli-primary transition-colors duration-320">
                  {t.footer.airCargo}
                </a>
              </li>
              <li>
                <a href="/transporte-maritimo" className="hover:text-asli-primary transition-colors duration-320">
                  {t.footer.seaCargo}
                </a>
              </li>
              <li>
                <a href="/servicios-aduaneros" className="hover:text-asli-primary transition-colors duration-320">
                  {t.footer.customs}
                </a>
              </li>
              <li>
                <a href="/stacking" className="hover:text-asli-primary transition-colors duration-320">
                  {t.footer.stacking}
                </a>
              </li>
              <li>
                <a href="/servicios" className="hover:text-asli-primary transition-colors duration-320">
                  {t.footer.team}
                </a>
              </li>
              {SHOW_COTIZADOR ? (
                <li>
                  <a href="/#cotizar" className="hover:text-asli-primary transition-colors duration-320">
                    {t.footer.quoteTool}
                  </a>
                </li>
              ) : null}
            </ul>
          </div>

          <div>
            <h4 className="font-display text-white text-lg font-semibold mb-4">{t.footer.company}</h4>
            <ul className="space-y-2.5 text-base">
              <li>
                <a href="/#historia" className="hover:text-asli-primary transition-colors duration-320">
                  {t.footer.ourStory}
                </a>
              </li>
              <li>
                <a href="/tracking" className="hover:text-asli-primary transition-colors duration-320">
                  {t.footer.tracking}
                </a>
              </li>
              <li>
                <a href="/#contacto" className="hover:text-asli-primary transition-colors duration-320">
                  {t.footer.contact}
                </a>
              </li>
              <li>
                <a href="/presentacion" className="hover:text-asli-primary transition-colors duration-320">
                  {t.footer.presentation}
                </a>
              </li>
              <li>
                <a href="/asesoria-logistica-integral" className="hover:text-asli-primary transition-colors duration-320">
                  {t.footer.integralAdvice}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <p className="text-base text-white/75 max-w-xl">
            © {new Date().getFullYear()} ASLI — Asesorías y Servicios Logísticos
            Integrales Ltda. {t.footer.rights}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button type="button" onClick={handleVisitanosClick} className="btn-secondary !bg-transparent !text-white !border-white/30 hover:!border-white hover:!bg-white hover:!text-asli-ink !py-2.5 !px-5 text-sm">
              {t.footer.visit}
            </button>
            <button type="button" onClick={handleContactanosClick} className="btn-primary !py-2.5 !px-5 text-sm">
              {t.footer.contactUs}
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
