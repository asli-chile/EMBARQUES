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

const AUTH_CACHE_KEY = "_auth_cache_v1";
const AUTH_CACHE_TTL_MS = 4 * 60 * 1000; // 4 minutos

type AuthCache = {
  user: AuthUser;
  profile: AuthProfile;
  empresaNombres: string[];
  cachedAt: number;
};

function readAuthCache(): AuthCache | null {
  try {
    const raw = localStorage.getItem(AUTH_CACHE_KEY);
    if (!raw) return null;
    const parsed: AuthCache = JSON.parse(raw);
    if (Date.now() - parsed.cachedAt > AUTH_CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeAuthCache(data: Omit<AuthCache, "cachedAt">) {
  try {
    localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify({ ...data, cachedAt: Date.now() }));
  } catch {}
}

function clearAuthCache() {
  try { localStorage.removeItem(AUTH_CACHE_KEY); } catch {}
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Lazy init: lee localStorage una sola vez al montar
  const [user, setUser] = useState<AuthUser | null>(() => readAuthCache()?.user ?? null);
  const [profile, setProfile] = useState<AuthProfile | null>(() => readAuthCache()?.profile ?? null);
  const [empresaNombres, setEmpresaNombres] = useState<string[]>(() => readAuthCache()?.empresaNombres ?? []);
  // Si hay cache válido arrancamos con isLoading=false de inmediato
  const [isLoading, setIsLoading] = useState(() => !readAuthCache());

  const loadSession = useCallback(async (background = false) => {
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      setUser(null);
      setProfile(null);
      setIsLoading(false);
      clearAuthCache();
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
        clearAuthCache();
        if (!background) setIsLoading(false);
        else setIsLoading(false);
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

      // Lanzar consulta de perfil inmediatamente
      const perfilPromise = supabase
        .from("usuarios")
        .select("id, nombre, email, rol, activo")
        .eq("auth_id", session.user.id)
        .single();

      const { data: perfil } = await perfilPromise;

      let resolvedProfile: AuthProfile;
      let resolvedEmpresas: string[] = [];

      if (perfil && perfil.activo) {
        resolvedProfile = {
          id: perfil.id,
          nombre: perfil.nombre ?? authUser.name,
          email: perfil.email ?? authUser.email,
          rol: perfil.rol as UserRole,
          activo: perfil.activo,
        };

        if (perfil.rol === "cliente" || perfil.rol === "ejecutivo") {
          const { data: ueData } = await supabase
            .from("usuarios_empresas")
            .select("empresas(nombre)")
            .eq("usuario_id", perfil.id);
          resolvedEmpresas = (ueData ?? [])
            .map((r) => (r.empresas as unknown as { nombre: string } | null)?.nombre)
            .filter((n): n is string => !!n);
        }
      } else {
        resolvedProfile = {
          id: session.user.id,
          nombre: authUser.name,
          email: authUser.email,
          rol: "usuario",
          activo: true,
        };
      }

      setUser(authUser);
      setProfile(resolvedProfile);
      setEmpresaNombres(resolvedEmpresas);
      writeAuthCache({ user: authUser, profile: resolvedProfile, empresaNombres: resolvedEmpresas });
    } catch {
      setUser(null);
      setProfile(null);
      setEmpresaNombres([]);
      clearAuthCache();
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Si arrancamos con cache, refrescamos en background sin bloquear UI
    void loadSession(!!readAuthCache());

    const safetyTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 5000);

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
