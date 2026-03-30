/**
 * Rutas bajo prefijo de despliegue (p. ej. /embarques en producción vía asli.cl/embarques).
 * Evita que enlaces a "/inicio" salgan del subpath y terminen en asli.cl/inicio.
 */
export function withBase(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  if (!base) return p;
  if (p === base || p.startsWith(`${base}/`)) return p;
  return `${base}${p}`;
}

export function stripBasePathname(pathname: string): string {
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  if (!base) return pathname;
  if (pathname === base || pathname === `${base}/`) return "/";
  if (pathname.startsWith(`${base}/`)) return pathname.slice(base.length) || "/";
  return pathname;
}

/** Prefijo para fetch a APIs propias (respeta PUBLIC_API_URL si existe). */
export function getApiOriginPrefix(): string {
  if (typeof import.meta !== "undefined" && import.meta.env?.PUBLIC_API_URL) {
    return String(import.meta.env.PUBLIC_API_URL).replace(/\/$/, "");
  }
  const basePath = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  if (typeof window !== "undefined") {
    return basePath;
  }
  const site =
    typeof import.meta !== "undefined" && import.meta.env?.SITE
      ? String(import.meta.env.SITE).replace(/\/$/, "")
      : "http://localhost:4321";
  return `${site}${basePath}`;
}
