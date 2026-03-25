import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { Combobox } from "@/components/ui/Combobox";
import { format } from "date-fns";
import { sileo } from "sileo";
import {
  type FormatoInstructivo,
  buildInstructivoTagValues,
  generateInstructivoHtml,
  buildInstructivoSubject,
  buildInstructivoPlainBody,
  applyTagsToExcelBuffer,
} from "@/lib/documentos/instructivo";
import { sendEmail, type EmailAttachment } from "@/lib/email/sendEmail";

type Operacion = {
  id: string;
  ref_asli: string;
  correlativo: number;
  cliente: string;
  consignatario: string | null;
  naviera: string;
  nave: string;
  booking: string;
  booking_doc_url: string | null;
  pol: string | null;
  pod: string;
  etd: string | null;
  eta: string | null;
  especie: string | null;
  pais: string | null;
  pallets: number | null;
  peso_bruto: number | null;
  peso_neto: number | null;
  tipo_unidad: string | null;
  temperatura: string | null;
  ventilacion: number | null;
  incoterm: string | null;
  forma_pago: string | null;
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
  planta_presentacion: string;
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
  planta_presentacion: "",
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
  const { isCliente, isSuperadmin, isAdmin, empresaNombres, isLoading: authLoading } = useAuth();
  const canManageTransport = isSuperadmin || isAdmin;
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
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPending, setFilterPending] = useState(false);
  const [confirmNewItem, setConfirmNewItem] = useState<{
    type: 'empresa' | 'chofer' | 'equipo';
    value: string;
    callback: () => Promise<void>;
  } | null>(null);
  const [confirmDeleteReserva, setConfirmDeleteReserva] = useState<string | null>(null);
  // Panel activo en mobile: "select" = lista de operaciones, "form" = formulario
  const [mobilePanel, setMobilePanel] = useState<"select" | "form">("select");
  // Instructivo
  const [formatos, setFormatos] = useState<FormatoInstructivo[]>([]);
  const [selectedFormatoId, setSelectedFormatoId] = useState<string>("");
  type InstructivoPhase = "idle" | "generating" | "ready" | "sending" | "sent" | "error";
  const [instrPhase, setInstrPhase] = useState<InstructivoPhase>("idle");
  const [instrDraftUrl, setInstrDraftUrl] = useState<string | undefined>(undefined);
  const [instrError, setInstrError] = useState<string>("");
  const [instrBlob, setInstrBlob] = useState<Blob | null>(null);
  const [instrFilename, setInstrFilename] = useState<string>("");
  const [instrSavedUrl, setInstrSavedUrl] = useState<string | null>(null);
  const [instrSaveError, setInstrSaveError] = useState<string | null>(null);
  const [instrUploading, setInstrUploading] = useState(false);
  const [instrIsManual, setInstrIsManual] = useState(false);
  const instrFileInputRef = useRef<HTMLInputElement>(null);

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
      .select("id, ref_asli, correlativo, cliente, consignatario, naviera, nave, booking, booking_doc_url, pol, pod, etd, eta, especie, pais, pallets, peso_bruto, peso_neto, tipo_unidad, temperatura, ventilacion, incoterm, forma_pago, planta_presentacion, estado_operacion, deposito, transporte, chofer, rut_chofer, telefono_chofer, patente_camion, patente_remolque, contenedor, sello, tara, tramo, valor_tramo, moneda, observaciones, citacion, llegada_planta, salida_planta, agendamiento_retiro, inicio_stacking, fin_stacking, ingreso_stacking")
      .is("deleted_at", null)
      .is("transporte_deleted_at", null)
      .eq("enviado_transporte", true)
      .or("tipo_reserva_transporte.eq.asli,tipo_reserva_transporte.is.null");
    if (empresaNombres.length > 0) {
      qOp = qOp.in("cliente", empresaNombres);
    }
    const [operacionesRes, empresasRes, tramosRes, formatosRes] = await Promise.all([
      qOp.order("created_at", { ascending: false }),
      supabase.from("transportes_empresas").select("id, nombre, rut").order("nombre"),
      supabase.from("transportes_tramos").select("id, origen, destino, valor, moneda, activo").eq("activo", true).order("origen"),
      supabase.from("formatos_documentos").select("id, nombre, tipo, template_type, descripcion, contenido_html, excel_path, excel_nombre, cliente").eq("tipo", "instructivo").eq("activo", true).order("nombre"),
    ]);

    setOperaciones(operacionesRes.data ?? []);
    setEmpresasTransporte((empresasRes.data ?? []) as TransporteEmpresa[]);
    setTramos((tramosRes.data ?? []) as Tramo[]);
    const fmts = (formatosRes.data ?? []) as FormatoInstructivo[];
    setFormatos(fmts);
    if (fmts.length === 1) setSelectedFormatoId(fmts[0].id);
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

  // Formatos filtrados por cliente de la operación (global o exclusivo del cliente)
  const filteredFormatos = useMemo(() => {
    if (!selectedOperacion?.cliente) return formatos.filter((f) => !f.cliente);
    return formatos.filter((f) => !f.cliente || f.cliente === selectedOperacion.cliente);
  }, [formatos, selectedOperacion]);

  // Auto-seleccionar formato si hay exactamente uno disponible para la operación
  useEffect(() => {
    if (filteredFormatos.length === 1) setSelectedFormatoId(filteredFormatos[0].id);
    else if (filteredFormatos.length === 0) setSelectedFormatoId("");
  }, [filteredFormatos]);

  // Al cambiar de operación, cargar instructivo existente y resetear estado
  useEffect(() => {
    setInstrPhase("idle");
    setInstrBlob(null);
    setInstrFilename("");
    setInstrDraftUrl(undefined);
    setInstrError("");
    setInstrSavedUrl(null);
    setInstrSaveError(null);
    setInstrIsManual(false);

    if (!formData.operacion_id || !supabase) return;
    supabase
      .from("documentos")
      .select("nombre_archivo, url")
      .eq("operacion_id", formData.operacion_id)
      .eq("tipo", "INSTRUCTIVO_EMBARQUE")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setInstrSavedUrl(data.url);
          setInstrFilename(data.nombre_archivo);
        }
      });
  }, [formData.operacion_id, supabase]);

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
          planta_presentacion: op.planta_presentacion ?? "",
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
    setError(null);
  };

  const handleEquipoChange = (id: string) => {
    const eq = equipos.find((e) => e.id === id);
    setFormData((prev) => ({
      ...prev,
      patente_camion: eq?.patente_camion ?? "",
      patente_remolque: eq?.patente_remolque ?? "",
    }));
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
    sileo.success({ title: "Empresa creada exitosamente." });
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
    sileo.success({ title: "Chofer creado exitosamente." });
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
    sileo.success({ title: "Equipo creado exitosamente." });
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
      planta_presentacion: formData.planta_presentacion || null,
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
      sileo.success({ title: "Reserva de transporte guardada exitosamente" });
      void fetchData();
    }
  };

  const handleDeleteReserva = async (operacionId?: string) => {
    const targetId = operacionId || formData.operacion_id;
    if (!supabase || !targetId) return;
    setSaving(true);
    setError(null);

    const { error: err } = await supabase
      .from("operaciones")
      .update({ transporte_deleted_at: new Date().toISOString() })
      .eq("id", targetId);

    setSaving(false);
    setConfirmDeleteReserva(null);

    if (err) {
      setError(err.message);
    } else {
      if (formData.operacion_id === targetId) setFormData(initialFormData);
      setOperaciones((prev) => prev.filter((o) => o.id !== targetId));
      sileo.success({ title: "Operación enviada a la papelera de transportes" });
    }
  };

  // ── Paso 1: Generar el Excel instructivo ─────────────────────────────────
  const handleGenerarInstructivo = async () => {
    if (!selectedOperacion || !selectedFormatoId || !supabase) return;
    const formato = formatos.find((f) => f.id === selectedFormatoId);
    if (!formato) return;

    setInstrPhase("generating");
    setInstrError("");
    setInstrBlob(null);
    setInstrFilename("");
    setInstrDraftUrl(undefined);

    try {
      const ref = selectedOperacion.ref_asli || `A${String(selectedOperacion.correlativo).padStart(5, "0")}`;
      const tagValues = buildInstructivoTagValues(selectedOperacion);

      if (formato.template_type === "excel" && formato.excel_path) {
        // Descargar plantilla Excel de Supabase y aplicar etiquetas
        const { data: tmplData, error: tmplErr } = await supabase.storage
          .from("formatos-templates")
          .download(formato.excel_path);
        if (tmplErr || !tmplData) throw new Error(`No se pudo descargar la plantilla Excel: ${tmplErr?.message ?? "sin datos"}`);
        const buf = await tmplData.arrayBuffer();
        const blob = await applyTagsToExcelBuffer(buf, tagValues);
        const filename = formato.excel_nombre
          ? formato.excel_nombre.replace(/\.xlsx$/i, "") + `_${ref}.xlsx`
          : `instructivo_${ref}.xlsx`;
        setInstrBlob(blob);
        setInstrFilename(filename);
        setInstrPhase("ready");

        // ── Guardar en bucket documentos y registrar en tabla ─────────────
        setInstrSaveError(null);
        const storagePath = `${selectedOperacion.id}/INSTRUCTIVO_EMBARQUE/${filename}`;
        const { error: upErr } = await supabase.storage.from("documentos").upload(storagePath, blob, {
          contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          upsert: true,
        });
        if (upErr) {
          setInstrSaveError(`Error al subir al bucket: ${upErr.message}`);
        } else {
          const { data: urlData } = supabase.storage.from("documentos").getPublicUrl(storagePath);
          await supabase.from("documentos")
            .delete()
            .eq("operacion_id", selectedOperacion.id)
            .eq("tipo", "INSTRUCTIVO_EMBARQUE");
          const { error: insErr } = await supabase.from("documentos").insert({
            operacion_id: selectedOperacion.id,
            tipo: "INSTRUCTIVO_EMBARQUE",
            nombre_archivo: filename,
            url: urlData.publicUrl,
            tamano: blob.size,
            mime_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          });
          if (insErr) {
            setInstrSaveError(`Error al registrar en documentos: ${insErr.message}`);
          } else {
            setInstrSavedUrl(urlData.publicUrl);
          }
        }
      } else if (formato.contenido_html) {
        // Formato HTML: generar como HTML/PDF (no como adjunto Excel)
        const html = generateInstructivoHtml(formato, tagValues);
        const win = window.open("", "_blank", "width=960,height=720");
        if (win) {
          win.document.write(html + `<style>@media print{@page{margin:16mm 14mm;size:A4}}</style><script>window.onload=()=>{window.print()}<\/script>`);
          win.document.close();
        }
        setInstrPhase("idle"); // para HTML no hay "ready" state, se abre directo
      } else {
        throw new Error("El formato no tiene plantilla Excel ni contenido HTML. Edítalo en Configuración → Formatos de Documentos.");
      }
    } catch (e) {
      setInstrPhase("error");
      setInstrError(e instanceof Error ? e.message : "Error inesperado al generar el instructivo.");
    }
  };

  // ── Descarga local del instructivo generado ───────────────────────────────
  const handleDownloadInstructivo = () => {
    if (!instrBlob || !instrFilename) return;
    const url = URL.createObjectURL(instrBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = instrFilename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Subir instructivo manual ──────────────────────────────────────────────
  const handleSubirInstructivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedOperacion || !supabase) return;
    setInstrUploading(true);
    setInstrSaveError(null);
    try {
      const storagePath = `${selectedOperacion.id}/INSTRUCTIVO_EMBARQUE/${file.name}`;
      const { error: upErr } = await supabase.storage.from("documentos").upload(storagePath, file, { upsert: true });
      if (upErr) throw new Error(`Error al subir: ${upErr.message}`);
      const { data: urlData } = supabase.storage.from("documentos").getPublicUrl(storagePath);
      await supabase.from("documentos").delete().eq("operacion_id", selectedOperacion.id).eq("tipo", "INSTRUCTIVO_EMBARQUE");
      const { error: insErr } = await supabase.from("documentos").insert({
        operacion_id: selectedOperacion.id,
        tipo: "INSTRUCTIVO_EMBARQUE",
        nombre_archivo: file.name,
        url: urlData.publicUrl,
        tamano: file.size,
        mime_type: file.type || "application/octet-stream",
      });
      if (insErr) throw new Error(`Error al registrar: ${insErr.message}`);
      setInstrSavedUrl(urlData.publicUrl);
      setInstrFilename(file.name);
      setInstrIsManual(true);
    } catch (err) {
      setInstrSaveError(err instanceof Error ? err.message : "Error al subir el instructivo.");
    } finally {
      setInstrUploading(false);
      if (instrFileInputRef.current) instrFileInputRef.current.value = "";
    }
  };

  // ── Paso 2: Enviar instructivo por correo desde la cuenta del ejecutivo ──
  const handleSendInstructivo = async () => {
    if (!selectedOperacion || !instrBlob) return;
    setInstrPhase("sending");
    setInstrError("");

    const subject = buildInstructivoSubject(selectedOperacion);
    const body    = buildInstructivoPlainBody(selectedOperacion);

    // Helper: blob → base64
    const blobToBase64 = async (blob: Blob): Promise<string> => {
      const buf = await blob.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let bin = "";
      for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
      return btoa(bin);
    };

    // Adjunto 1: Instructivo (Excel o PDF del formato)
    const mimeType = instrFilename.endsWith(".xlsx")
      ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      : "application/pdf";

    const attachments: EmailAttachment[] = [{
      name: instrFilename || "Instructivo.xlsx",
      content: await blobToBase64(instrBlob),
      mimeType,
    }];

    // Adjunto 2: PDF de la reserva — buscar en tabla documentos (sincronizado),
    // con fallback a booking_doc_url si no hay entrada en la tabla.
    let reservaUrl: string | null = null;
    if (supabase) {
      const { data: docRow } = await supabase
        .from("documentos")
        .select("url")
        .eq("operacion_id", selectedOperacion.id)
        .eq("tipo", "SOLICITUD_RESERVA")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      reservaUrl = docRow?.url ?? null;
    }
    if (!reservaUrl) reservaUrl = selectedOperacion.booking_doc_url;
    if (reservaUrl) {
      try {
        const res = await fetch(reservaUrl);
        if (res.ok) {
          const reservaBlob = await res.blob();
          const ext = reservaUrl.split("?")[0].split(".").pop() ?? "pdf";
          attachments.push({
            name: `Reserva_${selectedOperacion.ref_asli}.${ext}`,
            content: await blobToBase64(reservaBlob),
            mimeType: ext === "pdf" ? "application/pdf" : "application/octet-stream",
          });
        }
      } catch { /* si no se puede descargar, igual envía con solo el instructivo */ }
    }

    const result = await sendEmail({ to: "roodericus7@gmail.com", subject, body, attachments });

    if (result.success) {
      setInstrPhase("sent");
    } else {
      setInstrPhase("error");
      setInstrError(result.error ?? "Error al enviar el correo.");
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
      <div className="w-full max-w-[1600px] mx-auto space-y-4">

        {/* Hero */}
        <div className="rounded-2xl bg-gradient-to-br from-brand-blue via-brand-blue/90 to-sky-700 text-white overflow-hidden shadow-sm">
          <div className="px-5 py-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
                <Icon icon="lucide:truck" width={22} height={22} className="text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-bold leading-tight">{tr.title}</h1>
                <p className="text-xs text-white/70 mt-0.5">{tr.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {operaciones.filter(isPendiente).length > 0 && (
                <div className="flex items-center gap-1.5 bg-white/15 rounded-xl px-3 py-1.5">
                  <Icon icon="lucide:alert-circle" width={13} height={13} className="text-amber-300" />
                  <span className="text-xs font-bold">{operaciones.filter(isPendiente).length} pendiente{operaciones.filter(isPendiente).length !== 1 ? "s" : ""}</span>
                </div>
              )}
              {formData.operacion_id && (
                <div className="flex items-center gap-1.5 bg-white/15 rounded-xl px-3 py-1.5">
                  <Icon icon="lucide:check-circle" width={13} height={13} className="text-emerald-300" />
                  <span className="text-xs font-semibold">Op. seleccionada</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => void fetchData()}
                className="p-2 bg-white/15 hover:bg-white/25 rounded-xl transition-colors text-white"
                title={t.misReservas?.refresh ?? "Actualizar"}
              >
                <Icon icon="lucide:refresh-cw" width={16} height={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs mobile — solo visibles en pantallas < lg */}
        <div className="lg:hidden flex bg-neutral-100 rounded-2xl p-1 gap-1">
          <button
            type="button"
            onClick={() => setMobilePanel("select")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
              mobilePanel === "select"
                ? "bg-white text-brand-blue shadow-sm"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            <Icon icon="lucide:list" width={14} height={14} />
            {tr.selectOperation}
          </button>
          <button
            type="button"
            onClick={() => setMobilePanel("form")}
            disabled={!formData.operacion_id}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              mobilePanel === "form"
                ? "bg-white text-brand-blue shadow-sm"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            <Icon icon="lucide:truck" width={14} height={14} />
            {tr.transportInfo}
            {formData.operacion_id && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            )}
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Panel selección operación */}
            <div className={`w-full lg:w-80 lg:flex-shrink-0 ${mobilePanel !== "select" ? "hidden lg:block" : ""}`}>
              <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden lg:sticky lg:top-0">
                <div className="h-[3px] bg-gradient-to-r from-brand-blue to-brand-teal" />
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
                          <div
                            key={op.id}
                            className={`group relative w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                              isActive
                                ? "border-brand-blue bg-brand-blue/5 ring-2 ring-brand-blue/20"
                                : completo
                                  ? "border-emerald-200 bg-emerald-50/40 hover:border-emerald-300 hover:bg-emerald-50"
                                  : "border-amber-200 bg-amber-50/40 hover:border-amber-300 hover:bg-amber-50"
                            }`}
                            onClick={() => handleChange("operacion_id", op.id)}
                          >
                            {canManageTransport && (
                              <button
                                type="button"
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  setConfirmDeleteReserva(op.id);
                                }}
                                className="absolute top-2 right-2 p-1 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                                title="Quitar de transportes"
                              >
                                <Icon icon="typcn:trash" className="w-3.5 h-3.5" />
                              </button>
                            )}
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
                            <div className="flex items-center gap-1.5 min-w-0">
                              <p className="text-xs text-neutral-600 truncate">{op.cliente} · {op.booking}</p>
                              {op.booking_doc_url && (
                                <a
                                  href={op.booking_doc_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(ev) => ev.stopPropagation()}
                                  title="Ver PDF de Booking"
                                  className="flex-shrink-0 p-0.5 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                                >
                                  <Icon icon="lucide:paperclip" width={12} height={12} />
                                </a>
                              )}
                            </div>
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
                          </div>
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
                      <div className="h-[3px] bg-gradient-to-r from-brand-blue to-brand-teal" />
                      <div className="p-4 bg-brand-blue/5 border-l-4 border-brand-blue flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-brand-blue uppercase tracking-wider">{tr.selectedOperation}</p>
                          <p className="text-neutral-800 font-bold mt-1 text-sm">
                            {selectedOperacion.ref_asli || `A${String(selectedOperacion.correlativo).padStart(5, "0")}`} — {selectedOperacion.cliente}
                          </p>
                          <p className="text-sm text-neutral-600 mt-0.5">
                            {selectedOperacion.naviera} • {selectedOperacion.nave} • {selectedOperacion.booking}
                          </p>
                          {selectedOperacion.booking_doc_url && (
                            <a
                              href={selectedOperacion.booking_doc_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 transition-colors"
                            >
                              <Icon icon="lucide:file-text" width={13} height={13} />
                              Ver PDF de Booking
                              <Icon icon="lucide:external-link" width={11} height={11} className="opacity-70" />
                            </a>
                          )}
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

                  {/* Estado de la Operación */}
                  {selectedOperacion && (
                    <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                      <div className="h-[3px] bg-gradient-to-r from-brand-blue to-brand-teal" />
                      <div className="px-4 py-3 flex items-center justify-between gap-3">
                        <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Estado de la Operación</span>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                          selectedOperacion.estado_operacion === "abierta"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : selectedOperacion.estado_operacion === "cerrada"
                              ? "bg-neutral-100 text-neutral-600 border-neutral-200"
                              : selectedOperacion.estado_operacion === "cancelada"
                                ? "bg-red-50 text-red-700 border-red-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}>
                          <Icon
                            icon={
                              selectedOperacion.estado_operacion === "abierta" ? "lucide:check-circle" :
                              selectedOperacion.estado_operacion === "cerrada" ? "lucide:lock" :
                              selectedOperacion.estado_operacion === "cancelada" ? "lucide:x-circle" :
                              "lucide:clock"
                            }
                            width={13} height={13}
                          />
                          {selectedOperacion.estado_operacion.charAt(0).toUpperCase() + selectedOperacion.estado_operacion.slice(1)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Instructivo de Embarque */}
                  {selectedOperacion && (
                    <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                      <div className="h-[3px] bg-gradient-to-r from-violet-500 to-purple-600" />

                      {/* Header */}
                      <div className="px-4 py-3 flex items-center gap-3 border-b border-neutral-100">
                        <span className="w-8 h-8 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center flex-shrink-0">
                          <Icon icon="lucide:file-spreadsheet" className="w-4 h-4 text-violet-600" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-neutral-700 uppercase tracking-wider">Instructivo de Embarque</p>
                          <p className="text-[10px] text-neutral-400 mt-0.5">
                            {instrPhase === "ready" || instrPhase === "sent"
                              ? `${instrFilename} · listo para enviar`
                              : "Genera el Excel con los datos de la operación y envíalo a alex.cardenas@asli.cl"}
                          </p>
                        </div>
                        {/* Select de formato — solo cuando no hay instructivo generado */}
                        {(instrPhase === "idle" || instrPhase === "error") && filteredFormatos.length > 1 && (
                          <select
                            value={selectedFormatoId}
                            onChange={(e) => { setSelectedFormatoId(e.target.value); setInstrPhase("idle"); }}
                            className="text-xs border border-neutral-200 rounded-lg px-2 py-1.5 bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 max-w-[160px]"
                          >
                            <option value="">Seleccionar formato...</option>
                            {filteredFormatos.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                          </select>
                        )}
                        {formatos.length === 0 && (
                          <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">Sin formatos</span>
                        )}
                      </div>

                      {/* Documento previo guardado (persiste entre navegaciones) */}
                      {instrSavedUrl && instrPhase === "idle" && (
                        <div className="px-4 py-2.5 border-b border-violet-100 bg-violet-50 flex items-center gap-2 flex-wrap">
                          <Icon icon="lucide:file-spreadsheet" className="w-4 h-4 text-violet-600 flex-shrink-0" />
                          <span className="text-xs font-semibold text-violet-700 flex-1 truncate">{instrFilename}</span>
                          <a href={instrSavedUrl} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 underline hover:text-violet-900 whitespace-nowrap">
                            <Icon icon="lucide:download" className="w-3 h-3" />
                            Descargar
                          </a>
                          <span className="text-[10px] text-violet-500">· Guardado anteriormente</span>
                        </div>
                      )}

                      {/* Error de guardado */}
                      {instrSaveError && (
                        <div className="px-4 py-2 border-b border-red-100 bg-red-50 flex items-center gap-2">
                          <Icon icon="lucide:cloud-off" className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                          <span className="text-[10px] text-red-700 flex-1">{instrSaveError}</span>
                          <button type="button" onClick={() => setInstrSaveError(null)} className="text-red-400 hover:text-red-600">
                            <Icon icon="lucide:x" className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {/* Acciones según fase */}
                      <div className="px-4 py-3 flex items-center gap-2 flex-wrap">

                        {/* Fase idle/error: botón Generar + Subir */}
                        {(instrPhase === "idle" || instrPhase === "error") && (
                          <>
                            <button
                              type="button"
                              disabled={!selectedFormatoId || instrIsManual}
                              onClick={() => void handleGenerarInstructivo()}
                              title={instrIsManual ? "Se subió un instructivo manual. Elimínalo primero para poder generarlo automáticamente." : undefined}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              <Icon icon="lucide:file-spreadsheet" className="w-3.5 h-3.5" />
                              {instrSavedUrl ? "Regenerar instructivo" : "Generar instructivo"}
                            </button>
                            {instrIsManual && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
                                <Icon icon="lucide:lock" className="w-3 h-3" />
                                Subido manualmente
                              </span>
                            )}

                            <input
                              ref={instrFileInputRef}
                              type="file"
                              className="hidden"
                              onChange={(e) => void handleSubirInstructivo(e)}
                            />
                            <button
                              type="button"
                              disabled={instrUploading}
                              onClick={() => instrFileInputRef.current?.click()}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-violet-300 text-violet-700 bg-white hover:bg-violet-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              {instrUploading
                                ? <><Icon icon="typcn:refresh" className="w-3.5 h-3.5 animate-spin" />Subiendo...</>
                                : <><Icon icon="lucide:upload" className="w-3.5 h-3.5" />Subir instructivo</>
                              }
                            </button>
                          </>
                        )}

                        {/* Fase generating: spinner */}
                        {instrPhase === "generating" && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-violet-100 text-violet-700">
                            <Icon icon="typcn:refresh" className="w-3.5 h-3.5 animate-spin" />
                            Generando instructivo...
                          </span>
                        )}

                        {/* Fase ready/sent: Descargar + Enviar */}
                        {(instrPhase === "ready" || instrPhase === "sent") && (
                          <>
                            <button
                              type="button"
                              onClick={handleDownloadInstructivo}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                            >
                              <Icon icon="lucide:download" className="w-3.5 h-3.5" />
                              Descargar Excel
                            </button>

                            {instrPhase !== "sent" && (
                              <button
                                type="button"
                                onClick={() => void handleSendInstructivo()}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-violet-600 text-white hover:bg-violet-700 transition-colors"
                              >
                                <Icon icon="lucide:send" className="w-3.5 h-3.5" />
                                Enviar a Alex
                                {!selectedOperacion.booking_doc_url && (
                                  <span className="text-[9px] bg-amber-400 text-amber-900 px-1 py-0.5 rounded font-bold">sin booking</span>
                                )}
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => { setInstrPhase("idle"); setInstrBlob(null); setInstrFilename(""); }}
                              className="inline-flex items-center gap-1 px-2 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
                              title="Volver a generar"
                            >
                              <Icon icon="lucide:refresh-cw" className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        {/* Fase sending: spinner */}
                        {instrPhase === "sending" && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-violet-100 text-violet-700">
                            <Icon icon="typcn:refresh" className="w-3.5 h-3.5 animate-spin" />
                            Enviando...
                          </span>
                        )}

                        {/* Indicadores de estado */}
                        {(instrPhase === "ready" || instrPhase === "sent") && (
                          <>
                            {instrSavedUrl && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg border bg-violet-50 text-violet-700 border-violet-200">
                                <Icon icon="lucide:cloud-upload" className="w-3 h-3" />
                                Guardado en Documentos
                              </span>
                            )}
                            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg border ${
                              selectedOperacion.booking_doc_url
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}>
                              <Icon icon={selectedOperacion.booking_doc_url ? "lucide:paperclip" : "lucide:alert-triangle"} className="w-3 h-3" />
                              {selectedOperacion.booking_doc_url ? "Booking PDF listo" : "Sin doc. booking"}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Feedback éxito envío */}
                      {instrPhase === "sent" && (
                        <div className="px-4 py-2.5 border-t border-emerald-100 bg-emerald-50 flex items-start gap-2 flex-wrap">
                          <Icon icon="lucide:check-circle" className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <span className="text-xs font-semibold text-emerald-700 flex-1">
                            Correo enviado a alex.cardenas@asli.cl desde tu cuenta.
                          </span>
                        </div>
                      )}

                      {/* Feedback error */}
                      {instrPhase === "error" && (
                        <div className="px-4 py-2.5 border-t border-red-100 bg-red-50 flex items-center gap-2">
                          <Icon icon="lucide:alert-circle" className="w-4 h-4 text-red-500 flex-shrink-0" />
                          <span className="text-xs text-red-700 flex-1">{instrError}</span>
                          <button type="button" onClick={() => setInstrPhase("idle")} className="text-red-400 hover:text-red-600">
                            <Icon icon="lucide:x" className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {/* Datos de la Operación */}
                    {selectedOperacion && (
                      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                        <div className="h-[3px] bg-gradient-to-r from-indigo-400 to-brand-blue" />
                        <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-2.5">
                          <span className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
                            <Icon icon="lucide:file-text" className="w-4 h-4 text-indigo-600" />
                          </span>
                          <h2 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">Datos de la Operación</h2>
                        </div>
                        <div className="p-4 grid grid-cols-2 gap-3">
                          {[
                            { label: "POD", value: selectedOperacion.pod },
                            { label: "ETD", value: formatDate(selectedOperacion.etd) },
                            { label: "Naviera", value: selectedOperacion.naviera },
                            { label: "Nave", value: selectedOperacion.nave },
                            { label: "Booking", value: selectedOperacion.booking },
                            { label: "Cliente", value: selectedOperacion.cliente },
                            ...(selectedOperacion.deposito ? [{ label: "Depósito", value: selectedOperacion.deposito }] : []),
                          ].map(({ label, value }) => (
                            <div key={label}>
                              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-0.5">{label}</p>
                              <p className="text-sm font-semibold text-neutral-800 truncate">{value || "-"}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Transporte */}
                    <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                      <div className="h-[3px] bg-gradient-to-r from-brand-blue to-blue-400" />
                      <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                          <Icon icon="lucide:truck" className="w-4 h-4 text-blue-600" />
                        </span>
                        <h2 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">{tr.transportInfo}</h2>
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

                    {/* Contenedor */}
                    <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                      <div className="h-[3px] bg-gradient-to-r from-teal-400 to-cyan-500" />
                      <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center flex-shrink-0">
                          <Icon icon="typcn:box" className="w-4 h-4 text-teal-600" />
                        </span>
                        <h2 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">{tr.containerInfo}</h2>
                      </div>
                      <div className="p-4 grid grid-cols-2 gap-3">
                        {renderInput(tr.container, "contenedor")}
                        {renderInput(tr.seal, "sello")}
                        {renderInput(tr.tare, "tara", "number")}
                        <div>
                          <label className={labelClass}>{tr.warehouse}</label>
                          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-neutral-100 text-neutral-500 text-sm">
                            <Icon icon="typcn:location" className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                            <span className="truncate">{formData.deposito || "Desde la operación"}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Citación a Planta */}
                    <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                      <div className="h-[3px] bg-gradient-to-r from-amber-400 to-orange-400" />
                      <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0">
                          <Icon icon="typcn:calendar" className="w-4 h-4 text-amber-600" />
                        </span>
                        <h2 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">Citación a Planta</h2>
                      </div>
                      <div className="p-4 grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          {renderInput("Planta de Citación", "planta_presentacion", "text")}
                        </div>
                        {renderInput(tr.citation, "citacion", "datetime-local")}
                        {renderInput(tr.plantArrival, "llegada_planta", "datetime-local")}
                        {renderInput(tr.plantDeparture, "salida_planta", "datetime-local")}
                      </div>
                    </div>

                    {/* Stacking */}
                    <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                      <div className="h-[3px] bg-gradient-to-r from-violet-400 to-purple-500" />
                      <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center flex-shrink-0">
                          <Icon icon="typcn:th-large" className="w-4 h-4 text-violet-600" />
                        </span>
                        <h2 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">{tr.stacking}</h2>
                      </div>
                      <div className="p-4 grid grid-cols-2 gap-3">
                        {renderInput(tr.stackingStart, "inicio_stacking", "datetime-local")}
                        {renderInput(tr.stackingEnd, "fin_stacking", "datetime-local")}
                        <div className="col-span-2">
                          {renderInput(tr.stackingEntry, "ingreso_stacking", "datetime-local")}
                        </div>
                      </div>
                    </div>

                    {/* Costos */}
                    <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                      <div className="h-[3px] bg-gradient-to-r from-emerald-400 to-teal-500" />
                      <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
                          <Icon icon="typcn:calculator" className="w-4 h-4 text-emerald-600" />
                        </span>
                        <h2 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">{tr.costs}</h2>
                      </div>
                      <div className="p-4 grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <label className={labelClass}>{tr.section}</label>
                          <select
                            value={tramos.find((x) => `${x.origen} - ${x.destino}` === formData.tramo)?.id ?? ""}
                            onChange={(e) => handleTramoChange(e.target.value)}
                            className={inputClass}
                          >
                            <option value="">{tr.select}</option>
                            {tramos.map((x) => (
                              <option key={x.id} value={x.id}>
                                {x.origen} — {x.destino} · {x.moneda}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className={labelClass}>{tr.sectionValue}</label>
                          <input
                            type="number"
                            lang="es-CL"
                            value={formData.valor_tramo}
                            onChange={(e) => handleChange("valor_tramo", e.target.value)}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Moneda</label>
                          <select
                            value={formData.moneda}
                            onChange={(e) => handleChange("moneda", e.target.value)}
                            className={inputClass}
                          >
                            <option value="">Seleccionar</option>
                            <option value="CLP">CLP — Peso chileno</option>
                            <option value="USD">USD — Dólar</option>
                            <option value="EUR">EUR — Euro</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Observaciones */}
                  <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                    <div className="h-[3px] bg-gradient-to-r from-neutral-300 to-neutral-400" />
                    <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center flex-shrink-0">
                        <Icon icon="typcn:notes" className="w-4 h-4 text-neutral-500" />
                      </span>
                      <h2 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">{tr.observations}</h2>
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


                  <div className="flex gap-3 justify-between">
                    {canManageTransport && formData.operacion_id && (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteReserva(formData.operacion_id)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-600 bg-white border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
                      >
                        <Icon icon="typcn:trash" className="w-4 h-4" />
                        Eliminar reserva
                      </button>
                    )}
                    <div className="flex gap-3 ml-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(initialFormData);
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
      {confirmDeleteReserva && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-lg max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                <Icon icon="typcn:trash" width={18} height={18} />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900">Eliminar reserva de transporte</h3>
                <p className="text-xs text-neutral-500">Se borrarán todos los datos de transporte de esta operación</p>
              </div>
            </div>
            <p className="text-sm text-neutral-700 mb-6">
              Esta acción limpiará empresa, chofer, equipo, contenedor, horarios, stacking, tramo y observaciones de la operación seleccionada. ¿Continuar?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteReserva(null)}
                className="flex-1 px-4 py-2 rounded-xl text-sm font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteReserva(confirmDeleteReserva ?? undefined)}
                disabled={saving}
                className="flex-1 px-4 py-2 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
