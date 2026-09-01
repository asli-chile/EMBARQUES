import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { withBase } from "@/lib/basePath";
import { useAuth, getRolLabel } from "@/lib/auth/AuthContext";
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MIN_LENGTH_MESSAGE_NEW,
  PASSWORD_PLACEHOLDER,
  PASSWORD_PLACEHOLDER_SHORT,
} from "@/lib/auth/password";
import { useLocale } from "@/lib/i18n";
import { FormSelect } from "@/components/ui/FormSelect";
import {
  modulePageBg,
  moduleHero,
  moduleLabel,
  moduleInput,
  moduleBtnPrimary,
  moduleBtnSecondary,
  moduleBtnOnHero,
  moduleToolbar,
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

type RolTheme = {
  avatar: string;
  strip: string;
  badge: string;
  chip: string;
  chipOn: string;
  countIdle: string;
  countOn: string;
};

/** Colores bien distintos entre roles (ejecutivo ≠ cliente). */
const ROL_THEME: Record<string, RolTheme> = {
  superadmin: {
    avatar: "bg-violet-600 text-white",
    strip: "bg-violet-500",
    badge: "bg-violet-100 text-violet-800",
    chip: "bg-violet-50 text-violet-800 border border-violet-200 hover:border-violet-400",
    chipOn: "bg-violet-600 text-white",
    countIdle: "text-violet-400",
    countOn: "text-white/70",
  },
  admin: {
    avatar: "bg-[#11224e] text-white",
    strip: "bg-[#11224e]",
    badge: "bg-[#11224e]/10 text-[#11224e]",
    chip: "bg-[#EEF2FA] text-[#11224e] border border-[#11224e]/20 hover:border-[#11224e]/45",
    chipOn: "bg-[#11224e] text-white",
    countIdle: "text-[#11224e]/40",
    countOn: "text-white/70",
  },
  ejecutivo: {
    avatar: "bg-amber-500 text-amber-950",
    strip: "bg-amber-500",
    badge: "bg-amber-100 text-amber-900",
    chip: "bg-amber-50 text-amber-900 border border-amber-200 hover:border-amber-400",
    chipOn: "bg-amber-500 text-amber-950",
    countIdle: "text-amber-600/70",
    countOn: "text-amber-950/55",
  },
  operador: {
    avatar: "bg-sky-600 text-white",
    strip: "bg-sky-500",
    badge: "bg-sky-100 text-sky-800",
    chip: "bg-sky-50 text-sky-800 border border-sky-200 hover:border-sky-400",
    chipOn: "bg-sky-600 text-white",
    countIdle: "text-sky-400",
    countOn: "text-white/70",
  },
  cliente: {
    avatar: "bg-emerald-600 text-white",
    strip: "bg-emerald-500",
    badge: "bg-emerald-100 text-emerald-800",
    chip: "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:border-emerald-400",
    chipOn: "bg-emerald-600 text-white",
    countIdle: "text-emerald-500",
    countOn: "text-white/70",
  },
  usuario: {
    avatar: "bg-stone-400 text-white",
    strip: "bg-stone-400",
    badge: "bg-stone-100 text-stone-600",
    chip: "bg-stone-50 text-stone-600 border border-stone-200 hover:border-stone-400",
    chipOn: "bg-stone-500 text-white",
    countIdle: "text-stone-400",
    countOn: "text-white/70",
  },
};

function rolTheme(rol: string): RolTheme {
  return ROL_THEME[rol] ?? ROL_THEME.usuario;
}

function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function UserAvatar({ name, rol, size = "md" }: { name: string; rol?: string; size?: "sm" | "md" }) {
  const color = rolTheme(rol ?? "").avatar;
  const sizeCls = size === "sm" ? "w-8 h-8 text-[11px] rounded-lg" : "w-11 h-11 text-sm rounded-2xl";
  return (
    <div className={`${sizeCls} ${color} flex items-center justify-center font-bold shrink-0 tracking-wide`}>
      {initialsFrom(name)}
    </div>
  );
}

function RoleBadge({ rol }: { rol: string }) {
  const theme = rolTheme(rol);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide ${theme.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${theme.strip}`} />
      {getRolLabel(rol as RolValue)}
    </span>
  );
}

function AccountBadge({ active }: { active: boolean }) {
  if (active) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Activa
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
      Pendiente
    </span>
  );
}

function CheckBox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
        checked
          ? "bg-brand-blue border-brand-blue text-white"
          : "border-brand-blue/30 bg-white hover:border-brand-blue/60"
      }`}
    >
      {checked ? <Icon icon="lucide:check" width={12} height={12} /> : null}
    </button>
  );
}

function RolePicker({ value, onChange }: { value: string; onChange: (rol: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="listbox" aria-label="Rol">
      {ROLES.map((r) => {
        const active = value === r.value;
        const theme = rolTheme(r.value);
        return (
          <button
            key={r.value}
            type="button"
            role="option"
            aria-selected={active}
            onClick={() => onChange(r.value)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              active ? theme.chipOn : theme.chip
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-white/80" : theme.strip}`} />
            {r.label}
          </button>
        );
      })}
    </div>
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

function EmpresaMultiPicker({
  empresas,
  selectedIds,
  onChange,
}: {
  empresas: EmpresaRow[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [q, setQ] = useState("");
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = s ? empresas.filter((e) => e.nombre.toLowerCase().includes(s)) : empresas;
    return [...list].sort((a, b) => Number(selected.has(b.id)) - Number(selected.has(a.id)));
  }, [empresas, q, selected]);

  const toggle = (id: string) => {
    onChange(selected.has(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  };

  const markFiltered = () => {
    onChange([...new Set([...selectedIds, ...filtered.map((e) => e.id)])]);
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="block text-base font-semibold text-brand-blue">Empresas asignadas</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={markFiltered}
            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-brand-blue bg-brand-blue/8 hover:bg-brand-blue/15"
          >
            Marcar todas
          </button>
          <button
            type="button"
            onClick={() => onChange([])}
            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-neutral-500 hover:bg-neutral-100"
          >
            Ninguna
          </button>
        </div>
      </div>
      <div className="relative mb-2">
        <Icon icon="lucide:search" width={14} height={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-blue/35" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar empresa…"
          className={`${moduleInput} pl-9 py-2 text-sm`}
        />
      </div>
      <p className="text-[11px] text-neutral-400 mb-1.5">
        {selectedIds.length} / {empresas.length} seleccionadas
        {q.trim() ? ` · ${filtered.length} en búsqueda` : ""}
      </p>
      <div className="max-h-56 overflow-y-auto rounded-xl border border-brand-blue/15 bg-[#F4F8FC] divide-y divide-brand-blue/8">
        {filtered.length === 0 ? (
          <p className="text-sm text-neutral-400 text-center py-6">Sin resultados</p>
        ) : (
          filtered.map((emp) => {
            const on = selected.has(emp.id);
            return (
              <button
                key={emp.id}
                type="button"
                onClick={() => toggle(emp.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                  on ? "bg-brand-blue/10 text-brand-blue" : "bg-white hover:bg-[#EEF3FA] text-neutral-700"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                    on ? "bg-brand-blue border-brand-blue text-white" : "border-brand-blue/25 bg-white"
                  }`}
                >
                  {on ? <Icon icon="lucide:check" width={12} height={12} /> : null}
                </span>
                <span className="truncate font-medium">{emp.nombre}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

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
  const [editPasswordOpen, setEditPasswordOpen] = useState(false);

  const [bulkAssigningUsers, setBulkAssigningUsers] = useState<DbUsuario[]>([]);
  const [assignEmpresaIds, setAssignEmpresaIds] = useState<string[]>([]);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [filterRol, setFilterRol] = useState<string>("");
  const [filterEmpresaId, setFilterEmpresaId] = useState<string>("");
  const [filterCuenta, setFilterCuenta] = useState<"" | "activa" | "pendiente">("");

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
    setEditPasswordOpen(false);
  };

  const handleEditClose = () => {
    setEditingUser(null);
    setEditError(null);
    setChangePasswordCurrent("");
    setChangePasswordNew("");
    setChangePasswordConfirm("");
    setChangePasswordVerified(false);
    setChangePasswordError(null);
    setEditPasswordOpen(false);
  };

  const empresaById = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of empresas) map.set(e.id, e.nombre);
    return map;
  }, [empresas]);

  const countByRol = useMemo(() => {
    const map: Record<string, number> = {};
    for (const u of usuarios) map[u.rol] = (map[u.rol] ?? 0) + 1;
    return map;
  }, [usuarios]);

  const filteredUsuarios = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = usuarios.filter((u) => {
      if (filterRol && u.rol !== filterRol) return false;
      if (filterCuenta === "activa" && !u.auth_id) return false;
      if (filterCuenta === "pendiente" && u.auth_id) return false;
      if (filterEmpresaId) {
        const ids = empresasPorUsuario[u.id] ?? [];
        if (!ids.includes(filterEmpresaId)) return false;
      }
      if (q && !u.nombre?.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
      return true;
    });
    return list.slice().sort((a, b) => {
      const ap = a.auth_id ? 1 : 0;
      const bp = b.auth_id ? 1 : 0;
      if (ap !== bp) return ap - bp;
      return (a.nombre || a.email).localeCompare(b.nombre || b.email, "es");
    });
  }, [usuarios, filterRol, filterCuenta, filterEmpresaId, empresasPorUsuario, searchQuery]);

  const activosCount = usuarios.filter((u) => u.auth_id).length;
  const pendientesCount = usuarios.filter((u) => !u.auth_id).length;
  const clientesCount = usuarios.filter((u) => u.rol === "cliente").length;
  const hasActiveFilters = Boolean(filterRol || filterEmpresaId || searchQuery.trim() || filterCuenta);

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
      if (!resettingUser || resetPassword.length < PASSWORD_MIN_LENGTH) return;
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
      if (!activatingUser || activatePassword.length < PASSWORD_MIN_LENGTH) return;
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
      if (changePasswordNew.length < PASSWORD_MIN_LENGTH) {
        setChangePasswordError(PASSWORD_MIN_LENGTH_MESSAGE_NEW);
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

      <div className={`flex-shrink-0 ${moduleHero}`}>
        <div className="px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/25 backdrop-blur-sm flex items-center justify-center shrink-0">
                <Icon icon="lucide:users" width={20} height={20} className="text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-bold leading-tight tracking-tight">{t.sidebar.usuarios}</h1>
                <p className="text-sm text-white/70 truncate">Directorio de cuentas, roles y acceso</p>
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
          <div className="flex gap-2 mt-3 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setFilterCuenta("");
                setFilterRol("");
              }}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors ${
                !filterCuenta && !filterRol ? "bg-white text-brand-blue" : "bg-white/15 text-white hover:bg-white/25"
              }`}
            >
              <Icon icon="lucide:users" width={13} height={13} />
              {usuarios.length} total
            </button>
            <button
              type="button"
              onClick={() => setFilterCuenta((v) => (v === "activa" ? "" : "activa"))}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors ${
                filterCuenta === "activa" ? "bg-white text-brand-blue" : "bg-white/15 text-white hover:bg-white/25"
              }`}
            >
              <Icon icon="lucide:user-check" width={13} height={13} />
              {activosCount} activa{activosCount !== 1 ? "s" : ""}
            </button>
            {pendientesCount > 0 && (
              <button
                type="button"
                onClick={() => setFilterCuenta((v) => (v === "pendiente" ? "" : "pendiente"))}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors ${
                  filterCuenta === "pendiente"
                    ? "bg-amber-300 text-amber-950"
                    : "bg-amber-400/20 border border-amber-300/30 text-amber-50 hover:bg-amber-400/30"
                }`}
              >
                <Icon icon="lucide:clock" width={13} height={13} />
                {pendientesCount} pendiente{pendientesCount !== 1 ? "s" : ""}
              </button>
            )}
            <button
              type="button"
              onClick={() => setFilterRol((v) => (v === "cliente" ? "" : "cliente"))}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors ${
                filterRol === "cliente" ? "bg-white text-brand-blue" : "bg-white/15 text-white hover:bg-white/25"
              }`}
            >
              <Icon icon="lucide:building-2" width={13} height={13} />
              {clientesCount} cliente{clientesCount !== 1 ? "s" : ""}
            </button>
          </div>
        </div>
      </div>

      <section className="flex-1 min-h-0 flex flex-col bg-white border-t border-brand-blue/10">
        <div className={`flex-shrink-0 px-4 py-2.5 ${moduleToolbar} space-y-2`}>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Icon icon="lucide:search" width={16} height={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-blue/40" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre o correo…"
                className={`${moduleInput} pl-10 pr-9`}
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-brand-blue/40 hover:text-brand-blue rounded-lg"
                  aria-label="Limpiar búsqueda"
                >
                  <Icon icon="lucide:x" width={14} height={14} />
                </button>
              ) : null}
            </div>
            <div className="w-full sm:w-56">
              <FormSelect
                id="filter-empresa"
                value={filterEmpresaId}
                placeholder="Todas las empresas"
                options={empresas.map((e) => ({ value: e.id, label: e.nombre }))}
                onChange={setFilterEmpresaId}
              />
            </div>
            <p className="text-sm font-semibold text-brand-blue/70 ml-auto">
              {filteredUsuarios.length}
              {hasActiveFilters ? ` de ${usuarios.length}` : ""}
            </p>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1">
            <button
              type="button"
              onClick={() => setFilterRol("")}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                !filterRol ? "bg-brand-blue text-white" : "bg-white text-brand-blue/80 border border-brand-blue/15 hover:border-brand-blue/35"
              }`}
            >
              Todos
            </button>
            {ROLES.map((r) => {
              const active = filterRol === r.value;
              const theme = rolTheme(r.value);
              return (
              <button
                key={r.value}
                type="button"
                onClick={() => setFilterRol((v) => (v === r.value ? "" : r.value))}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  active ? theme.chipOn : theme.chip
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-white/80" : theme.strip}`} />
                {r.label}
                <span className={active ? theme.countOn : theme.countIdle}>
                  {countByRol[r.value] ?? 0}
                </span>
              </button>
              );
            })}
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={() => {
                  setFilterRol("");
                  setFilterEmpresaId("");
                  setSearchQuery("");
                  setFilterCuenta("");
                }}
                className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold text-brand-blue/70 hover:bg-white"
              >
                <Icon icon="lucide:filter-x" width={13} height={13} />
                Limpiar
              </button>
            ) : null}
          </div>

          {selectedUserIds.size > 0 ? (
            <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 rounded-xl bg-brand-blue text-white">
              {asignablesFromFiltered.length > 0 ? (
                <CheckBox
                  checked={asignablesFromFiltered.every((u) => selectedUserIds.has(u.id))}
                  onChange={handleSelectAllAsignables}
                  label="Seleccionar clientes y ejecutivos visibles"
                />
              ) : null}
              <span className="text-sm font-semibold">
                {selectedUserIds.size} seleccionado{selectedUserIds.size !== 1 ? "s" : ""}
              </span>
              <button
                type="button"
                onClick={handleBulkAssignOpen}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-white text-brand-blue hover:bg-white/90"
              >
                <Icon icon="lucide:building-2" width={14} height={14} />
                Asignar empresas
              </button>
              <button
                type="button"
                onClick={() => setSelectedUserIds(new Set())}
                className="text-sm font-medium text-white/80 hover:text-white ml-auto"
              >
                Desmarcar
              </button>
            </div>
          ) : null}

          {error ? (
            <div className="px-3 py-2 bg-red-50 text-red-700 text-sm rounded-xl border border-red-200 flex items-center gap-2" role="alert">
              <Icon icon="lucide:alert-circle" width={14} height={14} className="shrink-0" />
              {error}
            </div>
          ) : null}
        </div>

        <div className="flex-1 min-h-0 overflow-auto">
          {filteredUsuarios.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center px-6">
              <div className="w-16 h-16 rounded-2xl bg-[#F4F8FC] border border-brand-blue/15 flex items-center justify-center">
                <Icon icon="lucide:users" width={28} height={28} className="text-brand-blue/30" />
              </div>
              <p className="text-base font-semibold text-brand-blue/80">Sin usuarios</p>
              <p className="text-sm text-neutral-400">Prueba otro filtro o crea una cuenta nueva.</p>
            </div>
          ) : (
            <ul className="divide-y divide-brand-blue/10">
              {asignablesFromFiltered.length > 0 && selectedUserIds.size === 0 ? (
                <li className="sticky top-0 z-10 flex items-center gap-2 px-4 py-1.5 bg-[#EEF3FA] border-b border-brand-blue/10">
                  <CheckBox
                    checked={false}
                    onChange={handleSelectAllAsignables}
                    label="Seleccionar clientes y ejecutivos visibles"
                  />
                  <span className="text-xs font-medium text-brand-blue/50">Seleccionar clientes y ejecutivos</span>
                </li>
              ) : null}
              {filteredUsuarios.map((u) => {
                const ids = empresasPorUsuario[u.id] ?? [];
                const nombresEmpresas = ids
                  .map((eid) => empresaById.get(eid))
                  .filter((n): n is string => Boolean(n));
                const canAssign = u.rol === "cliente" || u.rol === "ejecutivo";
                const selected = selectedUserIds.has(u.id);
                return (
                  <li key={u.id}>
                    <article
                      className={`relative flex items-center gap-3 w-full px-4 py-1.5 pl-5 ${
                        selected ? "bg-brand-blue/8" : "bg-white hover:bg-[#F4F8FC]"
                      }`}
                    >
                      <span
                        className={`absolute left-0 top-0 bottom-0 w-1 ${rolTheme(u.rol).strip}`}
                        aria-hidden="true"
                      />
                      {canAssign ? (
                        <CheckBox
                          checked={selected}
                          onChange={() => handleToggleSelect(u)}
                          label={`Seleccionar ${u.nombre || u.email}`}
                        />
                      ) : (
                        <span className="w-5 shrink-0" aria-hidden="true" />
                      )}
                      <UserAvatar name={u.nombre || u.email} rol={u.rol} size="sm" />
                      <div className="min-w-0 flex-1 grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.2fr)] gap-x-4 items-center">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <button
                              type="button"
                              onClick={() => handleViewOpen(u)}
                              className="font-semibold text-brand-blue text-left truncate hover:underline"
                            >
                              {u.nombre || "Sin nombre"}
                            </button>
                            <AccountBadge active={Boolean(u.auth_id)} />
                          </div>
                          <p className="text-xs text-neutral-500 truncate">{u.email}</p>
                        </div>
                        <div className="hidden lg:flex min-w-0">
                          <RoleBadge rol={u.rol} />
                        </div>
                        <p className="hidden lg:block text-xs text-brand-blue/70 truncate">
                          {nombresEmpresas.length > 0 ? nombresEmpresas.join(" · ") : "—"}
                        </p>
                      </div>
                      <div className="lg:hidden shrink-0">
                        <RoleBadge rol={u.rol} />
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!u.auth_id ? (
                          <button
                            type="button"
                            onClick={() => handleActivateOpen(u)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 transition-colors"
                          >
                            <Icon icon="lucide:key-round" width={13} height={13} />
                            Activar
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleResetOpen(u)}
                            title="Resetear contraseña"
                            className="p-1.5 rounded-md text-brand-blue/60 hover:bg-brand-blue/10 hover:text-brand-blue transition-colors"
                          >
                            <Icon icon="lucide:refresh-cw" width={15} height={15} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleEditOpen(u)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-blue text-white shadow-sm hover:bg-brand-blue/90 hover:shadow transition-all"
                        >
                          <Icon icon="lucide:pencil" width={13} height={13} />
                          Editar
                        </button>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          )}
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
                    minLength={PASSWORD_MIN_LENGTH}
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    className={`${moduleInput} pr-10`}
                    placeholder={PASSWORD_PLACEHOLDER_SHORT}
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
                <span className={moduleLabel}>Rol</span>
                <RolePicker
                  value={form.rol}
                  onChange={(rol) =>
                    setForm((f) => ({
                      ...f,
                      rol,
                      empresaIds: rol === "cliente" || rol === "ejecutivo" ? f.empresaIds : [],
                    }))
                  }
                />
              </div>
              {(form.rol === "cliente" || form.rol === "ejecutivo") && empresas.length > 0 && (
                <EmpresaMultiPicker
                  empresas={empresas}
                  selectedIds={form.empresaIds}
                  onChange={(empresaIds) => setForm((f) => ({ ...f, empresaIds }))}
                />
              )}
              {(form.rol === "cliente" || form.rol === "ejecutivo") && form.empresaIds.length === 0 && empresas.length > 0 && (
                <p className="text-amber-600 text-xs">Selecciona al menos una empresa.</p>
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
              {empresas.length > 0 ? (
                <EmpresaMultiPicker
                  empresas={empresas}
                  selectedIds={assignEmpresaIds}
                  onChange={setAssignEmpresaIds}
                />
              ) : (
                <p className="text-neutral-500 text-sm">No hay empresas disponibles. Créalas en Configuración.</p>
              )}

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
                  Contraseña (mín. {PASSWORD_MIN_LENGTH} caracteres)
                </label>
                <div className="relative">
                  <input
                    id="activate-password"
                    type={showActivatePassword ? "text" : "password"}
                    required
                    minLength={PASSWORD_MIN_LENGTH}
                    value={activatePassword}
                    onChange={(e) => setActivatePassword(e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 pr-9 text-sm focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue outline-none"
                    placeholder={PASSWORD_PLACEHOLDER}
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
                  disabled={isActivating || activatePassword.length < PASSWORD_MIN_LENGTH}
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
                  Nueva contraseña (mín. {PASSWORD_MIN_LENGTH} caracteres)
                </label>
                <div className="relative">
                  <input
                    id="reset-password"
                    type={showResetPassword ? "text" : "password"}
                    required
                    minLength={PASSWORD_MIN_LENGTH}
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 pr-9 text-sm focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue outline-none"
                    placeholder={PASSWORD_PLACEHOLDER}
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
                  disabled={isResetting || resetPassword.length < PASSWORD_MIN_LENGTH}
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
          className="fixed inset-0 bg-black/45 backdrop-blur-[2px] z-50 flex items-end sm:items-center justify-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-modal-title"
          onClick={handleEditClose}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl shadow-mac-modal w-full sm:max-w-xl max-h-[92dvh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-[3px] bg-gradient-to-r from-brand-blue to-brand-teal flex-shrink-0" />
            <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-neutral-200" />
            </div>
            <div className="flex-shrink-0 px-5 sm:px-6 py-4 border-b border-brand-blue/10 flex items-start justify-between gap-3 bg-[#F7FAFD]">
              <div className="flex items-center gap-3 min-w-0">
                <UserAvatar name={editingUser.nombre || editingUser.email} rol={editForm.rol} />
                <div className="min-w-0">
                  <h2 id="edit-modal-title" className="text-lg font-bold text-brand-blue truncate">
                    {editingUser.nombre || "Sin nombre"}
                  </h2>
                  <p className="text-sm text-neutral-500 truncate">{editingUser.email}</p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <RoleBadge rol={editForm.rol} />
                    <AccountBadge active={Boolean(editingUser.auth_id)} />
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleEditClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-white shrink-0"
                aria-label="Cerrar"
              >
                <Icon icon="lucide:x" width={16} height={16} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="flex-1 min-h-0 flex flex-col">
              <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-5">
                <div>
                  <span className={moduleLabel}>Rol</span>
                  <RolePicker
                    value={editForm.rol}
                    onChange={(rol) =>
                      setEditForm((f) => ({
                        ...f,
                        rol,
                        empresaIds: rol === "cliente" || rol === "ejecutivo" ? f.empresaIds : [],
                      }))
                    }
                  />
                </div>

                {editForm.rol === "cliente" || editForm.rol === "ejecutivo" ? (
                  empresas.length > 0 ? (
                    <EmpresaMultiPicker
                      empresas={empresas}
                      selectedIds={editForm.empresaIds}
                      onChange={(empresaIds) => setEditForm((f) => ({ ...f, empresaIds }))}
                    />
                  ) : (
                    <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                      No hay empresas. Créalas en Configuración → Clientes.
                    </p>
                  )
                ) : null}

                {editForm.rol === "cliente" || editForm.rol === "ejecutivo" ? (
                  editForm.empresaIds.length === 0 ? (
                    <p className="text-amber-600 text-sm">Debes asignar al menos una empresa.</p>
                  ) : null
                ) : null}

                {editingUser.auth_id ? (
                  <div className="rounded-xl border border-brand-blue/15 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setEditPasswordOpen((v) => !v)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-[#F4F8FC] hover:bg-[#EEF3FA] transition-colors"
                    >
                      <span className="inline-flex items-center gap-2 text-sm font-semibold text-brand-blue">
                        <Icon icon="lucide:key-round" width={16} height={16} />
                        Cambiar contraseña
                      </span>
                      <Icon
                        icon="lucide:chevron-down"
                        width={16}
                        height={16}
                        className={`text-brand-blue/50 transition-transform ${editPasswordOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {editPasswordOpen ? (
                      <div className="p-4 space-y-3 border-t border-brand-blue/10">
                        {!changePasswordVerified ? (
                          <>
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
                                aria-label={showChangePasswordCurrent ? "Ocultar" : "Mostrar"}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600 rounded"
                              >
                                <Icon icon={showChangePasswordCurrent ? "lucide:eye-off" : "lucide:eye"} width={14} height={14} />
                              </button>
                            </div>
                            {changePasswordError ? (
                              <p className="text-red-600 text-xs" role="alert">{changePasswordError}</p>
                            ) : null}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                handleVerifyCurrentPassword(e);
                              }}
                              disabled={isVerifying || !changePasswordCurrent}
                              className={`${moduleBtnSecondary} text-sm disabled:opacity-50`}
                            >
                              {isVerifying ? "Verificando…" : "Verificar y continuar"}
                            </button>
                          </>
                        ) : (
                          <>
                            <p className="text-xs font-medium text-emerald-600">Contraseña actual verificada</p>
                            <label htmlFor="edit-change-new" className={moduleLabel}>
                              Nueva contraseña (mín. {PASSWORD_MIN_LENGTH} caracteres)
                            </label>
                            <div className="relative">
                              <input
                                id="edit-change-new"
                                type={showChangePasswordNew ? "text" : "password"}
                                minLength={PASSWORD_MIN_LENGTH}
                                value={changePasswordNew}
                                onChange={(e) => setChangePasswordNew(e.target.value)}
                                className={`${moduleInput} pr-9`}
                                placeholder={PASSWORD_PLACEHOLDER}
                                autoComplete="new-password"
                              />
                              <button
                                type="button"
                                onClick={() => setShowChangePasswordNew((p) => !p)}
                                aria-label={showChangePasswordNew ? "Ocultar" : "Mostrar"}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600 rounded"
                              >
                                <Icon icon={showChangePasswordNew ? "lucide:eye-off" : "lucide:eye"} width={14} height={14} />
                              </button>
                            </div>
                            <label htmlFor="edit-change-confirm" className={moduleLabel}>
                              Confirmar nueva contraseña
                            </label>
                            <input
                              id="edit-change-confirm"
                              type="password"
                              minLength={PASSWORD_MIN_LENGTH}
                              value={changePasswordConfirm}
                              onChange={(e) => setChangePasswordConfirm(e.target.value)}
                              className={moduleInput}
                              placeholder="Repite la nueva contraseña"
                              autoComplete="new-password"
                            />
                            {changePasswordError ? (
                              <p className="text-red-600 text-xs" role="alert">{changePasswordError}</p>
                            ) : null}
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setChangePasswordVerified(false);
                                  setChangePasswordError(null);
                                }}
                                className={`${moduleBtnSecondary} text-sm`}
                              >
                                Atrás
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleChangePasswordSubmit(e);
                                }}
                                disabled={
                                  isChangingPassword ||
                                  changePasswordNew.length < PASSWORD_MIN_LENGTH ||
                                  changePasswordNew !== changePasswordConfirm
                                }
                                className={`${moduleBtnPrimary} text-sm disabled:opacity-50`}
                              >
                                {isChangingPassword ? "Actualizando…" : "Cambiar contraseña"}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {editError ? (
                  <p className="text-red-600 text-sm" role="alert">
                    {editError}
                  </p>
                ) : null}
              </div>

              <div className="flex-shrink-0 border-t border-brand-blue/10 bg-white px-5 sm:px-6 py-3 flex gap-2">
                <button type="button" onClick={handleEditClose} className={`${moduleBtnSecondary} flex-1 justify-center`}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    isUpdating ||
                    ((editForm.rol === "cliente" || editForm.rol === "ejecutivo") && editForm.empresaIds.length === 0)
                  }
                  className={`${moduleBtnPrimary} flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isUpdating ? "Guardando…" : "Guardar cambios"}
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
                  <UserAvatar name={viewingUser.nombre || viewingUser.email} rol={viewingUser.rol} />
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
