import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
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
    if (!supabase) return;
    setLoading(true);

    const [operacionesRes, depositosRes, catalogosRes] = await Promise.all([
      supabase
        .from("operaciones")
        .select("id, ref_asli, correlativo, cliente, naviera, nave, booking, pod, etd, planta_presentacion, estado_operacion")
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      supabase.from("depositos").select("nombre").eq("activo", true).order("nombre"),
      supabase.from("catalogos").select("valor").eq("tipo", "porteo").eq("activo", true),
    ]);

    setOperaciones(operacionesRes.data ?? []);
    setDepositos((depositosRes.data ?? []).map((d) => d.nombre));
    setTransportistas((catalogosRes.data ?? []).map((c) => c.valor));
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

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

  const renderInput = (
    label: string,
    field: keyof FormData,
    type: string = "text",
    placeholder?: string
  ) => (
    <div>
      <label className="block text-sm font-medium text-neutral-700 mb-1">{label}</label>
      <input
        type={type}
        value={formData[field]}
        onChange={(e) => handleChange(field, e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors"
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
      <label className="block text-sm font-medium text-neutral-700 mb-1">{label}</label>
      <select
        value={formData[field]}
        onChange={(e) => handleChange(field, e.target.value)}
        className="w-full px-4 py-2.5 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors"
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
      <div className="w-full">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-brand-blue">{tr.title}</h1>
            <p className="text-neutral-500 text-sm mt-1">{tr.subtitle}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex gap-4">
            <div className="w-80 flex-shrink-0">
              <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden sticky top-0">
                <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50">
                  <h2 className="font-semibold text-neutral-800 text-sm flex items-center gap-2">
                    <Icon icon="typcn:document" className="w-4 h-4 text-brand-blue" />
                    {tr.selectOperation}
                  </h2>
                </div>
                <div className="p-3">
                  <div className="mb-3">
                    <div className="relative">
                      <Icon
                        icon="typcn:zoom"
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4"
                      />
                      <input
                        type="text"
                        placeholder={tr.searchPlaceholder}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
                      />
                    </div>
                  </div>

                  {filteredOperaciones.length === 0 ? (
                    <p className="text-center text-neutral-500 py-4 text-sm">{tr.noOperations}</p>
                  ) : (
                    <div className="max-h-[calc(100vh-280px)] overflow-y-auto space-y-1.5">
                      {filteredOperaciones.map((op) => (
                        <button
                          key={op.id}
                          type="button"
                          onClick={() => handleChange("operacion_id", op.id)}
                          className={`w-full text-left p-3 rounded-lg border transition-all ${
                            formData.operacion_id === op.id
                              ? "border-brand-blue bg-brand-blue/5 ring-2 ring-brand-blue/20"
                              : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
                          }`}
                        >
                          <p className="font-medium text-neutral-800 text-sm">
                            {op.ref_asli || `A${String(op.correlativo).padStart(5, "0")}`}
                          </p>
                          <p className="text-xs text-neutral-500 truncate">
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
                    <div className="p-4 bg-brand-blue/5 rounded-lg border border-brand-blue/20">
                      <p className="text-sm font-medium text-brand-blue">{tr.selectedOperation}</p>
                      <p className="text-neutral-800 font-semibold mt-1">
                        {selectedOperacion.ref_asli || `A${String(selectedOperacion.correlativo).padStart(5, "0")}`} - {selectedOperacion.cliente}
                      </p>
                      <p className="text-sm text-neutral-600">
                        {selectedOperacion.naviera} • {selectedOperacion.nave} • {selectedOperacion.booking}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
                      <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50">
                        <h2 className="font-semibold text-neutral-800 text-sm flex items-center gap-2">
                          <Icon icon="typcn:location-arrow" className="w-4 h-4 text-brand-blue" />
                          {tr.transportInfo}
                        </h2>
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

                    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
                      <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50">
                        <h2 className="font-semibold text-neutral-800 text-sm flex items-center gap-2">
                          <Icon icon="typcn:box" className="w-4 h-4 text-brand-blue" />
                          {tr.containerInfo}
                        </h2>
                      </div>
                      <div className="p-4 grid grid-cols-2 gap-3">
                        {renderInput(tr.container, "contenedor")}
                        {renderInput(tr.seal, "sello")}
                        {renderInput(tr.tare, "tara", "number")}
                        {renderSelect(tr.warehouse, "deposito", depositos)}
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
                      <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50">
                        <h2 className="font-semibold text-neutral-800 text-sm flex items-center gap-2">
                          <Icon icon="typcn:calendar" className="w-4 h-4 text-brand-blue" />
                          {tr.schedules}
                        </h2>
                      </div>
                      <div className="p-4 grid grid-cols-2 gap-3">
                        {renderInput(tr.citation, "citacion", "datetime-local")}
                        {renderInput(tr.plantArrival, "llegada_planta", "datetime-local")}
                        {renderInput(tr.plantDeparture, "salida_planta", "datetime-local")}
                        {renderInput(tr.pickupSchedule, "agendamiento_retiro", "datetime-local")}
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
                      <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50">
                        <h2 className="font-semibold text-neutral-800 text-sm flex items-center gap-2">
                          <Icon icon="typcn:th-large" className="w-4 h-4 text-brand-blue" />
                          {tr.stacking}
                        </h2>
                      </div>
                      <div className="p-4 grid grid-cols-2 gap-3">
                        {renderInput(tr.stackingStart, "inicio_stacking", "datetime-local")}
                        {renderInput(tr.stackingEnd, "fin_stacking", "datetime-local")}
                        <div className="col-span-2">
                          {renderInput(tr.stackingEntry, "ingreso_stacking", "datetime-local")}
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
                      <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50">
                        <h2 className="font-semibold text-neutral-800 text-sm flex items-center gap-2">
                          <Icon icon="typcn:calculator" className="w-4 h-4 text-brand-blue" />
                          {tr.costs}
                        </h2>
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

                  <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50">
                      <h2 className="font-semibold text-neutral-800 text-sm flex items-center gap-2">
                        <Icon icon="typcn:notes" className="w-4 h-4 text-brand-blue" />
                        {tr.observations}
                      </h2>
                    </div>
                    <div className="p-4">
                      <textarea
                        value={formData.observaciones}
                        onChange={(e) => handleChange("observaciones", e.target.value)}
                        rows={2}
                        placeholder={tr.observationsPlaceholder}
                        className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue resize-none"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
                      <Icon icon="typcn:tick" className="w-5 h-5" />
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
                      className="px-5 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
                    >
                      {tr.cancel}
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-brand-blue rounded-lg hover:bg-brand-blue/90 transition-colors disabled:opacity-50"
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
                <div className="flex items-center justify-center h-64 bg-white rounded-xl border border-neutral-200">
                  <div className="text-center text-neutral-500">
                    <Icon icon="typcn:arrow-left" className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">{tr.selectOperation}</p>
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
