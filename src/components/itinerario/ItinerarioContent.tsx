import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { fetchPublicItinerarios, createItinerario, updateItinerario, deleteItinerario, updateItinerarioOperador } from "@/lib/itinerarios-service";
import type { ItinerarioWithEscalas } from "@/types/itinerarios";
import { format, getISOWeek, differenceInCalendarDays, addDays } from "date-fns";
import { AREAS_CANONICAL } from "@/lib/areas";
import ItinerarioMap from "./ItinerarioMap";

const DATE_DISPLAY = "dd/MM/yyyy";

function formatDate(dateStr: string | null): string {
  if (!dateStr?.trim()) return "—";
  try {
    const d = dateStr.includes("T") ? dateStr : `${dateStr}T12:00:00`;
    return format(new Date(d), DATE_DISPLAY);
  } catch {
    return dateStr;
  }
}

/** Convierte yyyy-MM-dd a DD/MM/yyyy para mostrar en inputs */
function toDDMMYYYY(iso: string): string {
  if (!iso?.trim()) return "";
  try {
    const s = iso.includes("T") ? iso.slice(0, 10) : iso;
    const [y, m, d] = s.split("-").map(Number);
    if (!y || !m || !d) return iso;
    const date = new Date(y, m - 1, d);
    return format(date, DATE_DISPLAY);
  } catch {
    return iso;
  }
}

/** Días de tránsito = ETA − ETD (diferencia en días). Devuelve null si falta alguna fecha. */
function diasTransito(etd: string, eta: string): number | null {
  if (!etd?.trim() || !eta?.trim()) return null;
  try {
    const etdDate = new Date(etd.includes("T") ? etd : `${etd}T12:00:00`);
    const etaDate = new Date(eta.includes("T") ? eta : `${eta}T12:00:00`);
    if (Number.isNaN(etdDate.getTime()) || Number.isNaN(etaDate.getTime())) return null;
    return differenceInCalendarDays(etaDate, etdDate);
  } catch {
    return null;
  }
}

/** Parsea DD/MM/yyyy y devuelve yyyy-MM-dd o null si no es válido */
function fromDDMMYYYY(s: string): string | null {
  const t = s.trim().replace(/\s/g, "");
  if (!t) return null;
  const match = t.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (!match) return null;
  const [, d, m, y] = match;
  const day = parseInt(d, 10);
  const month = parseInt(m, 10) - 1;
  const year = parseInt(y, 10);
  if (year < 1900 || year > 2100 || month < 0 || month > 11 || day < 1 || day > 31) return null;
  const date = new Date(year, month, day);
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return null;
  return format(date, "yyyy-MM-dd");
}

function getApiUrl(): string {
  try {
    const env = (import.meta as { env?: { PUBLIC_API_URL?: string } }).env;
    if (env?.PUBLIC_API_URL) return String(env.PUBLIC_API_URL);
  } catch {
    // ignore
  }
  return "";
}

type EscalaForm = { puerto: string; puerto_nombre: string; eta: string; dias_transito: string; area: string };

const initialEscala = (): EscalaForm => ({
  puerto: "",
  puerto_nombre: "",
  eta: "",
  dias_transito: "",
  area: "ASIA",
});

/** Servicio con detalle para rellenar itinerario (naves, destinos, puerto origen, naviera) */
type ServicioConDetalle = {
  id: string;
  nombre: string;
  naviera_nombre?: string | null;
  puerto_origen?: string | null;
  naves?: { nave_nombre?: string }[];
  destinos?: { puerto?: string; puerto_nombre?: string | null; area?: string | null }[];
};

/** Consorcio con servicios para rellenar itinerario desde el primer servicio */
type ConsorcioConDetalle = {
  id: string;
  nombre: string;
  servicios?: { servicio_unico?: ServicioConDetalle | null }[];
};

/** Obtiene la lista de naves del servicio o consorcio del itinerario (por nombre) */
function getNavesFromServicioOConsorcio(
  template: ItinerarioWithEscalas,
  servicioNombre: string,
  servicios: ServicioConDetalle[],
  consorcios: ConsorcioConDetalle[]
): string[] {
  const consorcioNombre = (template.consorcio ?? "").trim();
  if (consorcioNombre) {
    const c = consorcios.find((x) => (x.nombre ?? "").trim() === consorcioNombre);
    if (c?.servicios?.length) {
      const naves = c.servicios.flatMap((s) => s.servicio_unico?.naves ?? []).map((n) => (n.nave_nombre ?? "").trim()).filter(Boolean);
      return [...new Set(naves)];
    }
  }
  const servicioNombreKey = (template.servicio ?? servicioNombre ?? "").trim();
  if (servicioNombreKey) {
    const s = servicios.find((x) => (x.nombre ?? "").trim() === servicioNombreKey);
    if (s?.naves?.length) {
      return s.naves.map((n) => (n.nave_nombre ?? "").trim()).filter(Boolean);
    }
  }
  return [];
}

/** Obtiene la lista de navieras (operadores) del servicio o consorcio del itinerario */
function getNavierasForItinerario(
  it: ItinerarioWithEscalas,
  servicios: ServicioConDetalle[],
  consorcios: ConsorcioConDetalle[]
): string[] {
  const consorcioNombre = (it.consorcio ?? "").trim();
  if (consorcioNombre) {
    const c = consorcios.find((x) => (x.nombre ?? "").trim() === consorcioNombre);
    if (c?.servicios?.length) {
      const navieras = c.servicios
        .map((s) => s.servicio_unico?.naviera_nombre?.trim())
        .filter((n): n is string => Boolean(n));
      return [...new Set(navieras)];
    }
  }
  const servicioNombreKey = (it.servicio ?? "").trim();
  if (servicioNombreKey) {
    const s = servicios.find((x) => (x.nombre ?? "").trim() === servicioNombreKey);
    if (s?.naviera_nombre?.trim()) {
      return [s.naviera_nombre.trim()];
    }
  }
  return [];
}

export function ItinerarioContent() {
  const { t, locale } = useLocale();
  const { user: authUser } = useAuth() ?? {};
  const isLoggedIn = authUser != null;

  const tr = t.itinerarioPage ?? {
    title: "Itinerarios de Naves",
    subtitle: "Consulta pública de itinerarios marítimos.",
    resultsCount: "{{count}} itinerarios encontrados",
    emptyTitle: "No hay itinerarios disponibles",
    emptySubtitle: "Los itinerarios se mostrarán aquí cuando existan datos cargados.",
    loadError: "Error al cargar itinerarios.",
    colServicio: "Servicio",
    colNave: "Nave",
    colViaje: "Viaje",
    colPol: "POL",
    colEtd: "ETD",
    colEscalas: "Escalas",
    carriersInService: "Navieras que lo conforman",
    colSemana: "Semana",
    colDestinos: "Destinos",
    destinoDateTransit: "{{date}} · {{days}} días",
    newItinerary: "Nuevo itinerario",
    loadingItineraries: "Cargando itinerarios…",
    successCreated: "Itinerario creado correctamente.",
    errorCreate: "Error al crear itinerario",
    errorCompleteFields: "Complete nave, viaje, POL y ETD.",
    errorMinOneScale: "Agregue al menos una escala con puerto.",
    modalTitle: "Nuevo itinerario",
    modalDescription: "Elija un servicio o consorcio para rellenar automáticamente naviera, POL, naves y escalas. Luego complete viaje y fecha de salida.",
    sectionServiceConsortium: "Servicio o consorcio",
    service: "Servicio",
    serviceNone: "— Ninguno / manual —",
    serviceHint: "Se rellenan naviera, POL y escalas.",
    consortium: "Consorcio",
    consortiumHint: "Se usan los datos del primer servicio.",
    sectionVesselVoyage: "Naviera y viaje",
    carrier: "Naviera",
    carrierPlaceholder: "Nombre de la naviera",
    vessel: "Nave",
    vesselPlaceholder: "Nombre de la nave",
    voyage: "Viaje",
    voyagePlaceholder: "Nº o nombre del viaje",
    sectionDeparture: "Salida",
    polLabel: "Puerto de origen (POL)",
    polPlaceholder: "Código o nombre",
    etdLabel: "Fecha salida (ETD)",
    datePlaceholder: "DD/MM/AAAA",
    pickDate: "Elegir fecha",
    pickDateAria: "Abrir calendario para elegir fecha",
    weekLabel: "Semana (del ETD)",
    weekAria: "Semana del ETD (calculada automáticamente)",
    sectionScales: "Escalas (puertos de destino)",
    addScale: "Añadir escala",
    portCode: "Código puerto",
    portCodePlaceholder: "Ej. CNSHA",
    portName: "Nombre puerto",
    portNamePlaceholder: "Ej. Shanghai",
    eta: "ETA",
    pickEtaAria: "Abrir calendario ETA",
    daysTransit: "Días tránsito",
    daysTransitPlaceholder: "0",
    area: "Área",
    removeScale: "Quitar escala",
    cancel: "Cancelar",
    create: "Crear itinerario",
    saving: "Guardando…",
    selectServiceAria: "Seleccionar servicio para rellenar naviera, POL y destinos",
    selectConsortiumAria: "Seleccionar consorcio para rellenar naviera, POL y destinos",
    saveChanges: "Guardar cambios",
    modalTitleEdit: "Editar itinerario",
    editItinerary: "Editar",
    editItineraryAria: "Editar itinerario (nave {{nave}}, viaje {{viaje}})",
    colActions: "Acciones",
    successUpdated: "Itinerario actualizado correctamente.",
    addRow: "Añadir fila",
    addRowModalTitle: "Añadir fila al itinerario",
    addRowModalDescription: "Misma ruta y días de tránsito que la primera fila. Elija nave, viaje y ETD; las fechas de llegada se calcularán automáticamente.",
    addRowNaveLabel: "Nave",
    addRowViajeLabel: "Viaje",
    addRowEtdLabel: "Fecha salida (ETD)",
    addRowSubmit: "Añadir fila",
    addRowSuccess: "Fila añadida correctamente.",
    deleteItinerary: "Eliminar",
    deleteItineraryAria: "Eliminar itinerario (nave {{nave}}, viaje {{viaje}})",
    confirmDeleteItinerary: "¿Eliminar este itinerario ({{nave}} / {{viaje}})? Esta acción no se puede deshacer.",
    successDeleted: "Itinerario eliminado correctamente.",
    colOperador: "Operador",
  };
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [operadorUpdatingId, setOperadorUpdatingId] = useState<string | null>(null);
  const [expandedAreas, setExpandedAreas] = useState<Record<string, boolean>>({});
  const [selectedAreaFromMap, setSelectedAreaFromMap] = useState<string | null>(null);
  const [itinerarios, setItinerarios] = useState<ItinerarioWithEscalas[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItinerarioId, setEditingItinerarioId] = useState<string | null>(null);
  const [addRowModalOpen, setAddRowModalOpen] = useState(false);
  const [addRowContext, setAddRowContext] = useState<{
    template: ItinerarioWithEscalas;
    servicioNombre: string;
    area: string;
  } | null>(null);
  const [addRowForm, setAddRowForm] = useState({ nave: "", viaje: "", etd: "" });
  const [addRowEtdInputValue, setAddRowEtdInputValue] = useState("");
  const [addRowModalError, setAddRowModalError] = useState<string | null>(null);
  const [addRowSaving, setAddRowSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [serviciosConDetalle, setServiciosConDetalle] = useState<ServicioConDetalle[]>([]);
  const [consorciosConDetalle, setConsorciosConDetalle] = useState<ConsorcioConDetalle[]>([]);
  const [selectedServicioId, setSelectedServicioId] = useState("");
  const [selectedConsorcioId, setSelectedConsorcioId] = useState("");
  const [etdInputValue, setEtdInputValue] = useState("");
  const [etaInputValues, setEtaInputValues] = useState<string[]>([]);
  const modalRef = useRef<HTMLDivElement>(null);


  const [form, setForm] = useState({
    servicio: "",
    consorcio: "",
    naviera: "",
    nave: "",
    viaje: "",
    semana: "" as string | number,
    pol: "",
    etd: format(new Date(), "yyyy-MM-dd"),
    escalas: [initialEscala()] as EscalaForm[],
  });

  const loadItinerarios = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPublicItinerarios();
      setItinerarios(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : tr.loadError);
      setItinerarios([]);
    } finally {
      setLoading(false);
    }
  }, [tr.loadError]);

  useEffect(() => {
    loadItinerarios();
  }, [loadItinerarios]);

  useEffect(() => {
    if (!modalOpen && !addRowModalOpen && !isLoggedIn) return;
    const base = getApiUrl() || "";
    Promise.all([
      fetch(`${base}/api/admin/servicios-unicos`, { credentials: "include" }).then((r) => r.ok ? r.json() : { servicios: [] }),
      fetch(`${base}/api/admin/consorcios`, { credentials: "include" }).then((r) => r.ok ? r.json() : { consorcios: [] }),
    ]).then(([s, c]) => {
      setServiciosConDetalle((s as { servicios?: ServicioConDetalle[] }).servicios ?? []);
      setConsorciosConDetalle((c as { consorcios?: ConsorcioConDetalle[] }).consorcios ?? []);
    });
  }, [modalOpen, addRowModalOpen, isLoggedIn]);

  useEffect(() => {
    if (!modalOpen) return;
    setEtdInputValue(toDDMMYYYY(form.etd));
    setEtaInputValues(form.escalas.map((e) => toDDMMYYYY(e.eta ?? "")));
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) return;
    setEtaInputValues((prev) => {
      const len = form.escalas.length;
      if (prev.length !== len) {
        return form.escalas.map((e) => toDDMMYYYY(e.eta ?? ""));
      }
      return prev;
    });
  }, [modalOpen, form.escalas.length]);

  const applyServicioToForm = useCallback((s: ServicioConDetalle) => {
    const destinos = s.destinos && s.destinos.length > 0 ? s.destinos : [];
    setForm((prev) => ({
      ...prev,
      servicio: s.nombre ?? "",
      consorcio: "",
      naviera: (s.naviera_nombre ?? "").trim(),
      pol: (s.puerto_origen ?? "").trim(),
      nave: (s.naves?.[0]?.nave_nombre != null ? String(s.naves[0].nave_nombre).trim() : "") || prev.nave,
      escalas:
        destinos.length > 0
          ? destinos.map((d) => ({
              puerto: (d.puerto ?? "").trim(),
              puerto_nombre: (d.puerto_nombre ?? "").trim(),
              eta: "",
              dias_transito: "",
              area: (d.area ?? "ASIA").trim() || "ASIA",
            }))
          : prev.escalas,
    }));
    setSelectedConsorcioId("");
    setSelectedServicioId(s.id);
  }, []);

  const applyConsorcioToForm = useCallback((c: ConsorcioConDetalle) => {
    const firstServicio = c.servicios?.[0]?.servicio_unico;
    const navierasDelConsorcio = [
      ...new Set(
        (c.servicios ?? [])
          .map((s) => s.servicio_unico?.naviera_nombre?.trim())
          .filter((n): n is string => Boolean(n))
      ),
    ].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

    if (!firstServicio) {
      setForm((prev) => ({
        ...prev,
        servicio: (c.nombre ?? "").trim(),
        consorcio: (c.nombre ?? "").trim(),
        naviera: navierasDelConsorcio.join(", "),
      }));
      setSelectedServicioId("");
      setSelectedConsorcioId(c.id);
      return;
    }
    const destinos = firstServicio.destinos && firstServicio.destinos.length > 0 ? firstServicio.destinos : [];
    setForm((prev) => ({
      ...prev,
      servicio: (c.nombre ?? "").trim(),
      consorcio: (c.nombre ?? "").trim(),
      naviera: navierasDelConsorcio.length > 0 ? navierasDelConsorcio.join(", ") : (firstServicio.naviera_nombre ?? "").trim(),
      pol: (firstServicio.puerto_origen ?? "").trim(),
      nave: (firstServicio.naves?.[0]?.nave_nombre != null ? String(firstServicio.naves[0].nave_nombre).trim() : "") || prev.nave,
      escalas:
        destinos.length > 0
          ? destinos.map((d) => ({
              puerto: (d.puerto ?? "").trim(),
              puerto_nombre: (d.puerto_nombre ?? "").trim(),
              eta: "",
              dias_transito: "",
              area: (d.area ?? "ASIA").trim() || "ASIA",
            }))
          : prev.escalas,
    }));
    setSelectedServicioId("");
    setSelectedConsorcioId(c.id);
  }, []);

  const handleOpenModal = useCallback(() => {
    setModalError(null);
    setEditingItinerarioId(null);
    setSelectedServicioId("");
    setSelectedConsorcioId("");
    setForm({
      servicio: "",
      consorcio: "",
      naviera: "",
      nave: "",
      viaje: "",
      semana: "",
      pol: "",
      etd: format(new Date(), "yyyy-MM-dd"),
      escalas: [initialEscala()],
    });
    setEtdInputValue(toDDMMYYYY(format(new Date(), "yyyy-MM-dd")));
    setEtaInputValues([""]);
    setModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((it: ItinerarioWithEscalas) => {
    setModalError(null);
    setEditingItinerarioId(it.id);
    setSelectedServicioId("");
    setSelectedConsorcioId("");
    const etdIso = it.etd ? (it.etd.includes("T") ? it.etd.slice(0, 10) : it.etd) : format(new Date(), "yyyy-MM-dd");
    const escalasForm: EscalaForm[] =
      (it.escalas ?? []).length > 0
        ? (it.escalas ?? []).map((e) => ({
            puerto: (e.puerto ?? "").trim(),
            puerto_nombre: (e.puerto_nombre ?? "").trim(),
            eta: (e.eta ?? "").includes("T") ? (e.eta ?? "").slice(0, 10) : (e.eta ?? "").trim(),
            dias_transito: e.dias_transito != null ? String(e.dias_transito) : "",
            area: (e.area ?? "ASIA").trim() || "ASIA",
          }))
        : [initialEscala()];
    setForm({
      servicio: (it.servicio ?? "").trim(),
      consorcio: (it.consorcio ?? "").trim(),
      naviera: (it.naviera ?? "").trim(),
      nave: (it.nave ?? "").trim(),
      viaje: (it.viaje ?? "").trim(),
      semana: it.semana ?? "",
      pol: (it.pol ?? "").trim(),
      etd: etdIso,
      escalas: escalasForm,
    });
    setEtdInputValue(toDDMMYYYY(etdIso));
    setEtaInputValues(escalasForm.map((e) => toDDMMYYYY(e.eta || "")));
    setModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setModalError(null);
    setEditingItinerarioId(null);
  }, []);

  const handleOperadorChange = useCallback(
    async (it: ItinerarioWithEscalas, operador: string) => {
      const value = operador.trim() || null;
      setOperadorUpdatingId(it.id);
      try {
        await updateItinerarioOperador(it.id, value);
        loadItinerarios();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al actualizar operador");
      } finally {
        setOperadorUpdatingId(null);
      }
    },
    [loadItinerarios]
  );

  const handleDelete = useCallback(
    async (it: ItinerarioWithEscalas) => {
      const msg = tr.confirmDeleteItinerary
        .replace("{{nave}}", it.nave ?? "")
        .replace("{{viaje}}", it.viaje ?? "");
      if (!window.confirm(msg)) return;
      setDeletingId(it.id);
      try {
        await deleteItinerario(it.id);
        setSuccessMessage(tr.successDeleted);
        setTimeout(() => setSuccessMessage(null), 4000);
        loadItinerarios();
      } catch (e) {
        setError(e instanceof Error ? e.message : tr.errorCreate);
      } finally {
        setDeletingId(null);
      }
    },
    [loadItinerarios, tr]
  );

  const handleOpenAddRowModal = useCallback((template: ItinerarioWithEscalas, servicioNombre: string, area: string) => {
    setAddRowContext({ template, servicioNombre, area });
    setAddRowForm({
      nave: "",
      viaje: "",
      etd: template.etd ? (template.etd.includes("T") ? template.etd.slice(0, 10) : template.etd) : format(new Date(), "yyyy-MM-dd"),
    });
    setAddRowEtdInputValue(
      template.etd ? toDDMMYYYY(template.etd.includes("T") ? template.etd.slice(0, 10) : template.etd) : toDDMMYYYY(format(new Date(), "yyyy-MM-dd"))
    );
    setAddRowModalError(null);
    setAddRowModalOpen(true);
  }, []);

  const handleCloseAddRowModal = useCallback(() => {
    setAddRowModalOpen(false);
    setAddRowContext(null);
    setAddRowModalError(null);
  }, []);

  const addRowNaves = addRowContext
    ? getNavesFromServicioOConsorcio(addRowContext.template, addRowContext.servicioNombre, serviciosConDetalle, consorciosConDetalle)
    : [];

  useEffect(() => {
    if (!addRowModalOpen || !addRowContext || addRowForm.nave !== "") return;
    if (addRowNaves.length > 0) {
      setAddRowForm((f) => ({ ...f, nave: addRowNaves[0] }));
    }
  }, [addRowModalOpen, addRowContext, addRowNaves.length]);

  const handleSubmitAddRow = useCallback(async () => {
    if (!addRowContext) return;
    const { template, area } = addRowContext;
    const nave = addRowForm.nave.trim();
    const viaje = addRowForm.viaje.trim();
    const etdFromForm = addRowForm.etd?.trim() ?? "";
    const etdIso = (etdFromForm.includes("T") ? etdFromForm.slice(0, 10) : etdFromForm) || fromDDMMYYYY(addRowEtdInputValue) || "";
    if (!nave || !viaje || !etdIso) {
      setAddRowModalError(tr.errorCompleteFields);
      return;
    }
    const escalasDelArea = (template.escalas ?? []).filter((e) => ((e.area || "").trim() || "") === area);
    if (escalasDelArea.length === 0) {
      setAddRowModalError(tr.errorMinOneScale);
      return;
    }
    const etdDate = new Date(etdIso + "T12:00:00");
    if (Number.isNaN(etdDate.getTime())) {
      setAddRowModalError(tr.errorCompleteFields);
      return;
    }
    const escalas = escalasDelArea.map((e, i) => {
      const dias = e.dias_transito ?? 0;
      const etaDate = addDays(etdDate, dias);
      const etaStr = format(etaDate, "yyyy-MM-dd");
      return {
        puerto: (e.puerto ?? "").trim(),
        puerto_nombre: (e.puerto_nombre ?? "").trim() || null,
        eta: etaStr,
        dias_transito: dias,
        area: (e.area ?? "ASIA").trim() || "ASIA",
      };
    });
    setAddRowSaving(true);
    setAddRowModalError(null);
    try {
      await createItinerario({
        servicio: (template.servicio ?? "").trim() || tr.service,
        consorcio: (template.consorcio ?? "").trim() || null,
        naviera: (template.naviera ?? "").trim() || null,
        nave,
        viaje,
        semana: getISOWeek(etdDate),
        pol: (template.pol ?? "").trim(),
        etd: etdIso,
        escalas,
      });
      handleCloseAddRowModal();
      setSuccessMessage(tr.addRowSuccess);
      setTimeout(() => setSuccessMessage(null), 4000);
      loadItinerarios();
    } catch (e) {
      setAddRowModalError(e instanceof Error ? e.message : tr.errorCreate);
    } finally {
      setAddRowSaving(false);
    }
  }, [addRowContext, addRowForm, addRowEtdInputValue, tr, handleCloseAddRowModal, loadItinerarios]);


  useEffect(() => {
    if (modalOpen && modalRef.current) {
      const first = modalRef.current.querySelector<HTMLInputElement>("input, select");
      first?.focus();
    }
  }, [modalOpen]);

  const handleSubmit = useCallback(async () => {
    setModalError(null);
    const nave = form.nave.trim();
    const viaje = form.viaje.trim();
    const pol = form.pol.trim();
    const etd = form.etd;
    if (!nave || !viaje || !pol || !etd) {
      setModalError(tr.errorCompleteFields);
      return;
    }
    const escalasOk = form.escalas
      .map((e) => {
        const eta = e.eta.trim() || null;
        const calculated = diasTransito(etd, eta ?? "");
        return {
          puerto: e.puerto.trim(),
          puerto_nombre: e.puerto_nombre.trim() || null,
          eta,
          dias_transito: calculated ?? (e.dias_transito.trim() ? parseInt(e.dias_transito, 10) : null),
          area: e.area || "ASIA",
        };
      })
      .filter((e) => e.puerto);
    if (escalasOk.length === 0) {
      setModalError(tr.errorMinOneScale);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        servicio: form.servicio.trim() || tr.service,
        consorcio: form.consorcio.trim() || null,
        naviera: form.naviera.trim() || null,
        nave,
        viaje,
        semana: form.etd ? getISOWeek(new Date(form.etd.includes("T") ? form.etd : `${form.etd}T12:00:00`)) : null,
        pol,
        etd: etd.includes("T") ? etd.slice(0, 10) : etd,
        escalas: escalasOk,
      };
      if (editingItinerarioId) {
        await updateItinerario(editingItinerarioId, payload);
        setSuccessMessage(tr.successUpdated);
      } else {
        await createItinerario(payload);
        setSuccessMessage(tr.successCreated);
      }
      handleCloseModal();
      setTimeout(() => setSuccessMessage(null), 4000);
      loadItinerarios();
    } catch (e) {
      setModalError(e instanceof Error ? e.message : tr.errorCreate);
    } finally {
      setSaving(false);
    }
  }, [form, editingItinerarioId, handleCloseModal, loadItinerarios, tr]);

  const addEscala = useCallback(() => {
    setForm((f) => ({ ...f, escalas: [...f.escalas, initialEscala()] }));
    setEtaInputValues((prev) => [...prev, ""]);
  }, []);

  const removeEscala = useCallback((index: number) => {
    setForm((f) => ({
      ...f,
      escalas: f.escalas.length > 1 ? f.escalas.filter((_, i) => i !== index) : f.escalas,
    }));
    setEtaInputValues((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateEscala = useCallback((index: number, field: keyof EscalaForm, value: string) => {
    setForm((f) => {
      const next = [...f.escalas];
      next[index] = { ...next[index], [field]: value };
      return { ...f, escalas: next };
    });
  }, []);

  const isMapOnlyView = !loading && !selectedAreaFromMap;

  const areasWithData = itinerarios.length > 0
    ? [...new Set(itinerarios.flatMap((it) => (it.escalas ?? []).map((e) => (e.area || "").trim()).filter(Boolean)))]
    : [];
  const itinerariosForPorts =
    selectedAreaFromMap && itinerarios.length > 0
      ? itinerarios.filter((it) =>
          (it.escalas ?? []).some((e) => ((e.area || "").trim() || "") === selectedAreaFromMap)
        )
      : itinerarios;
  const portNames = [
    ...new Set(
      itinerariosForPorts.flatMap((it) => {
        const names: string[] = [];
        if (it.pol?.trim()) names.push(it.pol.trim());
        (it.escalas ?? []).forEach((e) => {
          if (e.puerto?.trim()) names.push(e.puerto.trim());
          if (e.puerto_nombre?.trim()) names.push(e.puerto_nombre.trim());
        });
        return names;
      })
    ),
  ].filter(Boolean);

  // Layout: usar siempre toda la pantalla sin bordes (mínimo padding solo donde haga falta).
  return (
    <main
      className="flex-1 min-h-0 min-w-0 w-full bg-brand-blue flex flex-col overflow-hidden"
      role="main"
    >
      {/* Título y acciones arriba: mínimo padding para usar toda la pantalla */}
      <header className="flex-shrink-0 flex flex-wrap items-start justify-between gap-4 w-full px-4 py-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {tr.title}
          </h1>
          <p className="text-white/90 text-sm mt-2">{tr.subtitle}</p>
        </div>
        {isLoggedIn && (
          <button
            type="button"
            onClick={handleOpenModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white text-brand-blue text-sm font-medium hover:bg-white/95 focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label={tr.newItinerary}
          >
            <Icon icon="lucide:plus" width={18} height={18} />
            {tr.newItinerary}
          </button>
        )}
      </header>

      {/* Pantalla de selección de área: tarjeta con mapa a pantalla completa sin bordes */}
      {!selectedAreaFromMap && (
        <section className="flex-1 min-h-0 flex flex-col w-full overflow-hidden">
          <div className="flex-1 min-h-0 w-full h-full flex flex-col overflow-hidden bg-white">
            <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
              {/* Columna info */}
              <div className="w-full lg:w-1/2 flex flex-col gap-5 px-6 sm:px-8 py-6 sm:py-8 bg-gradient-to-br from-white via-brand-blue/[0.03] to-neutral-50/80 border-b lg:border-b-0 lg:border-r border-neutral-200/80">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-lg bg-brand-blue/10 px-3 py-1.5 text-xs font-medium text-brand-blue mb-4">
                    <Icon icon="lucide:map-pin" width={14} height={14} aria-hidden />
                    Vista global
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-brand-blue tracking-tight">
                    Descubre tus itinerarios en el mapa
                  </h2>
                  <p className="mt-3 text-sm text-neutral-600 leading-relaxed max-w-md">
                    Explora tus servicios por área (América, Europa, Asia e India-Medio Oriente),
                    entiende mejor tus rutas y explícale a tus clientes desde qué puertos salen los buques y a qué destinos llegan.
                  </p>
                </div>
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-neutral-800 flex items-center gap-2">
                    <Icon icon="lucide:help-circle" width={16} height={16} className="text-brand-blue/80" aria-hidden />
                    ¿Cómo usar esta vista?
                  </h3>
                  <ul className="space-y-3 text-sm text-neutral-700">
                    <li className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand-blue/10 text-brand-blue">
                        <Icon icon="lucide:mouse" width={12} height={12} aria-hidden />
                      </span>
                      <span>Pasa el mouse sobre las regiones para ver dónde tienes itinerarios activos.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand-blue/10 text-brand-blue">
                        <Icon icon="lucide:mouse-pointer" width={12} height={12} aria-hidden />
                      </span>
                      <span>Haz clic en una región (Asia, Europa, América, India-Medio Oriente) para filtrar la tabla de itinerarios.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand-blue/10 text-brand-blue">
                        <Icon icon="lucide:users" width={12} height={12} aria-hidden />
                      </span>
                      <span>Después de elegir un área, revisa en la tabla las semanas, naves, ETD/ETA y días de tránsito por destino.</span>
                    </li>
                  </ul>
                </div>
                <div className="mt-auto pt-4">
                  <p className="rounded-xl bg-neutral-100/90 px-4 py-3 text-xs text-neutral-600 border border-neutral-200/60">
                    <strong className="text-neutral-700">Tip:</strong> Combina esta vista con la tabla inferior para revisar semanas, naves y tiempos de tránsito por destino.
                  </p>
                </div>
              </div>
              {/* Columna mapa */}
              <div className="w-full lg:w-1/2 flex-1 min-h-[220px] lg:min-h-0 relative bg-neutral-100/50">
                <div className="absolute inset-0 overflow-hidden border-l border-neutral-200/60">
                  <ItinerarioMap
                    compact={false}
                    selectedArea={selectedAreaFromMap}
                    onSelectArea={setSelectedAreaFromMap}
                    areasWithData={areasWithData}
                    portNames={portNames}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Tablas: zona con scroll a pantalla completa cuando hay área seleccionada */}
      <div
        className={`overflow-auto w-full px-4 py-4 ${
          selectedAreaFromMap ? "flex-1 min-h-0" : "hidden"
        }`}
      >
        {selectedAreaFromMap && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/10 border border-white/20 px-4 py-2.5 text-sm text-white">
            <span>
              Mostrando itinerarios para el área{" "}
              <span className="font-semibold">
                {selectedAreaFromMap}
              </span>
              .
            </span>
            <button
              type="button"
              onClick={() => setSelectedAreaFromMap(null)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/90 text-brand-blue px-3 py-1.5 text-xs font-medium hover:bg-white focus:outline-none focus:ring-2 focus:ring-white/60"
            >
              <Icon icon="lucide:globe-2" width={14} height={14} aria-hidden />
              Ver todas las áreas
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/20 text-white text-sm border border-emerald-400/50 flex items-center gap-2" role="status">
            <Icon icon="lucide:check-circle" width={20} height={20} />
            {successMessage}
          </div>
        )}

        {error && (
          <div
            className="p-4 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200 mb-6"
            role="alert"
          >
            <div className="flex items-center gap-2">
              <Icon icon="lucide:alert-circle" width={20} height={20} />
              {error}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16 min-h-[200px]">
            <Icon
              icon="lucide:loader-2"
              width={40}
              height={40}
              className="animate-spin text-white"
              aria-hidden
            />
            <span className="text-white text-sm">{tr.loadingItineraries}</span>
          </div>
        ) : (
          <>
            {itinerarios.length === 0 && !isMapOnlyView && (
              <div className="mt-6 bg-white rounded-2xl shadow-mac-modal border border-black/5 p-8 text-center">
                <Icon icon="lucide:ship" width={48} height={48} className="mx-auto mb-4 text-neutral-400" />
                <p className="text-neutral-600 font-medium">{tr.emptyTitle}</p>
                <p className="text-sm text-neutral-500 mt-1">{tr.emptySubtitle}</p>
              </div>
            )}

            {itinerarios.length > 0 && !selectedAreaFromMap && !isMapOnlyView && (
              <p className="text-center text-white/90 text-sm py-6 px-4">
                {tr.mapSelectHint ?? "Selecciona una región en el mapa para ver los itinerarios."}
              </p>
            )}

            {itinerarios.length > 0 && selectedAreaFromMap && (() => {
              type ItinerarioWithEscalasType = typeof itinerarios[0];
              const byServicio = new Map<string, ItinerarioWithEscalasType[]>();
              for (const it of itinerarios) {
                const key = (it.servicio || "").trim() || "—";
                const list = byServicio.get(key) ?? [];
                list.push(it);
                byServicio.set(key, list);
              }
              const servicioNames = [...byServicio.keys()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
              const areaOrder = ["ASIA", "EUROPA", "AMERICA", "INDIA-MEDIOORIENTE", ""];
              const sortArea = (a: string, b: string) => {
                const iA = areaOrder.indexOf(a);
                const iB = areaOrder.indexOf(b);
                if (iA >= 0 && iB >= 0) return iA - iB;
                if (iA >= 0) return -1;
                if (iB >= 0) return 1;
                return a.localeCompare(b, undefined, { sensitivity: "base" });
              };
              const filteredServicioNames = servicioNames.filter((nombre) => {
                const list = byServicio.get(nombre)!;
                return list.some((it) =>
                  (it.escalas ?? []).some((e) => ((e.area || "").trim() || "") === selectedAreaFromMap)
                );
              });

              return (
                <div className="space-y-8 mt-8">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 text-white text-sm font-medium backdrop-blur-sm border border-white/20">
                      <Icon icon="lucide:list" width={16} height={16} aria-hidden />
                      {tr.resultsCount.replace("{{count}}", String(itinerarios.length))}
                    </span>
                  </div>

                  {filteredServicioNames.map((servicioNombre) => {
                const list = byServicio.get(servicioNombre)!;
                const navieras = [...new Set(list.map((it) => it.naviera).filter(Boolean))] as string[];
                const areasSet = new Set<string>();
                for (const it of list) {
                  for (const e of it.escalas ?? []) {
                    areasSet.add((e.area || "").trim() || "");
                  }
                }
                const areasRaw = areasSet.size > 0 ? [...areasSet].sort(sortArea) : [""];
                const areas = selectedAreaFromMap
                  ? areasRaw.filter((a) => (a || "").trim() === selectedAreaFromMap)
                  : areasRaw;

                return (
                  <section key={servicioNombre}>
                    <div className="relative bg-white rounded-2xl border border-neutral-200/80 shadow-mac-modal overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-blue" aria-hidden />
                      <div className="p-5 sm:p-6 pl-6 border-b border-neutral-200/70 bg-neutral-50/60 flex items-start justify-between gap-4 flex-wrap">
                        <div className="space-y-2">
                          <h2 className="text-xl font-bold text-brand-blue tracking-tight">
                            {servicioNombre}
                          </h2>
                          {navieras.length > 0 && (
                            <p className="text-sm text-neutral-600 flex items-center gap-2 flex-wrap">
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-brand-blue/10 text-brand-blue">
                                <Icon icon="lucide:ship" width={14} height={14} className="shrink-0" aria-hidden />
                                {tr.carriersInService}:
                              </span>
                              <span className="font-medium text-neutral-700">{navieras.join(", ")}</span>
                            </p>
                          )}
                        </div>
                        {areas.length === 1 && (
                          <div className="ml-auto">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white shadow-sm border border-neutral-200/80">
                              <Icon icon="lucide:map-pin" width={20} height={20} className="shrink-0 text-brand-blue/80" aria-hidden />
                              <div className="text-right">
                                <p className="text-[11px] font-medium text-neutral-500 uppercase tracking-[0.18em]">
                                  Área
                                </p>
                                <p className="mt-0.5 text-lg sm:text-xl font-semibold text-neutral-900 tracking-tight uppercase">
                                  {areas[0] || "Sin área"}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {areas.map((area, areaIndex) => {
                      const itinerariosEnArea = list.filter((it) => {
                        const esc = it.escalas ?? [];
                        if (area === "") return esc.length === 0 || esc.every((e) => ((e.area || "").trim() || "") === "");
                        return esc.some((e) => ((e.area || "").trim() || "") === area);
                      });
                      if (itinerariosEnArea.length === 0) return null;

                      const escalasEnArea = itinerariosEnArea.flatMap((it) =>
                        (it.escalas ?? []).filter((e) => ((e.area || "").trim() || "") === area)
                      );
                      const portKeysByEta = new Map<string, number>();
                      for (const e of escalasEnArea) {
                        const key = e.puerto_nombre || e.puerto || "—";
                        if (!key) continue;
                        const t = e.eta ? new Date(e.eta).getTime() : Infinity;
                        if (!portKeysByEta.has(key) || t < (portKeysByEta.get(key) ?? Infinity)) {
                          portKeysByEta.set(key, t);
                        }
                      }
                      const destinosColumnas = [...portKeysByEta.entries()]
                        .sort((a, b) => a[1] - b[1])
                        .map(([nombre]) => nombre);

                      const getEscalaForPort = (escalas: ItinerarioWithEscalasType["escalas"], portKey: string) =>
                        (escalas ?? []).find((e) => ((e.puerto_nombre || e.puerto) || "—") === portKey);

                      const areaKey = `${servicioNombre}__${area || "sin-area"}`;
                      const isExpanded = expandedAreas[areaKey] ?? false;

                      const displayedItinerarios = isExpanded ? itinerariosEnArea : itinerariosEnArea.slice(0, 4);

                      return (
                        <div
                          key={`${servicioNombre}-${area}`}
                          className={areaIndex === 0 ? "" : "border-t border-neutral-200"}
                        >
                          <div className="px-4 py-3 bg-gradient-to-r from-brand-blue/8 via-neutral-50/80 to-white flex items-center justify-between gap-3 flex-wrap">
                            {areas.length > 1 ? (
                              <h3 className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/90 border border-neutral-200/80 text-xs font-semibold text-brand-blue uppercase tracking-wider shadow-sm">
                                <Icon icon="lucide:map-pin" width={16} height={16} className="shrink-0" aria-hidden />
                                <span>{area || "Sin área"}</span>
                              </h3>
                            ) : (
                              <div className="flex-1" />
                            )}
                            {isLoggedIn && (
                              <button
                                type="button"
                                onClick={() => handleOpenAddRowModal(itinerariosEnArea[0], servicioNombre, area)}
                                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-brand-blue rounded-lg hover:bg-brand-blue/90 focus:outline-none focus:ring-2 focus:ring-brand-blue/50 transition-colors"
                                aria-label={tr.addRow}
                              >
                                <Icon icon="lucide:plus" width={16} height={16} aria-hidden />
                                {tr.addRow}
                              </button>
                            )}
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm" role="table">
                              <thead>
                                <tr className="border-b-2 border-neutral-200 bg-neutral-100/80">
                                  <th className="text-center px-3 py-3.5 font-semibold text-neutral-700 whitespace-nowrap">
                                    {tr.colSemana}
                                  </th>
                                  <th className="text-center px-3 py-3.5 font-semibold text-neutral-700 whitespace-nowrap">
                                    {tr.colNave}
                                  </th>
                                  <th className="text-center px-3 py-3.5 font-semibold text-neutral-700 whitespace-nowrap">
                                    {tr.colOperador}
                                  </th>
                                  <th className="text-center px-3 py-3.5 font-semibold text-neutral-700 whitespace-nowrap">
                                    {tr.colViaje}
                                  </th>
                                  <th className="text-center px-3 py-3.5 font-semibold text-neutral-700 whitespace-nowrap">
                                    <span className="block">{tr.colPol}</span>
                                    <span className="block text-xs font-normal text-neutral-500 mt-0.5">{tr.colEtd}</span>
                                  </th>
                                  {destinosColumnas.map((portKey) => (
                                    <th
                                      key={portKey}
                                      className="text-center px-3 py-3.5 font-semibold text-neutral-700 whitespace-nowrap min-w-[100px] bg-brand-blue/[0.06]"
                                    >
                                      <span className="block text-brand-blue font-medium">{portKey}</span>
                                      <span className="block text-xs font-normal text-neutral-500 mt-0.5">
                                        {tr.eta} / {tr.daysTransit}
                                      </span>
                                    </th>
                                  ))}
                                  {isLoggedIn && (
                                    <th className="text-center px-3 py-3.5 font-semibold text-neutral-700 whitespace-nowrap min-w-[180px]">
                                      {tr.colActions}
                                    </th>
                                  )}
                                </tr>
                              </thead>
                              <tbody>
                                {displayedItinerarios.map((it, rowIndex) => {
                                  const escalas = it.escalas ?? [];
                                  const isEven = rowIndex % 2 === 0;
                                  return (
                                    <tr
                                      key={it.id}
                                      className={`border-b border-neutral-100 last:border-0 transition-colors duration-150 ${
                                        isEven ? "bg-white" : "bg-neutral-50/40"
                                      } hover:bg-brand-blue/[0.04]`}
                                    >
                                      <td className="px-3 py-3 text-center align-middle">
                                        {it.semana != null ? (
                                          <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-md bg-brand-blue/10 text-brand-blue font-semibold text-sm">
                                            {String(it.semana)}
                                          </span>
                                        ) : (
                                          <span className="text-neutral-400">—</span>
                                        )}
                                      </td>
                                      <td className="px-3 py-3 text-neutral-700 whitespace-nowrap text-center align-middle">
                                        <span className="font-medium text-neutral-800">{it.nave || "—"}</span>
                                        {it.naviera ? (
                                          <span className="text-neutral-500 text-xs block mt-0.5">{it.naviera}</span>
                                        ) : null}
                                      </td>
                                      <td className="px-3 py-3 text-center align-middle">
                                        {isLoggedIn ? (
                                          (() => {
                                            const navierasOp = getNavierasForItinerario(it, serviciosConDetalle, consorciosConDetalle);
                                            const updating = operadorUpdatingId === it.id;

                                            // Asegurar que el valor seleccionado siempre coincida con una opción visible
                                            const trimmedOperador = (it.operador || "").trim();
                                            const trimmedNaviera = (it.naviera || "").trim();

                                            const currentValue =
                                              trimmedOperador && navierasOp.includes(trimmedOperador)
                                                ? trimmedOperador
                                                : navierasOp.includes(trimmedNaviera)
                                                ? trimmedNaviera
                                                : "";

                                            return (
                                              <select
                                                value={currentValue}
                                                onChange={(e) => handleOperadorChange(it, e.target.value)}
                                                disabled={updating}
                                                className="w-full max-w-[140px] mx-auto px-2 py-1.5 text-sm rounded-lg border border-neutral-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue disabled:opacity-60"
                                                aria-label={tr.colOperador}
                                              >
                                                <option value="">—</option>
                                                {navierasOp.map((n) => (
                                                  <option key={n} value={n}>
                                                    {n}
                                                  </option>
                                                ))}
                                              </select>
                                            );
                                          })()
                                        ) : (
                                          <span className="text-neutral-700">{it.operador || "—"}</span>
                                        )}
                                      </td>
                                      <td className="px-3 py-3 text-neutral-700 font-medium whitespace-nowrap text-center align-middle">{it.viaje || "—"}</td>
                                      <td className="px-3 py-3 text-neutral-700 whitespace-nowrap text-center align-middle">
                                        <span className="block font-medium">{it.pol || "—"}</span>
                                        <span className="block text-xs text-neutral-500 mt-0.5">{it.etd ? formatDate(it.etd) : "—"}</span>
                                      </td>
                                      {destinosColumnas.map((portKey) => {
                                        const e = getEscalaForPort(escalas, portKey);
                                        return (
                                          <td key={portKey} className="px-3 py-3 text-neutral-600 whitespace-nowrap text-center align-middle">
                                            {e ? (
                                              <span className="block">
                                                <span className="text-neutral-800 font-medium">{e.eta ? formatDate(e.eta) : "—"}</span>
                                                {e.dias_transito != null && (
                                                  <span className="text-neutral-500 text-xs block mt-0.5">{e.dias_transito} d</span>
                                                )}
                                              </span>
                                            ) : (
                                              <span className="text-neutral-300">—</span>
                                            )}
                                          </td>
                                        );
                                      })}
                                      {isLoggedIn && (
                                        <td className="px-3 py-3 text-center align-middle">
                                          <div className="flex items-center justify-center gap-2">
                                            <button
                                              type="button"
                                              onClick={() => handleOpenEdit(it)}
                                              className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-brand-blue bg-brand-blue/10 rounded-lg hover:bg-brand-blue/20 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                                              aria-label={tr.editItineraryAria.replace("{{nave}}", it.nave ?? "").replace("{{viaje}}", it.viaje ?? "")}
                                            >
                                              <Icon icon="lucide:pencil" width={16} height={16} aria-hidden />
                                              {tr.editItinerary}
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleDelete(it)}
                                              disabled={deletingId === it.id}
                                              className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-300 transition-all duration-200 disabled:opacity-50"
                                              aria-label={tr.deleteItineraryAria.replace("{{nave}}", it.nave ?? "").replace("{{viaje}}", it.viaje ?? "")}
                                            >
                                              {deletingId === it.id ? (
                                                <Icon icon="lucide:loader-2" width={16} height={16} className="animate-spin" aria-hidden />
                                              ) : (
                                                <Icon icon="lucide:trash-2" width={16} height={16} aria-hidden />
                                              )}
                                              {tr.deleteItinerary}
                                            </button>
                                          </div>
                                        </td>
                                      )}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                            {itinerariosEnArea.length > 4 && (
                              <div className="px-4 py-3 border-t border-neutral-200 bg-neutral-50/60 flex justify-end">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedAreas((prev) => ({
                                      ...prev,
                                      [areaKey]: !isExpanded,
                                    }))
                                  }
                                  className="text-xs font-medium text-brand-blue hover:text-brand-blue/80 transition-colors"
                                >
                                  {isExpanded
                                    ? tr.showLessRows?.replace("{{count}}", String(itinerariosEnArea.length)) ??
                                      `Ver menos (${itinerariosEnArea.length})`
                                    : tr.showMoreRows?.replace("{{count}}", String(itinerariosEnArea.length)) ??
                                      `Ver todas (${itinerariosEnArea.length})`}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  </section>
                );
              })}
            </div>
              );
            })()}
          </>
        )}
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-white"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-itinerario-title"
        >
          <div ref={modalRef} className="flex flex-col min-h-0 flex-1 overflow-y-auto">
            <div className="p-6 sm:p-8 w-full">
              <header className="mb-8">
                <h2 id="modal-itinerario-title" className="text-xl font-semibold text-brand-blue tracking-tight">
                  {editingItinerarioId ? tr.modalTitleEdit : tr.modalTitle}
                </h2>
                <p className="text-sm text-neutral-500 mt-2 leading-relaxed">
                  {tr.modalDescription}
                </p>
              </header>

              {modalError && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200 flex items-center gap-3" role="alert">
                  <Icon icon="lucide:alert-circle" width={20} height={20} className="shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="space-y-8">
                {/* Sección: Servicio / Consorcio */}
                <section className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-5 sm:p-6">
                  <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Icon icon="lucide:layers" width={16} height={16} className="text-brand-blue" />
                    {tr.sectionServiceConsortium}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="it-servicio" className="block text-sm font-medium text-neutral-700 mb-2">
                        {tr.service}
                      </label>
                      <select
                        id="it-servicio"
                        value={selectedServicioId}
                        onChange={(e) => {
                          const id = e.target.value;
                          setSelectedServicioId(id);
                          if (id) {
                            const s = serviciosConDetalle.find((x) => x.id === id);
                            if (s) applyServicioToForm(s);
                          } else {
                            setForm((f) => ({ ...f, servicio: "" }));
                          }
                        }}
                        className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue bg-white transition-colors"
                        aria-label={tr.selectServiceAria}
                      >
                        <option value="">{tr.serviceNone}</option>
                        {serviciosConDetalle.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.nombre}
                            {s.naviera_nombre?.trim() ? ` · ${s.naviera_nombre}` : ""}
                          </option>
                        ))}
                      </select>
                      {selectedServicioId && (
                        <p className="text-xs text-neutral-500 mt-2">{tr.serviceHint}</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="it-consorcio" className="block text-sm font-medium text-neutral-700 mb-2">
                        {tr.consortium}
                      </label>
                      <select
                        id="it-consorcio"
                        value={selectedConsorcioId}
                        onChange={(e) => {
                          const id = e.target.value;
                          setSelectedConsorcioId(id);
                          if (id) {
                            const c = consorciosConDetalle.find((x) => x.id === id);
                            if (c) applyConsorcioToForm(c);
                          } else {
                            setForm((f) => ({ ...f, consorcio: "" }));
                          }
                        }}
                        className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue bg-white transition-colors"
                        aria-label={tr.selectConsortiumAria}
                      >
                        <option value="">{tr.serviceNone}</option>
                        {consorciosConDetalle.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nombre}
                          </option>
                        ))}
                      </select>
                      {selectedConsorcioId && (
                        <p className="text-xs text-neutral-500 mt-2">{tr.consortiumHint}</p>
                      )}
                    </div>
                  </div>
                </section>

                {/* Sección: Naviera, Nave, Viaje */}
                <section className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-5 sm:p-6">
                  <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Icon icon="lucide:ship" width={16} height={16} className="text-brand-blue" />
                    {tr.sectionVesselVoyage}
                  </h3>
                  <div className="space-y-5">
                    <div>
                      <label htmlFor="it-naviera" className="block text-sm font-medium text-neutral-700 mb-2">
                        {tr.carrier}
                      </label>
                      <input
                        id="it-naviera"
                        type="text"
                        value={form.naviera}
                        onChange={(e) => setForm((f) => ({ ...f, naviera: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue bg-white transition-colors"
                        placeholder={tr.carrierPlaceholder}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label htmlFor="it-nave" className="block text-sm font-medium text-neutral-700 mb-2">
                          {tr.vessel} <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="it-nave"
                          type="text"
                          value={form.nave}
                          onChange={(e) => setForm((f) => ({ ...f, nave: e.target.value }))}
                          list={
                            (selectedServicioId && serviciosConDetalle.find((s) => s.id === selectedServicioId)?.naves?.length) ||
                            (selectedConsorcioId && consorciosConDetalle.find((c) => c.id === selectedConsorcioId)?.servicios?.[0]?.servicio_unico?.naves?.length)
                              ? "it-naves-list"
                              : undefined
                          }
                          className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue bg-white transition-colors"
                          placeholder={tr.vesselPlaceholder}
                        />
                        {(selectedServicioId && serviciosConDetalle.find((s) => s.id === selectedServicioId)?.naves) ||
                        (selectedConsorcioId && consorciosConDetalle.find((c) => c.id === selectedConsorcioId)?.servicios?.[0]?.servicio_unico?.naves) ? (
                          <datalist id="it-naves-list">
                            {(
                              selectedServicioId
                                ? serviciosConDetalle.find((s) => s.id === selectedServicioId)?.naves
                                : consorciosConDetalle.find((c) => c.id === selectedConsorcioId)?.servicios?.[0]?.servicio_unico?.naves
                            )?.map((n, i) => (
                              <option key={`${n.nave_nombre ?? i}`} value={n.nave_nombre ?? ""} />
                            ))}
                          </datalist>
                        ) : null}
                      </div>
                      <div>
                        <label htmlFor="it-viaje" className="block text-sm font-medium text-neutral-700 mb-2">
                          {tr.voyage} <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="it-viaje"
                          type="text"
                          value={form.viaje}
                          onChange={(e) => setForm((f) => ({ ...f, viaje: e.target.value }))}
                          className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue bg-white transition-colors"
                          placeholder={tr.voyagePlaceholder}
                        />
                      </div>
                    </div>
                  </div>
                </section>

                {/* Sección: Salida (POL, ETD, Semana) */}
                <section className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-5 sm:p-6">
                  <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Icon icon="lucide:calendar" width={16} height={16} className="text-brand-blue" />
                    {tr.sectionDeparture}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div>
                      <label htmlFor="it-pol" className="block text-sm font-medium text-neutral-700 mb-2">
                        {tr.polLabel} <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="it-pol"
                        type="text"
                        value={form.pol}
                        onChange={(e) => setForm((f) => ({ ...f, pol: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue bg-white transition-colors"
                        placeholder={tr.polPlaceholder}
                      />
                    </div>
                    <div>
                      <label htmlFor="it-etd" className="block text-sm font-medium text-neutral-700 mb-2">
                        {tr.etdLabel} <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="it-etd"
                          type="text"
                          value={etdInputValue}
                          onChange={(e) => {
                            const v = e.target.value;
                            setEtdInputValue(v);
                            const trimmed = v.trim();
                            if (trimmed === "") {
                              setForm((f) => ({ ...f, etd: "" }));
                            } else {
                              const parsed = fromDDMMYYYY(v);
                              if (parsed) setForm((f) => ({ ...f, etd: parsed }));
                            }
                          }}
                          placeholder={tr.datePlaceholder}
                          className="flex-1 min-w-0 px-4 py-2.5 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue bg-white transition-colors"
                        />
                        <div className="relative shrink-0 w-10 h-10 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 group">
                          <input
                            id="it-etd-picker"
                            type="date"
                            value={form.etd || ""}
                            onChange={(e) => {
                              const v = e.target.value || "";
                              setForm((f) => ({ ...f, etd: v }));
                              setEtdInputValue(toDDMMYYYY(v));
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 rounded-lg border-0"
                            tabIndex={0}
                            title={tr.pickDate}
                            aria-label={tr.pickDateAria}
                          />
                          <span className="absolute inset-0 flex items-center justify-center rounded-lg text-neutral-600 group-hover:text-brand-blue pointer-events-none" aria-hidden>
                            <Icon icon="lucide:calendar" width={20} height={20} />
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="it-semana" className="block text-sm font-medium text-neutral-700 mb-2">
                        {tr.weekLabel}
                      </label>
                      <input
                        id="it-semana"
                        type="text"
                        readOnly
                        value={form.etd ? getISOWeek(new Date(form.etd.includes("T") ? form.etd : `${form.etd}T12:00:00`)) : "—"}
                        className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 text-sm bg-neutral-50 text-neutral-600 cursor-default"
                        aria-label={tr.weekAria}
                      />
                    </div>
                  </div>
                </section>

                {/* Sección: Escalas */}
                <section className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wider flex items-center gap-2">
                      <Icon icon="lucide:route" width={16} height={16} className="text-brand-blue" />
                      {tr.sectionScales} <span className="text-red-500">*</span>
                    </h3>
                    <button
                      type="button"
                      onClick={addEscala}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-blue bg-brand-blue/10 rounded-lg hover:bg-brand-blue/15 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 transition-colors"
                    >
                      <Icon icon="lucide:plus" width={16} height={16} />
                      {tr.addScale}
                    </button>
                  </div>
                  <ul className="space-y-4">
                    {form.escalas.map((e, i) => (
                      <li
                        key={i}
                        className="p-4 rounded-xl border border-neutral-200 bg-white space-y-4"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-neutral-500 mb-1.5">{tr.portCode}</label>
                            <input
                              type="text"
                              value={e.puerto}
                              onChange={(ev) => updateEscala(i, "puerto", ev.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
                              placeholder={tr.portCodePlaceholder}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-neutral-500 mb-1.5">{tr.portName}</label>
                            <input
                              type="text"
                              value={e.puerto_nombre}
                              onChange={(ev) => updateEscala(i, "puerto_nombre", ev.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
                              placeholder={tr.portNamePlaceholder}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                          <div>
                            <label className="block text-xs font-medium text-neutral-500 mb-1.5">{tr.eta}</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={etaInputValues[i] ?? ""}
                                onChange={(ev) => {
                                  const v = ev.target.value;
                                  setEtaInputValues((prev) => {
                                    const next = [...prev];
                                    next[i] = v;
                                    return next;
                                  });
                                  const trimmed = v.trim();
                                  if (trimmed === "") {
                                    updateEscala(i, "eta", "");
                                  } else {
                                    const parsed = fromDDMMYYYY(v);
                                    if (parsed) updateEscala(i, "eta", parsed);
                                  }
                                }}
                                placeholder={tr.datePlaceholder}
                                className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
                              />
                              <div className="relative shrink-0 w-9 h-9 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 group">
                                <input
                                  id={`it-eta-picker-${i}`}
                                  type="date"
                                  value={e.eta || ""}
                                  onChange={(ev) => {
                                    const v = ev.target.value || "";
                                    updateEscala(i, "eta", v);
                                    setEtaInputValues((prev) => {
                                      const next = [...prev];
                                      next[i] = toDDMMYYYY(v);
                                      return next;
                                    });
                                  }}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 rounded-lg border-0"
                                  tabIndex={0}
                                  title={tr.pickDate}
                                  aria-label={tr.pickEtaAria}
                                />
                                <span className="absolute inset-0 flex items-center justify-center rounded-lg text-neutral-600 group-hover:text-brand-blue pointer-events-none" aria-hidden>
                                  <Icon icon="lucide:calendar" width={18} height={18} />
                                </span>
                              </div>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-neutral-500 mb-1.5">{tr.daysTransit}</label>
                            <input
                              type="text"
                              readOnly
                              value={
                                (() => {
                                  const d = diasTransito(form.etd, e.eta ?? "");
                                  return d !== null ? String(d) : "—";
                                })()
                              }
                              className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm bg-neutral-50 text-neutral-700 cursor-default focus:outline-none"
                              aria-label={tr.daysTransit}
                            />
                          </div>
                          <div className="flex gap-2 items-end">
                            <div className="flex-1">
                              <label className="block text-xs font-medium text-neutral-500 mb-1.5">{tr.area}</label>
                              <select
                                value={e.area}
                                onChange={(ev) => updateEscala(i, "area", ev.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue bg-white"
                              >
                                {AREAS_CANONICAL.map((a) => (
                                  <option key={a} value={a}>{a}</option>
                                ))}
                              </select>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeEscala(i)}
                              disabled={form.escalas.length <= 1}
                              className="p-2.5 text-neutral-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:hover:bg-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 transition-colors"
                              aria-label={tr.removeScale}
                            >
                              <Icon icon="lucide:trash-2" width={18} height={18} />
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>

              <footer className="mt-8 pt-6 border-t border-neutral-200 flex gap-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={saving}
                  className="flex-1 px-5 py-3 rounded-xl border border-neutral-200 text-neutral-700 font-medium hover:bg-neutral-50 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 transition-colors"
                >
                  {tr.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saving}
                  className="flex-1 px-5 py-3 rounded-xl bg-brand-blue text-white font-medium hover:bg-brand-blue/90 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 transition-colors"
                >
                  {saving ? tr.saving : editingItinerarioId ? tr.saveChanges : tr.create}
                </button>
              </footer>
            </div>
          </div>
        </div>
      )}

      {addRowModalOpen && addRowContext && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-row-modal-title"
          onClick={(e) => e.target === e.currentTarget && handleCloseAddRowModal()}
        >
          <div className="bg-white rounded-2xl shadow-mac-modal border border-neutral-200 w-full max-w-md overflow-hidden">
            <div className="p-6">
              <h2 id="add-row-modal-title" className="text-lg font-semibold text-brand-blue tracking-tight">
                {tr.addRowModalTitle}
              </h2>
              <p className="text-sm text-neutral-500 mt-1.5 mb-5">
                {tr.addRowModalDescription}
              </p>
              {addRowModalError && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200 flex items-center gap-2" role="alert">
                  <Icon icon="lucide:alert-circle" width={18} height={18} className="shrink-0" aria-hidden />
                  {addRowModalError}
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label htmlFor="add-row-nave" className="block text-sm font-medium text-neutral-700 mb-1.5">
                    {tr.addRowNaveLabel} <span className="text-red-500">*</span>
                  </label>
                  {addRowNaves.length > 0 ? (
                    <select
                      id="add-row-nave"
                      value={addRowForm.nave}
                      onChange={(e) => setAddRowForm((f) => ({ ...f, nave: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue bg-white"
                    >
                      {addRowNaves.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id="add-row-nave"
                      type="text"
                      value={addRowForm.nave}
                      onChange={(e) => setAddRowForm((f) => ({ ...f, nave: e.target.value }))}
                      placeholder={tr.vesselPlaceholder}
                      className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
                    />
                  )}
                </div>
                <div>
                  <label htmlFor="add-row-viaje" className="block text-sm font-medium text-neutral-700 mb-1.5">
                    {tr.addRowViajeLabel} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="add-row-viaje"
                    type="text"
                    value={addRowForm.viaje}
                    onChange={(e) => setAddRowForm((f) => ({ ...f, viaje: e.target.value }))}
                    placeholder={tr.voyagePlaceholder}
                    className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
                  />
                </div>
                <div>
                  <label htmlFor="add-row-etd" className="block text-sm font-medium text-neutral-700 mb-1.5">
                    {tr.addRowEtdLabel} <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="add-row-etd"
                      type="text"
                      value={addRowEtdInputValue}
                      onChange={(e) => {
                        const v = e.target.value;
                        setAddRowEtdInputValue(v);
                        const parsed = fromDDMMYYYY(v);
                        if (parsed) setAddRowForm((f) => ({ ...f, etd: parsed }));
                      }}
                      placeholder={tr.datePlaceholder}
                      className="flex-1 min-w-0 px-4 py-2.5 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
                    />
                    <div className="relative shrink-0 w-10 h-10 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 group">
                      <input
                        type="date"
                        value={addRowForm.etd || ""}
                        onChange={(e) => {
                          const v = e.target.value || "";
                          setAddRowForm((f) => ({ ...f, etd: v }));
                          setAddRowEtdInputValue(toDDMMYYYY(v));
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 rounded-lg border-0"
                        aria-label={tr.pickDateAria}
                      />
                      <span className="absolute inset-0 flex items-center justify-center rounded-lg text-neutral-600 group-hover:text-brand-blue pointer-events-none" aria-hidden>
                        <Icon icon="lucide:calendar" width={20} height={20} />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <footer className="px-6 py-4 bg-neutral-50 border-t border-neutral-200 flex gap-3 justify-end">
              <button
                type="button"
                onClick={handleCloseAddRowModal}
                disabled={addRowSaving}
                className="px-4 py-2.5 rounded-lg border border-neutral-200 text-neutral-700 font-medium hover:bg-neutral-100 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 transition-colors"
              >
                {tr.cancel}
              </button>
              <button
                type="button"
                onClick={handleSubmitAddRow}
                disabled={addRowSaving}
                className="px-4 py-2.5 rounded-lg bg-brand-blue text-white font-medium hover:bg-brand-blue/90 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 transition-colors"
              >
                {addRowSaving ? tr.saving : tr.addRowSubmit}
              </button>
            </footer>
          </div>
        </div>
      )}
    </main>
  );
}
