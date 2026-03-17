import { useAuth } from "@/lib/auth/AuthContext";

type ConfigGuardProps = {
  children: React.ReactNode;
  /** Mensaje cuando el usuario no es superadmin. Por defecto: mensaje de Configuración. */
  forbiddenMessage?: string;
};

/**
 * Solo permite acceso al superadmin.
 * Los demás roles ven mensaje de sin acceso.
 * Uso: Configuración y gestión de itinerarios (servicios/consorcios).
 */
export function ConfigGuard({ children, forbiddenMessage }: ConfigGuardProps) {
  const { profile, isSuperadmin, isLoading } = useAuth();
  const message =
    forbiddenMessage ??
    "No tienes acceso a Configuración. Solo el superadmin puede gestionarla.";

  if (isLoading) {
    return (
      <main className="flex-1 min-h-0 overflow-auto bg-neutral-100 p-6 flex items-center justify-center" role="main">
        <p className="text-neutral-500">Cargando…</p>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="flex-1 min-h-0 overflow-auto bg-neutral-100 p-6" role="main">
        <p className="text-neutral-600">Inicia sesión para continuar.</p>
      </main>
    );
  }

  if (!isSuperadmin) {
    return (
      <main className="flex-1 min-h-0 overflow-auto bg-neutral-100 p-6 flex items-center justify-center" role="main">
        <p className="text-neutral-600">{message}</p>
      </main>
    );
  }

  return <>{children}</>;
}
