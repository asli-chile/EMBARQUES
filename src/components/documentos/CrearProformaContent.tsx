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
  consignatario: string;
  naviera: string;
  booking: string;
  pol: string;
  pod: string;
  etd: string | null;
  especie: string;
  pais: string;
  pallets: number | null;
  peso_bruto: number | null;
  peso_neto: number | null;
  tipo_unidad: string;
  incoterm: string;
  forma_pago: string;
};

type FormData = {
  operacion_id: string;
  numero_proforma: string;
  fecha_emision: string;
  fecha_validez: string;
  vendedor: string;
  vendedor_direccion: string;
  vendedor_contacto: string;
  comprador: string;
  comprador_direccion: string;
  comprador_pais: string;
  naviera: string;
  booking: string;
  pol: string;
  pod: string;
  etd: string;
  incoterm: string;
  descripcion: string;
  codigo_hs: string;
  pallets: string;
  peso_bruto: string;
  peso_neto: string;
  unidad_medida: string;
  precio_unitario: string;
  moneda: string;
  descuento: string;
  total: string;
  forma_pago: string;
  banco: string;
  notas: string;
};

const emptyForm: FormData = {
  operacion_id: "",
  numero_proforma: "",
  fecha_emision: new Date().toISOString().slice(0, 10),
  fecha_validez: "",
  vendedor: "",
  vendedor_direccion: "",
  vendedor_contacto: "",
  comprador: "",
  comprador_direccion: "",
  comprador_pais: "",
  naviera: "",
  booking: "",
  pol: "",
  pod: "",
  etd: "",
  incoterm: "",
  descripcion: "",
  codigo_hs: "",
  pallets: "",
  peso_bruto: "",
  peso_neto: "",
  unidad_medida: "",
  precio_unitario: "",
  moneda: "USD",
  descuento: "",
  total: "",
  forma_pago: "",
  banco: "",
  notas: "",
};

function fromOp(op: Operacion): Partial<FormData> {
  return {
    operacion_id: op.id,
    vendedor: op.cliente ?? "",
    comprador: op.consignatario ?? "",
    comprador_pais: op.pais ?? "",
    naviera: op.naviera ?? "",
    booking: op.booking ?? "",
    pol: op.pol ?? "",
    pod: op.pod ?? "",
    etd: op.etd ? op.etd.slice(0, 10) : "",
    incoterm: op.incoterm ?? "",
    descripcion: op.especie ?? "",
    pallets: op.pallets != null ? String(op.pallets) : "",
    peso_bruto: op.peso_bruto != null ? String(op.peso_bruto) : "",
    peso_neto: op.peso_neto != null ? String(op.peso_neto) : "",
    unidad_medida: op.tipo_unidad ?? "",
    forma_pago: op.forma_pago ?? "",
  };
}

export function CrearProformaContent() {
  const { t, locale } = useLocale();
  const { isCliente, empresaNombres, isLoading: authLoading } = useAuth();
  const tr = t.crearProforma;

  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [operaciones, setOperaciones] = useState<Operacion[]>([]);
  const [monedas, setMonedas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const supabase = useMemo(() => {
    try { return createClient(); } catch { return null; }
  }, []);

  const fetchData = useCallback(async () => {
    if (!supabase || authLoading) return;
    setLoading(true);

    let q = supabase
      .from("operaciones")
      .select("id, ref_asli, correlativo, cliente, consignatario, naviera, booking, pol, pod, etd, especie, pais, pallets, peso_bruto, peso_neto, tipo_unidad, incoterm, forma_pago")
      .is("deleted_at", null);
    if (empresaNombres.length > 0) q = q.in("cliente", empresaNombres);

    const [opsRes, monedasRes] = await Promise.all([
      q.order("created_at", { ascending: false }),
      supabase.from("catalogos").select("valor").eq("tipo", "moneda").eq("activo", true),
    ]);

    setOperaciones((opsRes.data as Operacion[]) ?? []);
    setMonedas(["USD", "EUR", "CLP", ...(monedasRes.data ?? []).map((m) => m.valor)].filter((v, i, a) => a.indexOf(v) === i));
    setLoading(false);
  }, [supabase, authLoading, isCliente, empresaNombres]);

  useEffect(() => {
    if (!authLoading) void fetchData();
    else setOperaciones([]);
  }, [authLoading, fetchData]);

  const filteredOperaciones = useMemo(() => {
    if (!searchTerm.trim()) return operaciones;
    const s = searchTerm.toLowerCase();
    return operaciones.filter((op) => {
      const ref = op.ref_asli || `A${String(op.correlativo).padStart(5, "0")}`;
      return (
        ref.toLowerCase().includes(s) ||
        (op.cliente ?? "").toLowerCase().includes(s) ||
        (op.booking ?? "").toLowerCase().includes(s) ||
        (op.pod ?? "").toLowerCase().includes(s)
      );
    });
  }, [operaciones, searchTerm]);

  const selectedOperacion = useMemo(
    () => operaciones.find((op) => op.id === formData.operacion_id),
    [operaciones, formData.operacion_id]
  );

  // Recalculate total when precio_unitario, peso_neto or descuento changes
  useEffect(() => {
    const precio = parseFloat(formData.precio_unitario) || 0;
    const pesoNeto = parseFloat(formData.peso_neto) || 0;
    const descuento = parseFloat(formData.descuento) || 0;
    if (precio > 0 && pesoNeto > 0) {
      const subtotal = precio * pesoNeto;
      const totalCalc = subtotal * (1 - descuento / 100);
      setFormData((prev) => ({ ...prev, total: totalCalc.toFixed(2) }));
    }
  }, [formData.precio_unitario, formData.peso_neto, formData.descuento]);

  const handleSelectOperation = useCallback(
    async (op: Operacion) => {
      setFormData((prev) => ({
        ...emptyForm,
        numero_proforma: prev.numero_proforma,
        fecha_emision: prev.fecha_emision,
        ...fromOp(op),
      }));
      setSuccess(false);
      setError(null);

      if (!supabase) return;
      const { data } = await supabase
        .from("proformas")
        .select("*")
        .eq("operacion_id", op.id)
        .maybeSingle();
      if (data) {
        setFormData((prev) => ({
          ...prev,
          numero_proforma: data.numero_proforma ?? prev.numero_proforma,
          fecha_emision: data.fecha_emision ?? prev.fecha_emision,
          fecha_validez: data.fecha_validez ?? "",
          vendedor_direccion: data.vendedor_direccion ?? "",
          vendedor_contacto: data.vendedor_contacto ?? "",
          comprador_direccion: data.comprador_direccion ?? "",
          descripcion: data.descripcion ?? prev.descripcion,
          codigo_hs: data.codigo_hs ?? "",
          precio_unitario: data.precio_unitario != null ? String(data.precio_unitario) : "",
          moneda: data.moneda ?? "USD",
          descuento: data.descuento != null ? String(data.descuento) : "",
          total: data.total != null ? String(data.total) : "",
          banco: data.banco ?? "",
          notas: data.notas ?? "",
        }));
      }
    },
    [supabase]
  );

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

    const payload = {
      operacion_id: formData.operacion_id,
      numero_proforma: formData.numero_proforma || null,
      fecha_emision: formData.fecha_emision || null,
      fecha_validez: formData.fecha_validez || null,
      vendedor: formData.vendedor || null,
      vendedor_direccion: formData.vendedor_direccion || null,
      vendedor_contacto: formData.vendedor_contacto || null,
      comprador: formData.comprador || null,
      comprador_direccion: formData.comprador_direccion || null,
      comprador_pais: formData.comprador_pais || null,
      naviera: formData.naviera || null,
      booking: formData.booking || null,
      pol: formData.pol || null,
      pod: formData.pod || null,
      etd: formData.etd || null,
      incoterm: formData.incoterm || null,
      descripcion: formData.descripcion || null,
      codigo_hs: formData.codigo_hs || null,
      pallets: formData.pallets ? parseInt(formData.pallets) : null,
      peso_bruto: formData.peso_bruto ? parseFloat(formData.peso_bruto) : null,
      peso_neto: formData.peso_neto ? parseFloat(formData.peso_neto) : null,
      unidad_medida: formData.unidad_medida || null,
      precio_unitario: formData.precio_unitario ? parseFloat(formData.precio_unitario) : null,
      moneda: formData.moneda || null,
      descuento: formData.descuento ? parseFloat(formData.descuento) : null,
      total: formData.total ? parseFloat(formData.total) : null,
      forma_pago: formData.forma_pago || null,
      banco: formData.banco || null,
      notas: formData.notas || null,
    };

    const { error: upsertErr } = await supabase
      .from("proformas")
      .upsert(payload, { onConflict: "operacion_id" });

    setSaving(false);
    if (upsertErr) setError(upsertErr.message);
    else setSuccess(true);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try { return format(new Date(dateStr), "dd MMM yyyy", { locale: locale === "es" ? es : undefined }); }
    catch { return dateStr; }
  };

  const inputClass =
    "w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:bg-white transition-all";
  const labelClass = "block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1";

  const Field = ({ label, field, type = "text", placeholder, span2 = false }: {
    label: string; field: keyof FormData; type?: string; placeholder?: string; span2?: boolean;
  }) => (
    <div className={span2 ? "col-span-2" : ""}>
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

  const Select = ({ label, field, options, span2 = false }: {
    label: string; field: keyof FormData; options: string[]; span2?: boolean;
  }) => (
    <div className={span2 ? "col-span-2" : ""}>
      <label className={labelClass}>{label}</label>
      <select
        value={formData[field]}
        onChange={(e) => handleChange(field, e.target.value)}
        className={inputClass}
      >
        <option value="">{tr.select}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  const SectionCard = ({ icon, label, color = "text-brand-blue", children }: {
    icon: string; label: string; color?: string; children: React.ReactNode;
  }) => (
    <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
      <div className="h-[2px] bg-gradient-to-r from-brand-blue/60 to-brand-teal/60" />
      <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
          <Icon icon={icon} className={`w-4 h-4 ${color}`} />
        </span>
        <h2 className="text-xs font-bold text-neutral-600 uppercase tracking-wider">{label}</h2>
      </div>
      <div className="p-4 grid grid-cols-2 gap-3">
        {children}
      </div>
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

        {/* Header */}
        <div className="rounded-2xl bg-white border border-neutral-200 shadow-sm overflow-hidden">
          <div className="h-[3px] bg-gradient-to-r from-brand-blue to-brand-teal" />
          <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-blue flex items-center justify-center flex-shrink-0">
                <Icon icon="typcn:document-text" width={20} height={20} className="text-white" />
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
            {/* ── Selector de operación ── */}
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
                  <div className="relative mb-3">
                    <Icon icon="typcn:zoom" className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4 pointer-events-none" />
                    <input
                      type="text"
                      placeholder={tr.searchPlaceholder}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-neutral-200 bg-neutral-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:bg-white transition-all"
                    />
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
                          onClick={() => void handleSelectOperation(op)}
                          className={`w-full text-left p-3 rounded-xl border transition-all ${
                            formData.operacion_id === op.id
                              ? "border-brand-blue bg-brand-blue/5 ring-2 ring-brand-blue/20"
                              : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
                          }`}
                        >
                          <p className="font-semibold text-brand-blue text-sm">
                            {op.ref_asli || `A${String(op.correlativo).padStart(5, "0")}`}
                          </p>
                          <p className="text-xs text-neutral-600 truncate mt-0.5">{op.cliente} · {op.booking}</p>
                          <p className="text-xs text-neutral-400 mt-1">{op.naviera} · ETD: {formatDate(op.etd)}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Formulario ── */}
            <div className="flex-1 min-w-0">
              {!formData.operacion_id ? (
                <div className="rounded-2xl bg-white border border-neutral-200 shadow-sm overflow-hidden flex items-center justify-center min-h-[240px]">
                  <div className="text-center py-8 px-4">
                    <span className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-3 inline-flex">
                      <Icon icon="typcn:document-text" width={24} height={24} className="text-neutral-400" />
                    </span>
                    <p className="text-neutral-500 text-sm font-medium">{tr.selectOperationPrompt}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Banner operación seleccionada */}
                  {selectedOperacion && (
                    <div className="rounded-2xl bg-white border border-neutral-200 shadow-sm overflow-hidden">
                      <div className="h-[2px] bg-gradient-to-r from-brand-blue to-brand-teal" />
                      <div className="p-4 bg-brand-blue/5 border-l-4 border-brand-blue flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold text-brand-blue uppercase tracking-wider">
                            {tr.selectedOperation}
                          </p>
                          <p className="text-neutral-800 font-bold mt-1 text-sm">
                            {selectedOperacion.ref_asli || `A${String(selectedOperacion.correlativo).padStart(5, "0")}`} — {selectedOperacion.cliente}
                          </p>
                          <p className="text-sm text-neutral-600 mt-0.5">
                            {selectedOperacion.naviera} · {selectedOperacion.booking}
                          </p>
                        </div>
                        <span className="text-xs px-2.5 py-1 bg-white/70 text-brand-blue rounded-full font-semibold flex-shrink-0 border border-brand-blue/20">
                          ETD {formatDate(selectedOperacion.etd)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Identificación */}
                  <SectionCard icon="typcn:document-text" label={tr.identificacion}>
                    <Field label={tr.numeroProforma} field="numero_proforma" placeholder="PF-2025-001" />
                    <Field label={tr.fechaEmision} field="fecha_emision" type="date" />
                    <Field label={tr.fechaValidez} field="fecha_validez" type="date" />
                    <Select label={tr.moneda} field="moneda" options={monedas} />
                  </SectionCard>

                  {/* Partes */}
                  <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                    <div className="h-[2px] bg-gradient-to-r from-brand-blue/60 to-brand-teal/60" />
                    <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                        <Icon icon="typcn:group" className="w-4 h-4 text-brand-teal" />
                      </span>
                      <h2 className="text-xs font-bold text-neutral-600 uppercase tracking-wider">{tr.partes}</h2>
                    </div>
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Vendedor */}
                      <div className="space-y-3">
                        <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">{tr.vendedor}</p>
                        <div className="grid grid-cols-1 gap-3">
                          <Field label={tr.vendedor} field="vendedor" />
                          <Field label={tr.vendedorDireccion} field="vendedor_direccion" />
                          <Field label={tr.vendedorContacto} field="vendedor_contacto" />
                        </div>
                      </div>
                      {/* Comprador */}
                      <div className="space-y-3">
                        <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">{tr.comprador}</p>
                        <div className="grid grid-cols-1 gap-3">
                          <Field label={tr.comprador} field="comprador" />
                          <Field label={tr.compradorDireccion} field="comprador_direccion" />
                          <Field label={tr.compradorPais} field="comprador_pais" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Embarque */}
                  <SectionCard icon="typcn:anchor" label={tr.embarque} color="text-brand-teal">
                    <Field label={tr.naviera} field="naviera" />
                    <Field label={tr.booking} field="booking" />
                    <Field label={tr.pol} field="pol" />
                    <Field label={tr.pod} field="pod" />
                    <Field label={tr.etd} field="etd" type="date" />
                    <Field label={tr.incoterm} field="incoterm" />
                  </SectionCard>

                  {/* Mercancía */}
                  <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                    <div className="h-[2px] bg-gradient-to-r from-brand-blue/60 to-brand-teal/60" />
                    <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                        <Icon icon="typcn:box" className="w-4 h-4 text-brand-olive" />
                      </span>
                      <h2 className="text-xs font-bold text-neutral-600 uppercase tracking-wider">{tr.mercancia}</h2>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-3">
                      <Field label={tr.descripcion} field="descripcion" span2 />
                      <Field label={tr.codigoHs} field="codigo_hs" />
                      <Field label={tr.unidadMedida} field="unidad_medida" />
                      <Field label={tr.pallets} field="pallets" type="number" />
                      <Field label={tr.pesoBruto} field="peso_bruto" type="number" />
                      <Field label={tr.pesoNeto} field="peso_neto" type="number" />
                    </div>
                  </div>

                  {/* Precio */}
                  <SectionCard icon="typcn:calculator" label={tr.precio} color="text-emerald-600">
                    <Field label={tr.precioUnitario} field="precio_unitario" type="number" placeholder="USD / kg" />
                    <Field label={tr.descuento} field="descuento" type="number" placeholder="0" />
                    <div className="col-span-2">
                      <label className={labelClass}>{tr.total}</label>
                      <div className="w-full px-3.5 py-2.5 text-sm border border-neutral-200 rounded-xl bg-neutral-50 text-neutral-700 font-semibold">
                        {formData.total
                          ? `${formData.moneda || "USD"} ${parseFloat(formData.total).toLocaleString("es-CL", { minimumFractionDigits: 2 })}`
                          : "—"}
                      </div>
                    </div>
                  </SectionCard>

                  {/* Condiciones de pago */}
                  <SectionCard icon="typcn:credit-card" label={tr.condiciones} color="text-violet-600">
                    <Field label={tr.formaPago} field="forma_pago" />
                    <Field label={tr.banco} field="banco" span2 />
                  </SectionCard>

                  {/* Notas */}
                  <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                    <div className="h-[2px] bg-gradient-to-r from-brand-blue/60 to-brand-teal/60" />
                    <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                        <Icon icon="typcn:notes" className="w-4 h-4 text-brand-blue" />
                      </span>
                    <h2 className="text-xs font-bold text-neutral-600 uppercase tracking-wider">{tr.notas}</h2>
                    </div>
                    <div className="p-4">
                      <textarea
                        value={formData.notas}
                        onChange={(e) => handleChange("notas", e.target.value)}
                        rows={3}
                        placeholder={tr.notasPlaceholder}
                        className={`${inputClass} resize-none`}
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium flex items-start gap-2">
                      <Icon icon="lucide:alert-circle" className="w-4 h-4 mt-0.5 shrink-0" />
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm font-medium flex items-center gap-2">
                      <Icon icon="typcn:tick" className="w-5 h-5" />
                      {tr.saveSuccess}
                    </div>
                  )}

                  <div className="flex gap-3 justify-end pb-1">
                    <button
                      type="button"
                      onClick={() => { setFormData(emptyForm); setSuccess(false); setError(null); }}
                      className="px-4 py-2.5 text-sm font-semibold text-neutral-600 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors"
                    >
                      {tr.cancel}
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-brand-blue rounded-xl hover:bg-brand-blue/90 disabled:opacity-60 transition-colors shadow-sm shadow-brand-blue/20"
                    >
                      {saving ? (
                        <><Icon icon="typcn:refresh" className="w-4 h-4 animate-spin" />{tr.saving}</>
                      ) : (
                        <><Icon icon="typcn:document-add" className="w-4 h-4" />{tr.save}</>
                      )}
                    </button>
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
