import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { Combobox } from "@/components/ui/Combobox";
import { format } from "date-fns";

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

type FormData = {
  cliente: string;
  booking: string;
  naviera: string;
  nave: string;
  pod: string;
  etd: string;
  planta_presentacion: string;
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

    const [reservasRes, empresasRes, tramosRes] = await Promise.all([
      supabase
        .from("transportes_reservas_ext")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("transportes_empresas").select("id, nombre, rut").order("nombre"),
      supabase
        .from("transportes_tramos")
        .select("id, origen, destino, valor, moneda, activo")
        .eq("activo", true)
        .order("origen"),
    ]);

    setReservas((reservasRes.data ?? []) as ReservaExt[]);
    setEmpresasTransporte((empresasRes.data ?? []) as TransporteEmpresa[]);
    setTramos((tramosRes.data ?? []) as Tramo[]);
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
    setSuccess(false);
    setError(null);

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
    setEmpresaTransporteId("");
    setEmpresaTransporteInput("");
    setChoferInput("");
    setEquipoInput("");
    setChoferes([]);
    setEquipos([]);
    setSuccess(false);
    setError(null);
    setMobilePanel("form");
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSuccess(false);
    setError(null);
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
    }));
    setSuccess(false);
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
      setError("Error al crear la empresa: " + error.message);
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
      setError("Error al crear el chofer: " + error.message);
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
      setError("Error al crear el equipo: " + error.message);
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
      setSuccess(true);
      setSuccessMsg("Reserva creada exitosamente");
      setTimeout(() => setSuccessMsg(null), 4000);
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
      setSuccess(true);
      setSuccessMsg("Reserva actualizada exitosamente");
      setTimeout(() => setSuccessMsg(null), 4000);
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
      {successMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 text-white text-sm font-medium shadow-lg animate-fade-in">
          <Icon icon="lucide:check-circle" className="w-5 h-5 shrink-0" />
          {successMsg}
        </div>
      )}
      <div className="w-full max-w-[1600px] mx-auto space-y-4">
        {/* Header */}
        <div className="rounded-2xl bg-white border border-neutral-200 shadow-sm overflow-hidden">
          <div className="h-[3px] bg-gradient-to-r from-brand-blue to-brand-teal" />
          <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-blue flex items-center justify-center flex-shrink-0">
                <Icon icon="lucide:truck" width={20} height={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-neutral-900 leading-tight">
                  {tr.title}
                </h1>
                <p className="text-xs text-neutral-500 mt-0.5">{tr.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleNewReserva}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand-blue rounded-xl hover:bg-brand-blue/90 transition-colors shadow-sm shadow-brand-blue/20"
              >
                <Icon icon="lucide:plus" className="w-4 h-4" />
                Nueva Reserva
              </button>
              <button
                type="button"
                onClick={() => void fetchData()}
                className="p-2 border border-neutral-200 bg-neutral-50 rounded-xl hover:bg-neutral-100 transition-colors text-neutral-500"
                title="Actualizar"
              >
                <Icon icon="typcn:refresh" width={18} height={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile tabs */}
        <div className="flex gap-2 lg:hidden">
          <button
            type="button"
            onClick={() => setMobilePanel("list")}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
              mobilePanel === "list"
                ? "bg-brand-blue text-white"
                : "bg-white text-neutral-600 border border-neutral-200"
            }`}
          >
            Reservas
          </button>
          <button
            type="button"
            onClick={() => setMobilePanel("form")}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
              mobilePanel === "form"
                ? "bg-brand-blue text-white"
                : "bg-white text-neutral-600 border border-neutral-200"
            }`}
          >
            Formulario
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
                <div className="h-[2px] bg-gradient-to-r from-brand-blue/60 to-brand-teal/60" />
                <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                    <Icon icon="typcn:document" className="w-4 h-4 text-brand-blue" />
                  </span>
                  <h2 className="text-xs font-bold text-neutral-600 uppercase tracking-wider">
                    Reservas ({reservas.length})
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
                        placeholder="Buscar por cliente, booking, naviera..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-neutral-200 bg-neutral-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  {filteredReservas.length === 0 ? (
                    <div className="py-8 text-center">
                      <span className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center mx-auto mb-2 inline-flex">
                        <Icon
                          icon="lucide:inbox"
                          width={20}
                          height={20}
                          className="text-neutral-400"
                        />
                      </span>
                      <p className="text-neutral-500 text-sm font-medium">
                        {reservas.length === 0
                          ? 'No hay reservas aún. Haz clic en "Nueva Reserva" para crear una.'
                          : "Sin resultados"}
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-[calc(100vh-360px)] overflow-y-auto space-y-2">
                      {filteredReservas.map((r) => (
                        <div
                          key={r.id}
                          className={`group relative w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                            selectedId === r.id
                              ? "border-brand-blue bg-brand-blue/5 ring-2 ring-brand-blue/20"
                              : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
                          }`}
                          onClick={() => handleSelectReserva(r)}
                        >
                          <button
                            type="button"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              setConfirmDelete(r.id);
                            }}
                            className="absolute top-2 right-2 p-1 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                            title="Eliminar"
                          >
                            <Icon icon="typcn:trash" className="w-3.5 h-3.5" />
                          </button>
                          <p className="font-semibold text-brand-blue text-sm truncate pr-6">
                            {r.cliente || "Sin cliente"}
                          </p>
                          <p className="text-xs text-neutral-600 truncate mt-0.5">
                            {r.booking || "Sin booking"} •{" "}
                            {r.contenedor || "Sin contenedor"}
                          </p>
                          <p className="text-xs text-neutral-400 mt-1">
                            {r.transporte || "Sin transporte"} • ETD:{" "}
                            {formatDate(r.etd)}
                          </p>
                          <span
                            className={`inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              r.estado === "completada"
                                ? "bg-emerald-100 text-emerald-700"
                                : r.estado === "en_curso"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-neutral-100 text-neutral-600"
                            }`}
                          >
                            {r.estado === "completada"
                              ? "Completada"
                              : r.estado === "en_curso"
                              ? "En curso"
                              : "Pendiente"}
                          </span>
                        </div>
                      ))}
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
                  {isNew && (
                    <div className="rounded-2xl bg-white border border-brand-blue/30 shadow-sm overflow-hidden">
                      <div className="h-[2px] bg-gradient-to-r from-brand-blue to-brand-teal" />
                      <div className="p-4 bg-brand-blue/5 border-l-4 border-brand-blue flex items-center gap-3">
                        <Icon
                          icon="lucide:plus-circle"
                          className="w-5 h-5 text-brand-blue flex-shrink-0"
                        />
                        <p className="text-sm font-semibold text-brand-blue">
                          Nueva reserva de transporte externo
                        </p>
                      </div>
                    </div>
                  )}

                  {!isNew && selectedId && (
                    <div className="rounded-2xl bg-white border border-neutral-200 shadow-sm overflow-hidden">
                      <div className="h-[2px] bg-gradient-to-r from-brand-blue to-brand-teal" />
                      <div className="p-4 bg-brand-blue/5 border-l-4 border-brand-blue">
                        <p className="text-xs font-semibold text-brand-blue uppercase tracking-wider">
                          Editando reserva
                        </p>
                        <p className="text-neutral-800 font-bold mt-1 text-sm">
                          {formData.cliente || "Sin cliente"} —{" "}
                          {formData.booking || "Sin booking"}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {/* Datos de la operación */}
                    <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                      <div className="h-[2px] bg-gradient-to-r from-brand-blue/60 to-brand-teal/60" />
                      <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                          <Icon
                            icon="lucide:file-text"
                            className="w-4 h-4 text-brand-blue"
                          />
                        </span>
                        <h2 className="text-xs font-bold text-neutral-600 uppercase tracking-wider">
                          Datos de la Operación
                        </h2>
                      </div>
                      <div className="p-4 grid grid-cols-2 gap-3">
                        {renderInput("Cliente", "cliente", "text", "Nombre del cliente")}
                        {renderInput("Booking", "booking", "text", "N° Booking")}
                        {renderInput("Naviera", "naviera", "text", "Naviera")}
                        {renderInput("Nave", "nave", "text", "Nombre de la nave")}
                        {renderInput("POD", "pod", "text", "Puerto de destino")}
                        {renderInput("ETD", "etd", "date")}
                        {renderInput(
                          "Planta Presentación",
                          "planta_presentacion",
                          "text",
                          "Planta"
                        )}
                        {renderInput(tr.warehouse, "deposito", "text", "Depósito")}
                      </div>
                    </div>

                    {/* Transporte */}
                    <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                      <div className="h-[2px] bg-gradient-to-r from-brand-blue/60 to-brand-teal/60" />
                      <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                          <Icon
                            icon="typcn:location-arrow"
                            className="w-4 h-4 text-brand-blue"
                          />
                        </span>
                        <h2 className="text-xs font-bold text-neutral-600 uppercase tracking-wider">
                          {tr.transportInfo}
                        </h2>
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
                              sublabel: x.patente_remolque
                                ? `Remolque: ${x.patente_remolque}`
                                : undefined,
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
                      <div className="h-[2px] bg-gradient-to-r from-brand-blue/60 to-brand-teal/60" />
                      <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                          <Icon icon="typcn:box" className="w-4 h-4 text-brand-blue" />
                        </span>
                        <h2 className="text-xs font-bold text-neutral-600 uppercase tracking-wider">
                          {tr.containerInfo}
                        </h2>
                      </div>
                      <div className="p-4 grid grid-cols-2 gap-3">
                        {renderInput(tr.container, "contenedor")}
                        {renderInput(tr.seal, "sello")}
                        {renderInput(tr.tare, "tara", "number")}
                      </div>
                    </div>

                    {/* Horarios */}
                    <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                      <div className="h-[2px] bg-gradient-to-r from-brand-blue/60 to-brand-teal/60" />
                      <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                          <Icon
                            icon="typcn:calendar"
                            className="w-4 h-4 text-brand-blue"
                          />
                        </span>
                        <h2 className="text-xs font-bold text-neutral-600 uppercase tracking-wider">
                          {tr.schedules}
                        </h2>
                      </div>
                      <div className="p-4 grid grid-cols-2 gap-3">
                        {renderInput(tr.citation, "citacion", "datetime-local")}
                        {renderInput(tr.plantArrival, "llegada_planta", "datetime-local")}
                        {renderInput(
                          tr.plantDeparture,
                          "salida_planta",
                          "datetime-local"
                        )}
                        {renderInput(
                          tr.pickupSchedule,
                          "agendamiento_retiro",
                          "datetime-local"
                        )}
                      </div>
                    </div>

                    {/* Stacking */}
                    <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                      <div className="h-[2px] bg-gradient-to-r from-brand-blue/60 to-brand-teal/60" />
                      <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                          <Icon
                            icon="typcn:th-large"
                            className="w-4 h-4 text-brand-blue"
                          />
                        </span>
                        <h2 className="text-xs font-bold text-neutral-600 uppercase tracking-wider">
                          {tr.stacking}
                        </h2>
                      </div>
                      <div className="p-4 grid grid-cols-2 gap-3">
                        {renderInput(
                          tr.stackingStart,
                          "inicio_stacking",
                          "datetime-local"
                        )}
                        {renderInput(tr.stackingEnd, "fin_stacking", "datetime-local")}
                        <div className="col-span-2">
                          {renderInput(
                            tr.stackingEntry,
                            "ingreso_stacking",
                            "datetime-local"
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Costos */}
                    <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                      <div className="h-[2px] bg-gradient-to-r from-brand-blue/60 to-brand-teal/60" />
                      <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                          <Icon
                            icon="typcn:calculator"
                            className="w-4 h-4 text-brand-blue"
                          />
                        </span>
                        <h2 className="text-xs font-bold text-neutral-600 uppercase tracking-wider">
                          {tr.costs}
                        </h2>
                      </div>
                      <div className="p-4 grid grid-cols-2 gap-3">
                        <div>
                          <label className={labelClass}>{tr.section}</label>
                          <select
                            value={
                              tramos.find(
                                (x) =>
                                  `${x.origen} - ${x.destino}` === formData.tramo
                              )?.id ?? ""
                            }
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
                        {renderSelect(tr.portage, "porteo", ["SÍ", "NO"])}
                        {renderInput(tr.portageValue, "valor_porteo", "number")}
                        {renderSelect(tr.deadFreight, "falso_flete", ["SÍ", "NO"])}
                        {renderInput(
                          tr.deadFreightValue,
                          "valor_falso_flete",
                          "number"
                        )}
                        <div className="col-span-2">
                          {renderInput(tr.transportInvoice, "factura_transporte")}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Observaciones */}
                  <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                    <div className="h-[2px] bg-gradient-to-r from-brand-blue/60 to-brand-teal/60" />
                    <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                        <Icon
                          icon="typcn:notes"
                          className="w-4 h-4 text-brand-blue"
                        />
                      </span>
                      <h2 className="text-xs font-bold text-neutral-600 uppercase tracking-wider">
                        {tr.observations}
                      </h2>
                    </div>
                    <div className="p-4">
                      <textarea
                        value={formData.observaciones}
                        onChange={(e) =>
                          handleChange("observaciones", e.target.value)
                        }
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
                        setSelectedId(null);
                        setIsNew(false);
                        setSuccess(false);
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
                        <>
                          <Icon
                            icon="typcn:refresh"
                            className="w-4 h-4 animate-spin"
                          />
                          {tr.saving}
                        </>
                      ) : (
                        <>
                          <Icon icon="typcn:tick" className="w-4 h-4" />
                          {isNew ? "Crear Reserva" : tr.save}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl bg-white border border-neutral-200 shadow-sm overflow-hidden flex items-center justify-center min-h-[280px]">
                  <div className="text-center py-8 px-4">
                    <span className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-3 inline-flex">
                      <Icon
                        icon="lucide:plus-circle"
                        width={24}
                        height={24}
                        className="text-neutral-400"
                      />
                    </span>
                    <p className="text-neutral-500 text-sm font-medium">
                      Selecciona una reserva de la lista o crea una nueva
                    </p>
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
                  Crear{" "}
                  {confirmNewItem.type === "empresa"
                    ? "empresa"
                    : confirmNewItem.type === "chofer"
                    ? "chofer"
                    : "equipo"}
                </h3>
                <p className="text-xs text-neutral-500">
                  ¿Confirmas agregar este nuevo elemento?
                </p>
              </div>
            </div>

            <p className="text-sm text-neutral-700 mb-6">
              Se creará{" "}
              {confirmNewItem.type === "empresa"
                ? "la empresa"
                : confirmNewItem.type === "chofer"
                ? "el chofer"
                : "el equipo"}
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
                {saving ? "Creando..." : "Confirmar"}
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
                <h3 className="font-semibold text-neutral-900">Eliminar reserva</h3>
                <p className="text-xs text-neutral-500">
                  Esta acción no se puede deshacer
                </p>
              </div>
            </div>
            <p className="text-sm text-neutral-700 mb-6">
              ¿Estás seguro de eliminar esta reserva de transporte externo?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2 rounded-xl text-sm font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(confirmDelete)}
                className="flex-1 px-4 py-2 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
