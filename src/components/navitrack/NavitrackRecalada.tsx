"use client";

/**
 * La ventana donde se decide qué pasó en un puerto anunciado.
 *
 * El buque dijo que iba a Callao, llegó la fecha, y hay que responder una sola
 * pregunta: ¿la carga siguió en el mismo barco o se cambió a otro?
 *
 * La pantalla está armada para que la respuesta fácil sea la correcta. Lo más
 * frecuente —que sea una parada del itinerario— está a un clic. El transbordo
 * pide más, porque cambia el viaje entero y a qué buque se le gastan créditos.
 *
 * Y sobre todo: **el costo se dice antes de guardar, no después**. Si la nave
 * siguiente no está en el catálogo, guardar cuesta una búsqueda; si ya está,
 * no cuesta nada pero mañana deja de seguirse la anterior. Las dos cosas se
 * anuncian en el propio botón.
 */
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";

export type Recalada = {
  id: number;
  puerto: string;
  nave: string | null;
  anunciado_at: string;
  eta_anunciada: string | null;
  visto_at: string;
  estado: "anunciada" | "por_verificar" | "parada_programada" | "transbordo";
  decidido_at: string | null;
  notas: string | null;
};

export type NaveCatalogo = {
  id: string;
  nombre: string;
  imo: string | null;
  mmsi: string | null;
};

type Props = {
  recalada: Recalada;
  naves: NaveCatalogo[];
  /** Nave que lleva la carga hasta este puerto. */
  naveActual: string | null;
  tr: Record<string, string>;
  onCerrar: () => void;
  onGuardado: (mensaje: string) => void;
  apiPrefix: string;
  /** Necesario cuando la recalada aún no está registrada (id 0). */
  operacionId: string;
};

function fechaCorta(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
}

export function NavitrackRecalada({
  recalada,
  naves,
  naveActual,
  tr,
  onCerrar,
  onGuardado,
  apiPrefix,
  operacionId,
}: Props) {
  const [modo, setModo] = useState<"preguntar" | "transbordo">("preguntar");
  const [busqueda, setBusqueda] = useState("");
  const [naveElegida, setNaveElegida] = useState("");
  const [viaje, setViaje] = useState("");
  const [eta, setEta] = useState("");
  const [notas, setNotas] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // El catálogo puede tener miles: se filtra en el cliente porque ya está cargado.
  const sugerencias = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    if (q.length < 2) return [];
    return naves.filter((n) => n.nombre.toUpperCase().includes(q)).slice(0, 8);
  }, [busqueda, naves]);

  /** La nave escrita, si coincide con una del catálogo. */
  const enCatalogo = useMemo(() => {
    const q = naveElegida.trim().toUpperCase();
    if (!q) return null;
    return naves.find((n) => n.nombre.trim().toUpperCase() === q) ?? null;
  }, [naveElegida, naves]);

  const tieneIdentificador = Boolean((enCatalogo?.imo ?? "").trim() || (enCatalogo?.mmsi ?? "").trim());

  useEffect(() => {
    setError(null);
  }, [modo, naveElegida]);

  const guardar = async (decision: "parada" | "transbordo") => {
    setGuardando(true);
    setError(null);
    try {
      const r = await fetch(`${apiPrefix}/api/navitrack/recalada`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recaladaId: recalada.id || undefined,
          operacionId: recalada.id ? undefined : operacionId,
          puerto: recalada.id ? undefined : recalada.puerto,
          etaAnunciada: recalada.id ? undefined : recalada.eta_anunciada,
          nave: recalada.id ? undefined : recalada.nave,
          decision,
          naveNombre: decision === "transbordo" ? naveElegida.trim() : undefined,
          viaje: viaje.trim() || undefined,
          eta: eta || undefined,
          notas: notas.trim() || undefined,
        }),
      });
      const j = (await r.json()) as {
        ok: boolean;
        code?: string;
        naveNueva?: string;
        naveAnterior?: string;
        aviso?: string;
        creditoGastado?: boolean;
        identificador?: { imo: string | null; mmsi: string | null };
      };

      if (!j.ok) {
        setError(tr.recaladaErrorGuardar);
        return;
      }

      if (decision === "parada") {
        onGuardado(tr.recaladaGuardadaParada.replace("{{puerto}}", recalada.puerto));
        return;
      }

      // El mensaje dice qué pasó con el seguimiento, que es lo que el usuario
      // necesita saber después de registrar un transbordo.
      const base = tr.recaladaGuardadaTransbordo
        .replace("{{anterior}}", j.naveAnterior ?? "—")
        .replace("{{nueva}}", j.naveNueva ?? "—");
      const detalle =
        j.aviso === "SIN_IDENTIFICADOR"
          ? ` ${tr.recaladaSinImo}`
          : j.identificador?.imo
            ? ` ${tr.recaladaConImo.replace("{{imo}}", j.identificador.imo)}`
            : "";
      onGuardado(base + detalle);
    } catch {
      setError(tr.recaladaErrorGuardar);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-sm sm:p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-label={tr.recaladaTitulo}
        className="motion-panel dash-card dash-card-static w-full max-w-lg overflow-hidden"
        data-state="open"
      >
        <header className="dash-section-head flex items-start justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-[15px] font-bold tracking-tight text-dash-fg">{tr.recaladaTitulo}</h2>
            <p className="mt-0.5 text-[12px] text-dash-muted">
              {tr.recaladaSubtitulo
                .replace("{{nave}}", recalada.nave ?? naveActual ?? "—")
                .replace("{{puerto}}", recalada.puerto)}
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

        {/* El dato crudo: qué declaró y para cuándo. Es lo que sostiene la pregunta. */}
        <div className="grid gap-2 px-4 py-3 min-[380px]:grid-cols-2">
          <div className="rounded-xl border border-dash-border bg-dash-control/60 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-dash-muted">
              {tr.recaladaPuerto}
            </p>
            <p className="mt-0.5 truncate text-[15px] font-bold text-dash-fg">{recalada.puerto}</p>
          </div>
          <div className="rounded-xl border border-dash-border bg-dash-control/60 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-dash-muted">
              {tr.recaladaLlegadaAnunciada}
            </p>
            <p className="mt-0.5 text-[15px] font-bold text-dash-fg tabular-nums">
              {fechaCorta(recalada.eta_anunciada)}
            </p>
          </div>
        </div>

        {modo === "preguntar" ? (
          <div className="px-4 pb-4">
            <p className="text-[13.5px] leading-snug text-dash-fg">{tr.recaladaPregunta}</p>

            <div className="mt-3 grid gap-2">
              {/* La respuesta más frecuente, primero y a un clic. */}
              <button
                type="button"
                disabled={guardando}
                onClick={() => void guardar("parada")}
                className="motion-interactive flex items-start gap-3 rounded-xl border border-dash-border bg-dash-control/60 px-3.5 py-3 text-left hover:border-dash-neon/40 disabled:opacity-50"
              >
                <Icon icon="lucide:anchor" width={18} height={18} className="mt-0.5 shrink-0 text-dash-neon" aria-hidden />
                <span className="min-w-0">
                  <span className="block text-[14px] font-bold text-dash-fg">{tr.recaladaSigueTitulo}</span>
                  <span className="mt-0.5 block text-[12px] leading-snug text-dash-muted">
                    {tr.recaladaSigueTexto}
                  </span>
                </span>
              </button>

              <button
                type="button"
                disabled={guardando}
                onClick={() => setModo("transbordo")}
                className="motion-interactive flex items-start gap-3 rounded-xl border border-amber-400/40 bg-amber-400/10 px-3.5 py-3 text-left hover:border-amber-400/70 disabled:opacity-50"
              >
                <Icon icon="lucide:git-branch" width={18} height={18} className="mt-0.5 shrink-0 text-amber-400" aria-hidden />
                <span className="min-w-0">
                  <span className="block text-[14px] font-bold text-dash-fg">{tr.recaladaTransbordoTitulo}</span>
                  <span className="mt-0.5 block text-[12px] leading-snug text-dash-muted">
                    {tr.recaladaTransbordoTexto}
                  </span>
                </span>
              </button>
            </div>

            {error && (
              <p className="mt-3 rounded-lg border border-dash-border bg-dash-control/70 px-3 py-2 text-[12px] text-dash-fg">
                {error}
              </p>
            )}
          </div>
        ) : (
          <div className="px-4 pb-4">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-dash-muted">
              {tr.recaladaNaveNueva}
            </label>
            <input
              type="text"
              value={naveElegida}
              onChange={(e) => {
                setNaveElegida(e.target.value);
                setBusqueda(e.target.value);
              }}
              placeholder={tr.recaladaNavePlaceholder}
              className="dash-control mt-1.5 w-full px-3 py-2.5 text-[14px]"
            />

            {/* Sugerencias del catálogo: escribir una que ya existe evita
                duplicarla y ahorra la búsqueda de IMO. */}
            {sugerencias.length > 0 && naveElegida.trim().toUpperCase() !== (enCatalogo?.nombre ?? "").toUpperCase() && (
              <ul className="mt-1 max-h-40 divide-y divide-dash-border overflow-y-auto rounded-lg border border-dash-border">
                {sugerencias.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setNaveElegida(n.nombre);
                        setBusqueda("");
                      }}
                      className="motion-interactive flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left hover:bg-dash-control"
                    >
                      <span className="truncate text-[13px] font-semibold text-dash-fg">{n.nombre}</span>
                      <span className="shrink-0 text-[11px] text-dash-muted tabular-nums">
                        {n.imo ? `IMO ${n.imo}` : tr.recaladaSinImoCorto}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3 grid gap-2 min-[420px]:grid-cols-2">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-dash-muted">
                  {tr.recaladaViaje}
                </label>
                <input
                  type="text"
                  value={viaje}
                  onChange={(e) => setViaje(e.target.value)}
                  className="dash-control mt-1.5 w-full px-3 py-2.5 text-[14px]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-dash-muted">
                  {tr.recaladaNuevaEta}
                </label>
                <input
                  type="date"
                  value={eta}
                  onChange={(e) => setEta(e.target.value)}
                  className="dash-control mt-1.5 w-full px-3 py-2.5 text-[14px]"
                />
              </div>
            </div>

            <label className="mt-3 block text-[11px] font-bold uppercase tracking-wider text-dash-muted">
              {tr.recaladaNotas}
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              className="dash-control mt-1.5 w-full px-3 py-2 text-[13px]"
            />

            {/* El costo, antes de guardar. Es la razón de ser de este bloque. */}
            {naveElegida.trim() && (
              <p
                className={`mt-3 rounded-lg border px-3 py-2 text-[12.5px] leading-snug ${
                  tieneIdentificador
                    ? "border-dash-border bg-dash-control/60 text-dash-fg"
                    : "border-amber-400/45 bg-amber-400/10 text-dash-fg"
                }`}
              >
                <Icon
                  icon={tieneIdentificador ? "lucide:info" : "lucide:coins"}
                  width={13}
                  height={13}
                  className="mr-1.5 inline align-[-2px]"
                  aria-hidden
                />
                {tieneIdentificador
                  ? tr.recaladaAvisoYaExiste
                      .replace("{{anterior}}", naveActual ?? "—")
                      .replace("{{nueva}}", naveElegida.trim())
                  : tr.recaladaAvisoCosto.replace("{{nueva}}", naveElegida.trim())}
              </p>
            )}

            {error && (
              <p className="mt-3 rounded-lg border border-dash-border bg-dash-control/70 px-3 py-2 text-[12px] text-dash-fg">
                {error}
              </p>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModo("preguntar")}
                className="dash-control motion-interactive px-3 py-2 text-xs font-semibold"
              >
                {tr.cancelar}
              </button>
              <button
                type="button"
                disabled={guardando || !naveElegida.trim()}
                onClick={() => void guardar("transbordo")}
                className="dash-cta motion-interactive px-3.5 py-2 text-xs disabled:opacity-40"
              >
                {guardando
                  ? tr.loading
                  : tieneIdentificador
                    ? tr.recaladaGuardar
                    : tr.recaladaGuardarConCosto}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
