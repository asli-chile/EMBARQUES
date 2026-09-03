import { Icon } from "@iconify/react";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/lib/i18n";
import { withBase } from "@/lib/basePath";
import { MarketingPageShell } from "@/components/marketing/MarketingPageShell";
import { GlassCard, GhostButton, PrimaryButton, SectionHeader, inicioStyles } from "@/components/inicio/inicio-ui";

const missionCards = [
  { key: "proposito" as const, icon: "lucide:target" },
  { key: "mision" as const, icon: "lucide:compass" },
  { key: "vision" as const, icon: "lucide:eye" },
  { key: "valores" as const, icon: "lucide:heart-handshake" },
] as const;

const diferenciales = [
  { key: "experienciaFruticola" as const, icon: "lucide:apple" },
  { key: "redLogistica" as const, icon: "lucide:network" },
  { key: "acompanamiento" as const, icon: "lucide:users" },
  { key: "puertaPuerta" as const, icon: "lucide:door-open" },
] as const;

const metricas = [
  { key: "clientes" as const, value: 150, suffix: "+", icon: "lucide:building-2" },
  { key: "operaciones" as const, value: 5000, suffix: "+", icon: "lucide:package" },
  { key: "experiencia" as const, value: 15, suffix: "+", icon: "lucide:calendar-check" },
  { key: "paises" as const, value: 30, suffix: "+", icon: "lucide:globe" },
] as const;

const equipo = [
  { nombre: "Mario Basaez", cargo: "cargoFundador" as const },
  { nombre: "Hans Vasquez", cargo: "cargoOperaciones" as const },
  { nombre: "Poliana Cisternas", cargo: "cargoComercial" as const },
  { nombre: "Stefanie Cordova", cargo: "cargoAdminFinanzas" as const },
  { nombre: "Ricardo Lazo", cargo: "cargoComercioExterior" as const },
  { nombre: "Rocio Villarroel", cargo: "cargoSeguridad" as const },
  { nombre: "Rodrigo Castillo", cargo: "cargoEjecutivoComercialzonal" as const },
  { nombre: "Alex Cárdenas", cargo: "cargoTransportes" as const },
  { nombre: "Nina Scotti", cargo: "cargoEjecutivaComercial" as const },
  { nombre: "Rodrigo Cáceres", cargo: "cargoCustomerServices" as const },
] as const;

function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const duration = 1800;
          const steps = 50;
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
      { threshold: 0.4 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return (
    <span ref={ref} className="inicio-stat-value">
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

export function SobreNosotrosContent() {
  const { t } = useLocale();
  const tr = t.sobreNosotrosPage;

  return (
    <MarketingPageShell>
      <header className="relative z-10 inicio-ink pt-16 sm:pt-24 pb-12 sm:pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2.5 mb-6 text-xs font-semibold uppercase tracking-[0.14em] inicio-ink-mute">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-teal opacity-40" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-teal" />
              </span>
              {tr.heroTag}
            </div>
            <h1 className="inicio-display text-4xl sm:text-5xl lg:text-[3.15rem] font-extrabold leading-[1.05]">
              {tr.heroTitle}
            </h1>
            <p className="mt-5 text-base sm:text-lg inicio-ink-soft max-w-xl leading-relaxed">
              {tr.heroSubtitle}
            </p>
            <p className="mt-3 text-sm sm:text-base inicio-ink-mute max-w-2xl leading-relaxed">
              {tr.heroText}
            </p>
          </div>
        </div>
      </header>

      {/* Historia */}
      <section className={inicioStyles.section}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div>
              <SectionHeader
                align="left"
                tag={tr.historyTag}
                title={tr.historyTitle}
              />
              <div className="space-y-4 inicio-ink-soft text-sm sm:text-base leading-relaxed -mt-4">
                <p>{tr.historyP1}</p>
                <p>{tr.historyP2}</p>
                <p>{tr.historyP3}</p>
              </div>
              <blockquote className="mt-6 pl-4 border-l-2 border-brand-teal py-1">
                <p className="inicio-ink italic text-base sm:text-lg leading-relaxed">
                  “{tr.historyQuote}”
                </p>
              </blockquote>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch gap-4">
              <GlassCard className="flex-1 aspect-[4/3] p-0 overflow-hidden" reveal={false}>
                <div className="relative h-full min-h-[220px]">
                  <img
                    src={withBase("/images/puerto-contenedores.png")}
                    alt="Puerto con contenedores"
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-blue/60 via-transparent to-transparent" />
                </div>
              </GlassCard>
              <GlassCard className="sm:w-36 flex flex-col items-center justify-center p-6 text-center" reveal={false}>
                <p className="inicio-stat-value text-4xl font-bold">15+</p>
                <p className="text-[11px] inicio-ink-mute uppercase tracking-wider mt-2">{tr.yearsExperience}</p>
              </GlassCard>
            </div>
          </div>
        </div>
      </section>

      {/* Misión */}
      <section className={inicioStyles.sectionAlt}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <SectionHeader tag={tr.missionTag} title={tr.missionTitle} subtitle={tr.missionSubtitle} />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {missionCards.map(({ key, icon }) => {
              const isValores = key === "valores";
              return (
                <div key={key} data-inicio-reveal className="inicio-tile rounded-lg p-5 sm:p-6">
                  <div className="inicio-icon-box w-12 h-12 rounded-md flex items-center justify-center mb-4">
                    <Icon icon={icon} width={22} height={22} />
                  </div>
                  <h3 className="inicio-display text-lg font-bold inicio-ink mb-2">
                    {tr[`${key}Title` as keyof typeof tr]}
                  </h3>
                  {isValores ? (
                    <ul className="space-y-1.5 inicio-ink-mute text-sm">
                      {(tr.valoresList as string[]).map((valor) => (
                        <li key={valor} className="flex items-center gap-2">
                          <Icon icon="lucide:check" className="text-brand-teal shrink-0" width={14} height={14} />
                          {valor}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="inicio-ink-mute text-sm leading-relaxed">
                      {tr[`${key}Desc` as keyof typeof tr]}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Diferenciales */}
      <section className={inicioStyles.section}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <SectionHeader
            tag={tr.diferencialesTag}
            title={tr.diferencialesTitle}
            subtitle={tr.diferencialesSubtitle}
            align="left"
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {diferenciales.map(({ key, icon }, i) => (
              <GlassCard key={key} interactive className="p-6 text-center">
                <span className="inicio-display text-[10px] font-bold inicio-ink-faint tabular-nums block mb-3">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="inicio-icon-box w-14 h-14 mx-auto mb-4 rounded-md flex items-center justify-center">
                  <Icon icon={icon} width={24} height={24} />
                </div>
                <h3 className="inicio-display text-base font-bold inicio-ink mb-2">
                  {tr[`${key}Title` as keyof typeof tr]}
                </h3>
                <p className="inicio-ink-mute text-sm leading-relaxed">
                  {tr[`${key}Desc` as keyof typeof tr]}
                </p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* Métricas */}
      <section className={inicioStyles.sectionAlt}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <SectionHeader tag={tr.metricasTag} title={tr.metricasTitle} />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {metricas.map(({ key, value, suffix, icon }) => (
              <div key={key} data-inicio-reveal className="inicio-tile rounded-lg p-5 sm:p-6 text-center">
                <div className="inicio-icon-box w-11 h-11 mx-auto mb-4 rounded-md flex items-center justify-center">
                  <Icon icon={icon} width={20} height={20} />
                </div>
                <p className="text-3xl sm:text-4xl font-bold inicio-ink mb-1">
                  <AnimatedCounter target={value} suffix={suffix} />
                </p>
                <p className="text-[11px] inicio-ink-mute uppercase tracking-wider">
                  {tr[`${key}Label` as keyof typeof tr]}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Equipo */}
      <section className={inicioStyles.section}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <SectionHeader tag={tr.equipoTag} title={tr.equipoTitle} subtitle={tr.equipoSubtitle} />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {equipo.map(({ nombre, cargo }) => (
              <GlassCard key={nombre} interactive className="p-4 sm:p-5 text-center">
                <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 flex items-center justify-center rounded-md border border-brand-blue/12 bg-brand-cream">
                  <Icon icon="lucide:user" className="text-brand-blue/25" width={32} height={32} />
                </div>
                <h3 className="text-sm font-bold inicio-ink mb-0.5">{nombre}</h3>
                <p className="inicio-ink-mute text-xs leading-snug">{tr[cargo as keyof typeof tr]}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={`${inicioStyles.section} pb-10`}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <GlassCard className="p-8 sm:p-12 text-center">
            <div className="inicio-icon-box w-14 h-14 mx-auto mb-5 rounded-md flex items-center justify-center">
              <Icon icon="lucide:handshake" width={26} height={26} />
            </div>
            <h2 className="inicio-display text-3xl sm:text-4xl font-bold inicio-ink mb-3">
              {tr.ctaTitle}
            </h2>
            <p className="inicio-ink-mute text-sm sm:text-base mb-8 max-w-md mx-auto leading-relaxed">
              {tr.ctaSubtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <PrimaryButton href="mailto:informaciones@asli.cl?subject=Consulta%20desde%20web">
                <Icon icon="lucide:mail" width={18} height={18} />
                {tr.ctaButton1}
              </PrimaryButton>
              <GhostButton href="https://wa.me/56968394225">
                <Icon icon="lucide:message-circle" width={18} height={18} />
                {tr.ctaButton2}
              </GhostButton>
            </div>
          </GlassCard>
        </div>
      </section>
    </MarketingPageShell>
  );
}
