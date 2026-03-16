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

type SortableHeaderProps = {
  field: SortField;
  label: string;
  sortField: SortField | null;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  /** Clase opcional para ancho mínimo (ej. columnas ETD/ETA). */
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

type SortField = "ref_asli" | "cliente" | "especie" | "naviera" | "nave" | "pol" | "pod" | "etd" | "eta" | "tt" | "booking" | "estado_operacion";
type SortDirection = "asc" | "desc";

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
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [showFilters, setShowFilters] = useState(false);

  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  const fetchOperaciones = useCallback(async () => {
    if (!supabase || authLoading) return;
    setLoading(true);

    let q = supabase
      .from("operaciones")
      .select(
        "id, correlativo, ref_asli, cliente, especie, naviera, nave, pol, pod, etd, eta, tt, booking, estado_operacion, created_at"
      )
      .is("deleted_at", null);
    if (empresaNombres.length > 0) {
      q = q.in("cliente", empresaNombres);
    }
    const { data, error } = await q.order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading operaciones:", error);
    } else {
      setOperaciones(data || []);
    }
    setLoading(false);
  }, [supabase, authLoading, isCliente, empresaNombres]);

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

  const getFilteredData = useCallback((excludeFilter?: "estado" | "cliente" | "naviera" | "especie") => {
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

    if (estadoFilter && excludeFilter !== "estado") {
      result = result.filter((op) => op.estado_operacion === estadoFilter);
    }
    if (clienteFilter && excludeFilter !== "cliente") {
      result = result.filter((op) => op.cliente === clienteFilter);
    }
    if (navieraFilter && excludeFilter !== "naviera") {
      result = result.filter((op) => op.naviera === navieraFilter);
    }
    if (especieFilter && excludeFilter !== "especie") {
      result = result.filter((op) => op.especie === especieFilter);
    }

    return result;
  }, [operaciones, searchTerm, estadoFilter, clienteFilter, navieraFilter, especieFilter]);

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

        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();
        const comparison = aStr.localeCompare(bStr);
        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return result;
  }, [getFilteredData, sortField, sortDirection]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), "dd-MM-yyyy", { locale: es });
    } catch {
      return dateStr;
    }
  };

  const estados = useMemo(() => {
    const data = getFilteredData("estado");
    const set = new Set(data.map((op) => op.estado_operacion).filter(Boolean));
    return Array.from(set).sort();
  }, [getFilteredData]);

  const clientes = useMemo(() => {
    const data = getFilteredData("cliente");
    const set = new Set(data.map((op) => op.cliente).filter(Boolean));
    return Array.from(set).sort() as string[];
  }, [getFilteredData]);

  const navieras = useMemo(() => {
    const data = getFilteredData("naviera");
    const set = new Set(data.map((op) => op.naviera).filter(Boolean));
    return Array.from(set).sort() as string[];
  }, [getFilteredData]);

  const especies = useMemo(() => {
    const data = getFilteredData("especie");
    const set = new Set(data.map((op) => op.especie).filter(Boolean));
    return Array.from(set).sort() as string[];
  }, [getFilteredData]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (estadoFilter) count++;
    if (clienteFilter) count++;
    if (navieraFilter) count++;
    if (especieFilter) count++;
    return count;
  }, [estadoFilter, clienteFilter, navieraFilter, especieFilter]);

  const clearAllFilters = () => {
    setSearchTerm("");
    setEstadoFilter("");
    setClienteFilter("");
    setNavieraFilter("");
    setEspecieFilter("");
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredOperaciones.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredOperaciones.map((op) => op.id)));
    }
  };

  const handleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleMoveToTrash = async (ids: string[]) => {
    if (!supabase || ids.length === 0) return;
    setActionLoading(true);

    const { error } = await supabase
      .from("operaciones")
      .update({ deleted_at: new Date().toISOString() })
      .in("id", ids);

    if (error) {
      console.error("Error moving to trash:", error);
      alert(tr.errorMovingToTrash);
    } else {
      setSelectedIds(new Set());
      await fetchOperaciones();
    }
    setActionLoading(false);
  };

  const filterSelectClass =
    "w-full px-3 py-2 border border-neutral-200 bg-neutral-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:bg-white transition-all";

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
              <div className="w-10 h-10 rounded-xl bg-brand-blue flex items-center justify-center flex-shrink-0">
                <Icon icon="typcn:clipboard" width={20} height={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-neutral-900 leading-tight">
                  {t.sidebar.misReservas}
                </h1>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {filteredOperaciones.length === operaciones.length
                    ? `${operaciones.length} ${tr.records}`
                    : `${filteredOperaciones.length} de ${operaciones.length} ${tr.records}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {!isCliente && selectedIds.size > 0 && (
                <button
                  onClick={() => handleMoveToTrash(Array.from(selectedIds))}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-red-50 text-red-700 border border-red-200 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  <Icon icon="typcn:trash" width={15} height={15} />
                  {tr.delete} ({selectedIds.size})
                </button>
              )}
              <button
                onClick={fetchOperaciones}
                className="p-2 border border-neutral-200 bg-neutral-50 rounded-xl hover:bg-neutral-100 transition-colors text-neutral-500"
                title={tr.refresh}
              >
                <Icon icon="typcn:refresh" width={18} height={18} />
              </button>
              <a
                href="/reservas/crear"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-brand-blue text-white rounded-xl hover:bg-brand-blue/90 transition-colors shadow-sm shadow-brand-blue/20"
              >
                <Icon icon="typcn:plus" width={15} height={15} />
                {tr.newBooking}
              </a>
            </div>
          </div>
        </div>

        {/* Search + filters bar */}
        <div className="flex flex-wrap gap-2 items-center">
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
            className={`inline-flex items-center gap-2 px-3.5 py-2 border rounded-xl text-sm font-medium transition-colors ${
              showFilters || activeFiltersCount > 0
                ? "border-brand-blue bg-brand-blue/5 text-brand-blue"
                : "border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600"
            }`}
          >
            <Icon icon="typcn:filter" width={16} height={16} />
            {tr.filters}
            {activeFiltersCount > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-brand-blue text-white rounded-full leading-none">
                {activeFiltersCount}
              </span>
            )}
          </button>
          {(activeFiltersCount > 0 || searchTerm) && (
            <button
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-500 hover:text-neutral-700 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors"
            >
              <Icon icon="typcn:times" width={14} height={14} />
              Limpiar
            </button>
          )}
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-600 uppercase tracking-wider">{tr.advancedFilters}</span>
              {activeFiltersCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
                >
                  {tr.clearFilters}
                </button>
              )}
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">{tr.colStatus}</label>
                <select value={estadoFilter} onChange={(e) => setEstadoFilter(e.target.value)} className={filterSelectClass}>
                  <option value="">{tr.allStates}</option>
                  {estados.map((estado) => <option key={estado} value={estado!}>{estado}</option>)}
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

        {/* Table */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100">
                  {!isCliente && (
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === filteredOperaciones.length && filteredOperaciones.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded border-neutral-300 accent-brand-blue"
                      />
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
                  {!isCliente && (
                    <th className="px-4 py-3 text-center text-xs font-semibold text-neutral-400 uppercase tracking-wider">{tr.colActions}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredOperaciones.length === 0 ? (
                  <tr>
                    <td colSpan={isCliente ? 12 : 14} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <span className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center">
                          <Icon icon="typcn:clipboard" width={24} height={24} className="text-neutral-400" />
                        </span>
                        <p className="text-neutral-500 font-medium text-sm">{tr.noResults}</p>
                        {(activeFiltersCount > 0 || searchTerm) && (
                          <button onClick={clearAllFilters} className="text-xs text-brand-blue hover:underline font-medium mt-1">
                            Limpiar filtros
                          </button>
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
                          selectedIds.has(op.id)
                            ? "bg-brand-blue/5"
                            : idx % 2 === 0
                            ? "bg-white hover:bg-neutral-50/80"
                            : "bg-neutral-50/40 hover:bg-neutral-50/80"
                        }`}
                      >
                        {!isCliente && (
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(op.id)}
                              onChange={() => handleSelect(op.id)}
                              className="w-4 h-4 rounded border-neutral-300 accent-brand-blue"
                            />
                          </td>
                        )}
                        <td className="px-4 py-3 text-center">
                          <span className="font-bold text-brand-blue text-xs">
                            {op.ref_asli || (op.correlativo ? `#${op.correlativo}` : "-")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-neutral-700 font-medium">{op.cliente || "-"}</td>
                        <td className="px-4 py-3 text-center text-xs text-neutral-600">{op.especie || "-"}</td>
                        <td className="px-4 py-3 text-center text-xs text-neutral-600">{op.naviera || "-"}</td>
                        <td className="px-4 py-3 text-center text-xs text-neutral-600">{op.nave || "-"}</td>
                        <td className="px-4 py-3 text-center text-xs text-neutral-500">{op.pol || "-"}</td>
                        <td className="px-4 py-3 text-center text-xs text-neutral-500">{op.pod || "-"}</td>
                        <td className="px-4 py-3 text-center text-xs text-neutral-600 font-medium min-w-[7.5rem]">{formatDate(op.etd)}</td>
                        <td className="px-4 py-3 text-center text-xs text-neutral-600 font-medium min-w-[7.5rem]">{formatDate(op.eta)}</td>
                        <td className="px-4 py-3 text-center">
                          {op.tt !== null ? (
                            <span className="text-xs font-semibold text-brand-blue bg-brand-blue/8 px-2 py-0.5 rounded-full">
                              {op.tt}d
                            </span>
                          ) : <span className="text-neutral-400 text-xs">-</span>}
                        </td>
                        <td className="px-4 py-3 text-center text-xs font-mono text-neutral-600">{op.booking || "-"}</td>
                        <td className="px-4 py-3 text-center">
                          {cfg ? (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} flex-shrink-0`} />
                              {op.estado_operacion}
                            </span>
                          ) : (
                            <span className="text-neutral-400 text-xs">-</span>
                          )}
                        </td>
                        {!isCliente && (
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleMoveToTrash([op.id])}
                              disabled={actionLoading}
                              className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title={tr.moveToTrash}
                            >
                              <Icon icon="typcn:trash" width={16} height={16} />
                            </button>
                          </td>
                        )}
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
                <span className="text-xs text-brand-blue font-medium">
                  {selectedIds.size} seleccionado{selectedIds.size !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
