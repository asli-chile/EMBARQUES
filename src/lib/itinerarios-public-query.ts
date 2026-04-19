/**
 * Carga itinerarios + escalas para la API pública (JSON o PDF).
 * Misma lógica que GET /api/public/itinerarios.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeArea } from "@/lib/areas";
import type { ItinerarioWithEscalas } from "@/types/itinerarios";

type DbItinerario = {
  id: string;
  servicio: string;
  consorcio: string | null;
  naviera: string | null;
  operador: string | null;
  stacking_imagen_url: string | null;
  nave: string;
  viaje: string;
  semana: number | null;
  pol: string;
  etd: string | null;
};

type DbEscala = {
  id: string;
  itinerario_id: string;
  puerto: string;
  puerto_nombre: string | null;
  eta: string | null;
  dias_transito: number | null;
  orden: number;
  area: string | null;
};

const ITINERARIOS_SELECT =
  "id, servicio, consorcio, naviera, operador, stacking_imagen_url, nave, viaje, semana, pol, etd";
const ITINERARIOS_SELECT_WITHOUT_STACKING_IMAGE =
  "id, servicio, consorcio, naviera, operador, nave, viaje, semana, pol, etd";

export type PublicItinerariosLoadResult =
  | { ok: true; itinerarios: ItinerarioWithEscalas[] }
  | { ok: false; status: number; code?: string; message: string };

function mapToItinerarioWithEscalas(
  itinerarios: DbItinerario[],
  escalasPorItinerario: Map<string, DbEscala[]>,
): ItinerarioWithEscalas[] {
  const emptyMeta = {
    created_at: "",
    updated_at: "",
    created_by: null as string | null,
    updated_by: null as string | null,
  };
  return itinerarios.map((i) => ({
    id: i.id,
    servicio: i.servicio,
    consorcio: i.consorcio,
    naviera: i.naviera,
    operador: i.operador,
    stacking_imagen_url: i.stacking_imagen_url,
    nave: i.nave,
    viaje: i.viaje,
    semana: i.semana,
    pol: i.pol,
    etd: i.etd,
    ...emptyMeta,
    escalas: (escalasPorItinerario.get(i.id) ?? []).map((e) => ({
      id: e.id,
      itinerario_id: e.itinerario_id,
      puerto: e.puerto,
      puerto_nombre: e.puerto_nombre,
      eta: e.eta,
      dias_transito: e.dias_transito,
      orden: e.orden,
      area: normalizeArea(e.area),
      created_at: "",
      updated_at: "",
    })),
  }));
}

export async function loadPublicItinerariosWithEscalas(
  supabase: SupabaseClient,
): Promise<PublicItinerariosLoadResult> {
  const PAGE_SIZE = 1000;
  const fetchItinerarios = async (selectClause: string) => {
    const out: unknown[] = [];
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from("itinerarios")
        .select(selectClause)
        .order("etd", { ascending: true })
        .order("servicio", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (error) return { data: null, error };
      const chunk = data ?? [];
      out.push(...chunk);
      if (chunk.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }
    return { data: out, error: null };
  };

  let { data: itinerariosData, error: errItinerarios } = await fetchItinerarios(ITINERARIOS_SELECT);

  if (
    errItinerarios &&
    (errItinerarios.code === "42703" ||
      /column.*does not exist|no existe/i.test(errItinerarios.message ?? ""))
  ) {
    const fallback = await fetchItinerarios(ITINERARIOS_SELECT_WITHOUT_STACKING_IMAGE);
    itinerariosData = fallback.data;
    errItinerarios = fallback.error;
  }

  if (errItinerarios) {
    if (errItinerarios.code === "42P01") {
      return { ok: false, status: 404, code: "TABLE_NOT_FOUND", message: "La tabla itinerarios no existe." };
    }
    return { ok: false, status: 500, message: errItinerarios.message ?? "Error al cargar itinerarios" };
  }

  const raw = (itinerariosData ?? []) as Record<string, unknown>[];
  const itinerarios: DbItinerario[] = raw.map((row) => ({
    ...row,
    stacking_imagen_url: "stacking_imagen_url" in row ? (row.stacking_imagen_url as string | null) : null,
  })) as DbItinerario[];

  if (itinerarios.length === 0) {
    return { ok: true, itinerarios: [] };
  }

  const ids = itinerarios.map((i) => i.id);
  const itinerarioIdsSet = new Set(ids);
  const escalasRows: unknown[] = [];
  let from = 0;
  let errEscalas: { message?: string; code?: string } | null = null;
  while (true) {
    const { data, error } = await supabase
      .from("itinerario_escalas")
      .select("id, itinerario_id, puerto, puerto_nombre, eta, dias_transito, orden, area")
      .order("itinerario_id", { ascending: true })
      .order("orden", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      errEscalas = error;
      break;
    }
    const chunk = data ?? [];
    escalasRows.push(...chunk);
    if (chunk.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  const escalasPorItinerario = new Map<string, DbEscala[]>();
  if (errEscalas) {
    for (const i of itinerarios) {
      escalasPorItinerario.set(i.id, []);
    }
  } else {
    const escalas = (escalasRows as DbEscala[]).filter((e) => itinerarioIdsSet.has(e.itinerario_id));
    for (const e of escalas) {
      const list = escalasPorItinerario.get(e.itinerario_id) ?? [];
      list.push(e);
      escalasPorItinerario.set(e.itinerario_id, list);
    }
  }

  const mapped = mapToItinerarioWithEscalas(itinerarios, escalasPorItinerario);
  return { ok: true, itinerarios: mapped };
}
