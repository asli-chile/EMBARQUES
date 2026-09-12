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
  etd: string | null;
  proximaEta: string | null;
  etapa: EtapaRastreo;
  ultimaLectura: string | null;
};

type EtapaRastreo = "origen" | "transito" | "transbordo" | "arribado" | "sin_fecha";

/** Lo que costaría una actualización manual. Se pide antes de ofrecerla. */
type Presupuesto = {
  costo: number;
  /** Null cuando el proveedor no respondió: nunca se inventa un saldo. */
  saldo: number | null;
  saldoDespues: number | null;
  naves: { nombre: string; ops: number; ruta: string | null; ultimaAt: string | null }[];
  omitidas: { nombre: string; etd: string | null }[];
  /** Última consulta registrada, sea de la vía que sea. */
  ultima: { at: string; origen: string } | null;
  hayClave: boolean;
};

/** Cómo se originó una lectura, en palabras. */
const ORIGEN_LECTURA: Record<string, string> = {
  cron: "revisión automática",
  manual: "actualización manual",
  pantalla: "al abrir un embarque",
};

/**
 * Fecha y hora de Chile, más el "hace cuánto".
 *
 * Las dos cosas juntas a propósito: la hora exacta sirve para el registro y el
 * relativo para decidir. Saber que la última fue "hace 2 h" es lo que evita
 * pagar por repetirla.
 */
function cuandoFue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const exacto = d.toLocaleString("es-CL", {
    timeZone: "America/Santiago",
    dateStyle: "medium",
    timeStyle: "short",
  });
  const horas = (Date.now() - d.getTime()) / 3_600_000;
  const hace =
    horas < 1 ? "hace menos de 1 h" : horas < 24 ? `hace ${Math.round(horas)} h` : `hace ${Math.round(horas / 24)} días`;
  return `${exacto} · ${hace}`;
}

/** Segundos que hay que esperar antes de poder confirmar el gasto. */
const ESPERA_SEG = 15;

type Estado = {
  creditos: { total: number; hoy: number };
  topeDia: number;
  ttlMin: number;
  hayClave: boolean;
  /** Saldo que informa el proveedor. Null si no se pudo consultar. */
  saldo: number | null;
  /** Hora local del chequeo automático; la manda el servidor, no se inventa. */
  revisionDiaria: string;
  naves: NaveRastreo[];
};

/**
 * Etapa del viaje, con el mismo criterio de color del resto de NaviTrack:
 * el ámbar se reserva para lo que pide atención, no para lo que simplemente
 * está en marcha.
 */
const ETAPA: Record<EtapaRastreo, { texto: string; clase: string; icono: string }> = {
  origen: {
    texto: "En origen",
    clase: "border-dash-border bg-dash-control text-dash-muted",
    icono: "lucide:anchor",
  },
  transito: {
    texto: "En tránsito",
    clase:
      "border-[color-mix(in_srgb,var(--dash-neon)_45%,transparent)] bg-[color-mix(in_srgb,var(--dash-neon)_14%,transparent)] text-dash-fg",
    icono: "lucide:ship",
  },
  transbordo: {
    texto: "Transbordo",
    clase: "border-amber-400/45 bg-amber-400/12 text-dash-fg",
    icono: "lucide:arrow-left-right",
  },
  arribado: {
    texto: "Arribado",
    clase: "border-dash-border bg-dash-control/60 text-dash-muted",
    icono: "lucide:flag",
  },
  sin_fecha: {
    texto: "Sin fechas",
    clase: "border-dash-border bg-dash-control/40 text-dash-muted",
    icono: "lucide:calendar-off",
  },
};

/**
 * Fecha corta.
 *
 * `etd` y `eta` son columnas `date`: se parten a mano en vez de pasarlas por
 * `new Date()`, que las interpretaría en UTC y en Chile restaría un día.
 */
function fechaCorta(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return "—";
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${String(d).padStart(2, "0")} ${meses[m - 1]}`;
}

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

  /*
   * Actualización manual, en dos pasos a propósito.
   *
   * `paso` 1 explica lo que cuesta; `paso` 2 obliga a esperar con el botón
   * apagado. La espera no es decorativa: es el tiempo mínimo para leer lo que
   * dice la pantalla y, si hace falta, preguntar antes de gastar.
   */
  const [presupuesto, setPresupuesto] = useState<Presupuesto | null>(null);
  const [paso, setPaso] = useState<0 | 1 | 2>(0);
  const [restante, setRestante] = useState(ESPERA_SEG);
  const [actualizando, setActualizando] = useState(false);

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

  // La cuenta atrás solo corre en el segundo paso y se reinicia si se cancela.
  useEffect(() => {
    if (paso !== 2) return;
    setRestante(ESPERA_SEG);
    const id = setInterval(() => {
      setRestante((r) => (r <= 1 ? 0 : r - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [paso]);

  /** Pide el presupuesto al servidor. No gasta nada: solo cuenta. */
  const abrirActualizacion = useCallback(async () => {
    setAviso(null);
    try {
      const r = await fetch(`${apiPrefix}/api/navitrack/actualizar`, { credentials: "same-origin" });
      const j = (await r.json()) as { ok: boolean } & Presupuesto;
      if (!j.ok) {
        setAviso(tr.rastreoErrorCarga);
        return;
      }
      setPresupuesto(j);
      setPaso(1);
    } catch {
      setAviso(tr.rastreoErrorCarga);
    }
  }, [apiPrefix, tr]);

  const ejecutarActualizacion = useCallback(async () => {
    setActualizando(true);
    try {
      const r = await fetch(`${apiPrefix}/api/navitrack/actualizar`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmar: true }),
      });
      const j = (await r.json()) as {
        ok: boolean;
        code?: string;
        actualizadas?: number;
        errores?: number;
        avisado?: boolean;
      };
      if (!j.ok) {
        setAviso(MOTIVO[j.code ?? ""] ?? tr.rastreoErrorCarga);
      } else {
        setAviso(
          tr.rastreoActualizadoOk
            .replace("{{n}}", String(j.actualizadas ?? 0))
            .replace("{{aviso}}", j.avisado ? tr.rastreoAvisoEnviado : tr.rastreoAvisoNoEnviado),
        );
        await cargar();
      }
    } catch {
      setAviso(MOTIVO.NETWORK);
    } finally {
      setActualizando(false);
      setPaso(0);
      setPresupuesto(null);
    }
  }, [apiPrefix, cargar, tr]);

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
        <div className="grid grid-cols-3 gap-2 px-3 py-3 sm:grid-cols-5 sm:px-4">
          {[
            { l: tr.rastreoCreditosHoy, v: `${estado?.creditos.hoy ?? 0} / ${estado?.topeDia ?? 0}` },
            { l: tr.rastreoCreditosTotal, v: String(estado?.creditos.total ?? 0) },
            { l: tr.rastreoNavesSeguidas, v: String(siguiendo) },
            { l: tr.rastreoRevision, v: estado?.revisionDiaria ?? "07:00" },
            { l: tr.rastreoSaldo, v: estado?.saldo == null ? "—" : String(estado.saldo) },
          ].map((k) => (
            <div key={k.l} className="rounded-xl border border-dash-border bg-dash-control/60 px-3 py-2">
              <p className="text-[10.5px] font-bold uppercase leading-tight tracking-wider text-dash-muted">
                {k.l}
              </p>
              <p className="mt-0.5 text-[17px] font-extrabold text-dash-fg tabular-nums sm:text-lg">
                {k.v}
              </p>
            </div>
          ))}
        </div>

        {/*
          * Actualizar a mano es lo más caro que se puede apretar aquí, así que
          * el botón lo dice en su propia etiqueta y no se disfraza de "refrescar".
          */}
        <div className="flex items-center justify-between gap-3 px-4 pb-3">
          <p className="text-[11px] leading-snug text-dash-muted">{tr.rastreoActualizarAyuda}</p>
          <button
            type="button"
            disabled={!estado?.hayClave || actualizando}
            onClick={() => void abrirActualizacion()}
            className="dash-control motion-interactive inline-flex shrink-0 items-center gap-1.5 px-3 py-2 text-[12px] font-bold disabled:opacity-40"
          >
            <Icon
              icon={actualizando ? "lucide:loader-2" : "lucide:refresh-cw"}
              width={14}
              height={14}
              className={actualizando ? "animate-spin" : ""}
              aria-hidden
            />
            {tr.rastreoActualizarBoton}
          </button>
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

        <div className="max-h-[58dvh] overflow-y-auto border-t border-dash-border max-sm:max-h-[46dvh]">
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
                const etapa = ETAPA[n.etapa] ?? ETAPA.sin_fecha;
                return (
                  <li key={n.id} className="flex flex-wrap items-center gap-2.5 px-3.5 py-3 sm:px-4 sm:py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-bold text-dash-fg">{n.nombre}</p>
                      <p className="truncate text-[11px] text-dash-muted tabular-nums">
                        {tieneId
                          ? `IMO ${n.imo ?? "—"} · MMSI ${n.mmsi ?? "—"}`
                          : tr.rastreoSinIdentificador}
                        {n.ops > 0 ? ` · ${n.ops} ${tr.rastreoOps}` : ""}
                      </p>
                      {n.ops > 0 && (
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10.5px] font-bold ${etapa.clase}`}
                          >
                            <Icon icon={etapa.icono} width={11} height={11} aria-hidden />
                            {etapa.texto}
                          </span>
                          <span className="text-[10.5px] text-dash-muted tabular-nums">
                            {tr.rastreoZarpe} {fechaCorta(n.etd)} · {tr.rastreoLlegada}{" "}
                            {fechaCorta(n.proximaEta)}
                          </span>
                        </div>
                      )}
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

      {/* ── Paso 1: qué cuesta ──────────────────────────────────────────── */}
      {paso === 1 && presupuesto && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/70 p-4">
          <div className="dash-card dash-card-static w-full max-w-md p-5">
            <div className="flex items-center gap-2 text-amber-400">
              <Icon icon="lucide:alert-triangle" width={18} height={18} aria-hidden />
              <p className="text-[11px] font-bold uppercase tracking-wider">{tr.rastreoGastoTitulo}</p>
            </div>

            {/* El número grande es el costo: es el dato que hay que entender. */}
            <p className="mt-3 text-[42px] font-extrabold leading-none text-dash-fg tabular-nums">
              {presupuesto.costo}
            </p>
            <p className="mt-1 text-[13px] font-semibold text-dash-fg">
              {presupuesto.costo === 1 ? tr.rastreoGastoUna : tr.rastreoGastoVarias}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-dash-border bg-dash-control/60 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-dash-muted">
                  {tr.rastreoSaldoAhora}
                </p>
                <p className="text-lg font-extrabold text-dash-fg tabular-nums">
                  {presupuesto.saldo ?? "—"}
                </p>
              </div>
              <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-dash-muted">
                  {tr.rastreoSaldoDespues}
                </p>
                <p className="text-lg font-extrabold text-dash-fg tabular-nums">
                  {presupuesto.saldoDespues ?? "—"}
                </p>
              </div>
            </div>

            {/*
              * La última actualización va junto al costo a propósito: si fue
              * hace un rato, lo más barato es no apretar nada.
              */}
            <div className="mt-3 rounded-lg border border-dash-border bg-dash-control/50 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-dash-muted">
                {tr.rastreoUltimaVez}
              </p>
              <p className="mt-0.5 text-[12.5px] font-semibold text-dash-fg">
                {presupuesto.ultima
                  ? cuandoFue(presupuesto.ultima.at)
                  : tr.rastreoNuncaActualizado}
              </p>
              {presupuesto.ultima && (
                <p className="text-[11px] text-dash-muted">
                  {ORIGEN_LECTURA[presupuesto.ultima.origen] ?? presupuesto.ultima.origen}
                </p>
              )}
            </div>

            {/*
              * Una fila por nave, no una lista corrida.
              *
              * Cada consulta es un crédito, así que hay que poder ver qué se
              * está pagando: qué nave, qué ruta, cuántos embarques dependen de
              * ella y hace cuánto que no se mira. Ordenadas por la más
              * desactualizada, que es la que más falta hace.
              */}
            {presupuesto.naves.length > 0 && (
              <div className="mt-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-dash-muted">
                  {tr.rastreoGastoNaves} ({presupuesto.naves.length})
                </p>
                <ul className="mt-1.5 max-h-[30dvh] divide-y divide-dash-border overflow-y-auto rounded-lg border border-dash-border">
                  {presupuesto.naves.map((n) => (
                    <li key={n.nombre} className="flex items-baseline gap-2 px-2.5 py-1.5">
                      <Icon
                        icon="lucide:ship"
                        width={12}
                        height={12}
                        className="shrink-0 translate-y-0.5 text-dash-muted"
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12.5px] font-bold text-dash-fg">{n.nombre}</p>
                        <p className="truncate text-[10.5px] text-dash-muted">
                          {n.ruta ?? "—"}
                          {n.ops > 0 ? ` · ${n.ops} ${tr.rastreoOps}` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10.5px] text-dash-muted tabular-nums">
                        {n.ultimaAt ? cuandoFue(n.ultimaAt).split(" · ")[1] : tr.rastreoNunca}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-1 text-[10.5px] text-dash-muted">{tr.rastreoGastoUnaCadaUna}</p>
              </div>
            )}

            {presupuesto.omitidas.length > 0 && (
              <div className="mt-2.5 rounded-lg border border-dash-border bg-dash-control/40 px-2.5 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-dash-muted">
                  {tr.rastreoGastoOmitidasTitulo} ({presupuesto.omitidas.length})
                </p>
                <ul className="mt-1 space-y-0.5">
                  {presupuesto.omitidas.map((n) => (
                    <li key={n.nombre} className="flex items-baseline justify-between gap-2 text-[11px]">
                      <span className="truncate text-dash-fg">{n.nombre}</span>
                      <span className="shrink-0 text-dash-muted tabular-nums">
                        {n.etd ? `${tr.rastreoZarpe} ${fechaCorta(n.etd)}` : "—"}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-1 text-[10.5px] leading-snug text-dash-muted">
                  {tr.rastreoGastoOmitidasPorque}
                </p>
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setPaso(0);
                  setPresupuesto(null);
                }}
                className="dash-control motion-interactive px-3 py-2 text-xs font-semibold"
              >
                {tr.cancelar}
              </button>
              <button
                type="button"
                disabled={presupuesto.costo === 0}
                onClick={() => setPaso(2)}
                className="dash-cta motion-interactive px-3 py-2 text-xs disabled:opacity-40"
              >
                {tr.rastreoGastoSeguir}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Paso 2: la espera ───────────────────────────────────────────────
        * Quince segundos con el botón apagado. No es un trámite: es el tiempo
        * para releer la cifra y, si hay dudas, preguntar antes de gastar.
        */}
      {paso === 2 && presupuesto && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4">
          <div className="dash-card dash-card-static w-full max-w-md border-amber-400/40 p-5 text-center">
            <p className="text-[22px] font-extrabold leading-tight text-dash-fg">
              {tr.rastreoSeguroTitulo}
            </p>
            <p className="mt-2 text-[13.5px] leading-snug text-dash-fg">
              {tr.rastreoSeguroTexto
                .replace("{{n}}", String(presupuesto.costo))
                .replace("{{saldo}}", presupuesto.saldoDespues == null ? "—" : String(presupuesto.saldoDespues))}
            </p>

            <p className="mt-3 rounded-lg border border-dash-border bg-dash-control/60 px-3 py-2 text-[12px] leading-snug text-dash-muted">
              {tr.rastreoSeguroConsultar}{" "}
              <a
                href="mailto:rodrigo.caceres@asli.cl"
                className="font-bold text-dash-fg underline underline-offset-2"
              >
                rodrigo.caceres@asli.cl
              </a>
            </p>

            <p className="mt-4 text-[11px] font-bold uppercase tracking-wider text-dash-muted">
              {restante > 0 ? tr.rastreoSeguroEspera.replace("{{s}}", String(restante)) : tr.rastreoSeguroListo}
            </p>

            {/* Barra que se llena: hace visible la espera en vez de solo contarla. */}
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-dash-control">
              <div
                className="h-1.5 rounded-full bg-amber-400 transition-[width] duration-1000 ease-linear"
                style={{ width: `${((ESPERA_SEG - restante) / ESPERA_SEG) * 100}%` }}
              />
            </div>

            <div className="mt-4 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setPaso(0);
                  setPresupuesto(null);
                }}
                className="dash-control motion-interactive px-4 py-2 text-xs font-semibold"
              >
                {tr.cancelar}
              </button>
              <button
                type="button"
                disabled={restante > 0 || actualizando}
                onClick={() => void ejecutarActualizacion()}
                className="dash-cta motion-interactive px-4 py-2 text-xs disabled:opacity-35"
              >
                {actualizando
                  ? tr.loading
                  : tr.rastreoSeguroAceptar.replace("{{n}}", String(presupuesto.costo))}
              </button>
            </div>
          </div>
        </div>
      )}

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
