/**
 * Servicio de itinerarios - adaptado para Astro
 * Original: ASLI/src/lib/itinerarios-service.ts
 */
import type { Itinerario, ItinerarioWithEscalas } from '../types/itinerarios';

function getApiUrl(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_API_URL) {
    return String(import.meta.env.PUBLIC_API_URL);
  }
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) {
    return String(process.env.NEXT_PUBLIC_API_URL);
  }
  return typeof window !== 'undefined' ? '' : 'http://localhost:4321';
}

export async function fetchPublicItinerarios(): Promise<ItinerarioWithEscalas[]> {
  const apiUrl = getApiUrl();
  const res = await fetch(`${apiUrl}/api/public/itinerarios`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (err?.code === 'TABLE_NOT_FOUND') throw new Error('La tabla de itinerarios no existe.');
    throw new Error(err?.error || `Error ${res.status}`);
  }
  const data = await res.json();
  return data.itinerarios || [];
}

export async function fetchItinerarios(): Promise<ItinerarioWithEscalas[]> {
  const apiUrl = getApiUrl();
  const res = await fetch(`${apiUrl}/api/admin/itinerarios`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (err?.code === 'TABLE_NOT_FOUND')
      throw new Error('La tabla de itinerarios no existe. Ejecuta el script SQL en Supabase.');
    throw new Error(err?.error || `Error ${res.status}`);
  }
  const data = await res.json();
  return data.itinerarios || [];
}

export async function createItinerario(
  data: Omit<Itinerario, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>
): Promise<Itinerario> {
  const apiUrl = getApiUrl();
  const res = await fetch(`${apiUrl}/api/admin/itinerarios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      servicio: data.servicio,
      consorcio: data.consorcio,
      nave: data.nave,
      viaje: data.viaje || '',
      semana: data.semana,
      pol: data.pol,
      etd: data.etd,
      escalas: [],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || `Error ${res.status}`);
  }
  const result = await res.json();
  return result.itinerario;
}
