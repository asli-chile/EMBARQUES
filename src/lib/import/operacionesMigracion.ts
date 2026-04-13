import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Columnas permitidas en el JSON de migración (nombres como en public.operaciones).
 * No se aceptan: id, correlativo, ref_asli (los asigna la BD / triggers).
 */
export const OPERACION_MIGRACION_COLUMNAS = [
  "ingreso",
  "semana",
  "ejecutivo",
  "estado_operacion",
  "tipo_operacion",
  "cliente",
  "consignatario",
  "incoterm",
  "forma_pago",
  "especie",
  "pais",
  "temperatura",
  "ventilacion",
  "tratamiento_frio",
  "tratamiento_frio_o2",
  "tratamiento_frio_co2",
  "tipo_atmosfera",
  "pallets",
  "peso_bruto",
  "peso_neto",
  "tipo_unidad",
  "naviera",
  "nave",
  "viaje",
  "pol",
  "etd",
  "pod",
  "eta",
  "tt",
  "booking",
  "aga",
  "dus",
  "sps",
  "numero_guia_despacho",
  "planta_presentacion",
  "citacion",
  "llegada_planta",
  "salida_planta",
  "inicio_stacking",
  "fin_stacking",
  "ingreso_stacking",
  "corte_documental",
  "inf_late",
  "late_inicio",
  "late_fin",
  "xlate_inicio",
  "xlate_fin",
  "deposito",
  "agendamiento_retiro",
  "devolucion_unidad",
  "transporte",
  "chofer",
  "rut_chofer",
  "telefono_chofer",
  "patente_camion",
  "patente_remolque",
  "contenedor",
  "sello",
  "tara",
  "almacenamiento",
  "tramo",
  "valor_tramo",
  "porteo",
  "valor_porteo",
  "falso_flete",
  "valor_falso_flete",
  "factura_transporte",
  "monto_facturado",
  "numero_factura_asli",
  "concepto_facturado",
  "moneda",
  "tipo_cambio",
  "margen_estimado",
  "margen_real",
  "fecha_confirmacion_booking",
  "fecha_envio_documentacion",
  "fecha_entrega_bl",
  "fecha_entrega_factura",
  "fecha_pago_cliente",
  "fecha_pago_transporte",
  "fecha_cierre",
  "prioridad",
  "operacion_critica",
  "origen_registro",
  "enviado_transporte",
  "observaciones",
  "dueno_reserva",
  "booking_doc_url",
  "tipo_reserva_transporte",
] as const;

export type OperacionMigracionColumna = (typeof OPERACION_MIGRACION_COLUMNAS)[number];

const SET_COLUMNAS = new Set<string>(OPERACION_MIGRACION_COLUMNAS);

const CAMPOS_SOLO_FECHA = new Set<string>(["etd", "eta"]);

const CAMPOS_FECHA_HORA = new Set<string>([
  "ingreso",
  "citacion",
  "llegada_planta",
  "salida_planta",
  "inicio_stacking",
  "fin_stacking",
  "ingreso_stacking",
  "corte_documental",
  "inf_late",
  "late_inicio",
  "late_fin",
  "xlate_inicio",
  "xlate_fin",
  "agendamiento_retiro",
  "devolucion_unidad",
  "fecha_confirmacion_booking",
  "fecha_envio_documentacion",
  "fecha_entrega_bl",
  "fecha_entrega_factura",
  "fecha_pago_cliente",
  "fecha_pago_transporte",
  "fecha_cierre",
]);

const CAMPOS_ENTERO = new Set<string>([
  "semana",
  "ventilacion",
  "pallets",
  "tratamiento_frio_o2",
  "tratamiento_frio_co2",
  "tt",
]);

const CAMPOS_NUMERICOS = new Set<string>([
  "peso_bruto",
  "peso_neto",
  "tara",
  "almacenamiento",
  "valor_tramo",
  "valor_porteo",
  "valor_falso_flete",
  "monto_facturado",
  "tipo_cambio",
  "margen_estimado",
  "margen_real",
]);

const CAMPOS_BOOLEANOS = new Set<string>(["porteo", "falso_flete", "operacion_critica", "enviado_transporte"]);

function str(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function parseSoloFecha(val: string): string | null {
  if (!val) return null;
  const m1 = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m1) return `${m1[3]}-${m1[2].padStart(2, "0")}-${m1[1].padStart(2, "0")}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(val)) return val.substring(0, 10);
  return null;
}

function parseFechaHora(val: string): string | null {
  if (!val) return null;
  const m = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}T${m[4].padStart(2, "0")}:${m[5]}:00`;
  const d = parseSoloFecha(val);
  return d ? `${d}T00:00:00` : null;
}

function parseNumero(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "number" && Number.isFinite(val)) return val;
  const s = str(val).replace(/\s/g, "").replace(",", ".");
  if (!s) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function parseEntero(val: unknown): number | null {
  const n = parseNumero(val);
  if (n === null) return null;
  return Math.trunc(n);
}

function parseBoolean(val: unknown): boolean | null {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "boolean") return val;
  const s = str(val).toLowerCase();
  if (s === "true" || s === "1" || s === "sí" || s === "si" || s === "yes") return true;
  if (s === "false" || s === "0" || s === "no") return false;
  return null;
}

export type FilaMigracionNormalizada = Record<string, string | number | boolean | null>;

export type TipoColumnaMigracion = "texto" | "fecha" | "fecha_hora" | "entero" | "decimal" | "booleano";

export function tipoMigracionColumna(clave: string): TipoColumnaMigracion {
  if (CAMPOS_BOOLEANOS.has(clave)) return "booleano";
  if (CAMPOS_ENTERO.has(clave)) return "entero";
  if (CAMPOS_NUMERICOS.has(clave)) return "decimal";
  if (CAMPOS_SOLO_FECHA.has(clave)) return "fecha";
  if (CAMPOS_FECHA_HORA.has(clave)) return "fecha_hora";
  return "texto";
}

/**
 * Convierte una fila arbitraria (p. ej. desde Google Sheets vía JSON) al shape de insert en operaciones.
 * Ignora claves desconocidas y nunca envía id / correlativo / ref_asli.
 */
export function normalizarFilaMigracion(raw: Record<string, unknown>): FilaMigracionNormalizada {
  const out: FilaMigracionNormalizada = {};

  for (const key of OPERACION_MIGRACION_COLUMNAS) {
    if (!(key in raw)) continue;
    const v = raw[key];
    if (v === undefined) continue;

    if (CAMPOS_BOOLEANOS.has(key)) {
      const b = parseBoolean(v);
      if (b !== null) out[key] = b;
      continue;
    }

    if (CAMPOS_ENTERO.has(key)) {
      const n = parseEntero(v);
      if (n !== null) out[key] = n;
      continue;
    }

    if (CAMPOS_NUMERICOS.has(key)) {
      const n = parseNumero(v);
      if (n !== null) out[key] = n;
      continue;
    }

    if (CAMPOS_SOLO_FECHA.has(key)) {
      const s = str(v);
      const d = parseSoloFecha(s);
      if (d) out[key] = d;
      continue;
    }

    if (CAMPOS_FECHA_HORA.has(key)) {
      const s = str(v);
      const dt = parseFechaHora(s) ?? (parseSoloFecha(s) ? `${parseSoloFecha(s)}T00:00:00` : null);
      if (dt) out[key] = dt;
      continue;
    }

    const t = str(v);
    if (t) out[key] = t;
  }

  return out;
}

export function filtrarClavesMigracion(row: Record<string, unknown>): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (SET_COLUMNAS.has(k)) o[k] = v;
  }
  return o;
}

/**
 * Objeto exacto que se enviaría a Supabase en un INSERT (incluye defaults de cliente, estado, etc.).
 */
export function construirPayloadInsert(raw: Record<string, unknown>): Record<string, string | number | boolean | null> {
  const base = normalizarFilaMigracion(filtrarClavesMigracion(raw));
  return {
    ...base,
    ejecutivo: typeof base.ejecutivo === "string" ? base.ejecutivo : "",
    estado_operacion: typeof base.estado_operacion === "string" ? base.estado_operacion : "PENDIENTE",
    tipo_operacion: typeof base.tipo_operacion === "string" ? base.tipo_operacion : "EXPORTACIÓN",
    cliente: typeof base.cliente === "string" ? base.cliente : "NUEVO",
    origen_registro: typeof base.origen_registro === "string" ? base.origen_registro : "migracion_json",
  };
}

export type FilaPreviewMigracion = {
  index: number;
  payload: Record<string, string | number | boolean | null>;
  clavesOrdenadas: string[];
};

export function previewFilasMigracion(filasRaw: Record<string, unknown>[]): FilaPreviewMigracion[] {
  return filasRaw.map((raw, index) => {
    const payload = construirPayloadInsert(raw);
    return {
      index,
      payload,
      clavesOrdenadas: Object.keys(payload).sort(),
    };
  });
}

const FORMATO_FECHA =
  "Acepta YYYY-MM-DD o DD/MM/AAAA. Campos fecha_hora también: ISO o DD/MM/AAAA HH:mm (ej. 15/05/2026 14:30).";

export function obtenerDocumentacionMigracionJson(params: {
  urlPost: string;
  maxFilas: number;
}): Record<string, unknown> {
  const columnas = OPERACION_MIGRACION_COLUMNAS.map((clave) => {
    const tipo = tipoMigracionColumna(clave);
    const base: Record<string, string> = { clave, tipo };
    if (tipo === "fecha" || tipo === "fecha_hora") base.formatoFechas = FORMATO_FECHA;
    if (tipo === "booleano") base.ejemplosValores = "true, false, 1, 0, sí, no";
    if (tipo === "decimal" || tipo === "entero") base.ejemploNumeros = "1234 o 1.234,56 (coma decimal se normaliza a punto)";
    return base;
  });

  const ejemploFila = {
    cliente: "EXPORTADORA DEMO SPA",
    ejecutivo: "Nombre del ejecutivo",
    booking: "MSC1234567890",
    naviera: "MSC",
    nave: "MSC EXAMPLE",
    pol: "San Antonio",
    pod: "Rotterdam",
    etd: "2026-05-20",
    eta: "2026-06-05",
    especie: "Uvas",
    estado_operacion: "PENDIENTE",
    tipo_operacion: "EXPORTACIÓN",
    origen_registro: "migracion_google_sheets",
  };

  return {
    titulo: "Migración de operaciones (JSON → Supabase)",
    version: 1,
    urlPost: params.urlPost,
    metodo: "POST",
    metodoDocumentacion: "GET",
    notaGet:
      "Este mismo endpoint responde GET con esta guía en JSON (misma autenticación que POST: Bearer o sesión superadmin).",

    autenticacion: {
      opcionScriptOAutomatizacion: {
        header: "Authorization: Bearer <MIGRATION_IMPORT_SECRET>",
        env: "MIGRATION_IMPORT_SECRET en servidor (mín. 16 caracteres).",
      },
      opcionNavegador: "Iniciar sesión como superadmin; POST con cookies (p. ej. desde la consola del sitio).",
    },

    cuerpoPost: {
      descripcion: 'JSON con clave "rows": array de objetos (una operación por objeto).',
      dryRun: {
        descripcion:
          'Si envías "dryRun": true en el mismo JSON, no se inserta nada y devuelve "filasNormalizadas" lista para revisar.',
        ejemplo: { dryRun: true, rows: [ejemploFila] },
      },
      ejemploReal: { rows: [ejemploFila] },
    },

    limites: {
      maxFilasPorRequest: params.maxFilas,
    },

    noEnviarEstasColumnas: {
      motivo: "Las asigna la base de datos o triggers.",
      columnas: ["id", "correlativo", "ref_asli"],
    },

    googleSheets: {
      nombrePestañaEjemplo: "Hoja 1",
      regla:
        "La fila 1 debe ser cabeceras con los mismos nombres que 'clave' en columnas (snake_case). Cada fila siguiente es una operación.",
      cabecerasFila1OrdenSugerido: [
        "cliente",
        "ejecutivo",
        "booking",
        "naviera",
        "nave",
        "viaje",
        "pol",
        "pod",
        "etd",
        "eta",
        "especie",
        "estado_operacion",
        "tipo_operacion",
        "origen_registro",
      ],
      restoDeColumnas: "Ver array 'columnas' en esta respuesta; todas son opcionales salvo las que quieras rellenar.",
    },

    columnas,
    listaClavesOrdenada: [...OPERACION_MIGRACION_COLUMNAS],
  };
}

export type ResultadoFilaMigracion =
  | { ok: true; index: number; id: string; ref_asli: string | null }
  | { ok: false; index: number; error: string };

/**
 * Inserta filas una a una para informar errores por índice (migración típica < miles de filas).
 */
export async function insertarOperacionesMigracion(
  admin: SupabaseClient,
  filasRaw: Record<string, unknown>[],
): Promise<{ resultados: ResultadoFilaMigracion[]; insertadas: number; fallidas: number }> {
  const resultados: ResultadoFilaMigracion[] = [];
  let insertadas = 0;
  let fallidas = 0;

  for (let i = 0; i < filasRaw.length; i++) {
    const payload = construirPayloadInsert(filasRaw[i] ?? {});

    const { data, error } = await admin.from("operaciones").insert(payload).select("id, ref_asli").single();

    if (error) {
      fallidas += 1;
      resultados.push({ ok: false, index: i, error: error.message });
    } else {
      insertadas += 1;
      resultados.push({
        ok: true,
        index: i,
        id: data.id as string,
        ref_asli: (data.ref_asli as string) ?? null,
      });
    }
  }

  return { resultados, insertadas, fallidas };
}
