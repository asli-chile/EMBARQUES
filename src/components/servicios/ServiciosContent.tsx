import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { MarketingPageShell } from "@/components/marketing/MarketingPageShell";
import { FeatureChip, GlassCard, GhostButton, PrimaryButton, SectionHeader, inicioStyles } from "@/components/inicio/inicio-ui";

const servicios = [
  { key: "exportaciones" as const, icon: "lucide:ship", accent: "teal" },
  { key: "importaciones" as const, icon: "lucide:package-check", accent: "darkTeal" },
  { key: "transporteTerrestre" as const, icon: "lucide:truck", accent: "olive" },
  { key: "transporteAereo" as const, icon: "lucide:plane", accent: "navy" },
  { key: "serviciosAduaneros" as const, icon: "lucide:file-check-2", accent: "teal" },
  { key: "gestionContenedores" as const, icon: "lucide:container", accent: "darkTeal" },
  { key: "asesoriaLogistica" as const, icon: "lucide:lightbulb", accent: "olive" },
  { key: "certificacionOEA" as const, icon: "lucide:shield-check", accent: "navy" },
] as const;

const ventajas = [
  { key: "experiencia" as const, icon: "lucide:award" },
  { key: "redLogistica" as const, icon: "lucide:network" },
  { key: "acompanamiento" as const, icon: "lucide:users" },
] as const;

const accentIcon: Record<string, string> = {
  teal: "bg-brand-teal/10 border-brand-teal/25 text-brand-teal",
  darkTeal: "bg-brand-dark-teal/10 border-brand-dark-teal/25 text-brand-dark-teal",
  olive: "bg-brand-olive/10 border-brand-olive/25 text-brand-olive",
  navy: "bg-brand-blue/8 border-brand-blue/20 text-brand-blue",
};

export function ServiciosContent() {
  const { t } = useLocale();
  const tr = t.servicios;

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
              {tr.heroTitle.split(" ").slice(0, -1).join(" ")}{" "}
              <span className="inicio-accent-text">{tr.heroTitle.split(" ").slice(-1)}</span>
            </h1>
            <p className="mt-5 text-base sm:text-lg inicio-ink-mute max-w-xl leading-relaxed">
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
            align="left"
          />

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {servicios.map(({ key, icon, accent }, i) => (
              <GlassCard key={key} interactive className="p-5 sm:p-6">
                <div className="flex items-start justify-between mb-5">
                  <div className={`w-12 h-12 rounded-md border flex items-center justify-center ${accentIcon[accent]}`}>
                    <Icon icon={icon} width={22} height={22} />
                  </div>
                  <span className="inicio-display text-3xl font-black text-brand-blue/10 tabular-nums leading-none">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="inicio-display text-lg font-bold inicio-ink mb-2">
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

      <section className={inicioStyles.sectionAlt}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <SectionHeader
            tag={tr.advantagesTag}
            title={tr.advantagesTitle}
            subtitle={tr.advantagesSubtitle}
          />
          <div className="grid sm:grid-cols-3 gap-3 sm:gap-4">
            {ventajas.map(({ key, icon }) => (
              <div key={key} data-inicio-reveal className="inicio-tile rounded-lg p-6 sm:p-8 text-center">
                <div className="inicio-icon-box w-14 h-14 mx-auto mb-5 rounded-md flex items-center justify-center">
                  <Icon icon={icon} width={26} height={26} />
                </div>
                <h3 className="inicio-display text-lg font-bold inicio-ink mb-2">
                  {tr[`${key}Title` as keyof typeof tr]}
                </h3>
                <p className="inicio-ink-mute text-sm leading-relaxed">
                  {tr[`${key}Desc` as keyof typeof tr]}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={`${inicioStyles.section} pb-10`}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <GlassCard className="p-8 sm:p-12 text-center">
            <div className="inicio-icon-box w-14 h-14 mx-auto mb-5 rounded-md flex items-center justify-center">
              <Icon icon="lucide:headphones" width={26} height={26} />
            </div>
            <h2 className="inicio-display text-3xl sm:text-4xl font-bold inicio-ink mb-3">
              {tr.ctaTitle}
            </h2>
            <p className="inicio-ink-mute text-sm sm:text-base mb-8 max-w-md mx-auto leading-relaxed">
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
