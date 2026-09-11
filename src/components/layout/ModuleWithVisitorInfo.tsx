import { RoleForbidden } from "./RoleForbidden";
import { useAuth } from "@/lib/auth/AuthContext";
import { useLocale } from "@/lib/i18n";
import { ModuleSoftFallback } from "@/components/ui/ModuleSoftFallback";
import { VisitorModuleGate } from "./VisitorModuleGate";

export type VisitorModuleKey =
  | "registros"
  | "crearReserva"
  | "misReservas"
  | "papelera"
  | "papeleraTransportes"
  | "reservaAsli"
  | "reservaExt"
  | "facturacion"
  | "misDocumentos"
  | "crearInstructivo"
  | "crearProforma"
  | "reportes"
  | "finanzas";

const STAFF_ONLY_MODULES = new Set<VisitorModuleKey>([
  "registros",
  "papelera",
  "papeleraTransportes",
  "reservaAsli",
  "reservaExt",
  "facturacion",
  "crearInstructivo",
  "crearProforma",
  "reportes",
  "finanzas",
]);

const OPERATIONAL_MODULES = new Set<VisitorModuleKey>([
  "crearReserva",
  "misReservas",
  "misDocumentos",
]);

type ModuleInfo = {
  title?: string;
  description?: string;
  highlight1?: string;
  highlight2?: string;
  highlight3?: string;
};

function readModuleInfo(visitor: unknown, moduleKey: VisitorModuleKey): ModuleInfo {
  if (!visitor || typeof visitor !== "object") return {};
  const entry = (visitor as Record<string, unknown>)[moduleKey];
  if (!entry || typeof entry !== "object") return {};
  const raw = entry as Record<string, unknown>;
  const asText = (v: unknown) => (typeof v === "string" ? v : undefined);
  return {
    title: asText(raw.title),
    description: asText(raw.description),
    highlight1: asText(raw.highlight1),
    highlight2: asText(raw.highlight2),
    highlight3: asText(raw.highlight3),
  };
}

type ModuleWithVisitorInfoProps = {
  moduleKey: VisitorModuleKey;
  children: React.ReactNode;
};

/**
 * Muestra el módulo a usuarios autenticados según rol.
 * Sin sesión: gate neon (sin layout/UI antiguos de preview).
 */
export function ModuleWithVisitorInfo({ moduleKey, children }: ModuleWithVisitorInfoProps) {
  const { isExternalUser, isStaff, isCliente, isLoading } = useAuth();
  const { t } = useLocale();

  if (isLoading) {
    return <ModuleSoftFallback />;
  }

  if (isExternalUser) {
    const info = readModuleInfo(t.visitor, moduleKey);
    return (
      <VisitorModuleGate
        title={info.title ?? t.visitor.moduleTitle}
        description={info.description ?? ""}
        highlights={[info.highlight1, info.highlight2, info.highlight3].filter(
          (v): v is string => typeof v === "string" && v.length > 0,
        )}
      />
    );
  }

  if (STAFF_ONLY_MODULES.has(moduleKey) && !isStaff) {
    return (
      <RoleForbidden message="Esta sección es solo para el equipo interno. Con el rol de cliente no puedes acceder." />
    );
  }

  if (OPERATIONAL_MODULES.has(moduleKey) && !isStaff && !isCliente) {
    return (
      <RoleForbidden message="Tu cuenta no tiene un rol asignado para usar esta sección. Pide a un administrador que te asigne cliente u operador." />
    );
  }

  return <>{children}</>;
}
