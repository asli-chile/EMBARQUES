import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { Combobox } from "@/components/ui/Combobox";
import { format } from "date-fns";

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
  deposito: string | null;
  // Campos de transporte ya guardados
  transporte: string | null;
  chofer: string | null;
  rut_chofer: string | null;
  telefono_chofer: string | null;
  patente_camion: string | null;
  patente_remolque: string | null;
  contenedor: string | null;
  sello: string | null;
  tara: number | null;
  tramo: string | null;
  valor_tramo: number | null;
  moneda: string | null;
  observaciones: string | null;
  citacion: string | null;
  llegada_planta: string | null;
  salida_planta: string | null;
  agendamiento_retiro: string | null;
  inicio_stacking: string | null;
  fin_stacking: string | null;
  ingreso_stacking: string | null;
};

type TransporteEmpresa = {
  id: string;
  nombre: string;
  rut: string | null;
};

type Chofer = {
  id: string;
  empresa_id: string;
  nombre: string;
  numero_chofer: string | null;
  rut: string | null;
  telefono: string | null;
  activo: boolean;
};

type Equipo = {
  id: string;
  empresa_id: string;
  patente_camion: string;
  patente_remolque: string | null;
  activo: boolean;
};

type Tramo = {
  id: string;
  origen: string;
  destino: string;
  valor: number;
  moneda: string;
  activo: boolean;
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
  moneda: string;
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
  moneda: "",
  observaciones: "",
};

export function ReservaAsliContent() {
  const { t } = useLocale();
  const { isCliente, empresaNombres, isLoading: authLoading } = useAuth();
  const tr = t.transporteAsli;
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [operaciones, setOperaciones] = useState<Operacion[]>([]);
  const [empresasTransporte, setEmpresasTransporte] = useState<TransporteEmpresa[]>([]);
  const [choferes, setChoferes] = useState<Chofer[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [tramos, setTramos] = useState<Tramo[]>([]);
  const [empresaTransporteId, setEmpresaTransporteId] = useState<string>("");
  const [empresaTransporteInput, setEmpresaTransporteInput] = useState<string>("");
  const [choferInput, setChoferInput] = useState<string>("");
  const [equipoInput, setEquipoInput] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPending, setFilterPending] = useState(false);
  const [confirmNewItem, setConfirmNewItem] = useState<{
    type: 'empresa' | 'chofer' | 'equipo'; 
    value: string; 
    callback: () => Promise<void>; 
  } | null>(null);
  // Panel activo en mobile: "select" = lista de operaciones, "form" = formulario
  const [mobilePanel, setMobilePanel] = useState<"select" | "form">("select");

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
      .select("id, ref_asli, correlativo, cliente, naviera, nave, booking, pod, etd, planta_presentacion, estado_operacion, deposito, transporte, chofer, rut_chofer, telefono_chofer, patente_camion, patente_remolque, contenedor, sello, tara, tramo, valor_tramo, moneda, observaciones, citacion, llegada_planta, salida_planta, agendamiento_retiro, inicio_stacking, fin_stacking, ingreso_stacking")
      .is("deleted_at", null)
      .eq("enviado_transporte", true);
    if (empresaNombres.length > 0) {
      qOp = qOp.in("cliente", empresaNombres);
    }
    const [operacionesRes, empresasRes, tramosRes] = await Promise.all([
      qOp.order("created_at", { ascending: false }),
      supabase.from("transportes_empresas").select("id, nombre, rut").order("nombre"),
      supabase.from("transportes_tramos").select("id, origen, destino, valor, moneda, activo").eq("activo", true).order("origen"),
    ]);

    setOperaciones(operacionesRes.data ?? []);
    setEmpresasTransporte((empresasRes.data ?? []) as TransporteEmpresa[]);
    setTramos((tramosRes.data ?? []) as Tramo[]);
    setLoading(false);
  }, [supabase, authLoading, isCliente, empresaNombres]);

  useEffect(() => {
    if (!authLoading) void fetchData();
    else setOperaciones([]);
  }, [authLoading, fetchData]);

  // Sincronizar inputs con formData cuando se carga una operación
  useEffect(() => {
    if (formData.transporte && !empresaTransporteInput) {
      setEmpresaTransporteInput(formData.transporte);
    }
    if (formData.chofer && !choferInput) {
      setChoferInput(formData.chofer);
    }
    if (formData.patente_camion && !equipoInput) {
      setEquipoInput(formData.patente_camion);
    }
  }, [formData.transporte, formData.chofer, formData.patente_camion, empresaTransporteInput, choferInput, equipoInput]);

  const selectedOperacion = useMemo(() => {
    return operaciones.find((op) => op.id === formData.operacion_id);
  }, [operaciones, formData.operacion_id]);

  const isPendiente = (op: Operacion) =>
    !op.transporte || !op.chofer || !op.patente_camion || !op.contenedor || !op.tramo;

  const filteredOperaciones = useMemo(() => {
    let list = operaciones;
    if (filterPending) list = list.filter(isPendiente);
    if (!searchTerm.trim()) return list;
    const search = searchTerm.toLowerCase();
    return list.filter((op) => {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operaciones, searchTerm, filterPending]);

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSuccess(false);
    setError(null);
    // Al seleccionar una operación, cargar todos los campos de transporte ya guardados
    if (field === "operacion_id" && value) {
      const op = operaciones.find((o) => o.id === value);
      if (op) {
        setFormData({
          operacion_id: value,
          transporte: op.transporte ?? "",
          chofer: op.chofer ?? "",
          rut_chofer: op.rut_chofer ?? "",
          telefono_chofer: op.telefono_chofer ?? "",
          patente_camion: op.patente_camion ?? "",
          patente_remolque: op.patente_remolque ?? "",
          contenedor: op.contenedor ?? "",
          sello: op.sello ?? "",
          tara: op.tara != null ? String(op.tara) : "",
          citacion: op.citacion ?? "",
          llegada_planta: op.llegada_planta ?? "",
          salida_planta: op.salida_planta ?? "",
          deposito: op.deposito ?? "",
          agendamiento_retiro: op.agendamiento_retiro ?? "",
          inicio_stacking: op.inicio_stacking ?? "",
          fin_stacking: op.fin_stacking ?? "",
          ingreso_stacking: op.ingreso_stacking ?? "",
          tramo: op.tramo ?? "",
          valor_tramo: op.valor_tramo != null ? String(op.valor_tramo) : "",
          moneda: op.moneda ?? "",
          observaciones: op.observaciones ?? "",
        });
        // Restaurar empresa de transporte en el combobox
        if (op.transporte) {
          setEmpresaTransporteInput(op.transporte);
          const empresa = empresasTransporte.find(e => e.nombre === op.transporte);
          if (empresa) {
            setEmpresaTransporteId(empresa.id);
            // Cargar choferes y equipos de esa empresa
            if (supabase) {
              Promise.all([
                supabase.from("transportes_choferes").select("id, empresa_id, nombre, numero_chofer, rut, telefono, activo").eq("empresa_id", empresa.id).eq("activo", true).order("nombre"),
                supabase.from("transportes_equipos").select("id, empresa_id, patente_camion, patente_remolque, activo").eq("empresa_id", empresa.id).eq("activo", true).order("patente_camion"),
              ]).then(([ch, eq]) => {
                setChoferes((ch.data ?? []) as Chofer[]);
                setEquipos((eq.data ?? []) as Equipo[]);
              });
            }
          }
        } else {
          setEmpresaTransporteInput("");
          setEmpresaTransporteId("");
          setChoferes([]);
          setEquipos([]);
        }
        setChoferInput(op.chofer ?? "");
        setEquipoInput(op.patente_camion ?? "");
      }
      setMobilePanel("form");
    }
  };

  const handleEmpresaTransporteChange = async (id: string) => {
    setEmpresaTransporteId(id);
    setSuccess(false);
    setError(null);

    const empresa = empresasTransporte.find((e) => e.id === id);
    setEmpresaTransporteInput(empresa?.nombre ?? "");
    setFormData((prev) => ({
      ...prev,
      transporte: empresa?.nombre ?? "",
      chofer: "",
      rut_chofer: "",
      telefono_chofer: "",
      patente_camion: "",
      patente_remolque: "",
    }));
    setChoferInput("");
    setEquipoInput("");

    if (!supabase || !id) {
      setChoferes([]);
      setEquipos([]);
      return;
    }

    const [choferesRes, equiposRes] = await Promise.all([
      supabase
        .from("transportes_choferes")
        .select("id, empresa_id, nombre, numero_chofer, rut, telefono, activo")
        .eq("empresa_id", id)
        .eq("activo", true)
        .order("nombre"),
      supabase
        .from("transportes_equipos")
        .select("id, empresa_id, patente_camion, patente_remolque, activo")
        .eq("empresa_id", id)
        .eq("activo", true)
        .order("patente_camion"),
    ]);

    setChoferes((choferesRes.data ?? []) as Chofer[]);
    setEquipos((equiposRes.data ?? []) as Equipo[]);
  };

  const handleChoferChange = (id: string) => {
    const ch = choferes.find((c) => c.id === id);
    setFormData((prev) => ({
      ...prev,
      chofer: ch?.nombre ?? "",
      rut_chofer: ch?.rut ?? "",
      telefono_chofer: ch?.telefono ?? "",
    }));
    setSuccess(false);
    setError(null);
  };

  const handleEquipoChange = (id: string) => {
    const eq = equipos.find((e) => e.id === id);
    setFormData((prev) => ({
      ...prev,
      patente_camion: eq?.patente_camion ?? "",
      patente_remolque: eq?.patente_remolque ?? "",
    }));
    setSuccess(false);
    setError(null);
  };

  const handleTramoChange = (id: string) => {
    const trm = tramos.find((t) => t.id === id);
    const label = trm ? `${trm.origen} - ${trm.destino}` : "";
    setFormData((prev) => ({
      ...prev,
      tramo: label,
      valor_tramo: trm ? String(trm.valor ?? "") : "",
      moneda: trm?.moneda ?? prev.moneda,
    }));
    setSuccess(false);
    setError(null);
  };

  const createNewEmpresa = async (nombre: string) => {
    if (!supabase) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("transportes_empresas")
      .insert({ nombre: nombre.trim() })
      .select("id, nombre, rut")
      .single();
    setSaving(false);
    
    if (error) {
      setError("Error al crear la empresa: " + error.message);
      return;
    }
    
    const newEmpresa = data as TransporteEmpresa;
    setEmpresasTransporte(prev => [...prev, newEmpresa].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    setEmpresaTransporteId(newEmpresa.id);
    setEmpresaTransporteInput(newEmpresa.nombre);
    setFormData(prev => ({ ...prev, transporte: newEmpresa.nombre }));
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const createNewChofer = async (nombre: string) => {
    if (!supabase || !empresaTransporteId) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("transportes_choferes")
      .insert({ 
        empresa_id: empresaTransporteId,
        nombre: nombre.trim(),
        activo: true 
      })
      .select("id, empresa_id, nombre, numero_chofer, rut, telefono, activo")
      .single();
    setSaving(false);
    
    if (error) {
      setError("Error al crear el chofer: " + error.message);
      return;
    }
    
    const newChofer = data as Chofer;
    setChoferes(prev => [...prev, newChofer].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    setFormData(prev => ({ ...prev, chofer: newChofer.nombre, rut_chofer: "", telefono_chofer: "" }));
    setChoferInput(newChofer.nombre);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const createNewEquipo = async (patente: string) => {
    if (!supabase || !empresaTransporteId) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("transportes_equipos")
      .insert({ 
        empresa_id: empresaTransporteId,
        patente_camion: patente.trim().toUpperCase(),
        activo: true 
      })
      .select("id, empresa_id, patente_camion, patente_remolque, activo")
      .single();
    setSaving(false);
    
    if (error) {
      setError("Error al crear el equipo: " + error.message);
      return;
    }
    
    const newEquipo = data as Equipo;
    setEquipos(prev => [...prev, newEquipo].sort((a, b) => a.patente_camion.localeCompare(b.patente_camion)));
    setFormData(prev => ({ ...prev, patente_camion: newEquipo.patente_camion }));
    setEquipoInput(newEquipo.patente_camion);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleEmpresaInputChange = (value: string) => {
    setEmpresaTransporteInput(value);
    
    // Buscar empresa existente
    const existingEmpresa = empresasTransporte.find(e => 
      e.nombre.toLowerCase() === value.toLowerCase()
    );
    
    if (existingEmpresa) {
      // Empresa existente, seleccionarla
      setEmpresaTransporteId(existingEmpresa.id);
      handleEmpresaTransporteChange(existingEmpresa.id);
    } else {
      // Nueva empresa o sin selección
      setEmpresaTransporteId("");
      setChoferes([]);
      setEquipos([]);
      setFormData(prev => ({
        ...prev,
        transporte: value,
        chofer: "",
        rut_chofer: "",
        telefono_chofer: "",
        patente_camion: "",
        patente_remolque: "",
        tramo: "",
        valor_tramo: "",
      }));
      setChoferInput("");
      setEquipoInput("");
    }
  };

  const handleEmpresaInputBlur = () => {
    const value = empresaTransporteInput.trim();
    if (!value || empresaTransporteId) return;
    
    // Si hay texto pero no hay empresa seleccionada, preguntar si crear nueva
    const existingEmpresa = empresasTransporte.find(e => 
      e.nombre.toLowerCase() === value.toLowerCase()
    );
    
    if (!existingEmpresa) {
      setConfirmNewItem({
        type: 'empresa',
        value: value,
        callback: async () => await createNewEmpresa(value)
      });
    }
  };

  const handleEquipoInputChange = (value: string) => {
    setEquipoInput(value);
    
    // Buscar equipo existente
    const existingEquipo = equipos.find(e => 
      e.patente_camion.toLowerCase() === value.toLowerCase()
    );
    
    if (existingEquipo) {
      // Equipo existente, seleccionarlo
      setFormData(prev => ({
        ...prev,
        patente_camion: existingEquipo.patente_camion,
        patente_remolque: existingEquipo.patente_remolque || "",
      }));
    } else {
      // Nuevo equipo
      setFormData(prev => ({
        ...prev,
        patente_camion: value,
        patente_remolque: "",
      }));
    }
  };

  const handleChoferInputChange = (value: string) => {
    setChoferInput(value);
    
    // Buscar chofer existente
    const existingChofer = choferes.find(c => 
      c.nombre.toLowerCase() === value.toLowerCase()
    );
    
    if (existingChofer) {
      // Chofer existente, seleccionarlo
      setFormData(prev => ({
        ...prev,
        chofer: existingChofer.nombre,
        rut_chofer: existingChofer.rut || "",
        telefono_chofer: existingChofer.telefono || "",
      }));
    } else {
      // Nuevo chofer
      setFormData(prev => ({
        ...prev,
        chofer: value,
        rut_chofer: "",
        telefono_chofer: "",
      }));
    }
  };

  const handleChoferInputBlur = () => {
    const value = choferInput.trim();
    if (!value || !empresaTransporteId) return;
    
    // Si hay texto y hay empresa seleccionada, preguntar si crear nuevo chofer
    const existingChofer = choferes.find(c => 
      c.nombre.toLowerCase() === value.toLowerCase()
    );
    
    if (!existingChofer) {
      setConfirmNewItem({
        type: 'chofer',
        value: value,
        callback: async () => await createNewChofer(value)
      });
    }
  };

  const handleEquipoInputBlur = () => {
    const value = equipoInput.trim();
    if (!value || !empresaTransporteId) return;
    
    // Si hay texto y hay empresa seleccionada, preguntar si crear nuevo equipo
    const existingEquipo = equipos.find(e => 
      e.patente_camion.toLowerCase() === value.toLowerCase()
    );
    
    if (!existingEquipo) {
      setConfirmNewItem({
        type: 'equipo',
        value: value,
        callback: async () => await createNewEquipo(value)
      });
    }
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
      moneda: formData.moneda || null,
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
      setSuccessMsg("Reserva de transporte guardada exitosamente");
      setTimeout(() => setSuccessMsg(null), 4000);
      void fetchData();
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), "dd/MM/yyyy");
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
        lang="es-CL"
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
      {successMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 text-white text-sm font-medium shadow-lg animate-fade-in">
          <Icon icon="lucide:check-circle" className="w-5 h-5 shrink-0" />
          {successMsg}
        </div>
      )}
      <div className="w-full max-w-[1600px] mx-auto space-y-4">

        {/* Header — mismo estilo que Mis Reservas / Papelera */}
        <div className="rounded-2xl bg-white border border-neutral-200 shadow-sm overflow-hidden">
          <div className="h-[3px] bg-gradient-to-r from-brand-blue to-brand-teal" />
          <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-teal flex items-center justify-center flex-shrink-0">
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

        {/* Tabs mobile — solo visibles en pantallas < lg */}
        <div className="lg:hidden flex rounded-2xl bg-white border border-neutral-200 shadow-sm overflow-hidden mb-0">
          <button
            type="button"
            onClick={() => setMobilePanel("select")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wide transition-colors ${
              mobilePanel === "select"
                ? "bg-brand-blue text-white"
                : "text-neutral-500 hover:bg-neutral-50"
            }`}
          >
            <Icon icon="typcn:document" width={15} height={15} />
            {tr.selectOperation}
          </button>
          <button
            type="button"
            onClick={() => setMobilePanel("form")}
            disabled={!formData.operacion_id}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wide transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              mobilePanel === "form"
                ? "bg-brand-blue text-white"
                : "text-neutral-500 hover:bg-neutral-50"
            }`}
          >
            <Icon icon="lucide:truck" width={15} height={15} />
            {tr.transportInfo}
            {formData.operacion_id && (
              <span className="w-2 h-2 rounded-full bg-brand-teal inline-block" />
            )}
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Panel selección operación */}
            <div className={`w-full lg:w-80 lg:flex-shrink-0 ${mobilePanel !== "select" ? "hidden lg:block" : ""}`}>
              <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden lg:sticky lg:top-0">
                <div className="h-[2px] bg-gradient-to-r from-brand-blue/60 to-brand-teal/60" />
                <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                      <Icon icon="typcn:document" className="w-4 h-4 text-brand-blue" />
                    </span>
                    <h2 className="text-xs font-bold text-neutral-600 uppercase tracking-wider">
                      {tr.selectOperation}
                    </h2>
                  </div>
                  {operaciones.filter(isPendiente).length > 0 && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold flex-shrink-0">
                      <Icon icon="lucide:alert-circle" width={10} height={10} />
                      {operaciones.filter(isPendiente).length} pendiente{operaciones.filter(isPendiente).length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <div className="mb-3 space-y-2">
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
                    <label className="flex items-center gap-2 cursor-pointer px-1 py-1 rounded-lg hover:bg-neutral-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={filterPending}
                        onChange={(e) => setFilterPending(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-neutral-300 accent-amber-500"
                      />
                      <span className="text-xs text-neutral-600 font-medium">Solo pendientes de completar</span>
                    </label>
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
                      {filteredOperaciones.map((op) => {
                        const isActive = formData.operacion_id === op.id;
                        const pendientes: string[] = [];
                        if (!op.transporte) pendientes.push("Empresa");
                        if (!op.chofer) pendientes.push("Chofer");
                        if (!op.patente_camion) pendientes.push("Unidad");
                        if (!op.contenedor) pendientes.push("Contenedor");
                        if (!op.tramo) pendientes.push("Tramo");
                        const completo = pendientes.length === 0;
                        return (
                          <button
                            key={op.id}
                            type="button"
                            onClick={() => handleChange("operacion_id", op.id)}
                            className={`w-full text-left p-3 rounded-xl border transition-all ${
                              isActive
                                ? "border-brand-blue bg-brand-blue/5 ring-2 ring-brand-blue/20"
                                : completo
                                  ? "border-emerald-200 bg-emerald-50/40 hover:border-emerald-300 hover:bg-emerald-50"
                                  : "border-amber-200 bg-amber-50/40 hover:border-amber-300 hover:bg-amber-50"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-0.5">
                              <p className={`font-bold text-sm ${isActive ? "text-brand-blue" : "text-neutral-800"}`}>
                                {op.ref_asli || `A${String(op.correlativo).padStart(5, "0")}`}
                              </p>
                              <span className={`flex-shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                completo
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}>
                                <Icon icon={completo ? "lucide:check-circle" : "lucide:alert-circle"} width={10} height={10} />
                                {completo ? "Completo" : "Pendiente"}
                              </span>
                            </div>
                            <p className="text-xs text-neutral-600 truncate">{op.cliente} · {op.booking}</p>
                            <p className="text-xs text-neutral-400 mt-0.5">{op.naviera} · ETD: {formatDate(op.etd)}</p>
                            {!completo && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {pendientes.map((p) => (
                                  <span key={p} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-semibold">
                                    <Icon icon="lucide:x-circle" width={9} height={9} />
                                    {p}
                                  </span>
                                ))}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className={`flex-1 min-w-0 ${mobilePanel !== "form" ? "hidden lg:block" : ""}`}>
              {formData.operacion_id ? (
                <div className="space-y-4">
                  {selectedOperacion && (
                    <div className="rounded-2xl bg-white border border-neutral-200 shadow-sm overflow-hidden">
                      <div className="h-[2px] bg-gradient-to-r from-brand-blue to-brand-teal" />
                      <div className="p-4 bg-brand-blue/5 border-l-4 border-brand-blue flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-brand-blue uppercase tracking-wider">{tr.selectedOperation}</p>
                          <p className="text-neutral-800 font-bold mt-1 text-sm">
                            {selectedOperacion.ref_asli || `A${String(selectedOperacion.correlativo).padStart(5, "0")}`} — {selectedOperacion.cliente}
                          </p>
                          <p className="text-sm text-neutral-600 mt-0.5">
                            {selectedOperacion.naviera} • {selectedOperacion.nave} • {selectedOperacion.booking}
                          </p>
                        </div>
                        {/* Botón "Cambiar" solo en mobile */}
                        <button
                          type="button"
                          onClick={() => setMobilePanel("select")}
                          className="lg:hidden flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-brand-blue bg-white border border-brand-blue/30 rounded-lg hover:bg-brand-blue/5 transition-colors"
                        >
                          <Icon icon="lucide:list" width={12} height={12} />
                          Cambiar
                        </button>
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
                        <div>
                          <label className={labelClass}>{tr.transportCompany}</label>
                          <Combobox
                            value={empresaTransporteInput}
                            onChange={handleEmpresaInputChange}
                            onBlur={handleEmpresaInputBlur}
                            options={empresasTransporte.map((e) => ({
                              value: e.nombre,
                              label: e.nombre,
                              sublabel: e.rut || undefined,
                            }))}
                            placeholder="Escriba o seleccione empresa..."
                            className={inputClass}
                            icon="lucide:building-2"
                          />
                        </div>

                        <div>
                          <label className={labelClass}>{tr.driverName}</label>
                          <Combobox
                            value={choferInput}
                            onChange={handleChoferInputChange}
                            onBlur={handleChoferInputBlur}
                            options={choferes.map((c) => ({
                              value: c.nombre,
                              label: c.nombre,
                              sublabel: c.rut || undefined,
                            }))}
                            placeholder="Escriba o seleccione chofer..."
                            disabled={!empresaTransporteId}
                            className={inputClass}
                            icon="lucide:user"
                          />
                        </div>
                        {renderInput(tr.driverRut, "rut_chofer")}
                        {renderInput(tr.driverPhone, "telefono_chofer", "tel")}
                        <div>
                          <label className={labelClass}>{tr.truckPlate}</label>
                          <Combobox
                            value={equipoInput}
                            onChange={(v) => handleEquipoInputChange(v.toUpperCase())}
                            onBlur={handleEquipoInputBlur}
                            options={equipos.map((x) => ({
                              value: x.patente_camion,
                              label: x.patente_camion,
                              sublabel: x.patente_remolque ? `Remolque: ${x.patente_remolque}` : undefined,
                            }))}
                            placeholder="Escriba o seleccione patente..."
                            disabled={!empresaTransporteId}
                            className={inputClass}
                            icon="lucide:truck"
                          />
                        </div>

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
                        <div>
                          <label className={labelClass}>{tr.warehouse}</label>
                          <input
                            type="text"
                            value={formData.deposito}
                            readOnly
                            className={`${inputClass} bg-neutral-100 cursor-not-allowed`}
                            placeholder="Se carga desde la operación"
                          />
                        </div>
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
                        <div>
                          <label className={labelClass}>{tr.section}</label>
                          <select
                            value={tramos.find((x) => `${x.origen} - ${x.destino}` === formData.tramo)?.id ?? ""}
                            onChange={(e) => handleTramoChange(e.target.value)}
                            className={inputClass}
                          >
                            <option value="">{tr.select}</option>
                            {tramos.map((x) => (
                              <option key={x.id} value={x.id}>
                                {x.origen} - {x.destino} ({x.moneda})
                              </option>
                            ))}
                          </select>
                        </div>
                        {renderInput(tr.sectionValue, "valor_tramo", "number")}
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
                    <button
                      type="button"
                      onClick={() => setMobilePanel("select")}
                      className="lg:hidden mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-brand-blue rounded-xl hover:bg-brand-blue/90 transition-colors"
                    >
                      <Icon icon="typcn:document" width={14} height={14} />
                      Ver operaciones
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
      {/* Modal de confirmación para crear nuevos elementos */}
      {confirmNewItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-lg max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-brand-blue/10 text-brand-blue flex items-center justify-center">
                {confirmNewItem.type === 'empresa' ? (
                  <Icon icon="lucide:building-2" width={18} height={18} />
                ) : confirmNewItem.type === 'chofer' ? (
                  <Icon icon="lucide:user" width={18} height={18} />
                ) : (
                  <Icon icon="lucide:truck" width={18} height={18} />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900">
                  Crear nuevo {confirmNewItem.type === 'empresa' ? 'empresa' : confirmNewItem.type === 'chofer' ? 'chofer' : 'equipo'}
                </h3>
                <p className="text-xs text-neutral-500">¿Confirmas agregar este nuevo elemento?</p>
              </div>
            </div>
            
            <p className="text-sm text-neutral-700 mb-6">
              Se creará {confirmNewItem.type === 'empresa' ? 'la empresa' : confirmNewItem.type === 'chofer' ? 'el chofer' : 'el equipo'}:{" "}
              <span className="font-medium text-brand-blue">{confirmNewItem.value}</span>
            </p>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmNewItem(null)}
                className="flex-1 px-4 py-2 rounded-xl text-sm font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  await confirmNewItem.callback();
                  setConfirmNewItem(null);
                }}
                disabled={saving}
                className="flex-1 px-4 py-2 rounded-xl text-sm font-medium text-white bg-brand-blue hover:bg-brand-blue/90 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Creando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
