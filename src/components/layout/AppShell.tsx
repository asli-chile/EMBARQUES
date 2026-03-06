import { Header } from "./Header";
import { NavBanner } from "./NavBanner";
import { Sidebar } from "./Sidebar";
import { ConfigGuard } from "./ConfigGuard";
import { ClientesContent } from "@/components/clientes";
import { AsignarClientesEmpresasContent } from "@/components/configuracion/AsignarClientesEmpresasContent";
import { UsuariosContent } from "@/components/usuarios/UsuariosContent";
import { DashboardContent } from "@/components/dashboard";
import { InicioContent } from "@/components/inicio";
import { ServiciosContent } from "@/components/servicios";
import { SobreNosotrosContent } from "@/components/sobre-nosotros";
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
    ) : pathname === "/registros" ? (
      <RegistrosContent />
    ) : pathname === "/configuracion/clientes" ? (
      <ConfigGuard><ClientesContent /></ConfigGuard>
    ) : pathname === "/configuracion/asignar-clientes-empresas" ? (
      <ConfigGuard><AsignarClientesEmpresasContent /></ConfigGuard>
    ) : pathname === "/configuracion/usuarios" ? (
      <ConfigGuard><UsuariosContent /></ConfigGuard>
    ) : pathname === "/reservas/crear" ? (
      <CrearReservaContent />
    ) : pathname === "/reservas/mis-reservas" ? (
      <MisReservasContent />
    ) : pathname === "/reservas/papelera" ? (
      <PapeleraContent />
    ) : pathname === "/transportes/reserva-asli" ? (
      <ReservaAsliContent />
    ) : pathname === "/transportes/reserva-ext" ? (
      <ReservaExtContent />
    ) : pathname === "/transportes/facturacion" ? (
      <FacturacionContent />
    ) : pathname === "/documentos/mis-documentos" ? (
      <MisDocumentosContent />
    ) : (
      children
    );

  return (
    <LocaleProvider>
      <AuthProvider>
      <div className="h-screen flex flex-col overflow-hidden">
        <Header />
        <NavBanner pathname={pathname} />
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <Sidebar pathname={pathname} />
          {mainContent}
        </div>
      </div>
      </AuthProvider>
    </LocaleProvider>
  );
}
