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
  /** Módulo ERP: fondo azul claro, hero navy y barra de herramientas. */
  | "module"
  /** Landing / marketing: superficie neon oscura. */
  | "marketing"
  /** Dashboard / tracking: fondo casi negro. */
  | "dashboard"

const MARKETING_ROUTES = new Set(["/inicio", "/servicios", "/sobre-nosotros"]);

export function getRouteChrome(pathname: string): RouteChrome {
  if (MARKETING_ROUTES.has(pathname)) return "marketing";
  if (pathname === "/dashboard" || pathname === "/tracking" || pathname === "/navitrack")
    return "dashboard";
  return "module";
}

/**
 * Fondo de cada aspecto. Debe coincidir con el fondo real de la página:
 * `modulePageBg`, `--inicio-cream` (src/styles/inicio.css) y la raíz de
 * DashboardContent.
 */
export const routeChromeBg: Record<RouteChrome, string> = {
  module: "bg-[#D9E3F2]",
  marketing: "bg-[#050914]",
  dashboard: "bg-[#050914]",
};

/**
 * Solo los módulos tienen una estructura fija (hero + toolbar + card) que valga
 * la pena anticipar con huesos. En el resto basta el fondo correcto.
 */
export function hasSkeletonBones(chrome: RouteChrome): boolean {
  return chrome === "module";
}
