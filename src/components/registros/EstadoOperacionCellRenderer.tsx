import type { ICellRendererParams } from "ag-grid-community";
import { getEstadoOperacionStyle } from "@/lib/ui/estadoOperacion";
import { etiquetaEstado } from "@/lib/operaciones/estados";
import { ArriboChip, type ArriboLabels } from "@/components/ui/ArriboChip";

/**
 * Badge de color para estado_operacion en AG Grid.
 *
 * Junto al badge va la marca de arribo, cuando la hay. Son dos ejes: el estado
 * dice en qué va la operación —el papeleo incluido— y el arribo, si la carga
 * ya llegó a destino. Una carga puede llegar estando en "Documentación en
 * revisión", así que uno no puede reemplazar al otro; ver ArriboChip.
 */
export function EstadoOperacionCellRenderer(
  params: ICellRendererParams & { arriboLabels?: ArriboLabels },
) {
  const value = typeof params.value === "string" ? params.value : "";
  const fila = params.data as
    | { arribo_confirmado?: boolean | null; arribo_at?: string | null; arribo_anunciado_at?: string | null }
    | undefined;

  const label = etiquetaEstado(value);
  const cfg = value ? getEstadoOperacionStyle(value) : null;

  const marca =
    params.arriboLabels && fila ? (
      <ArriboChip
        arribo_confirmado={fila.arribo_confirmado}
        arribo_at={fila.arribo_at}
        arribo_anunciado_at={fila.arribo_anunciado_at}
        labels={params.arriboLabels}
        dense
      />
    ) : null;

  if (!value) return marca;

  return (
    <span className="inline-flex max-w-full items-center gap-1.5">
      {cfg ? (
        <span
          className={`inline-flex min-w-0 items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold ${cfg.bg} ${cfg.text} ${cfg.border}`}
          title={label}
        >
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${cfg.dot}`} aria-hidden />
          <span className="truncate">{label}</span>
        </span>
      ) : (
        <span className="truncate text-[13px] text-neutral-700">{label}</span>
      )}
      {marca}
    </span>
  );
}
