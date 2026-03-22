import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { Combobox } from "@/components/ui/Combobox";
import { format } from "date-fns";
import { sileo } from "sileo";
import {
  type FormatoInstructivo,
  type InstructivoOpData,
  buildInstructivoTagValues,
  generateInstructivoHtml,
  buildInstructivoSubject,
  buildInstructivoPlainBody,
  applyTagsToExcelBuffer,
} from "@/lib/documentos/instructivo";
import { sendEmail, type EmailAttachment } from "@/lib/email/sendEmail";

type ReservaExt = {
  id: string;
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

  const [bookingDocUrl, setBookingDocUrl] = useState<string | null>(null);
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

    const [reservasRes, empresasRes, tramosRes, navierasRes, navesRes, destinosRes, plantasRes, depositosRes, formatosRes] = await Promise.all([
      supabase.from("transportes_reservas_ext").select("*").order("created_at", { ascending: false }),
      supabase.from("transportes_empresas").select("id, nombre, rut").order("nombre"),
      supabase.from("transportes_tramos").select("id, origen, destino, valor, moneda, activo").eq("activo", true).order("origen"),
      supabase.from("navieras").select("id, nombre").order("nombre"),
      supabase.from("naves").select("id, nombre").order("nombre"),
      supabase.from("destinos").select("id, nombre").eq("activo", true).order("nombre"),
      supabase.from("plantas").select("id, nombre").eq("activo", true).order("nombre"),
      supabase.from("depositos").select("id, nombre").eq("activo", true).order("nombre"),
      supabase.from("formatos_documentos").select("id, nombre, tipo, template_type, descripcion, contenido_html, excel_path, excel_nombre, cliente").eq("tipo", "instructivo").eq("activo", true).order("nombre"),
    ]);

    setReservas((reservasRes.data ?? []) as ReservaExt[]);
    setEmpresasTransporte((empresasRes.data ?? []) as TransporteEmpresa[]);
    setTramos((tramosRes.data ?? []) as Tramo[]);
    setNavieras((navierasRes.data ?? []) as SelectOption[]);
    setNaves((navesRes.data ?? []) as SelectOption[]);
    setDestinos((destinosRes.data ?? []) as SelectOption[]);
    setPlantas((plantasRes.data ?? []) as SelectOption[]);
    setDepositos((depositosRes.data ?? []) as SelectOption[]);
    const fmts = (formatosRes.data ?? []) as FormatoInstructivo[];
    setFormatos(fmts);
    if (fmts.length === 1) setSelectedFormatoId(fmts[0].id);
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

  // Al seleccionar/deseleccionar una reserva, resetear estado del instructivo y cargar el existente
  useEffect(() => {
    setInstrPhase("idle");
    setInstrBlob(null);
    setInstrFilename("");
    setInstrDraftUrl(undefined);
    setInstrError("");
    setInstrSavedUrl(null);
    setInstrSaveError(null);

    if (!selectedId || !supabase) return;
    void (async () => {
      // Intento 1: buscar en tabla documentos vía operaciones (cuando existe booking coincidente)
      if (formData.booking) {
        const { data: opRow } = await supabase
          .from("operaciones")
          .select("id")
          .eq("booking", formData.booking)
          .limit(1)
          .maybeSingle();
        if (opRow?.id) {
          const { data } = await supabase
            .from("documentos")
            .select("nombre_archivo, url")
            .eq("operacion_id", opRow.id)
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
      }
      // Intento 2: buscar directamente en storage bajo el id de la reserva ext
      // (reservas sin operaciones coincidente guardan el archivo aquí)
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

  // Formatos filtrados por cliente de la reserva seleccionada
  const filteredFormatos = useMemo(() => {
    const clienteActual = formData.cliente?.trim();
    if (!clienteActual) return formatos.filter((f) => !f.cliente);
    return formatos.filter((f) => !f.cliente || f.cliente === clienteActual);
  }, [formatos, formData.cliente]);

  // Auto-seleccionar formato si hay exactamente uno disponible
  useEffect(() => {
    if (filteredFormatos.length === 1) setSelectedFormatoId(filteredFormatos[0].id);
    else if (filteredFormatos.length === 0) setSelectedFormatoId("");
  }, [filteredFormatos]);

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
    // Instructivo — se resetea via useEffect en selectedId
    // Buscar el PDF de booking en operaciones por número de booking
    if (r.booking && supabase) {
      void supabase
        .from("operaciones")
        .select("booking_doc_url")
        .eq("booking", r.booking)
        .not("booking_doc_url", "is", null)
        .limit(1)
        .single()
        .then(({ data }) => {
          setBookingDocUrl((data as { booking_doc_url: string | null } | null)?.booking_doc_url ?? null);
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
    setEmpresaTransporteId("");
    setEmpresaTransporteInput("");
    setChoferInput("");
    setEquipoInput("");
    setChoferes([]);
    setEquipos([]);
    setError(null);
    setInstrPhase("idle");
    setInstrBlob(null);
    setInstrFilename("");
    setInstrDraftUrl(undefined);
    setInstrError("");
    setInstrSavedUrl(null);
    setInstrSaveError(null);
    setMobilePanel("form");
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
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

  // Helper para construir InstructivoOpData enriquecido con datos de operaciones
  const buildOpData = async (): Promise<InstructivoOpData> => {
    let opData: InstructivoOpData = {
      id: selectedId ?? "",
      correlativo: 0,
      cliente: formData.cliente || null,
      naviera: formData.naviera || null,
      nave: formData.nave || null,
      booking: formData.booking || null,
      booking_doc_url: bookingDocUrl,
      pod: formData.pod || null,
      etd: formData.etd || null,
      contenedor: formData.contenedor || null,
      sello: formData.sello || null,
      tara: formData.tara ? parseFloat(formData.tara) : null,
      deposito: formData.deposito || null,
      transporte: formData.transporte || null,
      tramo: formData.tramo || null,
      moneda: null,
      observaciones: formData.observaciones || null,
      inicio_stacking: formData.inicio_stacking || null,
      fin_stacking: formData.fin_stacking || null,
      ingreso_stacking: formData.ingreso_stacking || null,
      citacion: formData.citacion || null,
    };
    if (formData.booking && supabase) {
      const { data: opRow } = await supabase
        .from("operaciones")
        .select("id, ref_asli, correlativo, consignatario, pol, eta, especie, pais, pallets, peso_bruto, peso_neto, tipo_unidad, temperatura, ventilacion, incoterm, forma_pago, moneda, booking_doc_url")
        .eq("booking", formData.booking)
        .is("deleted_at", null)
        .limit(1)
        .maybeSingle();
      if (opRow) {
        const row = opRow as Record<string, unknown>;
        opData = {
          ...opData,
          id: (row.id as string) ?? opData.id,
          ref_asli: (row.ref_asli as string | null) ?? null,
          correlativo: (row.correlativo as number) ?? 0,
          consignatario: row.consignatario as string | null,
          pol: row.pol as string | null,
          eta: row.eta as string | null,
          especie: row.especie as string | null,
          pais: row.pais as string | null,
          pallets: row.pallets as number | null,
          peso_bruto: row.peso_bruto as number | null,
          peso_neto: row.peso_neto as number | null,
          tipo_unidad: row.tipo_unidad as string | null,
          temperatura: row.temperatura as string | null,
          ventilacion: row.ventilacion as number | null,
          incoterm: row.incoterm as string | null,
          forma_pago: row.forma_pago as string | null,
          moneda: row.moneda as string | null,
          booking_doc_url: (row.booking_doc_url as string | null) ?? bookingDocUrl,
        };
      }
    }
    return opData;
  };

  // ── Paso 1: Generar el Excel instructivo ─────────────────────────────────
  const handleGenerarInstructivo = async () => {
    if (!selectedFormatoId || !supabase) return;
    const formato = formatos.find((f) => f.id === selectedFormatoId);
    if (!formato) return;

    setInstrPhase("generating");
    setInstrError("");
    setInstrBlob(null);
    setInstrFilename("");
    setInstrDraftUrl(undefined);

    try {
      const opData = await buildOpData();
      const ref = opData.ref_asli || `A${String(opData.correlativo).padStart(5, "0")}`;
      const tagValues = buildInstructivoTagValues(opData);

      if (formato.template_type === "excel" && formato.excel_path) {
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

        // ── Guardar en bucket + registrar en documentos si hay operaciones.id real ──
        // buildOpData() parte con id = selectedId (reservas_ext.id); lo reemplaza con
        // operaciones.id solo si encuentra un registro via el booking.
        setInstrSaveError(null);
        const hasRealOperacionId = opData.id && opData.id !== selectedId;
        // La ruta de storage usa el operaciones.id real cuando existe, o el
        // reservas_ext.id como fallback (para no perder el archivo generado).
        const storageBaseId = hasRealOperacionId ? opData.id : (selectedId ?? opData.id);
        const storagePath = `${storageBaseId}/INSTRUCTIVO_EMBARQUE/${filename}`;
        const { error: upErr } = await supabase.storage.from("documentos").upload(storagePath, blob, {
          contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          upsert: true,
        });
        if (upErr) {
          setInstrSaveError(`Error al subir al bucket: ${upErr.message}`);
        } else {
          const { data: urlData } = supabase.storage.from("documentos").getPublicUrl(storagePath);
          if (hasRealOperacionId) {
            // Solo registrar en la tabla documentos cuando hay un operaciones.id válido
            // (la FK documentos.operacion_id → operaciones.id lo exige).
            await supabase.from("documentos")
              .delete()
              .eq("operacion_id", opData.id)
              .eq("tipo", "INSTRUCTIVO_EMBARQUE");
            const { error: insErr } = await supabase.from("documentos").insert({
              operacion_id: opData.id,
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
          } else {
            // Sin operaciones coincidente: el archivo queda en storage de todas formas.
            setInstrSavedUrl(urlData.publicUrl);
          }
        }
      } else if (formato.contenido_html) {
        const html = generateInstructivoHtml(formato, tagValues);
        const win = window.open("", "_blank", "width=960,height=720");
        if (win) {
          win.document.write(html + `<style>@media print{@page{margin:16mm 14mm;size:A4}}</style><script>window.onload=()=>{window.print()}<\/script>`);
          win.document.close();
        }
        setInstrPhase("idle");
      } else {
        throw new Error("El formato no tiene plantilla Excel ni contenido HTML.");
      }
    } catch (e) {
      setInstrPhase("error");
      setInstrError(e instanceof Error ? e.message : "Error inesperado al generar el instructivo.");
    }
  };

  // ── Descarga local ────────────────────────────────────────────────────────
  const handleDownloadInstructivo = () => {
    if (!instrBlob || !instrFilename) return;
    const url = URL.createObjectURL(instrBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = instrFilename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Paso 2: Enviar instructivo por correo desde la cuenta del ejecutivo ──
  const handleSendInstructivo = async () => {
    if (!instrBlob || !supabase) return;
    setInstrPhase("sending");
    setInstrError("");

    try {
      const opData  = await buildOpData();
      const subject = buildInstructivoSubject(opData);
      const body    = buildInstructivoPlainBody(opData);

      const arrayBuffer = await instrBlob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const attachments: EmailAttachment[] = [{
        name: instrFilename || "Instructivo.pdf",
        content: btoa(binary),
        mimeType: "application/pdf",
      }];

      const result = await sendEmail({ to: "roodericus7@gmail.com", subject, body, attachments });

      if (result.success) {
        setInstrPhase("sent");
      } else {
        setInstrPhase("error");
        setInstrError(result.error ?? "Error al enviar el correo.");
      }
    } catch (e) {
      setInstrPhase("error");
      setInstrError(e instanceof Error ? e.message : "Error inesperado.");
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
    "w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:bg-white transition-all text-sm";
  const labelClass =
    "block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1";

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

  const showForm = isNew || selectedId;

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
        <div className="rounded-2xl bg-gradient-to-br from-brand-blue via-brand-blue/90 to-violet-700 text-white overflow-hidden shadow-sm">
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
              {reservas.length > 0 && (
                <div className="flex items-center gap-1.5 bg-white/15 rounded-xl px-3 py-1.5">
                  <Icon icon="lucide:clipboard-list" width={13} height={13} className="text-white/80" />
                  <span className="text-xs font-bold">{reservas.length} {tr.tabReservas.toLowerCase()}</span>
                </div>
              )}
              <button
                type="button"
                onClick={handleNewReserva}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-brand-blue hover:bg-white/90 transition-colors shadow-sm"
              >
                <Icon icon="lucide:plus" width={14} height={14} />
                <span className="hidden sm:inline">{tr.newReserva}</span>
                <span className="sm:hidden">{tr.newReservaMobile}</span>
              </button>
              <button
                type="button"
                onClick={() => void fetchData()}
                className="p-2 bg-white/15 hover:bg-white/25 rounded-xl transition-colors text-white"
                title={tr.refresh}
              >
                <Icon icon="lucide:refresh-cw" width={16} height={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile tabs */}
        <div className="lg:hidden flex bg-neutral-100 rounded-2xl p-1 gap-1">
          <button
            type="button"
            onClick={() => setMobilePanel("list")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
              mobilePanel === "list"
                ? "bg-white text-brand-blue shadow-sm"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            <Icon icon="lucide:list" width={14} height={14} />
            {tr.tabReservas}
          </button>
          <button
            type="button"
            onClick={() => setMobilePanel("form")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
              mobilePanel === "form"
                ? "bg-white text-brand-blue shadow-sm"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            <Icon icon="lucide:file-plus" width={14} height={14} />
            {tr.tabForm}
            {showForm && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            )}
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Panel izquierdo: lista de reservas */}
            <div
              className={`w-full lg:w-80 lg:flex-shrink-0 ${
                mobilePanel === "form" ? "hidden lg:block" : ""
              }`}
            >
              <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden lg:sticky lg:top-0">
                <div className="h-[3px] bg-gradient-to-r from-brand-blue to-brand-teal" />
                <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                      <Icon icon="typcn:document" className="w-4 h-4 text-brand-blue" />
                    </span>
                    <h2 className="text-xs font-bold text-neutral-600 uppercase tracking-wider">
                      {tr.listTitle}
                    </h2>
                  </div>
                  {reservas.filter((r) => r.estado !== "completada").length > 0 && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold flex-shrink-0">
                      <Icon icon="lucide:alert-circle" width={10} height={10} />
                      {reservas.filter((r) => r.estado !== "completada").length} {reservas.filter((r) => r.estado !== "completada").length !== 1 ? tr.activasPluralSuffix : tr.activasSuffix}
                    </span>
                  )}
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

                  {filteredReservas.length === 0 ? (
                    <div className="py-8 text-center">
                      <span className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center mx-auto mb-2 inline-flex">
                        <Icon icon="lucide:inbox" width={20} height={20} className="text-neutral-400" />
                      </span>
                      <p className="text-neutral-500 text-sm font-medium">
                        {reservas.length === 0 ? tr.noReservas : tr.noResults}
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-[calc(100vh-320px)] overflow-y-auto space-y-2">
                      {filteredReservas.map((r) => {
                        const isActive = selectedId === r.id;
                        const completo = r.estado === "completada";
                        const enCurso = r.estado === "en_curso";
                        return (
                          <div
                            key={r.id}
                            className={`group relative w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                              isActive
                                ? "border-brand-blue bg-brand-blue/5 ring-2 ring-brand-blue/20"
                                : completo
                                  ? "border-emerald-200 bg-emerald-50/40 hover:border-emerald-300 hover:bg-emerald-50"
                                  : enCurso
                                    ? "border-amber-300 bg-amber-50/60 hover:border-amber-400 hover:bg-amber-50"
                                    : "border-amber-200 bg-amber-50/40 hover:border-amber-300 hover:bg-amber-50"
                            }`}
                            onClick={() => handleSelectReserva(r)}
                          >
                            <button
                              type="button"
                              onClick={(ev) => { ev.stopPropagation(); setConfirmDelete(r.id); }}
                              className="absolute top-2 right-2 p-1 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                              title={tr.deleteBtn}
                            >
                              <Icon icon="typcn:trash" className="w-3.5 h-3.5" />
                            </button>
                            <div className="flex items-start justify-between gap-2 mb-0.5">
                              <p className={`font-bold text-sm truncate pr-6 ${isActive ? "text-brand-blue" : "text-neutral-800"}`}>
                                {r.cliente || tr.noClient}
                              </p>
                              <span className={`flex-shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                completo
                                  ? "bg-emerald-100 text-emerald-700"
                                  : enCurso
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-neutral-100 text-neutral-600"
                              }`}>
                                <Icon icon={completo ? "lucide:check-circle" : enCurso ? "lucide:loader" : "lucide:clock"} width={10} height={10} />
                                {completo ? tr.statusComplete : enCurso ? tr.statusInProgress : tr.statusPending}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <p className="text-xs text-neutral-600 truncate">{r.booking || tr.noBooking} · {r.contenedor || tr.noContainer}</p>
                              {isActive && bookingDocUrl && (
                                <a
                                  href={bookingDocUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(ev) => ev.stopPropagation()}
                                  title={tr.viewBookingPdf}
                                  className="flex-shrink-0 p-0.5 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                                >
                                  <Icon icon="lucide:paperclip" width={12} height={12} />
                                </a>
                              )}
                            </div>
                            <p className="text-xs text-neutral-400 mt-0.5">{r.naviera || r.transporte || "—"} · ETD: {formatDate(r.etd)}</p>
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
              className={`flex-1 min-w-0 ${
                mobilePanel === "list" ? "hidden lg:block" : ""
              }`}
            >
              {showForm ? (
                <div className="space-y-4">
                  <div className="rounded-2xl bg-white border border-neutral-200 shadow-sm overflow-hidden">
                    <div className="h-[3px] bg-gradient-to-r from-brand-blue to-brand-teal" />
                    <div className="p-4 bg-brand-blue/5 border-l-4 border-brand-blue flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-brand-blue uppercase tracking-wider">
                          {isNew ? tr.formHeadingNew : tr.formHeadingEdit}
                        </p>
                        <p className="text-neutral-800 font-bold mt-1 text-sm">
                          {isNew
                            ? tr.formDescNew
                            : `${formData.cliente || tr.noClient} — ${formData.booking || tr.noBooking}`
                          }
                        </p>
                        {!isNew && formData.naviera && (
                          <p className="text-sm text-neutral-500 mt-0.5">
                            {formData.naviera} · {formData.nave} · {formData.pod}
                          </p>
                        )}
                        {!isNew && bookingDocUrl && (
                          <a
                            href={bookingDocUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 transition-colors"
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
                        className="lg:hidden flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-brand-blue bg-white border border-brand-blue/30 rounded-lg hover:bg-brand-blue/5 transition-colors"
                      >
                        <Icon icon="lucide:list" width={12} height={12} />
                        {tr.changePanel}
                      </button>
                    </div>
                  </div>

                  {/* Instructivo de Embarque */}
                  {!isNew && (
                    <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                      <div className="h-[3px] bg-gradient-to-r from-violet-500 to-purple-600" />

                      {/* Header */}
                      <div className="px-4 py-3 flex items-center gap-3 border-b border-neutral-100">
                        <span className="w-8 h-8 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center flex-shrink-0">
                          <Icon icon="lucide:file-spreadsheet" className="w-4 h-4 text-violet-600" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-neutral-700 uppercase tracking-wider">{tr.instructivoTitle}</p>
                          <p className="text-[10px] text-neutral-400 mt-0.5">
                            {instrPhase === "ready" || instrPhase === "sent"
                              ? `${instrFilename} · ${tr.instructivoReady}`
                              : tr.instructivoHint}
                          </p>
                        </div>
                        {(instrPhase === "idle" || instrPhase === "error") && filteredFormatos.length > 1 && (
                          <select
                            value={selectedFormatoId}
                            onChange={(e) => { setSelectedFormatoId(e.target.value); setInstrPhase("idle"); }}
                            className="text-xs border border-neutral-200 rounded-lg px-2 py-1.5 bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 max-w-[160px]"
                          >
                            <option value="">{tr.selectFormat}</option>
                            {filteredFormatos.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                          </select>
                        )}
                        {filteredFormatos.length === 0 && (
                          <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">{tr.noFormats}</span>
                        )}
                      </div>

                      {/* Instructivo previo guardado */}
                      {instrSavedUrl && instrPhase === "idle" && (
                        <div className="px-4 py-2 border-b border-violet-100 bg-violet-50 flex items-center gap-2 flex-wrap">
                          <Icon icon="lucide:cloud-check" className="w-3.5 h-3.5 text-violet-600 flex-shrink-0" />
                          <span className="text-[10px] font-semibold text-violet-700 flex-1">{tr.instructivoSaved}</span>
                          <a href={instrSavedUrl} target="_blank" rel="noopener noreferrer"
                            className="text-[10px] font-semibold text-violet-700 underline hover:text-violet-900 whitespace-nowrap">
                            {tr.viewFile}
                          </a>
                        </div>
                      )}
                      {instrSaveError && (
                        <div className="px-4 py-2 border-b border-red-100 bg-red-50 flex items-center gap-2">
                          <Icon icon="lucide:alert-circle" className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                          <span className="text-[10px] text-red-700 flex-1">{instrSaveError}</span>
                        </div>
                      )}

                      {/* Acciones */}
                      <div className="px-4 py-3 flex items-center gap-2 flex-wrap">
                        {(instrPhase === "idle" || instrPhase === "error") && (
                          <button
                            type="button"
                            disabled={!selectedFormatoId}
                            onClick={() => void handleGenerarInstructivo()}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            <Icon icon="lucide:file-spreadsheet" className="w-3.5 h-3.5" />
                            {instrSavedUrl ? tr.regenerateInstructivo : tr.generateInstructivo}
                          </button>
                        )}
                        {instrPhase === "generating" && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-violet-100 text-violet-700">
                            <Icon icon="typcn:refresh" className="w-3.5 h-3.5 animate-spin" />
                            {tr.generating}
                          </span>
                        )}
                        {(instrPhase === "ready" || instrPhase === "sent") && (
                          <>
                            <button
                              type="button"
                              onClick={handleDownloadInstructivo}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                            >
                              <Icon icon="lucide:download" className="w-3.5 h-3.5" />
                              {tr.downloadExcel}
                            </button>
                            {instrPhase !== "sent" && (
                              <button
                                type="button"
                                onClick={() => void handleSendInstructivo()}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-violet-600 text-white hover:bg-violet-700 transition-colors"
                              >
                                <Icon icon="lucide:send" className="w-3.5 h-3.5" />
                                {tr.sendToAlex}
                                {!bookingDocUrl && (
                                  <span className="text-[9px] bg-amber-400 text-amber-900 px-1 py-0.5 rounded font-bold">{tr.noBookingBadge}</span>
                                )}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => { setInstrPhase("idle"); setInstrBlob(null); setInstrFilename(""); }}
                              className="inline-flex items-center gap-1 px-2 py-2 rounded-xl text-xs text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
                              title={tr.regenerateTooltip}
                            >
                              <Icon icon="lucide:refresh-cw" className="w-3.5 h-3.5" />
                            </button>
                            {instrSavedUrl && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg border bg-violet-50 text-violet-700 border-violet-200">
                                <Icon icon="lucide:cloud-upload" className="w-3 h-3" />
                                {tr.savedInDocs}
                              </span>
                            )}
                            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg border ${
                              bookingDocUrl
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}>
                              <Icon icon={bookingDocUrl ? "lucide:paperclip" : "lucide:alert-triangle"} className="w-3 h-3" />
                              {bookingDocUrl ? tr.bookingReady : tr.noBookingDoc}
                            </span>
                          </>
                        )}
                        {instrPhase === "sending" && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-violet-100 text-violet-700">
                            <Icon icon="typcn:refresh" className="w-3.5 h-3.5 animate-spin" />
                            {tr.sending}
                          </span>
                        )}
                      </div>

                      {instrPhase === "sent" && (
                        <div className="px-4 py-2.5 border-t border-emerald-100 bg-emerald-50 flex items-start gap-2 flex-wrap">
                          <Icon icon="lucide:check-circle" className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <span className="text-xs font-semibold text-emerald-700 flex-1">{tr.sentSuccess}</span>
                        </div>
                      )}
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

                  {/* Estado de la reserva */}
                  <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                    <div className="h-[3px] bg-gradient-to-r from-brand-blue to-brand-teal" />
                    <div className="px-4 py-3 flex items-center justify-between gap-3">
                      <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">{tr.statusLabel}</span>
                      <div className="flex gap-1.5">
                        {[
                          { value: "pendiente", label: tr.statusPendiente, color: "bg-neutral-100 text-neutral-600 border-neutral-200", active: "bg-neutral-700 text-white border-neutral-700" },
                          { value: "en_curso", label: tr.statusEnCurso, color: "bg-amber-50 text-amber-700 border-amber-200", active: "bg-amber-500 text-white border-amber-500" },
                          { value: "completada", label: tr.statusCompletada, color: "bg-emerald-50 text-emerald-700 border-emerald-200", active: "bg-emerald-600 text-white border-emerald-600" },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => handleChange("estado", opt.value)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                              formData.estado === opt.value ? opt.active : opt.color + " hover:opacity-80"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {/* Datos de la operación */}
                    <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                      <div className="h-[3px] bg-gradient-to-r from-indigo-400 to-brand-blue" />
                      <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
                          <Icon icon="lucide:file-text" className="w-4 h-4 text-indigo-600" />
                        </span>
                        <h2 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">{tr.sectionOp}</h2>
                      </div>
                      <div className="p-4 grid grid-cols-2 gap-3">
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
                        <div>
                          <label className={labelClass}>{tr.podLabel}</label>
                          <select
                            value={formData.pod}
                            onChange={(e) => handleChange("pod", e.target.value)}
                            className={inputClass}
                          >
                            <option value="">{tr.selectDestino}</option>
                            {destinos.map((d) => (
                              <option key={d.id} value={d.nombre}>{d.nombre}</option>
                            ))}
                          </select>
                        </div>
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
                    </div>

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
                      </div>
                    </div>

                    {/* Citación a Planta */}
                    <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                      <div className="h-[3px] bg-gradient-to-r from-amber-400 to-orange-400" />
                      <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0">
                          <Icon icon="typcn:calendar" className="w-4 h-4 text-amber-600" />
                        </span>
                        <h2 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">{tr.sectionCitacion}</h2>
                      </div>
                      <div className="p-4 grid grid-cols-2 gap-3">
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
                                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                                  formData.porteo === v
                                    ? "bg-brand-blue text-white border-brand-blue"
                                    : "bg-neutral-50 text-neutral-500 border-neutral-200 hover:border-neutral-300"
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
                                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                                  formData.falso_flete === v
                                    ? "bg-brand-blue text-white border-brand-blue"
                                    : "bg-neutral-50 text-neutral-500 border-neutral-200 hover:border-neutral-300"
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
                    {!isNew && selectedId && (
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(selectedId)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-600 bg-white border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
                      >
                        <Icon icon="typcn:trash" className="w-4 h-4" />
                        {tr.deleteBtn}
                      </button>
                    )}
                    <div className="flex gap-3 ml-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(initialFormData);
                          setSelectedId(null);
                          setIsNew(false);
                          setError(null);
                          setMobilePanel("list");
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
                          <><Icon icon="typcn:refresh" className="w-4 h-4 animate-spin" />{tr.saving}</>
                        ) : (
                          <><Icon icon="typcn:tick" className="w-4 h-4" />{isNew ? tr.createReserva : tr.save}</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl bg-white border border-neutral-200 shadow-sm overflow-hidden flex items-center justify-center min-h-[280px]">
                  <div className="text-center py-8 px-4">
                    <span className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-3 inline-flex">
                      <Icon icon="lucide:truck" width={24} height={24} className="text-neutral-400" />
                    </span>
                    <p className="text-neutral-500 text-sm font-medium">{tr.selectOrCreate}</p>
                    <button
                      type="button"
                      onClick={() => setMobilePanel("list")}
                      className="lg:hidden mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-brand-blue rounded-xl hover:bg-brand-blue/90 transition-colors"
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

      {/* Modal confirmación crear nuevo elemento */}
      {confirmNewItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-lg max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-brand-blue/10 text-brand-blue flex items-center justify-center">
                {confirmNewItem.type === "empresa" ? (
                  <Icon icon="lucide:building-2" width={18} height={18} />
                ) : confirmNewItem.type === "chofer" ? (
                  <Icon icon="lucide:user" width={18} height={18} />
                ) : (
                  <Icon icon="lucide:truck" width={18} height={18} />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900">
                  {confirmNewItem.type === "empresa"
                    ? tr.createEntityEmpresa
                    : confirmNewItem.type === "chofer"
                    ? tr.createEntityChofer
                    : tr.createEntityEquipo}
                </h3>
                <p className="text-xs text-neutral-500">
                  {tr.confirmAddNew}
                </p>
              </div>
            </div>

            <p className="text-sm text-neutral-700 mb-6">
              {tr.willCreate}{" "}
              {confirmNewItem.type === "empresa"
                ? tr.entityEmpresa
                : confirmNewItem.type === "chofer"
                ? tr.entityChofer
                : tr.entityEquipo}
              :{" "}
              <span className="font-medium text-brand-blue">
                {confirmNewItem.value}
              </span>
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmNewItem(null)}
                className="flex-1 px-4 py-2 rounded-xl text-sm font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition-colors"
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
                className="flex-1 px-4 py-2 rounded-xl text-sm font-medium text-white bg-brand-blue hover:bg-brand-blue/90 disabled:opacity-50 transition-colors"
              >
                {saving ? tr.creating : tr.confirmBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmación eliminar */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-lg max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                <Icon icon="typcn:trash" width={18} height={18} />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900">{tr.deleteModalTitle}</h3>
                <p className="text-xs text-neutral-500">
                  {tr.deleteModalWarning}
                </p>
              </div>
            </div>
            <p className="text-sm text-neutral-700 mb-6">
              {tr.deleteModalConfirm}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2 rounded-xl text-sm font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition-colors"
              >
                {tr.cancel}
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(confirmDelete)}
                className="flex-1 px-4 py-2 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                {tr.deleteBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
