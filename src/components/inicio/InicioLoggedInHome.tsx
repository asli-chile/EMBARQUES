import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { withBase } from "@/lib/basePath";
import { kpiConfig, pctChange, quickLinks, clientQuickLinks, type KpiData } from "./inicio-data";
import { GlassCard, inicioStyles, SectionHeader } from "./inicio-ui";
import { KpiSkeletonCard } from "./InicioSkeleton";

const kpiAccent = [
  { bar: "bg-brand-teal", icon: "text-brand-teal" },
  { bar: "bg-brand-dark-teal", icon: "text-brand-dark-teal" },
  { bar: "bg-brand-olive", icon: "text-brand-olive" },
  { bar: "bg-brand-blue", icon: "text-brand-blue" },
];

export function InicioLoggedInHome({
  kpiData,
  loadingKpis,
  isCliente = false,
}: {
  kpiData: KpiData;
  loadingKpis: boolean;
  isCliente?: boolean;
}) {
  const { t } = useLocale();
  const links = isCliente ? clientQuickLinks : quickLinks;
  const monthDelta = pctChange(kpiData.operacionesMesActual, kpiData.operacionesMesAnterior);

  return (
    <>
      <section data-inicio-section className="relative z-10 pb-8 sm:pb-12 -mt-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between gap-4 mb-5 px-0.5">
            <div data-inicio-reveal>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] inicio-accent-text mb-1.5">
                {t.inicio.kpiTag}
              </p>
              <h2 className="inicio-display text-xl sm:text-2xl font-bold inicio-ink">
                {t.inicio.kpiTitle}
              </h2>
              <p className="text-xs sm:text-sm inicio-ink-mute mt-1">{t.inicio.kpiSubtitle}</p>
            </div>
            <a
              data-inicio-reveal
              href={withBase("/dashboard")}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium inicio-ink-mute transition-colors hover:text-brand-teal"
            >
              {t.inicio.kpiCta}
              <Icon icon="lucide:arrow-up-right" width={14} height={14} />
            </a>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {loadingKpis
              ? Array.from({ length: 4 }).map((_, i) => <KpiSkeletonCard key={i} />)
              : kpiConfig.map(({ key, descKey, dataKey, icon, ...rest }, i) => {
                  const value = kpiData[dataKey];
                  const accent = kpiAccent[i];
                  const compareKey = "compareKey" in rest ? rest.compareKey : undefined;
                  const delta =
                    compareKey === "operacionesMesAnterior" ? monthDelta : null;
                  return (
                    <GlassCard key={key} interactive className="p-5 sm:p-6">
                      <span className={`absolute inset-x-0 top-0 h-0.5 ${accent.bar}`} />
                      <div className="relative flex items-start justify-between gap-2 mb-4">
                        <div className="inicio-tile w-11 h-11 rounded-md flex items-center justify-center">
                          <Icon icon={icon} className={accent.icon} width={20} height={20} />
                        </div>
                        {delta !== null ? (
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded border ${
                              delta >= 0
                                ? "bg-brand-teal/8 text-brand-teal border-brand-teal/25"
                                : "bg-brand-red/8 text-brand-red border-brand-red/25"
                            }`}
                          >
                            <Icon
                              icon={delta >= 0 ? "lucide:trending-up" : "lucide:trending-down"}
                              width={12}
                              height={12}
                            />
                            {delta > 0 ? `+${delta}%` : `${delta}%`}
                          </span>
                        ) : (
                          <span className="inicio-chip inline-flex items-center text-[10px] font-semibold px-2 py-1 rounded">
                            {t.inicio.kpiHistoricBadge}
                          </span>
                        )}
                      </div>
                      <p className="inicio-stat-value relative text-4xl sm:text-[2.75rem] font-bold leading-none tracking-tight tabular-nums">
                        {value.toLocaleString(undefined)}
                      </p>
                      <p className="relative mt-2.5 text-sm font-semibold inicio-ink">{t.inicio[key]}</p>
                      <p className="relative text-xs inicio-ink-mute mt-0.5 leading-snug">{t.inicio[descKey]}</p>
                      {compareKey ? (
                        <p className="relative text-[11px] inicio-ink-faint mt-2">
                          {t.inicio.kpiVsPrevMonth}:{" "}
                          <span className="inicio-ink-soft tabular-nums">
                            {kpiData.operacionesMesAnterior.toLocaleString(undefined)}
                          </span>
                        </p>
                      ) : null}
                    </GlassCard>
                  );
                })}
          </div>
        </div>
      </section>

      <section data-inicio-section className={inicioStyles.sectionAlt}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <SectionHeader
            align="left"
            tag={t.inicio.quickLinksTag}
            title={t.inicio.quickLinksTitle}
            subtitle={t.inicio.quickLinksSubtitle}
          />

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {links.map(({ key, descKey, href, icon }, i) => (
              <a key={key} href={withBase(href)} data-inicio-reveal className="block group">
                <GlassCard interactive className="h-full p-5 sm:p-6 flex flex-col gap-4" reveal={false}>
                  <div className="flex items-start justify-between">
                    <div className="inicio-icon-box w-12 h-12 rounded-md flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
                      <Icon icon={icon} width={22} height={22} />
                    </div>
                    <span className="text-[10px] font-bold inicio-ink-faint tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <div>
                    <h3 className="inicio-display text-base font-bold inicio-ink transition-colors group-hover:text-brand-teal">
                      {t.inicio[key]}
                    </h3>
                    <p className="inicio-ink-mute text-xs sm:text-sm mt-1.5 leading-relaxed">{t.inicio[descKey]}</p>
                  </div>
                  <div className="mt-auto pt-1 flex items-center gap-1.5 text-xs font-medium inicio-accent-text">
                    Abrir módulo
                    <Icon
                      icon="lucide:arrow-up-right"
                      width={14}
                      height={14}
                      className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    />
                  </div>
                </GlassCard>
              </a>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
