/**
 * Cuánto se apartó el arribo real de lo prometido en la reserva.
 *
 * El cero es `eta_original`: la primera fecha de llegada que se supo del
 * embarque, congelada por el trigger de la migración 20260917000002. El desvío
 * se cuenta en días con signo —negativo si llegó antes, positivo si después— y
 * **no hay banda de tolerancia**: llegar dos días tarde es +2, no "a tiempo".
 *
 * Por qué contra `eta_original` y no contra `eta`: cuando la naviera reprograma,
 * alguien actualiza `eta` y la promesa anterior desaparece. Medir contra ese
 * valor da siempre una desviación cercana a cero — mide si avisaron, no si
 * cumplieron. Las dos se muestran juntas para que se vea la diferencia.
 *
 * Módulo puro: sin React ni Supabase, porque lo usan Reportes, la ficha de
 * NaviTrack y el dashboard histórico, y las tres tienen que dar el mismo número.
 */

export type OperacionDesvio = {
  /** Promesa de la reserva. Es el cero. */
  eta_original: string | null;
  /** ETA vigente, que puede haber sido reprogramado. */
  eta: string | null;
  arribo_confirmado?: boolean | null;
  arribo_at?: string | null;
  /** La promesa se rellenó con el eta vigente: no es la original de verdad. */
  eta_original_heredada?: boolean | null;
};

export type Desvio = {
  /** Días respecto de la promesa. Negativo: adelanto. Positivo: atraso. */
  dias: number;
  /** Días que la promesa se movió por el camino (`eta` − `eta_original`). */
  diasReprogramado: number | null;
  /** Desvío contra el ETA vigente, para poder contrastar los dos. */
  diasVsVigente: number | null;
  /**
   * El dato es de fiar hasta cierto punto.
   *
   * `heredada` es una promesa reconstruida el 17-09-2026 a partir del eta
   * vigente: puede venir ya revisada, así que su desvío subestima el atraso.
   * Callarlo convertiría un vacío de captura en un buen resultado.
   */
  heredada: boolean;
};

const DIA_MS = 86_400_000;

/** Día calendario de una fecha ISO, sin que la zona horaria la corra. */
function dia(iso: string | null | undefined): number | null {
  const texto = String(iso ?? "").trim();
  if (!texto) return null;
  /* Una fecha sin hora se sitúa a mediodía: leída como medianoche UTC, en Chile
     cae el día anterior. Mismo criterio que el resto del ERP. */
  const d = new Date(texto.includes("T") ? texto : `${texto}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
}

function diferencia(desde: string | null | undefined, hasta: string | null | undefined): number | null {
  const a = dia(desde);
  const b = dia(hasta);
  if (a == null || b == null) return null;
  return Math.round((b - a) / DIA_MS);
}

/**
 * El desvío de un embarque, o null si todavía no se puede calcular.
 *
 * Hace falta que haya arribado **con fecha**: un arribo marcado sin día —los
 * que vienen del estado ARRIBADO legado— no dice cuánto se atrasó, y poner cero
 * los contaría como cumplidos.
 */
export function desvioEta(op: OperacionDesvio): Desvio | null {
  if (!op.arribo_confirmado || !op.arribo_at) return null;
  const dias = diferencia(op.eta_original, op.arribo_at);
  if (dias == null) return null;

  return {
    dias,
    diasReprogramado: diferencia(op.eta_original, op.eta),
    diasVsVigente: diferencia(op.eta, op.arribo_at),
    heredada: Boolean(op.eta_original_heredada),
  };
}

/** Cómo se lee un desvío: adelanto, en fecha o atraso. */
export type SentidoDesvio = "adelanto" | "en_fecha" | "atraso";

export function sentidoDesvio(dias: number): SentidoDesvio {
  if (dias < 0) return "adelanto";
  if (dias > 0) return "atraso";
  return "en_fecha";
}

/**
 * Token de estado del desvío.
 *
 * Llegar antes no es un problema pero tampoco es cumplir: mueve stacking,
 * bodega y retiro igual que un atraso. Por eso adelanto y atraso no comparten
 * color, y el verde se reserva para el día exacto.
 */
export function estadoDesvio(dias: number): "ok" | "curso" | "atencion" {
  if (dias === 0) return "ok";
  return dias < 0 ? "curso" : "atencion";
}

/** "+3 d", "−2 d", "en fecha". */
export function formatoDesvio(dias: number): string {
  if (dias === 0) return "en fecha";
  // El menos tipográfico, no el guion: se alinea con las cifras tabulares.
  return `${dias > 0 ? "+" : "−"}${Math.abs(dias)} d`;
}

export type ResumenDesvio = {
  /** Embarques con desvío calculable. */
  total: number;
  /** De esos, cuántos apoyan su cero en una promesa reconstruida. */
  heredados: number;
  enFecha: number;
  adelantados: number;
  atrasados: number;
  /** Promedio de días, con signo. Null sin datos. */
  promedio: number | null;
  /** Mediana: un solo embarque con un mes de atraso no debe mover el resumen. */
  mediana: number | null;
  /** El peor atraso y el mayor adelanto, para ver el rango real. */
  peorAtraso: number | null;
  mayorAdelanto: number | null;
};

export function resumirDesvios(desvios: Desvio[]): ResumenDesvio {
  const vacio: ResumenDesvio = {
    total: 0,
    heredados: 0,
    enFecha: 0,
    adelantados: 0,
    atrasados: 0,
    promedio: null,
    mediana: null,
    peorAtraso: null,
    mayorAdelanto: null,
  };
  if (desvios.length === 0) return vacio;

  const dias = desvios.map((d) => d.dias).sort((a, b) => a - b);
  const mitad = Math.floor(dias.length / 2);

  return {
    total: desvios.length,
    heredados: desvios.filter((d) => d.heredada).length,
    enFecha: dias.filter((d) => d === 0).length,
    adelantados: dias.filter((d) => d < 0).length,
    atrasados: dias.filter((d) => d > 0).length,
    promedio: Math.round((dias.reduce((a, b) => a + b, 0) / dias.length) * 10) / 10,
    mediana: dias.length % 2 === 1 ? dias[mitad] : Math.round(((dias[mitad - 1] + dias[mitad]) / 2) * 10) / 10,
    peorAtraso: dias[dias.length - 1] > 0 ? dias[dias.length - 1] : null,
    mayorAdelanto: dias[0] < 0 ? dias[0] : null,
  };
}
