import { Header } from "./Header";
import { NavBanner } from "./NavBanner";
import { ConfigGuard } from "./ConfigGuard";
import { ModuleWithVisitorInfo } from "./ModuleWithVisitorInfo";
import { LocaleProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { AuthFormModalProvider } from "@/lib/auth/AuthFormModalContext";
import { AuthFormModalOverlay } from "@/components/auth/AuthFormModalOverlay";
import { Toaster } from "sileo";
import { lazy, Suspense, type ReactNode } from "react";

/** Cada ruta en su propio chunk: evita cargar MapLibre/xlsx/ag-grid en /inicio (crítico en Android + Vite dev). */
const LazyDashboardContent = lazy(() =>
  import("@/components/dashboard").then((m) => ({ default: m.DashboardContent })),
);
const LazyInicioContent = lazy(() =>
  import("@/components/inicio").then((m) => ({ default: m.InicioContent })),
);
const LazyServiciosContent = lazy(() =>
  import("@/components/servicios").then((m) => ({ default: m.ServiciosContent })),
);
const LazySobreNosotrosContent = lazy(() =>
  import("@/components/sobre-nosotros").then((m) => ({ default: m.SobreNosotrosContent })),
);
const LazyTrackingContent = lazy(() =>
  import("@/components/tracking/TrackingContent").then((m) => ({ default: m.TrackingContent })),
);
const LazyItinerarioContent = lazy(() =>
  import("@/components/itinerario/ItinerarioContent").then((m) => ({ default: m.ItinerarioContent })),
);
const LazyServiciosUnicosContent = lazy(() =>
  import("@/components/itinerario/ServiciosUnicosContent").then((m) => ({ default: m.ServiciosUnicosContent })),
);
const LazyStackingContent = lazy(() =>
  import("@/components/stacking/StackingContent").then((m) => ({ default: m.StackingContent })),
);
const LazyConsorciosContent = lazy(() =>
  import("@/components/itinerario/ConsorciosContent").then((m) => ({ default: m.ConsorciosContent })),
);
const LazyRegistrosContent = lazy(() =>
  import("@/components/registros").then((m) => ({ default: m.RegistrosContent })),
);
const LazyReportesContent = lazy(() =>
  import("@/components/reportes").then((m) => ({ default: m.ReportesContent })),
);
const LazyFinanzasContent = lazy(() =>
  import("@/components/finanzas").then((m) => ({ default: m.FinanzasContent })),
);
const LazyClientesContent = lazy(() =>
  import("@/components/clientes").then((m) => ({ default: m.ClientesContent })),
);
const LazyAsignarClientesEmpresasContent = lazy(() =>
  import("@/components/configuracion/AsignarClientesEmpresasContent").then((m) => ({
    default: m.AsignarClientesEmpresasContent,
  })),
);
const LazyTransportesConfigContent = lazy(() =>
  import("@/components/configuracion/TransportesConfigContent").then((m) => ({
    default: m.TransportesConfigContent,
  })),
);
const LazyConsignatariosContent = lazy(() =>
  import("@/components/configuracion/ConsignatariosContent").then((m) => ({
    default: m.ConsignatariosContent,
  })),
);
const LazyUsuariosContent = lazy(() =>
  import("@/components/usuarios/UsuariosContent").then((m) => ({ default: m.UsuariosContent })),
);
const LazyCrearReservaContent = lazy(() =>
  import("@/components/reservas").then((m) => ({ default: m.CrearReservaContent })),
);
const LazyMisReservasContent = lazy(() =>
  import("@/components/reservas").then((m) => ({ default: m.MisReservasContent })),
);
const LazyPapeleraContent = lazy(() =>
  import("@/components/reservas").then((m) => ({ default: m.PapeleraContent })),
);
const LazyReservaAsliContent = lazy(() =>
  import("@/components/transportes").then((m) => ({ default: m.ReservaAsliContent })),
);
const LazyReservaExtContent = lazy(() =>
  import("@/components/transportes").then((m) => ({ default: m.ReservaExtContent })),
);
const LazyFacturacionContent = lazy(() =>
  import("@/components/transportes").then((m) => ({ default: m.FacturacionContent })),
);
const LazyPapeleraTransportesContent = lazy(() =>
  import("@/components/transportes").then((m) => ({ default: m.PapeleraTransportesContent })),
);
const LazyFacturasTransporteContent = lazy(() =>
  import("@/components/transportes/FacturasTransporteContent").then((m) => ({ default: m.FacturasTransporteContent })),
);
const LazyFormatosDocumentosContent = lazy(() =>
  import("@/components/configuracion/FormatosDocumentosContent").then((m) => ({ default: m.FormatosDocumentosContent })),
);
const LazyMisDocumentosContent = lazy(() =>
  import("@/components/documentos").then((m) => ({ default: m.MisDocumentosContent })),
);
const LazyCrearInstructivoContent = lazy(() =>
  import("@/components/documentos").then((m) => ({ default: m.CrearInstructivoContent })),
);
const LazyCrearProformaContent = lazy(() =>
  import("@/components/documentos").then((m) => ({ default: m.CrearProformaContent })),
);
const LazyCorreoInformativoContent = lazy(() =>
  import("@/components/comunicaciones/CorreoInformativoContent").then((m) => ({
    default: m.CorreoInformativoContent,
  })),
);

function RouteFallback() {
  return (
    <main
      className="flex-1 min-h-0 min-w-0 overflow-auto bg-neutral-100 flex items-center justify-center"
      role="main"
      style={{ minHeight: "120px" }}
    >
      <p
        className="text-neutral-500 text-sm"
        style={{ margin: 0, fontFamily: "system-ui, sans-serif", color: "#737373" }}
      >
        Cargando módulo…
      </p>
    </main>
  );
}

function Sus({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>;
}

type AppShellProps = {
  children: React.ReactNode;
  pathname: string;
};

export function AppShell({ children, pathname }: AppShellProps) {
  const isAuthRoute = pathname.startsWith("/auth");

  if (isAuthRoute) {
    return (
      <LocaleProvider>
        <AuthProvider>
          <AuthFormModalProvider>
            <div className="h-dvh flex flex-col overflow-hidden">
              <Header />
              <NavBanner pathname={pathname} />
              <main className="flex-1 min-h-0 overflow-auto bg-brand-blue p-4 flex flex-col items-center justify-center">
                {children}
              </main>
            </div>
          </AuthFormModalProvider>
        </AuthProvider>
      </LocaleProvider>
    );
  }

  const mainContent =
    pathname === "/dashboard" ? (
      <Sus>
        <LazyDashboardContent />
      </Sus>
    ) : pathname === "/inicio" ? (
      <Sus>
        <LazyInicioContent />
      </Sus>
    ) : pathname === "/servicios" ? (
      <Sus>
        <LazyServiciosContent />
      </Sus>
    ) : pathname === "/sobre-nosotros" ? (
      <Sus>
        <LazySobreNosotrosContent />
      </Sus>
    ) : pathname === "/tracking" ? (
      <Sus>
        <LazyTrackingContent />
      </Sus>
    ) : pathname === "/itinerario" ? (
      <Sus>
        <LazyItinerarioContent />
      </Sus>
    ) : pathname === "/stacking" ? (
      <Sus>
        <LazyStackingContent />
      </Sus>
    ) : pathname === "/itinerario/servicios" ? (
      <ConfigGuard forbiddenMessage="No tienes acceso a la gestión de servicios y consorcios. Solo el superadmin puede acceder.">
        <Sus>
          <LazyServiciosUnicosContent />
        </Sus>
      </ConfigGuard>
    ) : pathname === "/itinerario/consorcios" ? (
      <ConfigGuard forbiddenMessage="No tienes acceso a la gestión de servicios y consorcios. Solo el superadmin puede acceder.">
        <Sus>
          <LazyConsorciosContent />
        </Sus>
      </ConfigGuard>
    ) : pathname === "/registros" ? (
      <ModuleWithVisitorInfo moduleKey="registros">
        <Sus>
          <LazyRegistrosContent />
        </Sus>
      </ModuleWithVisitorInfo>
    ) : pathname === "/reportes" ? (
      <ModuleWithVisitorInfo moduleKey="reportes">
        <Sus>
          <LazyReportesContent />
        </Sus>
      </ModuleWithVisitorInfo>
    ) : pathname === "/finanzas" ? (
      <ModuleWithVisitorInfo moduleKey="finanzas">
        <Sus>
          <LazyFinanzasContent />
        </Sus>
      </ModuleWithVisitorInfo>
    ) : pathname === "/configuracion/clientes" ? (
      <ConfigGuard>
        <Sus>
          <LazyClientesContent />
        </Sus>
      </ConfigGuard>
    ) : pathname === "/configuracion/asignar-clientes-empresas" ? (
      <ConfigGuard>
        <Sus>
          <LazyAsignarClientesEmpresasContent />
        </Sus>
      </ConfigGuard>
    ) : pathname === "/configuracion/transportes" ? (
      <ConfigGuard>
        <Sus>
          <LazyTransportesConfigContent />
        </Sus>
      </ConfigGuard>
    ) : pathname === "/configuracion/usuarios" ? (
      <ConfigGuard>
        <Sus>
          <LazyUsuariosContent />
        </Sus>
      </ConfigGuard>
    ) : pathname === "/configuracion/consignatarios" ? (
      <ConfigGuard>
        <Sus>
          <LazyConsignatariosContent />
        </Sus>
      </ConfigGuard>
    ) : pathname === "/configuracion/formatos-documentos" ? (
      <ConfigGuard>
        <Sus>
          <LazyFormatosDocumentosContent />
        </Sus>
      </ConfigGuard>
    ) : pathname === "/reservas/crear" ? (
      <ModuleWithVisitorInfo moduleKey="crearReserva">
        <Sus>
          <LazyCrearReservaContent />
        </Sus>
      </ModuleWithVisitorInfo>
    ) : pathname === "/reservas/mis-reservas" ? (
      <ModuleWithVisitorInfo moduleKey="misReservas">
        <Sus>
          <LazyMisReservasContent />
        </Sus>
      </ModuleWithVisitorInfo>
    ) : pathname === "/reservas/papelera" ? (
      <ModuleWithVisitorInfo moduleKey="papelera">
        <Sus>
          <LazyPapeleraContent />
        </Sus>
      </ModuleWithVisitorInfo>
    ) : pathname === "/transportes/reserva-asli" ? (
      <ModuleWithVisitorInfo moduleKey="reservaAsli">
        <Sus>
          <LazyReservaAsliContent />
        </Sus>
      </ModuleWithVisitorInfo>
    ) : pathname === "/transportes/reserva-ext" ? (
      <ModuleWithVisitorInfo moduleKey="reservaExt">
        <Sus>
          <LazyReservaExtContent />
        </Sus>
      </ModuleWithVisitorInfo>
    ) : pathname === "/transportes/facturacion" ? (
      <ModuleWithVisitorInfo moduleKey="facturacion">
        <Sus>
          <LazyFacturacionContent />
        </Sus>
      </ModuleWithVisitorInfo>
    ) : pathname === "/transportes/papelera" ? (
      <Sus>
        <LazyPapeleraTransportesContent />
      </Sus>
    ) : pathname === "/transportes/facturas" ? (
      <Sus>
        <LazyFacturasTransporteContent />
      </Sus>
    ) : pathname === "/documentos/mis-documentos" ? (
      <ModuleWithVisitorInfo moduleKey="misDocumentos">
        <Sus>
          <LazyMisDocumentosContent />
        </Sus>
      </ModuleWithVisitorInfo>
    ) : pathname === "/documentos/crear-instructivo" ? (
      <ModuleWithVisitorInfo moduleKey="crearInstructivo">
        <Sus>
          <LazyCrearInstructivoContent />
        </Sus>
      </ModuleWithVisitorInfo>
    ) : pathname === "/documentos/crear-proforma" ? (
      <ModuleWithVisitorInfo moduleKey="crearProforma">
        <Sus>
          <LazyCrearProformaContent />
        </Sus>
      </ModuleWithVisitorInfo>
    ) : pathname === "/comunicaciones/correo-informativo" ? (
      <ModuleWithVisitorInfo moduleKey="correoInformativo">
        <Sus>
          <LazyCorreoInformativoContent />
        </Sus>
      </ModuleWithVisitorInfo>
    ) : (
      children
    );

  return (
    <LocaleProvider>
      <AuthProvider>
        <AuthFormModalProvider>
          <div className="h-dvh flex flex-col overflow-hidden">
            <Header />
            <NavBanner pathname={pathname} />
            <div className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden">{mainContent}</div>
          </div>
          <AuthFormModalOverlay />
          <Toaster position="bottom-right" />
        </AuthFormModalProvider>
      </AuthProvider>
    </LocaleProvider>
  );
}
