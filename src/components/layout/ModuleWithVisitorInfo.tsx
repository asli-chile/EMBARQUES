import { useAuth } from "@/lib/auth/AuthContext";
import { useLocale } from "@/lib/i18n";
import { ModuleInfoPlaceholder } from "./ModuleInfoPlaceholder";
import { RegistrosVisitorPreview } from "@/components/registros/RegistrosVisitorPreview";
import { CrearReservaVisitorPreview } from "@/components/reservas/CrearReservaVisitorPreview";
import { MisReservasVisitorPreview } from "@/components/reservas/MisReservasVisitorPreview";
import { PapeleraVisitorPreview } from "@/components/reservas/PapeleraVisitorPreview";
import { ReservaAsliVisitorPreview } from "@/components/transportes/ReservaAsliVisitorPreview";
import { ReservaExtVisitorPreview } from "@/components/transportes/ReservaExtVisitorPreview";
import { FacturacionVisitorPreview } from "@/components/transportes/FacturacionVisitorPreview";
import { MisDocumentosVisitorPreview } from "@/components/documentos/MisDocumentosVisitorPreview";

export type VisitorModuleKey =
  | "registros"
  | "crearReserva"
  | "misReservas"
  | "papelera"
  | "reservaAsli"
  | "reservaExt"
  | "facturacion"
  | "misDocumentos"
  | "crearInstructivo"
  | "crearProforma"
  | "reportes"
  | "finanzas";

const MODULE_KEY_TO_HREF: Record<VisitorModuleKey, string> = {
  registros: "/registros",
  crearReserva: "/reservas/crear",
  misReservas: "/reservas/mis-reservas",
  papelera: "/reservas/papelera",
  reservaAsli: "/transportes/reserva-asli",
  reservaExt: "/transportes/reserva-ext",
  facturacion: "/transportes/facturacion",
  misDocumentos: "/documentos/mis-documentos",
  crearInstructivo: "/documentos/crear-instructivo",
  crearProforma: "/documentos/crear-proforma",
  reportes: "/reportes",
  finanzas: "/finanzas",
};

type ModuleWithVisitorInfoProps = {
  moduleKey: VisitorModuleKey;
  children: React.ReactNode;
};

/**
 * Muestra contenido del módulo a usuarios autenticados.
 * A usuarios externos (sin sesión) muestra descripción informativa del módulo.
 */
export function ModuleWithVisitorInfo({ moduleKey, children }: ModuleWithVisitorInfoProps) {
  const { isExternalUser, isLoading } = useAuth();
  const { t } = useLocale();

  if (isLoading) {
    return (
      <main className="flex-1 min-h-0 overflow-auto bg-neutral-50 p-6 flex items-center justify-center" role="main">
        <p className="text-neutral-500">Cargando…</p>
      </main>
    );
  }

  if (isExternalUser) {
    if (moduleKey === "registros") return <RegistrosVisitorPreview />;
    if (moduleKey === "crearReserva") return <CrearReservaVisitorPreview />;
    if (moduleKey === "misReservas") return <MisReservasVisitorPreview />;
    if (moduleKey === "papelera") return <PapeleraVisitorPreview />;
    if (moduleKey === "reservaAsli") return <ReservaAsliVisitorPreview />;
    if (moduleKey === "reservaExt") return <ReservaExtVisitorPreview />;
    if (moduleKey === "facturacion") return <FacturacionVisitorPreview />;
    if (moduleKey === "misDocumentos") return <MisDocumentosVisitorPreview />;
    const info = t.visitor[moduleKey];
    return <ModuleInfoPlaceholder info={info} currentHref={MODULE_KEY_TO_HREF[moduleKey]} />;
  }

  return <>{children}</>;
}
