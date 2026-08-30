/**
 * Estado de carga de una ruta (fallback de Suspense y de los guards de rol).
 *
 * Pinta el fondo de la página que está por llegar, no siempre el de un módulo:
 * mostrar el esqueleto azul antes de una landing crema se ve como un pestañeo.
 * La clasificación vive en `src/lib/ui/routeChrome.ts`.
 *
 * En los módulos, además, reserva la misma estructura que tendrá el contenido
 * real (hero, toolbar, card) para que al llegar no salte el layout.
 *
 * Debe mantenerse visualmente idéntico al loader pre-hidratación de
 * `layouts/BaseLayout.astro`. Si cambias uno, cambia el otro.
 *
 * Sistema de motion: docs/MOTION-DESIGN.md
 */
import { Skeleton } from "./Skeleton";
import { hasSkeletonBones, routeChromeBg, type RouteChrome } from "@/lib/ui/routeChrome";

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
      <div className="flex-shrink-0 bg-gradient-to-br from-brand-blue via-[#0d1c42] to-brand-dark-teal px-4 sm:px-6 pt-5 pb-4">
        <div className="flex items-center gap-3.5">
          <Skeleton tone="onDark" className="h-12 w-12 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton tone="onDark" className="h-7 w-40 max-w-[55%] rounded-md" />
            <Skeleton tone="onDark" className="h-4 w-28 max-w-[40%] rounded-md" />
          </div>
        </div>
      </div>
      <div className="flex-shrink-0 border-b border-brand-blue/15 bg-[#E8F0FA]/95 px-3 sm:px-4 py-3">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-10 w-24 rounded-lg" />
          <Skeleton className="h-10 w-28 rounded-lg" />
          <Skeleton className="h-10 w-20 rounded-lg" />
        </div>
      </div>
      <div className="min-h-0 flex-1 p-3 sm:p-4">
        <Skeleton
          tone="surface"
          className="h-full min-h-[200px] rounded-xl border border-brand-blue/15 shadow-sm"
        />
      </div>
    </main>
  );
}
