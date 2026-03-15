import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { brand } from "@/lib/brand";
import { useState, useEffect, useRef, useCallback } from "react";

const servicios = [
  {
    key: "exportaciones" as const,
    icon: "lucide:ship",
    color: "blue",
    num: "01",
  },
  {
    key: "importaciones" as const,
    icon: "lucide:package-check",
    color: "teal",
    num: "02",
  },
  {
    key: "transporteTerrestre" as const,
    icon: "lucide:truck",
    color: "amber",
    num: "03",
  },
  {
    key: "transporteAereo" as const,
    icon: "lucide:plane",
    color: "violet",
    num: "04",
  },
  {
    key: "serviciosAduaneros" as const,
    icon: "lucide:file-check-2",
    color: "rose",
    num: "05",
  },
  {
    key: "gestionContenedores" as const,
    icon: "lucide:container",
    color: "cyan",
    num: "06",
  },
  {
    key: "asesoriaLogistica" as const,
    icon: "lucide:lightbulb",
    color: "emerald",
    num: "07",
  },
  {
    key: "certificacionOEA" as const,
    icon: "lucide:shield-check",
    color: "indigo",
    num: "08",
  },
] as const;

const ventajas = [
  { key: "experiencia" as const, icon: "lucide:award", color: "emerald" },
  { key: "redLogistica" as const, icon: "lucide:network", color: "cyan" },
  { key: "acompanamiento" as const, icon: "lucide:users", color: "violet" },
] as const;

const colorStyles: Record<string, {
  border: string;
  iconGradient: string;
  iconBorder: string;
  iconColor: string;
  iconGlow: string;
  accent: string;
  numColor: string;
  glow: string;
  tag: string;
}> = {
  blue: {
    border: "border-blue-500/25 hover:border-blue-400/60",
    iconGradient: "from-blue-500/30 to-blue-900/20",
    iconBorder: "border-blue-500/40",
    iconColor: "text-blue-300",
    iconGlow: "drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]",
    accent: "bg-blue-500",
    numColor: "text-blue-500/20",
    glow: "group-hover:shadow-blue-500/10",
    tag: "bg-blue-500/20 border-blue-500/40 text-blue-300",
  },
  teal: {
    border: "border-teal-500/25 hover:border-teal-400/60",
    iconGradient: "from-teal-500/30 to-teal-900/20",
    iconBorder: "border-teal-500/40",
    iconColor: "text-teal-300",
    iconGlow: "drop-shadow-[0_0_8px_rgba(20,184,166,0.6)]",
    accent: "bg-teal-500",
    numColor: "text-teal-500/20",
    glow: "group-hover:shadow-teal-500/10",
    tag: "bg-teal-500/20 border-teal-500/40 text-teal-300",
  },
  amber: {
    border: "border-amber-500/25 hover:border-amber-400/60",
    iconGradient: "from-amber-500/30 to-amber-900/20",
    iconBorder: "border-amber-500/40",
    iconColor: "text-amber-300",
    iconGlow: "drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]",
    accent: "bg-amber-500",
    numColor: "text-amber-500/20",
    glow: "group-hover:shadow-amber-500/10",
    tag: "bg-amber-500/20 border-amber-500/40 text-amber-300",
  },
  violet: {
    border: "border-violet-500/25 hover:border-violet-400/60",
    iconGradient: "from-violet-500/30 to-violet-900/20",
    iconBorder: "border-violet-500/40",
    iconColor: "text-violet-300",
    iconGlow: "drop-shadow-[0_0_8px_rgba(139,92,246,0.6)]",
    accent: "bg-violet-500",
    numColor: "text-violet-500/20",
    glow: "group-hover:shadow-violet-500/10",
    tag: "bg-violet-500/20 border-violet-500/40 text-violet-300",
  },
  rose: {
    border: "border-rose-500/25 hover:border-rose-400/60",
    iconGradient: "from-rose-500/30 to-rose-900/20",
    iconBorder: "border-rose-500/40",
    iconColor: "text-rose-300",
    iconGlow: "drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]",
    accent: "bg-rose-500",
    numColor: "text-rose-500/20",
    glow: "group-hover:shadow-rose-500/10",
    tag: "bg-rose-500/20 border-rose-500/40 text-rose-300",
  },
  cyan: {
    border: "border-cyan-500/25 hover:border-cyan-400/60",
    iconGradient: "from-cyan-500/30 to-cyan-900/20",
    iconBorder: "border-cyan-500/40",
    iconColor: "text-cyan-300",
    iconGlow: "drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]",
    accent: "bg-cyan-500",
    numColor: "text-cyan-500/20",
    glow: "group-hover:shadow-cyan-500/10",
    tag: "bg-cyan-500/20 border-cyan-500/40 text-cyan-300",
  },
  emerald: {
    border: "border-emerald-500/25 hover:border-emerald-400/60",
    iconGradient: "from-emerald-500/30 to-emerald-900/20",
    iconBorder: "border-emerald-500/40",
    iconColor: "text-emerald-300",
    iconGlow: "drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]",
    accent: "bg-emerald-500",
    numColor: "text-emerald-500/20",
    glow: "group-hover:shadow-emerald-500/10",
    tag: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300",
  },
  indigo: {
    border: "border-indigo-500/25 hover:border-indigo-400/60",
    iconGradient: "from-indigo-500/30 to-indigo-900/20",
    iconBorder: "border-indigo-500/40",
    iconColor: "text-indigo-300",
    iconGlow: "drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]",
    accent: "bg-indigo-500",
    numColor: "text-indigo-500/20",
    glow: "group-hover:shadow-indigo-500/10",
    tag: "bg-indigo-500/20 border-indigo-500/40 text-indigo-300",
  },
};

export function ServiciosContent() {
  const { t } = useLocale();
  const tr = t.servicios;
  const mainRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const mainElement = mainRef.current;
    if (!mainElement) return;
    const handleScroll = () => setShowScrollTop(mainElement.scrollTop > 400);
    mainElement.addEventListener("scroll", handleScroll);
    return () => mainElement.removeEventListener("scroll", handleScroll);
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.currentTime < 0.3) video.currentTime = 0.5;
    if (video.duration - video.currentTime < 0.5) video.currentTime = 0.5;
  }, []);

  const handleScrollToTop = () => {
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main ref={mainRef} className="flex-1 min-h-0 overflow-auto relative scroll-smooth" role="main">
      {/* Video de fondo */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          onTimeUpdate={handleTimeUpdate}
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
            <span className="inline-block px-4 py-1.5 bg-brand-olive/20 border border-brand-olive/40 text-xs font-semibold text-brand-olive uppercase tracking-wider mb-4 sm:mb-6 rounded-full">
              {tr.heroTag}
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold tracking-tight text-white mb-4 sm:mb-6">
              {tr.heroTitle}
            </h1>
            <p className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">
              {tr.heroSubtitle}
            </p>
          </div>
        </div>
      </header>

      {/* Grid de Servicios */}
      <section className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-10 sm:mb-14">
            <span className="inline-block px-4 py-1.5 bg-blue-500/20 border border-blue-500/40 text-xs font-semibold text-blue-300 uppercase tracking-wider mb-4 rounded-full">
              {tr.servicesTag}
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3">
              {tr.servicesTitle}
            </h2>
            <p className="text-white/50 max-w-xl mx-auto text-sm sm:text-base">
              {tr.servicesSubtitle}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {servicios.map(({ key, icon, color, num }) => {
              const c = colorStyles[color];
              return (
                <div
                  key={key}
                  className={`group relative bg-black/40 backdrop-blur-md border ${c.border} rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:bg-black/55 shadow-xl shadow-black/30 ${c.glow}`}
                >
                  {/* Línea de acento superior */}
                  <div className={`absolute top-0 left-0 right-0 h-[2px] ${c.accent} opacity-70`} />

                  {/* Ícono decorativo de fondo */}
                  <div className="absolute -bottom-4 -right-4 opacity-[0.04] pointer-events-none">
                    <Icon icon={icon} width={120} height={120} />
                  </div>

                  <div className="relative p-5 sm:p-6">
                    {/* Ícono + número */}
                    <div className="flex items-center gap-4 mb-5">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${c.iconGradient} border ${c.iconBorder} flex items-center justify-center shadow-lg flex-shrink-0`}>
                        <Icon icon={icon} className={`${c.iconColor} ${c.iconGlow}`} width={28} height={28} />
                      </div>
                      <span className={`text-5xl font-black ${c.numColor} leading-none select-none`}>{num}</span>
                    </div>

                    {/* Título y descripción */}
                    <h3 className="text-lg font-bold text-white mb-2">
                      {tr[`${key}Title` as keyof typeof tr]}
                    </h3>
                    <p className="text-white/50 text-sm leading-relaxed line-clamp-3">
                      {tr[`${key}Desc` as keyof typeof tr]}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Ventajas Diferenciales */}
      <section className="py-16 sm:py-24 bg-black/50 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10 sm:mb-14">
            <span className="inline-block px-4 py-1.5 bg-emerald-500/20 border border-emerald-500/40 text-xs font-semibold text-emerald-300 uppercase tracking-wider mb-4 rounded-full">
              {tr.advantagesTag}
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3">
              {tr.advantagesTitle}
            </h2>
            <p className="text-white/50 max-w-xl mx-auto text-sm sm:text-base">
              {tr.advantagesSubtitle}
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
            {ventajas.map(({ key, icon, color }) => {
              const c = colorStyles[color];
              return (
                <div
                  key={key}
                  className={`group relative text-center bg-black/40 backdrop-blur-md border ${c.border} rounded-2xl overflow-hidden p-6 sm:p-8 transition-all duration-300 hover:-translate-y-1 shadow-xl shadow-black/20 ${c.glow}`}
                >
                  {/* Línea de acento superior */}
                  <div className={`absolute top-0 left-0 right-0 h-[2px] ${c.accent} opacity-70`} />

                  {/* Ícono decorativo de fondo */}
                  <div className="absolute -bottom-4 -right-4 opacity-[0.04] pointer-events-none">
                    <Icon icon={icon} width={100} height={100} />
                  </div>

                  <div className={`relative z-10 w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 bg-gradient-to-br ${c.iconGradient} border ${c.iconBorder} rounded-2xl flex items-center justify-center shadow-lg`}>
                    <Icon icon={icon} className={`${c.iconColor} ${c.iconGlow}`} width={32} height={32} />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
                    {tr[`${key}Title` as keyof typeof tr]}
                  </h3>
                  <p className="text-white/50 text-sm leading-relaxed">
                    {tr[`${key}Desc` as keyof typeof tr]}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-16 sm:py-24">
        <div className="max-w-3xl mx-auto px-4">
          <div className="relative bg-black/50 backdrop-blur-md border border-brand-olive/30 rounded-2xl overflow-hidden p-8 sm:p-12 lg:p-16 text-center shadow-xl shadow-black/30">
            {/* Línea de acento superior */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-brand-olive opacity-70" />

            {/* Ícono decorativo de fondo */}
            <div className="absolute -bottom-8 -right-8 opacity-[0.04] pointer-events-none">
              <Icon icon="lucide:headphones" width={180} height={180} />
            </div>

            <div className="relative z-10">
              <div className="w-16 h-16 mx-auto mb-4 sm:mb-6 bg-gradient-to-br from-brand-olive/30 to-brand-olive/10 border border-brand-olive/40 rounded-2xl flex items-center justify-center shadow-lg">
                <Icon icon="lucide:headphones" className="text-brand-olive drop-shadow-[0_0_10px_rgba(102,153,0,0.6)]" width={32} height={32} />
              </div>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3 sm:mb-4">
                {tr.ctaTitle}
              </h2>
              <p className="text-white/60 text-sm sm:text-base mb-6 sm:mb-8 max-w-xl mx-auto leading-relaxed">
                {tr.ctaSubtitle}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-6 sm:mb-8">
                <a
                  href="mailto:informaciones@asli.cl?subject=Solicitud de cotización"
                  className="inline-flex items-center justify-center gap-2 py-3 px-8 bg-brand-olive text-white font-semibold rounded-xl hover:bg-brand-olive/90 transition-colors shadow-lg shadow-brand-olive/30"
                >
                  <Icon icon="lucide:mail" width={20} height={20} />
                  {tr.ctaButton1}
                </a>
                <a
                  href="https://wa.me/56968394225"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 py-3 px-8 bg-white/10 border border-white/30 rounded-xl text-white font-medium hover:bg-white/20 transition-colors"
                >
                  <Icon icon="lucide:message-circle" width={20} height={20} />
                  {tr.ctaButton2}
                </a>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 justify-center text-xs sm:text-sm text-white/50">
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
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 bg-black/80 backdrop-blur-lg text-white border-t border-white/10">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-col items-center mb-4">
            <img src={brand.logo} alt={brand.companyTitle} width={160} height={80} className="h-8 sm:h-10 w-auto object-contain brightness-0 invert mb-3" />

            <div className="flex gap-2 sm:gap-3 mb-3">
              <a href="https://www.linkedin.com/company/aslichile/posts/?feedView=all" target="_blank" rel="noopener noreferrer" className="w-8 h-8 bg-white/15 border border-white/20 rounded-lg flex items-center justify-center hover:bg-white/25 hover:border-white/40 transition-colors" aria-label="LinkedIn">
                <Icon icon="mdi:linkedin" width={16} height={16} />
              </a>
              <a href="https://www.instagram.com/asli_chile/" target="_blank" rel="noopener noreferrer" className="w-8 h-8 bg-white/15 border border-white/20 rounded-lg flex items-center justify-center hover:bg-white/25 hover:border-white/40 transition-colors" aria-label="Instagram">
                <Icon icon="mdi:instagram" width={16} height={16} />
              </a>
              <a href="https://wa.me/56968394225" target="_blank" rel="noopener noreferrer" className="w-8 h-8 bg-white/15 border border-white/20 rounded-lg flex items-center justify-center hover:bg-white/25 hover:border-white/40 transition-colors" aria-label="WhatsApp">
                <Icon icon="mdi:whatsapp" width={16} height={16} />
              </a>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-x-6 text-[11px] sm:text-xs text-white/50">
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

          <div className="border-t border-white/10 pt-3 text-center">
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
        className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-10 h-10 sm:w-12 sm:h-12 bg-brand-blue/90 backdrop-blur-sm border border-white/20 rounded-xl text-white flex items-center justify-center shadow-lg hover:bg-brand-blue transition-all duration-300 ${showScrollTop ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}
        aria-label="Volver arriba"
      >
        <Icon icon="lucide:chevron-up" width={20} height={20} />
      </button>
    </main>
  );
}
