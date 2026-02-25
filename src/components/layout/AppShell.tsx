import { Header } from "./Header";
import { NavBanner } from "./NavBanner";
import { Sidebar } from "./Sidebar";
import { InicioContent } from "@/components/inicio";
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
        <div className="min-h-screen flex flex-col">{children}</div>
      </LocaleProvider>
    );
  }

  const mainContent = pathname === "/inicio" ? <InicioContent /> : children;

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
