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
  nave: string;
  booking: string;
  pol: string;
  pod: string;
  etd: string | null;
  eta: string | null;
  especie: string;
  pais: string;
  pallets: number | null;
  peso_bruto: number | null;
  peso_neto: number | null;
  tipo_unidad: string;
  contenedor: string;
  sello: string;
  tara: number | null;
  temperatura: string;
  ventilacion: string;
  incoterm: string;
  forma_pago: string;
  observaciones: string;
};

type Instructivo = {
  id: string;
  operacion_id: string;
  notify_party: string;
  tipo_bl: string;
  flete_terminos: string;
  banco: string;
  instrucciones: string;
};

type FormData = {
  operacion_id: string;
  embarcador: string;
  consignatario: string;
  notify_party: string;
  naviera: string;
  nave: string;
  booking: string;
  pol: string;
  pod: string;
  etd: string;
  eta: string;
  tipo_bl: string;
  especie: string;
  pais: string;
  pallets: string;
  peso_bruto: string;
  peso_neto: string;
  tipo_unidad: string;
  contenedor: string;
  sello: string;
  tara: string;
  temperatura: string;
  ventilacion: string;
  incoterm: string;
  forma_pago: string;
  flete_terminos: string;
  banco: string;
  instrucciones: string;
};

const emptyForm: FormData = {
  operacion_id: "",
  embarcador: "",
  consignatario: "",
  notify_party: "",
  naviera: "",
  nave: "",
  booking: "",
  pol: "",
  pod: "",
  etd: "",
  eta: "",
  tipo_bl: "",
  especie: "",
  pais: "",
  pallets: "",
  peso_bruto: "",
  peso_neto: "",
  tipo_unidad: "",
  contenedor: "",
  sello: "",
  tara: "",
  temperatura: "",
  ventilacion: "",
  incoterm: "",
  forma_pago: "",
  flete_terminos: "",
  banco: "",
  instrucciones: "",
};

function fromOp(op: Operacion): Partial<FormData> {
  return {
    operacion_id: op.id,
    embarcador: op.cliente ?? "",
    consignatario: op.consignatario ?? "",
    naviera: op.naviera ?? "",
    nave: op.nave ?? "",
    booking: op.booking ?? "",
    pol: op.pol ?? "",
    pod: op.pod ?? "",
    etd: op.etd ? op.etd.slice(0, 10) : "",
    eta: op.eta ? op.eta.slice(0, 10) : "",
    especie: op.especie ?? "",
    pais: op.pais ?? "",
    pallets: op.pallets != null ? String(op.pallets) : "",
    peso_bruto: op.peso_bruto != null ? String(op.peso_bruto) : "",
    peso_neto: op.peso_neto != null ? String(op.peso_neto) : "",
    tipo_unidad: op.tipo_unidad ?? "",
    contenedor: op.contenedor ?? "",
    sello: op.sello ?? "",
    tara: op.tara != null ? String(op.tara) : "",
    temperatura: op.temperatura ?? "",
    ventilacion: op.ventilacion ?? "",
    incoterm: op.incoterm ?? "",
    forma_pago: op.forma_pago ?? "",
    instrucciones: op.observaciones ?? "",
  };
}

function fromInstructivo(ins: Instructivo): Partial<FormData> {
  return {
    notify_party: ins.notify_party ?? "",
    tipo_bl: ins.tipo_bl ?? "",
    flete_terminos: ins.flete_terminos ?? "",
    banco: ins.banco ?? "",
    instrucciones: ins.instrucciones ?? "",
  };
}

export function CrearInstructivoContent() {
  const { t, locale } = useLocale();
  const { isCliente, empresaNombres, isLoading: authLoading } = useAuth();
  const tr = t.crearInstructivo;

  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [operaciones, setOperaciones] = useState<Operacion[]>([]);
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

    let q = supabase
      .from("operaciones")
      .select(
        "id, ref_asli, correlativo, cliente, consignatario, naviera, nave, booking, pol, pod, etd, eta, especie, pais, pallets, peso_bruto, peso_neto, tipo_unidad, contenedor, sello, tara, temperatura, ventilacion, incoterm, forma_pago, observaciones"
      )
      .is("deleted_at", null);

    if (empresaNombres.length > 0) {
      q = q.in("cliente", empresaNombres);
    }

    const { data } = await q.order("created_at", { ascending: false });
    setOperaciones((data as Operacion[]) ?? []);
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
        (op.naviera ?? "").toLowerCase().includes(s) ||
        (op.pod ?? "").toLowerCase().includes(s)
      );
    });
  }, [operaciones, searchTerm]);

  const selectedOperacion = useMemo(
    () => operaciones.find((op) => op.id === formData.operacion_id),
    [operaciones, formData.operacion_id]
  );

  const handleSelectOperation = useCallback(
    async (op: Operacion) => {
      const base = { ...emptyForm, ...fromOp(op) };
      setFormData(base);
      setSuccess(false);
      setError(null);

      if (!supabase) return;
      const { data } = await supabase
        .from("instructivos")
        .select("*")
        .eq("operacion_id", op.id)
        .maybeSingle();

      if (data) {
        setFormData((prev) => ({ ...prev, ...fromInstructivo(data as Instructivo) }));
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
      notify_party: formData.notify_party || null,
      tipo_bl: formData.tipo_bl || null,
      flete_terminos: formData.flete_terminos || null,
      banco: formData.banco || null,
      instrucciones: formData.instrucciones || null,
    };

    const { error: upsertErr } = await supabase
      .from("instructivos")
      .upsert(payload, { onConflict: "operacion_id" });

    if (!upsertErr) {
      await supabase.from("operaciones").update({
        consignatario: formData.consignatario || null,
        contenedor: formData.contenedor || null,
        sello: formData.sello || null,
        tara: formData.tara ? parseFloat(formData.tara) : null,
        temperatura: formData.temperatura || null,
        ventilacion: formData.ventilacion || null,
        incoterm: formData.incoterm || null,
        forma_pago: formData.forma_pago || null,
        observaciones: formData.instrucciones || null,
      }).eq("id", formData.operacion_id);
    }

    setSaving(false);
    if (upsertErr) {
      setError(upsertErr.message);
    } else {
      setSuccess(true);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), "dd MMM yyyy", {
        locale: locale === "es" ? es : undefined,
      });
    } catch {
      return dateStr;
    }
  };

  const inputClass =
    "w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:bg-white transition-all";
  const labelClass = "block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1";

  const renderInput = (label: string, field: keyof FormData, type = "text", placeholder?: string) => (
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

  const renderSelect = (label: string, field: keyof FormData, options: readonly string[]) => (
    <div>
      <label className={labelClass}>{label}</label>
      <select
        value={formData[field]}
        onChange={(e) => handleChange(field, e.target.value)}
        className={inputClass}
      >
        <option value="">{tr.select}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );

  const SectionHeader = ({ icon, label, color = "text-brand-blue" }: { icon: string; label: string; color?: string }) => (
    <>
      <div className="h-[2px] bg-gradient-to-r from-brand-blue/60 to-brand-teal/60" />
      <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
          <Icon icon={icon} className={`w-4 h-4 ${color}`} />
        </span>
        <h2 className="text-xs font-bold text-neutral-600 uppercase tracking-wider">{label}</h2>
      </div>
    </>
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

        {/* Page header — card unificada */}
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
            {/* ── Operation selector ── */}
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
                          <p className="text-xs text-neutral-600 truncate mt-0.5">
                            {op.cliente} · {op.booking}
                          </p>
                          <p className="text-xs text-neutral-400 mt-1">
                            {op.naviera} · ETD: {formatDate(op.etd)}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Form ── */}
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
                  {/* Selected operation banner */}
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
                            {selectedOperacion.naviera} · {selectedOperacion.nave} · {selectedOperacion.booking}
                          </p>
                        </div>
                        <span className="text-xs px-2.5 py-1 bg-white/70 text-brand-blue rounded-full font-semibold flex-shrink-0 border border-brand-blue/20">
                          ETD {formatDate(selectedOperacion.etd)}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {/* Partes del embarque */}
                    <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden xl:col-span-2">
                      <SectionHeader icon="typcn:group" label={tr.partes} />
                      <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {renderInput(tr.embarcador, "embarcador")}
                        {renderInput(tr.consignatario, "consignatario")}
                        {renderInput(tr.notifyParty, "notify_party")}
                      </div>
                    </div>

                    {/* Transporte / Ruta */}
                    <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                      <SectionHeader icon="typcn:anchor" label={tr.transporte} color="text-brand-teal" />
                      <div className="p-4 grid grid-cols-2 gap-3">
                        {renderInput(tr.naviera, "naviera")}
                        {renderInput(tr.nave, "nave")}
                        {renderInput(tr.booking, "booking")}
                        {renderSelect(tr.tipoBl, "tipo_bl", tr.tipoBlOptions)}
                        {renderInput(tr.pol, "pol")}
                        {renderInput(tr.pod, "pod")}
                        {renderInput(tr.etd, "etd", "date")}
                        {renderInput(tr.eta, "eta", "date")}
                      </div>
                    </div>

                    {/* Descripción de la carga */}
                    <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                      <SectionHeader icon="typcn:box" label={tr.carga} color="text-brand-olive" />
                      <div className="p-4 grid grid-cols-2 gap-3">
                        {renderInput(tr.especie, "especie")}
                        {renderInput(tr.pais, "pais")}
                        {renderInput(tr.pallets, "pallets", "number")}
                        {renderInput(tr.tipoUnidad, "tipo_unidad")}
                        {renderInput(tr.pesoBruto, "peso_bruto", "number")}
                        {renderInput(tr.pesoNeto, "peso_neto", "number")}
                        {renderInput(tr.contenedor, "contenedor")}
                        {renderInput(tr.sello, "sello")}
                        <div className="col-span-2">
                          {renderInput(tr.tara, "tara", "number")}
                        </div>
                      </div>
                    </div>

                    {/* Condiciones Reefer */}
                    <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                      <SectionHeader icon="typcn:thermometer" label={tr.reefer} color="text-blue-500" />
                      <div className="p-4 grid grid-cols-2 gap-3">
                        {renderInput(tr.temperatura, "temperatura")}
                        {renderInput(tr.ventilacion, "ventilacion")}
                      </div>
                    </div>

                    {/* Condiciones Comerciales */}
                    <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                      <SectionHeader icon="typcn:document-text" label={tr.condiciones} color="text-emerald-600" />
                      <div className="p-4 grid grid-cols-2 gap-3">
                        {renderInput(tr.incoterm, "incoterm")}
                        {renderInput(tr.formaPago, "forma_pago")}
                        {renderSelect(tr.fleteTerminos, "flete_terminos", tr.fleteOptions)}
                        {renderInput(tr.banco, "banco")}
                      </div>
                    </div>
                  </div>

                  {/* Instrucciones adicionales */}
                  <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                    <SectionHeader icon="typcn:notes" label={tr.instrucciones} />
                    <div className="p-4">
                      <textarea
                        value={formData.instrucciones}
                        onChange={(e) => handleChange("instrucciones", e.target.value)}
                        rows={3}
                        placeholder={tr.observacionesPlaceholder}
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
                        setFormData(emptyForm);
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
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-brand-blue rounded-xl hover:bg-brand-blue/90 transition-colors shadow-sm shadow-brand-blue/20 disabled:opacity-60"
                    >
                      {saving ? (
                        <>
                          <Icon icon="typcn:refresh" className="w-4 h-4 animate-spin" />
                          {tr.saving}
                        </>
                      ) : (
                        <>
                          <Icon icon="typcn:document-add" className="w-4 h-4" />
                          {tr.save}
                        </>
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
