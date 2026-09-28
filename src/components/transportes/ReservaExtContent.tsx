import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { Combobox } from "@/components/ui/Combobox";
import { ComboboxInput } from "@/components/ui/ComboboxInput";
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
  Segmentos,
  TD,
  TH,
  useFilaConCambios,
  type Indicador,
  type Paso,
} from "@/components/transportes/FichaTransporte";
import { saveDestinoToCatalog } from "@/lib/destinos-service";
import { useNeonTheme } from "@/lib/ui/neonTheme";
import { withBase } from "@/lib/basePath";
import { completarCatalogoTransporte } from "@/lib/transportes/catalogo";
import { displayRefAsli } from "@/lib/refAsli";
import { normalizarContenedor } from "@/lib/contenedor";
import { format } from "date-fns";
import { sileo } from "sileo";

type ReservaExt = {
  id: string;
  /** Operación de origen. Null en reservas antiguas o creadas a mano aquí. */
  operacion_id: string | null;
  cliente: string | null;
  booking: string | null;
  naviera: string | null;
  nave: string | null;
  pod: string | null;
  etd: string | null;
  planta_presentacion: string | null;
  transporte: string | null;
  chofer: string | null;
  rut_chofer: string | null;
  telefono_chofer: string | null;
  patente_camion: string | null;
  patente_remolque: string | null;
  contenedor: string | null;
  sello: string | null;
  tara: number | null;
  deposito: string | null;
  citacion: string | null;
  llegada_planta: string | null;
  salida_planta: string | null;
  agendamiento_retiro: string | null;
  inicio_stacking: string | null;
  fin_stacking: string | null;
  ingreso_stacking: string | null;
  tramo: string | null;
  valor_tramo: number | null;
  porteo: string | null;
  valor_porteo: number | null;
  falso_flete: string | null;
  valor_falso_flete: number | null;
  factura_transporte: string | null;
  observaciones: string | null;
  estado: string;
  created_at: string;
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

type SelectOption = { id: string; nombre: string };

/** Datos del embarque que vienen de `operaciones` y aquí solo se muestran. */
type OperacionVinculada = {
  id: string;
  ref_asli: string | null;
  correlativo: number | null;
  cliente: string | null;
  booking: string | null;
  booking_doc_url: string | null;
  naviera: string | null;
  nave: string | null;
  pod: string | null;
  etd: string | null;
  planta_presentacion: string | null;
};

const OPERACION_VINCULADA_COLS =
  "id, ref_asli, correlativo, cliente, booking, booking_doc_url, naviera, nave, pod, etd, planta_presentacion";

type FormData = {
  cliente: string;
  booking: string;
  naviera: string;
  nave: string;
  pod: string;
  etd: string;
  planta_presentacion: string;
  estado: string;
  transporte: string;
  chofer: string;
  rut_chofer: string;
  telefono_chofer: string;
  patente_camion: string;
  patente_remolque: string;
  contenedor: string;
  sello: string;
  tara: string;
  deposito: string;
  citacion: string;
  llegada_planta: string;
  salida_planta: string;
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

/** Id de la fila provisoria de una reserva nueva, antes de guardarla. */
const NUEVA_ID = "__nueva__";

/** Estado de la reserva externa → tono de marca. */
const ESTADOS_EXT = [
  { valor: "pendiente", tono: "estado--atencion", icon: "lucide:clock" },
  { valor: "en_curso", tono: "estado--curso", icon: "lucide:loader" },
  { valor: "completada", tono: "estado--ok", icon: "lucide:check-circle" },
] as const;
const tonoEstadoExt = (estado: string | null | undefined) =>
  ESTADOS_EXT.find((e) => e.valor === estado) ?? ESTADOS_EXT[0];

const initialFormData: FormData = {
  cliente: "",
  booking: "",
  naviera: "",
  nave: "",
  pod: "",
  etd: "",
  planta_presentacion: "",
  estado: "pendiente",
  transporte: "",
  chofer: "",
  rut_chofer: "",
  telefono_chofer: "",
  patente_camion: "",
  patente_remolque: "",
  contenedor: "",
  sello: "",
  tara: "",
  deposito: "",
  citacion: "",
  llegada_planta: "",
  salida_planta: "",
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

function reservaToForm(r: ReservaExt): FormData {
  return {
    cliente: r.cliente ?? "",
    booking: r.booking ?? "",
    naviera: r.naviera ?? "",
    nave: r.nave ?? "",
    pod: r.pod ?? "",
    etd: r.etd ?? "",
    planta_presentacion: r.planta_presentacion ?? "",
    estado: r.estado ?? "pendiente",
    transporte: r.transporte ?? "",
    chofer: r.chofer ?? "",
    rut_chofer: r.rut_chofer ?? "",
    telefono_chofer: r.telefono_chofer ?? "",
    patente_camion: r.patente_camion ?? "",
    patente_remolque: r.patente_remolque ?? "",
    contenedor: r.contenedor ?? "",
    sello: r.sello ?? "",
    tara: r.tara != null ? String(r.tara) : "",
    deposito: r.deposito ?? "",
    citacion: r.citacion ?? "",
    llegada_planta: r.llegada_planta ?? "",
    salida_planta: r.salida_planta ?? "",
    agendamiento_retiro: r.agendamiento_retiro ?? "",
    inicio_stacking: r.inicio_stacking ?? "",
    fin_stacking: r.fin_stacking ?? "",
    ingreso_stacking: r.ingreso_stacking ?? "",
    tramo: r.tramo ?? "",
    valor_tramo: r.valor_tramo != null ? String(r.valor_tramo) : "",
    porteo: r.porteo ?? "",
    valor_porteo: r.valor_porteo != null ? String(r.valor_porteo) : "",
    falso_flete: r.falso_flete ?? "",
    valor_falso_flete: r.valor_falso_flete != null ? String(r.valor_falso_flete) : "",
    factura_transporte: r.factura_transporte ?? "",
    observaciones: r.observaciones ?? "",
  };
}

export function ReservaExtContent() {
  const { t } = useLocale();
  const { isLoading: authLoading } = useAuth();
  const [theme] = useNeonTheme();
  const tr = t.transporteExt;
  const tf = t.transporteFicha;
  const tm = t.misReservas;

  const [reservas, setReservas] = useState<ReservaExt[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  /* Lo que había al abrir la ficha: contra esto se cuentan los cambios. */
  const [formBase, setFormBase] = useState<FormData>(initialFormData);
  const [isNew, setIsNew] = useState(false);

  const [empresasTransporte, setEmpresasTransporte] = useState<TransporteEmpresa[]>([]);
  const [choferes, setChoferes] = useState<Chofer[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [tramos, setTramos] = useState<Tramo[]>([]);
  const [navieras, setNavieras] = useState<SelectOption[]>([]);
  const [naves, setNaves] = useState<SelectOption[]>([]);
  const [destinos, setDestinos] = useState<SelectOption[]>([]);
  const [plantas, setPlantas] = useState<SelectOption[]>([]);
  const [depositos, setDepositos] = useState<SelectOption[]>([]);
  const [empresaTransporteId, setEmpresaTransporteId] = useState<string>("");
  const [empresaTransporteInput, setEmpresaTransporteInput] = useState<string>("");
  const [choferInput, setChoferInput] = useState<string>("");
  const [equipoInput, setEquipoInput] = useState<string>("");
  const [podInput, setPodInput] = useState("");
  const [addingDestino, setAddingDestino] = useState(false);

  const [bookingDocUrl, setBookingDocUrl] = useState<string | null>(null);
  // Operación de origen de la reserva seleccionada. Cuando existe, los datos
  // del embarque son derivados: se leen de `operaciones` y no se editan aquí.
  const [opVinculada, setOpVinculada] = useState<OperacionVinculada | null>(null);
  // Instructivo
  const [instrFilename, setInstrFilename] = useState<string>("");
  const [instrSavedUrl, setInstrSavedUrl] = useState<string | null>(null);
  const [instrSaveError, setInstrSaveError] = useState<string | null>(null);
  const [instrUploading, setInstrUploading] = useState(false);
  const [confirmReplaceInstr, setConfirmReplaceInstr] = useState(false);
  const instrFileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [transporteFiltro, setTransporteFiltro] = useState("");
  const [confirmNewItem, setConfirmNewItem] = useState<{
    type: "empresa" | "chofer" | "equipo";
    value: string;
    callback: () => Promise<void>;
  } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

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

    const [reservasRes, empresasRes, tramosRes, navierasRes, navesRes, destinosRes, plantasRes, depositosRes] = await Promise.all([
      supabase.from("transportes_reservas_ext").select("*").order("created_at", { ascending: false }),
      supabase.from("transportes_empresas").select("id, nombre, rut").order("nombre"),
      supabase.from("transportes_tramos").select("id, origen, destino, valor, moneda, activo").eq("activo", true).order("origen"),
      supabase.from("navieras").select("id, nombre").order("nombre"),
      supabase.from("naves").select("id, nombre").order("nombre"),
      supabase.from("destinos").select("id, nombre").eq("activo", true).order("nombre"),
      supabase.from("plantas").select("id, nombre").eq("activo", true).order("nombre"),
      supabase.from("depositos").select("id, nombre").eq("activo", true).order("nombre"),
    ]);

    setReservas((reservasRes.data ?? []) as ReservaExt[]);
    setEmpresasTransporte((empresasRes.data ?? []) as TransporteEmpresa[]);
    setTramos((tramosRes.data ?? []) as Tramo[]);
    setNavieras((navierasRes.data ?? []) as SelectOption[]);
    setNaves((navesRes.data ?? []) as SelectOption[]);
    setDestinos((destinosRes.data ?? []) as SelectOption[]);
    setPlantas((plantasRes.data ?? []) as SelectOption[]);
    setDepositos((depositosRes.data ?? []) as SelectOption[]);
    setLoading(false);
  }, [supabase, authLoading]);

  useEffect(() => {
    if (!authLoading) void fetchData();
  }, [authLoading, fetchData]);

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

  useEffect(() => {
    setPodInput(formData.pod ?? "");
  }, [formData.pod]);

  // Al seleccionar/deseleccionar una reserva, resetear estado del instructivo y cargar el existente
  useEffect(() => {
    setInstrFilename("");
    setInstrSavedUrl(null);
    setInstrSaveError(null);

    if (!selectedId || !supabase) return;
    const operacionId = reservas.find((r) => r.id === selectedId)?.operacion_id ?? null;
    void (async () => {
      // Intento 1: el instructivo registrado contra la operación vinculada
      if (operacionId) {
        const { data } = await supabase
          .from("documentos")
          .select("nombre_archivo, url")
          .eq("operacion_id", operacionId)
          .eq("tipo", "INSTRUCTIVO_EMBARQUE")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data) {
          setInstrSavedUrl(data.url);
          setInstrFilename(data.nombre_archivo);
          return;
        }
      }
      // Intento 2: buscar directamente en storage bajo el id de la reserva ext
      // (reservas sin operación vinculada guardan el archivo aquí)
      const { data: storageFiles } = await supabase.storage
        .from("documentos")
        .list(`${selectedId}/INSTRUCTIVO_EMBARQUE`);
      if (storageFiles && storageFiles.length > 0) {
        const latest = storageFiles[storageFiles.length - 1];
        const { data: urlData } = supabase.storage
          .from("documentos")
          .getPublicUrl(`${selectedId}/INSTRUCTIVO_EMBARQUE/${latest.name}`);
        setInstrSavedUrl(urlData.publicUrl);
        setInstrFilename(latest.name);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, supabase]);

  const filteredReservas = useMemo(() => {
    let list = reservas;
    if (estadoFiltro) list = list.filter((r) => (r.estado || "pendiente") === estadoFiltro);
    if (transporteFiltro) list = list.filter((r) => (r.transporte ?? "") === transporteFiltro);
    if (!searchTerm.trim()) return list;
    const s = searchTerm.toLowerCase();
    return list.filter(
      (r) =>
        (r.cliente ?? "").toLowerCase().includes(s) ||
        (r.booking ?? "").toLowerCase().includes(s) ||
        (r.naviera ?? "").toLowerCase().includes(s) ||
        (r.nave ?? "").toLowerCase().includes(s) ||
        (r.pod ?? "").toLowerCase().includes(s) ||
        (r.contenedor ?? "").toLowerCase().includes(s) ||
        (r.transporte ?? "").toLowerCase().includes(s) ||
        (r.chofer ?? "").toLowerCase().includes(s)
    );
  }, [reservas, searchTerm, estadoFiltro, transporteFiltro]);

  const empresasEnUso = useMemo(
    () => Array.from(new Set(reservas.map((r) => r.transporte).filter((x): x is string => !!x))).sort(),
    [reservas],
  );

  const resumenEstados = useMemo(() => {
    const cuenta = (e: string) => reservas.filter((r) => (r.estado || "pendiente") === e).length;
    const total = reservas.length;
    const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
    return {
      total,
      pendiente: cuenta("pendiente"),
      enCurso: cuenta("en_curso"),
      completada: cuenta("completada"),
      pct,
    };
  }, [reservas]);

  const cambios = useMemo(() => contarCambios(formData, formBase), [formData, formBase]);

  /* La fila provisoria de una reserva nueva va primero mientras se edita. */
  const visiblesIds = useMemo(
    () => [...(isNew ? [NUEVA_ID] : []), ...filteredReservas.map((r) => r.id)],
    [isNew, filteredReservas],
  );
  const { fila, cerrar: cerrarFicha, confirmarDescarte, setConfirmarDescarte, descartarYCerrar } = useFilaConCambios({
    visibles: visiblesIds,
    habilitado: !loading,
    pendientes: cambios.length,
    bloqueoEscape: !!(confirmNewItem || confirmDelete || confirmReplaceInstr),
  });

  /* Replegada la ficha, el formulario vuelve a cero. */
  useEffect(() => {
    if (fila.abiertaId) return;
    setSelectedId(null);
    setIsNew(false);
    setFormData(initialFormData);
    setFormBase(initialFormData);
    setOpVinculada(null);
    setBookingDocUrl(null);
    setError(null);
  }, [fila.abiertaId]);

  const handleSelectReserva = (r: ReservaExt) => {
    setSelectedId(r.id);
    setIsNew(false);
    setFormData(reservaToForm(r));
    setFormBase(reservaToForm(r));
    setEmpresaTransporteInput(r.transporte ?? "");
    setChoferInput(r.chofer ?? "");
    setEquipoInput(r.patente_camion ?? "");
    setError(null);
    setBookingDocUrl(null);
    setOpVinculada(null);
    // Instructivo — se resetea via useEffect en selectedId
    // Datos del embarque y PDF del booking: se leen de la operación vinculada,
    // no del texto del booking, para no confundir dos embarques homónimos.
    if (r.operacion_id && supabase) {
      void supabase
        .from("operaciones")
        .select(OPERACION_VINCULADA_COLS)
        .eq("id", r.operacion_id)
        .maybeSingle()
        .then(({ data }) => {
          const op = data as OperacionVinculada | null;
          if (!op) return;
          setOpVinculada(op);
          setBookingDocUrl(op.booking_doc_url);
          // La operación es la fuente de verdad: si allí corrigieron nave, POD
          // o ETD, la reserva se actualiza al abrirla.
          // Se aplica también a la base: no es un cambio del usuario.
          const desdeOp = (prev: FormData): FormData => ({
            ...prev,
            cliente: op.cliente ?? "",
            booking: op.booking ?? "",
            naviera: op.naviera ?? "",
            nave: op.nave ?? "",
            pod: op.pod ?? "",
            etd: op.etd ?? "",
            planta_presentacion: op.planta_presentacion ?? prev.planta_presentacion,
          });
          setFormData(desdeOp);
          setFormBase(desdeOp);
        });
    }

    const emp = empresasTransporte.find(
      (e) => e.nombre.toLowerCase() === (r.transporte ?? "").toLowerCase()
    );
    if (emp) {
      setEmpresaTransporteId(emp.id);
      if (supabase) {
        void Promise.all([
          supabase
            .from("transportes_choferes")
            .select("id, empresa_id, nombre, numero_chofer, rut, telefono, activo")
            .eq("empresa_id", emp.id)
            .eq("activo", true)
            .order("nombre"),
          supabase
            .from("transportes_equipos")
            .select("id, empresa_id, patente_camion, patente_remolque, activo")
            .eq("empresa_id", emp.id)
            .eq("activo", true)
            .order("patente_camion"),
        ]).then(([cRes, eRes]) => {
          setChoferes((cRes.data ?? []) as Chofer[]);
          setEquipos((eRes.data ?? []) as Equipo[]);
        });
      }
    } else {
      setEmpresaTransporteId("");
      setChoferes([]);
      setEquipos([]);
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
    const r = reservas.find((x) => x.id === id);
    if (!r) return;
    handleSelectReserva(r);
    fila.toggle(id);
  };

  const handleNewReserva = () => {
    if (fila.abiertaId) return;
    setSelectedId(null);
    setIsNew(true);
    setFormData(initialFormData);
    setFormBase(initialFormData);
    setBookingDocUrl(null);
    setOpVinculada(null);
    setEmpresaTransporteId("");
    setEmpresaTransporteInput("");
    setChoferInput("");
    setEquipoInput("");
    setChoferes([]);
    setEquipos([]);
    setError(null);
    setPodInput("");
    setInstrFilename("");
    setInstrSavedUrl(null);
    setInstrSaveError(null);
    setConfirmReplaceInstr(false);
    if (instrFileInputRef.current) instrFileInputRef.current.value = "";
    // Sin filtros, para que la fila nueva no quede escondida.
    setEstadoFiltro("");
    setTransporteFiltro("");
    setSearchTerm("");
    fila.abrir(NUEVA_ID);
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleAddDestino = async (text: string) => {
    if (!text.trim()) return;
    setAddingDestino(true);
    setError(null);
    try {
      const data = await saveDestinoToCatalog({ nombre: text.trim().toUpperCase() });
      const nuevo = { id: data.id, nombre: data.nombre };
      setDestinos((prev) => [...prev, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setFormData((prev) => ({ ...prev, pod: data.nombre }));
      setPodInput(data.nombre);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al agregar el destino");
    }
    setAddingDestino(false);
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
    }));
    setError(null);
  };

  // --- Inline creation ---
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
      setError(tr.errorCreateEmpresa + error.message);
      return;
    }
    const ne = data as TransporteEmpresa;
    setEmpresasTransporte((prev) =>
      [...prev, ne].sort((a, b) => a.nombre.localeCompare(b.nombre))
    );
    setEmpresaTransporteId(ne.id);
    setEmpresaTransporteInput(ne.nombre);
    setFormData((prev) => ({ ...prev, transporte: ne.nombre }));
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
        activo: true,
      })
      .select("id, empresa_id, nombre, numero_chofer, rut, telefono, activo")
      .single();
    setSaving(false);
    if (error) {
      setError(tr.errorCreateChofer + error.message);
      return;
    }
    const nc = data as Chofer;
    setChoferes((prev) => [...prev, nc].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    setFormData((prev) => ({ ...prev, chofer: nc.nombre }));
    setChoferInput(nc.nombre);
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
        activo: true,
      })
      .select("id, empresa_id, patente_camion, patente_remolque, activo")
      .single();
    setSaving(false);
    if (error) {
      setError(tr.errorCreateEquipo + error.message);
      return;
    }
    const ne = data as Equipo;
    setEquipos((prev) =>
      [...prev, ne].sort((a, b) => a.patente_camion.localeCompare(b.patente_camion))
    );
    setFormData((prev) => ({ ...prev, patente_camion: ne.patente_camion }));
    setEquipoInput(ne.patente_camion);
  };

  const handleEmpresaInputChange = (value: string) => {
    setEmpresaTransporteInput(value);
    const existing = empresasTransporte.find(
      (e) => e.nombre.toLowerCase() === value.toLowerCase()
    );
    if (existing) {
      setEmpresaTransporteId(existing.id);
      void handleEmpresaTransporteChange(existing.id);
    } else {
      setEmpresaTransporteId("");
      setChoferes([]);
      setEquipos([]);
      setFormData((prev) => ({
        ...prev,
        transporte: value,
        chofer: "",
        rut_chofer: "",
        telefono_chofer: "",
        patente_camion: "",
        patente_remolque: "",
      }));
      setChoferInput("");
      setEquipoInput("");
    }
  };

  const handleEmpresaInputBlur = () => {
    const value = empresaTransporteInput.trim();
    if (!value || empresaTransporteId) return;
    const existing = empresasTransporte.find(
      (e) => e.nombre.toLowerCase() === value.toLowerCase()
    );
    if (!existing) {
      setConfirmNewItem({
        type: "empresa",
        value,
        callback: async () => await createNewEmpresa(value),
      });
    }
  };

  const handleChoferInputChange = (value: string) => {
    setChoferInput(value);
    const existing = choferes.find((c) => c.nombre.toLowerCase() === value.toLowerCase());
    if (existing) {
      setFormData((prev) => ({
        ...prev,
        chofer: existing.nombre,
        rut_chofer: existing.rut || "",
        telefono_chofer: existing.telefono || "",
      }));
    } else {
      setFormData((prev) => ({ ...prev, chofer: value, rut_chofer: "", telefono_chofer: "" }));
    }
  };

  const handleChoferInputBlur = () => {
    const value = choferInput.trim();
    if (!value || !empresaTransporteId) return;
    const existing = choferes.find((c) => c.nombre.toLowerCase() === value.toLowerCase());
    if (!existing) {
      setConfirmNewItem({
        type: "chofer",
        value,
        callback: async () => await createNewChofer(value),
      });
    }
  };

  const handleEquipoInputChange = (value: string) => {
    setEquipoInput(value);
    const existing = equipos.find(
      (e) => e.patente_camion.toLowerCase() === value.toLowerCase()
    );
    if (existing) {
      setFormData((prev) => ({
        ...prev,
        patente_camion: existing.patente_camion,
        patente_remolque: existing.patente_remolque || "",
      }));
    } else {
      setFormData((prev) => ({ ...prev, patente_camion: value, patente_remolque: "" }));
    }
  };

  const handleEquipoInputBlur = () => {
    const value = equipoInput.trim();
    if (!value || !empresaTransporteId) return;
    const existing = equipos.find(
      (e) => e.patente_camion.toLowerCase() === value.toLowerCase()
    );
    if (!existing) {
      setConfirmNewItem({
        type: "equipo",
        value,
        callback: async () => await createNewEquipo(value),
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

  // --- Submit ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    setSaving(true);
    setError(null);

    const payload: Record<string, unknown> = {
      cliente: formData.cliente || null,
      booking: formData.booking || null,
      naviera: formData.naviera || null,
      nave: formData.nave || null,
      pod: formData.pod || null,
      etd: formData.etd || null,
      planta_presentacion: formData.planta_presentacion || null,
      estado: formData.estado || "pendiente",
      transporte: formData.transporte || null,
      chofer: formData.chofer || null,
      rut_chofer: formData.rut_chofer || null,
      telefono_chofer: formData.telefono_chofer || null,
      patente_camion: formData.patente_camion || null,
      patente_remolque: formData.patente_remolque || null,
      contenedor: normalizarContenedor(formData.contenedor) || null,
      sello: formData.sello || null,
      tara: formData.tara ? parseFloat(formData.tara) : null,
      deposito: formData.deposito || null,
      citacion: formData.citacion || null,
      llegada_planta: formData.llegada_planta || null,
      salida_planta: formData.salida_planta || null,
      agendamiento_retiro: formData.agendamiento_retiro || null,
      inicio_stacking: formData.inicio_stacking || null,
      fin_stacking: formData.fin_stacking || null,
      ingreso_stacking: formData.ingreso_stacking || null,
      tramo: formData.tramo || null,
      valor_tramo: formData.valor_tramo ? parseFloat(formData.valor_tramo) : null,
      porteo: formData.porteo || null,
      valor_porteo: formData.valor_porteo ? parseFloat(formData.valor_porteo) : null,
      falso_flete: formData.falso_flete || null,
      valor_falso_flete: formData.valor_falso_flete
        ? parseFloat(formData.valor_falso_flete)
        : null,
      factura_transporte: formData.factura_transporte || null,
      observaciones: formData.observaciones || null,
    };

    if (isNew) {
      const { data, error: err } = await supabase
        .from("transportes_reservas_ext")
        .insert(payload)
        .select("*")
        .single();
      setSaving(false);
      if (err) {
        setError(err.message);
        return;
      }
      const created = data as ReservaExt;
      const guardado = reservaToForm(created);
      setReservas((prev) => [created, ...prev]);
      setSelectedId(created.id);
      setIsNew(false);
      setFormData(guardado);
      setFormBase(guardado);
      // La fila provisoria pasa a ser la fila real, que queda abierta.
      fila.abrir(created.id);
      sileo.success({ title: tr.createdSuccess });
      void sincronizarCatalogo(formData);
    } else if (selectedId) {
      const { error: err } = await supabase
        .from("transportes_reservas_ext")
        .update(payload)
        .eq("id", selectedId);
      setSaving(false);
      if (err) {
        setError(err.message);
        return;
      }
      setReservas((prev) =>
        prev.map((r) =>
          r.id === selectedId ? { ...r, ...(payload as Partial<ReservaExt>) } : r
        )
      );
      const guardado = { ...formData, contenedor: normalizarContenedor(formData.contenedor) };
      setFormData(guardado);
      setFormBase(guardado);
      sileo.success({ title: tr.updatedSuccess });
      void sincronizarCatalogo(formData);
    }
  };

  const handleDelete = async (id: string) => {
    if (!supabase) return;
    const { error: err } = await supabase
      .from("transportes_reservas_ext")
      .delete()
      .eq("id", id);
    if (err) {
      setError(err.message);
      return;
    }
    // Si era la abierta, sale de la lista y la ficha se repliega sola.
    setReservas((prev) => prev.filter((r) => r.id !== id));
    setConfirmDelete(null);
  };

  // ── Subir instructivo ────────────────────────────────────────────────────
  const handleSubirInstructivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedId || !supabase) return;
    setInstrUploading(true);
    setInstrSaveError(null);
    try {
      const storagePath = `${selectedId}/INSTRUCTIVO_EMBARQUE/${file.name}`;
      const { error: upErr } = await supabase.storage.from("documentos").upload(storagePath, file, { upsert: true });
      if (upErr) throw new Error(`Error al subir: ${upErr.message}`);
      const { data: urlData } = supabase.storage.from("documentos").getPublicUrl(storagePath);
      {
        const operacionId = opVinculada?.id ?? null;
        if (operacionId) {
          await supabase.from("documentos").delete().eq("operacion_id", operacionId).eq("tipo", "INSTRUCTIVO_EMBARQUE");
          await supabase.from("documentos").insert({
            operacion_id: operacionId,
            tipo: "INSTRUCTIVO_EMBARQUE",
            nombre_archivo: file.name,
            url: urlData.publicUrl,
            tamano: file.size,
            mime_type: file.type || "application/octet-stream",
          });
        }
      }
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


  /* Descartar: la ficha vuelve a lo que tenía al abrirse, incluidos los
     combobox y las listas de choferes y camiones de la empresa original. */
  const descartarCambios = () => {
    const r = selectedId ? reservas.find((x) => x.id === selectedId) : null;
    if (r) {
      handleSelectReserva(r);
      return;
    }
    setFormData(formBase);
    setEmpresaTransporteId("");
    setEmpresaTransporteInput("");
    setChoferInput("");
    setEquipoInput("");
    setChoferes([]);
    setEquipos([]);
    setPodInput("");
    setError(null);
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

  const renderSelect = (label: string, field: keyof FormData, opciones: SelectOption[], vacio: string) => (
    <div>
      <label className={CAMPO_LABEL}>{label}</label>
      <select value={formData[field]} onChange={(e) => handleChange(field, e.target.value)} className={CAMPO_INPUT}>
        <option value="">{vacio}</option>
        {opciones.map((o) => (
          <option key={o.id} value={o.nombre}>
            {o.nombre}
          </option>
        ))}
      </select>
    </div>
  );

  const renderDato = (label: string, valor: string | null | undefined) => (
    <div className="min-w-0">
      <p className={CAMPO_LABEL}>{label}</p>
      <p className="truncate text-[13.5px] font-semibold text-dash-fg">{valor || "—"}</p>
    </div>
  );

  if (loading) return <CargandoTransporte theme={theme} label={tr.loading} />;

  const labelEstado = (e: string | null | undefined) =>
    e === "en_curso" ? tr.statusEnCurso : e === "completada" ? tr.statusCompletada : tr.statusPendiente;

  const indicadores: Indicador[] = [
    { clave: "", label: tf.extKpiTotal, valor: resumenEstados.total, pct: null, tono: "estado--curso", icon: "lucide:files" },
    ...ESTADOS_EXT.map((e) => {
      const valor =
        e.valor === "pendiente" ? resumenEstados.pendiente : e.valor === "en_curso" ? resumenEstados.enCurso : resumenEstados.completada;
      return { clave: e.valor, label: labelEstado(e.valor), valor, pct: resumenEstados.pct(valor), tono: e.tono, icon: e.icon };
    }),
  ];

  const hayFiltros = !!(searchTerm || estadoFiltro || transporteFiltro);
  const limpiarFiltros = () => {
    setSearchTerm("");
    setEstadoFiltro("");
    setTransporteFiltro("");
  };

  const COLS = 10;
  const refVinculada = opVinculada ? displayRefAsli(opVinculada.ref_asli, opVinculada.correlativo, "") : "";

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

  const renderFicha = () => (
    <FichaTransporte
      cerrando={fila.cerrando}
      onCerrar={cerrarFicha}
      onSubmit={handleSubmit}
      labels={{ volver: tm.detalleVolverLista, replegar: tm.detalleReplegar }}
      eyebrow={refVinculada ? `${tf.extEyebrow} · ${refVinculada}` : tf.extEyebrow}
      titulo={isNew ? tf.extNueva : formData.cliente || tr.noClient}
      estado={<ChipEstado tono={tonoEstadoExt(formData.estado).tono} label={labelEstado(formData.estado)} />}
      subtitulo={[formData.booking, formData.naviera].filter(Boolean).join("  ·  ") || (isNew ? tr.formDescNew : "—")}
      resumen={[
        { label: tr.bookingLabel, valor: formData.booking || null, icono: "lucide:bookmark", mono: true },
        { label: tr.container, valor: normalizarContenedor(formData.contenedor) || null, icono: "lucide:container", mono: true },
        { label: tr.naveLabel, valor: formData.nave || null, icono: "lucide:ship" },
        { label: tf.colDestino, valor: formData.pod || null, icono: "lucide:map-pin" },
        { label: tr.etdLabel, valor: formData.etd ? formatDate(formData.etd) : null, icono: "lucide:calendar" },
        { label: tf.colTransporte, valor: formData.transporte || null, icono: "lucide:truck" },
      ]}
      acciones={
        <>
          {opVinculada && (
            <a href={`${withBase("/documentos/mis-documentos")}?op=${encodeURIComponent(opVinculada.id)}`} className={BTN_HERO}>
              <Icon icon="lucide:folder-open" width={13} height={13} aria-hidden />
              {tf.irDocumentos}
            </a>
          )}
          {bookingDocUrl && (
            <a href={bookingDocUrl} target="_blank" rel="noopener noreferrer" className={BTN_HERO}>
              <Icon icon="lucide:paperclip" width={13} height={13} aria-hidden />
              {tf.verBooking}
            </a>
          )}
        </>
      }
      lateral={
        <>
          <SeccionFicha icono="lucide:flag" titulo={tr.statusLabel}>
            <div className="col-span-full">
              <Segmentos
                valor={formData.estado}
                opciones={ESTADOS_EXT.map((e) => ({ valor: e.valor, label: labelEstado(e.valor) }))}
                onCambio={(v) => handleChange("estado", v)}
              />
            </div>
          </SeccionFicha>
          {!isNew && (
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
          )}
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
          onDescartar={descartarCambios}
          izquierda={
            !isNew && selectedId ? <BotonEliminarPie label={tr.deleteBtn} onClick={() => setConfirmDelete(selectedId)} /> : undefined
          }
          labels={{
            cambio: tm.detalleCambioSinGuardar,
            cambios: tm.detalleCambiosSinGuardar,
            sinCambios: tf.sinCambios,
            descartar: tm.detalleDescartar,
            guardar: tm.detalleGuardarCambios,
            guardando: tr.saving,
          }}
          labelGuardar={isNew ? tr.createReserva : undefined}
          siempreGuardable={isNew}
        />
      }
    >


      <SeccionFicha
        icono="lucide:ship"
        titulo={tf.datosEmbarque}
        extra={opVinculada ? <ChipEstado tono="estado--curso" label={refVinculada || tf.operacionVinculada} icono="lucide:link" /> : undefined}
      >
        {opVinculada ? (
          <>
            <p className="text-[12px] leading-relaxed text-dash-muted col-span-full">{tf.datosEmbarqueHint}</p>
            {renderDato(tr.clientLabel, opVinculada.cliente)}
            {renderDato(tr.navieraLabel, opVinculada.naviera)}
            {renderSelect(tr.warehouse, "deposito", depositos, tr.selectDeposito)}
          </>
        ) : (
          <>
            {renderInput(tr.clientLabel, "cliente", "text", tr.clientPlaceholder)}
            {renderInput(tr.bookingLabel, "booking", "text", tr.bookingPlaceholder)}
            {renderSelect(tr.navieraLabel, "naviera", navieras, tr.selectNaviera)}
            {renderSelect(tr.naveLabel, "nave", naves, tr.selectNave)}
            <ComboboxInput
              id="pod"
              label={tr.podLabel}
              labelClass={CAMPO_LABEL}
              inputClass={CAMPO_INPUT}
              neon
              value={podInput}
              options={destinos}
              onSelect={(opt) => {
                setPodInput(opt.nombre);
                handleChange("pod", opt.nombre);
              }}
              onChange={(val) => {
                setPodInput(val);
                handleChange("pod", "");
              }}
              onAddNew={handleAddDestino}
              addNewLabel={(text) => `${tr.addNewDestino} "${text}"`}
              addingNew={addingDestino}
              placeholder={tr.searchDestino}
              disabled={loading}
            />
            {renderInput(tr.etdLabel, "etd", "date")}
            {renderSelect(tr.warehouse, "deposito", depositos, tr.selectDeposito)}
          </>
        )}
      </SeccionFicha>

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
                    placeholder={tr.placeholderEmpresa}
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
                    placeholder={tr.placeholderChofer}
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
                    placeholder={tr.placeholderPatente}
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
            </>,
          ),
          paso(
            "citacion",
            "lucide:factory",
            tf.pasoCitacion,
            [
              campo(tr.plantaCitacionLabel, "planta_presentacion"),
              campo(tr.citation, "citacion", fechaCorta),
              campo(tr.plantArrival, "llegada_planta", fechaCorta),
              campo(tr.plantDeparture, "salida_planta", fechaCorta),
            ],
            <>
                <div className="col-span-full">
                  <CampoPlanta
                    label={tr.plantaCitacionLabel}
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
            [
              campo(tr.section, "tramo"),
              campo(tr.sectionValue, "valor_tramo"),
              campo(tr.transportInvoice, "factura_transporte"),
              campo(tr.portage, "porteo"),
              // El valor solo se pide si hubo porteo o falso flete.
              ...(formData.porteo === "SÍ" ? [campo(tr.portageValue, "valor_porteo")] : []),
              campo(tr.deadFreight, "falso_flete"),
              ...(formData.falso_flete === "SÍ" ? [campo(tr.deadFreightValue, "valor_falso_flete")] : []),
            ],
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
                        {x.origen} — {x.destino} · {x.moneda ?? ""}
                      </option>
                    ))}
                  </select>
                </div>
                {renderInput(tr.sectionValue, "valor_tramo", "number")}
                {renderInput(tr.transportInvoice, "factura_transporte")}
                <div>
                  <label className={CAMPO_LABEL}>{tr.portage}</label>
                  <Segmentos
                    valor={formData.porteo}
                    opciones={[
                      { valor: "SÍ", label: tf.si },
                      { valor: "NO", label: tf.no },
                    ]}
                    onCambio={(v) => handleChange("porteo", v)}
                  />
                </div>
                {formData.porteo === "SÍ" ? renderInput(tr.portageValue, "valor_porteo", "number") : null}
                <div>
                  <label className={CAMPO_LABEL}>{tr.deadFreight}</label>
                  <Segmentos
                    valor={formData.falso_flete}
                    opciones={[
                      { valor: "SÍ", label: tf.si },
                      { valor: "NO", label: tf.no },
                    ]}
                    onCambio={(v) => handleChange("falso_flete", v)}
                  />
                </div>
                {formData.falso_flete === "SÍ" && renderInput(tr.deadFreightValue, "valor_falso_flete", "number")}
            </>,
          ),
        ]}
      />

    </FichaTransporte>
  );

  const filaFicha = (
    <tr className="bg-[color-mix(in_srgb,var(--estado-curso)_6%,transparent)]">
      <td colSpan={COLS} className="p-0">
        {renderFicha()}
      </td>
    </tr>
  );

  return (
    <PaginaTransporte theme={theme}>
      {/* La cabecera se repliega con una ficha abierta, como en Mis Reservas. */}
      <div className="rd-colapsable relative z-10 shrink-0" data-colapsado={fila.cabeceraOculta} inert={fila.cabeceraOculta || undefined}>
        <div>
          <CabeceraTransporte
            titulo={tr.title}
            subtitulo={tf.extSubtitulo}
            icono="lucide:truck"
            volverLabel={tf.volver}
            visibles={filteredReservas.length}
            total={reservas.length}
            indicadores={indicadores}
            activo={estadoFiltro}
            onIndicador={setEstadoFiltro}
            acciones={
              <button type="button" onClick={handleNewReserva} className="dash-cta inline-flex items-center gap-1.5 px-3 py-2 text-sm">
                <Icon icon="lucide:plus" width={13} height={13} />
                <span className="hidden sm:inline">{tr.newReserva}</span>
                <span className="sm:hidden">{tr.newReservaMobile}</span>
              </button>
            }
          />
          <BarraFiltrosTransporte
            busqueda={searchTerm}
            onBusqueda={setSearchTerm}
            placeholder={tr.searchPlaceholder}
            onRefrescar={() => void fetchData()}
            refrescarLabel={tr.refresh}
          >
            <FiltroSelect
              valor={estadoFiltro}
              onCambio={setEstadoFiltro}
              etiqueta={tf.colEstado}
              todos={tf.todosEstados}
              opciones={ESTADOS_EXT.map((e) => ({ valor: e.valor, label: labelEstado(e.valor) }))}
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
          filteredReservas.length > 0 ? (
            <span className="text-xs font-medium tabular-nums text-dash-muted">
              {filteredReservas.length} {filteredReservas.length === 1 ? tf.registro : tf.registros}
              {filteredReservas.length !== reservas.length && ` ${tf.de} ${reservas.length}`}
            </span>
          ) : undefined
        }
      >
        <thead>
          <tr>
            <th className={TH}>{tf.colCliente}</th>
            <th className={TH}>{tf.colBooking}</th>
            <th className={TH}>{tf.colContenedor}</th>
            <th className={TH}>{tf.colNave}</th>
            <th className={TH}>{tf.colDestino}</th>
            <th className={TH}>{tf.colEtd}</th>
            <th className={TH}>{tf.colTransporte}</th>
            <th className={TH}>{tf.colUnidad}</th>
            <th className={TH}>{tf.colEstado}</th>
            <th className={`${TH} w-12`} aria-label={tr.deleteBtn} />
          </tr>
        </thead>
        <tbody>
          {isNew && (
            <>
              <tr {...propsFilaDesplegable(NUEVA_ID, true, () => cerrarFicha())} className={claseFila(true, 0)}>
                <td colSpan={COLS} className={`${TD} relative`}>
                  <span className="estado--curso estado-barra absolute inset-y-0 left-0 w-[3px]" aria-hidden />
                  <span className="inline-flex items-center gap-2">
                    <ChevronFila abierta />
                    <span className="font-bold text-dash-fg">{tf.extNueva}</span>
                    <ChipEstado tono="estado--curso" label={tf.extNuevaSinGuardar} icono="lucide:pencil" />
                  </span>
                </td>
              </tr>
              {fila.abiertaId === NUEVA_ID && filaFicha}
            </>
          )}
          {filteredReservas.length === 0 && !isNew ? (
            <FilaVacia
              colSpan={COLS}
              icono="lucide:inbox"
              texto={reservas.length === 0 ? tr.noReservas : tf.sinResultados}
              accion={
                hayFiltros ? (
                  <button type="button" onClick={limpiarFiltros} className="mt-1 text-xs font-medium text-dash-fg hover:underline">
                    {tf.limpiarFiltros}
                  </button>
                ) : undefined
              }
            />
          ) : (
            filteredReservas.map((r, idx) => {
              const abierta = fila.abiertaId === r.id;
              const est = tonoEstadoExt(r.estado);
              return (
                <Fragment key={r.id}>
                  <tr {...propsFilaDesplegable(r.id, abierta, alternarFila)} className={claseFila(abierta, idx)}>
                    <td className={`${TD} relative`}>
                      <span className={`${est.tono} estado-barra absolute inset-y-0 left-0 w-[3px]`} aria-hidden />
                      <span className="inline-flex max-w-[16rem] items-center gap-1.5">
                        <ChevronFila abierta={abierta} />
                        <span className="truncate font-bold text-dash-fg">{r.cliente || tr.noClient}</span>
                      </span>
                    </td>
                    <td className={`${TD} whitespace-nowrap font-mono text-[12.5px] text-dash-fg`}>{r.booking || "—"}</td>
                    <td className={`${TD} whitespace-nowrap font-mono text-[12.5px] text-dash-fg`}>{r.contenedor || "—"}</td>
                    <td className={TD}>
                      <p className="max-w-[12rem] truncate font-semibold text-dash-fg">{r.naviera || "—"}</p>
                      <p className="max-w-[12rem] truncate text-[12px] text-dash-muted">{r.nave || "—"}</p>
                    </td>
                    <td className={`${TD} whitespace-nowrap text-dash-fg`}>{r.pod || "—"}</td>
                    <td className={`${TD} whitespace-nowrap tabular-nums text-dash-fg`}>{formatDate(r.etd)}</td>
                    <td className={`${TD} max-w-[12rem] truncate text-dash-fg`}>{r.transporte || "—"}</td>
                    <td className={TD}>
                      <p className="max-w-[12rem] truncate text-dash-fg">{r.chofer || "—"}</p>
                      <p className="font-mono text-[12px] text-dash-muted">{r.patente_camion || ""}</p>
                    </td>
                    <td className={TD}>
                      <ChipEstado tono={est.tono} label={labelEstado(r.estado)} />
                    </td>
                    <td data-row-action className={`${TD} text-center`}>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(r.id)}
                        className="rounded-lg p-1.5 text-dash-muted transition-colors hover:bg-[color-mix(in_srgb,var(--estado-error)_14%,transparent)] hover:text-[var(--estado-error)]"
                        title={tr.deleteBtn}
                        aria-label={tr.deleteBtn}
                      >
                        <Icon icon="lucide:trash-2" width={14} height={14} />
                      </button>
                    </td>
                  </tr>
                  {abierta && filaFicha}
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

      {confirmDelete &&
        createPortal(
          <ConfirmDialog
            variant="danger"
            title={tf.extEliminarTitulo}
            message={tf.extEliminarMensaje}
            confirmLabel={tr.deleteBtn}
            cancelLabel={tf.cancelar}
            onConfirm={() => void handleDelete(confirmDelete)}
            onCancel={() => setConfirmDelete(null)}
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
