import { useAuth } from "@/lib/auth/AuthContext";

type ConfigGuardProps = {
  children: React.ReactNode;
};

/**
 * Solo permite acceso a Configuración al superadmin.
 * Los demás roles ven mensaje de sin acceso.
 */
export function ConfigGuard({ children }: ConfigGuardProps) {
  const { profile, isSuperadmin, isLoading } = useAuth();

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
        <p className="text-neutral-600">No tienes acceso a Configuración. Solo el superadmin puede gestionarla.</p>
      </main>
    );
  }

  return <>{children}</>;
}
