import { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { withBase } from "@/lib/basePath";
import { useAuth, getRolLabel } from "@/lib/auth/AuthContext";
import { useLocale } from "@/lib/i18n";

const ROLES = [
  { value: "superadmin", label: "Superadmin" },
  { value: "admin", label: "Administrador" },
  { value: "ejecutivo", label: "Ejecutivo" },
  { value: "operador", label: "Operador" },
  { value: "cliente", label: "Cliente" },
  { value: "usuario", label: "Usuario" },
] as const;

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
    rol: "usuario",
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
  const [showCreateForm, setShowCreateForm] = useState(false);
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
        setForm({ email: "", password: "", nombre: "", rol: "usuario", empresaIds: [] });
        void fetchData();
      } else {
        setCreateError(data.error ?? "Error al crear usuario");
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
    return true;
  });

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
      <main className="flex-1 min-h-0 overflow-auto bg-neutral-100 p-6" role="main">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-bold text-brand-blue">{t.sidebar.usuarios}</h1>
          <p className="mt-2 text-neutral-600">{error}</p>
          {error.includes("superadmin") || error.includes("403") ? (
            <p className="mt-1 text-sm text-neutral-500">Solo el superadmin puede gestionar usuarios.</p>
          ) : null}
        </div>
      </main>
    );
  } else if (authLoading && usuarios.length === 0) {
    return (
      <main className="flex-1 min-h-0 overflow-auto bg-neutral-100 p-6 flex items-center justify-center" role="main">
        <p className="text-neutral-500">Cargando…</p>
      </main>
    );
  } else if (loading && usuarios.length === 0) {
    return (
      <main className="flex-1 min-h-0 overflow-auto bg-neutral-100 p-6" role="main">
        <div className="flex items-center justify-center h-48">
          <span className="text-neutral-500">Cargando usuarios…</span>
        </div>
      </main>
    );
  } else if (!profile && !apiAuthorized) {
    return (
      <main className="flex-1 min-h-0 overflow-auto bg-neutral-100 p-6" role="main">
        <p className="text-neutral-600">Inicia sesión para continuar.</p>
      </main>
    );
  } else if (!isSuperadmin && !apiAuthorized) {
    return (
      <main className="flex-1 min-h-0 overflow-auto bg-neutral-100 p-6" role="main">
        <p className="text-neutral-600">Solo el superadmin puede gestionar usuarios y configuración.</p>
      </main>
    );
  }

  return (
    <main className="flex-1 min-h-0 flex flex-col bg-neutral-100 overflow-hidden" role="main">

      {/* Hero gradient header */}
      <div className="flex-shrink-0 bg-gradient-to-br from-brand-blue via-brand-blue/90 to-indigo-700 text-white">
        <div className="px-4 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
              <Icon icon="lucide:users" width={22} height={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">{t.sidebar.usuarios}</h1>
              <p className="text-xs text-white/70 mt-0.5">Crea cuentas, asigna roles y empresas</p>
            </div>
          </div>
          <div className="flex gap-2 mt-4 flex-wrap">
            <div className="flex items-center gap-1.5 bg-white/15 rounded-xl px-3 py-1.5">
              <Icon icon="lucide:user-check" width={13} height={13} className="text-white/80" />
              <span className="text-xs font-semibold">{usuarios.filter((u) => u.auth_id).length} activo{usuarios.filter((u) => u.auth_id).length !== 1 ? "s" : ""}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/15 rounded-xl px-3 py-1.5">
              <Icon icon="lucide:users" width={13} height={13} className="text-white/80" />
              <span className="text-xs font-semibold">{usuarios.length} total</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3 p-3 sm:gap-4 sm:p-4 overflow-hidden">
        <aside className="flex-shrink-0 lg:w-80 xl:w-96 bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col">
          {/* Aside header — on mobile also acts as toggle */}
          <button
            type="button"
            className="lg:cursor-default w-full px-4 py-3 border-b border-neutral-200 flex items-center gap-3 text-left"
            onClick={() => setShowCreateForm((v) => !v)}
            aria-expanded={showCreateForm}
          >
            <div className="w-9 h-9 rounded-xl bg-brand-blue flex items-center justify-center flex-shrink-0">
              <Icon icon="lucide:user-plus" width={17} height={17} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-neutral-900">Nueva cuenta</p>
              <p className="text-xs text-neutral-500 mt-0.5">Crea cuentas y asígnales roles.</p>
            </div>
            <Icon
              icon={showCreateForm ? "lucide:chevron-up" : "lucide:chevron-down"}
              width={16} height={16}
              className="text-neutral-400 shrink-0 lg:hidden"
            />
          </button>
          <section className={`${showCreateForm ? "block" : "hidden"} lg:block p-4 overflow-y-auto flex-1`}>
            <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">Crear nueva cuenta</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label htmlFor="email" className="block text-xs font-medium text-neutral-600 mb-0.5">Correo</label>
                <input
                  id="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue outline-none"
                  placeholder="usuario@empresa.com"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-xs font-medium text-neutral-600 mb-0.5">Contraseña</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2 pr-9 text-sm focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue outline-none"
                    placeholder="Mín. 6 caracteres"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && e.preventDefault()}
                    tabIndex={0}
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600 rounded"
                  >
                    <Icon icon={showPassword ? "lucide:eye-off" : "lucide:eye"} width={16} height={16} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="nombre" className="block text-xs font-medium text-neutral-600 mb-0.5">Nombre</label>
                  <input
                    id="nombre"
                    type="text"
                    value={form.nombre}
                    onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-blue/30 outline-none"
                    placeholder="Nombre"
                  />
                </div>
                <div>
                  <label htmlFor="rol" className="block text-xs font-medium text-neutral-600 mb-0.5">Rol</label>
                  <select
                    id="rol"
                    value={form.rol}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        rol: e.target.value,
                        empresaIds: e.target.value === "cliente" || e.target.value === "ejecutivo" ? f.empresaIds : [],
                      }))
                    }
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-blue/30 outline-none"
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {(form.rol === "cliente" || form.rol === "ejecutivo") && empresas.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Empresas asignadas</label>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 border border-neutral-200 rounded-lg bg-neutral-50">
                    {empresas.map((emp) => (
                      <label
                        key={emp.id}
                        className="flex items-center gap-1.5 px-2 py-1 rounded bg-white border border-neutral-200 cursor-pointer hover:bg-neutral-50 text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={form.empresaIds.includes(emp.id)}
                          onChange={() => handleToggleEmpresa(emp.id)}
                          className="rounded border-neutral-300 text-brand-blue focus:ring-brand-blue/30"
                        />
                        <span className="truncate max-w-[120px]">{emp.nombre}</span>
                      </label>
                    ))}
                  </div>
                  {(form.rol === "cliente" || form.rol === "ejecutivo") && form.empresaIds.length === 0 && (
                    <p className="text-amber-600 text-xs mt-0.5">Al menos una empresa.</p>
                  )}
                </div>
              )}

              {createError && <p className="text-red-600 text-xs" role="alert">{createError}</p>}
              {createSuccess && <p className="text-green-600 text-xs" role="status">Cuenta creada.</p>}

              <button
                type="submit"
                disabled={isCreating || ((form.rol === "cliente" || form.rol === "ejecutivo") && form.empresaIds.length === 0)}
                className="w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-blue hover:bg-brand-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue/30 shadow-sm"
              >
                Crear cuenta
              </button>
            </form>
          </section>
        </aside>

        <section className="flex-1 min-h-0 flex flex-col bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="flex-shrink-0 px-4 py-3 border-b border-neutral-200 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-sm font-bold text-neutral-900">
                Usuarios existentes{" "}
                <span className="font-normal text-neutral-500 text-xs">
                  ({filteredUsuarios.length}
                  {(filterRol || filterEmpresaId) && ` de ${usuarios.length}`})
                </span>
              </h2>
              <div className="flex items-center gap-2">
              {selectedUserIds.size > 0 && (
                <>
                  <span className="text-xs text-neutral-500">{selectedUserIds.size} seleccionados</span>
                  <button
                    type="button"
                    onClick={handleBulkAssignOpen}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-brand-blue hover:bg-brand-blue/90 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                    aria-label="Asignar empresas a usuarios seleccionados"
                  >
                    <Icon icon="lucide:building-2" width={14} height={14} />
                    Asignar empresas
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedUserIds(new Set())}
                    className="text-xs text-neutral-500 hover:text-neutral-700"
                  >
                    Desmarcar
                  </button>
                </>
              )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <label htmlFor="filter-rol" className="text-xs font-medium text-neutral-600 hidden sm:block">
                  Rol
                </label>
                <select
                  id="filter-rol"
                  value={filterRol}
                  onChange={(e) => setFilterRol(e.target.value)}
                  className="rounded-xl border border-neutral-200 px-2 sm:px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue outline-none"
                >
                  <option value="">Todos los roles</option>
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <label htmlFor="filter-empresa" className="text-xs font-medium text-neutral-600 hidden sm:block">
                  Empresa
                </label>
                <select
                  id="filter-empresa"
                  value={filterEmpresaId}
                  onChange={(e) => setFilterEmpresaId(e.target.value)}
                  className="rounded-xl border border-neutral-200 px-2 sm:px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue outline-none max-w-[120px] sm:max-w-none"
                >
                  <option value="">Todas</option>
                  {empresas.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre}
                    </option>
                  ))}
                </select>
              </div>
              {(filterRol || filterEmpresaId) && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterRol("");
                    setFilterEmpresaId("");
                  }}
                  className="text-xs text-brand-blue hover:underline"
                >
                  Limpiar
                </button>
              )}
            </div>
            {error && <p className="text-red-600 text-xs">{error}</p>}
          </div>
          <div className="flex-1 min-h-0 overflow-auto">

            {/* ── Mobile cards (< md) ── */}
            <div className="md:hidden divide-y divide-neutral-100">
              {filteredUsuarios.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center px-6">
                  <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center">
                    <Icon icon="lucide:users" width={22} height={22} className="text-neutral-300" />
                  </div>
                  <p className="text-sm text-neutral-400">Sin usuarios.</p>
                </div>
              ) : filteredUsuarios.map((u) => {
                const ids = empresasPorUsuario[u.id] ?? [];
                const nombresEmpresas = ids.map((eid) => empresas.find((e) => e.id === eid)?.nombre).filter(Boolean) as string[];
                const canAssign = u.rol === "cliente" || u.rol === "ejecutivo";
                const initials = (u.nombre || u.email).slice(0, 2).toUpperCase();
                return (
                  <div key={u.id} className="p-4 hover:bg-neutral-50 transition-colors">
                    <div className="flex items-start gap-3">
                      {/* Checkbox + avatar */}
                      <div className="flex flex-col items-center gap-2 pt-0.5">
                        {canAssign ? (
                          <input
                            type="checkbox"
                            checked={selectedUserIds.has(u.id)}
                            onChange={() => handleToggleSelect(u)}
                            className="rounded border-neutral-300 text-brand-blue focus:ring-brand-blue/30"
                            aria-label={`Seleccionar ${u.nombre}`}
                          />
                        ) : (
                          <span className="w-4 h-4 inline-block" aria-hidden="true" />
                        )}
                        <div className="w-8 h-8 rounded-full bg-brand-blue/10 flex items-center justify-center text-[11px] font-bold text-brand-blue">
                          {initials}
                        </div>
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => handleViewOpen(u)}
                              className="font-semibold text-neutral-900 text-sm truncate hover:text-brand-blue hover:underline text-left"
                            >
                              {u.nombre || "—"}
                            </button>
                            <p className="text-xs text-neutral-400 truncate">{u.email}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-blue/10 text-brand-blue">
                              {getRolLabel(u.rol as "superadmin" | "admin" | "ejecutivo" | "operador" | "cliente" | "usuario")}
                            </span>
                            {u.auth_id ? (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">
                                <Icon icon="lucide:check" width={9} height={9} />
                                Activa
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 text-neutral-500">
                                Sin cuenta
                              </span>
                            )}
                          </div>
                        </div>
                        {nombresEmpresas.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {nombresEmpresas.map((n) => (
                              <span key={n} className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-brand-blue/8 text-brand-blue">
                                {n}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {!u.auth_id && (
                            <button
                              type="button"
                              onClick={() => handleActivateOpen(u)}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors"
                            >
                              <Icon icon="lucide:key-round" width={13} height={13} />
                              Activar
                            </button>
                          )}
                          {u.auth_id && (
                            <button
                              type="button"
                              onClick={() => handleResetOpen(u)}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors"
                            >
                              <Icon icon="lucide:refresh-cw" width={13} height={13} />
                              Resetear
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleEditOpen(u)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-brand-blue bg-brand-blue/8 hover:bg-brand-blue/15 transition-colors"
                          >
                            <Icon icon="lucide:pencil" width={13} height={13} />
                            Editar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Desktop table (md+) ── */}
            <table className="hidden md:table w-full text-sm">
              <thead className="sticky top-0 bg-neutral-50 z-10 border-b border-neutral-200">
                <tr>
                  <th className="px-4 py-2.5 text-left w-10">
                    {asignablesFromFiltered.length > 0 && (
                      <input
                        type="checkbox"
                        checked={
                          asignablesFromFiltered.length > 0 &&
                          asignablesFromFiltered.every((u) => selectedUserIds.has(u.id))
                        }
                        onChange={handleSelectAllAsignables}
                        className="rounded border-neutral-300 text-brand-blue focus:ring-brand-blue/30"
                        aria-label="Seleccionar todos los clientes y ejecutivos visibles"
                      />
                    )}
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">Nombre</th>
                  <th className="hidden lg:table-cell px-4 py-2.5 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">Correo</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide w-28">Rol</th>
                  <th className="hidden lg:table-cell px-4 py-2.5 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide min-w-[140px]">Empresas</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide w-24">Cuenta</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide min-w-[140px]">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsuarios.map((u) => {
                  const ids = empresasPorUsuario[u.id] ?? [];
                  const nombresEmpresas = ids
                    .map((eid) => empresas.find((e) => e.id === eid)?.nombre)
                    .filter(Boolean) as string[];
                  const canAssign = u.rol === "cliente" || u.rol === "ejecutivo";
                  return (
                  <tr key={u.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                    <td className="px-4 py-2.5">
                      {canAssign ? (
                        <input
                          type="checkbox"
                          checked={selectedUserIds.has(u.id)}
                          onChange={() => handleToggleSelect(u)}
                          className="rounded border-neutral-300 text-brand-blue focus:ring-brand-blue/30"
                          aria-label={`Seleccionar ${u.nombre}`}
                        />
                      ) : (
                        <span className="w-4 inline-block" aria-hidden="true" />
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-medium">
                      <button
                        type="button"
                        onClick={() => handleViewOpen(u)}
                        className="text-left font-medium text-neutral-900 hover:text-brand-blue hover:underline focus:outline-none focus:ring-2 focus:ring-brand-blue/30 rounded"
                      >
                        {u.nombre || "—"}
                      </button>
                    </td>
                    <td className="hidden lg:table-cell px-4 py-2.5 text-neutral-600 text-xs truncate max-w-[160px]">{u.email}</td>
                    <td className="px-4 py-2.5 text-xs">{getRolLabel(u.rol as "superadmin" | "admin" | "ejecutivo" | "operador" | "cliente" | "usuario")}</td>
                    <td className="hidden lg:table-cell px-4 py-2.5">
                      {nombresEmpresas.length > 0 ? (
                        <span className="inline-flex flex-wrap gap-1" title={nombresEmpresas.join(", ")}>
                          {nombresEmpresas.map((n) => (
                            <span key={n} className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-brand-blue/10 text-brand-blue">{n}</span>
                          ))}
                        </span>
                      ) : (
                        <span className="text-neutral-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {u.auth_id ? (
                        <span className="inline-flex items-center gap-1 text-green-600 text-xs">
                          <Icon icon="typcn:tick" width={14} height={14} />
                          Sí
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleActivateOpen(u)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-600 hover:bg-amber-50 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-amber-300"
                          aria-label={`Activar cuenta de ${u.nombre}`}
                        >
                          <Icon icon="lucide:key-round" width={14} height={14} />
                          Activar
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        {u.auth_id && (
                          <button
                            type="button"
                            onClick={() => handleResetOpen(u)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-600 hover:bg-amber-50 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-amber-300"
                          >
                            <Icon icon="typcn:refresh" width={14} height={14} />
                            Resetear
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleEditOpen(u)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-brand-blue hover:bg-brand-blue/10 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                        >
                          <Icon icon="typcn:edit" width={14} height={14} />
                          Editar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

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
                  <h2 id="assign-modal-title" className="text-sm font-bold text-neutral-900">
                    Asignar empresas a {bulkAssigningUsers.length} usuario{bulkAssigningUsers.length !== 1 ? "s" : ""}
                  </h2>
                  <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
                    {bulkAssigningUsers.map((u) => u.nombre || u.email).join(", ")}
                  </p>
                  <p className="text-[10px] text-neutral-400 mt-0.5">
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
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Empresas asignadas
                </label>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 border border-neutral-200 rounded-lg bg-neutral-50">
                  {empresas.map((emp) => (
                    <label
                      key={emp.id}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white border border-neutral-200 cursor-pointer hover:bg-neutral-50 text-sm"
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
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isAssigning || assignEmpresaIds.length === 0}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-blue hover:bg-brand-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
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
                  <h2 id="activate-modal-title" className="text-sm font-bold text-neutral-900">Activar cuenta</h2>
                  <p className="text-xs text-neutral-500 mt-0.5">{activatingUser.nombre} — {activatingUser.email}</p>
                  <p className="text-[10px] text-neutral-400 mt-0.5">Asigna una contraseña para crear la cuenta. El usuario podrá iniciar sesión.</p>
                </div>
              </div>
              <button type="button" onClick={handleActivateClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors flex-shrink-0" aria-label="Cerrar">
                <Icon icon="lucide:x" width={16} height={16} />
              </button>
            </div>
            <form onSubmit={handleActivateSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto">
              <div>
                <label htmlFor="activate-password" className="block text-sm font-medium text-neutral-700 mb-1">
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
                  <h2 id="reset-modal-title" className="text-sm font-bold text-neutral-900">Resetear usuario</h2>
                  <p className="text-xs text-neutral-500 mt-0.5">{resettingUser.nombre} — {resettingUser.email}</p>
                  <p className="text-[10px] text-neutral-400 mt-0.5">Se borrarán asignaciones y se establecerá nueva contraseña.</p>
                </div>
              </div>
              <button type="button" onClick={handleResetClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors flex-shrink-0" aria-label="Cerrar">
                <Icon icon="lucide:x" width={16} height={16} />
              </button>
            </div>
            <form onSubmit={handleResetSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto">
              <div>
                <label htmlFor="reset-password" className="block text-sm font-medium text-neutral-700 mb-1">
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
                  <h2 id="edit-modal-title" className="text-sm font-bold text-neutral-900">Editar usuario</h2>
                  <p className="text-xs text-neutral-500 mt-0.5">{editingUser.nombre} — {editingUser.email}</p>
                </div>
              </div>
              <button type="button" onClick={handleEditClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors flex-shrink-0" aria-label="Cerrar">
                <Icon icon="lucide:x" width={16} height={16} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-4">
              <div>
                <label htmlFor="edit-rol" className="block text-sm font-medium text-neutral-700 mb-1">
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
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Empresas asignadas
                  </label>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border border-neutral-200 rounded-lg bg-neutral-50">
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
                        <label htmlFor="edit-change-current" className="block text-xs font-medium text-neutral-600 mb-1">
                          Contraseña actual (para autorizar)
                        </label>
                        <div className="relative">
                          <input
                            id="edit-change-current"
                            type={showChangePasswordCurrent ? "text" : "password"}
                            value={changePasswordCurrent}
                            onChange={(e) => setChangePasswordCurrent(e.target.value)}
                            className="w-full rounded-xl border border-neutral-200 px-3 py-2 pr-9 text-sm focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue outline-none"
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
                        <label htmlFor="edit-change-new" className="block text-xs font-medium text-neutral-600 mb-1">
                          Nueva contraseña (mín. 6 caracteres)
                        </label>
                        <div className="relative">
                          <input
                            id="edit-change-new"
                            type={showChangePasswordNew ? "text" : "password"}
                            minLength={6}
                            value={changePasswordNew}
                            onChange={(e) => setChangePasswordNew(e.target.value)}
                            className="w-full rounded-xl border border-neutral-200 px-3 py-2 pr-9 text-sm focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue outline-none"
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
                        <label htmlFor="edit-change-confirm" className="block text-xs font-medium text-neutral-600 mb-1">
                          Confirmar nueva contraseña
                        </label>
                        <input
                          id="edit-change-confirm"
                          type="password"
                          minLength={6}
                          value={changePasswordConfirm}
                          onChange={(e) => setChangePasswordConfirm(e.target.value)}
                          className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue outline-none"
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
        const initials = (viewingUser.nombre || viewingUser.email).slice(0, 2).toUpperCase();
        const rolLabel = getRolLabel(viewingUser.rol as "superadmin" | "admin" | "ejecutivo" | "operador" | "cliente" | "usuario");
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
                  <div className="w-10 h-10 rounded-full bg-brand-blue/10 flex items-center justify-center text-sm font-bold text-brand-blue flex-shrink-0">
                    {initials}
                  </div>
                  <div>
                    <h2 id="view-user-modal-title" className="text-sm font-bold text-neutral-900">
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
                    <p className="text-xs font-medium text-neutral-500 mb-0.5">Rol</p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-blue/10 text-brand-blue">
                      {rolLabel}
                    </span>
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
                    <p className="text-xs font-medium text-neutral-500 mb-0.5">Estado de cuenta</p>
                    {viewingUser.auth_id ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                        <Icon icon="lucide:check" width={10} height={10} />
                        Activa
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-500">
                        Sin cuenta
                      </span>
                    )}
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
                  <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-wide mb-0.5">ID interno</p>
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
