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
    <div className="dash-control flex items-center gap-1 rounded-lg p-1">
      {tabs.map((tab) => {
        const active = tab.id === view;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            aria-pressed={active}
            className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-base font-semibold motion-interactive focus:outline-none focus:ring-2 focus:ring-dash-neon/40 ${
              active
                ? "bg-dash-neon/25 text-dash-fg border border-dash-neon/40"
                : "text-dash-muted border border-transparent hover:text-dash-fg hover:bg-dash-control-hover"
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
