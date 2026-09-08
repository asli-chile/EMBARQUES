import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { Combobox } from "@/components/ui/Combobox";
import { ComboboxInput } from "@/components/ui/ComboboxInput";
import { saveDestinoToCatalog } from "@/lib/destinos-service";
import { useNeonTheme } from "@/lib/ui/neonTheme";
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

  const [reservas, setReservas] = useState<ReservaExt[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
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
  const [confirmNewItem, setConfirmNewItem] = useState<{
    type: "empresa" | "chofer" | "equipo";
    value: string;
    callback: () => Promise<void>;
  } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [mobilePanel, setMobilePanel] = useState<"list" | "form">("list");

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
    if (!searchTerm.trim()) return reservas;
    const s = searchTerm.toLowerCase();
    return reservas.filter(
      (r) =>
        (r.cliente ?? "").toLowerCase().includes(s) ||
        (r.booking ?? "").toLowerCase().includes(s) ||
        (r.naviera ?? "").toLowerCase().includes(s) ||
        (r.contenedor ?? "").toLowerCase().includes(s) ||
        (r.transporte ?? "").toLowerCase().includes(s)
    );
  }, [reservas, searchTerm]);

  const handleSelectReserva = (r: ReservaExt) => {
    setSelectedId(r.id);
    setIsNew(false);
    setFormData(reservaToForm(r));
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
          setFormData((prev) => ({
            ...prev,
            cliente: op.cliente ?? "",
            booking: op.booking ?? "",
            naviera: op.naviera ?? "",
            nave: op.nave ?? "",
            pod: op.pod ?? "",
            etd: op.etd ?? "",
            planta_presentacion: op.planta_presentacion ?? prev.planta_presentacion,
          }));
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

    setMobilePanel("form");
  };

  const handleNewReserva = () => {
    setSelectedId(null);
    setIsNew(true);
    setFormData(initialFormData);
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
    setMobilePanel("form");
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
      .insert({ empresa_id: empresaTransporteId, nombre: nombre.trim(), activo: true })
      .select("id, empresa_id, nombre, numero_chofer, rut, telefono, activo")
      .single();
    setSaving(false);
    if (error) {
      setError(tr.errorCreateChofer + error.message);
      return;
    }
    const nc = data as Chofer;
    setChoferes((prev) => [...prev, nc].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    setFormData((prev) => ({ ...prev, chofer: nc.nombre, rut_chofer: "", telefono_chofer: "" }));
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
      contenedor: formData.contenedor || null,
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
      setReservas((prev) => [created, ...prev]);
      setSelectedId(created.id);
      setIsNew(false);
      sileo.success({ title: tr.createdSuccess });
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
      sileo.success({ title: tr.updatedSuccess });
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
    setReservas((prev) => prev.filter((r) => r.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
      setFormData(initialFormData);
      setIsNew(false);
      setMobilePanel("list");
    }
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
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), "dd/MM/yyyy");
    } catch {
      return dateStr;
    }
  };

  const inputClass =
    "dash-control w-full min-h-[2.6rem] px-3 py-2 text-base font-semibold text-dash-fg placeholder:text-dash-muted placeholder:font-medium focus:outline-none focus:ring-2 focus:ring-dash-neon/40 disabled:opacity-50 disabled:cursor-not-allowed";
  const labelClass = "mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-dash-muted";
  const sectionTitleClass = "text-base font-bold tracking-wide text-dash-fg";
  const cardClass = "dash-card overflow-hidden rounded-xl";
  const cardAccent = "h-[3px] bg-gradient-to-r from-dash-neon to-dash-neon-hot";
  const sectionIconWrap = "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-dash-border bg-dash-control";

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

  const showForm = isNew || selectedId;

  if (loading) {
    return (
      <div className="dash-neon flex min-h-0 flex-1 flex-col" data-theme={theme}>
        <main className="dash-page relative flex min-h-0 flex-1 items-center justify-center p-4" role="main">
          <div className="dash-card flex items-center gap-3 rounded-xl px-5 py-4 text-sm font-medium text-dash-muted">
            <Icon icon="typcn:refresh" className="h-4 w-4 animate-spin text-dash-neon" />
            <span>{tr.loading}</span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <>
    <div className="dash-neon flex min-h-0 flex-1 flex-col" data-theme={theme}>
      <main className="dash-page relative flex min-h-0 flex-1 flex-col overflow-y-auto" role="main">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -right-16 top-10 h-72 w-72 rounded-full bg-dash-neon/20 blur-3xl" />
          <div className="absolute bottom-20 left-1/4 h-64 w-64 rounded-full bg-dash-neon-hot/15 blur-3xl" />
        </div>

        <div className="dash-toolbar relative z-10 shrink-0">
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-dash-neon/40 bg-dash-neon/15 shadow-[0_0_24px_-8px_color-mix(in_srgb,var(--dash-neon)_55%,transparent)]">
                <Icon icon="lucide:truck" width={22} height={22} className="text-dash-neon" aria-hidden />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold tracking-tight text-dash-fg sm:text-xl">{tr.title}</h1>
                <p className="mt-0.5 line-clamp-1 text-xs text-dash-muted sm:text-sm">{tr.subtitle}</p>
              </div>
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              {reservas.length > 0 && (
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-dash-border bg-dash-control px-3 py-1.5">
                  <Icon icon="lucide:clipboard-list" width={13} height={13} className="text-dash-muted" />
                  <span className="text-sm font-bold text-dash-fg">{reservas.length} {tr.tabReservas.toLowerCase()}</span>
                </div>
              )}
              <button
                type="button"
                onClick={handleNewReserva}
                className="dash-cta inline-flex items-center gap-1.5 px-3 py-2 text-sm"
              >
                <Icon icon="lucide:plus" width={14} height={14} />
                <span className="hidden sm:inline">{tr.newReserva}</span>
                <span className="sm:hidden">{tr.newReservaMobile}</span>
              </button>
              <button
                type="button"
                onClick={() => void fetchData()}
                className="rounded-lg border border-dash-border bg-dash-control p-2 text-dash-muted transition-colors hover:bg-dash-neon/15 hover:text-dash-fg"
                title={tr.refresh}
              >
                <Icon icon="lucide:refresh-cw" width={16} height={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="relative z-10 mx-auto w-full max-w-[1600px] space-y-4 p-3 sm:p-4 lg:p-5">
        {/* Mobile tabs */}
        <div className="flex gap-1 rounded-xl border border-dash-border bg-dash-control p-1 lg:hidden">
          <button
            type="button"
            onClick={() => setMobilePanel("list")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-base font-bold transition-all ${
              mobilePanel === "list"
                ? "border border-dash-neon/40 bg-dash-neon/20 text-dash-fg shadow-sm"
                : "text-dash-muted hover:text-dash-fg"
            }`}
          >
            <Icon icon="lucide:list" width={14} height={14} />
            {tr.tabReservas}
          </button>
          <button
            type="button"
            onClick={() => setMobilePanel("form")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-base font-bold transition-all ${
              mobilePanel === "form"
                ? "border border-dash-neon/40 bg-dash-neon/20 text-dash-fg shadow-sm"
                : "text-dash-muted hover:text-dash-fg"
            }`}
          >
            <Icon icon="lucide:file-plus" width={14} height={14} />
            {tr.tabForm}
            {showForm && (
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
            )}
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-4 lg:flex-row">
            {/* Panel izquierdo: lista de reservas */}
            <div
              className={`w-full lg:w-80 lg:flex-shrink-0 ${
                mobilePanel === "form" ? "hidden lg:block" : ""
              }`}
            >
              <div className={`${cardClass} lg:sticky lg:top-0`}>
                <div className={cardAccent} />
                <div className="flex items-center justify-between gap-2 border-b border-dash-border px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={sectionIconWrap}>
                      <Icon icon="typcn:document" className="h-4 w-4 text-dash-neon" />
                    </span>
                    <h2 className={sectionTitleClass}>
                      {tr.listTitle}
                    </h2>
                  </div>
                  {reservas.filter((r) => r.estado !== "completada").length > 0 && (
                    <span className="flex shrink-0 items-center gap-1 rounded-full border border-amber-400/35 bg-amber-400/15 px-2.5 py-1 text-sm font-bold text-dash-fg">
                      <Icon icon="lucide:alert-circle" width={12} height={12} />
                      {reservas.filter((r) => r.estado !== "completada").length} {reservas.filter((r) => r.estado !== "completada").length !== 1 ? tr.activasPluralSuffix : tr.activasSuffix}
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <div className="mb-3">
                    <div className="relative">
                      <Icon
                        icon="typcn:zoom"
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dash-muted"
                      />
                      <input
                        type="text"
                        placeholder={tr.searchPlaceholder}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="dash-control w-full py-3 pl-9 pr-4 text-base text-dash-fg placeholder:text-dash-muted focus:outline-none focus:ring-2 focus:ring-dash-neon/40"
                      />
                    </div>
                  </div>

                  {filteredReservas.length === 0 ? (
                    <div className="py-8 text-center">
                      <span className="mx-auto mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-dash-border bg-dash-control">
                        <Icon icon="lucide:inbox" width={20} height={20} className="text-dash-muted" />
                      </span>
                      <p className="text-sm font-medium text-dash-muted">
                        {reservas.length === 0 ? tr.noReservas : tr.noResults}
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-[calc(100vh-320px)] space-y-2 overflow-y-auto">
                      {filteredReservas.map((r) => {
                        const isActive = selectedId === r.id;
                        const completo = r.estado === "completada";
                        const enCurso = r.estado === "en_curso";
                        return (
                          <div
                            key={r.id}
                            className={`group relative w-full cursor-pointer rounded-xl border p-3 text-left transition-all ${
                              isActive
                                ? "border-dash-neon/50 bg-dash-neon/15 ring-2 ring-dash-neon/25"
                                : completo
                                  ? "border-emerald-400/35 bg-emerald-400/10 hover:border-emerald-400/50 hover:bg-emerald-400/15"
                                  : enCurso
                                    ? "border-amber-400/35 bg-amber-400/10 hover:border-amber-400/50 hover:bg-amber-400/15"
                                    : "border-dash-border bg-dash-control/40 hover:border-dash-neon/35 hover:bg-dash-neon/10"
                            }`}
                            onClick={() => handleSelectReserva(r)}
                          >
                            <button
                              type="button"
                              onClick={(ev) => { ev.stopPropagation(); setConfirmDelete(r.id); }}
                              className="absolute right-2 top-2 rounded-lg p-1 text-dash-muted opacity-0 transition-all hover:bg-red-500/15 hover:text-red-400 group-hover:opacity-100"
                              title={tr.deleteBtn}
                            >
                              <Icon icon="typcn:trash" className="h-3.5 w-3.5" />
                            </button>
                            <div className="mb-0.5 flex items-start justify-between gap-2">
                              <p className={`truncate pr-6 text-sm font-bold ${isActive ? "text-dash-neon" : "text-dash-fg"}`}>
                                {r.cliente || tr.noClient}
                              </p>
                              <span className={`flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-bold ${
                                completo
                                  ? "border-emerald-400/35 bg-emerald-400/15 text-dash-fg"
                                  : enCurso
                                    ? "border-amber-400/35 bg-amber-400/15 text-dash-fg"
                                    : "border-dash-border bg-dash-control text-dash-muted"
                              }`}>
                                <Icon icon={completo ? "lucide:check-circle" : enCurso ? "lucide:loader" : "lucide:clock"} width={10} height={10} />
                                {completo ? tr.statusComplete : enCurso ? tr.statusInProgress : tr.statusPending}
                              </span>
                            </div>
                            <div className="flex min-w-0 items-center gap-1.5">
                              <p className="truncate text-xs text-dash-muted">{r.booking || tr.noBooking} · {r.contenedor || tr.noContainer}</p>
                              {isActive && bookingDocUrl && (
                                <a
                                  href={bookingDocUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(ev) => ev.stopPropagation()}
                                  title={tr.viewBookingPdf}
                                  className="shrink-0 rounded p-0.5 text-emerald-400 transition-colors hover:bg-emerald-500/15 hover:text-emerald-300"
                                >
                                  <Icon icon="lucide:paperclip" width={12} height={12} />
                                </a>
                              )}
                            </div>
                            <p className="mt-0.5 text-xs text-dash-muted/80">{r.naviera || r.transporte || "—"} · ETD: {formatDate(r.etd)}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Panel derecho: formulario */}
            <div
              className={`min-w-0 flex-1 ${
                mobilePanel === "list" ? "hidden lg:block" : ""
              }`}
            >
              {showForm ? (
                <div className="space-y-4">
                  <div className={cardClass}>
                    <div className={cardAccent} />
                    <div className="flex items-start justify-between gap-3 border-l-4 border-dash-neon bg-dash-neon/10 p-4">
                      <div className="min-w-0">
                        <p className={sectionTitleClass}>
                          {isNew ? tr.formHeadingNew : tr.formHeadingEdit}
                        </p>
                        <p className="mt-1 text-sm font-bold text-dash-fg">
                          {isNew
                            ? tr.formDescNew
                            : `${formData.cliente || tr.noClient} — ${formData.booking || tr.noBooking}`
                          }
                        </p>
                        {!isNew && formData.naviera && (
                          <p className="mt-0.5 text-sm text-dash-muted">
                            {formData.naviera} · {formData.nave} · {formData.pod}
                          </p>
                        )}
                        {!isNew && bookingDocUrl && (
                          <a
                            href={bookingDocUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/35 bg-emerald-400/15 px-2.5 py-1 text-xs font-semibold text-dash-fg transition-colors hover:bg-emerald-400/25"
                          >
                            <Icon icon="lucide:file-text" width={13} height={13} />
                            {tr.viewBookingPdf}
                            <Icon icon="lucide:external-link" width={11} height={11} className="opacity-70" />
                          </a>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setMobilePanel("list")}
                        className="flex shrink-0 items-center gap-1 rounded-lg border border-dash-border bg-dash-control px-2.5 py-1.5 text-xs font-semibold text-dash-fg transition-colors hover:bg-dash-neon/15 lg:hidden"
                      >
                        <Icon icon="lucide:list" width={12} height={12} />
                        {tr.changePanel}
                      </button>
                    </div>
                  </div>

                  {/* Instructivo de Embarque */}
                  {!isNew && (
                    <div className={cardClass}>
                      <div className={cardAccent} />

                      {/* Header */}
                      <div className="flex items-center gap-3 border-b border-dash-border px-4 py-3">
                        <span className={`${sectionIconWrap} border-violet-400/35 bg-violet-500/15`}>
                          <Icon icon="lucide:file-spreadsheet" className="h-4 w-4 text-violet-300" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className={sectionTitleClass}>Instructivo de Embarque</p>
                            {instrSavedUrl && (
                              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-400/35 bg-emerald-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-dash-fg">
                                <Icon icon="lucide:check" className="h-3 w-3" />
                                {tr.instrLoadedBadge}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-[10px] text-dash-muted">
                            {instrSavedUrl ? tr.instrSavedHint : tr.instrUploadHint}
                          </p>
                        </div>
                      </div>

                      {/* Archivo guardado */}
                      {instrSavedUrl && (
                        <div className="flex flex-wrap items-center gap-3 border-b border-emerald-400/25 bg-emerald-400/10 px-4 py-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-400/35 bg-dash-control">
                            <Icon icon="lucide:file-check-2" className="h-5 w-5 text-emerald-400" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-dash-fg">{instrFilename}</p>
                            <p className="mt-0.5 text-[10px] text-emerald-300/90">{tr.instrSavedLocation}</p>
                          </div>
                          <a href={instrSavedUrl} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-emerald-400/35 bg-emerald-500/20 px-3 py-2 text-xs font-semibold text-dash-fg transition-colors hover:bg-emerald-500/30">
                            <Icon icon="lucide:download" className="h-3.5 w-3.5" />
                            Descargar
                          </a>
                        </div>
                      )}

                      {/* Error */}
                      {instrSaveError && (
                        <div className="flex items-center gap-2 border-b border-red-400/25 bg-red-500/10 px-4 py-2">
                          <Icon icon="lucide:cloud-off" className="h-3.5 w-3.5 shrink-0 text-red-400" />
                          <span className="flex-1 text-[10px] text-red-300">{instrSaveError}</span>
                          <button type="button" onClick={() => setInstrSaveError(null)} className="text-red-400 hover:text-red-300">
                            <Icon icon="lucide:x" className="h-3 w-3" />
                          </button>
                        </div>
                      )}

                      {/* Acciones */}
                      <div className="flex items-center gap-2 px-4 py-3">
                        <input
                          ref={instrFileInputRef}
                          type="file"
                          accept=".xlsx,.xls,.pdf"
                          className="hidden"
                          onChange={(e) => void handleSubirInstructivo(e)}
                        />
                        <button
                          type="button"
                          disabled={instrUploading}
                          onClick={() => {
                            if (instrSavedUrl) setConfirmReplaceInstr(true);
                            else instrFileInputRef.current?.click();
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-violet-400/35 bg-violet-500/15 px-3 py-2 text-xs font-semibold text-dash-fg transition-colors hover:bg-violet-500/25 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {instrUploading
                            ? <><Icon icon="typcn:refresh" className="h-3.5 w-3.5 animate-spin" />Subiendo...</>
                            : <><Icon icon="lucide:upload" className="h-3.5 w-3.5" />{instrSavedUrl ? "Reemplazar instructivo" : "Subir instructivo"}</>
                          }
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Estado de la reserva */}
                  <div className={cardClass}>
                    <div className={cardAccent} />
                    <div className="flex items-center justify-between gap-3 px-4 py-3">
                      <span className={sectionTitleClass}>{tr.statusLabel}</span>
                      <div className="flex gap-1.5">
                        {[
                          { value: "pendiente", label: tr.statusPendiente, color: "border-dash-border bg-dash-control text-dash-muted", active: "border-dash-neon/50 bg-dash-neon/25 text-dash-fg" },
                          { value: "en_curso", label: tr.statusEnCurso, color: "border-amber-400/35 bg-amber-400/10 text-dash-fg", active: "border-amber-400/50 bg-amber-400/25 text-dash-fg" },
                          { value: "completada", label: tr.statusCompletada, color: "border-emerald-400/35 bg-emerald-400/10 text-dash-fg", active: "border-emerald-400/50 bg-emerald-400/25 text-dash-fg" },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => handleChange("estado", opt.value)}
                            className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition-all ${
                              formData.estado === opt.value ? opt.active : opt.color + " hover:opacity-80"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    {/* Datos de la operación */}
                    <div className={cardClass}>
                      <div className={cardAccent} />
                      <div className="flex items-center gap-2.5 border-b border-dash-border px-4 py-3">
                        <span className={`${sectionIconWrap} border-indigo-400/35 bg-indigo-500/15`}>
                          <Icon icon="lucide:file-text" className="h-4 w-4 text-indigo-300" />
                        </span>
                        <h2 className={sectionTitleClass}>{tr.sectionOp}</h2>
                        {opVinculada && (
                          <span className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-indigo-400/35 bg-indigo-500/15 px-2.5 py-1 text-xs font-semibold text-dash-fg">
                            <Icon icon="lucide:link" width={12} height={12} />
                            {opVinculada.ref_asli ??
                              (opVinculada.correlativo != null
                                ? `A${String(opVinculada.correlativo).padStart(5, "0")}`
                                : tr.linkedOp)}
                          </span>
                        )}
                      </div>
                      {opVinculada ? (
                        <div className="space-y-3 p-4">
                          <p className="text-xs text-dash-muted">{tr.linkedOpHint}</p>
                          <dl className="grid grid-cols-2 gap-3">
                            {[
                              { label: tr.clientLabel, value: opVinculada.cliente },
                              { label: tr.bookingLabel, value: opVinculada.booking },
                              { label: tr.navieraLabel, value: opVinculada.naviera },
                              { label: tr.naveLabel, value: opVinculada.nave },
                              { label: tr.podLabel, value: opVinculada.pod },
                              { label: tr.etdLabel, value: formatDate(opVinculada.etd) },
                            ].map(({ label, value }) => (
                              <div key={label}>
                                <dt className={labelClass}>{label}</dt>
                                <dd className="truncate text-sm font-semibold text-dash-fg">
                                  {value || "-"}
                                </dd>
                              </div>
                            ))}
                          </dl>
                          <div>
                            <label className={labelClass}>{tr.warehouse}</label>
                            <select
                              value={formData.deposito}
                              onChange={(e) => handleChange("deposito", e.target.value)}
                              className={inputClass}
                            >
                              <option value="">{tr.selectDeposito}</option>
                              {depositos.map((d) => (
                                <option key={d.id} value={d.nombre}>{d.nombre}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ) : (
                      <div className="grid grid-cols-2 gap-3 p-4">
                        {renderInput(tr.clientLabel, "cliente", "text", tr.clientPlaceholder)}
                        {renderInput(tr.bookingLabel, "booking", "text", tr.bookingPlaceholder)}
                        <div>
                          <label className={labelClass}>{tr.navieraLabel}</label>
                          <select
                            value={formData.naviera}
                            onChange={(e) => handleChange("naviera", e.target.value)}
                            className={inputClass}
                          >
                            <option value="">{tr.selectNaviera}</option>
                            {navieras.map((n) => (
                              <option key={n.id} value={n.nombre}>{n.nombre}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className={labelClass}>{tr.naveLabel}</label>
                          <select
                            value={formData.nave}
                            onChange={(e) => handleChange("nave", e.target.value)}
                            className={inputClass}
                          >
                            <option value="">{tr.selectNave}</option>
                            {naves.map((n) => (
                              <option key={n.id} value={n.nombre}>{n.nombre}</option>
                            ))}
                          </select>
                        </div>
                        <ComboboxInput
                          id="pod"
                          label={tr.podLabel}
                          labelClass={labelClass}
                          inputClass={inputClass}
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
                        <div>
                          <label className={labelClass}>{tr.warehouse}</label>
                          <select
                            value={formData.deposito}
                            onChange={(e) => handleChange("deposito", e.target.value)}
                            className={inputClass}
                          >
                            <option value="">{tr.selectDeposito}</option>
                            {depositos.map((d) => (
                              <option key={d.id} value={d.nombre}>{d.nombre}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      )}
                    </div>

                    {/* Transporte */}
                    <div className={cardClass}>
                      <div className={cardAccent} />
                      <div className="flex items-center gap-2.5 border-b border-dash-border px-4 py-3">
                        <span className={`${sectionIconWrap} border-sky-400/35 bg-sky-500/15`}>
                          <Icon icon="lucide:truck" className="h-4 w-4 text-sky-300" />
                        </span>
                        <h2 className={sectionTitleClass}>{tr.transportInfo}</h2>
                      </div>
                      <div className="grid grid-cols-2 gap-3 p-4">
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
                            placeholder={tr.placeholderEmpresa}
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
                            placeholder={tr.placeholderChofer}
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
                            placeholder={tr.placeholderPatente}
                            disabled={!empresaTransporteId}
                            className={inputClass}
                            icon="lucide:truck"
                          />
                        </div>
                        {renderInput(tr.trailerPlate, "patente_remolque")}
                      </div>
                    </div>

                    {/* Contenedor */}
                    <div className={cardClass}>
                      <div className={cardAccent} />
                      <div className="flex items-center gap-2.5 border-b border-dash-border px-4 py-3">
                        <span className={`${sectionIconWrap} border-teal-400/35 bg-teal-500/15`}>
                          <Icon icon="typcn:box" className="h-4 w-4 text-teal-300" />
                        </span>
                        <h2 className={sectionTitleClass}>{tr.containerInfo}</h2>
                      </div>
                      <div className="grid grid-cols-2 gap-3 p-4">
                        {renderInput(tr.container, "contenedor")}
                        {renderInput(tr.seal, "sello")}
                        {renderInput(tr.tare, "tara", "number")}
                      </div>
                    </div>

                    {/* Citación a Planta */}
                    <div className={cardClass}>
                      <div className={cardAccent} />
                      <div className="flex items-center gap-2.5 border-b border-dash-border px-4 py-3">
                        <span className={`${sectionIconWrap} border-amber-400/35 bg-amber-500/15`}>
                          <Icon icon="typcn:calendar" className="h-4 w-4 text-amber-300" />
                        </span>
                        <h2 className={sectionTitleClass}>{tr.sectionCitacion}</h2>
                      </div>
                      <div className="grid grid-cols-2 gap-3 p-4">
                        <div className="col-span-2">
                          <label className={labelClass}>{tr.plantaCitacionLabel}</label>
                          <select
                            value={formData.planta_presentacion}
                            onChange={(e) => handleChange("planta_presentacion", e.target.value)}
                            className={inputClass}
                          >
                            <option value="">{tr.selectPlanta}</option>
                            {plantas.map((p) => (
                              <option key={p.id} value={p.nombre}>{p.nombre}</option>
                            ))}
                          </select>
                        </div>
                        {renderInput(tr.citation, "citacion", "datetime-local")}
                        {renderInput(tr.plantArrival, "llegada_planta", "datetime-local")}
                        {renderInput(tr.plantDeparture, "salida_planta", "datetime-local")}
                      </div>
                    </div>

                    {/* Stacking */}
                    <div className={cardClass}>
                      <div className={cardAccent} />
                      <div className="flex items-center gap-2.5 border-b border-dash-border px-4 py-3">
                        <span className={`${sectionIconWrap} border-violet-400/35 bg-violet-500/15`}>
                          <Icon icon="typcn:th-large" className="h-4 w-4 text-violet-300" />
                        </span>
                        <h2 className={sectionTitleClass}>{tr.stacking}</h2>
                      </div>
                      <div className="grid grid-cols-2 gap-3 p-4">
                        {renderInput(tr.stackingStart, "inicio_stacking", "datetime-local")}
                        {renderInput(tr.stackingEnd, "fin_stacking", "datetime-local")}
                        <div className="col-span-2">
                          {renderInput(tr.stackingEntry, "ingreso_stacking", "datetime-local")}
                        </div>
                      </div>
                    </div>

                    {/* Costos */}
                    <div className={cardClass}>
                      <div className={cardAccent} />
                      <div className="flex items-center gap-2.5 border-b border-dash-border px-4 py-3">
                        <span className={`${sectionIconWrap} border-emerald-400/35 bg-emerald-500/15`}>
                          <Icon icon="typcn:calculator" className="h-4 w-4 text-emerald-300" />
                        </span>
                        <h2 className={sectionTitleClass}>{tr.costs}</h2>
                      </div>
                      <div className="grid grid-cols-2 gap-3 p-4">
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
                                {x.origen} — {x.destino} · {x.moneda ?? ""}
                              </option>
                            ))}
                          </select>
                        </div>
                        {renderInput(tr.sectionValue, "valor_tramo", "number")}
                        <div>
                          <label className={labelClass}>{tr.portage}</label>
                          <div className="flex gap-2">
                            {["SÍ", "NO"].map((v) => (
                              <button
                                key={v}
                                type="button"
                                onClick={() => handleChange("porteo", v)}
                                className={`flex-1 rounded-xl border py-2 text-base font-bold transition-all ${
                                  formData.porteo === v
                                    ? "border-dash-neon/50 bg-dash-neon/25 text-dash-fg"
                                    : "border-dash-border bg-dash-control text-dash-muted hover:border-dash-neon/40"
                                }`}
                              >
                                {v}
                              </button>
                            ))}
                          </div>
                        </div>
                        {formData.porteo === "SÍ" && renderInput(tr.portageValue, "valor_porteo", "number")}
                        <div>
                          <label className={labelClass}>{tr.deadFreight}</label>
                          <div className="flex gap-2">
                            {["SÍ", "NO"].map((v) => (
                              <button
                                key={v}
                                type="button"
                                onClick={() => handleChange("falso_flete", v)}
                                className={`flex-1 rounded-xl border py-2 text-base font-bold transition-all ${
                                  formData.falso_flete === v
                                    ? "border-dash-neon/50 bg-dash-neon/25 text-dash-fg"
                                    : "border-dash-border bg-dash-control text-dash-muted hover:border-dash-neon/40"
                                }`}
                              >
                                {v}
                              </button>
                            ))}
                          </div>
                        </div>
                        {formData.falso_flete === "SÍ" && renderInput(tr.deadFreightValue, "valor_falso_flete", "number")}
                        <div className="col-span-2">
                          {renderInput(tr.transportInvoice, "factura_transporte")}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Observaciones */}
                  <div className={cardClass}>
                    <div className={cardAccent} />
                    <div className="flex items-center gap-2.5 border-b border-dash-border px-4 py-3">
                      <span className={sectionIconWrap}>
                        <Icon icon="typcn:notes" className="h-4 w-4 text-dash-muted" />
                      </span>
                      <h2 className={sectionTitleClass}>{tr.observations}</h2>
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
                    <div className="rounded-xl border border-red-400/35 bg-red-500/15 p-4 text-sm font-medium text-red-300">
                      {error}
                    </div>
                  )}


                  <div className="flex justify-between gap-3">
                    {!isNew && selectedId && (
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(selectedId)}
                        className="inline-flex items-center gap-2 rounded-xl border border-red-400/35 bg-red-500/15 px-4 py-2.5 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/25"
                      >
                        <Icon icon="typcn:trash" className="h-4 w-4" />
                        {tr.deleteBtn}
                      </button>
                    )}
                    <div className="ml-auto flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(initialFormData);
                          setSelectedId(null);
                          setIsNew(false);
                          setError(null);
                          setMobilePanel("list");
                        }}
                        className="dash-control rounded-xl px-4 py-2.5 text-sm font-semibold text-dash-fg transition-colors hover:bg-dash-neon/15"
                      >
                        {tr.cancel}
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="dash-cta inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm disabled:opacity-50"
                      >
                        {saving ? (
                          <><Icon icon="typcn:refresh" className="h-4 w-4 animate-spin" />{tr.saving}</>
                        ) : (
                          <><Icon icon="typcn:tick" className="h-4 w-4" />{isNew ? tr.createReserva : tr.save}</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`${cardClass} flex min-h-[280px] items-center justify-center`}>
                  <div className="px-4 py-8 text-center">
                    <span className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-dash-border bg-dash-control">
                      <Icon icon="lucide:truck" width={24} height={24} className="text-dash-muted" />
                    </span>
                    <p className="text-sm font-medium text-dash-muted">{tr.selectOrCreate}</p>
                    <button
                      type="button"
                      onClick={() => setMobilePanel("list")}
                      className="dash-cta mt-3 inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs lg:hidden"
                    >
                      <Icon icon="typcn:document" width={14} height={14} />
                      {tr.viewReservas}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </form>
        </div>
      </main>
    </div>

      {/* Modal confirmación crear nuevo elemento */}
      {confirmNewItem && (
        <div className="dash-neon fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" data-theme={theme}>
          <div className="dash-card w-full max-w-sm overflow-hidden rounded-2xl">
            <div className="h-[3px] bg-gradient-to-r from-dash-neon to-dash-neon-hot" />
            <div className="p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-dash-neon/35 bg-dash-neon/15 text-dash-neon">
                {confirmNewItem.type === "empresa" ? (
                  <Icon icon="lucide:building-2" width={18} height={18} />
                ) : confirmNewItem.type === "chofer" ? (
                  <Icon icon="lucide:user" width={18} height={18} />
                ) : (
                  <Icon icon="lucide:truck" width={18} height={18} />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-dash-fg">
                  {confirmNewItem.type === "empresa"
                    ? tr.createEntityEmpresa
                    : confirmNewItem.type === "chofer"
                    ? tr.createEntityChofer
                    : tr.createEntityEquipo}
                </h3>
                <p className="text-xs text-dash-muted">
                  {tr.confirmAddNew}
                </p>
              </div>
            </div>

            <p className="mb-6 text-sm text-dash-muted">
              {tr.willCreate}{" "}
              {confirmNewItem.type === "empresa"
                ? tr.entityEmpresa
                : confirmNewItem.type === "chofer"
                ? tr.entityChofer
                : tr.entityEquipo}
              :{" "}
              <span className="font-medium text-dash-neon">
                {confirmNewItem.value}
              </span>
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmNewItem(null)}
                className="dash-control flex-1 rounded-xl px-4 py-2 text-sm font-medium text-dash-fg"
              >
                {tr.cancel}
              </button>
              <button
                type="button"
                onClick={async () => {
                  await confirmNewItem.callback();
                  setConfirmNewItem(null);
                }}
                disabled={saving}
                className="dash-cta flex-1 rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {saving ? tr.creating : tr.confirmBtn}
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmación eliminar */}
      {confirmDelete && (
        <div className="dash-neon fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" data-theme={theme}>
          <div className="dash-card w-full max-w-sm overflow-hidden rounded-2xl">
            <div className="h-[3px] bg-red-500" />
            <div className="p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-400/35 bg-red-500/15 text-red-400">
                <Icon icon="typcn:trash" width={18} height={18} />
              </div>
              <div>
                <h3 className="font-semibold text-dash-fg">{tr.deleteModalTitle}</h3>
                <p className="text-xs text-dash-muted">
                  {tr.deleteModalWarning}
                </p>
              </div>
            </div>
            <p className="mb-6 text-sm text-dash-muted">
              {tr.deleteModalConfirm}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="dash-control flex-1 rounded-xl px-4 py-2 text-sm font-medium text-dash-fg"
              >
                {tr.cancel}
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(confirmDelete)}
                className="flex-1 rounded-xl border border-red-400/35 bg-red-500/20 px-4 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/30"
              >
                {tr.deleteBtn}
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      {confirmReplaceInstr && (
        <div className="dash-neon fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" data-theme={theme}>
          <div className="dash-card w-full max-w-sm overflow-hidden rounded-2xl">
            <div className="h-[3px] bg-gradient-to-r from-dash-neon to-dash-neon-hot" />
            <div className="p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/35 bg-amber-500/15 text-amber-300">
                <Icon icon="lucide:triangle-alert" width={18} height={18} />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-dash-fg">{tr.instrReplaceModalTitle}</h3>
                <p className="text-xs text-dash-muted">{tr.instrReplaceModalWarning}</p>
              </div>
            </div>
            <p className="mb-2 text-sm text-dash-muted">{tr.instrReplaceModalConfirm}</p>
            <p className="mb-6 break-words text-sm font-semibold text-dash-fg">{instrFilename}</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmReplaceInstr(false)}
                className="dash-control flex-1 rounded-xl px-4 py-2 text-sm font-medium text-dash-fg"
              >
                {tr.cancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmReplaceInstr(false);
                  instrFileInputRef.current?.click();
                }}
                className="flex-1 rounded-xl border border-violet-400/35 bg-violet-500/20 px-4 py-2 text-sm font-medium text-dash-fg transition-colors hover:bg-violet-500/30"
              >
                {tr.instrReplaceModalAction}
              </button>
            </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
