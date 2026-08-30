import { useAuth } from "@/lib/auth/AuthContext";
import { ModuleSoftFallback } from "@/components/ui/ModuleSoftFallback";

type ConfigGuardProps = {
  children: React.ReactNode;
  /** Mensaje cuando el usuario no tiene acceso. */
  forbiddenMessage?: string;
  /** Si true, permite también rol admin (además de superadmin). Default true. */
  allowAdmin?: boolean;
};

/**
 * Permite acceso a superadmin y, por defecto, también a admin.
 * Uso: Configuración (usuarios, clientes, consignatarios, etc.).
 */
export function ConfigGuard({ children, forbiddenMessage, allowAdmin = true }: ConfigGuardProps) {
  const { user, profile, isSuperadmin, isAdmin, isLoading } = useAuth();
  const message =
    forbiddenMessage ??
    "No tienes acceso a Configuración. Solo administradores pueden gestionarla.";

  if (isLoading) {
    return <ModuleSoftFallback />;
  }

  if (!profile) {
    return (
      <main className="flex-1 min-h-0 overflow-auto bg-neutral-100 p-6 flex items-center justify-center" role="main">
        <p className="text-neutral-600">
          {user
            ? "Tu cuenta no tiene un rol activo. Pide a un administrador que te asigne uno."
            : "Inicia sesión para continuar."}
        </p>
      </main>
    );
  }

  const allowed = isSuperadmin || (allowAdmin && isAdmin);
  if (!allowed) {
    return (
      <main className="flex-1 min-h-0 overflow-auto bg-neutral-100 p-6 flex items-center justify-center" role="main">
        <p className="text-neutral-600">{message}</p>
      </main>
    );
  }

  return <>{children}</>;
}
