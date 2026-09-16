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
import { getPortCoordinates } from "@/lib/ports-coordinates";

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
  /**
   * Consta que el buque paró aquí. Null: solo fue anunciado.
   *
   * Es un eje aparte de `estado`, que habla de la carga. Un puerto puede estar
   * recalado y con el transbordo todavía sin verificar.
   */
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

type Props = {
  recalada: Recalada;
  naves: NaveCatalogo[];
  /** Catálogo de puertos (`destinos`), para el alta a mano. */
  puertos?: PuertoCatalogo[];
  /** Nave que lleva la carga hasta este puerto. */
  naveActual: string | null;
  /**
   * Quien decide puede además consultar al proveedor (solo el superadmin).
   *
   * Cambia lo que esta ventana promete antes de guardar: con crédito, la nave
   * nueva queda identificada al instante; sin él, el transbordo se registra
   * igual y el identificador queda pendiente. Decir eso antes es el punto de
   * este componente.
   */
  puedeGastar?: boolean;
  tr: Record<string, string>;
  onCerrar: () => void;
  onGuardado: (mensaje: string) => void;
  apiPrefix: string;
  /** Necesario cuando la recalada aún no está registrada (id 0). */
  operacionId: string;
  /**
   * Alta a mano, sin que el AIS haya anunciado nada.
   *
   * El operador se entera del transbordo en la web de la naviera días antes de
   * que el buque lo declare. Hasta ahora había que esperar a ese anuncio para
   * poder registrarlo, y mientras tanto la pantalla mostraba un viaje directo
   * que ya se sabía falso.
   *
   * La diferencia con el flujo normal es una sola: acá el puerto **no viene
   * dado**, se escribe. Lo demás —elegir la nave del catálogo o darla de alta,
   * crear los tramos, encender el seguimiento— es el mismo camino.
   */
  manual?: boolean;
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
  puertos = [],
  naveActual,
  puedeGastar = false,
  tr,
  onCerrar,
  onGuardado,
  apiPrefix,
  operacionId,
  manual = false,
}: Props) {
  const [modo, setModo] = useState<"preguntar" | "transbordo" | "anunciado">("preguntar");
  /* En el alta a mano el puerto y su fecha son campos; en el flujo normal
     vienen del anuncio del buque y no se tocan. */
  const [puerto, setPuerto] = useState(recalada.puerto);
  const [llegada, setLlegada] = useState((recalada.eta_anunciada ?? "").slice(0, 10));
  const [etd, setEtd] = useState("");
  const [puertoBuscado, setPuertoBuscado] = useState("");
  /* IMO o MMSI de la nave nueva, si se conoce. Opcional: sin él la nave se
     guarda igual y el identificador queda pendiente. */
  const [identNave, setIdentNave] = useState("");
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

  /*
   * Sugerencias de puerto.
   *
   * Se ofrece el catálogo de la base (`destinos`) porque es el que la gente
   * conoce, y cada fila avisa si el mapa sabe ubicarlo: elegir uno que sí
   * resuelve es lo que hace que la escala se dibuje. Escribir a mano sigue
   * permitido —el operador puede saber de un puerto que no está cargado— pero
   * deja de ser el único camino.
   */
  const puertosSugeridos = useMemo(() => {
    const q = puertoBuscado.trim().toUpperCase();
    if (q.length < 2) return [];
    return puertos
      .filter(
        (p) =>
          p.nombre.toUpperCase().includes(q) ||
          (p.codigo_puerto ?? "").toUpperCase().includes(q),
      )
      .slice(0, 8);
  }, [puertoBuscado, puertos]);

  /** La nave escrita, si coincide con una del catálogo. */
  const enCatalogo = useMemo(() => {
    const q = naveElegida.trim().toUpperCase();
    if (!q) return null;
    return naves.find((n) => n.nombre.trim().toUpperCase() === q) ?? null;
  }, [naveElegida, naves]);

  const tieneIdentificador = Boolean((enCatalogo?.imo ?? "").trim() || (enCatalogo?.mmsi ?? "").trim());

  /* Sin puerto no hay recalada que registrar, y todos los caminos la necesitan. */
  const faltaPuerto = !puerto.trim();

  /*
   * El puerto se puede escribir en el alta a mano y al anunciar un transbordo.
   *
   * En el segundo caso viene puesto el que declaró el AIS, que suele ser el
   * correcto, pero la naviera a veces indica otro: se deja editable en vez de
   * obligar a cancelar y empezar de nuevo por un puerto distinto.
   */
  const puertoEditable = manual || modo === "anunciado";

  useEffect(() => {
    setError(null);
  }, [modo, naveElegida]);

  const guardar = async (decision: "parada" | "transbordo" | "directo" | "anunciado") => {
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
          puerto: recalada.id ? undefined : puerto.trim(),
          etaAnunciada: recalada.id ? undefined : llegada || null,
          nave: recalada.id ? undefined : recalada.nave,
          decision,
          naveNombre:
            decision === "transbordo" || decision === "anunciado"
              ? naveElegida.trim()
              : undefined,
          // Si el operador lo tiene a mano, no hay que pagarle una búsqueda al
          // proveedor: es el mismo dato por el que se gastaría el crédito.
          naveIdentificador: identNave.trim() || undefined,
          viaje: viaje.trim() || undefined,
          // Zarpe del tramo nuevo. La API ya lo aceptaba; el formulario no lo
          // pedía, así que el tramo quedaba sin fecha de salida y el viaje se
          // calculaba solo con la de llegada.
          etd: etd || undefined,
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
        onGuardado(tr.recaladaGuardadaParada.replace("{{puerto}}", puerto.trim()));
        return;
      }

      if (decision === "directo") {
        const n = (j as { paradas?: string[] }).paradas?.length ?? 0;
        onGuardado(tr.recaladaGuardadaDirecto.replace("{{n}}", String(n)));
        return;
      }

      // El mensaje dice qué pasó con el seguimiento, que es lo que el usuario
      // necesita saber después de registrar un transbordo. En el anunciado, lo
      // que importa es lo contrario: que hoy **no** cambió nada.
      if (decision === "anunciado") {
        onGuardado(
          tr.recaladaGuardadaAnunciado
            .replace("{{anterior}}", j.naveAnterior ?? naveActual ?? "—")
            .replace("{{nueva}}", j.naveNueva ?? naveElegida.trim()),
        );
        return;
      }

      const base = tr.recaladaGuardadaTransbordo
        .replace("{{anterior}}", j.naveAnterior ?? "—")
        .replace("{{nueva}}", j.naveNueva ?? "—");
      const detalle =
        j.aviso === "SIN_IDENTIFICADOR_PENDIENTE"
          ? ` ${tr.recaladaSinImoPendiente}`
          : j.aviso === "SIN_IDENTIFICADOR"
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
            {/* El alta a mano no verifica nada: no hubo anuncio que responder. */}
            <h2 className="text-[15px] font-bold tracking-tight text-dash-fg">
              {manual ? tr.recaladaTituloManual : tr.recaladaTitulo}
            </h2>
            <p className="mt-0.5 text-[12px] text-dash-muted">
              {(manual ? tr.recaladaSubtituloManual : tr.recaladaSubtitulo)
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

        {/* El dato crudo: qué declaró y para cuándo. Es lo que sostiene la pregunta.
            En el alta a mano no hay declaración: ese dato lo pone el operador. */}
        <div className="grid gap-2 px-4 py-3 min-[380px]:grid-cols-2">
          {puertoEditable ? (
            <>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-dash-muted">
                  {tr.recaladaPuerto}
                </label>
                <input
                  type="text"
                  value={puerto}
                  onChange={(e) => {
                    setPuerto(e.target.value);
                    setPuertoBuscado(e.target.value);
                  }}
                  placeholder={tr.recaladaPuertoPlaceholder}
                  autoComplete="off"
                  className="dash-control mt-1 w-full px-3 py-2 text-[14px]"
                />
                {puertosSugeridos.length > 0 && (
                  <ul className="mt-1 max-h-44 divide-y divide-dash-border overflow-y-auto rounded-lg border border-dash-border">
                    {puertosSugeridos.map((pt) => {
                      const ubicable = Boolean(getPortCoordinates(pt.nombre));
                      return (
                        <li key={pt.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setPuerto(pt.nombre);
                              setPuertoBuscado("");
                            }}
                            className="motion-interactive flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left hover:bg-dash-control"
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-[13px] font-semibold text-dash-fg">
                                {pt.nombre}
                              </span>
                              {pt.pais && (
                                <span className="block truncate text-[11px] text-dash-muted">
                                  {pt.pais}
                                  {pt.codigo_puerto ? ` · ${pt.codigo_puerto}` : ""}
                                </span>
                              )}
                            </span>
                            {/* Si el mapa no lo ubica conviene saberlo al elegir,
                                no después de guardar. */}
                            {!ubicable && (
                              <Icon
                                icon="lucide:map-pin-off"
                                width={13}
                                height={13}
                                className="shrink-0 text-amber-400"
                                aria-hidden
                              />
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-dash-muted">
                  {tr.recaladaLlegadaAnunciada}
                </label>
                <input
                  type="date"
                  value={llegada}
                  onChange={(e) => setLlegada(e.target.value)}
                  className="dash-control mt-1 w-full px-3 py-2 text-[14px]"
                />
              </div>
              {/*
                * Puerto que el catálogo no ubica.
                *
                * Se guarda igual —el dato es del operador y vale— pero el mapa
                * no puede dibujarlo y la ruta pasará de largo. Decirlo acá es
                * más barato que descubrirlo después mirando un mapa que calla.
                */}
              {puerto.trim().length >= 3 && puertosSugeridos.length === 0 && !getPortCoordinates(puerto) && (
                <p className="min-[380px]:col-span-2 rounded-lg border border-amber-400/45 bg-amber-400/10 px-3 py-2 text-[12px] leading-snug text-dash-fg">
                  <Icon icon="lucide:map-pin-off" width={13} height={13} className="mr-1.5 inline align-[-2px]" aria-hidden />
                  {tr.recaladaPuertoSinUbicacion}
                </p>
              )}
            </>
          ) : (
            <>
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
            </>
          )}
        </div>

        {modo === "preguntar" ? (
          <div className="px-4 pb-4">
            <p className="text-[13.5px] leading-snug text-dash-fg">
              {manual ? tr.recaladaPreguntaManual : tr.recaladaPregunta}
            </p>

            <div className="mt-3 grid gap-2">
              {/* La respuesta más frecuente, primero y a un clic. */}
              <button
                type="button"
                disabled={guardando || faltaPuerto}
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

              {/*
                * Viaje directo.
                *
                * Va entre las otras dos porque es la respuesta de quien ya sabe:
                * no responde por este puerto sino por todo el viaje, y con eso
                * deja de preguntarse en cada escala. Seguir preguntando cuando
                * la respuesta se conoce de antemano es el camino más corto a que
                * nadie mire las preguntas que sí importan.
                */}
              <button
                type="button"
                disabled={guardando || faltaPuerto}
                onClick={() => void guardar("directo")}
                className="motion-interactive flex items-start gap-3 rounded-xl border border-dash-border bg-dash-control/60 px-3.5 py-3 text-left hover:border-dash-neon/40 disabled:opacity-50"
              >
                <Icon icon="lucide:route" width={18} height={18} className="mt-0.5 shrink-0 text-dash-neon" aria-hidden />
                <span className="min-w-0">
                  <span className="block text-[14px] font-bold text-dash-fg">{tr.recaladaDirectoTitulo}</span>
                  <span className="mt-0.5 block text-[12px] leading-snug text-dash-muted">
                    {tr.recaladaDirectoTexto}
                  </span>
                </span>
              </button>

              {/*
                * Transbordo que todavía no ocurre.
                *
                * Va después del que ya ocurrió porque es el caso menos
                * frecuente, pero resuelve el más incómodo: saber por la web de
                * la naviera que la carga cambia de barco dentro de dos semanas
                * y no tener dónde anotarlo. Antes la única opción era registrar
                * el transbordo como hecho, y eso movía el seguimiento a un
                * buque que aún no lleva la carga.
                */}
              <button
                type="button"
                disabled={guardando || faltaPuerto}
                onClick={() => setModo("anunciado")}
                className="motion-interactive flex items-start gap-3 rounded-xl border border-dash-border bg-dash-control/60 px-3.5 py-3 text-left hover:border-dash-neon/40 disabled:opacity-50"
              >
                <Icon icon="lucide:calendar-clock" width={18} height={18} className="mt-0.5 shrink-0 text-dash-neon" aria-hidden />
                <span className="min-w-0">
                  <span className="block text-[14px] font-bold text-dash-fg">{tr.recaladaAnunciadoTitulo}</span>
                  <span className="mt-0.5 block text-[12px] leading-snug text-dash-muted">
                    {tr.recaladaAnunciadoTexto}
                  </span>
                </span>
              </button>

              <button
                type="button"
                disabled={guardando || faltaPuerto}
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
            {/*
              * El nombre se escribe en mayúsculas.
              *
              * El catálogo las usa —225 de 228 naves— y la comparación con lo
              * existente es por texto: escribir "msc serena" creaba una nave
              * nueva junto a "MSC SERENA". Así quedaron en la base
              * "Cma Cgm Carl Antonie" y dos más, duplicando las que ya estaban.
              * Se transforma al teclear, no al guardar, para que lo que se ve
              * sea lo que se va a grabar.
              */}
            <input
              type="text"
              value={naveElegida}
              onChange={(e) => {
                const v = e.target.value.toUpperCase();
                setNaveElegida(v);
                setBusqueda(v);
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

            {/*
              * IMO o MMSI, opcional.
              *
              * Es lo que el sistema buscaría pagando un crédito. Cuando el
              * operador ya lo tiene —lo mira en la misma web de la naviera donde
              * vio el transbordo— escribirlo acá lo ahorra y deja la nave lista
              * para seguirse desde el primer día.
              */}
            <label className="mt-3 block text-[11px] font-bold uppercase tracking-wider text-dash-muted">
              {tr.recaladaNaveIdentificador}
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={identNave}
              onChange={(e) => setIdentNave(e.target.value.replace(/\D/g, "").slice(0, 9))}
              placeholder={tr.recaladaNaveIdentificadorPlaceholder}
              className="dash-control mt-1.5 w-full px-3 py-2.5 text-[14px] tabular-nums"
            />
            {identNave.trim().length > 0 && !/^\d{7}$|^\d{9}$/.test(identNave.trim()) && (
              <p className="mt-1 text-[11.5px] leading-snug text-amber-400">
                {tr.recaladaIdentificadorInvalido}
              </p>
            )}

            <div className="mt-3 grid gap-2 min-[420px]:grid-cols-3">
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
                  {tr.recaladaNuevoEtd}
                </label>
                <input
                  type="date"
                  value={etd}
                  onChange={(e) => setEtd(e.target.value)}
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
                  modo === "anunciado" || tieneIdentificador
                    ? "border-dash-border bg-dash-control/60 text-dash-fg"
                    : "border-amber-400/45 bg-amber-400/10 text-dash-fg"
                }`}
              >
                <Icon
                  icon={
                    modo === "anunciado"
                      ? "lucide:calendar-clock"
                      : tieneIdentificador
                        ? "lucide:info"
                        : "lucide:coins"
                  }
                  width={13}
                  height={13}
                  className="mr-1.5 inline align-[-2px]"
                  aria-hidden
                />
                {/*
                  * Anunciado: hoy no se gasta ni se mueve nada. Decirlo importa
                  * tanto como decir el costo en el otro camino, porque lo que
                  * el usuario necesita saber es cuándo va a cambiar el buque
                  * que está mirando.
                  */}
                {modo === "anunciado"
                  ? tr.recaladaAvisoProgramado
                      .replace("{{anterior}}", naveActual ?? "—")
                      .replace("{{nueva}}", naveElegida.trim())
                      .replace("{{fecha}}", fechaCorta(eta || llegada || null))
                  : tieneIdentificador
                    ? tr.recaladaAvisoYaExiste
                        .replace("{{anterior}}", naveActual ?? "—")
                        .replace("{{nueva}}", naveElegida.trim())
                    : (puedeGastar ? tr.recaladaAvisoCosto : tr.recaladaAvisoSinCredito).replace(
                        "{{nueva}}",
                        naveElegida.trim(),
                      )}
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
                disabled={guardando || faltaPuerto || !naveElegida.trim()}
                onClick={() => void guardar(modo === "anunciado" ? "anunciado" : "transbordo")}
                className="dash-cta motion-interactive px-3.5 py-2 text-xs disabled:opacity-40"
              >
                {guardando
                  ? tr.loading
                  : tieneIdentificador || !puedeGastar
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
