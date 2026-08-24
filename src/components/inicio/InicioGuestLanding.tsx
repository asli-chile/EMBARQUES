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
import { FeatureChip, GlassCard, inicioStyles, SectionHeader } from "./inicio-ui";
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
            gradient
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {pillars.map(({ key, descKey, icon, features }, index) => (
              <GlassCard key={key} interactive className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-teal/30 to-transparent border border-brand-teal/25 flex items-center justify-center">
                    <Icon icon={icon} className="text-brand-teal" width={24} height={24} />
                  </div>
                  <span className="inicio-display text-4xl font-black text-white/[0.07] tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="inicio-display text-lg font-bold text-white mb-2">{t.inicio[key]}</h3>
                <p className="text-white/45 text-sm mb-4 leading-relaxed">{t.inicio[descKey]}</p>
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
              <GlassCard key={valueKey} interactive className="p-6 text-center">
                <div className="w-11 h-11 mx-auto mb-4 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center">
                  <Icon icon={icon} className="text-brand-teal" width={20} height={20} />
                </div>
                <p className="inicio-stat-value text-3xl sm:text-4xl font-bold inicio-gradient-text mb-1">{t.inicio[valueKey]}</p>
                <p className="text-[11px] sm:text-xs text-white/40 uppercase tracking-wider">{t.inicio[labelKey]}</p>
              </GlassCard>
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
            <div className="grid grid-cols-2 border-b border-white/8">
              <div className="px-6 py-4 bg-brand-red/10 text-brand-red text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <Icon icon="lucide:x" width={14} height={14} />
                {t.inicio.comparisonBefore}
              </div>
              <div className="px-6 py-4 bg-brand-teal/10 text-brand-teal text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <Icon icon="lucide:check" width={14} height={14} />
                {t.inicio.comparisonAfter}
              </div>
            </div>
            {comparisons.map(({ beforeKey, afterKey }, i) => (
              <div key={beforeKey} className={`grid grid-cols-2 ${i < comparisons.length - 1 ? "border-b border-white/6" : ""}`}>
                <div className="px-6 py-4 border-r border-white/6 text-sm text-white/45">{t.inicio[beforeKey]}</div>
                <div className="px-6 py-4 text-sm text-white/90 font-medium">{t.inicio[afterKey]}</div>
              </div>
            ))}
          </GlassCard>
          <div data-inicio-reveal className="sm:hidden space-y-3">
            {comparisons.map(({ beforeKey, afterKey }) => (
              <GlassCard key={beforeKey} className="p-0 overflow-hidden" reveal={false}>
                <div className="px-4 py-3 bg-brand-red/10 text-white/50 text-xs flex gap-2">
                  <Icon icon="lucide:x" className="text-brand-red shrink-0 mt-0.5" width={14} height={14} />
                  {t.inicio[beforeKey]}
                </div>
                <div className="px-4 py-3 flex gap-2 text-xs text-white/90">
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
                  <span className="text-xs font-bold text-brand-teal tabular-nums">{num}</span>
                  <div className="w-10 h-10 rounded-xl bg-brand-teal/15 border border-brand-teal/20 flex items-center justify-center">
                    <Icon icon={icon} className="text-brand-teal" width={18} height={18} />
                  </div>
                </div>
                <h3 className="inicio-display text-sm font-bold text-white mb-1">{t.inicio[key]}</h3>
                <p className="text-white/40 text-xs leading-relaxed">{t.inicio[descKey]}</p>
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
                  <Icon icon={icon} className="text-brand-teal shrink-0 group-hover:scale-110 transition-transform" width={20} height={20} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{t.inicio[key]}</p>
                    <p className="text-xs text-white/40 truncate">{t.inicio[descKey]}</p>
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
          <SectionHeader tag={t.inicio.kpiTag} title={t.inicio.kpiTitle} subtitle={t.inicio.kpiSubtitle} gradient />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            {loadingKpis
              ? Array.from({ length: 4 }).map((_, i) => <KpiSkeletonCard key={i} />)
              : kpiConfig.map(({ key, descKey, dataKey, icon }) => (
                  <GlassCard key={key} className="p-5">
                    <Icon icon={icon} className="text-brand-teal mb-3" width={18} height={18} />
                    <p className="inicio-stat-value text-3xl font-bold text-white tabular-nums">
                      {kpiData[dataKey].toLocaleString(undefined)}
                    </p>
                    <p className="text-xs text-white/50 mt-1">{t.inicio[key]}</p>
                    <p className="text-[10px] text-white/30">{t.inicio[descKey]}</p>
                  </GlassCard>
                ))}
          </div>
          <div data-inicio-reveal className="text-center">
            <a
              href={withBase("/dashboard")}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl inicio-glass text-white text-sm font-medium hover:border-brand-teal/30 transition-colors"
            >
              <Icon icon="lucide:layout-dashboard" width={16} height={16} />
              {t.inicio.kpiCta}
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section data-inicio-section className={`${inicioStyles.section} pb-10`}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <GlassCard className="p-8 sm:p-12 text-center" reveal>
            <h2 className="inicio-display text-3xl sm:text-4xl font-bold inicio-gradient-text mb-4">{t.inicio.ctaFinalTitle}</h2>
            <p className="text-white/50 text-sm sm:text-base mb-8 max-w-md mx-auto">{t.inicio.ctaFinalSubtitle}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
              <AuthFormTrigger
                mode="registro"
                className="inline-flex items-center justify-center gap-2.5 py-3 px-8 rounded-2xl inicio-btn-primary text-white font-semibold text-sm"
              >
                <Icon icon="lucide:user-plus" width={18} height={18} />
                {t.inicio.ctaFinalButton1}
              </AuthFormTrigger>
              <a
                href="mailto:informaciones@asli.cl?subject=Solicitud de demo EMBARQUES"
                className="inline-flex items-center justify-center gap-2.5 py-3 px-8 rounded-2xl border border-white/15 bg-white/[0.04] text-white/90 font-medium text-sm hover:bg-white/[0.08] transition-colors"
              >
                <Icon icon="lucide:play-circle" width={18} height={18} />
                {t.inicio.ctaFinalButton2}
              </a>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center text-xs text-white/40">
              <span className="inline-flex items-center justify-center gap-2">
                <Icon icon="lucide:check" className="text-brand-teal" width={14} height={14} />
                {t.inicio.ctaFinalFeature1}
              </span>
              <span className="inline-flex items-center justify-center gap-2">
                <Icon icon="lucide:check" className="text-brand-teal" width={14} height={14} />
                {t.inicio.ctaFinalFeature2}
              </span>
            </div>
          </GlassCard>
        </div>
      </section>
    </>
  );
}
