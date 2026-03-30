/**
 * Codifica cada segmento de ruta (espacios, tildes, etc.) sin tocar las barras.
 * Así los assets en /public (p. ej. nombres con espacios) cargan bien
 * detrás de proxies (asli.cl → Vercel) y en CDNs que son estrictos con la URL.
 */
function encodePathSegments(path: string): string {
  return path
    .split("/")
    .map((segment) => {
      if (segment === "") return "";
      try {
        return encodeURIComponent(decodeURIComponent(segment));
      } catch {
        return encodeURIComponent(segment);
      }
    })
    .join("/");
}

/**
 * Rutas bajo prefijo de despliegue (p. ej. /embarques en producción vía asli.cl/embarques).
 * Evita que enlaces a "/inicio" salgan del subpath y terminen en asli.cl/inicio.
 */
export function withBase(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  let out: string;
  if (!base) out = p;
  else if (p === base || p.startsWith(`${base}/`)) out = p;
  else out = `${base}${p}`;
  return encodePathSegments(out);
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
