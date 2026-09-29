import { useState } from "react";
import { Icon } from "@iconify/react";

/**
 * Celda de la barra de resumen de las fichas de marca (franja `rd-hero`): la
 * de Mis Reservas y las de Transportes usan la misma, para que no vuelvan a
 * quedar de tamaños distintos.
 *
 * `mono`: códigos (booking, contenedor), que además llevan botón de copiar.
 * Son lo que más se pega en correos y portales de navieras, y seleccionarlos
 * a mano sobre la franja se lleva también la etiqueta.
 */
export type CeldaResumen = { label: string; valor: string | null; icono: string; mono?: boolean };

export function CeldaResumenVista({ celda: r }: { celda: CeldaResumen }) {
  const [copiado, setCopiado] = useState(false);
  const copiar = async () => {
    if (!r.valor) return;
    try {
      await navigator.clipboard.writeText(r.valor);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1400);
    } catch {
      /* Sin permiso de portapapeles: el valor sigue seleccionable a mano. */
    }
  };
  return (
    <div className="min-w-0 px-3.5 py-2.5">
      <dt className="rd-muted flex items-center gap-1.5 truncate text-[10.5px] font-bold uppercase tracking-wider">
        <Icon icon={r.icono} width={13} height={13} className="rd-acento shrink-0" aria-hidden />
        {r.label}
      </dt>
      <dd className="mt-0.5 flex min-w-0 items-center gap-1.5">
        <span
          className={`truncate text-[16px] leading-snug ${r.valor ? "font-bold" : "rd-muted"} ${
            r.mono && r.valor ? "font-mono tracking-tight" : ""
          }`}
          title={r.valor ?? undefined}
        >
          {r.valor ?? "—"}
        </span>
        {r.mono && r.valor && (
          <button
            type="button"
            onClick={() => void copiar()}
            title={copiado ? "Copiado" : `Copiar ${r.label.toLowerCase()}`}
            aria-label={`Copiar ${r.label.toLowerCase()}`}
            className={`rd-btn motion-interactive inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-1.5 text-[11px] font-semibold ${
              copiado ? "rd-acento" : ""
            }`}
          >
            <Icon icon={copiado ? "lucide:check" : "lucide:copy"} width={13} height={13} aria-hidden />
            {copiado && <span>Copiado</span>}
          </button>
        )}
      </dd>
    </div>
  );
}
