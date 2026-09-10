import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { isStaffRole } from "@/lib/auth/roles";
import { filterNombresVisibles } from "@/lib/clientesOcultos";

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

/** Simulación de UI: el JWT real no cambia; RLS sigue viendo al superadmin. */
export type ViewAsState = {
  rol: UserRole;
  usuarioId: string;
  nombre: string;
  email: string;
  empresaNombres: string[];
};

type AuthContextValue = {
  user: AuthUser | null;
  profile: AuthProfile | null;
  isLoading: boolean;
  isSuperadmin: boolean;
  isAdmin: boolean;
  isEjecutivo: boolean;
  isCliente: boolean;
  /** Personal interno ASLI (superadmin, admin, ejecutivo, operador). */
  isStaff: boolean;
  /** Nombres de empresas asignadas (cliente o ejecutivo) para filtrar operaciones en app. */
  empresaNombres: string[];
  /** Usuario externo: sin sesión. Ve contenido informativo. */
  isExternalUser: boolean;
  refetch: () => Promise<void>;
  /** Perfil real de la sesión (sin view-as). */
  realProfile: AuthProfile | null;
  /** True solo si la sesión real es superadmin (ignora view-as). */
  isActualSuperadmin: boolean;
  viewAs: ViewAsState | null;
  setViewAs: (next: ViewAsState | null) => void;
  clearViewAs: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const ROL_LABELS: Record<UserRole, string> = {
  superadmin: "Superadmin",
  admin: "Administrador",
  ejecutivo: "Ejecutivo",
  operador: "Operador",
  cliente: "Cliente",
  usuario: "Sin acceso",
};

export function getRolLabel(rol: UserRole): string {
  return ROL_LABELS[rol] ?? rol;
}

const AUTH_CACHE_KEY = "_auth_cache_v3";
const AUTH_CACHE_TTL_MS = 4 * 60 * 1000;
const VIEW_AS_KEY = "_asli_view_as_v1";

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
  } catch {
    /* ignore */
  }
}

function clearAuthCache() {
  try {
    localStorage.removeItem(AUTH_CACHE_KEY);
  } catch {
    /* ignore */
  }
}

function readViewAs(): ViewAsState | null {
  try {
    const raw = sessionStorage.getItem(VIEW_AS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ViewAsState;
    if (!parsed?.rol || !parsed?.usuarioId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeViewAs(state: ViewAsState | null) {
  try {
    if (!state) sessionStorage.removeItem(VIEW_AS_KEY);
    else sessionStorage.setItem(VIEW_AS_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [empresaNombres, setEmpresaNombres] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewAs, setViewAsState] = useState<ViewAsState | null>(null);

  const setViewAs = useCallback((next: ViewAsState | null) => {
    setViewAsState(next);
    writeViewAs(next);
  }, []);

  const clearViewAs = useCallback(() => {
    setViewAsState(null);
    writeViewAs(null);
  }, []);

  const loadSession = useCallback(async (background = false) => {
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      setUser(null);
      setProfile(null);
      setIsLoading(false);
      clearAuthCache();
      clearViewAs();
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
        clearViewAs();
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

      const perfilPromise = supabase
        .from("usuarios")
        .select("id, nombre, email, rol, activo")
        .eq("auth_id", session.user.id)
        .single();

      const { data: perfil } = await perfilPromise;

      if (!perfil || !perfil.activo) {
        setUser(authUser);
        setProfile(null);
        setEmpresaNombres([]);
        clearAuthCache();
        clearViewAs();
        return;
      }

      const resolvedProfile: AuthProfile = {
        id: perfil.id,
        nombre: perfil.nombre ?? authUser.name,
        email: perfil.email ?? authUser.email,
        rol: perfil.rol as UserRole,
        activo: perfil.activo,
      };

      let resolvedEmpresas: string[] = [];
      if (perfil.rol === "cliente" || perfil.rol === "ejecutivo") {
        const { data: ueData } = await supabase
          .from("usuarios_empresas")
          .select("empresas(nombre)")
          .eq("usuario_id", perfil.id);
        resolvedEmpresas = filterNombresVisibles(
          (ueData ?? [])
            .map((r) => (r.empresas as unknown as { nombre: string } | null)?.nombre)
            .filter((n): n is string => !!n),
        );
      }

      setUser(authUser);
      setProfile(resolvedProfile);
      setEmpresaNombres(resolvedEmpresas);
      writeAuthCache({ user: authUser, profile: resolvedProfile, empresaNombres: resolvedEmpresas });

      if (resolvedProfile.rol !== "superadmin") {
        clearViewAs();
      }
    } catch {
      setUser(null);
      setProfile(null);
      setEmpresaNombres([]);
      clearAuthCache();
      clearViewAs();
    } finally {
      setIsLoading(false);
    }
  }, [clearViewAs]);

  useEffect(() => {
    const cached = readAuthCache();
    if (cached) {
      setUser(cached.user);
      setProfile(cached.profile);
      setEmpresaNombres(cached.empresaNombres);
      setIsLoading(false);
    }
    const storedViewAs = readViewAs();
    if (storedViewAs && cached?.profile?.rol === "superadmin") {
      setViewAsState(storedViewAs);
    }
    void loadSession(!!cached);

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

  const isActualSuperadmin = profile?.rol === "superadmin";

  const effectiveProfile = useMemo((): AuthProfile | null => {
    if (!profile) return null;
    if (!viewAs || !isActualSuperadmin) return profile;
    return {
      id: viewAs.usuarioId,
      nombre: viewAs.nombre,
      email: viewAs.email,
      rol: viewAs.rol,
      activo: true,
    };
  }, [profile, viewAs, isActualSuperadmin]);

  const effectiveEmpresas = useMemo(() => {
    if (viewAs && isActualSuperadmin) return viewAs.empresaNombres;
    return empresaNombres;
  }, [viewAs, isActualSuperadmin, empresaNombres]);

  const value: AuthContextValue = {
    user,
    profile: effectiveProfile,
    isLoading,
    isSuperadmin: effectiveProfile?.rol === "superadmin",
    isAdmin: effectiveProfile?.rol === "admin",
    isEjecutivo: effectiveProfile?.rol === "ejecutivo",
    isCliente: effectiveProfile?.rol === "cliente",
    isStaff: isStaffRole(effectiveProfile?.rol),
    empresaNombres: effectiveEmpresas,
    isExternalUser: !user,
    refetch: loadSession,
    realProfile: profile,
    isActualSuperadmin,
    viewAs: isActualSuperadmin ? viewAs : null,
    setViewAs,
    clearViewAs,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

const EMPTY_AUTH: AuthContextValue = {
  user: null,
  profile: null,
  isLoading: true,
  isSuperadmin: false,
  isAdmin: false,
  isEjecutivo: false,
  isCliente: false,
  isStaff: false,
  empresaNombres: [],
  isExternalUser: true,
  refetch: async () => {},
  realProfile: null,
  isActualSuperadmin: false,
  viewAs: null,
  setViewAs: () => {},
  clearViewAs: () => {},
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  return ctx ?? EMPTY_AUTH;
}
