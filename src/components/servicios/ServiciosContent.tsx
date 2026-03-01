import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { brand } from "@/lib/brand";
import { useState, useEffect, useRef } from "react";

const servicios = [
  {
    key: "exportaciones" as const,
    icon: "lucide:ship",
    color: "blue",
  },
  {
    key: "importaciones" as const,
    icon: "lucide:package-check",
    color: "teal",
  },
  {
    key: "transporteTerrestre" as const,
    icon: "lucide:truck",
    color: "amber",
  },
  {
    key: "transporteAereo" as const,
    icon: "lucide:plane",
    color: "violet",
  },
  {
    key: "serviciosAduaneros" as const,
    icon: "lucide:file-check-2",
    color: "rose",
  },
  {
    key: "gestionContenedores" as const,
    icon: "lucide:container",
    color: "cyan",
  },
  {
    key: "asesoriaLogistica" as const,
    icon: "lucide:lightbulb",
    color: "emerald",
  },
  {
    key: "certificacionOEA" as const,
    icon: "lucide:shield-check",
    color: "indigo",
  },
] as const;

const ventajas = [
  {
    key: "experiencia" as const,
    icon: "lucide:award",
  },
  {
    key: "redLogistica" as const,
    icon: "lucide:network",
  },
  {
    key: "acompanamiento" as const,
    icon: "lucide:users",
  },
] as const;

const colorStyles: Record<string, { bg: string; border: string; text: string; iconBg: string; line: string }> = {
  blue: { bg: "bg-blue-500/10", border: "border-blue-500/30 hover:border-blue-400/60", text: "text-blue-400", iconBg: "bg-blue-500/20", line: "bg-blue-400" },
  teal: { bg: "bg-teal-500/10", border: "border-teal-500/30 hover:border-teal-400/60", text: "text-teal-400", iconBg: "bg-teal-500/20", line: "bg-teal-400" },
  amber: { bg: "bg-amber-500/10", border: "border-amber-500/30 hover:border-amber-400/60", text: "text-amber-400", iconBg: "bg-amber-500/20", line: "bg-amber-400" },
  violet: { bg: "bg-violet-500/10", border: "border-violet-500/30 hover:border-violet-400/60", text: "text-violet-400", iconBg: "bg-violet-500/20", line: "bg-violet-400" },
  rose: { bg: "bg-rose-500/10", border: "border-rose-500/30 hover:border-rose-400/60", text: "text-rose-400", iconBg: "bg-rose-500/20", line: "bg-rose-400" },
  cyan: { bg: "bg-cyan-500/10", border: "border-cyan-500/30 hover:border-cyan-400/60", text: "text-cyan-400", iconBg: "bg-cyan-500/20", line: "bg-cyan-400" },
  emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/30 hover:border-emerald-400/60", text: "text-emerald-400", iconBg: "bg-emerald-500/20", line: "bg-emerald-400" },
  indigo: { bg: "bg-indigo-500/10", border: "border-indigo-500/30 hover:border-indigo-400/60", text: "text-indigo-400", iconBg: "bg-indigo-500/20", line: "bg-indigo-400" },
};

export function ServiciosContent() {
  const { t } = useLocale();
  const tr = t.servicios;
  const mainRef = useRef<HTMLElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const mainElement = mainRef.current;
    if (!mainElement) return;
    const handleScroll = () => setShowScrollTop(mainElement.scrollTop > 400);
    mainElement.addEventListener("scroll", handleScroll);
    return () => mainElement.removeEventListener("scroll", handleScroll);
  }, []);

  const handleScrollToTop = () => {
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main ref={mainRef} className="flex-1 min-h-0 overflow-auto relative scroll-smooth" role="main">
      {/* Video de fondo */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/BACKGOUND PLANWETA.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/60" />
      </div>

      {/* Hero */}
      <header className="relative text-white py-20 sm:py-28 lg:py-36">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center">
            <span className="inline-block px-4 py-1.5 bg-brand-olive/30 border border-brand-olive/50 text-xs font-semibold text-white uppercase tracking-wider mb-4 sm:mb-6">
              {tr.heroTag}
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white mb-4 sm:mb-6">
              {tr.heroTitle}
            </h1>
            <p className="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto">
              {tr.heroSubtitle}
            </p>
          </div>
        </div>
      </header>

      {/* Grid de Servicios */}
      <section className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-10 sm:mb-14">
            <span className="inline-block px-4 py-1.5 bg-brand-blue/30 border border-brand-blue/50 text-xs font-semibold text-white uppercase tracking-wider mb-4">
              {tr.servicesTag}
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3">
              {tr.servicesTitle}
            </h2>
            <p className="text-white/60 max-w-xl mx-auto text-sm sm:text-base">
              {tr.servicesSubtitle}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {servicios.map(({ key, icon, color }) => {
              const styles = colorStyles[color];
              return (
                <div
                  key={key}
                  className={`group relative bg-black/40 backdrop-blur-md border ${styles.border} p-5 sm:p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-black/50 shadow-lg shadow-black/20`}
                >
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 ${styles.iconBg} flex items-center justify-center mb-4`}>
                    <Icon icon={icon} className={styles.text} width={28} height={28} />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
                    {tr[`${key}Title` as keyof typeof tr]}
                  </h3>
                  <p className="text-white/50 text-sm mb-4 line-clamp-3">
                    {tr[`${key}Desc` as keyof typeof tr]}
                  </p>
                  <button
                    type="button"
                    className={`inline-flex items-center gap-1.5 text-sm font-medium ${styles.text} opacity-0 group-hover:opacity-100 transition-opacity`}
                  >
                    {tr.moreInfo}
                    <Icon icon="lucide:arrow-right" width={16} height={16} />
                  </button>
                  <div className={`absolute bottom-0 left-0 right-0 h-1 ${styles.line} opacity-0 group-hover:opacity-60 transition-opacity`} />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Ventajas Diferenciales */}
      <section className="py-16 sm:py-24 bg-black/40 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10 sm:mb-14">
            <span className="inline-block px-4 py-1.5 bg-emerald-500/30 border border-emerald-500/50 text-xs font-semibold text-white uppercase tracking-wider mb-4">
              {tr.advantagesTag}
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3">
              {tr.advantagesTitle}
            </h2>
            <p className="text-white/60 max-w-xl mx-auto text-sm sm:text-base">
              {tr.advantagesSubtitle}
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
            {ventajas.map(({ key, icon }) => (
              <div
                key={key}
                className="text-center p-6 sm:p-8 bg-black/30 backdrop-blur-md border border-white/10 hover:border-emerald-500/40 transition-all"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                  <Icon icon={icon} className="text-emerald-400" width={32} height={32} />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
                  {tr[`${key}Title` as keyof typeof tr]}
                </h3>
                <p className="text-white/50 text-sm">
                  {tr[`${key}Desc` as keyof typeof tr]}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-16 sm:py-24">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-gradient-to-br from-brand-olive/20 to-brand-olive/5 backdrop-blur-md border border-brand-olive/30 p-8 sm:p-12 lg:p-16 text-center shadow-xl shadow-black/30">
            <Icon icon="lucide:headphones" className="text-brand-olive mx-auto mb-4 sm:mb-6" width={48} height={48} />
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3 sm:mb-4">
              {tr.ctaTitle}
            </h2>
            <p className="text-white/60 text-sm sm:text-base mb-6 sm:mb-8 max-w-xl mx-auto">
              {tr.ctaSubtitle}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <a
                href="mailto:informaciones@asli.cl?subject=Solicitud de cotización"
                className="inline-flex items-center justify-center gap-2 py-3 px-8 bg-brand-olive text-white font-semibold hover:bg-brand-olive/90 transition-colors shadow-lg shadow-brand-olive/30"
              >
                <Icon icon="lucide:mail" width={20} height={20} />
                {tr.ctaButton1}
              </a>
              <a
                href="https://wa.me/56968394225"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 py-3 px-8 bg-white/10 border border-white/30 text-white font-medium hover:bg-white/20 transition-colors"
              >
                <Icon icon="lucide:message-circle" width={20} height={20} />
                {tr.ctaButton2}
              </a>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 justify-center mt-6 sm:mt-8 text-xs sm:text-sm text-white/50">
              <span className="flex items-center justify-center gap-2">
                <Icon icon="lucide:check" className="text-emerald-400" width={14} height={14} />
                {tr.ctaFeature1}
              </span>
              <span className="flex items-center justify-center gap-2">
                <Icon icon="lucide:check" className="text-emerald-400" width={14} height={14} />
                {tr.ctaFeature2}
              </span>
              <span className="flex items-center justify-center gap-2">
                <Icon icon="lucide:check" className="text-emerald-400" width={14} height={14} />
                {tr.ctaFeature3}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 sm:py-12 bg-black/80 backdrop-blur-lg text-white border-t border-white/10">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-col items-center mb-6 sm:mb-8">
            <img src={brand.logo} alt={brand.companyTitle} width={160} height={80} className="h-10 sm:h-12 w-auto object-contain brightness-0 invert mb-4 sm:mb-6" />
            
            <div className="flex gap-2 sm:gap-3 mb-4 sm:mb-6">
              <a href="https://www.linkedin.com/company/aslichile/posts/?feedView=all" target="_blank" rel="noopener noreferrer" className="w-9 h-9 sm:w-10 sm:h-10 bg-white/15 border border-white/20 flex items-center justify-center hover:bg-white/25 hover:border-white/40 transition-colors" aria-label="LinkedIn">
                <Icon icon="mdi:linkedin" width={18} height={18} />
              </a>
              <a href="https://www.instagram.com/asli_chile/" target="_blank" rel="noopener noreferrer" className="w-9 h-9 sm:w-10 sm:h-10 bg-white/15 border border-white/20 flex items-center justify-center hover:bg-white/25 hover:border-white/40 transition-colors" aria-label="Instagram">
                <Icon icon="mdi:instagram" width={18} height={18} />
              </a>
              <a href="https://wa.me/56968394225" target="_blank" rel="noopener noreferrer" className="w-9 h-9 sm:w-10 sm:h-10 bg-white/15 border border-white/20 flex items-center justify-center hover:bg-white/25 hover:border-white/40 transition-colors" aria-label="WhatsApp">
                <Icon icon="mdi:whatsapp" width={18} height={18} />
              </a>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-x-6 sm:gap-y-2 text-[11px] sm:text-xs text-white/50">
              <span className="flex items-center gap-1.5">
                <Icon icon="lucide:map-pin" width={12} height={12} className="text-brand-teal flex-shrink-0" />
                <span className="text-center sm:text-left">{t.inicio.footerLocation}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Icon icon="lucide:mail" width={12} height={12} className="text-brand-teal flex-shrink-0" />
                {t.inicio.footerEmail}
              </span>
              <span className="flex items-center gap-1.5">
                <Icon icon="lucide:phone" width={12} height={12} className="text-brand-teal flex-shrink-0" />
                {t.inicio.footerPhone}
              </span>
            </div>
          </div>

          <div className="border-t border-white/10 pt-4 sm:pt-6 text-center">
            <p className="text-[10px] sm:text-xs text-white/30">
              © {new Date().getFullYear()} {brand.companyTitle} · {t.inicio.footerCopyright}
            </p>
          </div>
        </div>
      </footer>

      {/* Scroll to top */}
      <button
        type="button"
        onClick={handleScrollToTop}
        className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-10 h-10 sm:w-12 sm:h-12 bg-brand-blue/90 backdrop-blur-sm border border-white/20 text-white flex items-center justify-center shadow-lg hover:bg-brand-blue transition-all duration-300 ${showScrollTop ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}
        aria-label="Volver arriba"
      >
        <Icon icon="lucide:chevron-up" width={20} height={20} />
      </button>
    </main>
  );
}
