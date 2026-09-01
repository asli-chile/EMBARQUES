import { getApiOriginPrefix } from "@/lib/basePath";
import type { NavieraCatalogRow } from "@/lib/catalogos/navieraServer";

type FindOrCreateNavieraParams = {
  nombre: string;
  modoTransporte?: "maritimo" | "aereo";
};

type FindOrCreateNavieraResult =
  | { naviera: NavieraCatalogRow; created: boolean }
  | { error: string };

export async function findOrCreateNaviera(
  params: FindOrCreateNavieraParams,
): Promise<FindOrCreateNavieraResult> {
  const res = await fetch(`${getApiOriginPrefix()}/api/catalogos/navieras`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nombre: params.nombre,
      modo_transporte: params.modoTransporte,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    naviera?: NavieraCatalogRow;
    created?: boolean;
  };

  if (!res.ok || !data.naviera) {
    return { error: data.error ?? "No se pudo agregar la naviera" };
  }

  return { naviera: data.naviera, created: Boolean(data.created) };
}
