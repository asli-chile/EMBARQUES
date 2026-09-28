import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { insertarNotificacion } from "@/lib/notifications/NotificationsContext";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { Combobox } from "@/components/ui/Combobox";
import { CampoFecha } from "@/components/ui/CampoFecha";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { propsFilaDesplegable } from "@/components/ui/FilaDesplegable";
import {
  BarraFiltrosTransporte,
  BotonEliminarPie,
  BTN_HERO,
  CampoPlanta,
  CabeceraTransporte,
  CAMPO_INPUT,
  CAMPO_LABEL,
  CargandoTransporte,
  ChevronFila,
  ChipEstado,
  claseFila,
  contarCambios,
  FichaTransporte,
  FilaVacia,
  FiltroSelect,
  MarcoTabla,
  PaginaTransporte,
  fechaCorta,
  PieFicha,
  RecorridoPasos,
  SeccionFicha,
  SeccionInstructivo,
  TD,
  TH,
  useFilaConCambios,
  type Indicador,
  type Paso,
} from "@/components/transportes/FichaTransporte";
import { withBase } from "@/lib/basePath";
import { completarCatalogoTransporte } from "@/lib/transportes/catalogo";
import { displayRefAsli } from "@/lib/refAsli";
import { getEstadoOperacionStyle } from "@/lib/ui/estadoOperacion";
import { format } from "date-fns";
import { sileo } from "sileo";
import { ESTADO_META, etiquetaEstado, normalizarEstado } from "@/lib/operaciones/estados";
import { aplicarFiltroTemporada } from "@/lib/temporadas";
import { useTemporadaActiva } from "@/lib/useTemporadaActiva";
import { useNeonTheme } from "@/lib/ui/neonTheme";
import { normalizarContenedor } from "@/lib/contenedor";

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

/** Campos del formulario tal como están guardados en la operación. */
function formDesdeOperacion(op: Operacion): FormData {
  return {
    operacion_id: op.id,
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
  };
}

export function ReservaAsliContent() {
  const { t } = useLocale();
  const { user, isCliente, isSuperadmin, isAdmin, empresaNombres, isLoading: authLoading, profile } = useAuth();
  const canManageTransport = isSuperadmin || isAdmin;
  const { temporadaActiva, temporadaLoading } = useTemporadaActiva();
  const tr = t.transporteAsli;
  const tf = t.transporteFicha;
  const tm = t.misReservas;
  const [theme] = useNeonTheme();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  /* Lo que había al abrir la ficha: contra esto se cuentan los cambios. */
  const [formBase, setFormBase] = useState<FormData>(initialFormData);
  const [operaciones, setOperaciones] = useState<Operacion[]>([]);
  const [empresasTransporte, setEmpresasTransporte] = useState<TransporteEmpresa[]>([]);
  const [choferes, setChoferes] = useState<Chofer[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [tramos, setTramos] = useState<Tramo[]>([]);
  const [plantas, setPlantas] = useState<{ id: string; nombre: string }[]>([]);
  const [empresaTransporteId, setEmpresaTransporteId] = useState<string>("");
  const [empresaTransporteInput, setEmpresaTransporteInput] = useState<string>("");
  const [choferInput, setChoferInput] = useState<string>("");
  const [equipoInput, setEquipoInput] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  /* "" todas, "pendiente" con asignación incompleta, "completa" asignadas. */
  const [asignacionFiltro, setAsignacionFiltro] = useState("");
  const [transporteFiltro, setTransporteFiltro] = useState("");
  const [confirmNewItem, setConfirmNewItem] = useState<{
    type: 'empresa' | 'chofer' | 'equipo';
    value: string;
    callback: () => Promise<void>;
  } | null>(null);
  const [confirmDeleteReserva, setConfirmDeleteReserva] = useState<string | null>(null);
  // Instructivo
  const [instrFilename, setInstrFilename] = useState<string>("");
  const [instrSavedUrl, setInstrSavedUrl] = useState<string | null>(null);
  const [instrSaveError, setInstrSaveError] = useState<string | null>(null);
  const [instrUploading, setInstrUploading] = useState(false);
  const [confirmReplaceInstr, setConfirmReplaceInstr] = useState(false);
  const instrFileInputRef = useRef<HTMLInputElement>(null);

  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (!supabase || authLoading || temporadaLoading) return;
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
    qOp = aplicarFiltroTemporada(qOp, temporadaActiva);
    const [operacionesRes, empresasRes, tramosRes, plantasRes] = await Promise.all([
      qOp.order("created_at", { ascending: false }),
      supabase.from("transportes_empresas").select("id, nombre, rut").order("nombre"),
      supabase.from("transportes_tramos").select("id, origen, destino, valor, moneda, activo").eq("activo", true).order("origen"),
      supabase.from("plantas").select("id, nombre").eq("activo", true).order("nombre"),
    ]);

    setOperaciones(operacionesRes.data ?? []);
    setEmpresasTransporte((empresasRes.data ?? []) as TransporteEmpresa[]);
    setTramos((tramosRes.data ?? []) as Tramo[]);
    setPlantas((plantasRes.data ?? []) as { id: string; nombre: string }[]);
    setLoading(false);
  }, [supabase, authLoading, temporadaLoading, temporadaActiva, isCliente, empresaNombres]);

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

  // Al cambiar de operación, cargar instructivo existente y resetear estado
  useEffect(() => {
    setInstrFilename("");
    setInstrSavedUrl(null);
    setInstrSaveError(null);

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

  /**
   * Estado que corresponde a la operación después de guardar la asignación.
   *
   * FLUJO-DE-TRABAJO.md §4.10 asigna `CARGA_COORDINADA` cuando la unidad queda
   * identificada. Solo avanza: si la operación ya está más adelante en el flujo
   * (o es una excepción como CANCELADA / ROLEADA) se deja como está, para no
   * retroceder una operación que ya zarpó al reeditar un dato de transporte.
   */
  const estadoTrasAsignar = (
    estadoActual: string | null,
    datos: { transporte: string; chofer: string; patente_camion: string; contenedor: string; tramo: string }
  ): string | null => {
    const asignacionCompleta = Boolean(
      datos.transporte && datos.chofer && datos.patente_camion && datos.contenedor && datos.tramo
    );
    if (!asignacionCompleta) return null;

    const codigo = normalizarEstado(estadoActual);
    if (codigo && ESTADO_META[codigo].grupo === "EXCEPCION") return null;
    if (codigo && ESTADO_META[codigo].orden >= ESTADO_META.CARGA_COORDINADA.orden) return null;

    return "CARGA_COORDINADA";
  };

  const filteredOperaciones = useMemo(() => {
    let list = operaciones;
    if (asignacionFiltro === "pendiente") list = list.filter(isPendiente);
    if (asignacionFiltro === "completa") list = list.filter((op) => !isPendiente(op));
    if (transporteFiltro) list = list.filter((op) => (op.transporte ?? "") === transporteFiltro);
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
        (op.pod ?? "").toLowerCase().includes(search) ||
        (op.contenedor ?? "").toLowerCase().includes(search) ||
        (op.transporte ?? "").toLowerCase().includes(search) ||
        (op.chofer ?? "").toLowerCase().includes(search)
      );
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operaciones, searchTerm, asignacionFiltro, transporteFiltro]);

  const empresasEnUso = useMemo(
    () => Array.from(new Set(operaciones.map((op) => op.transporte).filter((x): x is string => !!x))).sort(),
    [operaciones],
  );

  const resumenAsignacion = useMemo(() => {
    const total = operaciones.length;
    const pendientes = operaciones.filter(isPendiente).length;
    const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
    return { total, pendientes, completas: total - pendientes, pct };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operaciones]);

  const cambios = useMemo(() => contarCambios(formData, formBase), [formData, formBase]);

  const visiblesIds = useMemo(() => filteredOperaciones.map((op) => op.id), [filteredOperaciones]);
  const { fila, cerrar: cerrarFicha, confirmarDescarte, setConfirmarDescarte, descartarYCerrar } = useFilaConCambios({
    visibles: visiblesIds,
    habilitado: !loading,
    pendientes: cambios.length,
    bloqueoEscape: !!(confirmNewItem || confirmDeleteReserva || confirmReplaceInstr),
  });

  /* Replegada la ficha, el formulario vuelve a cero. */
  useEffect(() => {
    if (fila.abiertaId) return;
    setFormData(initialFormData);
    setFormBase(initialFormData);
    setEmpresaTransporteInput("");
    setEmpresaTransporteId("");
    setChoferInput("");
    setEquipoInput("");
    setError(null);
  }, [fila.abiertaId]);

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
    // Al seleccionar una operación, cargar todos los campos de transporte ya guardados
    if (field === "operacion_id" && value) {
      const op = operaciones.find((o) => o.id === value);
      if (op) {
        const inicial = formDesdeOperacion(op);
        setFormData(inicial);
        setFormBase(inicial);
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
    }
  };

  /* Clic en una fila: abre su ficha, o la repliega si es la abierta. Con
     otra abierta no hace nada: primero hay que replegar. */
  const alternarFila = (id: string) => {
    if (fila.abiertaId === id) {
      cerrarFicha();
      return;
    }
    if (fila.abiertaId) return;
    handleChange("operacion_id", id);
    fila.toggle(id);
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
        rut: formData.rut_chofer.trim() || null,
        telefono: formData.telefono_chofer.trim() || null,
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
    setFormData(prev => ({ ...prev, chofer: newChofer.nombre }));
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
        patente_remolque: formData.patente_remolque.trim().toUpperCase() || null,
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

  /* Lleva al catálogo el RUT, teléfono y remolque escritos en la reserva
     (ver completarCatalogoTransporte). No bloquea el guardado. */
  const sincronizarCatalogo = async (datos: FormData) => {
    if (!supabase) return;
    const hecho = await completarCatalogoTransporte(supabase, datos, choferes, equipos);
    const ch = hecho.chofer;
    if (ch) setChoferes((prev) => prev.map((c) => (c.id === ch.id ? { ...c, rut: ch.rut, telefono: ch.telefono } : c)));
    const eq = hecho.equipo;
    if (eq) setEquipos((prev) => prev.map((e) => (e.id === eq.id ? { ...e, patente_remolque: eq.patente_remolque } : e)));
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
      contenedor: normalizarContenedor(formData.contenedor) || null,
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

    const nuevoEstado = estadoTrasAsignar(selectedOperacion?.estado_operacion ?? null, {
      transporte: formData.transporte,
      chofer: formData.chofer,
      patente_camion: formData.patente_camion,
      contenedor: formData.contenedor,
      tramo: formData.tramo,
    });
    if (nuevoEstado) updates.estado_operacion = nuevoEstado;

    const { error: err } = await supabase
      .from("operaciones")
      .update(updates)
      .eq("id", formData.operacion_id);

    setSaving(false);

    if (err) {
      setError(err.message);
    } else {
      sileo.success({
        title: tf.asliGuardado,
        description: nuevoEstado
          ? `${tf.asliPasoA} ${etiquetaEstado(nuevoEstado)}.`
          : undefined,
      });
      void sincronizarCatalogo(formData);
      // Se actualiza en el lugar: recargar todo desmontaría la tabla y
      // replegaría la ficha que se está trabajando.
      const opId = formData.operacion_id;
      setOperaciones((prev) => prev.map((o) => (o.id === opId ? ({ ...o, ...updates } as Operacion) : o)));
      const guardado = { ...formData, contenedor: normalizarContenedor(formData.contenedor) };
      setFormData(guardado);
      setFormBase(guardado);

      // Notificar al equipo
      if (user && profile) {
        const opInfo = [formData.transporte, formData.patente_camion].filter(Boolean).join(" · ");
        const refLabel = selectedOperacion?.ref_asli ?? formData.operacion_id ?? "";
        void insertarNotificacion({
          tipo: "nuevo_transporte",
          titulo: `${profile.nombre} asignó reserva de transporte`,
          mensaje: [refLabel, opInfo].filter(Boolean).join(" · "),
          creadoPorAuthId: user.id,
          creadoPorNombre: profile.nombre,
          datos: { operacion_id: formData.operacion_id, ref_asli: refLabel },
        });
      }
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
      // Si era la abierta, sale de la lista y la ficha se repliega sola.
      setOperaciones((prev) => prev.filter((o) => o.id !== targetId));
      sileo.success({ title: tf.asliQuitada });
    }
  };

  // ── Subir instructivo ────────────────────────────────────────────────────
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
    } catch (err) {
      setInstrSaveError(err instanceof Error ? err.message : "Error al subir el instructivo.");
    } finally {
      setInstrUploading(false);
      if (instrFileInputRef.current) instrFileInputRef.current.value = "";
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    try {
      // Una fecha sola ("2026-09-28") es día calendario: con new Date() se
      // leería como medianoche UTC y en Chile mostraría el día anterior.
      const soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
      if (soloFecha) return `${soloFecha[3]}/${soloFecha[2]}/${soloFecha[1]}`;
      return format(new Date(dateStr), "dd/MM/yyyy");
    } catch {
      return dateStr;
    }
  };

  const renderInput = (
    label: string,
    field: keyof FormData,
    type: string = "text",
    placeholder?: string
  ) =>
    type === "date" || type === "datetime-local" ? (
      <div>
        <label className={CAMPO_LABEL}>{label}</label>
        <CampoFecha
          value={formData[field]}
          onChange={(v) => handleChange(field, v)}
          conHora={type === "datetime-local"}
          className={CAMPO_INPUT}
        />
      </div>
    ) : (
    <div>
      <label className={CAMPO_LABEL}>{label}</label>
      <input
        type={type}
        lang="es-CL"
        value={formData[field]}
        onChange={(e) => handleChange(field, e.target.value)}
        onBlur={field === "contenedor" ? (e) => handleChange(field, normalizarContenedor(e.target.value)) : undefined}
        placeholder={placeholder}
        className={CAMPO_INPUT}
      />
    </div>
  );

  if (loading) return <CargandoTransporte theme={theme} label={tr.loading} />;

  /** Lo que le falta a la asignación para quedar completa. */
  const faltantes = (op: Operacion): string[] =>
    [
      [op.transporte, tf.campoEmpresa],
      [op.chofer, tf.campoChofer],
      [op.patente_camion, tf.campoUnidad],
      [op.contenedor, tf.campoContenedor],
      [op.tramo, tf.campoTramo],
    ]
      .filter(([valor]) => !valor)
      .map(([, campo]) => String(campo));

  const indicadores: Indicador[] = [
    { clave: "", label: tf.asliKpiTotal, valor: resumenAsignacion.total, pct: null, tono: "estado--curso", icon: "lucide:files" },
    {
      clave: "pendiente",
      label: tf.asliKpiPendientes,
      valor: resumenAsignacion.pendientes,
      pct: resumenAsignacion.pct(resumenAsignacion.pendientes),
      tono: "estado--atencion",
      icon: "lucide:clock",
    },
    {
      clave: "completa",
      label: tf.asliKpiCompletas,
      valor: resumenAsignacion.completas,
      pct: resumenAsignacion.pct(resumenAsignacion.completas),
      tono: "estado--ok",
      icon: "lucide:check-circle",
    },
  ];

  const hayFiltros = !!(searchTerm || asignacionFiltro || transporteFiltro);
  const limpiarFiltros = () => {
    setSearchTerm("");
    setAsignacionFiltro("");
    setTransporteFiltro("");
  };

  const COLS = canManageTransport ? 12 : 11;

  const chipEstadoOp = (estado: string | null) => {
    const cfg = getEstadoOperacionStyle(estado);
    if (!estado) return <span className="text-dash-muted">—</span>;
    return (
      <span
        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
          cfg ? `${cfg.bg} ${cfg.text} ${cfg.border}` : "border-dash-border text-dash-muted"
        }`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${cfg?.dot ?? "bg-current"}`} aria-hidden />
        {etiquetaEstado(estado)}
      </span>
    );
  };

  /* Un campo para el avance del paso: etiqueta, valor mostrable y si tiene
     cambios sin guardar. */
  const campo = (label: string, key: keyof FormData, fmt: (v: string) => string = (v) => v) => ({
    label,
    valor: formData[key] ? fmt(formData[key]) : "",
    key,
  });
  const paso = (
    id: string,
    icono: string,
    titulo: string,
    campos: ReturnType<typeof campo>[],
    contenido: React.ReactNode,
  ): Paso => ({
    id,
    icono,
    titulo,
    campos,
    conCambios: campos.some((c) => cambios.includes(c.key)),
    contenido,
  });

  const renderFicha = (op: Operacion) => {
    return (
      <FichaTransporte
        cerrando={fila.cerrando}
        onCerrar={cerrarFicha}
        onSubmit={handleSubmit}
        labels={{ volver: tm.detalleVolverLista, replegar: tm.detalleReplegar }}
        eyebrow={tf.asliEyebrow}
        titulo={displayRefAsli(op.ref_asli, op.correlativo, "-")}
        estado={chipEstadoOp(op.estado_operacion)}
        subtitulo={[op.cliente, op.naviera].filter(Boolean).join("  ·  ") || "—"}
        resumen={[
          { label: tf.colBooking, valor: op.booking || null, icono: "lucide:bookmark", mono: true },
          { label: tf.colContenedor, valor: normalizarContenedor(formData.contenedor) || null, icono: "lucide:container", mono: true },
          { label: tr.warehouse, valor: formData.deposito || null, icono: "lucide:warehouse" },
          { label: t.transporteExt.naveLabel, valor: op.nave || null, icono: "lucide:ship" },
          { label: tf.colDestino, valor: op.pod || null, icono: "lucide:map-pin" },
          { label: tf.colEtd, valor: op.etd ? formatDate(op.etd) : null, icono: "lucide:calendar" },
        ]}
        acciones={
          <>
            <a href={`${withBase("/documentos/mis-documentos")}?op=${encodeURIComponent(op.id)}`} className={BTN_HERO}>
              <Icon icon="lucide:folder-open" width={13} height={13} aria-hidden />
              {tf.irDocumentos}
            </a>
            {op.booking_doc_url && (
              <a href={op.booking_doc_url} target="_blank" rel="noopener noreferrer" className={BTN_HERO}>
                <Icon icon="lucide:paperclip" width={13} height={13} aria-hidden />
                {tf.verBooking}
              </a>
            )}
          </>
        }
        lateral={
          <>
            <SeccionInstructivo
              url={instrSavedUrl}
              nombre={instrFilename}
              error={instrSaveError}
              subiendo={instrUploading}
              onElegir={() => {
                if (instrSavedUrl) setConfirmReplaceInstr(true);
                else instrFileInputRef.current?.click();
              }}
              onLimpiarError={() => setInstrSaveError(null)}
              labels={{
                titulo: tf.instrTitulo,
                cargado: tf.instrCargado,
                hintGuardado: tf.instrHintGuardado,
                hintSubir: tf.instrHintSubir,
                guardadoEn: tf.instrGuardadoEn,
                descargar: tf.instrDescargar,
                subir: tf.instrSubir,
                reemplazar: tf.instrReemplazar,
                subiendo: tf.instrSubiendo,
              }}
            />
            <SeccionFicha icono="lucide:message-square-text" titulo={tr.observations}>
              <textarea
                value={formData.observaciones}
                onChange={(e) => handleChange("observaciones", e.target.value)}
                rows={Math.min(8, Math.max(2, formData.observaciones.split("\n").length))}
                placeholder={tr.observationsPlaceholder}
                className={`${CAMPO_INPUT} resize-y col-span-full`}
              />
            </SeccionFicha>
          </>
        }
        pie={
          <PieFicha
            cambios={cambios}
            error={error}
            guardando={saving}
            onDescartar={() => handleChange("operacion_id", op.id)}
            izquierda={
              canManageTransport ? (
                <BotonEliminarPie label={tf.asliQuitar} onClick={() => setConfirmDeleteReserva(op.id)} />
              ) : undefined
            }
            labels={{
              cambio: tm.detalleCambioSinGuardar,
              cambios: tm.detalleCambiosSinGuardar,
              sinCambios: tf.sinCambios,
              descartar: tm.detalleDescartar,
              guardar: tm.detalleGuardarCambios,
              guardando: tr.saving,
            }}
          />
        }
      >

        <RecorridoPasos
          labels={{ siguiente: tf.pasoSiguiente, sinDatos: tf.pasoSinDatos, falta: tf.falta }}
          pasos={[
            paso(
              "unidad",
              "lucide:truck",
              tf.pasoUnidad,
              [
                campo(tr.transportCompany, "transporte"),
                campo(tr.driverName, "chofer"),
                campo(tr.driverRut, "rut_chofer"),
                campo(tr.driverPhone, "telefono_chofer"),
                campo(tr.truckPlate, "patente_camion"),
                campo(tr.trailerPlate, "patente_remolque"),
              ],
              <>
                <div>
                  <label className={CAMPO_LABEL}>{tr.transportCompany}</label>
                  <Combobox
                    neon
                    value={empresaTransporteInput}
                    onChange={handleEmpresaInputChange}
                    onBlur={handleEmpresaInputBlur}
                    options={empresasTransporte.map((e) => ({ value: e.nombre, label: e.nombre, sublabel: e.rut || undefined }))}
                    placeholder={t.transporteExt.placeholderEmpresa}
                    className={CAMPO_INPUT}
                    icon="lucide:building-2"
                  />
                </div>
                <div>
                  <label className={CAMPO_LABEL}>{tr.driverName}</label>
                  <Combobox
                    neon
                    value={choferInput}
                    onChange={handleChoferInputChange}
                    onBlur={handleChoferInputBlur}
                    options={choferes.map((c) => ({ value: c.nombre, label: c.nombre, sublabel: c.rut || undefined }))}
                    placeholder={t.transporteExt.placeholderChofer}
                    disabled={!empresaTransporteId}
                    className={CAMPO_INPUT}
                    icon="lucide:user"
                  />
                </div>
                {renderInput(tr.driverRut, "rut_chofer")}
                {renderInput(tr.driverPhone, "telefono_chofer", "tel")}
                <div>
                  <label className={CAMPO_LABEL}>{tr.truckPlate}</label>
                  <Combobox
                    neon
                    value={equipoInput}
                    onChange={(v) => handleEquipoInputChange(v.toUpperCase())}
                    onBlur={handleEquipoInputBlur}
                    options={equipos.map((x) => ({
                      value: x.patente_camion,
                      label: x.patente_camion,
                      sublabel: x.patente_remolque ? `Remolque: ${x.patente_remolque}` : undefined,
                    }))}
                    placeholder={t.transporteExt.placeholderPatente}
                    disabled={!empresaTransporteId}
                    className={CAMPO_INPUT}
                    icon="lucide:truck"
                  />
                </div>
                {renderInput(tr.trailerPlate, "patente_remolque")}
              </>,
            ),
            paso(
              "contenedor",
              "lucide:container",
              tf.pasoContenedor,
              [campo(tr.container, "contenedor", normalizarContenedor), campo(tr.seal, "sello"), campo(tr.tare, "tara")],
              <>
                {renderInput(tr.container, "contenedor")}
                {renderInput(tr.seal, "sello")}
                {renderInput(tr.tare, "tara", "number")}
                <div>
                  <p className={CAMPO_LABEL}>{tr.warehouse}</p>
                  <p className="flex min-h-[2.5rem] items-center gap-2 rounded-lg border border-dashed border-dash-border px-3 text-[13.5px] font-semibold text-dash-muted">
                    <Icon icon="lucide:warehouse" width={14} height={14} className="shrink-0" aria-hidden />
                    <span className="truncate">{formData.deposito || tf.desdeOperacion}</span>
                  </p>
                </div>
              </>,
            ),
            paso(
              "citacion",
              "lucide:factory",
              tf.pasoCitacion,
              [
                campo(tf.plantaCitacion, "planta_presentacion"),
                campo(tr.citation, "citacion", fechaCorta),
                campo(tr.plantArrival, "llegada_planta", fechaCorta),
                campo(tr.plantDeparture, "salida_planta", fechaCorta),
              ],
              <>
                <div className="col-span-full">
                  <CampoPlanta
                    label={tf.plantaCitacion}
                    value={formData.planta_presentacion}
                    onChange={(v) => handleChange("planta_presentacion", v)}
                    plantas={plantas}
                    onPlantaCreada={(p) => setPlantas((prev) => [...prev, p].sort((a, b) => a.nombre.localeCompare(b.nombre)))}
                    onError={setError}
                    supabase={supabase}
                    labels={{ buscar: t.crearReserva.searchPlanta, agregar: t.crearReserva.addNewPlanta }}
                  />
                </div>
                {renderInput(tr.citation, "citacion", "datetime-local")}
                {renderInput(tr.plantArrival, "llegada_planta", "datetime-local")}
                {renderInput(tr.plantDeparture, "salida_planta", "datetime-local")}
              </>,
            ),
            paso(
              "stacking",
              "lucide:layers",
              tf.pasoStacking,
              [
                campo(tr.stackingStart, "inicio_stacking", fechaCorta),
                campo(tr.stackingEnd, "fin_stacking", fechaCorta),
                campo(tr.stackingEntry, "ingreso_stacking", fechaCorta),
              ],
              <>
                {renderInput(tr.stackingStart, "inicio_stacking", "datetime-local")}
                {renderInput(tr.stackingEnd, "fin_stacking", "datetime-local")}
                <div className="col-span-full">{renderInput(tr.stackingEntry, "ingreso_stacking", "datetime-local")}</div>
              </>,
            ),
            paso(
              "costos",
              "lucide:calculator",
              tf.pasoCostos,
              [campo(tr.section, "tramo"), campo(tr.sectionValue, "valor_tramo"), campo(tf.moneda, "moneda")],
              <>
                <div className="col-span-full">
                  <label className={CAMPO_LABEL}>{tr.section}</label>
                  <select
                    value={tramos.find((x) => `${x.origen} - ${x.destino}` === formData.tramo)?.id ?? ""}
                    onChange={(e) => handleTramoChange(e.target.value)}
                    className={CAMPO_INPUT}
                  >
                    <option value="">{tr.select}</option>
                    {tramos.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.origen} — {x.destino} · {x.moneda}
                      </option>
                    ))}
                  </select>
                </div>
                {renderInput(tr.sectionValue, "valor_tramo", "number")}
                <div>
                  <label className={CAMPO_LABEL}>{tf.moneda}</label>
                  <select value={formData.moneda} onChange={(e) => handleChange("moneda", e.target.value)} className={CAMPO_INPUT}>
                    <option value="">{tf.seleccionar}</option>
                    <option value="CLP">CLP — Peso chileno</option>
                    <option value="USD">USD — Dólar</option>
                    <option value="EUR">EUR — Euro</option>
                  </select>
                </div>
              </>,
            ),
          ]}
        />

      </FichaTransporte>
    );
  };

  return (
    <PaginaTransporte theme={theme}>
      {/* La cabecera se repliega con una ficha abierta, como en Mis Reservas. */}
      <div className="rd-colapsable relative z-10 shrink-0" data-colapsado={fila.cabeceraOculta} inert={fila.cabeceraOculta || undefined}>
        <div>
          <CabeceraTransporte
            titulo={tr.title}
            subtitulo={tf.asliSubtitulo}
            icono="lucide:truck"
            volverLabel={tf.volver}
            visibles={filteredOperaciones.length}
            total={operaciones.length}
            indicadores={indicadores}
            activo={asignacionFiltro}
            onIndicador={setAsignacionFiltro}
            acciones={
              <a
                href={withBase("/transportes/papelera")}
                className="dash-control rounded-lg p-2 text-dash-muted hover:text-dash-fg"
                title={tf.asliPapelera}
                aria-label={tf.asliPapelera}
              >
                <Icon icon="lucide:trash-2" width={14} height={14} />
              </a>
            }
          />
          <BarraFiltrosTransporte
            busqueda={searchTerm}
            onBusqueda={setSearchTerm}
            placeholder={tr.searchPlaceholder}
            onRefrescar={() => void fetchData()}
            refrescarLabel={t.misReservas?.refresh ?? "Actualizar"}
          >
            <FiltroSelect
              valor={asignacionFiltro}
              onCambio={setAsignacionFiltro}
              etiqueta={tf.colAsignacion}
              todos={tf.colAsignacion}
              opciones={[
                { valor: "pendiente", label: tf.asliKpiPendientes },
                { valor: "completa", label: tf.asliKpiCompletas },
              ]}
            />
            <FiltroSelect
              valor={transporteFiltro}
              onCambio={setTransporteFiltro}
              etiqueta={tf.colTransporte}
              todos={tf.todasEmpresas}
              opciones={empresasEnUso.map((n) => ({ valor: n, label: n }))}
            />
          </BarraFiltrosTransporte>
        </div>
      </div>

      <MarcoTabla
        scrollProps={fila.scrollProps}
        pie={
          filteredOperaciones.length > 0 ? (
            <span className="text-xs font-medium tabular-nums text-dash-muted">
              {filteredOperaciones.length} {filteredOperaciones.length === 1 ? tf.registro : tf.registros}
              {filteredOperaciones.length !== operaciones.length && ` ${tf.de} ${operaciones.length}`}
            </span>
          ) : undefined
        }
      >
        <thead>
          <tr>
            <th className={TH}>{tf.colRef}</th>
            <th className={TH}>{tf.colCliente}</th>
            <th className={TH}>{tf.colBooking}</th>
            <th className={TH}>{tf.colContenedor}</th>
            <th className={TH}>{tf.colNave}</th>
            <th className={TH}>{tf.colDestino}</th>
            <th className={TH}>{tf.colEtd}</th>
            <th className={TH}>{tf.colTransporte}</th>
            <th className={TH}>{tf.colUnidad}</th>
            <th className={TH}>{tf.colAsignacion}</th>
            <th className={TH}>{tf.colEstadoOp}</th>
            {canManageTransport && <th className={`${TH} w-12`} aria-label={tf.asliQuitar} />}
          </tr>
        </thead>
        <tbody>
          {filteredOperaciones.length === 0 ? (
            <FilaVacia
              colSpan={COLS}
              icono="lucide:truck"
              texto={operaciones.length === 0 ? tf.asliSinOperaciones : tf.sinResultados}
              accion={
                hayFiltros ? (
                  <button type="button" onClick={limpiarFiltros} className="mt-1 text-xs font-medium text-dash-fg hover:underline">
                    {tf.limpiarFiltros}
                  </button>
                ) : undefined
              }
            />
          ) : (
            filteredOperaciones.map((op, idx) => {
              const abierta = fila.abiertaId === op.id;
              const cfg = getEstadoOperacionStyle(op.estado_operacion);
              const falta = faltantes(op);
              return (
                <Fragment key={op.id}>
                  <tr {...propsFilaDesplegable(op.id, abierta, alternarFila)} className={claseFila(abierta, idx)}>
                    <td className={`${TD} relative whitespace-nowrap`}>
                      {/* La barra del canto habla del viaje, como en Mis Reservas. */}
                      {cfg && <span className={`absolute inset-y-0 left-0 w-[3px] ${cfg.dot}`} aria-hidden />}
                      <span className="inline-flex items-center gap-1.5">
                        <ChevronFila abierta={abierta} />
                        <span className="text-[14px] font-bold tabular-nums tracking-tight text-dash-fg">
                          {displayRefAsli(op.ref_asli, op.correlativo, "-")}
                        </span>
                      </span>
                    </td>
                    <td className={`${TD} max-w-[14rem] truncate font-semibold text-dash-fg`}>{op.cliente || "—"}</td>
                    <td className={`${TD} whitespace-nowrap`}>
                      <span className="inline-flex items-center gap-1 font-mono text-[12.5px] text-dash-fg">
                        {op.booking || "—"}
                        {op.booking_doc_url && (
                          <a
                            href={op.booking_doc_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={tf.verBooking}
                            className="rounded p-0.5 text-[var(--estado-curso)] hover:bg-dash-neon/10"
                          >
                            <Icon icon="lucide:paperclip" width={12} height={12} />
                          </a>
                        )}
                      </span>
                    </td>
                    <td className={`${TD} whitespace-nowrap font-mono text-[12.5px] text-dash-fg`}>{op.contenedor || "—"}</td>
                    <td className={TD}>
                      <p className="max-w-[12rem] truncate font-semibold text-dash-fg">{op.naviera || "—"}</p>
                      <p className="max-w-[12rem] truncate text-[12px] text-dash-muted">{op.nave || "—"}</p>
                    </td>
                    <td className={`${TD} whitespace-nowrap text-dash-fg`}>{op.pod || "—"}</td>
                    <td className={`${TD} whitespace-nowrap tabular-nums text-dash-fg`}>{formatDate(op.etd)}</td>
                    <td className={`${TD} max-w-[12rem] truncate text-dash-fg`}>{op.transporte || "—"}</td>
                    <td className={TD}>
                      <p className="max-w-[12rem] truncate text-dash-fg">{op.chofer || "—"}</p>
                      <p className="font-mono text-[12px] text-dash-muted">{op.patente_camion || ""}</p>
                    </td>
                    <td className={TD} title={falta.length ? `${tf.falta}: ${falta.join(", ")}` : undefined}>
                      {falta.length === 0 ? (
                        <ChipEstado tono="estado--ok" label={tf.completa} icono="lucide:check" />
                      ) : (
                        <ChipEstado tono="estado--atencion" label={`${tf.faltan} ${falta.length}`} />
                      )}
                    </td>
                    <td className={TD}>{chipEstadoOp(op.estado_operacion)}</td>
                    {canManageTransport && (
                      <td data-row-action className={`${TD} text-center`}>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteReserva(op.id)}
                          className="rounded-lg p-1.5 text-dash-muted transition-colors hover:bg-[color-mix(in_srgb,var(--estado-error)_14%,transparent)] hover:text-[var(--estado-error)]"
                          title={tf.asliQuitar}
                          aria-label={tf.asliQuitar}
                        >
                          <Icon icon="lucide:trash-2" width={14} height={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                  {abierta && (
                    <tr className="bg-[color-mix(in_srgb,var(--estado-curso)_6%,transparent)]">
                      <td colSpan={COLS} className="p-0">
                        {renderFicha(op)}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })
          )}
        </tbody>
      </MarcoTabla>

      <input
        ref={instrFileInputRef}
        type="file"
        accept=".xlsx,.xls,.pdf"
        className="hidden"
        onChange={(e) => void handleSubirInstructivo(e)}
      />

      {confirmNewItem &&
        createPortal(
          <ConfirmDialog
            title={
              confirmNewItem.type === "empresa"
                ? tf.nuevoEmpresaTitulo
                : confirmNewItem.type === "chofer"
                  ? tf.nuevoChoferTitulo
                  : tf.nuevoEquipoTitulo
            }
            message={`${tf.nuevoMensaje} ${confirmNewItem.value}`}
            confirmLabel={tf.nuevoConfirmar}
            cancelLabel={tf.cancelar}
            icon={
              confirmNewItem.type === "empresa" ? "lucide:building-2" : confirmNewItem.type === "chofer" ? "lucide:user" : "lucide:truck"
            }
            onConfirm={() => {
              const item = confirmNewItem;
              setConfirmNewItem(null);
              void item.callback();
            }}
            onCancel={() => setConfirmNewItem(null)}
          />,
          document.body,
        )}

      {confirmDeleteReserva &&
        createPortal(
          <ConfirmDialog
            variant="warning"
            title={tf.asliQuitarTitulo}
            message={tf.asliQuitarMensaje}
            confirmLabel={tf.asliQuitar}
            cancelLabel={tf.cancelar}
            icon="lucide:trash-2"
            onConfirm={() => void handleDeleteReserva(confirmDeleteReserva)}
            onCancel={() => setConfirmDeleteReserva(null)}
          />,
          document.body,
        )}

      {confirmReplaceInstr &&
        createPortal(
          <ConfirmDialog
            variant="warning"
            title={tf.instrReemplazarTitulo}
            message={`${tf.instrReemplazarMensaje} (${instrFilename})`}
            confirmLabel={tf.instrReemplazarAccion}
            cancelLabel={tf.cancelar}
            onConfirm={() => {
              setConfirmReplaceInstr(false);
              instrFileInputRef.current?.click();
            }}
            onCancel={() => setConfirmReplaceInstr(false)}
          />,
          document.body,
        )}

      {confirmarDescarte &&
        createPortal(
          <ConfirmDialog
            variant="warning"
            title={tm.detalleDescartarTitulo}
            message={tm.detalleDescartarMensaje}
            confirmLabel={tm.detalleDescartarConfirmar}
            cancelLabel={tm.detalleSeguirEditando}
            onConfirm={descartarYCerrar}
            onCancel={() => setConfirmarDescarte(false)}
          />,
          document.body,
        )}
    </PaginaTransporte>
  );
}
