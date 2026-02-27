import { Header } from "./Header";
import { NavBanner } from "./NavBanner";
import { Sidebar } from "./Sidebar";
import { ClientesContent } from "@/components/clientes";
import { InicioContent } from "@/components/inicio";
import { RegistrosContent } from "@/components/registros";
import { LocaleProvider } from "@/lib/i18n";

type AppShellProps = {
  children: React.ReactNode;
  pathname: string;
};

export function AppShell({ children, pathname }: AppShellProps) {
  const isAuthRoute = pathname.startsWith("/auth");

  if (isAuthRoute) {
    return (
      <LocaleProvider>
        <div className="h-screen flex flex-col overflow-hidden">
          <Header />
          <NavBanner pathname={pathname} />
          <main className="flex-1 min-h-0 overflow-auto bg-brand-blue p-4 flex flex-col items-center justify-center">
            {children}
          </main>
        </div>
      </LocaleProvider>
    );
  }

  const mainContent =
    pathname === "/inicio" ? (
      <InicioContent />
    ) : pathname === "/registros" ? (
      <RegistrosContent />
    ) : pathname === "/configuracion/clientes" ? (
      <ClientesContent />
    ) : (
      children
    );

  return (
    <LocaleProvider>
      <div className="h-screen flex flex-col overflow-hidden">
        <Header />
        <NavBanner pathname={pathname} />
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <Sidebar />
          {mainContent}
        </div>
      </div>
    </LocaleProvider>
  );
}
