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
  estado_operacion: string;
  factura_transporte: string | null;
  monto_facturado: number | null;
  numero_factura_asli: string | null;
};

type FormData = {
  operacion_id: string;
  factura_transporte: string;
  monto_facturado: string;
  numero_factura_asli: string;
  concepto_facturado: string;
  moneda: string;
  tipo_cambio: string;
  margen_estimado: string;
  margen_real: string;
  fecha_entrega_factura: string;
  fecha_pago_cliente: string;
  fecha_pago_transporte: string;
};

const initialFormData: FormData = {
  operacion_id: "",
  factura_transporte: "",
  monto_facturado: "",
  numero_factura_asli: "",
  concepto_facturado: "",
  moneda: "",
  tipo_cambio: "",
  margen_estimado: "",
  margen_real: "",
  fecha_entrega_factura: "",
  fecha_pago_cliente: "",
  fecha_pago_transporte: "",
};

export function FacturacionContent() {
  const { t, locale } = useLocale();
  const tr = t.facturacion;
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [operaciones, setOperaciones] = useState<Operacion[]>([]);
  const [monedas, setMonedas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPending, setFilterPending] = useState(false);

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

    const [operacionesRes, monedasRes] = await Promise.all([
      supabase
        .from("operaciones")
        .select("id, ref_asli, correlativo, cliente, naviera, nave, booking, pod, etd, estado_operacion, factura_transporte, monto_facturado, numero_factura_asli")
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      supabase.from("catalogos").select("valor").eq("tipo", "moneda").eq("activo", true),
    ]);

    setOperaciones(operacionesRes.data ?? []);
    setMonedas((monedasRes.data ?? []).map((m) => m.valor));
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const selectedOperacion = useMemo(() => {
    return operaciones.find((op) => op.id === formData.operacion_id);
  }, [operaciones, formData.operacion_id]);

  const filteredOperaciones = useMemo(() => {
    let filtered = operaciones;
    
    if (filterPending) {
      filtered = filtered.filter((op) => !op.numero_factura_asli);
    }
    
    if (!searchTerm.trim()) return filtered;
    
    const search = searchTerm.toLowerCase();
    return filtered.filter((op) => {
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
  }, [operaciones, searchTerm, filterPending]);

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSuccess(false);
    setError(null);
  };

  const handleSelectOperation = (id: string) => {
    const op = operaciones.find((o) => o.id === id);
    if (op) {
      setFormData({
        operacion_id: op.id,
        factura_transporte: op.factura_transporte || "",
        monto_facturado: op.monto_facturado?.toString() || "",
        numero_factura_asli: op.numero_factura_asli || "",
        concepto_facturado: "",
        moneda: "",
        tipo_cambio: "",
        margen_estimado: "",
        margen_real: "",
        fecha_entrega_factura: "",
        fecha_pago_cliente: "",
        fecha_pago_transporte: "",
      });
    }
    setSuccess(false);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !formData.operacion_id) return;

    setSaving(true);
    setError(null);

    const updates: Record<string, unknown> = {
      factura_transporte: formData.factura_transporte || null,
      monto_facturado: formData.monto_facturado ? parseFloat(formData.monto_facturado) : null,
      numero_factura_asli: formData.numero_factura_asli || null,
      concepto_facturado: formData.concepto_facturado || null,
      moneda: formData.moneda || null,
      tipo_cambio: formData.tipo_cambio ? parseFloat(formData.tipo_cambio) : null,
      margen_estimado: formData.margen_estimado ? parseFloat(formData.margen_estimado) : null,
      margen_real: formData.margen_real ? parseFloat(formData.margen_real) : null,
      fecha_entrega_factura: formData.fecha_entrega_factura || null,
      fecha_pago_cliente: formData.fecha_pago_cliente || null,
      fecha_pago_transporte: formData.fecha_pago_transporte || null,
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
      void fetchData();
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

                  <label className="flex items-center gap-2 text-sm text-neutral-600 mb-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterPending}
                      onChange={(e) => setFilterPending(e.target.checked)}
                      className="rounded border-neutral-300 text-brand-blue focus:ring-brand-blue/30"
                    />
                    {tr.pendingOnly}
                  </label>

                  {filteredOperaciones.length === 0 ? (
                    <p className="text-center text-neutral-500 py-4 text-sm">{tr.noOperations}</p>
                  ) : (
                    <div className="max-h-[calc(100vh-320px)] overflow-y-auto space-y-1.5">
                      {filteredOperaciones.map((op) => (
                        <button
                          key={op.id}
                          type="button"
                          onClick={() => handleSelectOperation(op.id)}
                          className={`w-full text-left p-3 rounded-lg border transition-all ${
                            formData.operacion_id === op.id
                              ? "border-brand-blue bg-brand-blue/5 ring-2 ring-brand-blue/20"
                              : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-neutral-800 text-sm">
                              {op.ref_asli || `A${String(op.correlativo).padStart(5, "0")}`}
                            </p>
                            {op.numero_factura_asli ? (
                              <Icon icon="typcn:tick" className="w-4 h-4 text-green-500" />
                            ) : (
                              <Icon icon="typcn:time" className="w-4 h-4 text-amber-500" />
                            )}
                          </div>
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
                          <Icon icon="typcn:document-text" className="w-4 h-4 text-brand-blue" />
                          {tr.invoiceInfo}
                        </h2>
                      </div>
                      <div className="p-4 grid grid-cols-2 gap-3">
                        {renderInput(tr.asliInvoice, "numero_factura_asli")}
                        {renderInput(tr.invoicedAmount, "monto_facturado", "number")}
                        {renderInput(tr.transportInvoice, "factura_transporte")}
                        {renderInput(tr.invoicedConcept, "concepto_facturado")}
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
                      <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50">
                        <h2 className="font-semibold text-neutral-800 text-sm flex items-center gap-2">
                          <Icon icon="typcn:chart-bar" className="w-4 h-4 text-brand-blue" />
                          {tr.financial}
                        </h2>
                      </div>
                      <div className="p-4 grid grid-cols-2 gap-3">
                        {renderSelect(tr.currency, "moneda", monedas)}
                        {renderInput(tr.exchangeRate, "tipo_cambio", "number")}
                        {renderInput(tr.estimatedMargin, "margen_estimado", "number")}
                        {renderInput(tr.realMargin, "margen_real", "number")}
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden xl:col-span-2">
                      <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50">
                        <h2 className="font-semibold text-neutral-800 text-sm flex items-center gap-2">
                          <Icon icon="typcn:calendar" className="w-4 h-4 text-brand-blue" />
                          {tr.paymentDates}
                        </h2>
                      </div>
                      <div className="p-4 grid grid-cols-3 gap-3">
                        {renderInput(tr.invoiceDelivery, "fecha_entrega_factura", "date")}
                        {renderInput(tr.clientPayment, "fecha_pago_cliente", "date")}
                        {renderInput(tr.transportPayment, "fecha_pago_transporte", "date")}
                      </div>
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
