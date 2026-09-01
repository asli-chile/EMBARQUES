import { getApiOriginPrefix } from "@/lib/basePath";

export type NaveCatalogRow = {
  id: string;
  nombre: string;
  modo_transporte?: string | null;
};

type FindOrCreateNaveParams = {
  nombre: string;
  navieraId?: string;
  modoTransporte?: "maritimo" | "aereo";
};

type FindOrCreateNaveResult =
  | { nave: NaveCatalogRow; created: boolean; linked: boolean }
  | { error: string };

/** Reutiliza una nave existente por nombre y la vincula a la naviera vía API server-side. */
export async function findOrCreateNave(
  params: FindOrCreateNaveParams,
): Promise<FindOrCreateNaveResult> {
  const res = await fetch(`${getApiOriginPrefix()}/api/catalogos/naves`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nombre: params.nombre,
      naviera_id: params.navieraId,
      modo_transporte: params.modoTransporte,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    nave?: NaveCatalogRow;
    created?: boolean;
    linked?: boolean;
  };

  if (!res.ok || !data.nave) {
    return { error: data.error ?? "No se pudo agregar la nave" };
  }

  return {
    nave: data.nave,
    created: Boolean(data.created),
    linked: Boolean(data.linked),
  };
}
