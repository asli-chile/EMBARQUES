import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { withBase } from "@/lib/basePath";
import { kpiConfig, pctChange, quickLinks, clientQuickLinks, type KpiData } from "./inicio-data";
import { GlassCard, inicioStyles, SectionHeader } from "./inicio-ui";
import { KpiSkeletonCard } from "./InicioSkeleton";

const kpiAccent = [
  { glow: "from-brand-teal/30 to-brand-teal/5", iconBg: "from-brand-teal/30 to-brand-teal/5", icon: "text-brand-teal" },
  { glow: "from-sky-400/25 to-blue-900/10", iconBg: "from-sky-400/25 to-transparent", icon: "text-sky-300" },
  { glow: "from-brand-olive/25 to-brand-olive/5", iconBg: "from-brand-olive/30 to-transparent", icon: "text-brand-olive" },
  { glow: "from-violet-400/20 to-violet-900/10", iconBg: "from-violet-400/25 to-transparent", icon: "text-violet-300" },
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
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-teal mb-1.5">
                {t.inicio.kpiTag}
              </p>
              <h2 className="inicio-display text-xl sm:text-2xl font-bold text-white">
                {t.inicio.kpiTitle}
              </h2>
              <p className="text-xs sm:text-sm text-white/40 mt-1">{t.inicio.kpiSubtitle}</p>
            </div>
            <a
              data-inicio-reveal
              href={withBase("/dashboard")}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-white/45 hover:text-brand-teal transition-colors"
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
                      <div
                        className={`absolute -top-10 -right-10 h-28 w-28 rounded-full bg-gradient-to-br ${accent.glow} blur-2xl opacity-90`}
                      />
                      <div className="relative flex items-start justify-between gap-2 mb-4">
                        <div
                          className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${accent.iconBg} border border-white/10 flex items-center justify-center`}
                        >
                          <Icon icon={icon} className={accent.icon} width={20} height={20} />
                        </div>
                        {delta !== null ? (
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full border ${
                              delta >= 0
                                ? "bg-brand-teal/15 text-brand-teal border-brand-teal/25"
                                : "bg-rose-500/10 text-rose-300 border-rose-400/25"
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
                          <span className="inline-flex items-center text-[10px] font-semibold px-2.5 py-1 rounded-full bg-white/5 text-white/40 border border-white/10">
                            {t.inicio.kpiHistoricBadge}
                          </span>
                        )}
                      </div>
                      <p className="inicio-stat-value relative text-4xl sm:text-[2.75rem] font-bold text-white leading-none tracking-tight tabular-nums">
                        {value.toLocaleString(undefined)}
                      </p>
                      <p className="relative mt-2.5 text-sm font-semibold text-white/90">{t.inicio[key]}</p>
                      <p className="relative text-xs text-white/40 mt-0.5 leading-snug">{t.inicio[descKey]}</p>
                      {compareKey ? (
                        <p className="relative text-[11px] text-white/30 mt-2">
                          {t.inicio.kpiVsPrevMonth}:{" "}
                          <span className="text-white/50 tabular-nums">
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
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-teal/25 to-transparent border border-brand-teal/20 flex items-center justify-center transition-transform duration-300 group-hover:scale-105 group-hover:border-brand-teal/40">
                      <Icon icon={icon} className="text-brand-teal" width={22} height={22} />
                    </div>
                    <span className="text-[10px] font-bold text-white/15 tabular-nums group-hover:text-white/25 transition-colors">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <div>
                    <h3 className="inicio-display text-base font-bold text-white group-hover:text-brand-teal/90 transition-colors">
                      {t.inicio[key]}
                    </h3>
                    <p className="text-white/45 text-xs sm:text-sm mt-1.5 leading-relaxed">{t.inicio[descKey]}</p>
                  </div>
                  <div className="mt-auto pt-1 flex items-center gap-1.5 text-xs font-medium text-brand-teal/70 group-hover:text-brand-teal transition-colors">
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
