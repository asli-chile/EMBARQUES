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
import { createContext, lazy, Suspense, useContext, useEffect, type ReactNode } from "react";
import { ModuleSoftFallback } from "@/components/ui/ModuleSoftFallback";
import { getRouteChrome, type RouteChrome } from "@/lib/ui/routeChrome";
import { prefetchFrequentRoutes } from "@/lib/routePrefetch";

/** Cada ruta en su propio chunk: evita cargar MapLibre/xlsx/ag-grid en /inicio (crítico en Android + Vite dev). */
const LazyDashboardPanel = lazy(() =>
  import("@/components/dashboard").then((m) => ({ default: m.DashboardPanel })),
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
const LazyRegistrosContent = lazy(() =>
  import("@/components/registros").then((m) => ({ default: m.RegistrosContent })),
);
const LazyTareasContent = lazy(() =>
  import("@/components/tareas").then((m) => ({ default: m.TareasContent })),
);
const LazyClientesContent = lazy(() =>
  import("@/components/clientes").then((m) => ({ default: m.ClientesContent })),
);
const LazyAsignarClientesEmpresasContent = lazy(() =>
  import("@/components/configuracion/AsignarClientesEmpresasContent").then((m) => ({
    default: m.AsignarClientesEmpresasContent,
  })),
);
const LazyAsignarEjecutivosContent = lazy(() =>
  import("@/components/configuracion/AsignarEjecutivosContent").then((m) => ({
    default: m.AsignarEjecutivosContent,
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
const LazyTemporadasContent = lazy(() =>
  import("@/components/configuracion/TemporadasContent").then((m) => ({
    default: m.TemporadasContent,
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
const LazyInformativosContent = lazy(() =>
  import("@/components/comunicaciones").then((m) => ({ default: m.InformativosContent })),
);
/**
 * El aspecto de la ruta se pasa por contexto y no como prop de cada `<Sus>`:
 * hay una veintena de llamadas y el valor es el mismo para todas.
 */
const RouteChromeContext = createContext<RouteChrome>("module");

function RouteFallback() {
  return <ModuleSoftFallback chrome={useContext(RouteChromeContext)} />;
}

/**
 * Envoltorio de ruta: Suspense + transición de entrada de la vista.
 *
 * El `div.motion-view` se monta recién cuando el chunk del módulo resolvió, así
 * que la animación coincide con el momento en que el skeleton da paso al
 * contenido real. Sus secciones internas entran en cascada con
 * `.motion-view-section` (ver docs/MOTION-DESIGN.md).
 */
function Sus({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<RouteFallback />}>
      <div className="motion-view flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </Suspense>
  );
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
            <div className="h-dvh max-w-full min-w-0 flex flex-col overflow-hidden">
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
        <LazyDashboardPanel />
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
    ) : pathname === "/registros" ? (
      <ModuleWithVisitorInfo moduleKey="registros">
        <Sus>
          <LazyRegistrosContent />
        </Sus>
      </ModuleWithVisitorInfo>
    ) : pathname === "/tareas" ? (
      <Sus>
        <LazyTareasContent />
      </Sus>
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
    ) : pathname === "/configuracion/asignar-ejecutivos" ? (
      <ConfigGuard>
        <Sus>
          <LazyAsignarEjecutivosContent />
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
    ) : pathname === "/configuracion/temporadas" ? (
      <ConfigGuard allowAdmin={false}>
        <Sus>
          <LazyTemporadasContent />
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
    ) : pathname === "/comunicaciones/informativos" ? (
      <Sus>
        <LazyInformativosContent />
      </Sus>
    ) : (
      children
    );

  const hideAppChrome = pathname === "/comunicaciones/informativos";

  return (
    <LocaleProvider>
      <AuthProvider>
        <NotificationsProvider>
          <AuthFormModalProvider>
            <div className="h-dvh max-w-full min-w-0 flex flex-col overflow-hidden">
              {!hideAppChrome ? <Header /> : null}
              {!hideAppChrome ? <NavBanner pathname={pathname} /> : null}
              <div className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden">
                <RouteChromeContext.Provider value={getRouteChrome(pathname)}>
                  {mainContent}
                </RouteChromeContext.Provider>
              </div>
            </div>
            <AuthFormModalOverlay />
            <Toaster position="bottom-center" />
          </AuthFormModalProvider>
        </NotificationsProvider>
      </AuthProvider>
    </LocaleProvider>
  );
}
