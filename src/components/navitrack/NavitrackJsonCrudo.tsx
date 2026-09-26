"use client";

/**
 * La respuesta completa del proveedor, tal cual, para quien necesita ver el
 * dato puntual y no la lectura ya traducida a español que arma el resto de la
 * pantalla.
 *
 * Solo para personal interno: un cliente no tiene por qué ver nombres de
 * campo en inglés ni la forma cruda de una API ajena. Muestra la lectura que
 * ya está guardada —no dispara ninguna consulta nueva—.
 */
import { useState } from "react";
import { Icon } from "@iconify/react";

type Props = {
  datos: { crudo: Record<string, unknown> | null; consultadoAt: string | null } | null;
  tr: Record<string, string>;
  onCerrar: () => void;
};

export function NavitrackJsonCrudo({ datos, tr, onCerrar }: Props) {
  const [copiado, setCopiado] = useState(false);
  const texto = datos?.crudo ? JSON.stringify(datos.crudo, null, 2) : null;

  const copiar = async () => {
    if (!texto) return;
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      // Sin permiso de portapapeles no pasa nada: el texto sigue seleccionable a mano.
    }
  };

  return (
    <div className="fixed inset-0 z-[75] flex items-start justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-sm sm:p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-label={tr.jsonTitulo}
        className="motion-panel dash-card dash-card-static w-full max-w-2xl overflow-hidden"
        data-state="open"
      >
        <header className="dash-section-head flex items-start justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-[15px] font-bold tracking-tight text-dash-fg">{tr.jsonTitulo}</h2>
            <p className="mt-0.5 truncate text-[12px] text-dash-muted">
              {datos?.consultadoAt
                ? tr.jsonConsultadoEl.replace(
                    "{{fecha}}",
                    new Date(datos.consultadoAt).toLocaleString("es-CL", {
                      dateStyle: "medium",
                      timeStyle: "medium",
                    }),
                  )
                : tr.jsonSinDato}
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label={tr.cerrar}
            className="dash-control motion-interactive flex h-8 w-8 shrink-0 items-center justify-center"
          >
            <Icon icon="lucide:x" width={15} height={15} aria-hidden />
          </button>
        </header>

        <div className="px-4 pb-4">
          {texto ? (
            <>
              <div className="flex justify-end pb-2">
                <button
                  type="button"
                  onClick={() => void copiar()}
                  className="dash-control motion-interactive inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11.5px] font-bold"
                >
                  <Icon icon={copiado ? "lucide:check" : "lucide:copy"} width={12} height={12} aria-hidden />
                  {copiado ? tr.jsonCopiado : tr.jsonCopiar}
                </button>
              </div>
              <pre className="max-h-[60vh] overflow-auto rounded-lg border border-dash-border bg-dash-control/60 p-3 text-[11.5px] leading-snug text-dash-fg">
                {texto}
              </pre>
            </>
          ) : (
            <p className="rounded-lg border border-dash-border bg-dash-control/60 px-3 py-3 text-[12.5px] leading-snug text-dash-muted">
              {tr.jsonSinDato}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
