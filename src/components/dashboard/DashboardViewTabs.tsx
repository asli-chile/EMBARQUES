import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n/LocaleContext";

/** "curso" = alertas y próximos zarpes; "historico" = volumen acumulado por temporada. */
export type DashboardView = "curso" | "historico";

type Props = {
  view: DashboardView;
  onChange: (view: DashboardView) => void;
};

export function DashboardViewTabs({ view, onChange }: Props) {
  const { t } = useLocale();
  const tr = t.dashboard;

  const tabs: Array<{ id: DashboardView; label: string; icon: string }> = [
    { id: "curso", label: tr.viewCurrent, icon: "lucide:activity" },
    { id: "historico", label: tr.viewHistoric, icon: "lucide:bar-chart-3" },
  ];

  return (
    <div className="flex items-center gap-1 rounded-lg border border-cyan-300/25 bg-dash-control/85 p-1">
      {tabs.map((tab) => {
        const active = tab.id === view;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            aria-pressed={active}
            className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-base font-semibold motion-interactive focus:outline-none focus:ring-2 focus:ring-cyan-300/40 ${
              active
                ? "bg-cyan-500/25 text-cyan-50 border border-cyan-300/40"
                : "text-cyan-200/70 border border-transparent hover:text-cyan-100 hover:bg-dash-control-hover"
            }`}
          >
            <Icon icon={tab.icon} className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
