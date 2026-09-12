"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { getApiOriginPrefix } from "@/lib/basePath";

type Textos = Record<string, string>;

type NaveRastreo = {
  id: string;
  nombre: string;
  imo: string | null;
  mmsi: string | null;
  siguiendo: boolean;
  ops: number;
  proximaEta: string | null;
  ultimaLectura: string | null;
};

type Estado = {
  creditos: { total: number; hoy: number };
  topeDia: number;
  ttlMin: number;
  hayClave: boolean;
  naves: NaveRastreo[];
};

/** Mensajes por código del servidor. Nunca se muestra el texto crudo del proveedor. */
const MOTIVO: Record<string, string> = {
  NO_CONFIG: "falta la clave del proveedor",
  BAD_KEY: "la clave del proveedor no es válida",
  NO_CREDITS: "no quedan créditos",
  TOPE_DIARIO: "se alcanzó el tope de consultas del día",
  SIN_RESULTADO: "el proveedor no encontró esa nave",
  SIN_IDENTIFICADOR: "primero hay que resolver su IMO",
  NETWORK: "no se pudo conectar",
  RATE_LIMIT: "demasiadas acciones seguidas, espera un momento",
};

/**
 * Panel de Rastreo: todo lo que antes se hacía por consola, con botones.
 *
 * La regla de la pantalla es que nada gaste un crédito por sorpresa: las
 * acciones que cuestan lo dicen en el propio botón y piden confirmación.
 */
export function NavitrackRastreoPanel({ tr, onCerrar }: { tr: Textos; onCerrar: () => void }) {
  const apiPrefix = getApiOriginPrefix();
  const [estado, setEstado] = useState<Estado | null>(null);
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<NaveRastreo | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const r = await fetch(`${apiPrefix}/api/navitrack/rastreo`, { credentials: "same-origin" });
      const j = (await r.json()) as { ok: boolean } & Estado;
      if (j.ok) setEstado(j);
    } catch {
      setAviso(tr.rastreoErrorCarga);
    } finally {
      setCargando(false);
    }
  }, [apiPrefix, tr]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const accion = useCallback(
    async (nave: NaveRastreo, tipo: "seguir" | "dejar" | "resolver") => {
      setOcupado(nave.id);
      setAviso(null);
      try {
        const r = await fetch(`${apiPrefix}/api/navitrack/rastreo`, {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accion: tipo, naveId: nave.id }),
        });
        const j = (await r.json()) as { ok: boolean; code?: string; imo?: string | null };
        if (!j.ok) {
          setAviso(`${nave.nombre}: ${MOTIVO[j.code ?? ""] ?? tr.rastreoErrorAccion}`);
        } else if (tipo === "resolver") {
          setAviso(`${nave.nombre}: IMO ${j.imo ?? "—"} ${tr.rastreoResuelto}`);
        }
        await cargar();
      } catch {
        setAviso(tr.rastreoErrorAccion);
      } finally {
        setOcupado(null);
        setConfirmar(null);
      }
    },
    [apiPrefix, cargar, tr],
  );

  const siguiendo = estado?.naves.filter((n) => n.siguiendo).length ?? 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/55 p-3 backdrop-blur-sm sm:p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-label={tr.rastreoTitulo}
        className="motion-panel dash-card dash-card-static w-full max-w-3xl overflow-hidden"
        data-state="open"
      >
        <header className="dash-section-head flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <Icon icon="lucide:satellite-dish" width={17} height={17} className="text-dash-neon" aria-hidden />
            <div className="min-w-0">
              <h2 className="text-[15px] font-bold tracking-tight text-dash-fg">{tr.rastreoTitulo}</h2>
              <p className="truncate text-[11.5px] text-dash-muted">{tr.rastreoSubtitulo}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label={tr.cerrar}
            className="dash-control motion-interactive flex h-8 w-8 items-center justify-center"
          >
            <Icon icon="lucide:x" width={15} height={15} aria-hidden />
          </button>
        </header>

        {/* Consumo: lo primero que hay que ver antes de apretar nada. */}
        <div className="grid grid-cols-2 gap-2 px-4 py-3 sm:grid-cols-4">
          {[
            { l: tr.rastreoCreditosHoy, v: `${estado?.creditos.hoy ?? 0} / ${estado?.topeDia ?? 0}` },
            { l: tr.rastreoCreditosTotal, v: String(estado?.creditos.total ?? 0) },
            { l: tr.rastreoNavesSeguidas, v: String(siguiendo) },
            { l: tr.rastreoFrecuencia, v: `${Math.round((estado?.ttlMin ?? 360) / 60)} h` },
          ].map((k) => (
            <div key={k.l} className="rounded-xl border border-dash-border bg-dash-control/60 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-dash-muted">{k.l}</p>
              <p className="mt-0.5 text-lg font-extrabold text-dash-fg tabular-nums">{k.v}</p>
            </div>
          ))}
        </div>

        {estado && !estado.hayClave && (
          <p className="mx-4 mb-2 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-[11.5px] text-dash-fg">
            {tr.rastreoSinClave}
          </p>
        )}

        {aviso && (
          <p className="mx-4 mb-2 rounded-lg border border-dash-border bg-dash-control/70 px-3 py-2 text-[11.5px] text-dash-fg">
            {aviso}
          </p>
        )}

        <div className="max-h-[52dvh] overflow-y-auto border-t border-dash-border">
          {cargando ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-dash-muted">
              <Icon icon="lucide:loader-2" width={17} height={17} className="animate-spin text-dash-neon" aria-hidden />
              {tr.loading}
            </div>
          ) : (estado?.naves.length ?? 0) === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-dash-muted">{tr.rastreoSinNaves}</p>
          ) : (
            <ul className="divide-y divide-dash-border">
              {estado?.naves.map((n) => {
                const tieneId = Boolean(n.imo || n.mmsi);
                const esperando = ocupado === n.id;
                return (
                  <li key={n.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-bold text-dash-fg">{n.nombre}</p>
                      <p className="truncate text-[11px] text-dash-muted tabular-nums">
                        {tieneId
                          ? `IMO ${n.imo ?? "—"} · MMSI ${n.mmsi ?? "—"}`
                          : tr.rastreoSinIdentificador}
                        {n.ops > 0 ? ` · ${n.ops} ${tr.rastreoOps}` : ""}
                      </p>
                    </div>

                    {tieneId ? (
                      <button
                        type="button"
                        disabled={esperando}
                        onClick={() => void accion(n, n.siguiendo ? "dejar" : "seguir")}
                        className={`motion-interactive inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11.5px] font-bold disabled:opacity-50 ${
                          n.siguiendo
                            ? "border-[color-mix(in_srgb,var(--dash-neon)_50%,transparent)] bg-[color-mix(in_srgb,var(--dash-neon)_18%,transparent)] text-dash-fg"
                            : "border-dash-border bg-dash-control text-dash-muted"
                        }`}
                      >
                        <Icon
                          icon={n.siguiendo ? "lucide:eye" : "lucide:eye-off"}
                          width={13}
                          height={13}
                          aria-hidden
                        />
                        {n.siguiendo ? tr.rastreoSiguiendo : tr.rastreoSeguir}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={esperando || !estado?.hayClave}
                        onClick={() => setConfirmar(n)}
                        className="dash-control motion-interactive inline-flex shrink-0 items-center gap-1.5 px-2.5 py-1.5 text-[11.5px] font-bold disabled:opacity-40"
                      >
                        <Icon icon="lucide:search" width={13} height={13} aria-hidden />
                        {tr.rastreoBuscarImo}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <footer className="border-t border-dash-border px-4 py-2.5">
          <p className="text-[11px] leading-snug text-dash-muted">{tr.rastreoNota}</p>
        </footer>
      </section>

      {/* Confirmación explícita: es la única acción del panel que gasta. */}
      {confirmar && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
          <div className="dash-card dash-card-static w-full max-w-sm p-4">
            <p className="text-[14px] font-bold text-dash-fg">{tr.rastreoConfirmarTitulo}</p>
            <p className="mt-1.5 text-[12.5px] leading-snug text-dash-muted">
              {tr.rastreoConfirmarTexto.replace("{{nave}}", confirmar.nombre)}
            </p>
            <div className="mt-3.5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmar(null)}
                className="dash-control motion-interactive px-3 py-2 text-xs font-semibold"
              >
                {tr.cancelar}
              </button>
              <button
                type="button"
                onClick={() => void accion(confirmar, "resolver")}
                className="dash-cta motion-interactive px-3 py-2 text-xs"
              >
                {tr.rastreoConfirmarGastar}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
