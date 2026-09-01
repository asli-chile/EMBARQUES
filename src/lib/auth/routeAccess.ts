import { canAccessCartolasNubox } from "@/lib/cartolas-nubox-access";
import type { PageSession } from "@/lib/auth/resolvePageSession";
import { isOperationalRole, isStaffRole } from "@/lib/auth/roles";

export type RouteRule =
  | { kind: "public" }
  | { kind: "staff" }
  | { kind: "operational" }
  | { kind: "admin" }
  | { kind: "superadmin" }
  | { kind: "cartolasNubox" };

export type RouteAccessFailure = "unauthenticated" | "forbidden";

const PUBLIC_ROUTES = new Set([
  "/",
  "/inicio",
  "/servicios",
  "/sobre-nosotros",
  "/tracking",
  "/auth/login",
  "/auth/registro",
  // Redirects legacy (solo redirigen a inicio)
  "/finanzas",
  "/reportes",
  "/tarifario",
  "/stacking",
  "/itinerario",
  "/itinerario/consorcios",
  "/itinerario/servicios",
  "/transportes/facturas",
  "/transportes/facturacion",
]);

/** Rutas exactas → regla de acceso (pathname sin base, normalizado). */
const ROUTE_RULES: Record<string, RouteRule> = {
  "/dashboard": { kind: "operational" },
  "/tareas": { kind: "staff" },
  "/registros": { kind: "staff" },
  "/reservas/crear": { kind: "operational" },
  "/reservas/mis-reservas": { kind: "operational" },
  "/reservas/papelera": { kind: "staff" },
  "/transportes/reserva-asli": { kind: "staff" },
  "/transportes/reserva-ext": { kind: "staff" },
  "/transportes/papelera": { kind: "staff" },
  "/documentos/mis-documentos": { kind: "operational" },
  "/documentos/crear-proforma": { kind: "staff" },
  "/documentos/crear-instructivo": { kind: "staff" },
  "/configuracion/clientes": { kind: "admin" },
  "/configuracion/asignar-clientes-empresas": { kind: "admin" },
  "/configuracion/asignar-ejecutivos": { kind: "admin" },
  "/configuracion/transportes": { kind: "admin" },
  "/configuracion/consignatarios": { kind: "admin" },
  "/configuracion/formatos-documentos": { kind: "admin" },
  "/configuracion/usuarios": { kind: "superadmin" },
  "/configuracion/temporadas": { kind: "superadmin" },
  "/cartolas-nubox": { kind: "cartolasNubox" },
  "/cliente": { kind: "operational" },
};

export function normalizeRoutePath(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  const trimmed = pathname.replace(/\/+$/, "") || "/";
  return trimmed;
}

export function matchRouteAccess(pathname: string): RouteRule {
  const route = normalizeRoutePath(pathname);

  if (PUBLIC_ROUTES.has(route)) {
    return { kind: "public" };
  }

  const exact = ROUTE_RULES[route];
  if (exact) {
    return exact;
  }

  return { kind: "public" };
}

export function checkRouteAccess(
  rule: RouteRule,
  session: PageSession
): { ok: true } | { ok: false; reason: RouteAccessFailure } {
  if (rule.kind === "public") {
    return { ok: true };
  }

  if (!session.user || !session.profile?.activo) {
    return { ok: false, reason: "unauthenticated" };
  }

  const { rol, email } = session.profile;

  switch (rule.kind) {
    case "staff":
      return isStaffRole(rol) ? { ok: true } : { ok: false, reason: "forbidden" };
    case "operational":
      return isOperationalRole(rol) ? { ok: true } : { ok: false, reason: "forbidden" };
    case "admin":
      return rol === "superadmin" || rol === "admin"
        ? { ok: true }
        : { ok: false, reason: "forbidden" };
    case "superadmin":
      return rol === "superadmin" ? { ok: true } : { ok: false, reason: "forbidden" };
    case "cartolasNubox":
      return canAccessCartolasNubox(email)
        ? { ok: true }
        : { ok: false, reason: "forbidden" };
    default:
      return { ok: false, reason: "forbidden" };
  }
}

const STATIC_EXT =
  /\.(ico|png|jpe?g|webp|svg|css|js|mjs|woff2?|ttf|map|webmanifest|mp4|geojson|txt|xlsx|xls|pdf)$/i;

/** Rutas que el middleware no debe interceptar. */
export function shouldSkipRouteMiddleware(pathname: string): boolean {
  if (pathname.includes("/api/")) return true;
  if (pathname.includes("/_astro/")) return true;
  if (STATIC_EXT.test(pathname)) return true;
  return false;
}
