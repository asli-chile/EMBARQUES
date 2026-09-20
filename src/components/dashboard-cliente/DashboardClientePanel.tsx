import { useAuth } from "@/lib/auth/AuthContext";
import { RoleForbidden } from "@/components/layout/RoleForbidden";
import { DashboardVisitorContent } from "@/components/dashboard/DashboardVisitorContent";
import { DashboardClienteContent } from "./DashboardClienteContent";
import { useNeonTheme } from "@/lib/ui/neonTheme";

/**
 * Punto de entrada del dashboard del cliente: resuelve el acceso por rol.
 *
 * Entra el cliente —es su pantalla— y también el personal interno, que la
 * necesita para "ver como" y para soporte: quien atiende el teléfono tiene que
 * poder mirar lo mismo que está mirando el cliente. Lo que cada cuenta ve
 * dentro lo sigue decidiendo RLS sobre `operaciones`.
 */
export function DashboardClientePanel() {
  const { isExternalUser, isLoading: authLoading, isCliente, isStaff } = useAuth();
  const [theme] = useNeonTheme();

  const shellProps = {
    className: "dash-neon flex min-h-0 flex-1 flex-col",
    "data-theme": theme,
  } as const;

  if (!authLoading && isExternalUser) {
    return (
      <div {...shellProps}>
        <DashboardVisitorContent />
      </div>
    );
  }

  if (!authLoading && !isStaff && !isCliente) {
    return (
      <RoleForbidden message="Tu cuenta no tiene un rol asignado para ver el dashboard del cliente. Pide a un administrador que te asigne cliente u operador." />
    );
  }

  return (
    <div {...shellProps}>
      <DashboardClienteContent />
    </div>
  );
}
