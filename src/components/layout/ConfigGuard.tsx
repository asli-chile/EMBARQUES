import { useAuth } from "@/lib/auth/AuthContext";

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
  const { profile, isSuperadmin, isAdmin, isLoading } = useAuth();
  const message =
    forbiddenMessage ??
    "No tienes acceso a Configuración. Solo administradores pueden gestionarla.";

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
