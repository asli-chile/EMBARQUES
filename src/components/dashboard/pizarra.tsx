/**
 * Piezas compartidas de las pizarras del dashboard (En curso e Histórico).
 * Estilos en src/styles/historico-marca.css (clases `hm-*`).
 *
 * Todo entra una sola vez por carga de datos: `useEntrada` marca el momento y
 * las piezas animan con transform / stroke-dasharray. Con "reducir movimiento"
 * las cifras aparecen directas y lo demás solo se desvanece.
 */
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Icon } from "@iconify/react";
import { isoDePuerto } from "@/components/navitrack/navitrack-banderas";

export function prefiereMenosMovimiento(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/** Retraso de entrada para una pieza (lo leen las transiciones de `.hm-*`). */
export const retrasoEntrada = (ms: number) => ({ "--hm-d": `${ms}ms` }) as CSSProperties;

/**
 * Se pone en `true` dos cuadros después de cada cambio de `clave`, para que el
 * navegador pinte primero el estado inicial y la entrada tenga desde dónde
 * animar. Si la clave cambia (otra temporada, datos nuevos) vuelve a entrar.
 */
export function useEntrada(clave: string): boolean {
  const [listo, setListo] = useState(false);
  useEffect(() => {
    setListo(false);
    let a = 0;
    let b = 0;
    a = requestAnimationFrame(() => {
      b = requestAnimationFrame(() => setListo(true));
    });
    return () => {
      cancelAnimationFrame(a);
      cancelAnimationFrame(b);
    };
  }, [clave]);
  return listo;
}

/** Cifra que cuenta desde 0 una sola vez (1,1 s, frenando al final). */
export function Cifra({
  valor,
  activo,
  retraso = 0,
  formato,
}: {
  valor: number;
  activo: boolean;
  retraso?: number;
  formato: (n: number) => string;
}) {
  const [mostrado, setMostrado] = useState(0);
  useEffect(() => {
    if (!activo) {
      setMostrado(0);
      return;
    }
    if (prefiereMenosMovimiento()) {
      setMostrado(valor);
      return;
    }
    let raf = 0;
    let t0: number | null = null;
    const paso = (ahora: number) => {
      t0 ??= ahora; // el reloj arranca en el primer cuadro, no antes
      const k = Math.min(1, Math.max(0, (ahora - t0) / 1100));
      setMostrado(valor * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(paso);
    };
    const timer = window.setTimeout(() => {
      raf = requestAnimationFrame(paso);
    }, retraso);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [valor, activo, retraso]);
  return <>{formato(mostrado)}</>;
}

/* Tonos de marca para anillos, en este orden. */
export const TONOS_MARCA = [
  "var(--hm-teal-dato)",
  "var(--hm-oliva-dato)",
  "var(--hm-texto)",
  "color-mix(in srgb, var(--hm-teal) 85%, #ffffff)",
  "color-mix(in srgb, var(--hm-hondo) 55%, #ffffff)",
  "#c9b9a6",
];

export type FilaPizarra = { label: string; valor: number; color?: string };

/** Panel con cabecera: título a la izquierda, dato o acción a la derecha. */
export function PanelPizarra({
  titulo,
  extra,
  retraso,
  className = "",
  children,
}: {
  titulo: ReactNode;
  extra?: ReactNode;
  retraso: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`hm-panel hm-bloque hm-aparece ${className}`} style={retrasoEntrada(retraso)}>
      <div className="hm-bloque-cab">
        <h2>{titulo}</h2>
        {extra != null && (typeof extra === "string" ? <span>{extra}</span> : extra)}
      </div>
      {children}
    </div>
  );
}

/** Lista con riel: cada fila es un nombre, su cifra, su porcentaje y una barra. */
export function ListaRieles({
  filas,
  listo,
  retraso,
  formato,
  vacio,
  banderas = false,
  base,
}: {
  filas: FilaPizarra[];
  listo: boolean;
  retraso: number;
  formato: (n: number) => string;
  vacio: string;
  /** Muestra la bandera del puerto delante del nombre. */
  banderas?: boolean;
  /** Total contra el que se calcula el porcentaje. Por defecto, la suma de las filas. */
  base?: number;
}) {
  if (filas.length === 0) return <p className="hm-vacio">{vacio}</p>;
  const max = Math.max(1, ...filas.map((f) => f.valor));
  const suma = base ?? (filas.reduce((s, f) => s + f.valor, 0) || 1);
  return (
    <div className="hm-lista">
      {filas.map((f, i) => {
        const iso = banderas ? isoDePuerto(f.label) : null;
        const r = retraso + 120 + i * 45;
        return (
          <div key={f.label} className="hm-item">
            <div className="hm-item-nombre">
              {banderas &&
                (iso ? (
                  <Icon icon={`circle-flags:${iso.toLowerCase()}`} width={18} height={18} className="shrink-0" aria-hidden />
                ) : (
                  <Icon icon="lucide:globe" width={16} height={16} className="shrink-0 opacity-60" aria-hidden />
                ))}
              <span title={f.label}>{f.label}</span>
            </div>
            <div className="hm-item-num">
              <Cifra valor={f.valor} activo={listo} retraso={r} formato={formato} />
              <small>{Math.round((f.valor / suma) * 100)}%</small>
            </div>
            <div className="hm-riel">
              <i style={{ width: `${(f.valor / max) * 100}%`, ...retrasoEntrada(r), ...(f.color ? { background: f.color } : {}) }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Anillo segmentado con leyenda. Cada arco crece desde su inicio. */
export function AnilloPizarra({
  filas,
  listo,
  retraso,
  formato,
  centro,
  centroTexto,
  vacio,
  etiqueta,
}: {
  filas: FilaPizarra[];
  listo: boolean;
  retraso: number;
  formato: (n: number) => string;
  /** Cifra del centro (cuenta al entrar). */
  centro: number;
  centroTexto: string;
  vacio: string;
  etiqueta: string;
}) {
  const conValor = filas.filter((f) => f.valor > 0);
  if (conValor.length === 0) return <p className="hm-vacio">{vacio}</p>;
  const suma = conValor.reduce((s, f) => s + f.valor, 0);
  const r = 50;
  const largo = 2 * Math.PI * r;
  const respiro = conValor.length > 1 ? 1.6 : 0;
  let acumulado = 0;
  return (
    <div className="hm-especies">
      <div className="hm-anillo">
        <svg viewBox="0 0 120 120" role="img" aria-label={`${etiqueta}: ${conValor.map((f) => `${f.label} ${f.valor}`).join(", ")}`}>
          <circle className="hm-pista-anillo" cx="60" cy="60" r={r} />
          {conValor.map((f, i) => {
            const arco = (f.valor / suma) * largo;
            const visible = Math.max(arco - respiro, 0.01);
            const offset = -(acumulado + respiro / 2);
            acumulado += arco;
            return (
              <circle
                key={f.label}
                className="hm-seg"
                cx="60"
                cy="60"
                r={r}
                style={{
                  stroke: f.color ?? TONOS_MARCA[i % TONOS_MARCA.length],
                  strokeDashoffset: offset,
                  strokeDasharray: listo ? `${visible} ${largo}` : `0 ${largo}`,
                  transitionDelay: `${retraso + 150 + i * 80}ms`,
                }}
              />
            );
          })}
        </svg>
        <div className="hm-anillo-centro">
          <b>
            <Cifra valor={centro} activo={listo} retraso={retraso + 150} formato={formato} />
          </b>
          <span>{centroTexto}</span>
        </div>
      </div>
      <div className="hm-leyenda">
        {filas.map((f, i) => (
          <div key={f.label}>
            <i style={{ background: f.color ?? TONOS_MARCA[i % TONOS_MARCA.length] }} />
            <span title={f.label}>{f.label}</span>
            <b>
              <Cifra valor={f.valor} activo={listo} retraso={retraso + 150 + i * 60} formato={formato} />
            </b>
          </div>
        ))}
      </div>
    </div>
  );
}
