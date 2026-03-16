import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type Operacion = {
  id: string;
  ref_asli: string;
  correlativo: number;
  cliente: string;
  naviera: string;
  nave: string;
  booking: string;
  pod: string;
  etd: string | null;
  planta_presentacion: string;
  estado_operacion: string;
};

type FormData = {
  operacion_id: string;
  transporte: string;
  chofer: string;
  rut_chofer: string;
  telefono_chofer: string;
  patente_camion: string;
  patente_remolque: string;
  contenedor: string;
  sello: string;
  tara: string;
  citacion: string;
  llegada_planta: string;
  salida_planta: string;
  deposito: string;
  agendamiento_retiro: string;
  inicio_stacking: string;
  fin_stacking: string;
  ingreso_stacking: string;
  tramo: string;
  valor_tramo: string;
  porteo: string;
  valor_porteo: string;
  falso_flete: string;
  valor_falso_flete: string;
  factura_transporte: string;
  observaciones: string;
};

const initialFormData: FormData = {
  operacion_id: "",
  transporte: "",
  chofer: "",
  rut_chofer: "",
  telefono_chofer: "",
  patente_camion: "",
  patente_remolque: "",
  contenedor: "",
  sello: "",
  tara: "",
  citacion: "",
  llegada_planta: "",
  salida_planta: "",
  deposito: "",
  agendamiento_retiro: "",
  inicio_stacking: "",
  fin_stacking: "",
  ingreso_stacking: "",
  tramo: "",
  valor_tramo: "",
  porteo: "",
  valor_porteo: "",
  falso_flete: "",
  valor_falso_flete: "",
  factura_transporte: "",
  observaciones: "",
};

export function ReservaExtContent() {
  const { t, locale } = useLocale();
  const { isCliente, empresaNombres, isLoading: authLoading } = useAuth();
  const tr = t.transporteExt;
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [operaciones, setOperaciones] = useState<Operacion[]>([]);
  const [depositos, setDepositos] = useState<string[]>([]);
  const [transportistas, setTransportistas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (!supabase || authLoading) return;
    setLoading(true);

    let qOp = supabase
      .from("operaciones")
      .select("id, ref_asli, correlativo, cliente, naviera, nave, booking, pod, etd, planta_presentacion, estado_operacion")
      .is("deleted_at", null);
    if (empresaNombres.length > 0) {
      qOp = qOp.in("cliente", empresaNombres);
    }
    const [operacionesRes, depositosRes, catalogosRes] = await Promise.all([
      qOp.order("created_at", { ascending: false }),
      supabase.from("depositos").select("nombre").eq("activo", true).order("nombre"),
      supabase.from("catalogos").select("valor").eq("tipo", "porteo").eq("activo", true),
    ]);

    setOperaciones(operacionesRes.data ?? []);
    setDepositos((depositosRes.data ?? []).map((d) => d.nombre));
    setTransportistas((catalogosRes.data ?? []).map((c) => c.valor));
    setLoading(false);
  }, [supabase, authLoading, isCliente, empresaNombres]);

  useEffect(() => {
    if (!authLoading) void fetchData();
    else setOperaciones([]);
  }, [authLoading, fetchData]);

  const selectedOperacion = useMemo(() => {
    return operaciones.find((op) => op.id === formData.operacion_id);
  }, [operaciones, formData.operacion_id]);

  const filteredOperaciones = useMemo(() => {
    if (!searchTerm.trim()) return operaciones;
    const search = searchTerm.toLowerCase();
    return operaciones.filter((op) => {
      const ref = op.ref_asli || `A${String(op.correlativo).padStart(5, "0")}`;
      return (
        ref.toLowerCase().includes(search) ||
        (op.cliente ?? "").toLowerCase().includes(search) ||
        (op.booking ?? "").toLowerCase().includes(search) ||
        (op.naviera ?? "").toLowerCase().includes(search) ||
        (op.nave ?? "").toLowerCase().includes(search) ||
        (op.pod ?? "").toLowerCase().includes(search)
      );
    });
  }, [operaciones, searchTerm]);

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSuccess(false);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !formData.operacion_id) return;

    setSaving(true);
    setError(null);

    const updates: Record<string, unknown> = {
      transporte: formData.transporte || null,
      chofer: formData.chofer || null,
      rut_chofer: formData.rut_chofer || null,
      telefono_chofer: formData.telefono_chofer || null,
      patente_camion: formData.patente_camion || null,
      patente_remolque: formData.patente_remolque || null,
      contenedor: formData.contenedor || null,
      sello: formData.sello || null,
      tara: formData.tara ? parseFloat(formData.tara) : null,
      citacion: formData.citacion || null,
      llegada_planta: formData.llegada_planta || null,
      salida_planta: formData.salida_planta || null,
      deposito: formData.deposito || null,
      agendamiento_retiro: formData.agendamiento_retiro || null,
      inicio_stacking: formData.inicio_stacking || null,
      fin_stacking: formData.fin_stacking || null,
      ingreso_stacking: formData.ingreso_stacking || null,
      tramo: formData.tramo || null,
      valor_tramo: formData.valor_tramo ? parseFloat(formData.valor_tramo) : null,
      porteo: formData.porteo || null,
      valor_porteo: formData.valor_porteo ? parseFloat(formData.valor_porteo) : null,
      falso_flete: formData.falso_flete || null,
      valor_falso_flete: formData.valor_falso_flete ? parseFloat(formData.valor_falso_flete) : null,
      factura_transporte: formData.factura_transporte || null,
      observaciones: formData.observaciones || null,
    };

    const { error: err } = await supabase
      .from("operaciones")
      .update(updates)
      .eq("id", formData.operacion_id);

    setSaving(false);

    if (err) {
      setError(err.message);
    } else {
      setSuccess(true);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), "dd MMM yyyy", { locale: locale === "es" ? es : undefined });
    } catch {
      return dateStr;
    }
  };

  const inputClass =
    "w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:bg-white transition-all";
  const labelClass = "block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1";

  const renderInput = (
    label: string,
    field: keyof FormData,
    type: string = "text",
    placeholder?: string
  ) => (
    <div>
      <label className={labelClass}>{label}</label>
      <input
        type={type}
        value={formData[field]}
        onChange={(e) => handleChange(field, e.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
    </div>
  );

  const renderSelect = (
    label: string,
    field: keyof FormData,
    options: string[],
    placeholder?: string
  ) => (
    <div>
      <label className={labelClass}>{label}</label>
      <select
        value={formData[field]}
        onChange={(e) => handleChange(field, e.target.value)}
        className={inputClass}
      >
        <option value="">{placeholder || tr.select}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );

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

        {/* Header — alineado con Reserva ASLI */}
        <div className="rounded-2xl bg-white border border-neutral-200 shadow-sm overflow-hidden">
          <div className="h-[3px] bg-gradient-to-r from-brand-blue to-brand-teal" />
          <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-blue flex items-center justify-center flex-shrink-0">
                <Icon icon="lucide:truck" width={20} height={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-neutral-900 leading-tight">
                  {tr.title}
                </h1>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {tr.subtitle}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void fetchData()}
              className="p-2 border border-neutral-200 bg-neutral-50 rounded-xl hover:bg-neutral-100 transition-colors text-neutral-500"
              title={t.misReservas?.refresh ?? "Actualizar"}
            >
              <Icon icon="typcn:refresh" width={18} height={18} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Panel selección operación */}
            <div className="w-full lg:w-80 lg:flex-shrink-0">
              <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden lg:sticky lg:top-0">
                <div className="h-[2px] bg-gradient-to-r from-brand-blue/60 to-brand-teal/60" />
                <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                    <Icon icon="typcn:document" className="w-4 h-4 text-brand-blue" />
                  </span>
                  <h2 className="text-xs font-bold text-neutral-600 uppercase tracking-wider">
                    {tr.selectOperation}
                  </h2>
                </div>
                <div className="p-4">
                  <div className="mb-3">
                    <div className="relative">
                      <Icon
                        icon="typcn:zoom"
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4 pointer-events-none"
                      />
                      <input
                        type="text"
                        placeholder={tr.searchPlaceholder}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-neutral-200 bg-neutral-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  {filteredOperaciones.length === 0 ? (
                    <div className="py-8 text-center">
                      <span className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center mx-auto mb-2 inline-flex">
                        <Icon icon="typcn:document" width={20} height={20} className="text-neutral-400" />
                      </span>
                      <p className="text-neutral-500 text-sm font-medium">{tr.noOperations}</p>
                    </div>
                  ) : (
                    <div className="max-h-[calc(100vh-320px)] overflow-y-auto space-y-2">
                      {filteredOperaciones.map((op) => (
                        <button
                          key={op.id}
                          type="button"
                          onClick={() => handleChange("operacion_id", op.id)}
                          className={`w-full text-left p-3 rounded-xl border transition-all ${
                            formData.operacion_id === op.id
                              ? "border-brand-blue bg-brand-blue/5 ring-2 ring-brand-blue/20"
                              : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
                          }`}
                        >
                          <p className="font-semibold text-brand-blue text-sm">
                            {op.ref_asli || `A${String(op.correlativo).padStart(5, "0")}`}
                          </p>
                          <p className="text-xs text-neutral-600 truncate mt-0.5">
                            {op.cliente} • {op.booking}
                          </p>
                          <p className="text-xs text-neutral-400 mt-1">
                            {op.naviera} • ETD: {formatDate(op.etd)}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              {formData.operacion_id ? (
                <div className="space-y-4">
                  {selectedOperacion && (
                    <div className="rounded-2xl bg-white border border-neutral-200 shadow-sm overflow-hidden">
                      <div className="h-[2px] bg-gradient-to-r from-brand-blue to-brand-teal" />
                      <div className="p-4 bg-brand-blue/5 border-l-4 border-brand-blue">
                        <p className="text-xs font-semibold text-brand-blue uppercase tracking-wider">{tr.selectedOperation}</p>
                        <p className="text-neutral-800 font-bold mt-1 text-sm">
                          {selectedOperacion.ref_asli || `A${String(selectedOperacion.correlativo).padStart(5, "0")}`} — {selectedOperacion.cliente}
                        </p>
                        <p className="text-sm text-neutral-600 mt-0.5">
                          {selectedOperacion.naviera} • {selectedOperacion.nave} • {selectedOperacion.booking}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                      <div className="h-[2px] bg-gradient-to-r from-brand-blue/60 to-brand-teal/60" />
                      <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                          <Icon icon="typcn:location-arrow" className="w-4 h-4 text-brand-blue" />
                        </span>
                        <h2 className="text-xs font-bold text-neutral-600 uppercase tracking-wider">{tr.transportInfo}</h2>
                      </div>
                      <div className="p-4 grid grid-cols-2 gap-3">
                        {renderInput(tr.transportCompany, "transporte")}
                        {renderInput(tr.driverName, "chofer")}
                        {renderInput(tr.driverRut, "rut_chofer")}
                        {renderInput(tr.driverPhone, "telefono_chofer", "tel")}
                        {renderInput(tr.truckPlate, "patente_camion")}
                        {renderInput(tr.trailerPlate, "patente_remolque")}
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                      <div className="h-[2px] bg-gradient-to-r from-brand-blue/60 to-brand-teal/60" />
                      <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                          <Icon icon="typcn:box" className="w-4 h-4 text-brand-blue" />
                        </span>
                        <h2 className="text-xs font-bold text-neutral-600 uppercase tracking-wider">{tr.containerInfo}</h2>
                      </div>
                      <div className="p-4 grid grid-cols-2 gap-3">
                        {renderInput(tr.container, "contenedor")}
                        {renderInput(tr.seal, "sello")}
                        {renderInput(tr.tare, "tara", "number")}
                        {renderSelect(tr.warehouse, "deposito", depositos)}
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                      <div className="h-[2px] bg-gradient-to-r from-brand-blue/60 to-brand-teal/60" />
                      <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                          <Icon icon="typcn:calendar" className="w-4 h-4 text-brand-blue" />
                        </span>
                        <h2 className="text-xs font-bold text-neutral-600 uppercase tracking-wider">{tr.schedules}</h2>
                      </div>
                      <div className="p-4 grid grid-cols-2 gap-3">
                        {renderInput(tr.citation, "citacion", "datetime-local")}
                        {renderInput(tr.plantArrival, "llegada_planta", "datetime-local")}
                        {renderInput(tr.plantDeparture, "salida_planta", "datetime-local")}
                        {renderInput(tr.pickupSchedule, "agendamiento_retiro", "datetime-local")}
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                      <div className="h-[2px] bg-gradient-to-r from-brand-blue/60 to-brand-teal/60" />
                      <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                          <Icon icon="typcn:th-large" className="w-4 h-4 text-brand-blue" />
                        </span>
                        <h2 className="text-xs font-bold text-neutral-600 uppercase tracking-wider">{tr.stacking}</h2>
                      </div>
                      <div className="p-4 grid grid-cols-2 gap-3">
                        {renderInput(tr.stackingStart, "inicio_stacking", "datetime-local")}
                        {renderInput(tr.stackingEnd, "fin_stacking", "datetime-local")}
                        <div className="col-span-2">
                          {renderInput(tr.stackingEntry, "ingreso_stacking", "datetime-local")}
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                      <div className="h-[2px] bg-gradient-to-r from-brand-blue/60 to-brand-teal/60" />
                      <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                          <Icon icon="typcn:calculator" className="w-4 h-4 text-brand-blue" />
                        </span>
                        <h2 className="text-xs font-bold text-neutral-600 uppercase tracking-wider">{tr.costs}</h2>
                      </div>
                      <div className="p-4 grid grid-cols-2 gap-3">
                        {renderInput(tr.section, "tramo")}
                        {renderInput(tr.sectionValue, "valor_tramo", "number")}
                        {renderSelect(tr.portage, "porteo", ["SÍ", "NO"])}
                        {renderInput(tr.portageValue, "valor_porteo", "number")}
                        {renderSelect(tr.deadFreight, "falso_flete", ["SÍ", "NO"])}
                        {renderInput(tr.deadFreightValue, "valor_falso_flete", "number")}
                        <div className="col-span-2">
                          {renderInput(tr.transportInvoice, "factura_transporte")}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                    <div className="h-[2px] bg-gradient-to-r from-brand-blue/60 to-brand-teal/60" />
                    <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                        <Icon icon="typcn:notes" className="w-4 h-4 text-brand-blue" />
                      </span>
                      <h2 className="text-xs font-bold text-neutral-600 uppercase tracking-wider">{tr.observations}</h2>
                    </div>
                    <div className="p-4">
                      <textarea
                        value={formData.observaciones}
                        onChange={(e) => handleChange("observaciones", e.target.value)}
                        rows={2}
                        placeholder={tr.observationsPlaceholder}
                        className={`${inputClass} resize-none`}
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm font-medium flex items-center gap-2">
                      <Icon icon="typcn:tick" className="w-5 h-5 flex-shrink-0" />
                      {tr.saveSuccess}
                    </div>
                  )}

                  <div className="flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(initialFormData);
                        setSuccess(false);
                        setError(null);
                      }}
                      className="px-4 py-2.5 text-sm font-semibold text-neutral-600 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors"
                    >
                      {tr.cancel}
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-brand-blue rounded-xl hover:bg-brand-blue/90 transition-colors shadow-sm shadow-brand-blue/20 disabled:opacity-50"
                    >
                      {saving ? (
                        <>
                          <Icon icon="typcn:refresh" className="w-4 h-4 animate-spin" />
                          {tr.saving}
                        </>
                      ) : (
                        <>
                          <Icon icon="typcn:tick" className="w-4 h-4" />
                          {tr.save}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl bg-white border border-neutral-200 shadow-sm overflow-hidden flex items-center justify-center min-h-[280px]">
                  <div className="text-center py-8 px-4">
                    <span className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-3 inline-flex">
                      <Icon icon="typcn:arrow-left" width={24} height={24} className="text-neutral-400" />
                    </span>
                    <p className="text-neutral-500 text-sm font-medium">{tr.selectOperation}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
