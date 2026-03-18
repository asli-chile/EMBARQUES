import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type Operacion = {
  id: string;
  correlativo: number | null;
  ref_asli: string | null;
  cliente: string | null;
  especie: string | null;
  naviera: string | null;
  nave: string | null;
  pol: string | null;
  pod: string | null;
  etd: string | null;
  eta: string | null;
  tt: number | null;
  booking: string | null;
  estado_operacion: string | null;
  created_at: string;
  // campos adicionales para email / tarjeta
  consignatario: string | null;
  tipo_unidad: string | null;
  pallets: number | null;
  peso_neto: number | null;
  temperatura: number | null;
  ventilacion: string | null;
  deposito: string | null;
  planta_presentacion: string | null;
  citacion: string | null;
  inicio_stacking: string | null;
  fin_stacking: string | null;
};

const estadoConfig: Record<string, { dot: string; bg: string; text: string; border: string }> = {
  PENDIENTE:     { dot: "bg-amber-400",   bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200" },
  "EN PROCESO":  { dot: "bg-blue-400",    bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200" },
  "EN TRÁNSITO": { dot: "bg-violet-400",  bg: "bg-violet-50",  text: "text-violet-700",  border: "border-violet-200" },
  ARRIBADO:      { dot: "bg-emerald-400", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  COMPLETADO:    { dot: "bg-neutral-400", bg: "bg-neutral-100",text: "text-neutral-600", border: "border-neutral-200" },
  CANCELADO:     { dot: "bg-red-400",     bg: "bg-red-50",     text: "text-red-700",     border: "border-red-200" },
  ROLEADO:       { dot: "bg-orange-400",  bg: "bg-orange-50",  text: "text-orange-700",  border: "border-orange-200" },
};

type SortField = "ref_asli" | "cliente" | "especie" | "naviera" | "nave" | "pol" | "pod" | "etd" | "eta" | "tt" | "booking" | "estado_operacion";
type SortDirection = "asc" | "desc";
type ViewMode = "table" | "cards";
type EmailType = "reserva" | "transporte";

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  try { return format(new Date(dateStr), "dd-MM-yyyy", { locale: es }); } catch { return dateStr; }
}

function renderHtmlTable(title: string, data: [string, unknown][]) {
  const rowsHtml = data
    .map(([label, val]) => {
      const v = val ?? "-";
      return `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-size:13px;white-space:nowrap">${label}</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#1f2937">${v}</td></tr>`;
    })
    .join("");
  return `<div style="margin-bottom:16px"><div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#2563eb;margin-bottom:6px;border-bottom:1px solid #e5e7eb;padding-bottom:4px">${title}</div><table style="border-collapse:collapse">${rowsHtml}</table></div>`;
}

function buildEmailContent(op: Operacion, type: EmailType) {
  const subject =
    type === "reserva"
      ? `Solicitud de Reserva — ${op.ref_asli ?? op.correlativo ?? ""} — ${op.cliente ?? ""}`
      : `Solicitud de Transporte — ${op.ref_asli ?? op.correlativo ?? ""} — ${op.cliente ?? ""}`;

  let htmlBody = `<div style="font-family:Arial,sans-serif;color:#374151">`;

  if (type === "reserva") {
    htmlBody += `<p>Estimado equipo,</p><p>Se solicita la siguiente reserva:</p>`;
    htmlBody += renderHtmlTable("General", [
      ["Ref. ASLI", op.ref_asli],
      ["Cliente", op.cliente],
      ["Estado", op.estado_operacion],
    ]);
    htmlBody += renderHtmlTable("Carga", [
      ["Especie", op.especie],
      ["Tipo unidad", op.tipo_unidad],
      ["Pallets", op.pallets],
      ["Peso Neto", op.peso_neto ? `${op.peso_neto.toLocaleString("es-CL")} kg` : null],
      ["Temperatura", op.temperatura != null ? `${op.temperatura}°C` : null],
      ["Ventilación", op.ventilacion],
      ["Consignatario", op.consignatario],
    ]);
    htmlBody += renderHtmlTable("Embarque", [
      ["Naviera", op.naviera],
      ["Nave", op.nave],
      ["Booking", op.booking],
      ["POL", op.pol],
      ["POD", op.pod],
      ["ETD", fmtDate(op.etd)],
      ["ETA", fmtDate(op.eta)],
      ["Tránsito", op.tt ? `${op.tt} días` : null],
    ]);
  } else {
    htmlBody += `<p>Estimado equipo,</p><p>Se solicita el siguiente transporte:</p>`;
    htmlBody += renderHtmlTable("Reserva", [
      ["Ref. ASLI", op.ref_asli],
      ["Cliente", op.cliente],
      ["Naviera", op.naviera],
      ["Nave", op.nave],
      ["Booking", op.booking],
      ["POL", op.pol],
      ["POD", op.pod],
      ["ETD", fmtDate(op.etd)],
      ["Tipo unidad", op.tipo_unidad],
      ["Especie", op.especie],
    ]);
    htmlBody += renderHtmlTable("Depósito / Planta", [
      ["Planta", op.planta_presentacion],
      ["Depósito", op.deposito],
      ["Citación", fmtDate(op.citacion)],
      ["Stacking Inicio", fmtDate(op.inicio_stacking)],
      ["Stacking Fin", fmtDate(op.fin_stacking)],
    ]);
  }

  htmlBody += `<p>Quedo atento.</p></div>`;
  return { subject, htmlBody };
}

async function copyToClipboard(op: Operacion): Promise<boolean> {
  const text = buildReservaBody(op);
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// ─── SortableHeader ───────────────────────────────────────────────────────────

type SortableHeaderProps = {
  field: SortField;
  label: string;
  sortField: SortField | null;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  className?: string;
};

function SortableHeader({ field, label, sortField, sortDirection, onSort, className }: SortableHeaderProps) {
  const isActive = sortField === field;
  return (
    <th className={`px-4 py-3 text-center whitespace-nowrap ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className={`inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
          isActive ? "text-brand-blue" : "text-neutral-400 hover:text-neutral-600"
        }`}
      >
        {label}
        <span className="flex flex-col gap-[1px]">
          <Icon icon="typcn:arrow-sorted-up" width={9} height={9} className={isActive && sortDirection === "asc" ? "text-brand-blue" : "text-neutral-300"} />
          <Icon icon="typcn:arrow-sorted-down" width={9} height={9} className={isActive && sortDirection === "desc" ? "text-brand-blue" : "text-neutral-300"} />
        </span>
      </button>
    </th>
  );
}

// ─── ReservaCard ──────────────────────────────────────────────────────────────

type CardProps = {
  op: Operacion;
  isCliente: boolean;
  selected: boolean;
  actionLoading: boolean;
  onSelect: () => void;
  onCopy: (op: Operacion) => void;
  onEmail: (op: Operacion) => void;
  onTrash: (id: string) => void;
};

function ReservaCard({ op, isCliente, selected, actionLoading, onSelect, onCopy, onEmail, onTrash }: CardProps) {
  const cfg = op.estado_operacion ? estadoConfig[op.estado_operacion] : null;
  return (
    <div
      className={`bg-white rounded-2xl border flex flex-col overflow-hidden shadow-sm transition-all duration-150 ${
        selected ? "border-brand-blue ring-1 ring-brand-blue/30" : "border-neutral-200 hover:border-neutral-300"
      }`}
    >
      {/* Estado strip */}
      {cfg && <div className={`h-[3px] ${cfg.dot.replace("bg-", "bg-")}`} />}

      {/* Header */}
      <div className="px-4 pt-3.5 pb-2.5 flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          {!isCliente && (
            <input
              type="checkbox"
              checked={selected}
              onChange={onSelect}
              className="mt-0.5 w-4 h-4 rounded border-neutral-300 accent-brand-blue shrink-0"
            />
          )}
          <div className="min-w-0">
            <p className="text-sm font-bold text-brand-blue leading-tight">
              {op.ref_asli || (op.correlativo ? `#${op.correlativo}` : "—")}
            </p>
            <p className="text-xs text-neutral-500 truncate mt-0.5">{op.cliente ?? "-"}</p>
          </div>
        </div>
        {cfg && (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap shrink-0 ${cfg.bg} ${cfg.text} ${cfg.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} shrink-0`} />
            {op.estado_operacion}
          </span>
        )}
      </div>

      <div className="h-px bg-neutral-100 mx-4" />

      {/* Body */}
      <div className="px-4 py-3 flex-1 space-y-2.5 text-xs">
        {/* Naviera · Nave */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-neutral-400 shrink-0">Naviera</span>
          <span className="text-neutral-700 font-medium text-right truncate">
            {op.naviera ?? "-"}{op.nave ? ` · ${op.nave}` : ""}
          </span>
        </div>

        {/* Ruta */}
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-neutral-600 bg-neutral-100 px-1.5 py-0.5 rounded text-[11px] truncate max-w-[80px]">{op.pol ?? "-"}</span>
          <Icon icon="lucide:arrow-right" width={12} height={12} className="text-neutral-300 shrink-0" />
          <span className="font-mono text-neutral-600 bg-neutral-100 px-1.5 py-0.5 rounded text-[11px] truncate max-w-[80px]">{op.pod ?? "-"}</span>
          {op.tt !== null && (
            <span className="ml-auto px-1.5 py-0.5 rounded-full bg-brand-blue/8 text-brand-blue font-semibold text-[10px] shrink-0">
              {op.tt}d
            </span>
          )}
        </div>

        {/* Fechas */}
        <div className="flex items-center gap-3">
          <div>
            <span className="text-neutral-400 text-[10px] uppercase tracking-wide block">ETD</span>
            <span className="font-medium text-neutral-700">{fmtDate(op.etd)}</span>
          </div>
          <div>
            <span className="text-neutral-400 text-[10px] uppercase tracking-wide block">ETA</span>
            <span className="font-medium text-neutral-700">{fmtDate(op.eta)}</span>
          </div>
        </div>

        {/* Booking */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-neutral-400 shrink-0">Booking</span>
          <span className="font-mono text-neutral-600 text-right truncate">{op.booking ?? "-"}</span>
        </div>

        {/* Especie */}
        {op.especie && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-neutral-400 shrink-0">Especie</span>
            <span className="text-neutral-700 text-right truncate">{op.especie}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-neutral-100 flex items-center justify-between bg-neutral-50/60">
        <span className="text-[10px] text-neutral-400">
          {format(new Date(op.created_at), "dd MMM yyyy", { locale: es })}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => onCopy(op)}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
            title="Copiar datos"
          >
            <Icon icon="lucide:copy" width={14} height={14} />
          </button>
          <button
            type="button"
            onClick={() => onEmail(op)}
            className="p-1.5 text-neutral-400 hover:text-brand-blue hover:bg-brand-blue/8 rounded-lg transition-colors"
            title="Enviar por correo"
          >
            <Icon icon="lucide:mail" width={14} height={14} />
          </button>
          {!isCliente && (
            <button
              type="button"
              onClick={() => onTrash(op.id)}
              disabled={actionLoading}
              className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              title="Mover a papelera"
            >
              <Icon icon="typcn:trash" width={14} height={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── EmailModal ───────────────────────────────────────────────────────────────

function EmailModal({ op, onClose }: { op: Operacion; onClose: () => void }) {
  const [sending, setSending] = useState<EmailType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async (type: EmailType) => {
    const scriptUrl = import.meta.env.PUBLIC_GMAIL_DRAFT_SCRIPT_URL;
    if (!scriptUrl) {
      setError("No se ha configurado la URL del script de Gmail.");
      return;
    }

    setSending(type);
    setError(null);
    const { subject, htmlBody } = buildEmailContent(op, type);

    try {
      const res = await fetch(scriptUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ to: "informaciones@asli.cl", subject, htmlBody }),
      });
      const data = await res.json();
      if (data.success && data.draftUrl) {
        window.open(data.draftUrl, "_blank");
      } else if (data.success) {
        window.open("https://mail.google.com/mail/#drafts", "_blank");
      } else {
        setError(data.error || "Error al crear el borrador en Gmail.");
        setSending(null);
        return;
      }
    } catch {
      setError("No se pudo conectar con el servicio de correo.");
      setSending(null);
      return;
    }

    setSending(null);
    onClose();
  };

  const disabled = sending !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
      <div className="bg-white rounded-2xl shadow-mac-modal border border-neutral-200 p-6 w-full max-w-sm mx-4 animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-brand-blue/10 border border-brand-blue/20 flex items-center justify-center">
            <Icon icon="lucide:mail" width={20} height={20} className="text-brand-blue" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-900">Enviar por correo</h3>
            <p className="text-xs text-neutral-500">{op.ref_asli ?? `#${op.correlativo}`} · {op.cliente ?? ""}</p>
          </div>
        </div>

        {error && (
          <div className="mb-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">{error}</div>
        )}

        <p className="text-xs text-neutral-500 mb-4">¿Qué tipo de solicitud deseas enviar?</p>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => void handleSend("reserva")}
            className="flex items-center gap-3 w-full p-3 rounded-xl border border-neutral-200 hover:border-brand-blue hover:bg-brand-blue/5 transition-all text-left group disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <div className="w-9 h-9 rounded-lg bg-brand-blue/10 flex items-center justify-center shrink-0 group-hover:bg-brand-blue/20 transition-colors">
              {sending === "reserva" ? (
                <Icon icon="typcn:refresh" width={18} height={18} className="text-brand-blue animate-spin" />
              ) : (
                <Icon icon="lucide:clipboard-list" width={18} height={18} className="text-brand-blue" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-800">Solicitud de Reserva</p>
              <p className="text-[11px] text-neutral-400">Todos los datos del embarque y carga</p>
            </div>
            <Icon icon="lucide:chevron-right" width={14} height={14} className="text-neutral-300 ml-auto shrink-0" />
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => void handleSend("transporte")}
            className="flex items-center gap-3 w-full p-3 rounded-xl border border-neutral-200 hover:border-emerald-400 hover:bg-emerald-50/50 transition-all text-left group disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0 group-hover:bg-emerald-200 transition-colors">
              {sending === "transporte" ? (
                <Icon icon="typcn:refresh" width={18} height={18} className="text-emerald-600 animate-spin" />
              ) : (
                <Icon icon="lucide:truck" width={18} height={18} className="text-emerald-600" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-800">Solicitud de Transporte</p>
              <p className="text-[11px] text-neutral-400">Datos de reserva, planta y depósito</p>
            </div>
            <Icon icon="lucide:chevron-right" width={14} height={14} className="text-neutral-300 ml-auto shrink-0" />
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          disabled={disabled}
          className="w-full mt-3 px-4 py-2 text-xs font-semibold text-neutral-600 bg-neutral-100 border border-neutral-200 rounded-xl hover:bg-neutral-200 transition-colors disabled:opacity-60"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ─── MisReservasContent ───────────────────────────────────────────────────────

export function MisReservasContent() {
  const { t } = useLocale();
  const { isCliente, empresaNombres, isLoading: authLoading } = useAuth();
  const tr = t.misReservas;

  const [operaciones, setOperaciones] = useState<Operacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<string>("");
  const [clienteFilter, setClienteFilter] = useState<string>("");
  const [navieraFilter, setNavieraFilter] = useState<string>("");
  const [especieFilter, setEspecieFilter] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState(false);
  const [showTransportModal, setShowTransportModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [emailModal, setEmailModal] = useState<Operacion | null>(null);

  const supabase = useMemo(() => {
    try { return createClient(); } catch { return null; }
  }, []);

  const fetchOperaciones = useCallback(async () => {
    if (!supabase || authLoading) return;
    setLoading(true);

    let q = supabase
      .from("operaciones")
      .select(
        `id, correlativo, ref_asli, cliente, especie, naviera, nave, pol, pod, etd, eta, tt, booking,
         estado_operacion, created_at, consignatario, tipo_unidad, pallets, peso_neto, temperatura,
         ventilacion, deposito, planta_presentacion, citacion, inicio_stacking, fin_stacking`
      )
      .is("deleted_at", null);

    if (empresaNombres.length > 0) {
      q = q.in("cliente", empresaNombres);
    }
    const { data, error } = await q.order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading operaciones:", error);
    } else {
      setOperaciones((data ?? []) as Operacion[]);
    }
    setLoading(false);
  }, [supabase, authLoading, empresaNombres]);

  useEffect(() => {
    if (!authLoading) void fetchOperaciones();
    else setOperaciones([]);
  }, [authLoading, fetchOperaciones]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getFilteredData = useCallback(
    (excludeFilter?: "estado" | "cliente" | "naviera" | "especie") => {
      let result = operaciones;
      if (searchTerm.trim()) {
        const search = searchTerm.toLowerCase();
        result = result.filter(
          (op) =>
            op.cliente?.toLowerCase().includes(search) ||
            op.booking?.toLowerCase().includes(search) ||
            op.naviera?.toLowerCase().includes(search) ||
            op.nave?.toLowerCase().includes(search) ||
            op.ref_asli?.toLowerCase().includes(search) ||
            op.especie?.toLowerCase().includes(search)
        );
      }
      if (estadoFilter && excludeFilter !== "estado") result = result.filter((op) => op.estado_operacion === estadoFilter);
      if (clienteFilter && excludeFilter !== "cliente") result = result.filter((op) => op.cliente === clienteFilter);
      if (navieraFilter && excludeFilter !== "naviera") result = result.filter((op) => op.naviera === navieraFilter);
      if (especieFilter && excludeFilter !== "especie") result = result.filter((op) => op.especie === especieFilter);
      return result;
    },
    [operaciones, searchTerm, estadoFilter, clienteFilter, navieraFilter, especieFilter]
  );

  const filteredOperaciones = useMemo(() => {
    let result = getFilteredData();
    if (sortField) {
      result = [...result].sort((a, b) => {
        let aVal = a[sortField];
        let bVal = b[sortField];
        if (aVal === null || aVal === undefined) aVal = "";
        if (bVal === null || bVal === undefined) bVal = "";
        if (sortField === "tt") {
          const aNum = Number(aVal) || 0;
          const bNum = Number(bVal) || 0;
          return sortDirection === "asc" ? aNum - bNum : bNum - aNum;
        }
        if (sortField === "etd" || sortField === "eta") {
          const aDate = aVal ? new Date(aVal as string).getTime() : 0;
          const bDate = bVal ? new Date(bVal as string).getTime() : 0;
          return sortDirection === "asc" ? aDate - bDate : bDate - aDate;
        }
        const cmp = String(aVal).toLowerCase().localeCompare(String(bVal).toLowerCase());
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [getFilteredData, sortField, sortDirection]);

  const estados = useMemo(() => Array.from(new Set(getFilteredData("estado").map((op) => op.estado_operacion).filter(Boolean))).sort(), [getFilteredData]);
  const clientes = useMemo(() => Array.from(new Set(getFilteredData("cliente").map((op) => op.cliente).filter(Boolean))).sort() as string[], [getFilteredData]);
  const navieras = useMemo(() => Array.from(new Set(getFilteredData("naviera").map((op) => op.naviera).filter(Boolean))).sort() as string[], [getFilteredData]);
  const especies = useMemo(() => Array.from(new Set(getFilteredData("especie").map((op) => op.especie).filter(Boolean))).sort() as string[], [getFilteredData]);

  const activeFiltersCount = useMemo(() => [estadoFilter, clienteFilter, navieraFilter, especieFilter].filter(Boolean).length, [estadoFilter, clienteFilter, navieraFilter, especieFilter]);

  const clearAllFilters = () => { setSearchTerm(""); setEstadoFilter(""); setClienteFilter(""); setNavieraFilter(""); setEspecieFilter(""); };
  const handleSelectAll = () => { setSelectedIds(selectedIds.size === filteredOperaciones.length ? new Set() : new Set(filteredOperaciones.map((op) => op.id))); };
  const handleSelect = (id: string) => { const s = new Set(selectedIds); s.has(id) ? s.delete(id) : s.add(id); setSelectedIds(s); };

  const handleMoveToTrash = async (ids: string[]) => {
    if (!supabase || ids.length === 0) return;
    setActionLoading(true);
    const { error } = await supabase.from("operaciones").update({ deleted_at: new Date().toISOString() }).in("id", ids);
    if (error) alert(tr.errorMovingToTrash);
    else { setSelectedIds(new Set()); await fetchOperaciones(); }
    setActionLoading(false);
  };

  const getSelectedOps = useCallback(() => operaciones.filter((op) => selectedIds.has(op.id)), [operaciones, selectedIds]);

  const handleSendToAsli = useCallback(async () => {
    const selected = getSelectedOps();
    if (!selected.length || !supabase) return;
    setShowTransportModal(false);
    setActionLoading(true);
    const { error } = await supabase.from("operaciones").update({ enviado_transporte: true }).in("id", selected.map((op) => op.id));
    setActionLoading(false);
    if (error) { setErrorMsg(error.message); setTimeout(() => setErrorMsg(null), 4000); return; }
    setSelectedIds(new Set());
    const count = selected.length;
    setSuccessMsg(`${count} operación${count > 1 ? "es" : ""} enviada${count > 1 ? "s" : ""} a Reserva ASLI`);
    setTimeout(() => setSuccessMsg(null), 4000);
  }, [supabase, getSelectedOps]);

  const handleSendToExterna = useCallback(async () => {
    const selected = getSelectedOps();
    if (!selected.length || !supabase) return;
    setShowTransportModal(false);
    setActionLoading(true);
    const rows = selected.map((op) => ({ cliente: op.cliente || null, booking: op.booking || null, naviera: op.naviera || null, nave: op.nave || null, pod: op.pod || null, etd: op.etd || null }));
    const { error } = await supabase.from("transportes_reservas_ext").insert(rows);
    setActionLoading(false);
    if (error) { setErrorMsg(error.message); setTimeout(() => setErrorMsg(null), 4000); return; }
    setSelectedIds(new Set());
    const count = selected.length;
    setSuccessMsg(`${count} operación${count > 1 ? "es" : ""} enviada${count > 1 ? "s" : ""} a Reserva Externa`);
    setTimeout(() => setSuccessMsg(null), 4000);
  }, [supabase, getSelectedOps]);

  const handleCopy = async (op: Operacion) => {
    const ok = await copyToClipboard(op);
    if (ok) { setSuccessMsg("Datos copiados al portapapeles"); setTimeout(() => setSuccessMsg(null), 2500); }
  };

  const filterSelectClass = "w-full px-3 py-2 border border-neutral-200 bg-neutral-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:bg-white transition-all";

  if (loading) {
    return (
      <main className="flex-1 bg-neutral-50 min-h-0 overflow-auto p-4 flex items-center justify-center">
        <div className="flex items-center gap-3 px-5 py-4 bg-white rounded-2xl border border-neutral-200 shadow-sm text-neutral-500 text-sm font-medium">
          <Icon icon="typcn:refresh" className="w-5 h-5 animate-spin text-brand-blue" />
          <span>{tr.loading}</span>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-neutral-50 min-h-0 overflow-auto p-3 sm:p-4 lg:p-5">
      <div className="w-full max-w-[1600px] mx-auto space-y-4">

        {/* Header */}
        <div className="rounded-2xl bg-white border border-neutral-200 shadow-sm overflow-hidden">
          <div className="h-[3px] bg-gradient-to-r from-brand-blue to-brand-teal" />
          <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-blue flex items-center justify-center shrink-0">
                <Icon icon="typcn:clipboard" width={20} height={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-neutral-900 leading-tight">{t.sidebar.misReservas}</h1>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {filteredOperaciones.length === operaciones.length
                    ? `${operaciones.length} ${tr.records}`
                    : `${filteredOperaciones.length} de ${operaciones.length} ${tr.records}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {!isCliente && selectedIds.size > 0 && (
                <>
                  <button onClick={() => setShowTransportModal(true)} disabled={actionLoading} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors disabled:opacity-50">
                    <Icon icon="lucide:truck" width={15} height={15} />
                    Enviar a Transportes ({selectedIds.size})
                  </button>
                  <button onClick={() => handleMoveToTrash(Array.from(selectedIds))} disabled={actionLoading} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-red-50 text-red-700 border border-red-200 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50">
                    <Icon icon="typcn:trash" width={15} height={15} />
                    {tr.delete} ({selectedIds.size})
                  </button>
                </>
              )}

              <button onClick={fetchOperaciones} className="p-2 border border-neutral-200 bg-neutral-50 rounded-xl hover:bg-neutral-100 transition-colors text-neutral-500" title={tr.refresh}>
                <Icon icon="typcn:refresh" width={18} height={18} />
              </button>
              <a href="/reservas/crear" className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-brand-blue text-white rounded-xl hover:bg-brand-blue/90 transition-colors shadow-sm shadow-brand-blue/20">
                <Icon icon="typcn:plus" width={15} height={15} />
                {tr.newBooking}
              </a>
            </div>
          </div>
        </div>

        {/* Buscador + filtros */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Toggle tabla / tarjetas */}
          <div className="flex items-center rounded-xl border border-neutral-200 bg-white overflow-hidden shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors ${
                viewMode === "table"
                  ? "bg-brand-blue text-white"
                  : "text-neutral-500 hover:bg-neutral-50"
              }`}
            >
              <Icon icon="lucide:list" width={14} height={14} />
              Tabla
            </button>
            <div className="w-px h-5 bg-neutral-200" />
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors ${
                viewMode === "cards"
                  ? "bg-brand-blue text-white"
                  : "text-neutral-500 hover:bg-neutral-50"
              }`}
            >
              <Icon icon="lucide:grid" width={14} height={14} />
              Tarjetas
            </button>
          </div>

          <div className="flex-1 min-w-[220px] relative">
            <Icon icon="typcn:zoom" className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4 pointer-events-none" />
            <input
              type="text"
              placeholder={tr.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-neutral-200 bg-neutral-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:bg-white transition-all"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-3.5 py-2 border rounded-xl text-sm font-medium transition-colors ${showFilters || activeFiltersCount > 0 ? "border-brand-blue bg-brand-blue/5 text-brand-blue" : "border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600"}`}
          >
            <Icon icon="typcn:filter" width={16} height={16} />
            {tr.filters}
            {activeFiltersCount > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-brand-blue text-white rounded-full leading-none">{activeFiltersCount}</span>
            )}
          </button>
          {(activeFiltersCount > 0 || searchTerm) && (
            <button onClick={clearAllFilters} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-500 hover:text-neutral-700 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors">
              <Icon icon="typcn:times" width={14} height={14} />
              Limpiar
            </button>
          )}
        </div>

        {/* Panel de filtros */}
        {showFilters && (
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-600 uppercase tracking-wider">{tr.advancedFilters}</span>
              {activeFiltersCount > 0 && (
                <button onClick={clearAllFilters} className="text-xs text-red-500 hover:text-red-700 font-medium">{tr.clearFilters}</button>
              )}
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">{tr.colStatus}</label>
                <select value={estadoFilter} onChange={(e) => setEstadoFilter(e.target.value)} className={filterSelectClass}>
                  <option value="">{tr.allStates}</option>
                  {estados.map((e) => <option key={e} value={e!}>{e}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">{tr.colClient}</label>
                <select value={clienteFilter} onChange={(e) => setClienteFilter(e.target.value)} className={filterSelectClass}>
                  <option value="">{tr.allClients}</option>
                  {clientes.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">{tr.colCarrier}</label>
                <select value={navieraFilter} onChange={(e) => setNavieraFilter(e.target.value)} className={filterSelectClass}>
                  <option value="">{tr.allCarriers}</option>
                  {navieras.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">{tr.colSpecies}</label>
                <select value={especieFilter} onChange={(e) => setEspecieFilter(e.target.value)} className={filterSelectClass}>
                  <option value="">{tr.allSpecies}</option>
                  {especies.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ── Vista Tabla ── */}
        {viewMode === "table" && (
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100">
                    {!isCliente && (
                      <th className="px-4 py-3 w-10">
                        <input type="checkbox" checked={selectedIds.size === filteredOperaciones.length && filteredOperaciones.length > 0} onChange={handleSelectAll} className="w-4 h-4 rounded border-neutral-300 accent-brand-blue" />
                      </th>
                    )}
                    <SortableHeader field="ref_asli" label={tr.colRef} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader field="cliente" label={tr.colClient} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader field="especie" label={tr.colSpecies} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader field="naviera" label={tr.colCarrier} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader field="nave" label={tr.colVessel} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader field="pol" label={tr.colPOL} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader field="pod" label={tr.colPOD} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader field="etd" label={tr.colETD} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} className="min-w-[7.5rem]" />
                    <SortableHeader field="eta" label={tr.colETA} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} className="min-w-[7.5rem]" />
                    <SortableHeader field="tt" label={tr.colTT} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader field="booking" label={tr.colBooking} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader field="estado_operacion" label={tr.colStatus} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                    <th className="px-4 py-3 text-center text-xs font-semibold text-neutral-400 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOperaciones.length === 0 ? (
                    <tr>
                      <td colSpan={isCliente ? 13 : 14} className="px-4 py-16 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <span className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center">
                            <Icon icon="typcn:clipboard" width={24} height={24} className="text-neutral-400" />
                          </span>
                          <p className="text-neutral-500 font-medium text-sm">{tr.noResults}</p>
                          {(activeFiltersCount > 0 || searchTerm) && (
                            <button onClick={clearAllFilters} className="text-xs text-brand-blue hover:underline font-medium mt-1">Limpiar filtros</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredOperaciones.map((op, idx) => {
                      const cfg = op.estado_operacion ? estadoConfig[op.estado_operacion] : null;
                      return (
                        <tr
                          key={op.id}
                          className={`border-b border-neutral-50 transition-colors ${
                            selectedIds.has(op.id) ? "bg-brand-blue/5" : idx % 2 === 0 ? "bg-white hover:bg-neutral-50/80" : "bg-neutral-50/40 hover:bg-neutral-50/80"
                          }`}
                        >
                          {!isCliente && (
                            <td className="px-4 py-3 text-center">
                              <input type="checkbox" checked={selectedIds.has(op.id)} onChange={() => handleSelect(op.id)} className="w-4 h-4 rounded border-neutral-300 accent-brand-blue" />
                            </td>
                          )}
                          <td className="px-4 py-3 text-center"><span className="font-bold text-brand-blue text-xs">{op.ref_asli || (op.correlativo ? `#${op.correlativo}` : "-")}</span></td>
                          <td className="px-4 py-3 text-center text-xs text-neutral-700 font-medium">{op.cliente || "-"}</td>
                          <td className="px-4 py-3 text-center text-xs text-neutral-600">{op.especie || "-"}</td>
                          <td className="px-4 py-3 text-center text-xs text-neutral-600">{op.naviera || "-"}</td>
                          <td className="px-4 py-3 text-center text-xs text-neutral-600">{op.nave || "-"}</td>
                          <td className="px-4 py-3 text-center text-xs text-neutral-500">{op.pol || "-"}</td>
                          <td className="px-4 py-3 text-center text-xs text-neutral-500">{op.pod || "-"}</td>
                          <td className="px-4 py-3 text-center text-xs text-neutral-600 font-medium min-w-[7.5rem]">{fmtDate(op.etd)}</td>
                          <td className="px-4 py-3 text-center text-xs text-neutral-600 font-medium min-w-[7.5rem]">{fmtDate(op.eta)}</td>
                          <td className="px-4 py-3 text-center">
                            {op.tt !== null ? (
                              <span className="text-xs font-semibold text-brand-blue bg-brand-blue/8 px-2 py-0.5 rounded-full">{op.tt}d</span>
                            ) : <span className="text-neutral-400 text-xs">-</span>}
                          </td>
                          <td className="px-4 py-3 text-center text-xs font-mono text-neutral-600">{op.booking || "-"}</td>
                          <td className="px-4 py-3 text-center">
                            {cfg ? (
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} shrink-0`} />
                                {op.estado_operacion}
                              </span>
                            ) : <span className="text-neutral-400 text-xs">-</span>}
                          </td>
                          {/* Acciones tabla */}
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-0.5">
                              <button onClick={() => handleCopy(op)} className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors" title="Copiar">
                                <Icon icon="lucide:copy" width={14} height={14} />
                              </button>
                              <button onClick={() => setEmailModal(op)} className="p-1.5 text-neutral-400 hover:text-brand-blue hover:bg-brand-blue/8 rounded-lg transition-colors" title="Enviar por correo">
                                <Icon icon="lucide:mail" width={14} height={14} />
                              </button>
                              {!isCliente && (
                                <button onClick={() => handleMoveToTrash([op.id])} disabled={actionLoading} className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50" title={tr.moveToTrash}>
                                  <Icon icon="typcn:trash" width={16} height={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {filteredOperaciones.length > 0 && (
              <div className="px-4 py-2.5 border-t border-neutral-100 flex items-center justify-between bg-neutral-50/50">
                <span className="text-xs text-neutral-400">
                  {filteredOperaciones.length} {filteredOperaciones.length === 1 ? "registro" : "registros"}
                  {filteredOperaciones.length !== operaciones.length && ` de ${operaciones.length}`}
                </span>
                {selectedIds.size > 0 && (
                  <span className="text-xs text-brand-blue font-medium">{selectedIds.size} seleccionado{selectedIds.size !== 1 ? "s" : ""}</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Vista Tarjetas ── */}
        {viewMode === "cards" && (
          <>
            {filteredOperaciones.length === 0 ? (
              <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm px-4 py-16 flex flex-col items-center gap-2">
                <span className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center">
                  <Icon icon="typcn:clipboard" width={24} height={24} className="text-neutral-400" />
                </span>
                <p className="text-neutral-500 font-medium text-sm">{tr.noResults}</p>
                {(activeFiltersCount > 0 || searchTerm) && (
                  <button onClick={clearAllFilters} className="text-xs text-brand-blue hover:underline font-medium mt-1">Limpiar filtros</button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredOperaciones.map((op) => (
                  <ReservaCard
                    key={op.id}
                    op={op}
                    isCliente={isCliente}
                    selected={selectedIds.has(op.id)}
                    actionLoading={actionLoading}
                    onSelect={() => handleSelect(op.id)}
                    onCopy={handleCopy}
                    onEmail={(o) => setEmailModal(o)}
                    onTrash={(id) => handleMoveToTrash([id])}
                  />
                ))}
              </div>
            )}
            {filteredOperaciones.length > 0 && (
              <p className="text-xs text-neutral-400 text-center">
                {filteredOperaciones.length} {filteredOperaciones.length === 1 ? "reserva" : "reservas"}
                {filteredOperaciones.length !== operaciones.length && ` de ${operaciones.length}`}
                {selectedIds.size > 0 && ` · ${selectedIds.size} seleccionada${selectedIds.size !== 1 ? "s" : ""}`}
              </p>
            )}
          </>
        )}

      </div>

      {/* Toast éxito */}
      {successMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 text-white text-sm font-medium shadow-lg animate-fade-in">
          <Icon icon="lucide:check-circle" className="w-5 h-5 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Toast error */}
      {errorMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-5 py-3 rounded-xl bg-red-600 text-white text-sm font-medium shadow-lg animate-fade-in">
          <Icon icon="lucide:alert-circle" className="w-5 h-5 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Modal tipo de transporte */}
      {showTransportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
          <div className="bg-white rounded-2xl shadow-mac-modal border border-neutral-200 p-6 w-full max-w-sm mx-4 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                <Icon icon="lucide:truck" width={20} height={20} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900">Enviar a Transportes</h3>
                <p className="text-xs text-neutral-500">{selectedIds.size} operación{selectedIds.size > 1 ? "es" : ""} seleccionada{selectedIds.size > 1 ? "s" : ""}</p>
              </div>
            </div>
            <p className="text-xs text-neutral-500 mb-4">Selecciona el tipo de reserva de transporte:</p>
            <div className="flex flex-col gap-2">
              <button type="button" onClick={() => void handleSendToAsli()} className="flex items-center gap-3 w-full p-3 rounded-xl border border-neutral-200 hover:border-brand-blue hover:bg-brand-blue/5 transition-all text-left group">
                <div className="w-9 h-9 rounded-lg bg-brand-blue/10 flex items-center justify-center shrink-0 group-hover:bg-brand-blue/20 transition-colors">
                  <Icon icon="lucide:building-2" width={18} height={18} className="text-brand-blue" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-800">Reserva ASLI</p>
                  <p className="text-[11px] text-neutral-400">Transporte gestionado por ASLI</p>
                </div>
              </button>
              <button type="button" onClick={() => void handleSendToExterna()} className="flex items-center gap-3 w-full p-3 rounded-xl border border-neutral-200 hover:border-emerald-400 hover:bg-emerald-50/50 transition-all text-left group">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0 group-hover:bg-emerald-200 transition-colors">
                  <Icon icon="lucide:globe" width={18} height={18} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-800">Reserva Externa</p>
                  <p className="text-[11px] text-neutral-400">Transporte de carga externa</p>
                </div>
              </button>
            </div>
            <button type="button" onClick={() => setShowTransportModal(false)} className="w-full mt-3 px-4 py-2 text-xs font-semibold text-neutral-600 bg-neutral-100 border border-neutral-200 rounded-xl hover:bg-neutral-200 transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Modal correo */}
      {emailModal && <EmailModal op={emailModal} onClose={() => setEmailModal(null)} />}
    </main>
  );
}
