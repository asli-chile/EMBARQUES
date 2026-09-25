/**
 * Estado de carga de una ruta (fallback de Suspense y de los guards de rol).
 *
 * Pinta el fondo de la página que está por llegar. El chrome exterior (rail)
 * lo monta `AppChromeFrame`; este fallback solo llena el área de contenido.
 *
 * En los módulos, además, reserva la misma estructura que tendrá el contenido
 * real —cabecera con indicadores, barra de filtros y tabla— para que al llegar
 * no salte el layout.
 *
 * Es también el loader previo a la hidratación: `layouts/BaseLayout.astro` lo
 * renderiza en el servidor, sin JavaScript. Una sola pieza para los dos
 * momentos, así no pueden volver a divergir como cuando el HTML del servidor
 * seguía dibujando el diseño claro antiguo.
 *
 * Los colores salen de `.erp-carga` (dashboard-neon.css), que sigue al tema
 * neón marcado en `<html data-erp-neon>` antes del primer pintado.
 *
 * Sistema de motion: docs/MOTION-DESIGN.md
 */
import { Skeleton } from "./Skeleton";
import { hasSkeletonBones, routeChromeBg, type RouteChrome } from "@/lib/ui/routeChrome";

const FILAS = 9;

export function ModuleSoftFallback({ chrome = "module" }: { chrome?: RouteChrome }) {
  const base = "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden";
  const a11y = {
    role: "main" as const,
    "aria-busy": true,
    "aria-live": "polite" as const,
    "aria-label": "Cargando módulo",
  };

  if (!hasSkeletonBones(chrome)) {
    return <main className={`${base} ${routeChromeBg[chrome]}`} {...a11y} />;
  }

  return (
    <main className={`${base} ${routeChromeBg.module}`} {...a11y}>
      {/* Cabecera: título a la izquierda, indicadores a la derecha. */}
      <div className="erp-carga-cabecera flex-shrink-0 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3.5">
          <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-6 w-44 max-w-[55%] rounded-md" />
            <Skeleton className="h-3.5 w-28 max-w-[40%] rounded-md" />
          </div>
          <div className="hidden items-center gap-2 lg:flex">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-28 rounded-xl" />
            ))}
          </div>
        </div>
      </div>

      {/* Barra de búsqueda y filtros. */}
      <div className="flex-shrink-0 px-3 py-3 sm:px-4">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-64 max-w-full rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="ml-auto hidden h-9 w-32 rounded-lg sm:block" />
        </div>
      </div>

      {/* Tabla: fila de títulos y filas de datos. */}
      <div className="min-h-0 flex-1 px-3 pb-3 sm:px-4 sm:pb-4">
        <div className="erp-carga-card flex h-full min-h-[200px] flex-col overflow-hidden rounded-xl">
          <div className="erp-carga-titulos flex items-center gap-4 px-4 py-3">
            <Skeleton className="h-3 w-16 rounded" />
            <Skeleton className="h-3 w-24 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="hidden h-3 w-28 rounded md:block" />
            <Skeleton className="hidden h-3 w-32 rounded lg:block" />
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            {Array.from({ length: FILAS }, (_, i) => (
              <div key={i} className="erp-carga-fila flex items-center gap-4 px-4 py-3.5">
                <Skeleton className="h-6 w-16 shrink-0 rounded-md" />
                <Skeleton className="h-3.5 w-24 rounded" />
                <Skeleton className="h-3.5 w-28 rounded" />
                <Skeleton className="hidden h-3.5 w-32 rounded md:block" />
                <Skeleton className="hidden h-3.5 w-40 rounded lg:block" />
                <Skeleton className="ml-auto h-5 w-20 shrink-0 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
