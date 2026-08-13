import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { MarketingPageShell } from "@/components/marketing/MarketingPageShell";
import { FeatureChip, GlassCard, GhostButton, PrimaryButton, SectionHeader, inicioStyles } from "@/components/inicio/inicio-ui";

const servicios = [
  { key: "exportaciones" as const, icon: "lucide:ship", accent: "teal" },
  { key: "importaciones" as const, icon: "lucide:package-check", accent: "sky" },
  { key: "transporteTerrestre" as const, icon: "lucide:truck", accent: "olive" },
  { key: "transporteAereo" as const, icon: "lucide:plane", accent: "violet" },
  { key: "serviciosAduaneros" as const, icon: "lucide:file-check-2", accent: "teal" },
  { key: "gestionContenedores" as const, icon: "lucide:container", accent: "sky" },
  { key: "asesoriaLogistica" as const, icon: "lucide:lightbulb", accent: "olive" },
  { key: "certificacionOEA" as const, icon: "lucide:shield-check", accent: "violet" },
] as const;

const ventajas = [
  { key: "experiencia" as const, icon: "lucide:award" },
  { key: "redLogistica" as const, icon: "lucide:network" },
  { key: "acompanamiento" as const, icon: "lucide:users" },
] as const;

const accentIcon: Record<string, string> = {
  teal: "from-brand-teal/30 to-transparent text-brand-teal border-brand-teal/25",
  sky: "from-sky-400/25 to-transparent text-sky-300 border-sky-400/25",
  olive: "from-brand-olive/30 to-transparent text-brand-olive border-brand-olive/25",
  violet: "from-violet-400/25 to-transparent text-violet-300 border-violet-400/25",
};

export function ServiciosContent() {
  const { t } = useLocale();
  const tr = t.servicios;

  return (
    <MarketingPageShell>
      <header className="relative z-10 text-white pt-16 sm:pt-24 pb-12 sm:pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2.5 mb-6 px-4 py-2 rounded-full inicio-glass text-xs font-medium uppercase tracking-[0.18em] text-white/60">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-teal opacity-40" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-teal" />
              </span>
              {tr.heroTag}
            </div>
            <h1 className="inicio-display text-4xl sm:text-5xl lg:text-[3.15rem] font-extrabold leading-[1.05]">
              {tr.heroTitle.split(" ").slice(0, -1).join(" ")}{" "}
              <span className="inicio-gradient-text">{tr.heroTitle.split(" ").slice(-1)}</span>
            </h1>
            <p className="mt-5 text-base sm:text-lg text-white/55 max-w-xl leading-relaxed">
              {tr.heroSubtitle}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <PrimaryButton href="mailto:informaciones@asli.cl?subject=Solicitud%20de%20cotización">
                <Icon icon="lucide:mail" width={18} height={18} />
                {tr.ctaButton1}
              </PrimaryButton>
              <GhostButton href="https://wa.me/56968394225">
                <Icon icon="lucide:message-circle" width={18} height={18} />
                {tr.ctaButton2}
              </GhostButton>
            </div>
          </div>
        </div>
      </header>

      <section className={inicioStyles.section}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <SectionHeader
            tag={tr.servicesTag}
            title={tr.servicesTitle}
            subtitle={tr.servicesSubtitle}
            gradient
            align="left"
          />

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {servicios.map(({ key, icon, accent }, i) => (
              <GlassCard key={key} interactive className="p-5 sm:p-6">
                <div className="flex items-start justify-between mb-5">
                  <div
                    className={`w-12 h-12 rounded-2xl bg-gradient-to-br border flex items-center justify-center ${accentIcon[accent]}`}
                  >
                    <Icon icon={icon} width={22} height={22} />
                  </div>
                  <span className="inicio-display text-3xl font-black text-white/[0.08] tabular-nums leading-none">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="inicio-display text-lg font-bold text-white mb-2">
                  {tr[`${key}Title` as keyof typeof tr]}
                </h3>
                <p className="text-white/45 text-sm leading-relaxed">
                  {tr[`${key}Desc` as keyof typeof tr]}
                </p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      <section className={inicioStyles.sectionAlt}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <SectionHeader
            tag={tr.advantagesTag}
            title={tr.advantagesTitle}
            subtitle={tr.advantagesSubtitle}
          />
          <div className="grid sm:grid-cols-3 gap-3 sm:gap-4">
            {ventajas.map(({ key, icon }) => (
              <GlassCard key={key} interactive className="p-6 sm:p-8 text-center">
                <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-brand-teal/25 to-transparent border border-brand-teal/25 flex items-center justify-center">
                  <Icon icon={icon} className="text-brand-teal" width={26} height={26} />
                </div>
                <h3 className="inicio-display text-lg font-bold text-white mb-2">
                  {tr[`${key}Title` as keyof typeof tr]}
                </h3>
                <p className="text-white/45 text-sm leading-relaxed">
                  {tr[`${key}Desc` as keyof typeof tr]}
                </p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      <section className={`${inicioStyles.section} pb-10`}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <GlassCard className="p-8 sm:p-12 text-center">
            <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-brand-teal/15 border border-brand-teal/30 flex items-center justify-center">
              <Icon icon="lucide:headphones" className="text-brand-teal" width={26} height={26} />
            </div>
            <h2 className="inicio-display text-3xl sm:text-4xl font-bold inicio-gradient-text mb-3">
              {tr.ctaTitle}
            </h2>
            <p className="text-white/50 text-sm sm:text-base mb-8 max-w-md mx-auto leading-relaxed">
              {tr.ctaSubtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
              <PrimaryButton href="mailto:informaciones@asli.cl?subject=Solicitud%20de%20cotización">
                <Icon icon="lucide:mail" width={18} height={18} />
                {tr.ctaButton1}
              </PrimaryButton>
              <GhostButton href="https://wa.me/56968394225">
                <Icon icon="lucide:message-circle" width={18} height={18} />
                {tr.ctaButton2}
              </GhostButton>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <FeatureChip>{tr.ctaFeature1}</FeatureChip>
              <FeatureChip>{tr.ctaFeature2}</FeatureChip>
              <FeatureChip>{tr.ctaFeature3}</FeatureChip>
            </div>
          </GlassCard>
        </div>
      </section>
    </MarketingPageShell>
  );
}
