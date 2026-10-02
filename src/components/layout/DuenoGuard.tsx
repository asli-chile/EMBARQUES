import { useAuth } from "@/lib/auth/AuthContext";
import { esDueno } from "@/lib/herramientas-dueno";
import { ModuleSoftFallback } from "@/components/ui/ModuleSoftFallback";

/**
 * Pantallas que solo usa Rodrigo (creador de publicidad, informativos).
 *
 * Ocultar el ítem del menú no protege la ruta: sin esta barrera, cualquiera que
 * conociera la URL entraba. Se decide con el mismo correo que el menú
 * (`profile` y si no `user`), así "ver como" muestra lo que vería el otro.
 */
export function DuenoGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, isLoading } = useAuth();

  if (isLoading) return <ModuleSoftFallback />;

  if (!esDueno(profile?.email ?? user?.email)) {
    return (
      <main className="flex flex-1 min-h-0 items-center justify-center overflow-auto bg-neutral-100 p-6" role="main">
        <p className="max-w-md text-center text-neutral-600">No tienes acceso a esta sección.</p>
      </main>
    );
  }

  return <>{children}</>;
}
