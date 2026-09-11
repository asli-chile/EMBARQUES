import { useLocale } from "@/lib/i18n";
import { VisitorModuleGate } from "@/components/layout/VisitorModuleGate";

/** Dashboard sin sesión: misma puerta neon que el resto de módulos. */
export function DashboardVisitorContent() {
  const { t } = useLocale();
  const v = t.visitor.dashboard;

  return (
    <VisitorModuleGate
      title={v.title}
      description={v.description}
      highlights={[v.item1, v.item2, v.item3, v.item4, v.item5, v.item6]}
    />
  );
}
