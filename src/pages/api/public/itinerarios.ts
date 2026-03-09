import type { APIRoute } from "astro";
import { createAnonClient } from "@/lib/supabase/admin";

export const prerender = false;

type DbItinerario = {
  id: string;
  servicio: string;
  consorcio: string | null;
  naviera: string | null;
  operador: string | null;
  nave: string;
  viaje: string;
  semana: number | null;
  pol: string;
  etd: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
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
  created_at: string;
  updated_at: string;
};

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const GET: APIRoute = async () => {
  try {
    const supabase = createAnonClient();

    const { data: itinerariosData, error: errItinerarios } = await supabase
      .from("itinerarios")
      .select("id, servicio, consorcio, naviera, operador, nave, viaje, semana, pol, etd, created_at, updated_at, created_by, updated_by")
      .order("etd", { ascending: true })
      .order("servicio", { ascending: true });

    if (errItinerarios) {
      if (errItinerarios.code === "42P01") {
        return jsonResponse({ code: "TABLE_NOT_FOUND", error: "La tabla itinerarios no existe." }, 404);
      }
      return jsonResponse({ error: errItinerarios.message }, 500);
    }

    const itinerarios = (itinerariosData ?? []) as DbItinerario[];

    if (itinerarios.length === 0) {
      return jsonResponse({ success: true, itinerarios: [] });
    }

    const ids = itinerarios.map((i) => i.id);
    const { data: escalasData, error: errEscalas } = await supabase
      .from("itinerario_escalas")
      .select("id, itinerario_id, puerto, puerto_nombre, eta, dias_transito, orden, area, created_at, updated_at")
      .in("itinerario_id", ids)
      .order("orden", { ascending: true });

    if (errEscalas) {
      return jsonResponse({ itinerarios: itinerarios.map((i) => ({ ...i, escalas: [] })) });
    }

    const escalas = (escalasData ?? []) as DbEscala[];
    const escalasPorItinerario = new Map<string, DbEscala[]>();
    for (const e of escalas) {
      const list = escalasPorItinerario.get(e.itinerario_id) ?? [];
      list.push(e);
      escalasPorItinerario.set(e.itinerario_id, list);
    }

    const itinerariosWithEscalas = itinerarios.map((i) => ({
      ...i,
      escalas: escalasPorItinerario.get(i.id) ?? [],
    }));

    return jsonResponse({ success: true, itinerarios: itinerariosWithEscalas });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error interno";
    return jsonResponse({ error: msg }, 500);
  }
};
