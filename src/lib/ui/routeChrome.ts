/**
 * Clasifica cada ruta según el aspecto base de su página.
 *
 * Existe para que el estado de carga tenga el color de la página que está por
 * llegar. Lo consumen el loader pre-hidratación de `layouts/BaseLayout.astro`
 * y el fallback de Suspense de `components/layout/AppShell.tsx`.
 *
 * El chrome exterior es siempre AppIconRail; aquí solo se elige el fondo del
 * área de contenido.
 */

export type RouteChrome =
  /** Módulo ERP (neón): cabecera, barra de filtros y tabla. */
  | "module"
  /** Landing / marketing: superficie neon oscura. */
  | "marketing"
  /** Dashboard / tracking: fondo casi negro. */
  | "dashboard"

const MARKETING_ROUTES = new Set(["/inicio", "/servicios", "/sobre-nosotros"]);

export function getRouteChrome(pathname: string): RouteChrome {
  if (MARKETING_ROUTES.has(pathname)) return "marketing";
  if (pathname === "/dashboard" || pathname === "/dashboardcliente" || pathname === "/navitrack")
    return "dashboard";
  return "module";
}

/**
 * Fondo de cada aspecto. Debe coincidir con el fondo real de la página.
 * Módulos y dashboard usan el tema neón, que puede ser oscuro o claro:
 * `erp-carga` (dashboard-neon.css) toma el color del tema elegido, marcado en
 * `<html data-erp-neon>` antes del primer pintado. Un hex fijo acá pintaba
 * la carga del color equivocado para quien usa el tema claro.
 */
export const routeChromeBg: Record<RouteChrome, string> = {
  module: "erp-carga",
  marketing: "bg-[#050914]",
  dashboard: "erp-carga",
};

/**
 * Solo los módulos tienen una estructura fija (hero + toolbar + card) que valga
 * la pena anticipar con huesos. En el resto basta el fondo correcto.
 */
export function hasSkeletonBones(chrome: RouteChrome): boolean {
  return chrome === "module";
}
