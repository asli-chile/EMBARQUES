/**
 * "-" en una operación: el dato no se tiene o no aplica.
 *
 * Sirve para cerrar una ficha sin inventar un valor: en pallets, un 0 afirma
 * "cero pallets", un "-" dice "no tenemos el dato". En columnas de texto el
 * "-" se guarda tal cual. En las de número y fecha no se puede, así que la
 * columna queda NULL y su nombre va a `operaciones.sin_dato`
 * (20260929000003_operaciones_sin_dato.sql); la base quita la marca sola en
 * cuanto la columna recibe un valor real.
 *
 * Lo usan la ficha y la tabla de Mis Reservas y Registros: una sola regla de
 * qué cuenta como "-" y de cómo se guarda.
 */

export const MARCA_SIN_DATO = "-";

/**
 * Columnas editables de `operaciones` que son de número o de fecha: en ellas
 * "-" no se puede guardar y va a `sin_dato`. Sale de information_schema al
 * 29-09-2026; las de sistema (id, created_at, arribo_at…) quedan fuera porque
 * no se editan a mano. Una columna nueva de número o fecha que se edite en
 * pantalla tiene que sumarse aquí.
 */
export const COLUMNAS_NO_TEXTO: ReadonlySet<string> = new Set([
  // date
  "etd", "eta",
  // integer
  "almacenamiento", "pallets", "tratamiento_frio_co2", "tratamiento_frio_o2", "tt", "ventilacion",
  // numeric
  "fob_invoice", "margen_estimado", "margen_real", "monto_facturado", "peso_bruto", "peso_neto", "tara",
  "tipo_cambio", "total_cajas_25kg", "total_cajas_5kg", "valor_falso_flete", "valor_porteo", "valor_tramo",
  // timestamptz
  "agendamiento_retiro", "citacion", "corte_documental", "devolucion_unidad", "fecha_cierre",
  "fecha_confirmacion_booking", "fecha_entrega_bl", "fecha_entrega_factura", "fecha_envio_documentacion",
  "fecha_pago_cliente", "fecha_pago_transporte", "fin_stacking", "inf_late", "ingreso_stacking",
  "inicio_stacking", "late_fin", "late_inicio", "llegada_planta", "salida_planta", "xlate_fin", "xlate_inicio",
]);

const MARCAS = new Set(["-", "—", "–"]);

/** ¿Lo escrito es la marca de "sin dato"? Acepta los guiones largos. */
export function esMarcaSinDato(v: unknown): boolean {
  return typeof v === "string" && MARCAS.has(v.trim());
}

/** Columnas marcadas "-" en una fila. */
export function sinDatoDe(fila: Record<string, unknown> | null | undefined): string[] {
  const v = fila?.sin_dato;
  return Array.isArray(v) ? v.map(String) : [];
}

/** ¿Esta columna está marcada "-" en la fila? (Solo aplica si está vacía.) */
export function marcadoSinDato(fila: Record<string, unknown> | null | undefined, key: string): boolean {
  if (!fila) return false;
  const v = fila[key];
  const vacia = v == null || (typeof v === "string" && v.trim() === "");
  return vacia && sinDatoDe(fila).includes(key);
}

/**
 * Convierte un lote de cambios para guardarlo.
 *
 * - Columna de texto con "-": se guarda "-" tal cual.
 * - Columna de número o fecha con "-": queda NULL y se marca en `sin_dato`.
 * - Cualquier otro valor: se desmarca (la base lo haría igual; se manda para
 *   que la pantalla quede al día sin recargar).
 *
 * Devuelve los cambios listos y, si la lista de marcas cambió, la nueva.
 */
export function aplicarSinDato(
  cambios: Record<string, unknown>,
  marcasActuales: readonly string[],
  guardaTexto: (key: string) => boolean,
): { cambios: Record<string, unknown>; sinDato: string[] | null } {
  const salida: Record<string, unknown> = { ...cambios };
  const marcas = new Set(marcasActuales);
  for (const [key, valor] of Object.entries(cambios)) {
    if (key === "sin_dato") continue;
    if (esMarcaSinDato(valor)) {
      if (guardaTexto(key)) {
        salida[key] = MARCA_SIN_DATO;
        marcas.delete(key);
      } else {
        salida[key] = null;
        marcas.add(key);
      }
    } else {
      marcas.delete(key);
    }
  }
  const nueva = [...marcas].sort();
  const antes = [...marcasActuales].sort();
  const cambio = nueva.length !== antes.length || nueva.some((k, i) => k !== antes[i]);
  return { cambios: salida, sinDato: cambio ? nueva : null };
}
