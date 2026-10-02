import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Icon } from "@iconify/react";
import { format, parseISO, isValid } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { useAuth } from "@/lib/auth/AuthContext";
import { applyOperacionesClienteFilter, shouldSkipOperacionesForCliente } from "@/lib/auth/operacionesClienteScope";
import {
  aplicarFiltroTemporada,
  listarTemporadas,
  TEMPORADA_TODAS,
  type Temporada,
} from "@/lib/temporadas";
import { useTemporadaActiva } from "@/lib/useTemporadaActiva";
import { normalizarEstado } from "@/lib/operaciones/estados";
import { desvioEta, formatoDesvio, resumirDesvios, type Desvio } from "@/lib/operaciones/desvioEta";
import { isoDePuerto } from "@/components/navitrack/navitrack-banderas";
import { DashboardViewTabs, type DashboardView } from "./DashboardViewTabs";
import { AnilloPizarra, Cifra, ListaRieles, PanelPizarra, retrasoEntrada, useEntrada, type FilaPizarra } from "./pizarra";

/*
 * Histórico de volumen: una pizarra de una sola pantalla con la imagen de ASLI.
 * Estilos en src/styles/historico-marca.css.
 *
 * El cliente y el personal interno ven la misma pizarra con distinto contenido:
 *
 *   cliente   operaciones, contenedores, destinos y especies. Kilos y desvío
 *             de llegada solo aparecen cuando al menos el 80 % de sus
 *             operaciones tiene el dato: una cifra hecha con 1 de 50 no dice
 *             nada al cliente y además le muestra un vacío de captura.
 *   interno   suma empresas, desvío y kilos *con* su cobertura ("2/50 con
 *             dato"), y el tipo de unidad. Al equipo sí le sirve saber qué
 *             falta cargar.
 */

type OperacionVolumen = {
  etd: string | null;
  especie: string | null;
  tipo_unidad: string | null;
  contenedor: string | null;
  pallets: number | null;
  peso_neto: number | null;
  estado_operacion: string | null;
  cliente: string | null;
  pod: string | null;
  /* Prometido contra real: `eta_original` es el cero de la reserva. Ver `desvioEta`. */
  eta: string | null;
  eta_original: string | null;
  eta_original_heredada: boolean | null;
  arribo_confirmado: boolean | null;
  arribo_at: string | null;
};

type Props = {
  view: DashboardView;
  onViewChange: (view: DashboardView) => void;
};

/** Anotado como `string` a propósito: con el literal, el genérico de PostgREST hace explotar la inferencia. */
const COLUMNAS: string =
  "etd, especie, tipo_unidad, contenedor, pallets, peso_neto, estado_operacion, cliente, pod, eta, eta_original, eta_original_heredada, arribo_confirmado, arribo_at";

/** Desde qué cobertura un dato parcial se le muestra al cliente. */
const COBERTURA_MINIMA_CLIENTE = 0.8;
/** Filas por panel de desglose; el resto se agrupa en "Otras". */
const FILAS_POR_PANEL = 6;

type Fila = FilaPizarra;

function num(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function parseEtd(value: string | null): Date | null {
  if (!value) return null;
  try {
    const d = parseISO(value.length === 10 ? `${value}T12:00:00` : value);
    return isValid(d) ? d : null;
  } catch {
    return null;
  }
}

function contenedorKey(value: string | null | undefined): string | null {
  const cont = (value ?? "").trim().toUpperCase();
  return cont || null;
}

/** Ordena de mayor a menor y agrupa lo que no cabe en una fila "Otras". */
function agrupar(acc: Map<string, number>, otras: string): { filas: Fila[]; distintos: number } {
  const orden = Array.from(acc.entries())
    .map(([label, valor]) => ({ label, valor }))
    .sort((a, b) => b.valor - a.valor || a.label.localeCompare(b.label, "es"));
  if (orden.length <= FILAS_POR_PANEL) return { filas: orden, distintos: orden.length };
  const visibles = orden.slice(0, FILAS_POR_PANEL - 1);
  const resto = orden.slice(FILAS_POR_PANEL - 1).reduce((s, f) => s + f.valor, 0);
  return { filas: [...visibles, { label: otras, valor: resto }], distintos: orden.length };
}

/** Escala del gráfico: pasos redondos y espacio arriba para la etiqueta del pico. */
function escala(max: number): { tope: number; paso: number } {
  const paso = max <= 8 ? 2 : max <= 20 ? 4 : max <= 50 ? 10 : Math.ceil(max / 40) * 10;
  return { tope: Math.max(paso, Math.ceil((max * 1.18) / paso) * paso), paso };
}

type Kpi = {
  key: string;
  label: string;
  icon: string;
  /** Número que cuenta. Si no hay, se muestra `texto` tal cual. */
  valor?: number;
  texto?: string;
  nota?: string;
  banderas?: string[];
};

export function DashboardHistoricoContent({ view, onViewChange }: Props) {
  const { t, locale } = useLocale();
  const tr = t.dashboard;
  const {
    isLoading: authLoading,
    isCliente,
    isEjecutivo,
    isAdmin,
    isSuperadmin,
    empresaNombres,
  } = useAuth();
  const { temporadaActiva, temporadaLoading } = useTemporadaActiva();

  const [temporadas, setTemporadas] = useState<Temporada[]>([]);
  /** null = aún no inicializado; no consultar hasta resolver temporada. */
  const [temporadaSel, setTemporadaSel] = useState<string | null>(null);
  const [operaciones, setOperaciones] = useState<OperacionVolumen[]>([]);
  const [loading, setLoading] = useState(true);
  /** Descarta respuestas viejas si cambia la temporada a mitad de una consulta. */
  const fetchGen = useRef(0);

  /** Empresas, cobertura y tipo de unidad: solo personal interno. */
  const esInterno = isSuperadmin || isAdmin || isEjecutivo;

  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  const intl = locale === "es" ? "es-CL" : "en-US";
  const fechaLocale = locale === "es" ? es : enUS;
  const fmt = useCallback((value: number) => Math.round(value).toLocaleString(intl, { maximumFractionDigits: 0 }), [intl]);

  useEffect(() => {
    if (temporadaLoading) return;
    setTemporadaSel((actual) => actual ?? temporadaActiva ?? TEMPORADA_TODAS);
  }, [temporadaActiva, temporadaLoading]);

  useEffect(() => {
    if (!supabase) return;
    let vigente = true;
    void listarTemporadas(supabase).then(({ temporadas: lista }) => {
      if (vigente) setTemporadas(lista);
    });
    return () => {
      vigente = false;
    };
  }, [supabase]);

  const fetchVolumen = useCallback(async () => {
    if (!supabase || authLoading || temporadaLoading || temporadaSel == null) return;
    if (shouldSkipOperacionesForCliente({ isCliente, isEjecutivo, empresaNombres })) {
      setOperaciones([]);
      setLoading(false);
      return;
    }
    const gen = ++fetchGen.current;
    setLoading(true);
    let query = supabase.from("operaciones").select(COLUMNAS).is("deleted_at", null);
    query = applyOperacionesClienteFilter(query, { isCliente, isEjecutivo, empresaNombres });
    query = aplicarFiltroTemporada(query, temporadaSel !== TEMPORADA_TODAS ? temporadaSel : null);
    const { data } = await query.limit(5000);
    if (gen !== fetchGen.current) return;
    setOperaciones((data ?? []) as unknown as OperacionVolumen[]);
    setLoading(false);
  }, [supabase, authLoading, temporadaLoading, isCliente, isEjecutivo, empresaNombres, temporadaSel]);

  useEffect(() => {
    if (!authLoading && temporadaSel != null) void fetchVolumen();
  }, [authLoading, temporadaSel, fetchVolumen]);

  /** El volumen embarcado excluye las canceladas: nunca se movió carga. */
  const embarcadas = useMemo(
    () => operaciones.filter((op) => normalizarEstado(op.estado_operacion) !== "CANCELADA"),
    [operaciones],
  );
  const total = embarcadas.length;

  const resumen = useMemo(() => {
    const contenedores = new Set<string>();
    const porDestino = new Map<string, number>();
    const porEspecie = new Map<string, number>();
    const porUnidad = new Map<string, number>();
    const contPorEmpresa = new Map<string, Set<string>>();
    const opsPorEmpresa = new Map<string, number>();
    let pesoNeto = 0;
    let conPeso = 0;
    let conUnidad = 0;

    for (const op of embarcadas) {
      const cont = contenedorKey(op.contenedor);
      if (cont) contenedores.add(cont);
      const pod = (op.pod ?? "").trim();
      if (pod) porDestino.set(pod, (porDestino.get(pod) ?? 0) + 1);
      const especie = (op.especie ?? "").trim();
      if (especie) porEspecie.set(especie, (porEspecie.get(especie) ?? 0) + 1);
      const unidad = (op.tipo_unidad ?? "").trim().toUpperCase();
      if (unidad) {
        porUnidad.set(unidad, (porUnidad.get(unidad) ?? 0) + 1);
        conUnidad += 1;
      }
      const empresa = (op.cliente ?? "").trim();
      if (empresa) {
        opsPorEmpresa.set(empresa, (opsPorEmpresa.get(empresa) ?? 0) + 1);
        if (cont) {
          const set = contPorEmpresa.get(empresa) ?? new Set<string>();
          set.add(cont);
          contPorEmpresa.set(empresa, set);
        }
      }
      const kg = num(op.peso_neto);
      if (kg > 0) {
        pesoNeto += kg;
        conPeso += 1;
      }
    }

    // Empresas por contenedores; si una no tiene contenedor cargado, cuenta por operaciones.
    const porEmpresa = new Map<string, number>();
    for (const [empresa, ops] of opsPorEmpresa) porEmpresa.set(empresa, contPorEmpresa.get(empresa)?.size || ops);

    return {
      contenedores: contenedores.size,
      destinos: agrupar(porDestino, tr.histOthersM),
      especies: agrupar(porEspecie, tr.histOthers),
      unidades: agrupar(porUnidad, tr.histOthers),
      empresas: agrupar(porEmpresa, tr.histOthers),
      pesoNeto,
      conPeso,
      conUnidad,
    };
  }, [embarcadas, tr.histOthers, tr.histOthersM]);

  /*
   * Cumplimiento de la llegada: el arribo real contra lo prometido en la
   * reserva. El cero es `eta_original` y el desvío va en días con signo; se usa
   * la mediana para que un embarque con un mes de atraso no arrastre todo.
   */
  const cumplimiento = useMemo(
    () => resumirDesvios(embarcadas.map((op) => desvioEta(op)).filter((d): d is Desvio => d != null)),
    [embarcadas],
  );

  /* Meses de zarpe, con los meses sin zarpes en 0 para que la serie no salte. */
  const porMes = useMemo(() => {
    const conteo = new Map<string, number>();
    let primero: Date | null = null;
    let ultimo: Date | null = null;
    for (const op of embarcadas) {
      const etd = parseEtd(op.etd);
      if (!etd) continue;
      const inicio = new Date(etd.getFullYear(), etd.getMonth(), 1);
      const clave = format(inicio, "yyyy-MM");
      conteo.set(clave, (conteo.get(clave) ?? 0) + 1);
      if (!primero || inicio < primero) primero = inicio;
      if (!ultimo || inicio > ultimo) ultimo = inicio;
    }
    const items: { inicio: Date; operaciones: number }[] = [];
    if (primero && ultimo) {
      for (let d = new Date(primero); d <= ultimo; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
        items.push({ inicio: d, operaciones: conteo.get(format(d, "yyyy-MM")) ?? 0 });
      }
    }
    const max = Math.max(0, ...items.map((i) => i.operaciones));
    const pico = items.find((i) => i.operaciones === max && max > 0) ?? null;
    return { items, max, pico, ...escala(Math.max(max, 1)) };
  }, [embarcadas]);

  const cobertura = (conDato: number) => `${fmt(conDato)}/${fmt(total)} ${tr.volumeCoverage}`;
  const alcanza = (conDato: number) => total > 0 && conDato / total >= COBERTURA_MINIMA_CLIENTE;

  const kpis: Kpi[] = [
    {
      key: "ops",
      label: tr.volumeOperations,
      icon: "lucide:layers",
      valor: total,
      nota: porMes.pico
        ? tr.histPeakMonth.replace("{{mes}}", format(porMes.pico.inicio, "MMMM", { locale: fechaLocale }))
        : undefined,
    },
    { key: "cont", label: tr.volumeContainers, icon: "lucide:container", valor: resumen.contenedores, nota: tr.histShippedM },
  ];
  if (esInterno) {
    kpis.push({ key: "empresas", label: tr.volumeCompanies, icon: "lucide:building-2", valor: resumen.empresas.distintos, nota: tr.histWithOperations });
  }
  kpis.push({
    key: "destinos",
    label: tr.volumeDestinations,
    icon: "lucide:map-pin",
    valor: resumen.destinos.distintos,
    banderas: resumen.destinos.filas
      .map((f) => isoDePuerto(f.label))
      .filter((iso): iso is string => Boolean(iso))
      .slice(0, 6),
  });
  if (!esInterno) {
    kpis.push({ key: "especies", label: tr.histSpecies, icon: "lucide:sprout", valor: resumen.especies.distintos, nota: tr.histShippedF });
  }
  if (esInterno || alcanza(cumplimiento.total)) {
    kpis.push({
      key: "desvio",
      label: tr.volumeDeviation,
      icon: "lucide:target",
      texto: cumplimiento.mediana != null ? formatoDesvio(cumplimiento.mediana) : "—",
      nota: esInterno ? (cumplimiento.total === 0 ? tr.volumeNoCoverage : cobertura(cumplimiento.total)) : undefined,
    });
  }
  if (esInterno || alcanza(resumen.conPeso)) {
    kpis.push({
      key: "kg",
      label: tr.volumeNetKg,
      icon: "lucide:weight",
      valor: resumen.conPeso > 0 ? resumen.pesoNeto : undefined,
      texto: resumen.conPeso > 0 ? undefined : "—",
      nota: esInterno ? (resumen.conPeso === 0 ? tr.volumeNoCoverage : cobertura(resumen.conPeso)) : undefined,
    });
  }

  const listo = useEntrada(loading ? "cargando" : `${temporadaSel}-${total}-${locale}`);

  const subtitulo = (temporadaSel === TEMPORADA_TODAS ? tr.histSubtitleAll : tr.histSubtitle)
    .replace("{{temporada}}", temporadaSel ?? "")
    .replace("{{n}}", fmt(total));

  const rango = (() => {
    const items = porMes.items;
    if (items.length === 0) return "";
    const a = items[0].inicio;
    const b = items[items.length - 1].inicio;
    if (items.length === 1) return format(a, "MMMM yyyy", { locale: fechaLocale });
    return a.getFullYear() === b.getFullYear()
      ? `${format(a, "MMMM", { locale: fechaLocale })} – ${format(b, "MMMM yyyy", { locale: fechaLocale })}`
      : `${format(a, "MMM yyyy", { locale: fechaLocale })} – ${format(b, "MMM yyyy", { locale: fechaLocale })}`;
  })();

  const d = retrasoEntrada;
  const opsTexto = (n: number) => `${fmt(n)} ${n === 1 ? tr.histOp1 : tr.histOpN}`;

  const panelLista = (titulo: string, sub: string, datos: { filas: Fila[] }, retraso: number, conBandera: boolean) => (
    <PanelPizarra titulo={titulo} extra={sub} retraso={retraso} className="min-h-[15rem] lg:min-h-0">
      <ListaRieles filas={datos.filas} listo={listo} retraso={retraso} formato={fmt} vacio={tr.noData} banderas={conBandera} />
    </PanelPizarra>
  );

  const panelEspecies = (retraso: number) => (
    <PanelPizarra titulo={tr.histSpecies} extra={tr.histSpeciesSub} retraso={retraso} className="min-h-[15rem] lg:min-h-0">
      <AnilloPizarra
        filas={resumen.especies.filas}
        listo={listo}
        retraso={retraso}
        formato={fmt}
        centro={resumen.especies.distintos}
        centroTexto={tr.histSpeciesCenter}
        vacio={tr.noData}
        etiqueta={tr.histSpecies}
      />
    </PanelPizarra>
  );

  const nMeses = Math.max(porMes.items.length, 1);
  const columnasMes = { gridTemplateColumns: `repeat(${nMeses}, minmax(0, 1fr))`, gap: "clamp(8px, 1.3vw, 22px)" };
  const ticks = Array.from({ length: Math.floor(porMes.tope / porMes.paso) + 1 }, (_, i) => i * porMes.paso);

  return (
    <main
      className={`hm ${listo ? "hm--listo" : ""} dash-page relative flex min-h-0 flex-1 flex-col overflow-y-auto text-base lg:overflow-hidden`}
    >
      <svg className="hm-ruta" viewBox="0 0 1600 900" preserveAspectRatio="none" aria-hidden>
        <path d="M -40 760 C 300 700 420 520 700 540 S 1150 760 1380 520 S 1560 140 1680 90" />
      </svg>

      <div className="relative flex min-h-0 flex-1 flex-col gap-3 p-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-4 lg:gap-4 lg:px-6 lg:py-5">
        {/* cabecera */}
        <header className="hm-aparece flex shrink-0 flex-wrap items-center justify-between gap-3" style={d(0)}>
          <div className="min-w-0">
            <h1 className="hm-titulo">{tr.historicTitle}</h1>
            <p className="hm-sub truncate">{loading ? "…" : subtitulo}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <DashboardViewTabs view={view} onChange={onViewChange} />
            <label className="sr-only" htmlFor="dashboard-temporada">{tr.season}</label>
            <select
              id="dashboard-temporada"
              value={temporadaSel ?? ""}
              onChange={(e) => setTemporadaSel(e.target.value || TEMPORADA_TODAS)}
              className="hm-control px-3 py-2 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hm-teal-dato)]"
            >
              <option value={TEMPORADA_TODAS}>{tr.seasonAll}</option>
              {temporadas.map((tp) => (
                <option key={tp.id} value={tp.nombre}>
                  {tp.nombre}
                </option>
              ))}
            </select>
            <button type="button" onClick={() => void fetchVolumen()} className="hm-control p-2.5" title={tr.refresh} aria-label={tr.refresh}>
              <Icon icon="lucide:refresh-cw" className="h-4 w-4" />
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="hm-panel motion-skeleton motion-skeleton-on-dark h-24" />
              ))}
            </div>
            <div className="hm-panel motion-skeleton motion-skeleton-on-dark min-h-[16rem] flex-1" />
          </div>
        ) : (
          <>
            {/* indicadores */}
            <section
              className="grid shrink-0 grid-cols-2 gap-3 lg:[grid-template-columns:repeat(var(--hm-n),minmax(0,1fr))] lg:gap-3.5"
              style={{ "--hm-n": kpis.length } as CSSProperties}
              aria-label={tr.historicTitle}
            >
              {kpis.map((k, i) => (
                <div key={k.key} className="hm-panel hm-kpi hm-aparece" style={d(80 + i * 60)}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="hm-kpi-nombre truncate">{k.label}</span>
                    <span className="hm-kpi-ico" aria-hidden>
                      <Icon icon={k.icon} width={16} height={16} />
                    </span>
                  </div>
                  <div className="flex min-w-0 items-baseline gap-3">
                    <b className="hm-kpi-valor tabular-nums">
                      {k.valor != null ? <Cifra valor={k.valor} activo={listo} retraso={180 + i * 60} formato={fmt} /> : k.texto}
                    </b>
                    {k.banderas && k.banderas.length > 0 ? (
                      <span className="flex self-center" aria-hidden>
                        {k.banderas.map((iso, j) => (
                          <Icon
                            key={iso + j}
                            icon={`circle-flags:${iso.toLowerCase()}`}
                            width={18}
                            height={18}
                            className="rounded-full"
                            style={{ marginLeft: j === 0 ? 0 : -3, boxShadow: "0 0 0 2px var(--hm-navy)" }}
                          />
                        ))}
                      </span>
                    ) : (
                      k.nota && <span className="hm-kpi-nota min-w-0 truncate">{k.nota}</span>
                    )}
                  </div>
                  {k.banderas && k.nota && <span className="hm-kpi-nota truncate">{k.nota}</span>}
                  <span className="hm-franja" style={d(80 + i * 60)} />
                </div>
              ))}
            </section>

            {/* gráfico + desglose */}
            <section
              className={`grid min-h-0 flex-1 grid-cols-1 gap-3 lg:gap-3.5 ${
                esInterno
                  ? "lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,1fr)]"
                  : "lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]"
              }`}
            >
              <div className="hm-panel hm-bloque hm-aparece min-h-[18rem] lg:min-h-0" style={d(320)}>
                <div className="hm-bloque-cab">
                  <h2>{tr.histMonthTitle}</h2>
                  <span>{rango}</span>
                </div>
                {porMes.items.length === 0 ? (
                  <p className="hm-vacio">{tr.noData}</p>
                ) : (
                  <div className="hm-grafico">
                    <div className="hm-eje" aria-hidden>
                      {ticks.map((v) => (
                        <span key={v} style={{ bottom: `${(v / porMes.tope) * 100}%` }}>
                          {v}
                        </span>
                      ))}
                    </div>
                    <div
                      className="hm-area"
                      style={columnasMes}
                      role="img"
                      aria-label={porMes.items
                        .map((m) => `${format(m.inicio, "MMM yyyy", { locale: fechaLocale })}: ${m.operaciones}`)
                        .join(", ")}
                    >
                      {ticks.slice(1).map((v) => (
                        <div key={v} className="hm-grilla" style={{ bottom: `${(v / porMes.tope) * 100}%` }} />
                      ))}
                      {porMes.items.map((m, i) => {
                        const alto = (m.operaciones / porMes.tope) * 100;
                        const esPico = porMes.pico === m;
                        return (
                          <div
                            key={m.inicio.toISOString()}
                            className={`hm-columna ${esPico ? "es-pico" : ""} ${m.operaciones === 0 ? "es-cero" : ""}`}
                            style={d(560 + i * 45)}
                          >
                            <i style={{ height: `${Math.max(alto, 0.8)}%` }} />
                            <em style={{ bottom: `${alto}%` }}>{m.operaciones}</em>
                            <span className="hm-tip" style={{ bottom: `calc(${alto}% + 34px)` }}>
                              {format(m.inicio, "MMMM yyyy", { locale: fechaLocale })} · {opsTexto(m.operaciones)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="hm-meses" style={columnasMes} aria-hidden>
                      {porMes.items.map((m) => (
                        <span key={m.inicio.toISOString()} className={porMes.pico === m ? "es-pico" : ""}>
                          {format(m.inicio, porMes.items.length > 12 ? "MMM yy" : "MMM", { locale: fechaLocale }).replace(".", "")}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {esInterno ? (
                <>
                  <div className="grid min-h-0 grid-cols-1 gap-3 lg:grid-rows-2 lg:gap-3.5">
                    {panelLista(tr.volumeCompanies, tr.histCompaniesSub, resumen.empresas, 380, false)}
                    {panelLista(tr.volumeDestinations, tr.histDestinationsSub, resumen.destinos, 440, true)}
                  </div>
                  <div className="grid min-h-0 grid-cols-1 gap-3 lg:grid-rows-2 lg:gap-3.5">
                    {panelEspecies(500)}
                    {panelLista(
                      tr.volumeByUnitType,
                      resumen.conUnidad === 0 ? tr.volumeNoCoverage : cobertura(resumen.conUnidad),
                      resumen.unidades,
                      560,
                      false,
                    )}
                  </div>
                </>
              ) : (
                <div className="grid min-h-0 grid-cols-1 gap-3 lg:grid-rows-2 lg:gap-3.5">
                  {panelLista(tr.volumeDestinations, tr.histDestinationsSub, resumen.destinos, 380, true)}
                  {panelEspecies(440)}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
