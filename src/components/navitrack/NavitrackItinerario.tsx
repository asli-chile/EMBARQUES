"use client";

/**
 * El itinerario de la carga: directo o con transbordo.
 *
 * Es una sola pregunta por embarque y se responde con la confirmación de la
 * reserva en la mano, porque ahí la naviera ya dice cómo viaja la carga. Antes
 * el sistema la hacía puerto por puerto —"¿siguió en el mismo buque o cambió de
 * nave?"— en cada escala que anunciaba el AIS, cuando la respuesta se sabía
 * desde el principio.
 *
 * Con transbordo se cargan uno o más, en orden. Solo el puerto es obligatorio:
 * hay navieras que informan "transbordo en Rodman" y nada más. La nave y las
 * fechas se agregan cuando se conocen, y todo se puede editar si la naviera
 * cambia el plan. Cualquier otro puerto que anuncie el buque es una parada
 * programada y no se pregunta.
 *
 * Junto a cada transbordo se muestra lo que hizo el buque de verdad según el
 * AIS —cuándo llegó y cuándo zarpó—, al lado de lo anunciado.
 */
import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { getPortCoordinates } from "@/lib/ports-coordinates";
import { desvioAnuncio, mismoPuerto, type Tramo } from "./navitrack-model";

export type Recalada = {
  id: number;
  puerto: string;
  nave: string | null;
  anunciado_at: string;
  eta_anunciada: string | null;
  visto_at: string;
  estado:
    | "anunciada"
    | "por_verificar"
    | "parada_programada"
    | "transbordo"
    | "transbordo_anunciado"
    | "recalada";
  decidido_at: string | null;
  notas: string | null;
  /** Consta que el buque estuvo aquí. Null: solo fue anunciado. */
  recalado_at?: string | null;
  /** Zarpe real de ese puerto, según el AIS. */
  zarpe_at?: string | null;
};

export type PuertoCatalogo = {
  id: string;
  nombre: string;
  pais: string | null;
  codigo_puerto: string | null;
};

export type NaveCatalogo = {
  id: string;
  nombre: string;
  imo: string | null;
  mmsi: string | null;
};

export type ModoViaje = "directo" | "con_transbordo";

type TransbordoForm = {
  /** Clave local para React: el orden cambia al quitar uno. */
  clave: number;
  puerto: string;
  nave: string;
  identificador: string;
  viaje: string;
  llegada: string;
  llegadaHora: string;
  zarpe: string;
  zarpeHora: string;
};

type Props = {
  operacionId: string;
  pol: string | null;
  pod: string | null;
  /** Nave con que zarpó la carga: la del primer tramo. */
  naveOrigen: string | null;
  modoViaje: ModoViaje | null;
  tramos: Tramo[];
  recaladas: Recalada[];
  naves: NaveCatalogo[];
  puertos: PuertoCatalogo[];
  /** Puerto a resaltar al abrir: un transbordo al que llegó la carga sin nave. */
  foco?: string | null;
  tr: Record<string, string>;
  apiPrefix: string;
  onCerrar: () => void;
  onGuardado: (mensaje: string) => void;
  /** ETA del embarque, como fecha propuesta al anunciar la llegada. */
  etaOperacion?: string | null;
  arriboConfirmado?: boolean;
  arriboAt?: string | null;
  arriboAnunciadoAt?: string | null;
};

function fechaCorta(iso: string | null | undefined): string {
  if (!iso) return "—";
  /*
   * Una fecha sin hora se sitúa a mediodía: "2026-09-16" leído como medianoche
   * UTC cae el 15 en Chile, un día de diferencia en el dato que decide cuándo
   * cambia el buque que se está mirando.
   */
  const texto = String(iso);
  const d = new Date(texto.includes("T") ? texto : `${texto}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
}

/** Fecha y hora de un hecho del AIS, en UTC como lo informa el proveedor. */
function fechaHoraUtc(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString("es-CL", { day: "2-digit", month: "short", timeZone: "UTC" })} ${d
    .toISOString()
    .slice(11, 16)} UTC`;
}

let siguienteClave = 1;

function vacio(): TransbordoForm {
  siguienteClave += 1;
  return {
    clave: siguienteClave,
    puerto: "",
    nave: "",
    identificador: "",
    viaje: "",
    llegada: "",
    llegadaHora: "",
    zarpe: "",
    zarpeHora: "",
  };
}

/**
 * Los transbordos a partir de la cadena de tramos guardada.
 *
 * N + 1 tramos son N transbordos: cada uno es el punto donde termina un tramo
 * (su llegada anunciada) y empieza el siguiente (su nave y su zarpe).
 */
function desdeTramos(tramos: Tramo[]): TransbordoForm[] {
  const t = [...tramos].sort((a, b) => a.orden - b.orden);
  const salida: TransbordoForm[] = [];
  for (let i = 1; i < t.length; i += 1) {
    siguienteClave += 1;
    salida.push({
      clave: siguienteClave,
      puerto: (t[i].pol ?? t[i - 1].pod ?? "").trim(),
      nave: (t[i].nave ?? "").trim(),
      identificador: "",
      viaje: (t[i].viaje ?? "").trim(),
      llegada: (t[i - 1].eta ?? "").slice(0, 10),
      llegadaHora: (t[i - 1].eta_hora ?? "").slice(0, 5),
      zarpe: (t[i].etd ?? "").slice(0, 10),
      zarpeHora: (t[i].etd_hora ?? "").slice(0, 5),
    });
  }
  return salida;
}

/** Campo de puerto con sugerencias del catálogo `destinos`. */
function CampoPuerto({
  valor,
  onCambio,
  puertos,
  tr,
}: {
  valor: string;
  onCambio: (v: string) => void;
  puertos: PuertoCatalogo[];
  tr: Record<string, string>;
}) {
  const [buscado, setBuscado] = useState("");
  const sugeridos = useMemo(() => {
    const q = buscado.trim().toUpperCase();
    if (q.length < 2) return [];
    return puertos
      .filter(
        (p) => p.nombre.toUpperCase().includes(q) || (p.codigo_puerto ?? "").toUpperCase().includes(q),
      )
      .slice(0, 8);
  }, [buscado, puertos]);

  return (
    <div>
      <input
        type="text"
        value={valor}
        onChange={(e) => {
          onCambio(e.target.value);
          setBuscado(e.target.value);
        }}
        placeholder={tr.recaladaPuertoPlaceholder}
        autoComplete="off"
        className="dash-control mt-1 w-full px-3 py-2 text-[14px]"
      />
      {sugeridos.length > 0 && (
        <ul className="mt-1 max-h-44 divide-y divide-dash-border overflow-y-auto rounded-lg border border-dash-border">
          {sugeridos.map((pt) => (
            <li key={pt.id}>
              <button
                type="button"
                onClick={() => {
                  onCambio(pt.nombre);
                  setBuscado("");
                }}
                className="motion-interactive flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left hover:bg-dash-control"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-dash-fg">{pt.nombre}</span>
                  {pt.pais && (
                    <span className="block truncate text-[11px] text-dash-muted">
                      {pt.pais}
                      {pt.codigo_puerto ? ` · ${pt.codigo_puerto}` : ""}
                    </span>
                  )}
                </span>
                {/* Si el mapa no lo ubica conviene saberlo al elegir, no después. */}
                {!getPortCoordinates(pt.nombre) && (
                  <Icon icon="lucide:map-pin-off" width={13} height={13} className="shrink-0 text-amber-400" aria-hidden />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {valor.trim().length >= 3 && sugeridos.length === 0 && !getPortCoordinates(valor) && (
        <p className="mt-1 text-[11.5px] leading-snug text-amber-400">{tr.recaladaPuertoSinUbicacion}</p>
      )}
    </div>
  );
}

/** Campo de nave con sugerencias del catálogo. Se escribe en mayúsculas, como el catálogo. */
function CampoNave({
  valor,
  onCambio,
  naves,
  tr,
}: {
  valor: string;
  onCambio: (v: string) => void;
  naves: NaveCatalogo[];
  tr: Record<string, string>;
}) {
  const [buscado, setBuscado] = useState("");
  const sugeridas = useMemo(() => {
    const q = buscado.trim().toUpperCase();
    if (q.length < 2) return [];
    return naves.filter((n) => n.nombre.toUpperCase().includes(q)).slice(0, 8);
  }, [buscado, naves]);

  return (
    <div>
      {/*
        * En mayúsculas al teclear, no al guardar: el catálogo las usa y la
        * comparación con lo existente es por texto. "msc serena" creaba una
        * nave nueva junto a "MSC SERENA".
        */}
      <input
        type="text"
        value={valor}
        onChange={(e) => {
          const v = e.target.value.toUpperCase();
          onCambio(v);
          setBuscado(v);
        }}
        placeholder={tr.recaladaNavePlaceholder}
        autoComplete="off"
        className="dash-control mt-1 w-full px-3 py-2 text-[14px]"
      />
      {sugeridas.length > 0 && (
        <ul className="mt-1 max-h-40 divide-y divide-dash-border overflow-y-auto rounded-lg border border-dash-border">
          {sugeridas.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => {
                  onCambio(n.nombre);
                  setBuscado("");
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
    </div>
  );
}

/** Día + hora UTC opcional, en una línea. */
function CampoFechaHora({
  etiqueta,
  dia,
  hora,
  onDia,
  onHora,
  tr,
}: {
  etiqueta: string;
  dia: string;
  hora: string;
  onDia: (v: string) => void;
  onHora: (v: string) => void;
  tr: Record<string, string>;
}) {
  return (
    <div>
      <label className="block text-[10.5px] font-bold uppercase tracking-wider text-dash-muted">{etiqueta}</label>
      <div className="mt-1 flex gap-2">
        <input
          type="date"
          value={dia}
          onChange={(e) => onDia(e.target.value)}
          className="dash-control w-full min-w-0 px-2.5 py-2 text-[13.5px]"
        />
        <input
          type="time"
          value={hora}
          onChange={(e) => onHora(e.target.value)}
          aria-label={tr.recaladaHoraUtc}
          title={tr.recaladaHoraOpcional}
          className="dash-control w-[96px] shrink-0 px-2 py-2 text-[13.5px] tabular-nums"
        />
      </div>
    </div>
  );
}

export function NavitrackItinerario({
  operacionId,
  pol,
  pod,
  naveOrigen,
  modoViaje,
  tramos,
  recaladas,
  naves,
  puertos,
  foco = null,
  tr,
  apiPrefix,
  onCerrar,
  onGuardado,
  etaOperacion = null,
  arriboConfirmado = false,
  arriboAt = null,
  arriboAnunciadoAt = null,
}: Props) {
  const inicial = useMemo(() => desdeTramos(tramos), [tramos]);
  const [modo, setModo] = useState<ModoViaje | null>(
    modoViaje ?? (inicial.length ? "con_transbordo" : null),
  );
  const [transbordos, setTransbordos] = useState<TransbordoForm[]>(
    inicial.length ? inicial : [vacio()],
  );
  const [notas, setNotas] = useState("");
  const [vista, setVista] = useState<"itinerario" | "arribo" | "arribo_anunciado">("itinerario");
  const [fechaArribo, setFechaArribo] = useState("");
  const [notasArribo, setNotasArribo] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const destino = (pod ?? "").trim() || "—";

  const cambiar = (clave: number, campo: keyof TransbordoForm, valor: string) => {
    setError(null);
    setTransbordos((prev) => prev.map((t) => (t.clave === clave ? { ...t, [campo]: valor } : t)));
  };

  /** Lo que hizo el buque en ese puerto según el AIS. */
  const realEn = (puerto: string) =>
    puerto.trim() ? (recaladas.find((r) => mismoPuerto(r.puerto, puerto)) ?? null) : null;

  const faltaPuerto = modo === "con_transbordo" && transbordos.some((t) => !t.puerto.trim());
  const puedeGuardar = modo != null && !faltaPuerto && !guardando;

  const guardar = async () => {
    if (!modo) return;
    setGuardando(true);
    setError(null);
    try {
      const r = await fetch(`${apiPrefix}/api/navitrack/itinerario`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operacionId,
          modo,
          notas: notas.trim() || undefined,
          transbordos:
            modo === "con_transbordo"
              ? transbordos.map((t) => ({
                  puerto: t.puerto.trim(),
                  nave: t.nave.trim() || null,
                  naveIdentificador: t.identificador.trim() || null,
                  viaje: t.viaje.trim() || null,
                  llegada: t.llegada || null,
                  llegadaHora: t.llegadaHora || null,
                  zarpe: t.zarpe || null,
                  zarpeHora: t.zarpeHora || null,
                }))
              : [],
        }),
      });
      const j = (await r.json()) as { ok: boolean; code?: string; transbordos?: number; sinIdentificador?: string[] };
      if (!j.ok) {
        setError(
          j.code === "FALTA_PUERTO" || j.code === "FALTA_TRANSBORDO"
            ? tr.itErrorFaltaPuerto
            : j.code === "PUERTO_EXTREMO"
              ? tr.itErrorExtremo
              : j.code === "PUERTO_REPETIDO"
                ? tr.itErrorRepetido
                : tr.itError,
        );
        return;
      }
      const detalle =
        modo === "directo"
          ? tr.itGuardadoDirecto
          : tr.itGuardadoTransbordos.replace("{{n}}", String(j.transbordos ?? transbordos.length));
      const sinImo = (j.sinIdentificador ?? []).length
        ? ` ${tr.itSinImo.replace("{{naves}}", (j.sinIdentificador ?? []).join(", "))}`
        : "";
      onGuardado(tr.itGuardado.replace("{{detalle}}", detalle) + sinImo);
    } catch {
      setError(tr.itError);
    } finally {
      setGuardando(false);
    }
  };

  /**
   * El arribo a destino. Va contra `/api/navitrack/arribo`: es un hecho del
   * embarque, no parte del itinerario.
   */
  const guardarArribo = async (decision: "anunciado" | "confirmado" | "deshacer") => {
    setGuardando(true);
    setError(null);
    try {
      const r = await fetch(`${apiPrefix}/api/navitrack/arribo`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operacionId,
          decision,
          fecha: decision === "deshacer" ? undefined : fechaArribo || null,
          notas: notasArribo.trim() || undefined,
        }),
      });
      const j = (await r.json()) as {
        ok: boolean;
        fecha?: string | null;
        nave?: string | null;
        seguimientoApagado?: boolean;
        seguimientoEncendido?: boolean;
      };
      if (!j.ok) {
        setError(tr.arriboErrorGuardar);
        return;
      }
      const buque = (j.nave ?? naveOrigen ?? "").trim() || "—";
      if (decision === "deshacer") {
        onGuardado(
          tr.arriboDeshecho +
            (j.seguimientoEncendido ? ` ${tr.arriboSeguimientoEncendido.replace("{{nave}}", buque)}` : ""),
        );
        return;
      }
      const plantilla = decision === "anunciado" ? tr.arriboGuardadoAnunciado : tr.arriboGuardadoConfirmado;
      onGuardado(
        plantilla.replace("{{pod}}", destino).replace("{{fecha}}", fechaCorta(j.fecha ?? fechaArribo)) +
          (j.seguimientoApagado ? ` ${tr.arriboSeguimientoApagado.replace("{{nave}}", buque)}` : ""),
      );
    } catch {
      setError(tr.arriboErrorGuardar);
    } finally {
      setGuardando(false);
    }
  };

  /* La fecha del arribo se propone al abrir cada camino: hoy para el que ya
     ocurrió, la ETA conocida para el que se anuncia. */
  const abrirArribo = (v: "arribo" | "arribo_anunciado") => {
    setError(null);
    setFechaArribo(
      v === "arribo"
        ? (arriboAt ?? "").slice(0, 10) || new Date().toISOString().slice(0, 10)
        : (arriboAnunciadoAt ?? "").slice(0, 10) || (etaOperacion ?? "").slice(0, 10),
    );
    setVista(v);
  };

  const opcion = (
    valor: ModoViaje,
    icono: string,
    titulo: string,
    texto: string,
  ) => {
    const activa = modo === valor;
    return (
      <button
        type="button"
        onClick={() => {
          setError(null);
          setModo(valor);
        }}
        aria-pressed={activa}
        className={`motion-interactive flex items-start gap-3 rounded-xl border px-3.5 py-3 text-left ${
          activa
            ? "border-dash-neon/70 bg-dash-neon/10"
            : "border-dash-border bg-dash-control/60 hover:border-dash-neon/40"
        }`}
      >
        <Icon
          icon={activa ? "lucide:circle-check" : icono}
          width={18}
          height={18}
          className="mt-0.5 shrink-0 text-dash-neon"
          aria-hidden
        />
        <span className="min-w-0">
          <span className="block text-[14px] font-bold text-dash-fg">{titulo}</span>
          <span className="mt-0.5 block text-[12px] leading-snug text-dash-muted">{texto}</span>
        </span>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-sm sm:p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-label={tr.itTitulo}
        className="motion-panel dash-card dash-card-static w-full max-w-xl overflow-hidden"
        data-state="open"
      >
        <header className="dash-section-head flex items-start justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-[15px] font-bold tracking-tight text-dash-fg">{tr.itTitulo}</h2>
            <p className="mt-0.5 truncate text-[12px] text-dash-muted">
              {[pol, pod].map((p) => (p ?? "").trim() || "—").join(" → ")}
              {naveOrigen ? ` · ${naveOrigen}` : ""}
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

        {vista === "itinerario" ? (
          <div className="px-4 pb-4 pt-3">
            <p className="text-[13.5px] font-semibold leading-snug text-dash-fg">{tr.itPregunta}</p>
            <p className="mt-0.5 text-[12px] leading-snug text-dash-muted">{tr.itSubtitulo}</p>

            <div className="mt-3 grid gap-2 min-[480px]:grid-cols-2">
              {opcion("directo", "lucide:route", tr.itDirecto, tr.itDirectoTexto)}
              {opcion("con_transbordo", "lucide:git-branch", tr.itTransbordo, tr.itTransbordoTexto)}
            </div>

            {modo === "con_transbordo" && (
              <ol className="mt-4 space-y-3">
                {transbordos.map((t, i) => {
                  const real = realEn(t.puerto);
                  const resaltado = Boolean(foco && mismoPuerto(foco, t.puerto) && !t.nave.trim());
                  const enCatalogo = naves.find((n) => n.nombre.trim().toUpperCase() === t.nave.trim());
                  const sinIdent =
                    t.nave.trim() && !(enCatalogo?.imo ?? "").trim() && !(enCatalogo?.mmsi ?? "").trim();
                  const desvio = real?.recalado_at
                    ? desvioAnuncio(t.llegada || null, t.llegadaHora ? `${t.llegadaHora}:00` : null, real.recalado_at)
                    : null;
                  const desvioTexto = desvio
                    ? desvio.soloDias
                      ? Math.round(desvio.horas / 24) === 0
                        ? tr.recaladaEnFecha
                        : `${desvio.horas > 0 ? "+" : ""}${Math.round(desvio.horas / 24)} d`
                      : Math.round(desvio.horas) === 0
                        ? tr.recaladaEnFecha
                        : `${desvio.horas > 0 ? "+" : ""}${Math.round(desvio.horas)} h`
                    : null;

                  return (
                    <li
                      key={t.clave}
                      className={`rounded-xl border px-3.5 py-3 ${
                        resaltado ? "border-amber-400/60 bg-amber-400/5" : "border-dash-border bg-dash-control/40"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-dash-muted">
                          <Icon icon="lucide:git-branch" width={13} height={13} className="text-dash-neon" aria-hidden />
                          {tr.itTransbordoN.replace("{{n}}", String(i + 1))}
                        </p>
                        {transbordos.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setTransbordos((prev) => prev.filter((x) => x.clave !== t.clave))}
                            className="motion-interactive inline-flex items-center gap-1 text-[11px] font-semibold text-dash-muted hover:text-dash-fg"
                          >
                            <Icon icon="lucide:trash-2" width={12} height={12} aria-hidden />
                            {tr.itQuitar}
                          </button>
                        )}
                      </div>

                      {resaltado && (
                        <p className="mt-2 rounded-lg border border-amber-400/45 bg-amber-400/10 px-2.5 py-1.5 text-[12px] leading-snug text-dash-fg">
                          {tr.itFaltaNave.replace("{{puerto}}", t.puerto)}
                        </p>
                      )}

                      <div className="mt-2.5 grid gap-2.5 min-[480px]:grid-cols-2">
                        <div>
                          <label className="block text-[10.5px] font-bold uppercase tracking-wider text-dash-muted">
                            {tr.itPuerto} *
                          </label>
                          <CampoPuerto
                            valor={t.puerto}
                            onCambio={(v) => cambiar(t.clave, "puerto", v)}
                            puertos={puertos}
                            tr={tr}
                          />
                        </div>
                        <div>
                          <label className="block text-[10.5px] font-bold uppercase tracking-wider text-dash-muted">
                            {tr.itNave}
                          </label>
                          <CampoNave
                            valor={t.nave}
                            onCambio={(v) => cambiar(t.clave, "nave", v)}
                            naves={naves}
                            tr={tr}
                          />
                        </div>

                        <CampoFechaHora
                          etiqueta={tr.itLlegada}
                          dia={t.llegada}
                          hora={t.llegadaHora}
                          onDia={(v) => cambiar(t.clave, "llegada", v)}
                          onHora={(v) => cambiar(t.clave, "llegadaHora", v)}
                          tr={tr}
                        />
                        <CampoFechaHora
                          etiqueta={tr.itZarpe}
                          dia={t.zarpe}
                          hora={t.zarpeHora}
                          onDia={(v) => cambiar(t.clave, "zarpe", v)}
                          onHora={(v) => cambiar(t.clave, "zarpeHora", v)}
                          tr={tr}
                        />
                      </div>

                      {/*
                        * IMO o MMSI de una nave que el catálogo no puede seguir.
                        *
                        * Solo aparece cuando hace falta: si el operador lo tiene a
                        * mano —suele estar en la misma web de la naviera—, la nave
                        * queda seguible desde el primer día sin buscarla.
                        */}
                      {sinIdent && (
                        <div className="mt-2.5">
                          <label className="block text-[10.5px] font-bold uppercase tracking-wider text-dash-muted">
                            {tr.recaladaNaveIdentificador}
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={t.identificador}
                            onChange={(e) =>
                              cambiar(t.clave, "identificador", e.target.value.replace(/\D/g, "").slice(0, 9))
                            }
                            placeholder={tr.recaladaNaveIdentificadorPlaceholder}
                            className="dash-control mt-1 w-full px-3 py-2 text-[14px] tabular-nums"
                          />
                          {t.identificador.trim().length > 0 && !/^\d{7}$|^\d{9}$/.test(t.identificador.trim()) && (
                            <p className="mt-1 text-[11.5px] leading-snug text-amber-400">
                              {tr.recaladaIdentificadorInvalido}
                            </p>
                          )}
                        </div>
                      )}

                      <p className="mt-2 text-[11px] leading-snug text-dash-muted">
                        {t.nave.trim() ? tr.recaladaHoraOpcional : tr.itNaveOpcional}
                      </p>

                      {/* Lo que pasó de verdad, al lado de lo anunciado. */}
                      {t.puerto.trim() && (
                        <div className="mt-2.5 rounded-lg border border-dash-border bg-dash-control/60 px-2.5 py-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-dash-muted">{tr.itReal}</p>
                          {real?.recalado_at || real?.zarpe_at ? (
                            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-dash-fg tabular-nums">
                              <span>
                                {tr.itLlego} <strong>{fechaHoraUtc(real.recalado_at)}</strong>
                              </span>
                              {real.zarpe_at && (
                                <span>
                                  {tr.itZarpo} <strong>{fechaHoraUtc(real.zarpe_at)}</strong>
                                </span>
                              )}
                              {desvioTexto && (
                                <span className="rounded-md border border-dash-border px-1.5 py-0.5 text-[11px] font-bold">
                                  {desvioTexto}
                                </span>
                              )}
                            </p>
                          ) : (
                            <p className="mt-0.5 text-[12px] text-dash-muted">{tr.itSinDatoReal}</p>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}

            {modo === "con_transbordo" && transbordos.length < 5 && (
              <button
                type="button"
                onClick={() => setTransbordos((prev) => [...prev, vacio()])}
                className="dash-control motion-interactive mt-3 inline-flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold"
              >
                <Icon icon="lucide:plus" width={13} height={13} aria-hidden />
                {tr.itAgregar}
              </button>
            )}

            {modo && (
              <>
                <label className="mt-4 block text-[10.5px] font-bold uppercase tracking-wider text-dash-muted">
                  {tr.itNotas}
                </label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={2}
                  className="dash-control mt-1 w-full px-3 py-2 text-[13px]"
                />
              </>
            )}

            {error && (
              <p className="mt-3 rounded-lg border border-dash-border bg-dash-control/70 px-3 py-2 text-[12px] text-dash-fg">
                {error}
              </p>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={onCerrar}
                className="dash-control motion-interactive px-3 py-2 text-xs font-semibold"
              >
                {tr.cancelar}
              </button>
              <button
                type="button"
                disabled={!puedeGuardar}
                onClick={() => void guardar()}
                className="dash-cta motion-interactive px-3.5 py-2 text-xs disabled:opacity-40"
              >
                {guardando ? tr.loading : tr.itGuardar}
              </button>
            </div>

            {/*
              * Llegada a destino.
              *
              * Va aparte y con su propio encabezado porque responde otra
              * pregunta: el itinerario dice por dónde viaja la carga; esto, que
              * el viaje terminó. Juntarlos invitaría a marcar el arribo en un
              * transbordo, que apaga la verificación de un embarque que sigue
              * navegando.
              */}
            <div className="mt-5 border-t border-dash-border pt-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-dash-muted">{tr.arriboSeccion}</p>
              {arriboConfirmado ? (
                <div className="mt-2 rounded-xl border border-dash-border bg-dash-control/60 px-3.5 py-3">
                  <p className="text-[12.5px] leading-snug text-dash-fg">
                    <Icon icon="lucide:flag" width={13} height={13} className="mr-1.5 inline align-[-2px] text-dash-neon" aria-hidden />
                    {tr.arriboYaRegistrado.replace("{{fecha}}", fechaCorta(arriboAt))}
                  </p>
                  <button
                    type="button"
                    disabled={guardando}
                    onClick={() => void guardarArribo("deshacer")}
                    className="dash-control motion-interactive mt-2.5 px-3 py-1.5 text-[11.5px] font-semibold disabled:opacity-50"
                  >
                    {guardando ? tr.loading : tr.arriboDeshacer}
                  </button>
                </div>
              ) : (
                <div className="mt-2 grid gap-2 min-[480px]:grid-cols-2">
                  <button
                    type="button"
                    disabled={guardando}
                    onClick={() => abrirArribo("arribo_anunciado")}
                    className="motion-interactive flex items-start gap-3 rounded-xl border border-dash-border bg-dash-control/60 px-3.5 py-3 text-left hover:border-dash-neon/40 disabled:opacity-50"
                  >
                    <Icon icon="lucide:clock-arrow-down" width={18} height={18} className="mt-0.5 shrink-0 text-dash-neon" aria-hidden />
                    <span className="min-w-0">
                      <span className="block text-[14px] font-bold text-dash-fg">{tr.arriboAnunciadoTitulo}</span>
                      <span className="mt-0.5 block text-[12px] leading-snug text-dash-muted">
                        {tr.arriboAnunciadoTexto.replace("{{pod}}", destino)}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={guardando}
                    onClick={() => abrirArribo("arribo")}
                    className="motion-interactive flex items-start gap-3 rounded-xl border border-dash-border bg-dash-control/60 px-3.5 py-3 text-left hover:border-dash-neon/40 disabled:opacity-50"
                  >
                    <Icon icon="lucide:flag" width={18} height={18} className="mt-0.5 shrink-0 text-dash-neon" aria-hidden />
                    <span className="min-w-0">
                      <span className="block text-[14px] font-bold text-dash-fg">{tr.arriboConfirmadoTitulo}</span>
                      <span className="mt-0.5 block text-[12px] leading-snug text-dash-muted">
                        {tr.arriboConfirmadoTexto.replace("{{pod}}", destino)}
                      </span>
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Registrar el arribo pide una sola cosa: la fecha. */
          <div className="px-4 pb-4 pt-3">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-dash-muted">
              {vista === "arribo" ? tr.arriboFechaReal : tr.arriboFechaAnunciada}
            </label>
            <input
              type="date"
              value={fechaArribo}
              onChange={(e) => setFechaArribo(e.target.value)}
              className="dash-control mt-1.5 w-full px-3 py-2.5 text-[14px]"
            />

            <label className="mt-3 block text-[11px] font-bold uppercase tracking-wider text-dash-muted">
              {tr.arriboNotas}
            </label>
            <textarea
              value={notasArribo}
              onChange={(e) => setNotasArribo(e.target.value)}
              rows={2}
              className="dash-control mt-1.5 w-full px-3 py-2 text-[13px]"
            />

            {!(pod ?? "").trim() && (
              <p className="mt-3 rounded-lg border border-amber-400/45 bg-amber-400/10 px-3 py-2 text-[12px] leading-snug text-dash-fg">
                <Icon icon="lucide:map-pin-off" width={13} height={13} className="mr-1.5 inline align-[-2px]" aria-hidden />
                {tr.arriboSinPod}
              </p>
            )}

            {/* Lo que el arribo no toca: el estado de la operación va por el papeleo. */}
            <p className="mt-3 rounded-lg border border-dash-border bg-dash-control/60 px-3 py-2 text-[12.5px] leading-snug text-dash-fg">
              <Icon icon="lucide:info" width={13} height={13} className="mr-1.5 inline align-[-2px]" aria-hidden />
              {tr.arriboAvisoEstado}
            </p>

            {vista === "arribo" && (naveOrigen ?? "").trim() && (
              <p className="mt-2 rounded-lg border border-dash-border bg-dash-control/60 px-3 py-2 text-[12.5px] leading-snug text-dash-fg">
                <Icon icon="lucide:satellite-dish" width={13} height={13} className="mr-1.5 inline align-[-2px]" aria-hidden />
                {tr.arriboAvisoSeguimiento.replace("{{nave}}", (naveOrigen ?? "").trim())}
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
                onClick={() => {
                  setError(null);
                  setVista("itinerario");
                }}
                className="dash-control motion-interactive px-3 py-2 text-xs font-semibold"
              >
                {tr.cancelar}
              </button>
              <button
                type="button"
                disabled={guardando || !fechaArribo}
                onClick={() => void guardarArribo(vista === "arribo" ? "confirmado" : "anunciado")}
                className="dash-cta motion-interactive px-3.5 py-2 text-xs disabled:opacity-40"
              >
                {guardando ? tr.loading : vista === "arribo" ? tr.arriboGuardarConfirmado : tr.arriboGuardarAnunciado}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
