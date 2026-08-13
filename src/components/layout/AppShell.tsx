import { Header } from "./Header";
import { NavBanner } from "./NavBanner";
import { ConfigGuard } from "./ConfigGuard";
import { CartolasNuboxGuard } from "./CartolasNuboxGuard";
import { ModuleWithVisitorInfo } from "./ModuleWithVisitorInfo";
import { LocaleProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { AuthFormModalProvider } from "@/lib/auth/AuthFormModalContext";
import { NotificationsProvider } from "@/lib/notifications/NotificationsContext";
import { AuthFormModalOverlay } from "@/components/auth/AuthFormModalOverlay";
import { Toaster } from "sileo";
import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { ModuleSoftFallback } from "@/components/ui/ModuleSoftFallback";
import { withBase } from "@/lib/basePath";
import { prefetchFrequentRoutes } from "@/lib/routePrefetch";

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
const LazyTrackingDisabled = lazy(() =>
  Promise.resolve({
    default: function TrackingDisabled() {
      return (
        <main className="flex-1 min-h-0 overflow-auto flex items-center justify-center bg-[#D9E3F2] p-6" role="main">
          <div className="max-w-md text-center rounded-2xl border border-brand-blue/15 bg-white px-6 py-8 shadow-sm">
            <p className="text-lg font-bold text-brand-blue mb-2">Seguimiento desactivado</p>
            <p className="text-sm text-neutral-600 mb-5">
              Esta sección no está disponible por ahora. Puedes volver al inicio o al dashboard.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <a
                href={withBase("/inicio")}
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-semibold bg-brand-blue text-white hover:bg-brand-blue/90"
              >
                Ir a inicio
              </a>
              <a
                href={withBase("/dashboard")}
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-semibold border border-brand-blue/20 bg-[#F4F8FC] text-brand-blue hover:bg-white"
              >
                Dashboard
              </a>
            </div>
          </div>
        </main>
      );
    },
  }),
);
const LazyRegistrosContent = lazy(() =>
  import("@/components/registros").then((m) => ({ default: m.RegistrosContent })),
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
const LazyPapeleraTransportesContent = lazy(() =>
  import("@/components/transportes").then((m) => ({ default: m.PapeleraTransportesContent })),
);
const LazyFormatosDocumentosContent = lazy(() =>
  import("@/components/configuracion/FormatosDocumentosContent").then((m) => ({ default: m.FormatosDocumentosContent })),
);
const LazyMisDocumentosContent = lazy(() =>
  import("@/components/documentos").then((m) => ({ default: m.MisDocumentosContent })),
);
const LazyCrearProformaContent = lazy(() =>
  import("@/components/documentos/CrearProformaContent").then((m) => ({ default: m.CrearProformaContent })),
);
const LazyCrearInstructivoContent = lazy(() =>
  import("@/components/documentos/CrearInstructivoContent").then((m) => ({ default: m.CrearInstructivoContent })),
);
const LazyCartolasNuboxContent = lazy(() =>
  import("@/components/cartolas-nubox/CartolasNuboxContent").then((m) => ({ default: m.CartolasNuboxContent })),
);
function RouteFallback() {
  return <ModuleSoftFallback />;
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

  useEffect(() => {
    prefetchFrequentRoutes();
  }, []);

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
        <LazyTrackingDisabled />
      </Sus>
    ) : pathname === "/registros" ? (
      <ModuleWithVisitorInfo moduleKey="registros">
        <Sus>
          <LazyRegistrosContent />
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
    ) : pathname === "/transportes/papelera" ? (
      <ModuleWithVisitorInfo moduleKey="papeleraTransportes">
        <Sus>
          <LazyPapeleraTransportesContent />
        </Sus>
      </ModuleWithVisitorInfo>
    ) : pathname === "/documentos/mis-documentos" ? (
      <ModuleWithVisitorInfo moduleKey="misDocumentos">
        <Sus>
          <LazyMisDocumentosContent />
        </Sus>
      </ModuleWithVisitorInfo>
    ) : pathname === "/documentos/crear-proforma" ? (
      <ModuleWithVisitorInfo moduleKey="crearProforma">
        <Sus>
          <LazyCrearProformaContent />
        </Sus>
      </ModuleWithVisitorInfo>
    ) : pathname === "/documentos/crear-instructivo" ? (
      <ModuleWithVisitorInfo moduleKey="crearInstructivo">
        <Sus>
          <LazyCrearInstructivoContent />
        </Sus>
      </ModuleWithVisitorInfo>
    ) : pathname === "/cartolas-nubox" ? (
      <CartolasNuboxGuard>
        <Sus>
          <LazyCartolasNuboxContent />
        </Sus>
      </CartolasNuboxGuard>
    ) : (
      children
    );

  return (
    <LocaleProvider>
      <AuthProvider>
        <NotificationsProvider>
          <AuthFormModalProvider>
            <div className="h-dvh flex flex-col overflow-hidden">
              <Header />
              <NavBanner pathname={pathname} />
              <div className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden">{mainContent}</div>
            </div>
            <AuthFormModalOverlay />
            <Toaster position="bottom-center" />
          </AuthFormModalProvider>
        </NotificationsProvider>
      </AuthProvider>
    </LocaleProvider>
  );
}
