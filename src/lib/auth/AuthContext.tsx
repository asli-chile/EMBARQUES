import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

export type UserRole = "superadmin" | "admin" | "ejecutivo" | "operador" | "cliente" | "usuario";

export type AuthProfile = {
  id: string;
  nombre: string;
  email: string;
  rol: UserRole;
  activo: boolean;
};

export type AuthUser = {
  id: string;
  email: string;
  name: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  profile: AuthProfile | null;
  isLoading: boolean;
  isSuperadmin: boolean;
  isAdmin: boolean;
  isEjecutivo: boolean;
  isCliente: boolean;
  /** Nombres de empresas asignadas (cliente o ejecutivo) para filtrar operaciones en app. */
  empresaNombres: string[];
  /** Usuario externo: sin sesión o sin perfil en tabla usuarios. Ve contenido informativo. */
  isExternalUser: boolean;
  refetch: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const ROL_LABELS: Record<UserRole, string> = {
  superadmin: "Superadmin",
  admin: "Administrador",
  ejecutivo: "Ejecutivo",
  operador: "Operador",
  cliente: "Cliente",
  usuario: "Usuario",
};

export function getRolLabel(rol: UserRole): string {
  return ROL_LABELS[rol] ?? rol;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [empresaNombres, setEmpresaNombres] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadSession = useCallback(async () => {
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      setUser(null);
      setProfile(null);
      setIsLoading(false);
      return;
    }

    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setUser(null);
        setProfile(null);
        setEmpresaNombres([]);
        setIsLoading(false);
        return;
      }

      const authUser: AuthUser = {
        id: session.user.id,
        email: session.user.email ?? "",
        name:
          (session.user.user_metadata?.nombre as string) ??
          (session.user.user_metadata?.full_name as string) ??
          session.user.email?.split("@")[0] ??
          "Usuario",
      };
      setUser(authUser);

      const { data: perfil } = await supabase
        .from("usuarios")
        .select("id, nombre, email, rol, activo")
        .eq("auth_id", session.user.id)
        .single();

      if (perfil && perfil.activo) {
        setProfile({
          id: perfil.id,
          nombre: perfil.nombre ?? authUser.name,
          email: perfil.email ?? authUser.email,
          rol: perfil.rol as UserRole,
          activo: perfil.activo,
        });
        if (perfil.rol === "cliente" || perfil.rol === "ejecutivo") {
          const { data: ueData } = await supabase
            .from("usuarios_empresas")
            .select("empresas(nombre)")
            .eq("usuario_id", perfil.id);
          const nombres = (ueData ?? [])
            .map((r) => (r.empresas as { nombre: string } | null)?.nombre)
            .filter((n): n is string => !!n);
          setEmpresaNombres(nombres);
        } else {
          setEmpresaNombres([]);
        }
      } else {
        setProfile({
          id: session.user.id,
          nombre: authUser.name,
          email: authUser.email,
          rol: "usuario",
          activo: true,
        });
        setEmpresaNombres([]);
      }
    } catch (err) {
      setUser(null);
      setProfile(null);
      setEmpresaNombres([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSession();

    const safetyTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 8000);

    let unsub: (() => void) | undefined;
    import("@/lib/supabase/client")
      .then(({ createClient }) => {
        const supabase = createClient();
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(() => {
          void loadSession();
        });
        unsub = () => subscription.unsubscribe();
      })
      .catch(() => clearTimeout(safetyTimeout));

    return () => {
      clearTimeout(safetyTimeout);
      unsub?.();
    };
  }, [loadSession]);

  const value: AuthContextValue = {
    user,
    profile,
    isLoading,
    isSuperadmin: profile?.rol === "superadmin",
    isAdmin: profile?.rol === "admin",
    isEjecutivo: profile?.rol === "ejecutivo",
    isCliente: profile?.rol === "cliente",
    empresaNombres,
    isExternalUser: !user,
    refetch: loadSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      user: null,
      profile: null,
      isLoading: true,
      isSuperadmin: false,
      isAdmin: false,
      isEjecutivo: false,
      isCliente: false,
      empresaNombres: [],
      isExternalUser: true,
      refetch: async () => {},
    };
  }
  return ctx;
}
