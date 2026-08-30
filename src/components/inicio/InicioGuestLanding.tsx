import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { withBase } from "@/lib/basePath";
import { AuthFormTrigger } from "@/components/auth/AuthFormTrigger";
import {
  pillars,
  stats,
  comparisons,
  workflowSteps,
  quickLinks,
  kpiConfig,
  type KpiData,
} from "./inicio-data";
import { FeatureChip, GlassCard, inicioButtonBase, inicioStyles, SectionHeader } from "./inicio-ui";
import { KpiSkeletonCard } from "./InicioSkeleton";

export function InicioGuestLanding({
  kpiData,
  loadingKpis,
}: {
  kpiData: KpiData;
  loadingKpis: boolean;
}) {
  const { t } = useLocale();

  return (
    <>
      {/* Pilares */}
      <section id="pilares" data-inicio-section className={inicioStyles.section}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <SectionHeader
            tag={t.inicio.pillarsTag}
            title={t.inicio.pillarsTitle}
            subtitle={t.inicio.pillarsSubtitle}
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {pillars.map(({ key, descKey, icon, features }, index) => (
              <GlassCard key={key} interactive className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="inicio-icon-box w-12 h-12 rounded-md flex items-center justify-center">
                    <Icon icon={icon} width={24} height={24} />
                  </div>
                  <span className="inicio-display text-4xl font-black text-brand-blue/10 tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="inicio-display text-lg font-bold inicio-ink mb-2">{t.inicio[key]}</h3>
                <p className="inicio-ink-mute text-sm mb-4 leading-relaxed">{t.inicio[descKey]}</p>
                <div className="flex flex-wrap gap-1.5">
                  {features.map((fKey) => (
                    <FeatureChip key={fKey}>{t.inicio[fKey]}</FeatureChip>
                  ))}
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section data-inicio-section className={inicioStyles.sectionAlt}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <SectionHeader tag={t.inicio.statsTag} title={t.inicio.statsTitle} subtitle={t.inicio.statsSubtitle} />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {stats.map(({ valueKey, labelKey, icon }) => (
              <div key={valueKey} data-inicio-reveal className="inicio-tile rounded-md p-6 text-center">
                <div className="inicio-icon-box w-11 h-11 mx-auto mb-4 rounded-md flex items-center justify-center">
                  <Icon icon={icon} width={20} height={20} />
                </div>
                <p className="inicio-stat-value text-3xl sm:text-4xl font-bold mb-1">{t.inicio[valueKey]}</p>
                <p className="text-[11px] sm:text-xs inicio-ink-mute uppercase tracking-wider">{t.inicio[labelKey]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparación */}
      <section data-inicio-section className={inicioStyles.section}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <SectionHeader
            tag={t.inicio.comparisonTag}
            title={t.inicio.comparisonTitle}
            subtitle={t.inicio.comparisonSubtitle}
          />
          <GlassCard className="hidden sm:block overflow-hidden p-0" reveal>
            <div className="grid grid-cols-2 border-b inicio-line">
              <div className="px-6 py-4 bg-brand-red/8 text-brand-red text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <Icon icon="lucide:x" width={14} height={14} />
                {t.inicio.comparisonBefore}
              </div>
              <div className="px-6 py-4 bg-brand-teal/8 text-brand-teal text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <Icon icon="lucide:check" width={14} height={14} />
                {t.inicio.comparisonAfter}
              </div>
            </div>
            {comparisons.map(({ beforeKey, afterKey }, i) => (
              <div key={beforeKey} className={`grid grid-cols-2 ${i < comparisons.length - 1 ? "border-b inicio-line" : ""}`}>
                <div className="px-6 py-4 border-r inicio-line text-sm inicio-ink-mute">{t.inicio[beforeKey]}</div>
                <div className="px-6 py-4 text-sm inicio-ink font-medium">{t.inicio[afterKey]}</div>
              </div>
            ))}
          </GlassCard>
          <div data-inicio-reveal className="sm:hidden space-y-3">
            {comparisons.map(({ beforeKey, afterKey }) => (
              <GlassCard key={beforeKey} className="p-0 overflow-hidden" reveal={false}>
                <div className="px-4 py-3 bg-brand-red/8 inicio-ink-mute text-xs flex gap-2">
                  <Icon icon="lucide:x" className="text-brand-red shrink-0 mt-0.5" width={14} height={14} />
                  {t.inicio[beforeKey]}
                </div>
                <div className="px-4 py-3 flex gap-2 text-xs inicio-ink">
                  <Icon icon="lucide:check" className="text-brand-teal shrink-0 mt-0.5" width={14} height={14} />
                  {t.inicio[afterKey]}
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section data-inicio-section className={inicioStyles.sectionAlt}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <SectionHeader tag={t.inicio.workflowTag} title={t.inicio.workflowTitle} subtitle={t.inicio.workflowSubtitle} />
          <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory lg:grid lg:grid-cols-5 lg:overflow-visible lg:pb-0">
            {workflowSteps.map(({ key, descKey, icon, num }) => (
              <GlassCard key={key} className="min-w-[200px] snap-start p-5 lg:min-w-0" interactive>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs font-bold inicio-accent-text tabular-nums">{num}</span>
                  <div className="inicio-icon-box w-10 h-10 rounded-md flex items-center justify-center">
                    <Icon icon={icon} width={18} height={18} />
                  </div>
                </div>
                <h3 className="inicio-display text-sm font-bold inicio-ink mb-1">{t.inicio[key]}</h3>
                <p className="inicio-ink-mute text-xs leading-relaxed">{t.inicio[descKey]}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* Quick links */}
      <section data-inicio-section className={inicioStyles.section}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <SectionHeader tag={t.inicio.quickLinksTag} title={t.inicio.quickLinksTitle} subtitle={t.inicio.quickLinksSubtitle} />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {quickLinks.map(({ key, descKey, href, icon }) => (
              <a key={key} href={withBase(href)} data-inicio-reveal className="group">
                <GlassCard interactive className="flex items-center gap-3 p-4" reveal={false}>
                  <Icon icon={icon} className="text-brand-teal shrink-0 transition-transform group-hover:scale-110" width={20} height={20} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold inicio-ink">{t.inicio[key]}</p>
                    <p className="text-xs inicio-ink-mute truncate">{t.inicio[descKey]}</p>
                  </div>
                </GlassCard>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* KPI preview */}
      <section data-inicio-section className={inicioStyles.sectionAlt}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <SectionHeader tag={t.inicio.kpiTag} title={t.inicio.kpiTitle} subtitle={t.inicio.kpiSubtitle} />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            {loadingKpis
              ? Array.from({ length: 4 }).map((_, i) => <KpiSkeletonCard key={i} />)
              : kpiConfig.map(({ key, descKey, dataKey, icon }) => (
                  <GlassCard key={key} className="p-5">
                    <Icon icon={icon} className="text-brand-teal mb-3" width={18} height={18} />
                    <p className="inicio-stat-value text-3xl font-bold tabular-nums">
                      {kpiData[dataKey].toLocaleString(undefined)}
                    </p>
                    <p className="text-xs inicio-ink-soft mt-1">{t.inicio[key]}</p>
                    <p className="text-[10px] inicio-ink-faint">{t.inicio[descKey]}</p>
                  </GlassCard>
                ))}
          </div>
          <div data-inicio-reveal className="text-center">
            <a href={withBase("/dashboard")} className={`${inicioButtonBase} inicio-btn-ghost font-medium`}>
              <Icon icon="lucide:layout-dashboard" width={16} height={16} />
              {t.inicio.kpiCta}
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section data-inicio-section className={`${inicioStyles.section} pb-10`}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div data-inicio-reveal className="rounded-lg bg-brand-blue px-6 py-10 sm:px-12 sm:py-14 text-center text-white">
            <h2 className="inicio-display text-3xl sm:text-4xl font-bold mb-4">{t.inicio.ctaFinalTitle}</h2>
            <p className="text-white/70 text-sm sm:text-base mb-8 max-w-md mx-auto">{t.inicio.ctaFinalSubtitle}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
              <AuthFormTrigger mode="registro" className={`${inicioButtonBase} inicio-btn-primary px-8`}>
                <Icon icon="lucide:user-plus" width={18} height={18} />
                {t.inicio.ctaFinalButton1}
              </AuthFormTrigger>
              <a
                href="mailto:informaciones@asli.cl?subject=Solicitud de demo EMBARQUES"
                className={`${inicioButtonBase} px-8 border border-white/25 font-medium text-white transition-colors hover:bg-white/10`}
              >
                <Icon icon="lucide:play-circle" width={18} height={18} />
                {t.inicio.ctaFinalButton2}
              </a>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center text-xs text-white/60">
              <span className="inline-flex items-center justify-center gap-2">
                <Icon icon="lucide:check" className="text-brand-teal" width={14} height={14} />
                {t.inicio.ctaFinalFeature1}
              </span>
              <span className="inline-flex items-center justify-center gap-2">
                <Icon icon="lucide:check" className="text-brand-teal" width={14} height={14} />
                {t.inicio.ctaFinalFeature2}
              </span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
