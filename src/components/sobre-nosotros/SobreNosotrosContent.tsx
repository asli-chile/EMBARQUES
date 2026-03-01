import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { brand } from "@/lib/brand";
import { useState, useEffect, useRef } from "react";

const missionCards = [
  { key: "proposito" as const, icon: "lucide:target", color: "blue" },
  { key: "mision" as const, icon: "lucide:compass", color: "emerald" },
  { key: "vision" as const, icon: "lucide:eye", color: "violet" },
  { key: "valores" as const, icon: "lucide:heart-handshake", color: "amber" },
] as const;

const diferenciales = [
  { key: "experienciaFruticola" as const, icon: "lucide:apple", color: "green" },
  { key: "redLogistica" as const, icon: "lucide:network", color: "blue" },
  { key: "acompanamiento" as const, icon: "lucide:users", color: "violet" },
  { key: "puertaPuerta" as const, icon: "lucide:door-open", color: "amber" },
] as const;

const metricas = [
  { key: "clientes" as const, value: 150, suffix: "+", icon: "lucide:building-2" },
  { key: "operaciones" as const, value: 5000, suffix: "+", icon: "lucide:package" },
  { key: "experiencia" as const, value: 15, suffix: "+", icon: "lucide:calendar-check" },
  { key: "paises" as const, value: 30, suffix: "+", icon: "lucide:globe" },
] as const;

const equipo = [
  {
    nombre: "Mario Basaez",
    cargo: "cargoFundador" as const,
    imagen: "/team/mario-basaez.jpg",
  },
  {
    nombre: "Hans Vasquez",
    cargo: "cargoOperaciones" as const,
    imagen: "/team/hans-vasquez.jpg",
  },
  {
    nombre: "Poliana Cisternas",
    cargo: "cargoComercial" as const,
    imagen: "/team/poliana-cisternas.jpg",
  },
  {
    nombre: "Stefanie Cordova",
    cargo: "cargoAdminFinanzas" as const,
    imagen: "/team/stefanie-cordova.jpg",
  },
  {
    nombre: "Ricardo Lazo",
    cargo: "cargoComercioExterior" as const,
    imagen: "/team/ricardo-lazo.jpg",
  },
  {
    nombre: "Rocio Villareal",
    cargo: "cargoSeguridad" as const,
    imagen: "/team/rocio-villareal.jpg",
  },
  {
    nombre: "Alex Cárdenas",
    cargo: "cargoTransportes" as const,
    imagen: "/team/alex-cardenas.jpg",
  },
  {
    nombre: "Nina Scotti",
    cargo: "cargoEjecutivaComercial" as const,
    imagen: "/team/nina-scotti.jpg",
  },
  {
    nombre: "Rodrigo Cáceres",
    cargo: "cargoCustomerServices" as const,
    imagen: "/team/rodrigo-caceres.jpg",
  },
] as const;

const colorStyles: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
  blue: { bg: "bg-blue-500/10", border: "border-blue-500/30 hover:border-blue-400/60", text: "text-blue-400", iconBg: "bg-blue-500/20" },
  emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/30 hover:border-emerald-400/60", text: "text-emerald-400", iconBg: "bg-emerald-500/20" },
  violet: { bg: "bg-violet-500/10", border: "border-violet-500/30 hover:border-violet-400/60", text: "text-violet-400", iconBg: "bg-violet-500/20" },
  amber: { bg: "bg-amber-500/10", border: "border-amber-500/30 hover:border-amber-400/60", text: "text-amber-400", iconBg: "bg-amber-500/20" },
  green: { bg: "bg-green-500/10", border: "border-green-500/30 hover:border-green-400/60", text: "text-green-400", iconBg: "bg-green-500/20" },
};

function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const duration = 2000;
          const steps = 60;
          const increment = target / steps;
          let current = 0;
          const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
              setCount(target);
              clearInterval(timer);
            } else {
              setCount(Math.floor(current));
            }
          }, duration / steps);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

export function SobreNosotrosContent() {
  const { t } = useLocale();
  const tr = t.sobreNosotrosPage;
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
        <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover">
          <source src="/BACKGOUND PLANWETA.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/60" />
      </div>

      {/* HERO - Quiénes Somos */}
      <header className="relative text-white py-20 sm:py-28 lg:py-36">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center">
            <span className="inline-block px-4 py-1.5 bg-brand-olive/30 border border-brand-olive/50 text-xs font-semibold text-white uppercase tracking-wider mb-4 sm:mb-6">
              {tr.heroTag}
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white mb-4 sm:mb-6">
              {tr.heroTitle}
            </h1>
            <p className="text-lg sm:text-xl text-brand-olive font-medium mb-4">
              {tr.heroSubtitle}
            </p>
            <p className="text-base sm:text-lg text-white/70 max-w-3xl mx-auto leading-relaxed">
              {tr.heroText}
            </p>
          </div>
        </div>
      </header>

      {/* Nuestra Historia */}
      <section className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="order-2 lg:order-1">
              <span className="inline-block px-4 py-1.5 bg-blue-500/30 border border-blue-500/50 text-xs font-semibold text-white uppercase tracking-wider mb-4">
                {tr.historyTag}
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-6">
                {tr.historyTitle}
              </h2>
              <div className="space-y-4 text-white/70 text-sm sm:text-base leading-relaxed">
                <p>{tr.historyP1}</p>
                <p>{tr.historyP2}</p>
                <p>{tr.historyP3}</p>
              </div>
              <blockquote className="mt-6 pl-4 border-l-4 border-brand-olive">
                <p className="text-white/90 italic text-base sm:text-lg">
                  "{tr.historyQuote}"
                </p>
              </blockquote>
            </div>
            <div className="order-1 lg:order-2">
              <div className="relative">
                <div className="aspect-[4/3] bg-black/40 backdrop-blur-md border border-white/20 overflow-hidden">
                  <img
                    src="/images/puerto-contenedores.jpg"
                    alt="Puerto con contenedores"
                    className="w-full h-full object-cover opacity-80"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Icon icon="lucide:ship" className="text-white/20" width={120} height={120} />
                  </div>
                </div>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 sm:w-32 sm:h-32 bg-brand-olive/20 border border-brand-olive/40 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-2xl sm:text-3xl font-bold text-brand-olive">15+</p>
                    <p className="text-[10px] sm:text-xs text-white/60">{tr.yearsExperience}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Propósito / Misión / Visión / Valores */}
      <section className="py-16 sm:py-24 bg-black/40 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-10 sm:mb-14">
            <span className="inline-block px-4 py-1.5 bg-emerald-500/30 border border-emerald-500/50 text-xs font-semibold text-white uppercase tracking-wider mb-4">
              {tr.missionTag}
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3">
              {tr.missionTitle}
            </h2>
            <p className="text-white/60 max-w-xl mx-auto text-sm sm:text-base">
              {tr.missionSubtitle}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {missionCards.map(({ key, icon, color }) => {
              const styles = colorStyles[color];
              const isValores = key === "valores";
              return (
                <div
                  key={key}
                  className={`group relative bg-black/40 backdrop-blur-md border ${styles.border} p-5 sm:p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-black/50 shadow-lg shadow-black/20`}
                >
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 ${styles.iconBg} flex items-center justify-center mb-4`}>
                    <Icon icon={icon} className={styles.text} width={28} height={28} />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-3">
                    {tr[`${key}Title` as keyof typeof tr]}
                  </h3>
                  {isValores ? (
                    <ul className="space-y-1.5 text-white/60 text-sm">
                      {(tr.valoresList as string[]).map((valor, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <Icon icon="lucide:check" className={styles.text} width={14} height={14} />
                          {valor}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-white/60 text-sm leading-relaxed">
                      {tr[`${key}Desc` as keyof typeof tr]}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Nuestros Diferenciales */}
      <section className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-10 sm:mb-14">
            <span className="inline-block px-4 py-1.5 bg-violet-500/30 border border-violet-500/50 text-xs font-semibold text-white uppercase tracking-wider mb-4">
              {tr.diferencialesTag}
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3">
              {tr.diferencialesTitle}
            </h2>
            <p className="text-white/60 max-w-xl mx-auto text-sm sm:text-base">
              {tr.diferencialesSubtitle}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {diferenciales.map(({ key, icon, color }) => {
              const styles = colorStyles[color];
              return (
                <div
                  key={key}
                  className={`group text-center p-6 sm:p-8 bg-black/40 backdrop-blur-md border ${styles.border} transition-all duration-300 hover:-translate-y-1`}
                >
                  <div className={`w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 ${styles.iconBg} flex items-center justify-center`}>
                    <Icon icon={icon} className={styles.text} width={36} height={36} />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white mb-2">
                    {tr[`${key}Title` as keyof typeof tr]}
                  </h3>
                  <p className="text-white/50 text-sm">
                    {tr[`${key}Desc` as keyof typeof tr]}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Métricas de Confianza */}
      <section className="py-16 sm:py-24 bg-gradient-to-r from-brand-olive/20 via-brand-olive/10 to-brand-olive/20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10 sm:mb-14">
            <span className="inline-block px-4 py-1.5 bg-brand-olive/30 border border-brand-olive/50 text-xs font-semibold text-white uppercase tracking-wider mb-4">
              {tr.metricasTag}
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3">
              {tr.metricasTitle}
            </h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {metricas.map(({ key, value, suffix, icon }) => (
              <div
                key={key}
                className="text-center p-6 sm:p-8 bg-black/40 backdrop-blur-md border border-white/20 hover:border-brand-olive/50 transition-all"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-4 bg-brand-olive/20 flex items-center justify-center">
                  <Icon icon={icon} className="text-brand-olive" width={24} height={24} />
                </div>
                <p className="text-3xl sm:text-4xl lg:text-5xl font-bold text-brand-olive mb-2">
                  <AnimatedCounter target={value} suffix={suffix} />
                </p>
                <p className="text-white/60 text-xs sm:text-sm">
                  {tr[`${key}Label` as keyof typeof tr]}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Nuestro Equipo */}
      <section className="py-16 sm:py-24">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10 sm:mb-14">
            <span className="inline-block px-4 py-1.5 bg-blue-500/30 border border-blue-500/50 text-xs font-semibold text-white uppercase tracking-wider mb-4">
              {tr.equipoTag}
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3">
              {tr.equipoTitle}
            </h2>
            <p className="text-white/60 max-w-xl mx-auto text-sm sm:text-base">
              {tr.equipoSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
            {equipo.map(({ nombre, cargo, imagen }) => (
              <div
                key={nombre}
                className="group text-center p-4 sm:p-6 bg-black/40 backdrop-blur-md border border-white/20 hover:border-brand-teal/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-brand-teal/10"
              >
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 mx-auto mb-4 rounded-full overflow-hidden border-3 border-brand-teal/60 group-hover:border-brand-teal transition-colors shadow-lg">
                  <img
                    src={imagen}
                    alt={nombre}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-teal/20 to-brand-blue/20 flex items-center justify-center">
                    <Icon icon="lucide:user" className="text-white/40" width={40} height={40} />
                  </div>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white mb-1">{nombre}</h3>
                <p className="text-brand-teal/80 text-xs sm:text-sm">{tr[cargo as keyof typeof tr]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-16 sm:py-24">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-gradient-to-br from-brand-olive/20 to-brand-olive/5 backdrop-blur-md border border-brand-olive/30 p-8 sm:p-12 lg:p-16 text-center shadow-xl shadow-black/30">
            <Icon icon="lucide:handshake" className="text-brand-olive mx-auto mb-4 sm:mb-6" width={48} height={48} />
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3 sm:mb-4">
              {tr.ctaTitle}
            </h2>
            <p className="text-white/60 text-sm sm:text-base mb-6 sm:mb-8 max-w-xl mx-auto">
              {tr.ctaSubtitle}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <a
                href="mailto:informaciones@asli.cl?subject=Consulta desde web"
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
