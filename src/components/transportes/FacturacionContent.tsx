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

        {/* Header — mismo estilo que Reserva ASLI / Reserva Externa */}
        <div className="rounded-2xl bg-white border border-neutral-200 shadow-sm overflow-hidden">
          <div className="h-[3px] bg-gradient-to-r from-brand-blue to-brand-teal" />
          <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-teal flex items-center justify-center flex-shrink-0">
                <Icon icon="typcn:calculator" width={20} height={20} className="text-white" />
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

        <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-4">
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

                <label className="flex items-center gap-2 text-sm text-neutral-600 mb-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterPending}
                    onChange={(e) => setFilterPending(e.target.checked)}
                    className="w-4 h-4 rounded border-neutral-300 accent-brand-blue focus:ring-brand-blue/20"
                  />
                  {tr.pendingOnly}
                </label>

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
                        onClick={() => handleSelectOperation(op.id)}
                        className={`w-full text-left p-3 rounded-xl border transition-all ${
                          formData.operacion_id === op.id
                            ? "border-brand-blue bg-brand-blue/5 ring-2 ring-brand-blue/20"
                            : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <p className="font-semibold text-brand-blue text-sm">
                            {op.ref_asli || `A${String(op.correlativo).padStart(5, "0")}`}
                          </p>
                          {op.numero_factura_asli ? (
                            <Icon icon="typcn:tick" className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          ) : (
                            <Icon icon="typcn:time" className="w-4 h-4 text-amber-500 flex-shrink-0" />
                          )}
                        </div>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                    <div className="h-[2px] bg-gradient-to-r from-brand-blue/60 to-brand-teal/60" />
                    <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                        <Icon icon="typcn:document-text" className="w-4 h-4 text-brand-blue" />
                      </span>
                      <h2 className="text-xs font-bold text-neutral-600 uppercase tracking-wider">{tr.invoiceInfo}</h2>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-3">
                      {renderInput(tr.asliInvoice, "numero_factura_asli")}
                      {renderInput(tr.invoicedAmount, "monto_facturado", "number")}
                      {renderInput(tr.transportInvoice, "factura_transporte")}
                      {renderInput(tr.invoicedConcept, "concepto_facturado")}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                    <div className="h-[2px] bg-gradient-to-r from-brand-blue/60 to-brand-teal/60" />
                    <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                        <Icon icon="typcn:chart-bar" className="w-4 h-4 text-brand-blue" />
                      </span>
                      <h2 className="text-xs font-bold text-neutral-600 uppercase tracking-wider">{tr.financial}</h2>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-3">
                      {renderSelect(tr.currency, "moneda", monedas)}
                      {renderInput(tr.exchangeRate, "tipo_cambio", "number")}
                      {renderInput(tr.estimatedMargin, "margen_estimado", "number")}
                      {renderInput(tr.realMargin, "margen_real", "number")}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden sm:col-span-2">
                    <div className="h-[2px] bg-gradient-to-r from-brand-blue/60 to-brand-teal/60" />
                    <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                        <Icon icon="typcn:calendar" className="w-4 h-4 text-brand-blue" />
                      </span>
                      <h2 className="text-xs font-bold text-neutral-600 uppercase tracking-wider">{tr.paymentDates}</h2>
                    </div>
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {renderInput(tr.invoiceDelivery, "fecha_entrega_factura", "date")}
                      {renderInput(tr.clientPayment, "fecha_pago_cliente", "date")}
                      {renderInput(tr.transportPayment, "fecha_pago_transporte", "date")}
                    </div>
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
        </form>
      </div>
    </main>
  );
}
