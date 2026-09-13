import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { withBase } from "@/lib/basePath";
import { AuthFormTrigger } from "@/components/auth/AuthFormTrigger";
import {
  pillars,
  stats,
  kpiConfig,
  type KpiData,
} from "./inicio-data";
import { FeatureChip, inicioButtonBase, inicioStyles, SectionHeader } from "./inicio-ui";
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
        <div className={inicioStyles.shell}>
          <SectionHeader
            tag={t.inicio.pillarsTag}
            title={t.inicio.pillarsTitle}
            subtitle={t.inicio.pillarsSubtitle}
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/*
              * Cada módulo con su acento de color y su marca de agua, los
              * mismos que tendrá cuando el usuario entre. El número de orden se
              * fue: numerar del 01 al 04 sugería una secuencia obligatoria, y
              * estos cuatro se usan a la vez, no uno detrás de otro.
              */}
            {pillars.map(({ key, descKey, icon, mark, accent, features }) => (
              <article key={key} data-inicio-reveal className={`inicio-pillar-card inicio-pillar-card--${accent}`}>
                <Icon icon={mark} className="inicio-shortcut-mark" width={150} height={150} aria-hidden />
                <span className="inicio-shortcut-icon relative z-[1]" aria-hidden>
                  <Icon icon={icon} width={26} height={26} />
                </span>
                <h3 className="relative z-[1] mt-4 inicio-display text-lg font-bold inicio-ink">
                  {t.inicio[key]}
                </h3>
                <p className="relative z-[1] mt-1.5 text-sm leading-relaxed inicio-ink-mute">
                  {t.inicio[descKey]}
                </p>
                <div className="relative z-[1] mt-4 flex flex-wrap gap-1.5">
                  {features.map((fKey) => (
                    <FeatureChip key={fKey}>{t.inicio[fKey]}</FeatureChip>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section data-inicio-section className={inicioStyles.sectionAlt}>
        <div className={inicioStyles.shell}>
          <SectionHeader tag={t.inicio.statsTag} title={t.inicio.statsTitle} subtitle={t.inicio.statsSubtitle} />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/*
              * Mismo lenguaje que los módulos: acento de color y alineación a
              * la izquierda. Centradas y grises, estas cifras parecían de otra
              * página; el número es lo que se mira, así que manda él y no el
              * ícono.
              */}
            {stats.map(({ valueKey, labelKey, icon, accent }) => (
              <div
                key={valueKey}
                data-inicio-reveal
                className={`inicio-pillar-card inicio-pillar-card--${accent} !p-5`}
              >
                <span className="inicio-shortcut-icon relative z-[1] !h-10 !w-10" aria-hidden>
                  <Icon icon={icon} width={20} height={20} />
                </span>
                <p className="inicio-stat-value relative z-[1] mt-3.5 text-3xl font-bold tabular-nums sm:text-4xl">
                  {t.inicio[valueKey]}
                </p>
                <p className="relative z-[1] mt-1 text-[11px] uppercase tracking-wider inicio-ink-mute sm:text-xs">
                  {t.inicio[labelKey]}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/*
        * Se quitaron tres secciones: la comparación "antes y después", el flujo
        * de cinco pasos y los atajos.
        *
        * Las tres decían, con más palabras, lo que las cuatro tarjetas de
        * arriba y los módulos del hero ya muestran. Una página de entrada que
        * repite su argumento tres veces no convence más: cansa, y lo que
        * importa queda enterrado al final.
        */}

      {/* KPI preview */}
      <section data-inicio-section className={inicioStyles.sectionAlt}>
        <div className={inicioStyles.shell}>
          <SectionHeader tag={t.inicio.kpiTag} title={t.inicio.kpiTitle} subtitle={t.inicio.kpiSubtitle} />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            {loadingKpis
              ? Array.from({ length: 4 }).map((_, i) => <KpiSkeletonCard key={i} />)
              : kpiConfig.map(({ key, descKey, dataKey, icon }, indice) => (
                  <div
                    key={key}
                    data-inicio-reveal
                    className={`inicio-pillar-card inicio-pillar-card--${
                      (["teal", "amber", "violet", "blue"] as const)[indice % 4]
                    } !p-5`}
                  >
                    <span className="inicio-shortcut-icon relative z-[1] !h-10 !w-10" aria-hidden>
                      <Icon icon={icon} width={18} height={18} />
                    </span>
                    <p className="inicio-stat-value relative z-[1] mt-3.5 text-3xl font-bold tabular-nums">
                      {kpiData[dataKey].toLocaleString(undefined)}
                    </p>
                    <p className="relative z-[1] mt-1 text-xs inicio-ink-soft">{t.inicio[key]}</p>
                    <p className="relative z-[1] text-[10px] inicio-ink-faint">{t.inicio[descKey]}</p>
                  </div>
                ))}
          </div>
          <div data-inicio-reveal>
            <a href={withBase("/dashboard")} className={`${inicioButtonBase} inicio-btn-ghost font-medium`}>
              <Icon icon="lucide:layout-dashboard" width={16} height={16} />
              {t.inicio.kpiCta}
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section data-inicio-section className={`${inicioStyles.section} pb-10`}>
        <div className={inicioStyles.shell}>
          <div data-inicio-reveal className="inicio-cta-panel rounded-lg px-6 py-10 sm:px-12 sm:py-14 text-center text-white">
            <h2 className="inicio-display text-3xl sm:text-4xl font-bold mb-4">{t.inicio.ctaFinalTitle}</h2>
            <p className="text-white/70 text-sm sm:text-base mb-8 max-w-md mx-auto">{t.inicio.ctaFinalSubtitle}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
              <AuthFormTrigger mode="registro" className={`${inicioButtonBase} inicio-btn-primary px-8`}>
                <Icon icon="lucide:user-plus" width={18} height={18} />
                {t.inicio.ctaFinalButton1}
              </AuthFormTrigger>
              <a
                href={`mailto:informaciones@asli.cl?subject=${encodeURIComponent(t.inicio.ctaDemoSubject)}`}
                className={`${inicioButtonBase} px-8 border border-white/25 font-medium text-white transition-colors hover:bg-white/10`}
              >
                <Icon icon="lucide:play-circle" width={18} height={18} />
                {t.inicio.ctaFinalButton2}
              </a>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center text-xs text-white/60">
              <span className="inline-flex items-center justify-center gap-2">
                <Icon icon="lucide:check" className="inicio-accent-text" width={14} height={14} />
                {t.inicio.ctaFinalFeature1}
              </span>
              <span className="inline-flex items-center justify-center gap-2">
                <Icon icon="lucide:check" className="inicio-accent-text" width={14} height={14} />
                {t.inicio.ctaFinalFeature2}
              </span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
