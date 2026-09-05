/**
 * Clasifica cada ruta según el aspecto base de su página.
 *
 * Existe para que el estado de carga tenga el color de la página que está por
 * llegar. Antes se mostraba el esqueleto azul de módulo en todas las rutas, así
 * que al entrar a `/inicio` (crema) o `/dashboard` (casi negro) se veía un
 * pestañeo azul que no tenía nada que ver con la página.
 *
 * Lo consumen el loader pre-hidratación de `layouts/BaseLayout.astro` y el
 * fallback de Suspense de `components/layout/AppShell.tsx`, para que ambos
 * pinten el mismo fondo.
 */

export type RouteChrome =
  /** Módulo ERP: fondo azul claro, hero navy y barra de herramientas. */
  | "module"
  /** Landing pública: superficie crema, sin estructura fija que anticipar. */
  | "marketing"
  /** Dashboard: fondo casi negro. */
  | "dashboard"

const MARKETING_ROUTES = new Set(["/inicio", "/servicios", "/sobre-nosotros"]);

export function getRouteChrome(pathname: string): RouteChrome {
  if (MARKETING_ROUTES.has(pathname)) return "marketing";
  if (pathname === "/dashboard") return "dashboard";
  return "module";
}

/**
 * Fondo de cada aspecto. Debe coincidir con el fondo real de la página:
 * `modulePageBg`, `--inicio-cream` (src/styles/inicio.css) y la raíz de
 * DashboardContent.
 *
 * En marketing se repite el crema como literal en vez de usar `.inicio-surface`
 * a propósito: esa clase además aplica `zoom: 1.2` y una familia tipográfica,
 * que acá escalarían el loader entero.
 */
export const routeChromeBg: Record<RouteChrome, string> = {
  module: "bg-[#D9E3F2]",
  marketing: "bg-[#f6eee8]",
  dashboard: "bg-dash-bg",
};

/**
 * Solo los módulos tienen una estructura fija (hero + toolbar + card) que valga
 * la pena anticipar con huesos. En el resto, dibujarlos sería inventar un
 * layout que no existe: basta el fondo correcto.
 */
export function hasSkeletonBones(chrome: RouteChrome): boolean {
  return chrome === "module";
}
