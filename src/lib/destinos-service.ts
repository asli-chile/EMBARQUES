import { getApiOriginPrefix } from "@/lib/basePath";

export type DestinoCatalog = {
  id: string;
  nombre: string;
  codigo_puerto?: string | null;
  pais?: string | null;
};

export type SaveDestinoInput = {
  nombre: string;
  codigo_puerto?: string;
  pais?: string;
};

export async function saveDestinoToCatalog(input: SaveDestinoInput): Promise<DestinoCatalog> {
  const nombre = input.nombre.trim();
  if (!nombre) throw new Error("Nombre del destino requerido");

  const res = await fetch(`${getApiOriginPrefix()}/api/admin/destinos`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nombre,
      codigo_puerto: input.codigo_puerto?.trim() || undefined,
      pais: input.pais?.trim() || undefined,
    }),
  });

  const data = (await res.json()) as { error?: string; destino?: DestinoCatalog };
  if (!res.ok) throw new Error(data.error ?? "Error al guardar destino");
  if (!data.destino) throw new Error("Respuesta inválida al guardar destino");
  return data.destino;
}
