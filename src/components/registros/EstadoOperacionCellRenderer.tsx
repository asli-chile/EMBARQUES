import type { ICellRendererParams } from "ag-grid-community";
import { getEstadoOperacionStyle } from "@/lib/ui/estadoOperacion";
import { etiquetaEstado } from "@/lib/operaciones/estados";

/** Badge de color para estado_operacion en AG Grid. */
export function EstadoOperacionCellRenderer(params: ICellRendererParams) {
  const value = typeof params.value === "string" ? params.value : "";
  if (!value) return null;

  const label = etiquetaEstado(value);
  const cfg = getEstadoOperacionStyle(value);
  if (!cfg) {
    return <span className="text-[13px] text-neutral-700">{label}</span>;
  }

  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 truncate rounded-md border px-2 py-0.5 text-xs font-semibold ${cfg.bg} ${cfg.text} ${cfg.border}`}
      title={label}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${cfg.dot}`} aria-hidden />
      <span className="truncate">{label}</span>
    </span>
  );
}
