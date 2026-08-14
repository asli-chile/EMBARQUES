import { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { withBase } from "@/lib/basePath";
import { useAuth, getRolLabel } from "@/lib/auth/AuthContext";
import { useLocale } from "@/lib/i18n";
import {
  modulePageBg,
  moduleHero,
  moduleLabel,
  moduleInput,
  moduleBtnPrimary,
  moduleBtnSecondary,
  moduleBtnOnHero,
  moduleCard,
  moduleToolbar,
  moduleSectionTitle,
} from "@/lib/ui/moduleStyles";

const ROLES = [
  { value: "superadmin", label: "Superadmin" },
  { value: "admin", label: "Administrador" },
  { value: "ejecutivo", label: "Ejecutivo" },
  { value: "operador", label: "Operador" },
  { value: "cliente", label: "Cliente" },
  { value: "usuario", label: "Sin acceso" },
] as const;

type RolValue = (typeof ROLES)[number]["value"];

const ROL_BADGE: Record<string, string> = {
  superadmin: "bg-violet-100 text-violet-800 border-violet-200",
  admin: "bg-brand-blue/10 text-brand-blue border-brand-blue/25",
  ejecutivo: "bg-teal-50 text-teal-800 border-teal-200",
  operador: "bg-slate-100 text-slate-700 border-slate-200",
  cliente: "bg-emerald-50 text-emerald-800 border-emerald-200",
  usuario: "bg-neutral-100 text-neutral-600 border-neutral-200",
};

function UserAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const initials = (name.trim() || "?").slice(0, 2).toUpperCase();
  const sizeCls = size === "sm" ? "w-9 h-9 text-xs" : "w-10 h-10 text-sm";
  return (
    <div
      className={`${sizeCls} rounded-full bg-gradient-to-br from-brand-blue/15 to-brand-teal/15 border border-brand-blue/20 flex items-center justify-center font-bold text-brand-blue shrink-0`}
    >
      {initials}
    </div>
  );
}

function RoleBadge({ rol }: { rol: string }) {
  const cls = ROL_BADGE[rol] ?? ROL_BADGE.usuario;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${cls}`}>
      {getRolLabel(rol as RolValue)}
    </span>
  );
}

function AccountBadge({ active }: { active: boolean }) {
  if (active) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <Icon icon="lucide:check-circle-2" width={12} height={12} />
        Activa
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
      <Icon icon="lucide:clock" width={12} height={12} />
      Pendiente
    </span>
  );
}

type DbUsuario = {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  activo: boolean;
  auth_id: string | null;
};

type EmpresaRow = { id: string; nombre: string };

export function UsuariosContent() {
  const { t } = useLocale();
  const { isSuperadmin, profile, isLoading: authLoading } = useAuth();
  const [usuarios, setUsuarios] = useState<DbUsuario[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaRow[]>([]);
  const [empresasPorUsuario, setEmpresasPorUsuario] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    nombre: "",
    rol: "operador",
    empresaIds: [] as string[],
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [editingUser, setEditingUser] = useState<DbUsuario | null>(null);
  const [editForm, setEditForm] = useState<{ rol: string; empresaIds: string[] }>({ rol: "usuario", empresaIds: [] });
  const [editError, setEditError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const [bulkAssigningUsers, setBulkAssigningUsers] = useState<DbUsuario[]>([]);
  const [assignEmpresaIds, setAssignEmpresaIds] = useState<string[]>([]);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [filterRol, setFilterRol] = useState<string>("");
  const [filterEmpresaId, setFilterEmpresaId] = useState<string>("");

  const [activatingUser, setActivatingUser] = useState<DbUsuario | null>(null);
  const [activatePassword, setActivatePassword] = useState("");
  const [activateError, setActivateError] = useState<string | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  const [showActivatePassword, setShowActivatePassword] = useState(false);

  const [changePasswordCurrent, setChangePasswordCurrent] = useState("");
  const [changePasswordNew, setChangePasswordNew] = useState("");
  const [changePasswordConfirm, setChangePasswordConfirm] = useState("");
  const [changePasswordVerified, setChangePasswordVerified] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showChangePasswordCurrent, setShowChangePasswordCurrent] = useState(false);
  const [showChangePasswordNew, setShowChangePasswordNew] = useState(false);

  const [resettingUser, setResettingUser] = useState<DbUsuario | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingUser, setViewingUser] = useState<DbUsuario | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(withBase("/api/usuarios-empresas"), {
        credentials: "include",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const json = (await res.json()) as {
        usuarios?: DbUsuario[];
        empresas?: EmpresaRow[];
        empresasPorUsuario?: Record<string, string[]>;
        error?: string;
      };
      if (!res.ok) {
        setError(json.error ?? `Error ${res.status}`);
        setUsuarios([]);
        setEmpresas([]);
        setEmpresasPorUsuario({});
        return;
      }
      setUsuarios(json.usuarios ?? []);
      setEmpresas(json.empresas ?? []);
      setEmpresasPorUsuario(json.empresasPorUsuario ?? {});
      setError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al cargar";
      setError(msg.includes("abort") ? "La solicitud tardó demasiado. Revisa la conexión." : msg);
      setUsuarios([]);
      setEmpresas([]);
      setEmpresasPorUsuario({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setCreateError(null);
      setCreateSuccess(false);
      setIsCreating(true);
      try {
        const res = await fetch(withBase("/api/auth/create-user"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: form.email.trim(),
            password: form.password,
            nombre: form.nombre.trim() || undefined,
            rol: form.rol,
            empresaIds: form.rol === "cliente" || form.rol === "ejecutivo" ? form.empresaIds : [],
          }),
          credentials: "include",
        });
        const data = await res.json();
        if (data.success) {
          setCreateSuccess(true);
          setForm({ email: "", password: "", nombre: "", rol: "operador", empresaIds: [] });
          setShowCreateModal(false);
          void fetchData();
        } else {
          setCreateError(data.error ?? "Error al crear usuario");
        }
      } finally {
        setIsCreating(false);
      }
    },
    [form, fetchData]
  );

  const handleToggleEmpresa = (id: string) => {
    setForm((prev) => ({
      ...prev,
      empresaIds: prev.empresaIds.includes(id)
        ? prev.empresaIds.filter((e) => e !== id)
        : [...prev.empresaIds, id],
    }));
  };

  const handleEditOpen = (u: DbUsuario) => {
    setEditingUser(u);
    setEditForm({
      rol: u.rol,
      empresaIds: empresasPorUsuario[u.id] ?? [],
    });
    setEditError(null);
    setChangePasswordCurrent("");
    setChangePasswordNew("");
    setChangePasswordConfirm("");
    setChangePasswordVerified(false);
    setChangePasswordError(null);
  };

  const handleEditClose = () => {
    setEditingUser(null);
    setEditError(null);
    setChangePasswordCurrent("");
    setChangePasswordNew("");
    setChangePasswordConfirm("");
    setChangePasswordVerified(false);
    setChangePasswordError(null);
  };

  const filteredUsuarios = usuarios.filter((u) => {
    if (filterRol && u.rol !== filterRol) return false;
    if (filterEmpresaId) {
      const ids = empresasPorUsuario[u.id] ?? [];
      if (!ids.includes(filterEmpresaId)) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!u.nombre?.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const activosCount = usuarios.filter((u) => u.auth_id).length;
  const pendientesCount = usuarios.filter((u) => !u.auth_id).length;
  const clientesCount = usuarios.filter((u) => u.rol === "cliente").length;
  const hasActiveFilters = Boolean(filterRol || filterEmpresaId || searchQuery.trim());

  const usuariosAsignables = usuarios.filter((u) => u.rol === "cliente" || u.rol === "ejecutivo");
  const asignablesFromFiltered = filteredUsuarios.filter(
    (u) => u.rol === "cliente" || u.rol === "ejecutivo"
  );

  const handleBulkAssignOpen = () => {
    const toAssign = usuariosAsignables.filter((u) => selectedUserIds.has(u.id));
    if (toAssign.length === 0) return;
    setBulkAssigningUsers(toAssign);
    setAssignEmpresaIds([]);
    setAssignError(null);
  };

  const handleAssignClose = () => {
    setBulkAssigningUsers([]);
    setAssignError(null);
  };

  const handleToggleSelect = (u: DbUsuario) => {
    if (u.rol !== "cliente" && u.rol !== "ejecutivo") return;
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(u.id)) next.delete(u.id);
      else next.add(u.id);
      return next;
    });
  };

  const handleSelectAllAsignables = () => {
    const allIds = new Set(asignablesFromFiltered.map((u) => u.id));
    const allSelected = allIds.size > 0 && asignablesFromFiltered.every((u) => selectedUserIds.has(u.id));
    setSelectedUserIds(allSelected ? new Set() : allIds);
  };

  const handleActivateOpen = (u: DbUsuario) => {
    setActivatingUser(u);
    setActivatePassword("");
    setActivateError(null);
    setShowActivatePassword(false);
  };

  const handleActivateClose = () => {
    setActivatingUser(null);
    setActivatePassword("");
    setActivateError(null);
  };

  const handleViewOpen = (u: DbUsuario) => setViewingUser(u);
  const handleViewClose = () => setViewingUser(null);

  const handleResetOpen = (u: DbUsuario) => {
    setResettingUser(u);
    setResetPassword("");
    setResetError(null);
    setShowResetPassword(false);
  };

  const handleResetClose = () => {
    setResettingUser(null);
    setResetPassword("");
    setResetError(null);
  };

  const handleResetSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!resettingUser || resetPassword.length < 6) return;
      setResetError(null);
      setIsResetting(true);
      try {
        const res = await fetch(withBase("/api/auth/reset-user"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ usuarioId: resettingUser.id, newPassword: resetPassword }),
        });
        const data = (await res.json()) as { success?: boolean; error?: string };
        if (!res.ok || !data.success) {
          setResetError(data.error ?? "Error al resetear usuario");
          return;
        }
        handleResetClose();
        void fetchData();
      } catch (err) {
        setResetError(err instanceof Error ? err.message : "Error al resetear");
      } finally {
        setIsResetting(false);
      }
    },
    [resettingUser, resetPassword, fetchData]
  );

  const handleActivateSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!activatingUser || activatePassword.length < 6) return;
      setActivateError(null);
      setIsActivating(true);
      try {
        const res = await fetch(withBase("/api/auth/activate-user"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ usuarioId: activatingUser.id, password: activatePassword }),
        });
        const data = (await res.json()) as { success?: boolean; error?: string };
        if (!res.ok || !data.success) {
          setActivateError(data.error ?? "Error al activar la cuenta");
          return;
        }
        handleActivateClose();
        void fetchData();
      } catch (err) {
        setActivateError(err instanceof Error ? err.message : "Error al activar");
      } finally {
        setIsActivating(false);
      }
    },
    [activatingUser, activatePassword, fetchData]
  );

  const handleVerifyCurrentPassword = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingUser || !changePasswordCurrent) return;
      setChangePasswordError(null);
      setIsVerifying(true);
      try {
        const res = await fetch(withBase("/api/auth/verify-user-password"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            usuarioId: editingUser.id,
            currentPassword: changePasswordCurrent,
          }),
        });
        const data = (await res.json()) as { success?: boolean; verified?: boolean; error?: string };
        if (res.ok && data.verified) {
          setChangePasswordVerified(true);
          setChangePasswordError(null);
        } else {
          setChangePasswordError(data.error ?? "Contraseña actual incorrecta");
        }
      } catch (err) {
        setChangePasswordError(err instanceof Error ? err.message : "Error al verificar");
      } finally {
        setIsVerifying(false);
      }
    },
    [editingUser, changePasswordCurrent]
  );

  const handleChangePasswordSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingUser || !changePasswordVerified) return;
      if (changePasswordNew.length < 6) {
        setChangePasswordError("La nueva contraseña debe tener al menos 6 caracteres");
        return;
      }
      if (changePasswordNew !== changePasswordConfirm) {
        setChangePasswordError("Las contraseñas nuevas no coinciden");
        return;
      }
      setChangePasswordError(null);
      setIsChangingPassword(true);
      try {
        const res = await fetch(withBase("/api/auth/change-password"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            usuarioId: editingUser.id,
            currentPassword: changePasswordCurrent,
            newPassword: changePasswordNew,
          }),
        });
        const data = (await res.json()) as { success?: boolean; error?: string };
        if (!res.ok || !data.success) {
          setChangePasswordError(data.error ?? "Error al cambiar contraseña");
          return;
        }
        handleEditClose();
      } catch (err) {
        setChangePasswordError(err instanceof Error ? err.message : "Error al cambiar contraseña");
      } finally {
        setIsChangingPassword(false);
      }
    },
    [editingUser, changePasswordVerified, changePasswordCurrent, changePasswordNew, changePasswordConfirm]
  );

  const handleToggleAssignEmpresa = (empresaId: string) => {
    setAssignEmpresaIds((prev) =>
      prev.includes(empresaId) ? prev.filter((e) => e !== empresaId) : [...prev, empresaId]
    );
  };

  const handleAssignSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (bulkAssigningUsers.length === 0) return;
      setAssignError(null);
      setIsAssigning(true);
      try {
        const results = await Promise.all(
          bulkAssigningUsers.map(async (u) => {
            const currentIds = empresasPorUsuario[u.id] ?? [];
            const mergedIds = [...new Set([...currentIds, ...assignEmpresaIds])];
            const res = await fetch(withBase("/api/usuarios-empresas"), {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ id: u.id, rol: u.rol, empresaIds: mergedIds }),
            });
            const data = (await res.json()) as { ok?: boolean; error?: string };
            return { ok: res.ok && data.ok, error: data.error };
          })
        );
        const failed = results.filter((r) => !r.ok);
        if (failed.length > 0) {
          setAssignError(failed[0].error ?? "Error al actualizar asignaciones");
          return;
        }
        handleAssignClose();
        setSelectedUserIds(new Set());
        void fetchData();
      } catch (err) {
        setAssignError(err instanceof Error ? err.message : "Error al actualizar");
      } finally {
        setIsAssigning(false);
      }
    },
    [bulkAssigningUsers, assignEmpresaIds, empresasPorUsuario, fetchData]
  );

  const handleToggleEmpresaEdit = (empresaId: string) => {
    setEditForm((prev) => ({
      ...prev,
      empresaIds: prev.empresaIds.includes(empresaId)
        ? prev.empresaIds.filter((e) => e !== empresaId)
        : [...prev.empresaIds, empresaId],
    }));
  };

  const handleEditSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingUser) return;
      setEditError(null);
      setIsUpdating(true);
      try {
        const res = await fetch(withBase("/api/usuarios-empresas"), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            id: editingUser.id,
            rol: editForm.rol,
            empresaIds: editForm.rol === "cliente" || editForm.rol === "ejecutivo" ? editForm.empresaIds : [],
          }),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !data.ok) {
          setEditError(data.error ?? "Error al actualizar");
          return;
        }
        handleEditClose();
        void fetchData();
      } catch (err) {
        setEditError(err instanceof Error ? err.message : "Error al actualizar");
      } finally {
        setIsUpdating(false);
      }
    },
    [editingUser, editForm, fetchData]
  );

  const apiAuthorized = !loading && usuarios.length > 0 && !error;
  if (error && !loading) {
    return (
      <main className={`flex-1 min-h-0 overflow-auto ${modulePageBg} p-6`} role="main">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-brand-blue">{t.sidebar.usuarios}</h1>
          <p className="mt-2 text-neutral-600">{error}</p>
          {error.includes("superadmin") || error.includes("403") ? (
            <p className="mt-1 text-sm text-neutral-500">Solo el superadmin puede gestionar usuarios.</p>
          ) : null}
        </div>
      </main>
    );
  } else if (authLoading && usuarios.length === 0) {
    return (
      <main className={`flex-1 min-h-0 overflow-auto ${modulePageBg} p-6 flex items-center justify-center`} role="main">
        <p className="text-neutral-500">Cargando…</p>
      </main>
    );
  } else if (loading && usuarios.length === 0) {
    return (
      <main className={`flex-1 min-h-0 overflow-auto ${modulePageBg} p-6`} role="main">
        <div className="flex items-center justify-center h-48">
          <span className="text-neutral-500">Cargando usuarios…</span>
        </div>
      </main>
    );
  } else if (!profile && !apiAuthorized) {
    return (
      <main className={`flex-1 min-h-0 overflow-auto ${modulePageBg} p-6`} role="main">
        <p className="text-neutral-600">Inicia sesión para continuar.</p>
      </main>
    );
  } else if (!isSuperadmin && !apiAuthorized) {
    return (
      <main className={`flex-1 min-h-0 overflow-auto ${modulePageBg} p-6`} role="main">
        <p className="text-neutral-600">Solo el superadmin puede gestionar usuarios y configuración.</p>
      </main>
    );
  }

  return (
    <main className={`flex-1 min-h-0 flex flex-col ${modulePageBg} overflow-hidden`} role="main">

      {/* Hero */}
      <div className={`flex-shrink-0 ${moduleHero}`}>
        <div className="px-4 pt-5 pb-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-white/15 border border-white/25 backdrop-blur-sm flex items-center justify-center shrink-0">
                <Icon icon="lucide:users" width={24} height={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold leading-tight tracking-tight">{t.sidebar.usuarios}</h1>
                <p className="text-base text-white/75 mt-1">Cuentas, roles, empresas y acceso al sistema</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setCreateError(null);
                setCreateSuccess(false);
                setShowCreateModal(true);
              }}
              className={moduleBtnOnHero}
            >
              <Icon icon="lucide:user-plus" width={18} height={18} />
              Nueva cuenta
            </button>
          </div>
          <div className="flex gap-2 mt-4 flex-wrap">
            <div className="flex items-center gap-1.5 bg-white/15 rounded-xl px-3 py-1.5">
              <Icon icon="lucide:users" width={13} height={13} className="text-white/80" />
              <span className="text-sm font-semibold">{usuarios.length} total</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/15 rounded-xl px-3 py-1.5">
              <Icon icon="lucide:user-check" width={13} height={13} className="text-white/80" />
              <span className="text-sm font-semibold">{activosCount} activo{activosCount !== 1 ? "s" : ""}</span>
            </div>
            {pendientesCount > 0 && (
              <div className="flex items-center gap-1.5 bg-amber-400/20 border border-amber-300/30 rounded-xl px-3 py-1.5">
                <Icon icon="lucide:clock" width={13} height={13} className="text-amber-100" />
                <span className="text-sm font-semibold text-amber-50">{pendientesCount} pendiente{pendientesCount !== 1 ? "s" : ""}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 bg-white/15 rounded-xl px-3 py-1.5">
              <Icon icon="lucide:building-2" width={13} height={13} className="text-white/80" />
              <span className="text-sm font-semibold">{clientesCount} cliente{clientesCount !== 1 ? "s" : ""}</span>
            </div>
          </div>
        </div>
      </div>

      <section className={`flex-1 min-h-0 flex flex-col mx-3 mb-3 mt-3 sm:mx-4 sm:mb-4 ${moduleCard}`}>
        {/* Toolbar */}
        <div className={`flex-shrink-0 px-4 py-3 ${moduleToolbar} space-y-3`}>
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Icon icon="lucide:search" width={16} height={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-blue/40" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre o correo…"
                className={`${moduleInput} pl-10 pr-9`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-brand-blue/40 hover:text-brand-blue rounded-lg"
                  aria-label="Limpiar búsqueda"
                >
                  <Icon icon="lucide:x" width={14} height={14} />
                </button>
              )}
            </div>
            <p className={moduleSectionTitle}>
              {filteredUsuarios.length}
              {hasActiveFilters ? ` de ${usuarios.length}` : ""} usuarios
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              id="filter-rol"
              value={filterRol}
              onChange={(e) => setFilterRol(e.target.value)}
              className={`${moduleInput} w-auto min-w-[140px] py-2.5`}
            >
              <option value="">Todos los roles</option>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <select
              id="filter-empresa"
              value={filterEmpresaId}
              onChange={(e) => setFilterEmpresaId(e.target.value)}
              className={`${moduleInput} w-auto min-w-[140px] max-w-[200px] py-2.5`}
            >
              <option value="">Todas las empresas</option>
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>{e.nombre}</option>
              ))}
            </select>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setFilterRol("");
                  setFilterEmpresaId("");
                  setSearchQuery("");
                }}
                className={`${moduleBtnSecondary} py-2 text-sm`}
              >
                <Icon icon="lucide:filter-x" width={14} height={14} />
                Limpiar
              </button>
            )}
          </div>

          {selectedUserIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 rounded-xl bg-brand-blue/8 border border-brand-blue/15">
              <span className="text-sm font-semibold text-brand-blue">{selectedUserIds.size} seleccionado{selectedUserIds.size !== 1 ? "s" : ""}</span>
              <button
                type="button"
                onClick={handleBulkAssignOpen}
                className={`${moduleBtnPrimary} py-2 text-sm`}
              >
                <Icon icon="lucide:building-2" width={14} height={14} />
                Asignar empresas
              </button>
              <button
                type="button"
                onClick={() => setSelectedUserIds(new Set())}
                className={`${moduleBtnSecondary} py-2 text-sm`}
              >
                Desmarcar
              </button>
            </div>
          )}

          {error && (
            <div className="px-3 py-2 bg-red-50 text-red-700 text-sm rounded-xl border border-red-200 flex items-center gap-2" role="alert">
              <Icon icon="lucide:alert-circle" width={14} height={14} className="shrink-0" />
              {error}
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-auto">
          {/* Mobile cards */}
          <div className="md:hidden p-2 space-y-2">
            {filteredUsuarios.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center px-6">
                <div className="w-14 h-14 rounded-2xl bg-[#F4F8FC] border border-brand-blue/15 flex items-center justify-center">
                  <Icon icon="lucide:users" width={26} height={26} className="text-brand-blue/30" />
                </div>
                <p className="text-sm font-semibold text-brand-blue/70">Sin usuarios</p>
                <p className="text-xs text-neutral-400">Prueba otro filtro o crea una cuenta nueva.</p>
              </div>
            ) : (
              filteredUsuarios.map((u) => {
                const ids = empresasPorUsuario[u.id] ?? [];
                const nombresEmpresas = ids.map((eid) => empresas.find((e) => e.id === eid)?.nombre).filter(Boolean) as string[];
                const canAssign = u.rol === "cliente" || u.rol === "ejecutivo";
                return (
                  <article
                    key={u.id}
                    className="rounded-xl border border-brand-blue/15 bg-[#F4F8FC] overflow-hidden shadow-sm"
                  >
                    <div className="h-[3px] bg-gradient-to-r from-brand-blue to-brand-teal" />
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        {canAssign ? (
                          <input
                            type="checkbox"
                            checked={selectedUserIds.has(u.id)}
                            onChange={() => handleToggleSelect(u)}
                            className="mt-2 w-4 h-4 rounded border-brand-blue/30 accent-brand-blue"
                            aria-label={`Seleccionar ${u.nombre}`}
                          />
                        ) : (
                          <span className="w-4 mt-2" aria-hidden="true" />
                        )}
                        <UserAvatar name={u.nombre || u.email} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => handleViewOpen(u)}
                              className="font-bold text-brand-blue text-left truncate hover:underline"
                            >
                              {u.nombre || "—"}
                            </button>
                            <AccountBadge active={Boolean(u.auth_id)} />
                          </div>
                          <p className="text-xs text-neutral-500 truncate mt-0.5">{u.email}</p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <RoleBadge rol={u.rol} />
                          </div>
                          {nombresEmpresas.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {nombresEmpresas.map((n) => (
                                <span key={n} className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-white border border-brand-blue/15 text-brand-blue">
                                  {n}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-3">
                            {!u.auth_id ? (
                              <button type="button" onClick={() => handleActivateOpen(u)} className={`${moduleBtnSecondary} flex-1 justify-center py-2 text-xs`}>
                                <Icon icon="lucide:key-round" width={13} height={13} /> Activar
                              </button>
                            ) : (
                              <button type="button" onClick={() => handleResetOpen(u)} className={`${moduleBtnSecondary} flex-1 justify-center py-2 text-xs`}>
                                <Icon icon="lucide:refresh-cw" width={13} height={13} /> Resetear
                              </button>
                            )}
                            <button type="button" onClick={() => handleEditOpen(u)} className={`${moduleBtnPrimary} flex-1 justify-center py-2 text-xs`}>
                              <Icon icon="lucide:pencil" width={13} height={13} /> Editar
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          {/* Desktop table */}
          <table className="hidden md:table w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-[#E4EBF6] border-b border-brand-blue/15">
              <tr>
                <th className="px-4 py-3.5 text-center w-12">
                  {asignablesFromFiltered.length > 0 && (
                    <input
                      type="checkbox"
                      checked={asignablesFromFiltered.length > 0 && asignablesFromFiltered.every((u) => selectedUserIds.has(u.id))}
                      onChange={handleSelectAllAsignables}
                      className="w-4 h-4 rounded border-brand-blue/30 accent-brand-blue"
                      aria-label="Seleccionar clientes y ejecutivos visibles"
                    />
                  )}
                </th>
                <th className="px-4 py-3.5 text-left text-sm font-bold text-brand-blue">Usuario</th>
                <th className="px-4 py-3.5 text-left text-sm font-bold text-brand-blue w-32">Rol</th>
                <th className="hidden lg:table-cell px-4 py-3.5 text-left text-sm font-bold text-brand-blue min-w-[160px]">Empresas</th>
                <th className="px-4 py-3.5 text-center text-sm font-bold text-brand-blue w-28">Cuenta</th>
                <th className="px-4 py-3.5 text-center text-sm font-bold text-brand-blue w-36">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsuarios.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Icon icon="lucide:users" width={32} height={32} className="text-brand-blue/25" />
                      <p className="text-sm font-semibold text-brand-blue/60">Sin resultados</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsuarios.map((u, idx) => {
                  const ids = empresasPorUsuario[u.id] ?? [];
                  const nombresEmpresas = ids.map((eid) => empresas.find((e) => e.id === eid)?.nombre).filter(Boolean) as string[];
                  const canAssign = u.rol === "cliente" || u.rol === "ejecutivo";
                  return (
                    <tr
                      key={u.id}
                      className={`border-b border-brand-blue/10 transition-colors hover:bg-brand-blue/[0.06] ${
                        idx % 2 === 0 ? "bg-[#F4F8FC]" : "bg-[#EAF0F8]"
                      }`}
                    >
                      <td className="px-4 py-3.5 text-center">
                        {canAssign ? (
                          <input
                            type="checkbox"
                            checked={selectedUserIds.has(u.id)}
                            onChange={() => handleToggleSelect(u)}
                            className="w-4 h-4 rounded border-brand-blue/30 accent-brand-blue"
                            aria-label={`Seleccionar ${u.nombre}`}
                          />
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <UserAvatar name={u.nombre || u.email} size="sm" />
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => handleViewOpen(u)}
                              className="font-bold text-brand-blue truncate hover:underline text-left block max-w-[220px]"
                            >
                              {u.nombre || "—"}
                            </button>
                            <p className="text-xs text-neutral-500 truncate max-w-[240px]">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5"><RoleBadge rol={u.rol} /></td>
                      <td className="hidden lg:table-cell px-4 py-3.5">
                        {nombresEmpresas.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[220px]">
                            {nombresEmpresas.slice(0, 2).map((n) => (
                              <span key={n} className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-white border border-brand-blue/15 text-brand-blue truncate max-w-[100px]">
                                {n}
                              </span>
                            ))}
                            {nombresEmpresas.length > 2 && (
                              <span className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-brand-blue/10 text-brand-blue">
                                +{nombresEmpresas.length - 2}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-neutral-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {u.auth_id ? (
                          <AccountBadge active />
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleActivateOpen(u)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
                          >
                            <Icon icon="lucide:key-round" width={13} height={13} />
                            Activar
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-center gap-1">
                          {u.auth_id && (
                            <button
                              type="button"
                              onClick={() => handleResetOpen(u)}
                              title="Resetear contraseña"
                              className="p-2 rounded-lg text-amber-600 hover:bg-amber-50 border border-transparent hover:border-amber-200 transition-colors"
                            >
                              <Icon icon="lucide:refresh-cw" width={15} height={15} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleEditOpen(u)}
                            title="Editar usuario"
                            className="p-2 rounded-lg text-brand-blue hover:bg-brand-blue/10 border border-transparent hover:border-brand-blue/20 transition-colors"
                          >
                            <Icon icon="lucide:pencil" width={15} height={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleViewOpen(u)}
                            title="Ver detalle"
                            className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 border border-transparent hover:border-neutral-200 transition-colors"
                          >
                            <Icon icon="lucide:eye" width={15} height={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-end sm:items-center justify-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-user-modal-title"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl shadow-mac-modal w-full sm:max-w-lg max-h-[92dvh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-[3px] bg-gradient-to-r from-brand-blue to-brand-teal flex-shrink-0" />
            <div className="flex-shrink-0 px-5 sm:px-6 py-4 border-b border-brand-blue/10 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-blue flex items-center justify-center shrink-0">
                  <Icon icon="lucide:user-plus" width={18} height={18} className="text-white" />
                </div>
                <div>
                  <h2 id="create-user-modal-title" className="text-lg font-bold text-brand-blue">Nueva cuenta</h2>
                  <p className="text-sm text-neutral-500 mt-0.5">Correo, contraseña, rol y empresas opcionales</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
                aria-label="Cerrar"
              >
                <Icon icon="lucide:x" width={16} height={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-4">
              <div>
                <label htmlFor="create-email" className={moduleLabel}>Correo</label>
                <input
                  id="create-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className={moduleInput}
                  placeholder="usuario@empresa.com"
                />
              </div>
              <div>
                <label htmlFor="create-password" className={moduleLabel}>Contraseña</label>
                <div className="relative">
                  <input
                    id="create-password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    className={`${moduleInput} pr-10`}
                    placeholder="Mín. 6 caracteres"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-brand-blue/40 hover:text-brand-blue rounded-lg"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    <Icon icon={showPassword ? "lucide:eye-off" : "lucide:eye"} width={16} height={16} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="create-nombre" className={moduleLabel}>Nombre</label>
                  <input
                    id="create-nombre"
                    type="text"
                    value={form.nombre}
                    onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                    className={moduleInput}
                    placeholder="Nombre completo"
                  />
                </div>
                <div>
                  <label htmlFor="create-rol" className={moduleLabel}>Rol</label>
                  <select
                    id="create-rol"
                    value={form.rol}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        rol: e.target.value,
                        empresaIds: e.target.value === "cliente" || e.target.value === "ejecutivo" ? f.empresaIds : [],
                      }))
                    }
                    className={moduleInput}
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              {(form.rol === "cliente" || form.rol === "ejecutivo") && empresas.length > 0 && (
                <div>
                  <label className={moduleLabel}>Empresas asignadas</label>
                  <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-3 border border-brand-blue/15 rounded-xl bg-[#F4F8FC]">
                    {empresas.map((emp) => (
                      <label
                        key={emp.id}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-brand-blue/15 cursor-pointer hover:border-brand-blue/30 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={form.empresaIds.includes(emp.id)}
                          onChange={() => handleToggleEmpresa(emp.id)}
                          className="rounded border-brand-blue/30 accent-brand-blue"
                        />
                        <span className="truncate max-w-[160px]">{emp.nombre}</span>
                      </label>
                    ))}
                  </div>
                  {form.empresaIds.length === 0 && (
                    <p className="text-amber-600 text-xs mt-1.5">Selecciona al menos una empresa.</p>
                  )}
                </div>
              )}
              {createError && (
                <div className="px-3 py-2 bg-red-50 text-red-700 text-sm rounded-xl border border-red-200" role="alert">
                  {createError}
                </div>
              )}
              {createSuccess && (
                <div className="px-3 py-2 bg-emerald-50 text-emerald-700 text-sm rounded-xl border border-emerald-200" role="status">
                  Cuenta creada correctamente.
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowCreateModal(false)} className={`${moduleBtnSecondary} flex-1 justify-center`}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating || ((form.rol === "cliente" || form.rol === "ejecutivo") && form.empresaIds.length === 0)}
                  className={`${moduleBtnPrimary} flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isCreating ? "Creando…" : "Crear cuenta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {bulkAssigningUsers.length > 0 && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="assign-modal-title"
          onClick={handleAssignClose}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl shadow-mac-modal w-full sm:max-w-md max-h-[92dvh] sm:max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-[3px] bg-gradient-to-r from-brand-blue to-brand-teal flex-shrink-0" />
            <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-neutral-200" />
            </div>
            <div className="flex-shrink-0 px-5 sm:px-6 py-4 border-b border-neutral-200 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-brand-blue flex items-center justify-center flex-shrink-0">
                  <Icon icon="lucide:building-2" width={15} height={15} className="text-white" />
                </div>
                <div>
                  <h2 id="assign-modal-title" className="text-base font-bold text-brand-blue">
                    Asignar empresas a {bulkAssigningUsers.length} usuario{bulkAssigningUsers.length !== 1 ? "s" : ""}
                  </h2>
                  <p className="text-sm text-neutral-500 mt-0.5 leading-relaxed">
                    {bulkAssigningUsers.map((u) => u.nombre || u.email).join(", ")}
                  </p>
                  <p className="text-sm text-neutral-400 mt-0.5">
                    Las empresas seleccionadas se añadirán a las existentes.
                  </p>
                </div>
              </div>
              <button type="button" onClick={handleAssignClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors flex-shrink-0" aria-label="Cerrar">
                <Icon icon="lucide:x" width={16} height={16} />
              </button>
            </div>
            <form onSubmit={handleAssignSubmit} className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-4">
              <div>
                <label className={moduleLabel}>
                  Empresas asignadas
                </label>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 border border-brand-blue/20 rounded-lg bg-[#F4F8FC]">
                  {empresas.map((emp) => (
                    <label
                      key={emp.id}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white border border-brand-blue/15 cursor-pointer hover:bg-[#F4F8FC] text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={assignEmpresaIds.includes(emp.id)}
                        onChange={() => handleToggleAssignEmpresa(emp.id)}
                        className="rounded border-neutral-300 text-brand-blue focus:ring-brand-blue/30"
                      />
                      <span>{emp.nombre}</span>
                    </label>
                  ))}
                </div>
                {empresas.length === 0 && (
                  <p className="text-neutral-500 text-sm">No hay empresas disponibles. Créalas en Configuración.</p>
                )}
              </div>

              {assignError && (
                <p className="text-red-600 text-sm" role="alert">
                  {assignError}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleAssignClose}
                  className={`${moduleBtnSecondary} flex-1 justify-center`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isAssigning || assignEmpresaIds.length === 0}
                  className={`${moduleBtnPrimary} flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isAssigning ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activatingUser && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="activate-modal-title"
          onClick={handleActivateClose}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl shadow-mac-modal w-full sm:max-w-md max-h-[92dvh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-[3px] bg-gradient-to-r from-brand-blue to-brand-teal flex-shrink-0" />
            <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-neutral-200" />
            </div>
            <div className="flex-shrink-0 px-5 sm:px-6 py-4 border-b border-neutral-200 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-green-500 flex items-center justify-center flex-shrink-0">
                  <Icon icon="lucide:key-round" width={15} height={15} className="text-white" />
                </div>
                <div>
                  <h2 id="activate-modal-title" className="text-base font-bold text-brand-blue">Activar cuenta</h2>
                  <p className="text-sm text-neutral-500 mt-0.5">{activatingUser.nombre} — {activatingUser.email}</p>
                  <p className="text-sm text-neutral-400 mt-0.5">Asigna una contraseña para crear la cuenta. El usuario podrá iniciar sesión.</p>
                </div>
              </div>
              <button type="button" onClick={handleActivateClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors flex-shrink-0" aria-label="Cerrar">
                <Icon icon="lucide:x" width={16} height={16} />
              </button>
            </div>
            <form onSubmit={handleActivateSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto">
              <div>
                <label htmlFor="activate-password" className={moduleLabel}>
                  Contraseña (mín. 6 caracteres)
                </label>
                <div className="relative">
                  <input
                    id="activate-password"
                    type={showActivatePassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={activatePassword}
                    onChange={(e) => setActivatePassword(e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 pr-9 text-sm focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue outline-none"
                    placeholder="Mínimo 6 caracteres"
                  />
                  <button
                    type="button"
                    onClick={() => setShowActivatePassword((p) => !p)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && e.preventDefault()}
                    tabIndex={0}
                    aria-label={showActivatePassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600 rounded"
                  >
                    <Icon icon={showActivatePassword ? "lucide:eye-off" : "lucide:eye"} width={16} height={16} />
                  </button>
                </div>
              </div>
              {activateError && (
                <p className="text-red-600 text-sm" role="alert">
                  {activateError}
                </p>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleActivateClose}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isActivating || activatePassword.length < 6}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-blue hover:bg-brand-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                >
                  {isActivating ? "Activando…" : "Crear cuenta y vincular"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {resettingUser && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-modal-title"
          onClick={handleResetClose}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl shadow-mac-modal w-full sm:max-w-md max-h-[92dvh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-[3px] bg-gradient-to-r from-amber-500 to-orange-500 flex-shrink-0" />
            <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-neutral-200" />
            </div>
            <div className="flex-shrink-0 px-5 sm:px-6 py-4 border-b border-neutral-200 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0">
                  <Icon icon="lucide:refresh-cw" width={15} height={15} className="text-white" />
                </div>
                <div>
                  <h2 id="reset-modal-title" className="text-base font-bold text-brand-blue">Resetear usuario</h2>
                  <p className="text-sm text-neutral-500 mt-0.5">{resettingUser.nombre} — {resettingUser.email}</p>
                  <p className="text-sm text-neutral-400 mt-0.5">Se borrarán asignaciones y se establecerá nueva contraseña.</p>
                </div>
              </div>
              <button type="button" onClick={handleResetClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors flex-shrink-0" aria-label="Cerrar">
                <Icon icon="lucide:x" width={16} height={16} />
              </button>
            </div>
            <form onSubmit={handleResetSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto">
              <div>
                <label htmlFor="reset-password" className={moduleLabel}>
                  Nueva contraseña (mín. 6 caracteres)
                </label>
                <div className="relative">
                  <input
                    id="reset-password"
                    type={showResetPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 pr-9 text-sm focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue outline-none"
                    placeholder="Mínimo 6 caracteres"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword((p) => !p)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && e.preventDefault()}
                    tabIndex={0}
                    aria-label={showResetPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600 rounded"
                  >
                    <Icon icon={showResetPassword ? "lucide:eye-off" : "lucide:eye"} width={16} height={16} />
                  </button>
                </div>
              </div>
              {resetError && (
                <p className="text-red-600 text-sm" role="alert">
                  {resetError}
                </p>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleResetClose}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isResetting || resetPassword.length < 6}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-amber-300"
                >
                  {isResetting ? "Reseteando…" : "Resetear y guardar contraseña"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingUser && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-modal-title"
          onClick={handleEditClose}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl shadow-mac-modal w-full sm:max-w-md max-h-[92dvh] sm:max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-[3px] bg-gradient-to-r from-brand-blue to-brand-teal flex-shrink-0" />
            <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-neutral-200" />
            </div>
            <div className="flex-shrink-0 px-5 sm:px-6 py-4 border-b border-neutral-200 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-brand-blue flex items-center justify-center flex-shrink-0">
                  <Icon icon="lucide:user-cog" width={15} height={15} className="text-white" />
                </div>
                <div>
                  <h2 id="edit-modal-title" className="text-base font-bold text-brand-blue">Editar usuario</h2>
                  <p className="text-sm text-neutral-500 mt-0.5">{editingUser.nombre} — {editingUser.email}</p>
                </div>
              </div>
              <button type="button" onClick={handleEditClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors flex-shrink-0" aria-label="Cerrar">
                <Icon icon="lucide:x" width={16} height={16} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-4">
              <div>
                <label htmlFor="edit-rol" className={moduleLabel}>
                  Rol
                </label>
                <select
                  id="edit-rol"
                  value={editForm.rol}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      rol: e.target.value,
                      empresaIds: e.target.value === "cliente" || e.target.value === "ejecutivo" ? f.empresaIds : [],
                    }))
                  }
                  className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue outline-none"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              {(editForm.rol === "cliente" || editForm.rol === "ejecutivo") && empresas.length > 0 && (
                <div>
                  <label className={moduleLabel}>
                    Empresas asignadas
                  </label>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border border-brand-blue/20 rounded-lg bg-[#F4F8FC]">
                    {empresas.map((emp) => (
                      <label
                        key={emp.id}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white border border-neutral-200 cursor-pointer hover:bg-neutral-50 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={editForm.empresaIds.includes(emp.id)}
                          onChange={() => handleToggleEmpresaEdit(emp.id)}
                          className="rounded border-neutral-300 text-brand-blue focus:ring-brand-blue/30"
                        />
                        <span>{emp.nombre}</span>
                      </label>
                    ))}
                  </div>
                  {(editForm.rol === "cliente" || editForm.rol === "ejecutivo") && editForm.empresaIds.length === 0 && (
                    <p className="text-amber-600 text-sm mt-1">Debes asignar al menos una empresa.</p>
                  )}
                </div>
              )}

              {editingUser.auth_id && (
                <div className="border-t border-neutral-200 pt-4 space-y-4">
                  <h3 className="text-sm font-semibold text-neutral-800">Cambiar contraseña</h3>
                  {!changePasswordVerified ? (
                    <div className="space-y-3">
                      <div>
                        <label htmlFor="edit-change-current" className={moduleLabel}>
                          Contraseña actual (para autorizar)
                        </label>
                        <div className="relative">
                          <input
                            id="edit-change-current"
                            type={showChangePasswordCurrent ? "text" : "password"}
                            value={changePasswordCurrent}
                            onChange={(e) => setChangePasswordCurrent(e.target.value)}
                            className={`${moduleInput} pr-9`}
                            placeholder="Ingresa la contraseña actual"
                            autoComplete="current-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowChangePasswordCurrent((p) => !p)}
                            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && e.preventDefault()}
                            tabIndex={0}
                            aria-label={showChangePasswordCurrent ? "Ocultar" : "Mostrar"}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600 rounded"
                          >
                            <Icon icon={showChangePasswordCurrent ? "lucide:eye-off" : "lucide:eye"} width={14} height={14} />
                          </button>
                        </div>
                      </div>
                      {changePasswordError && (
                        <p className="text-red-600 text-xs" role="alert">{changePasswordError}</p>
                      )}
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); handleVerifyCurrentPassword(e); }}
                        disabled={isVerifying || !changePasswordCurrent}
                        className="px-3 py-1.5 text-xs font-medium text-brand-blue hover:bg-brand-blue/10 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue/30 disabled:opacity-50"
                      >
                        {isVerifying ? "Verificando…" : "Verificar y continuar"}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs text-green-600 font-medium">Contraseña actual verificada</p>
                      <div>
                        <label htmlFor="edit-change-new" className={moduleLabel}>
                          Nueva contraseña (mín. 6 caracteres)
                        </label>
                        <div className="relative">
                          <input
                            id="edit-change-new"
                            type={showChangePasswordNew ? "text" : "password"}
                            minLength={6}
                            value={changePasswordNew}
                            onChange={(e) => setChangePasswordNew(e.target.value)}
                            className={`${moduleInput} pr-9`}
                            placeholder="Mínimo 6 caracteres"
                            autoComplete="new-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowChangePasswordNew((p) => !p)}
                            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && e.preventDefault()}
                            tabIndex={0}
                            aria-label={showChangePasswordNew ? "Ocultar" : "Mostrar"}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600 rounded"
                          >
                            <Icon icon={showChangePasswordNew ? "lucide:eye-off" : "lucide:eye"} width={14} height={14} />
                          </button>
                        </div>
                      </div>
                      <div>
                        <label htmlFor="edit-change-confirm" className={moduleLabel}>
                          Confirmar nueva contraseña
                        </label>
                        <input
                          id="edit-change-confirm"
                          type="password"
                          minLength={6}
                          value={changePasswordConfirm}
                          onChange={(e) => setChangePasswordConfirm(e.target.value)}
                          className={moduleInput}
                          placeholder="Repite la nueva contraseña"
                          autoComplete="new-password"
                        />
                      </div>
                      {changePasswordError && (
                        <p className="text-red-600 text-xs" role="alert">{changePasswordError}</p>
                      )}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => { setChangePasswordVerified(false); setChangePasswordError(null); }}
                          className="px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 rounded transition-colors"
                        >
                          Atrás
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); handleChangePasswordSubmit(e); }}
                          disabled={
                            isChangingPassword ||
                            changePasswordNew.length < 6 ||
                            changePasswordNew !== changePasswordConfirm
                          }
                          className="px-3 py-1.5 text-xs font-medium text-white bg-brand-blue hover:bg-brand-blue/90 rounded disabled:opacity-50 transition-colors"
                        >
                          {isChangingPassword ? "Actualizando…" : "Cambiar contraseña"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {editError && (
                <p className="text-red-600 text-sm" role="alert">
                  {editError}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleEditClose}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    isUpdating ||
                    ((editForm.rol === "cliente" || editForm.rol === "ejecutivo") && editForm.empresaIds.length === 0)
                  }
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-blue hover:bg-brand-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                >
                  {isUpdating ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingUser && (() => {
        const ids = empresasPorUsuario[viewingUser.id] ?? [];
        const nombresEmpresas = ids.map((eid) => empresas.find((e) => e.id === eid)?.nombre).filter(Boolean) as string[];
        return (
          <div
            className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="view-user-modal-title"
            onClick={handleViewClose}
          >
            <div
              className="bg-white rounded-t-2xl sm:rounded-2xl shadow-mac-modal w-full sm:max-w-md max-h-[92dvh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="h-[3px] bg-gradient-to-r from-brand-blue to-brand-teal flex-shrink-0" />
              <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
                <div className="w-10 h-1 rounded-full bg-neutral-200" />
              </div>
              {/* Header */}
              <div className="flex-shrink-0 px-5 sm:px-6 py-4 border-b border-neutral-200 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <UserAvatar name={viewingUser.nombre || viewingUser.email} />
                  <div>
                    <h2 id="view-user-modal-title" className="text-base font-bold text-brand-blue">
                      {viewingUser.nombre || viewingUser.email}
                    </h2>
                    <p className="text-xs text-neutral-500 mt-0.5">{viewingUser.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleViewClose}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors flex-shrink-0"
                  aria-label="Cerrar"
                >
                  <Icon icon="lucide:x" width={16} height={16} />
                </button>
              </div>
              {/* Body */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                {/* Rol */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                  <div className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                    <Icon icon="lucide:shield" width={15} height={15} className="text-brand-blue" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-neutral-500 mb-1">Rol</p>
                    <RoleBadge rol={viewingUser.rol} />
                  </div>
                </div>
                {/* Estado cuenta */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${viewingUser.auth_id ? "bg-green-100" : "bg-neutral-100"}`}>
                    <Icon
                      icon={viewingUser.auth_id ? "lucide:check-circle" : "lucide:circle-off"}
                      width={15}
                      height={15}
                      className={viewingUser.auth_id ? "text-green-600" : "text-neutral-400"}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-neutral-500 mb-1">Estado de cuenta</p>
                    <AccountBadge active={Boolean(viewingUser.auth_id)} />
                  </div>
                </div>
                {/* Empresas */}
                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                      <Icon icon="lucide:building-2" width={15} height={15} className="text-brand-blue" />
                    </div>
                    <p className="text-xs font-medium text-neutral-500">
                      Empresas asignadas
                      {nombresEmpresas.length > 0 && (
                        <span className="ml-1 text-neutral-400">({nombresEmpresas.length})</span>
                      )}
                    </p>
                  </div>
                  {nombresEmpresas.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mt-1 ml-10">
                      {nombresEmpresas.map((n) => (
                        <span key={n} className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-lg bg-brand-blue/10 text-brand-blue border border-brand-blue/20">
                          {n}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-400 ml-10">Sin empresas asignadas</p>
                  )}
                </div>
                {/* ID interno */}
                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                  <p className="text-sm font-medium text-neutral-400 uppercase tracking-wide mb-0.5">ID interno</p>
                  <p className="text-xs text-neutral-500 font-mono break-all">{viewingUser.id}</p>
                </div>
              </div>
              {/* Footer */}
              <div className="flex-shrink-0 px-5 sm:px-6 py-4 border-t border-neutral-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => { handleViewClose(); handleEditOpen(viewingUser); }}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-brand-blue bg-brand-blue/8 hover:bg-brand-blue/15 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                >
                  <Icon icon="lucide:pencil" width={14} height={14} />
                  Editar usuario
                </button>
                <button
                  type="button"
                  onClick={handleViewClose}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-300"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </main>
  );
}
