/**
 * Servicio de itinerarios
 * Obtiene datos públicos y crea itinerarios (admin) desde la API.
 */
import { getApiOriginPrefix } from "@/lib/basePath";
import type { ItinerarioWithEscalas } from "@/types/itinerarios";

export type ItinerarioEscalaInput = {
  puerto: string;
  puerto_nombre?: string | null;
  eta?: string | null;
  dias_transito?: number | null;
  orden?: number;
  area?: string | null;
};

export type CreateItinerarioInput = {
  servicio: string;
  consorcio?: string | null;
  naviera?: string | null;
  nave: string;
  viaje: string;
  semana?: number | null;
  pol: string;
  etd: string;
  servicio_id?: string | null;
  escalas: ItinerarioEscalaInput[];
};

function getApiUrl(): string {
  return getApiOriginPrefix();
}

export async function fetchPublicItinerarios(): Promise<ItinerarioWithEscalas[]> {
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/api/public/itinerarios`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if ((errorData as { code?: string })?.code === "TABLE_NOT_FOUND") {
      throw new Error("La tabla de itinerarios no existe.");
    }
    throw new Error(
      (errorData as { error?: string })?.error || `Error ${response.status}: ${response.statusText}`
    );
  }

  const result = (await response.json()) as { itinerarios?: ItinerarioWithEscalas[]; success?: boolean };
  const list = result.itinerarios ?? [];
  return Array.isArray(list) ? list : [];
}

export async function createItinerario(
  input: CreateItinerarioInput
): Promise<{ success: true; itinerario: ItinerarioWithEscalas }> {
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/api/admin/itinerarios`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      servicio: input.servicio,
      consorcio: input.consorcio ?? null,
      naviera: input.naviera ?? null,
      nave: input.nave,
      viaje: input.viaje,
      semana: input.semana ?? null,
      pol: input.pol,
      etd: input.etd.includes("T") ? input.etd.slice(0, 10) : input.etd,
      servicio_id: input.servicio_id ?? null,
      escalas: input.escalas.map((e, i) => ({
        puerto: e.puerto,
        puerto_nombre: e.puerto_nombre ?? null,
        eta: e.eta ?? null,
        dias_transito: e.dias_transito ?? null,
        orden: e.orden ?? i + 1,
        area: e.area ?? "ASIA",
      })),
    }),
  });

  let data: { error?: string; itinerario?: ItinerarioWithEscalas; success?: boolean };
  try {
    data = (await response.json()) as { error?: string; itinerario?: ItinerarioWithEscalas; success?: boolean };
  } catch {
    data = {};
  }

  if (!response.ok) {
    const msg = data.error?.trim() || `Error ${response.status}: ${response.statusText}`;
    console.error("[createItinerario] API error:", response.status, data);
    throw new Error(msg);
  }

  if (!data.itinerario) {
    throw new Error("La API no devolvió el itinerario creado");
  }

  return { success: true, itinerario: data.itinerario };
}

export async function updateItinerario(
  id: string,
  input: CreateItinerarioInput
): Promise<{ success: true; itinerario: ItinerarioWithEscalas }> {
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/api/admin/itinerarios/${encodeURIComponent(id)}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      servicio: input.servicio,
      consorcio: input.consorcio ?? null,
      naviera: input.naviera ?? null,
      nave: input.nave,
      viaje: input.viaje,
      semana: input.semana ?? null,
      pol: input.pol,
      etd: input.etd.includes("T") ? input.etd.slice(0, 10) : input.etd,
      servicio_id: input.servicio_id ?? null,
      escalas: input.escalas.map((e, i) => ({
        puerto: e.puerto,
        puerto_nombre: e.puerto_nombre ?? null,
        eta: e.eta ?? null,
        dias_transito: e.dias_transito ?? null,
        orden: e.orden ?? i + 1,
        area: e.area ?? "ASIA",
      })),
    }),
  });

  let data: { error?: string; itinerario?: ItinerarioWithEscalas; success?: boolean };
  try {
    data = (await response.json()) as { error?: string; itinerario?: ItinerarioWithEscalas; success?: boolean };
  } catch {
    data = {};
  }

  if (!response.ok) {
    const msg = data.error?.trim() || `Error ${response.status}: ${response.statusText}`;
    console.error("[updateItinerario] API error:", response.status, data);
    throw new Error(msg);
  }

  if (!data.itinerario) {
    throw new Error("La API no devolvió el itinerario actualizado");
  }

  return { success: true, itinerario: data.itinerario };
}

export async function deleteItinerario(id: string): Promise<void> {
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/api/admin/itinerarios/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
  });

  let data: { error?: string; success?: boolean };
  try {
    data = (await response.json()) as { error?: string; success?: boolean };
  } catch {
    data = {};
  }

  if (!response.ok) {
    const msg = data.error?.trim() || `Error ${response.status}: ${response.statusText}`;
    console.error("[deleteItinerario] API error:", response.status, data);
    throw new Error(msg);
  }
}

export async function updateItinerarioOperador(id: string, operador: string | null): Promise<void> {
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/api/admin/itinerarios/${encodeURIComponent(id)}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operador: operador ?? null }),
  });

  let data: { error?: string };
  try {
    data = (await response.json()) as { error?: string };
  } catch {
    data = {};
  }

  if (!response.ok) {
    const msg = data.error?.trim() || `Error ${response.status}: ${response.statusText}`;
    console.error("[updateItinerarioOperador] API error:", response.status, data);
    throw new Error(msg);
  }
}

export async function updateItinerarioStackingImage(id: string, url: string | null): Promise<void> {
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/api/admin/itinerarios/${encodeURIComponent(id)}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stacking_imagen_url: url ?? null }),
  });

  let data: { error?: string };
  try {
    data = (await response.json()) as { error?: string };
  } catch {
    data = {};
  }

  if (!response.ok) {
    const msg = data.error?.trim() || `Error ${response.status}: ${response.statusText}`;
    console.error("[updateItinerarioStackingImage] API error:", response.status, data);
    throw new Error(msg);
  }
}
