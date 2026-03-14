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
  const { isCliente, empresaNombres, isLoading: authLoading } = useAuth();
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
    if (!supabase || authLoading) return;
    setLoading(true);

    let qOp = supabase
      .from("operaciones")
      .select("id, ref_asli, correlativo, cliente, naviera, nave, booking, pod, etd, estado_operacion, factura_transporte, monto_facturado, numero_factura_asli")
      .is("deleted_at", null);
    if (empresaNombres.length > 0) {
      qOp = qOp.in("cliente", empresaNombres);
    }
    const [operacionesRes, monedasRes] = await Promise.all([
      qOp.order("created_at", { ascending: false }),
      supabase.from("catalogos").select("valor").eq("tipo", "moneda").eq("activo", true),
    ]);

    setOperaciones(operacionesRes.data ?? []);
    setMonedas((monedasRes.data ?? []).map((m) => m.valor));
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
      <label className="block text-xs font-medium text-neutral-700 mb-0.5">{label}</label>
      <input
        type={type}
        value={formData[field]}
        onChange={(e) => handleChange(field, e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-1.5 text-sm border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors"
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
      <label className="block text-xs font-medium text-neutral-700 mb-0.5">{label}</label>
      <select
        value={formData[field]}
        onChange={(e) => handleChange(field, e.target.value)}
        className="w-full px-3 py-1.5 text-sm border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors"
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
      <main className="flex-1 bg-neutral-50 min-h-0 overflow-hidden p-4 flex items-center justify-center">
        <div className="flex items-center gap-2 text-neutral-500 text-sm">
          <Icon icon="typcn:refresh" className="w-5 h-5 animate-spin" />
          <span>{tr.loading}</span>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-neutral-50 min-h-0 overflow-hidden flex flex-col p-3">
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-brand-blue">{tr.title}</h1>
          <p className="text-neutral-500 text-xs mt-0.5">{tr.subtitle}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex gap-3">
        <div className="w-72 flex-shrink-0 flex flex-col min-h-0">
          <div className="bg-white rounded-lg border border-neutral-200 shadow-sm overflow-hidden flex flex-col min-h-0">
            <div className="px-3 py-2 border-b border-neutral-100 bg-neutral-50 flex-shrink-0">
              <h2 className="font-semibold text-neutral-800 text-xs flex items-center gap-1.5">
                <Icon icon="typcn:document" className="w-3.5 h-3.5 text-brand-blue" />
                {tr.selectOperation}
              </h2>
            </div>
            <div className="p-2 flex flex-col min-h-0">
              <div className="mb-2 flex-shrink-0">
                <div className="relative">
                  <Icon
                    icon="typcn:zoom"
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 w-3.5 h-3.5"
                  />
                  <input
                    type="text"
                    placeholder={tr.searchPlaceholder}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-neutral-600 mb-2 cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  checked={filterPending}
                  onChange={(e) => setFilterPending(e.target.checked)}
                  className="rounded border-neutral-300 text-brand-blue focus:ring-brand-blue/30"
                />
                {tr.pendingOnly}
              </label>

              {filteredOperaciones.length === 0 ? (
                <p className="text-center text-neutral-500 py-3 text-xs">{tr.noOperations}</p>
              ) : (
                <div className="flex-1 min-h-0 overflow-y-auto space-y-1">
                      {filteredOperaciones.map((op) => (
                        <button
                          key={op.id}
                          type="button"
                          onClick={() => handleSelectOperation(op.id)}
                          className={`w-full text-left p-2 rounded-md border transition-all ${
                            formData.operacion_id === op.id
                              ? "border-brand-blue bg-brand-blue/5 ring-2 ring-brand-blue/20"
                              : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <p className="font-medium text-neutral-800 text-xs truncate">
                              {op.ref_asli || `A${String(op.correlativo).padStart(5, "0")}`}
                            </p>
                            {op.numero_factura_asli ? (
                              <Icon icon="typcn:tick" className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                            ) : (
                              <Icon icon="typcn:time" className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-neutral-500 truncate">
                            {op.cliente} • {op.booking}
                          </p>
                          <p className="text-[11px] text-neutral-400 truncate">
                            {op.naviera} • ETD: {formatDate(op.etd)}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 min-w-0 flex flex-col min-h-0 overflow-y-auto">
              {formData.operacion_id ? (
                <div className="space-y-2 flex flex-col min-h-0">
                  {selectedOperacion && (
                    <div className="p-2 bg-brand-blue/5 rounded-md border border-brand-blue/20 flex-shrink-0">
                      <p className="text-xs font-medium text-brand-blue">{tr.selectedOperation}</p>
                      <p className="text-neutral-800 font-semibold text-sm truncate">
                        {selectedOperacion.ref_asli || `A${String(selectedOperacion.correlativo).padStart(5, "0")}`} - {selectedOperacion.cliente}
                      </p>
                      <p className="text-xs text-neutral-600 truncate">
                        {selectedOperacion.naviera} • {selectedOperacion.nave} • {selectedOperacion.booking}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-shrink-0">
                    <div className="bg-white rounded-lg border border-neutral-200 shadow-sm overflow-hidden">
                      <div className="px-2.5 py-1.5 border-b border-neutral-100 bg-neutral-50">
                        <h2 className="font-semibold text-neutral-800 text-xs flex items-center gap-1.5">
                          <Icon icon="typcn:document-text" className="w-3.5 h-3.5 text-brand-blue" />
                          {tr.invoiceInfo}
                        </h2>
                      </div>
                      <div className="p-2 grid grid-cols-2 gap-2">
                        {renderInput(tr.asliInvoice, "numero_factura_asli")}
                        {renderInput(tr.invoicedAmount, "monto_facturado", "number")}
                        {renderInput(tr.transportInvoice, "factura_transporte")}
                        {renderInput(tr.invoicedConcept, "concepto_facturado")}
                      </div>
                    </div>

                    <div className="bg-white rounded-lg border border-neutral-200 shadow-sm overflow-hidden">
                      <div className="px-2.5 py-1.5 border-b border-neutral-100 bg-neutral-50">
                        <h2 className="font-semibold text-neutral-800 text-xs flex items-center gap-1.5">
                          <Icon icon="typcn:chart-bar" className="w-3.5 h-3.5 text-brand-blue" />
                          {tr.financial}
                        </h2>
                      </div>
                      <div className="p-2 grid grid-cols-2 gap-2">
                        {renderSelect(tr.currency, "moneda", monedas)}
                        {renderInput(tr.exchangeRate, "tipo_cambio", "number")}
                        {renderInput(tr.estimatedMargin, "margen_estimado", "number")}
                        {renderInput(tr.realMargin, "margen_real", "number")}
                      </div>
                    </div>

                    <div className="bg-white rounded-lg border border-neutral-200 shadow-sm overflow-hidden sm:col-span-2">
                      <div className="px-2.5 py-1.5 border-b border-neutral-100 bg-neutral-50">
                        <h2 className="font-semibold text-neutral-800 text-xs flex items-center gap-1.5">
                          <Icon icon="typcn:calendar" className="w-3.5 h-3.5 text-brand-blue" />
                          {tr.paymentDates}
                        </h2>
                      </div>
                      <div className="p-2 grid grid-cols-3 gap-2">
                        {renderInput(tr.invoiceDelivery, "fecha_entrega_factura", "date")}
                        {renderInput(tr.clientPayment, "fecha_pago_cliente", "date")}
                        {renderInput(tr.transportPayment, "fecha_pago_transporte", "date")}
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="p-2 bg-red-50 border border-red-200 rounded-md text-red-700 text-xs flex-shrink-0">
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="p-2 bg-green-50 border border-green-200 rounded-md text-green-700 text-xs flex items-center gap-1.5 flex-shrink-0">
                      <Icon icon="typcn:tick" className="w-4 h-4" />
                      {tr.saveSuccess}
                    </div>
                  )}

                  <div className="flex gap-2 justify-end flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(initialFormData);
                        setSuccess(false);
                        setError(null);
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-200 rounded-md hover:bg-neutral-50 transition-colors"
                    >
                      {tr.cancel}
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-brand-blue rounded-md hover:bg-brand-blue/90 transition-colors disabled:opacity-50"
                    >
                      {saving ? (
                        <>
                          <Icon icon="typcn:refresh" className="w-3.5 h-3.5 animate-spin" />
                          {tr.saving}
                        </>
                      ) : (
                        <>
                          <Icon icon="typcn:tick" className="w-3.5 h-3.5" />
                          {tr.save}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center flex-1 min-h-[120px] bg-white rounded-lg border border-neutral-200">
                  <div className="text-center text-neutral-500">
                    <Icon icon="typcn:arrow-left" className="w-6 h-6 mx-auto mb-1 opacity-50" />
                    <p className="text-xs">{tr.selectOperation}</p>
                  </div>
                </div>
              )}
            </div>
          </form>
    </main>
  );
}
