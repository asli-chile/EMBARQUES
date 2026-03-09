import { Header } from "./Header";
import { NavBanner } from "./NavBanner";
import { Sidebar } from "./Sidebar";
import { ConfigGuard } from "./ConfigGuard";
import { ModuleWithVisitorInfo } from "./ModuleWithVisitorInfo";
import { ClientesContent } from "@/components/clientes";
import { AsignarClientesEmpresasContent } from "@/components/configuracion/AsignarClientesEmpresasContent";
import { UsuariosContent } from "@/components/usuarios/UsuariosContent";
import { DashboardContent } from "@/components/dashboard";
import { InicioContent } from "@/components/inicio";
import { ServiciosContent } from "@/components/servicios";
import { SobreNosotrosContent } from "@/components/sobre-nosotros";
import { TrackingContent } from "@/components/tracking/TrackingContent";
import { ItinerarioContent } from "@/components/itinerario/ItinerarioContent";
import { ServiciosUnicosContent } from "@/components/itinerario/ServiciosUnicosContent";
import { ConsorciosContent } from "@/components/itinerario/ConsorciosContent";
import { RegistrosContent } from "@/components/registros";
import { CrearReservaContent, MisReservasContent, PapeleraContent } from "@/components/reservas";
import { ReservaAsliContent, ReservaExtContent, FacturacionContent } from "@/components/transportes";
import { MisDocumentosContent } from "@/components/documentos";
import { LocaleProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth/AuthContext";

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
        <div className="h-screen flex flex-col overflow-hidden">
          <Header />
          <NavBanner pathname={pathname} />
          <main className="flex-1 min-h-0 overflow-auto bg-brand-blue p-4 flex flex-col items-center justify-center">
            {children}
          </main>
        </div>
        </AuthProvider>
      </LocaleProvider>
    );
  }

  const mainContent =
    pathname === "/dashboard" ? (
      <DashboardContent />
    ) : pathname === "/inicio" ? (
      <InicioContent />
    ) : pathname === "/servicios" ? (
      <ServiciosContent />
    ) : pathname === "/sobre-nosotros" ? (
      <SobreNosotrosContent />
    ) : pathname === "/tracking" ? (
      <TrackingContent />
    ) : pathname === "/itinerario" ? (
      <ItinerarioContent />
    ) : pathname === "/itinerario/servicios" ? (
      <ServiciosUnicosContent />
    ) : pathname === "/itinerario/consorcios" ? (
      <ConsorciosContent />
    ) : pathname === "/registros" ? (
      <ModuleWithVisitorInfo moduleKey="registros"><RegistrosContent /></ModuleWithVisitorInfo>
    ) : pathname === "/configuracion/clientes" ? (
      <ConfigGuard><ClientesContent /></ConfigGuard>
    ) : pathname === "/configuracion/asignar-clientes-empresas" ? (
      <ConfigGuard><AsignarClientesEmpresasContent /></ConfigGuard>
    ) : pathname === "/configuracion/usuarios" ? (
      <ConfigGuard><UsuariosContent /></ConfigGuard>
    ) : pathname === "/reservas/crear" ? (
      <ModuleWithVisitorInfo moduleKey="crearReserva"><CrearReservaContent /></ModuleWithVisitorInfo>
    ) : pathname === "/reservas/mis-reservas" ? (
      <ModuleWithVisitorInfo moduleKey="misReservas"><MisReservasContent /></ModuleWithVisitorInfo>
    ) : pathname === "/reservas/papelera" ? (
      <ModuleWithVisitorInfo moduleKey="papelera"><PapeleraContent /></ModuleWithVisitorInfo>
    ) : pathname === "/transportes/reserva-asli" ? (
      <ModuleWithVisitorInfo moduleKey="reservaAsli"><ReservaAsliContent /></ModuleWithVisitorInfo>
    ) : pathname === "/transportes/reserva-ext" ? (
      <ModuleWithVisitorInfo moduleKey="reservaExt"><ReservaExtContent /></ModuleWithVisitorInfo>
    ) : pathname === "/transportes/facturacion" ? (
      <ModuleWithVisitorInfo moduleKey="facturacion"><FacturacionContent /></ModuleWithVisitorInfo>
    ) : pathname === "/documentos/mis-documentos" ? (
      <ModuleWithVisitorInfo moduleKey="misDocumentos"><MisDocumentosContent /></ModuleWithVisitorInfo>
    ) : (
      children
    );

  return (
    <LocaleProvider>
      <AuthProvider>
      <div className="h-screen flex flex-col overflow-hidden">
        <Header />
        <NavBanner pathname={pathname} />
        <div className="flex flex-1 min-h-0 overflow-hidden min-w-0">
          <Sidebar pathname={pathname} />
          <div className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden">
            {mainContent}
          </div>
        </div>
      </div>
      </AuthProvider>
    </LocaleProvider>
  );
}
