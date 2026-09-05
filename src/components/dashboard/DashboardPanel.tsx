import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { RoleForbidden } from "@/components/layout/RoleForbidden";
import { DashboardContent } from "./DashboardContent";
import { DashboardHistoricoContent } from "./DashboardHistoricoContent";
import { DashboardVisitorContent } from "./DashboardVisitorContent";
import type { DashboardView } from "./DashboardViewTabs";
import { readNeonTheme, type NeonTheme } from "@/lib/ui/neonTheme";

/**
 * Punto de entrada del dashboard: resuelve el acceso por rol y alterna entre la
 * vista operativa ("en curso") y el histórico de volumen.
 */
export function DashboardPanel() {
  const { isExternalUser, isLoading: authLoading, isCliente, isStaff } = useAuth();
  const [view, setView] = useState<DashboardView>("curso");
  const [theme, setTheme] = useState<NeonTheme>(() =>
    typeof window !== "undefined" ? readNeonTheme() : "dark",
  );

  useEffect(() => {
    setTheme(readNeonTheme());
  }, []);

  const shellProps = {
    className: "dash-neon flex min-h-0 flex-1 flex-col",
    "data-theme": theme,
  } as const;

  if (!authLoading && isExternalUser) {
    return (
      <div {...shellProps}>
        <DashboardVisitorContent theme={theme} onThemeChange={setTheme} />
      </div>
    );
  }

  if (!authLoading && !isStaff && !isCliente) {
    return (
      <RoleForbidden message="Tu cuenta no tiene un rol asignado para ver el dashboard. Pide a un administrador que te asigne cliente u operador." />
    );
  }

  return (
    <div {...shellProps}>
      {view === "historico" ? (
        <DashboardHistoricoContent
          view={view}
          onViewChange={setView}
          theme={theme}
          onThemeChange={setTheme}
        />
      ) : (
        <DashboardContent
          view={view}
          onViewChange={setView}
          theme={theme}
          onThemeChange={setTheme}
        />
      )}
    </div>
  );
}
