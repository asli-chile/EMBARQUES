import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { withBase } from "@/lib/basePath";
import { kpiConfig, pctChange, quickLinks, clientQuickLinks, type KpiData } from "./inicio-data";
import { inicioStyles } from "./inicio-ui";
import { KpiSkeletonCard } from "./InicioSkeleton";

type Section = "kpis" | "shortcuts" | "all";

/** Barras decorativas estables a partir del valor (no son serie temporal real). */
function sparkHeights(seed: number, count = 8): number[] {
  return Array.from({ length: count }, (_, i) => {
    const n = ((Math.abs(seed) + 1) * (i + 3) * 17) % 53;
    return 0.3 + (n / 53) * 0.7;
  });
}

function KpiSpark({ seed }: { seed: number }) {
  const heights = sparkHeights(seed);
  return (
    <div className="inicio-kpi-spark" aria-hidden>
      {heights.map((h, i) => (
        <span key={i} style={{ height: `${Math.round(h * 100)}%` }} />
      ))}
    </div>
  );
}

export function InicioLoggedInHome({
  kpiData,
  loadingKpis,
  isCliente = false,
  section = "all",
}: {
  kpiData: KpiData;
  loadingKpis: boolean;
  isCliente?: boolean;
  /** `kpis` = solo resumen; `shortcuts` = solo atajos; `all` = ambos. */
  section?: Section;
}) {
  const { t } = useLocale();
  const links = isCliente ? clientQuickLinks : quickLinks;
  const monthDelta = pctChange(kpiData.operacionesMesActual, kpiData.operacionesMesAnterior);
  const dashboardHref = withBase("/dashboard");

  const kpis = (
    <section data-inicio-section className="relative z-10 pb-6 sm:pb-8">
      <div className={inicioStyles.shell}>
        <div className="mb-6 flex flex-col gap-4 sm:mb-7 sm:flex-row sm:items-end sm:justify-between">
          <div data-inicio-reveal>
            <span className="mb-2 inline-flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] inicio-accent-text">
              <span className="h-px w-7 bg-[color-mix(in_srgb,var(--inicio-teal)_60%,transparent)]" />
              {t.inicio.kpiTag}
            </span>
            <h2 className="inicio-display text-2xl font-bold leading-tight inicio-ink sm:text-3xl">
              {t.inicio.kpiTitle}
            </h2>
            <p className="mt-1.5 text-sm inicio-ink-mute">{t.inicio.kpiSubtitle}</p>
          </div>
          <a data-inicio-reveal href={dashboardHref} className="inicio-kpi-cta hidden sm:inline-flex">
            {t.inicio.kpiCta}
            <Icon icon="lucide:arrow-right" width={14} height={14} />
          </a>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          {loadingKpis
            ? Array.from({ length: 4 }).map((_, i) => <KpiSkeletonCard key={i} />)
            : kpiConfig.map(({ key, descKey, dataKey, icon, accent, ...rest }) => {
                const value = kpiData[dataKey];
                const compareKey = "compareKey" in rest ? rest.compareKey : undefined;
                const delta =
                  compareKey === "operacionesMesAnterior" ? monthDelta : null;
                return (
                  <a
                    key={key}
                    href={dashboardHref}
                    data-inicio-reveal
                    className={`inicio-kpi-card inicio-kpi-card--${accent} group`}
                  >
                    <div className="relative z-[1] flex items-start justify-between gap-2">
                      <span className="inicio-kpi-icon" aria-hidden>
                        <Icon icon={icon} width={20} height={20} />
                      </span>
                      {delta !== null ? (
                        <span
                          className={`inicio-kpi-badge ${
                            delta >= 0 ? "inicio-kpi-badge--up" : "inicio-kpi-badge--down"
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
                        <span className="inicio-kpi-badge inicio-kpi-badge--mute">
                          {t.inicio.kpiHistoricBadge}
                        </span>
                      )}
                    </div>

                    <div className="relative z-[1] mt-4 flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        <p className="inicio-stat-value text-4xl font-bold leading-none tracking-tight tabular-nums sm:text-[2.6rem]">
                          {value.toLocaleString(undefined)}
                        </p>
                        <p className="mt-2.5 text-sm font-semibold inicio-ink">{t.inicio[key]}</p>
                        <p className="mt-0.5 text-xs leading-snug inicio-ink-mute">
                          {t.inicio[descKey]}
                          {compareKey ? (
                            <>
                              {" · "}
                              {t.inicio.kpiVsPrevMonth}:{" "}
                              <span className="tabular-nums inicio-ink-soft">
                                {kpiData.operacionesMesAnterior.toLocaleString(undefined)}
                              </span>
                            </>
                          ) : null}
                        </p>
                      </div>
                      <KpiSpark seed={value} />
                    </div>

                    <span className="inicio-kpi-historic relative z-[1]">
                      {t.inicio.kpiHistoricBadge}
                      <span className="inicio-kpi-historic-arrow" aria-hidden>
                        <Icon icon="lucide:chevron-right" width={12} height={12} />
                      </span>
                    </span>
                  </a>
                );
              })}
        </div>
      </div>
    </section>
  );

  const shortcuts = (
    <section
      data-inicio-section
      className="relative z-10 flex min-h-dvh flex-col justify-center py-16 sm:py-20 lg:py-24 inicio-shortcuts-band"
    >
      <div className={`${inicioStyles.shell} w-full`}>
        <div className="mb-10 flex flex-col gap-6 sm:mb-12 lg:mb-14 lg:flex-row lg:items-end lg:justify-between">
          <div data-inicio-reveal className="max-w-2xl">
            <span className="mb-3 inline-flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.14em] inicio-accent-text">
              <span className="h-px w-7 bg-[color-mix(in_srgb,var(--inicio-teal)_60%,transparent)]" />
              {t.inicio.quickLinksTag}
            </span>
            <h2 className="inicio-display text-3xl font-bold leading-[1.08] inicio-ink sm:text-4xl lg:text-5xl">
              {t.inicio.quickLinksTitle}
            </h2>
            <p className="mt-3 max-w-xl text-base leading-relaxed inicio-ink-mute sm:text-lg">
              {t.inicio.quickLinksSubtitle}
            </p>
          </div>
          <p
            data-inicio-reveal
            className="hidden max-w-[12rem] text-right text-[11px] font-semibold uppercase leading-relaxed tracking-[0.18em] inicio-ink-faint lg:block"
          >
            {t.inicio.quickLinksAside}
          </p>
        </div>

        <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3 xl:gap-6">
          {links.map(({ key, descKey, footKey, href, icon, mark, accent }) => (
            <a
              key={key}
              href={withBase(href)}
              data-inicio-reveal
              className={`inicio-shortcut-card inicio-shortcut-card--${accent} group`}
            >
              <Icon
                icon={mark}
                className="inicio-shortcut-mark"
                width={160}
                height={160}
                aria-hidden
              />
              <span className="inicio-shortcut-icon" aria-hidden>
                <Icon icon={icon} width={32} height={32} />
              </span>
              <span className="relative z-[1] flex min-w-0 flex-1 flex-col justify-center gap-1.5 pr-2">
                <span className="block text-lg font-semibold leading-snug inicio-ink sm:text-xl">
                  {t.inicio[key]}
                </span>
                <span className="block text-sm leading-snug inicio-ink-mute sm:text-[15px]">
                  {t.inicio[descKey]}
                </span>
                <span className="inicio-shortcut-foot mt-3">{t.inicio[footKey]}</span>
              </span>
              <span className="inicio-shortcut-chevron relative z-[1]" aria-hidden>
                <Icon icon="lucide:arrow-right" width={18} height={18} />
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );

  if (section === "kpis") return kpis;
  if (section === "shortcuts") return shortcuts;
  return (
    <>
      {kpis}
      {shortcuts}
    </>
  );
}
