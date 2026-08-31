import { useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { RoleForbidden } from "@/components/layout/RoleForbidden";
import { DashboardContent } from "./DashboardContent";
import { DashboardHistoricoContent } from "./DashboardHistoricoContent";
import { DashboardVisitorContent } from "./DashboardVisitorContent";
import type { DashboardView } from "./DashboardViewTabs";

/**
 * Punto de entrada del dashboard: resuelve el acceso por rol y alterna entre la
 * vista operativa ("en curso") y el histórico de volumen.
 */
export function DashboardPanel() {
  const { isExternalUser, isLoading: authLoading, isCliente, isStaff } = useAuth();
  const [view, setView] = useState<DashboardView>("curso");

  if (!authLoading && isExternalUser) {
    return <DashboardVisitorContent />;
  }

  if (!authLoading && !isStaff && !isCliente) {
    return (
      <RoleForbidden message="Tu cuenta no tiene un rol asignado para ver el dashboard. Pide a un administrador que te asigne cliente u operador." />
    );
  }

  return view === "historico" ? (
    <DashboardHistoricoContent view={view} onViewChange={setView} />
  ) : (
    <DashboardContent view={view} onViewChange={setView} />
  );
}
