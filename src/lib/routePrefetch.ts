/**
 * Prefetch de chunks lazy usados en AppShell.
 * Llamar en hover/focus de nav o en idle para que el cambio de ruta sea inmediato.
 */

type PrefetchFn = () => Promise<unknown>;

const prefetchers: Record<string, PrefetchFn> = {
  "/dashboard": () => import("@/components/dashboard"),
  "/inicio": () => import("@/components/inicio"),
  "/servicios": () => import("@/components/servicios"),
  "/sobre-nosotros": () => import("@/components/sobre-nosotros"),
  "/registros": () => import("@/components/registros"),
  "/configuracion/clientes": () => import("@/components/clientes"),
  "/configuracion/asignar-clientes-empresas": () =>
    import("@/components/configuracion/AsignarClientesEmpresasContent"),
  "/configuracion/asignar-ejecutivos": () =>
    import("@/components/configuracion/AsignarEjecutivosContent"),
  "/configuracion/transportes": () => import("@/components/configuracion/TransportesConfigContent"),
  "/configuracion/consignatarios": () => import("@/components/configuracion/ConsignatariosContent"),
  "/configuracion/usuarios": () => import("@/components/usuarios/UsuariosContent"),
  "/configuracion/formatos-documentos": () =>
    import("@/components/configuracion/FormatosDocumentosContent"),
  "/reservas/crear": () => import("@/components/reservas"),
  "/reservas/mis-reservas": () => import("@/components/reservas"),
  "/reservas/papelera": () => import("@/components/reservas"),
  "/transportes/reserva-asli": () => import("@/components/transportes"),
  "/transportes/reserva-ext": () => import("@/components/transportes"),
  "/transportes/papelera": () => import("@/components/transportes"),
  "/documentos/mis-documentos": () => import("@/components/documentos"),
  "/documentos/crear-proforma": () => import("@/components/documentos/CrearProformaContent"),
  "/documentos/crear-instructivo": () => import("@/components/documentos/CrearInstructivoContent"),
  "/cartolas-nubox": () => import("@/components/cartolas-nubox/CartolasNuboxContent"),
};

const started = new Set<string>();

export function prefetchRoute(pathname: string): void {
  const key = pathname.split("?")[0].replace(/\/$/, "") || "/";
  if (started.has(key)) return;
  const run = prefetchers[key];
  if (!run) return;
  started.add(key);
  void run().catch(() => {
    started.delete(key);
  });
}

/** Prefetch en idle de rutas frecuentes tras hidratar. */
export function prefetchFrequentRoutes(): void {
  if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
    return;
  }
  const connection = (
    navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }
  ).connection;
  if (connection?.saveData || connection?.effectiveType === "2g" || connection?.effectiveType === "slow-2g") {
    return;
  }
  const common = ["/inicio", "/dashboard", "/registros", "/reservas/mis-reservas"];
  const schedule =
    typeof requestIdleCallback === "function"
      ? (cb: () => void) => requestIdleCallback(() => cb(), { timeout: 2500 })
      : (cb: () => void) => setTimeout(cb, 400);

  schedule(() => {
    for (const path of common) prefetchRoute(path);
  });
}
