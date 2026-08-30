import { RoleForbidden } from "./RoleForbidden";
import { useAuth } from "@/lib/auth/AuthContext";
import { useLocale } from "@/lib/i18n";
import { ModuleInfoPlaceholder } from "./ModuleInfoPlaceholder";
import { ModuleSoftFallback } from "@/components/ui/ModuleSoftFallback";
import { RegistrosVisitorPreview } from "@/components/registros/RegistrosVisitorPreview";
import { CrearReservaVisitorPreview } from "@/components/reservas/CrearReservaVisitorPreview";
import { MisReservasVisitorPreview } from "@/components/reservas/MisReservasVisitorPreview";
import { PapeleraVisitorPreview } from "@/components/reservas/PapeleraVisitorPreview";
import { ReservaAsliVisitorPreview } from "@/components/transportes/ReservaAsliVisitorPreview";
import { ReservaExtVisitorPreview } from "@/components/transportes/ReservaExtVisitorPreview";
import { PapeleraTransportesVisitorPreview } from "@/components/transportes/PapeleraTransportesVisitorPreview";
import { FacturacionVisitorPreview } from "@/components/transportes/FacturacionVisitorPreview";
import { MisDocumentosVisitorPreview } from "@/components/documentos/MisDocumentosVisitorPreview";
import { CrearInstructivoVisitorPreview } from "@/components/documentos/CrearInstructivoVisitorPreview";
import { CrearProformaVisitorPreview } from "@/components/documentos/CrearProformaVisitorPreview";
import { ReportesVisitorPreview } from "@/components/reportes/ReportesVisitorPreview";
import { FinanzasVisitorPreview } from "@/components/finanzas/FinanzasVisitorPreview";
import { withBase } from "@/lib/basePath";

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

const MODULE_KEY_TO_HREF: Record<VisitorModuleKey, string> = {
  registros: withBase("/registros"),
  crearReserva: withBase("/reservas/crear"),
  misReservas: withBase("/reservas/mis-reservas"),
  papelera: withBase("/reservas/papelera"),
  papeleraTransportes: withBase("/transportes/papelera"),
  reservaAsli: withBase("/transportes/reserva-asli"),
  reservaExt: withBase("/transportes/reserva-ext"),
  facturacion: withBase("/transportes/facturacion"),
  misDocumentos: withBase("/documentos/mis-documentos"),
  crearInstructivo: withBase("/documentos/crear-instructivo"),
  crearProforma: withBase("/documentos/crear-proforma"),
  reportes: withBase("/reportes"),
  finanzas: withBase("/finanzas"),
};

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

type ModuleWithVisitorInfoProps = {
  moduleKey: VisitorModuleKey;
  children: React.ReactNode;
};

/**
 * Muestra contenido del módulo a usuarios autenticados según rol.
 * A usuarios externos (sin sesión) muestra descripción informativa del módulo.
 */
export function ModuleWithVisitorInfo({ moduleKey, children }: ModuleWithVisitorInfoProps) {
  const { isExternalUser, isStaff, isCliente, isLoading } = useAuth();
  const { t } = useLocale();

  if (isLoading) {
    return <ModuleSoftFallback />;
  }

  if (isExternalUser) {
    if (moduleKey === "registros") return <RegistrosVisitorPreview />;
    if (moduleKey === "crearReserva") return <CrearReservaVisitorPreview />;
    if (moduleKey === "misReservas") return <MisReservasVisitorPreview />;
    if (moduleKey === "papelera") return <PapeleraVisitorPreview />;
    if (moduleKey === "papeleraTransportes") return <PapeleraTransportesVisitorPreview />;
    if (moduleKey === "reservaAsli") return <ReservaAsliVisitorPreview />;
    if (moduleKey === "reservaExt") return <ReservaExtVisitorPreview />;
    if (moduleKey === "facturacion") return <FacturacionVisitorPreview />;
    if (moduleKey === "misDocumentos") return <MisDocumentosVisitorPreview />;
    if (moduleKey === "crearInstructivo") return <CrearInstructivoVisitorPreview />;
    if (moduleKey === "crearProforma") return <CrearProformaVisitorPreview />;
    if (moduleKey === "reportes") return <ReportesVisitorPreview />;
    if (moduleKey === "finanzas") return <FinanzasVisitorPreview />;
    const info = t.visitor[moduleKey];
    return <ModuleInfoPlaceholder info={info} currentHref={MODULE_KEY_TO_HREF[moduleKey]} />;
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
