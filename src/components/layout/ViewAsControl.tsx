import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import {
  getRolLabel,
  useAuth,
  type UserRole,
  type ViewAsState,
} from "@/lib/auth/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { filterNombresVisibles } from "@/lib/clientesOcultos";
import {
  headerChromeBtn,
  IconEye,
  type HeaderChromeTone,
} from "@/components/layout/HeaderActionIcons";

const VIEW_AS_ROLES: UserRole[] = ["admin", "ejecutivo", "operador", "cliente"];

type UsuarioOption = {
  id: string;
  nombre: string;
  email: string;
  rol: UserRole;
};

type Step = "closed" | "rol" | "usuario";

export function ViewAsControl({ tone = "dark" }: { tone?: HeaderChromeTone }) {
  const { isActualSuperadmin, viewAs, setViewAs, clearViewAs } = useAuth();
  const [step, setStep] = useState<Step>("closed");
  const [rolPick, setRolPick] = useState<UserRole | null>(null);
  const [usuarios, setUsuarios] = useState<UsuarioOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  const close = useCallback(() => {
    setStep("closed");
    setRolPick(null);
    setUsuarios([]);
    setQuery("");
  }, []);

  useEffect(() => {
    if (step === "closed") return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [step, close]);

  const loadUsuarios = useCallback(
    async (rol: UserRole) => {
      if (!supabase) return;
      setLoadingUsers(true);
      try {
        const { data, error } = await supabase
          .from("usuarios")
          .select("id, nombre, email, rol")
          .eq("rol", rol)
          .eq("activo", true)
          .order("nombre");
        if (error) {
          setUsuarios([]);
          return;
        }
        setUsuarios(
          (data ?? []).map((u) => ({
            id: u.id as string,
            nombre: (u.nombre as string) || (u.email as string) || "Usuario",
            email: (u.email as string) || "",
            rol: u.rol as UserRole,
          })),
        );
      } finally {
        setLoadingUsers(false);
      }
    },
    [supabase],
  );

  const pickRol = async (rol: UserRole) => {
    setRolPick(rol);
    setQuery("");
    setStep("usuario");
    await loadUsuarios(rol);
  };

  const pickUsuario = async (u: UsuarioOption) => {
    if (!supabase) return;
    let empresaNombres: string[] = [];
    if (u.rol === "cliente" || u.rol === "ejecutivo") {
      const { data: ueData } = await supabase
        .from("usuarios_empresas")
        .select("empresas(nombre)")
        .eq("usuario_id", u.id);
      empresaNombres = filterNombresVisibles(
        (ueData ?? [])
          .map((r) => (r.empresas as unknown as { nombre: string } | null)?.nombre)
          .filter((n): n is string => !!n),
      );
    }

    const next: ViewAsState = {
      rol: u.rol,
      usuarioId: u.id,
      nombre: u.nombre,
      email: u.email,
      empresaNombres,
    };
    setViewAs(next);
    close();
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return usuarios;
    return usuarios.filter(
      (u) =>
        u.nombre.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    );
  }, [usuarios, query]);

  if (!isActualSuperadmin) return null;

  const active = Boolean(viewAs);
  const dark = tone === "dark";

  const triggerClass = active
    ? dark
      ? "inline-flex h-10 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-semibold tracking-wide text-amber-200 bg-amber-400/15 ring-1 ring-amber-300/30 hover:bg-amber-400/25"
      : "inline-flex h-8 items-center gap-1.5 rounded-sm px-2 text-[11px] font-semibold text-amber-800 bg-amber-50 ring-1 ring-amber-200 hover:bg-amber-100"
    : dark
      ? "inline-flex h-10 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-semibold tracking-wide text-white/90 transition-colors hover:bg-white/10 hover:text-white"
      : `${headerChromeBtn(tone)} min-w-8 gap-1 px-1.5 text-[10px] font-bold tracking-[0.06em]`;

  const menuClass = dark
    ? "absolute right-0 top-[calc(100%+6px)] z-[200] w-[min(18rem,calc(100vw-1.5rem))] overflow-hidden rounded-lg border border-white/15 bg-[#0c1730]/95 py-1 shadow-lg backdrop-blur-xl"
    : "absolute right-0 top-[calc(100%+6px)] z-[200] w-[min(18rem,calc(100vw-1.5rem))] overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg";

  const optionClass = dark
    ? "flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] font-medium text-white/90 transition-colors hover:bg-white/10"
    : "flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] font-medium text-neutral-800 transition-colors hover:bg-neutral-50";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className={triggerClass}
        title={active ? `Viendo como ${viewAs?.nombre}` : "Ver el sistema como otro rol/usuario"}
        aria-label="Ver como"
        aria-haspopup="dialog"
        aria-expanded={step !== "closed"}
        onClick={() => {
          if (step !== "closed") close();
          else setStep("rol");
        }}
      >
        <IconEye size={tone === "dark" ? 18 : 15} />
        <span className="hidden sm:inline">{active ? "Viendo" : "Ver como"}</span>
        <Icon
          icon="lucide:chevron-down"
          width={14}
          height={14}
          className={`${dark ? "text-white/50" : "text-neutral-500"} transition-transform ${step !== "closed" ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {step !== "closed" && (
        <div className={menuClass} role="dialog" aria-label="Ver como">
          <div className={`flex items-center justify-between gap-2 border-b px-3 py-2 ${dark ? "border-white/10" : "border-neutral-100"}`}>
            <p className={`text-[12px] font-semibold ${dark ? "text-white/90" : "text-neutral-800"}`}>
              {step === "rol" ? "Elegir rol" : `Usuarios · ${getRolLabel(rolPick!)}`}
            </p>
            {step === "usuario" ? (
              <button
                type="button"
                className={`text-[11px] font-medium ${dark ? "text-sky-300 hover:text-sky-200" : "text-brand-blue hover:underline"}`}
                onClick={() => {
                  setStep("rol");
                  setRolPick(null);
                  setUsuarios([]);
                  setQuery("");
                }}
              >
                ← Roles
              </button>
            ) : null}
          </div>

          {active ? (
            <button
              type="button"
              className={`${optionClass} ${dark ? "text-amber-200" : "text-amber-800"}`}
              onClick={() => {
                clearViewAs();
                close();
              }}
            >
              <Icon icon="lucide:undo-2" width={16} height={16} aria-hidden />
              <span className="flex-1">Volver a mi sesión</span>
            </button>
          ) : null}

          {step === "rol" &&
            VIEW_AS_ROLES.map((rol) => (
              <button
                key={rol}
                type="button"
                className={optionClass}
                onClick={() => void pickRol(rol)}
              >
                <span className="flex-1">{getRolLabel(rol)}</span>
                <Icon
                  icon="lucide:chevron-right"
                  width={14}
                  height={14}
                  className={dark ? "text-white/40" : "text-neutral-400"}
                  aria-hidden
                />
              </button>
            ))}

          {step === "usuario" && (
            <>
              <div className="px-2 py-2">
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar nombre o email…"
                  className={
                    dark
                      ? "w-full rounded-md border border-white/15 bg-white/5 px-2.5 py-1.5 text-[12px] text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                      : "w-full rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-[12px] text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                  }
                  autoFocus
                />
              </div>
              <div className="max-h-64 overflow-y-auto">
                {loadingUsers ? (
                  <p className={`px-3 py-3 text-[12px] ${dark ? "text-white/50" : "text-neutral-400"}`}>
                    Cargando…
                  </p>
                ) : filtered.length === 0 ? (
                  <p className={`px-3 py-3 text-[12px] ${dark ? "text-white/50" : "text-neutral-400"}`}>
                    No hay usuarios activos con ese rol.
                  </p>
                ) : (
                  filtered.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      className={optionClass}
                      onClick={() => void pickUsuario(u)}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{u.nombre}</span>
                        <span className={`block truncate text-[11px] ${dark ? "text-white/45" : "text-neutral-400"}`}>
                          {u.email}
                        </span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** Barra fija mientras el superadmin simula otra vista. */
export function ViewAsBanner() {
  const { isActualSuperadmin, viewAs, clearViewAs } = useAuth();
  if (!isActualSuperadmin || !viewAs) return null;

  return (
    <div className="pointer-events-auto flex items-center justify-center gap-3 border-b border-amber-500/40 bg-amber-500/95 px-3 py-1.5 text-[12px] font-semibold text-amber-950 shadow-sm">
      <IconEye size={14} />
      <span>
        Viendo como{" "}
        <strong>{getRolLabel(viewAs.rol)}</strong>
        {" · "}
        {viewAs.nombre}
        {viewAs.empresaNombres.length > 0
          ? ` · ${viewAs.empresaNombres.slice(0, 2).join(", ")}${viewAs.empresaNombres.length > 2 ? "…" : ""}`
          : ""}
      </span>
      <button
        type="button"
        onClick={clearViewAs}
        className="rounded-sm bg-amber-950/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide hover:bg-amber-950/25"
      >
        Salir
      </button>
    </div>
  );
}
