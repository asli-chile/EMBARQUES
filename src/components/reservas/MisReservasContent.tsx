import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
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

const estadoColors: Record<string, string> = {
  PENDIENTE: "bg-amber-100 text-amber-800",
  "EN PROCESO": "bg-blue-100 text-blue-800",
  "EN TRÁNSITO": "bg-purple-100 text-purple-800",
  ARRIBADO: "bg-green-100 text-green-800",
  COMPLETADO: "bg-neutral-100 text-neutral-800",
  CANCELADO: "bg-red-100 text-red-800",
  ROLEADO: "bg-orange-100 text-orange-800",
};

type SortableHeaderProps = {
  field: SortField;
  label: string;
  sortField: SortField | null;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
};

function SortableHeader({ field, label, sortField, sortDirection, onSort }: SortableHeaderProps) {
  const isActive = sortField === field;
  return (
    <th className="px-4 py-3 text-center font-medium text-neutral-600">
      <button
        type="button"
        onClick={() => onSort(field)}
        className="inline-flex items-center gap-1 hover:text-brand-blue transition-colors"
      >
        {label}
        <span className="flex flex-col">
          <Icon
            icon="typcn:arrow-sorted-up"
            width={10}
            height={10}
            className={isActive && sortDirection === "asc" ? "text-brand-blue" : "text-neutral-300"}
          />
          <Icon
            icon="typcn:arrow-sorted-down"
            width={10}
            height={10}
            className={isActive && sortDirection === "desc" ? "text-brand-blue" : "text-neutral-300"}
            style={{ marginTop: -4 }}
          />
        </span>
      </button>
    </th>
  );
}

type SortField = "ref_asli" | "cliente" | "especie" | "naviera" | "nave" | "pol" | "pod" | "etd" | "eta" | "tt" | "booking" | "estado_operacion";
type SortDirection = "asc" | "desc";

export function MisReservasContent() {
  const { t } = useLocale();
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
    if (!supabase) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("operaciones")
      .select(
        "id, correlativo, ref_asli, cliente, especie, naviera, nave, pol, pod, etd, eta, tt, booking, estado_operacion, created_at"
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading operaciones:", error);
    } else {
      setOperaciones(data || []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void fetchOperaciones();
  }, [fetchOperaciones]);

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

  if (loading) {
    return (
      <main className="flex-1 bg-neutral-50 min-h-0 overflow-auto p-6 flex items-center justify-center">
        <div className="flex items-center gap-3 text-neutral-500">
          <Icon icon="typcn:refresh" className="w-6 h-6 animate-spin" />
          <span>{tr.loading}</span>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-neutral-50 min-h-0 overflow-auto p-4">
      <div className="w-full space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-brand-blue">
              {t.sidebar.misReservas}
            </h1>
            <p className="text-neutral-500 text-sm mt-1">
              {filteredOperaciones.length} / {operaciones.length} {tr.records}
            </p>
          </div>
          <div className="flex gap-2">
            {selectedIds.size > 0 && (
              <button
                onClick={() => handleMoveToTrash(Array.from(selectedIds))}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <Icon icon="typcn:trash" width={18} height={18} />
                {tr.delete} ({selectedIds.size})
              </button>
            )}
            <a
              href="/reservas/crear"
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue/90 transition-colors"
            >
              <Icon icon="typcn:plus" width={18} height={18} />
              {tr.newBooking}
            </a>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[250px]">
            <div className="relative">
              <Icon
                icon="typcn:zoom"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5"
              />
              <input
                type="text"
                placeholder={tr.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
              />
            </div>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
              showFilters || activeFiltersCount > 0
                ? "border-brand-blue bg-brand-blue/5 text-brand-blue"
                : "border-neutral-200 hover:bg-neutral-100"
            }`}
          >
            <Icon icon="typcn:filter" width={18} height={18} />
            {tr.filters}
            {activeFiltersCount > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs bg-brand-blue text-white rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </button>
          <button
            onClick={fetchOperaciones}
            className="px-4 py-2 border border-neutral-200 rounded-lg hover:bg-neutral-100 transition-colors"
            title={tr.refresh}
          >
            <Icon icon="typcn:refresh" width={20} height={20} />
          </button>
        </div>

        {showFilters && (
          <div className="bg-white rounded-lg border border-neutral-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-neutral-700">{tr.advancedFilters}</h3>
              {activeFiltersCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700 transition-colors"
                >
                  <Icon icon="typcn:times" width={16} height={16} />
                  {tr.clearFilters}
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">{tr.colStatus}</label>
                <select
                  value={estadoFilter}
                  onChange={(e) => setEstadoFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-sm"
                >
                  <option value="">{tr.allStates}</option>
                  {estados.map((estado) => (
                    <option key={estado} value={estado!}>
                      {estado}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">{tr.colClient}</label>
                <select
                  value={clienteFilter}
                  onChange={(e) => setClienteFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-sm"
                >
                  <option value="">{tr.allClients}</option>
                  {clientes.map((cliente) => (
                    <option key={cliente} value={cliente}>
                      {cliente}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">{tr.colCarrier}</label>
                <select
                  value={navieraFilter}
                  onChange={(e) => setNavieraFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-sm"
                >
                  <option value="">{tr.allCarriers}</option>
                  {navieras.map((naviera) => (
                    <option key={naviera} value={naviera}>
                      {naviera}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">{tr.colSpecies}</label>
                <select
                  value={especieFilter}
                  onChange={(e) => setEspecieFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-sm"
                >
                  <option value="">{tr.allSpecies}</option>
                  {especies.map((especie) => (
                    <option key={especie} value={especie}>
                      {especie}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredOperaciones.length && filteredOperaciones.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-neutral-300"
                    />
                  </th>
                  <SortableHeader field="ref_asli" label={tr.colRef} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader field="cliente" label={tr.colClient} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader field="especie" label={tr.colSpecies} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader field="naviera" label={tr.colCarrier} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader field="nave" label={tr.colVessel} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader field="pol" label={tr.colPOL} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader field="pod" label={tr.colPOD} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader field="etd" label={tr.colETD} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader field="eta" label={tr.colETA} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader field="tt" label={tr.colTT} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader field="booking" label={tr.colBooking} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader field="estado_operacion" label={tr.colStatus} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                  <th className="px-4 py-3 text-center font-medium text-neutral-600">{tr.colActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredOperaciones.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="px-4 py-8 text-center text-neutral-500">
                      {tr.noResults}
                    </td>
                  </tr>
                ) : (
                  filteredOperaciones.map((op) => (
                    <tr
                      key={op.id}
                      className={`hover:bg-neutral-50 transition-colors ${
                        selectedIds.has(op.id) ? "bg-blue-50" : ""
                      }`}
                    >
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(op.id)}
                          onChange={() => handleSelect(op.id)}
                          className="w-4 h-4 rounded border-neutral-300"
                        />
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-brand-blue">
                        {op.ref_asli || op.correlativo || "-"}
                      </td>
                      <td className="px-4 py-3 text-center">{op.cliente || "-"}</td>
                      <td className="px-4 py-3 text-center">{op.especie || "-"}</td>
                      <td className="px-4 py-3 text-center">{op.naviera || "-"}</td>
                      <td className="px-4 py-3 text-center">{op.nave || "-"}</td>
                      <td className="px-4 py-3 text-center">{op.pol || "-"}</td>
                      <td className="px-4 py-3 text-center">{op.pod || "-"}</td>
                      <td className="px-4 py-3 text-center">{formatDate(op.etd)}</td>
                      <td className="px-4 py-3 text-center">{formatDate(op.eta)}</td>
                      <td className="px-4 py-3 text-center">{op.tt ?? "-"}</td>
                      <td className="px-4 py-3 text-center">{op.booking || "-"}</td>
                      <td className="px-4 py-3 text-center">
                        {op.estado_operacion && (
                          <span
                            className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                              estadoColors[op.estado_operacion] || "bg-neutral-100 text-neutral-800"
                            }`}
                          >
                            {op.estado_operacion}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleMoveToTrash([op.id])}
                          disabled={actionLoading}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title={tr.moveToTrash}
                        >
                          <Icon icon="typcn:trash" width={18} height={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
