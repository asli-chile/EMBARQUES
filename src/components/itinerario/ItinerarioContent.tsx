import { Icon } from "@iconify/react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useLocale } from "@/lib/i18n";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { sileo } from "sileo";
import {
  fetchPublicItinerarios,
  createItinerario,
  updateItinerario,
  deleteItinerario,
  updateItinerarioOperador,
  updateItinerarioStackingImage,
} from "@/lib/itinerarios-service";
import type { ItinerarioWithEscalas } from "@/types/itinerarios";
import type { MapPortPoint } from "./ItinerarioMap";
import { format, getISOWeek, differenceInCalendarDays, addDays } from "date-fns";
import { AREAS_CANONICAL, normalizeArea } from "@/lib/areas";
import {
  STACKING_DRAFTS_STORAGE_KEY,
  getStackingDraftKey,
  getDraftForItinerary,
  normalizeNave,
  normalizeDraftsKeys,
  type StackingDraft,
} from "@/lib/stacking-drafts";
import ItinerarioMap from "./ItinerarioMap";
import { generateItinerarioPDF } from "@/lib/itinerario-pdf";

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
  const { user: authUser, isSuperadmin } = useAuth();
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
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [operadorUpdatingId, setOperadorUpdatingId] = useState<string | null>(null);
  const [expandedAreas, setExpandedAreas] = useState<Record<string, boolean>>({});
  const [selectedAreaFromMap, setSelectedAreaFromMap] = useState<string | null>(null);
  const [pendingScrollServicio, setPendingScrollServicio] = useState<string | null>(null);
  const [destSearch, setDestSearch] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
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
  const [saving, setSaving] = useState(false);
  const [serviciosConDetalle, setServiciosConDetalle] = useState<ServicioConDetalle[]>([]);
  const [consorciosConDetalle, setConsorciosConDetalle] = useState<ConsorcioConDetalle[]>([]);
  const [selectedServicioId, setSelectedServicioId] = useState("");
  const [selectedConsorcioId, setSelectedConsorcioId] = useState("");
  const [selectByAreaOpen, setSelectByAreaOpen] = useState(false);
  const [selectByAreaMode, setSelectByAreaMode] = useState<"servicio" | "consorcio">("servicio");
  const [etdInputValue, setEtdInputValue] = useState("");
  const [etaInputValues, setEtaInputValues] = useState<string[]>([]);

  const [stackingDrafts, setStackingDrafts] = useState<Record<string, StackingDraft>>({});
  const [stackingForm, setStackingForm] = useState({
    dryInicio: "",
    dryFin: "",
    reeferInicio: "",
    reeferFin: "",
    lateInicio: "",
    lateFin: "",
    cutoffDry: "",
    cutoffReefer: "",
    cutoffAnticipado: "",
    cutoffAnticipadoDescripcion: "",
  });
  const [stackingEditMode, setStackingEditMode] = useState(false);
  const [stackingImageUrl, setStackingImageUrl] = useState<string | null>(null);
  const [stackingImageUploading, setStackingImageUploading] = useState(false);
  const [stackingOcrLoading, setStackingOcrLoading] = useState(false);
  const [stackingExtractError, setStackingExtractError] = useState<string | null>(null);
  const [stackingModalItinerario, setStackingModalItinerario] = useState<ItinerarioWithEscalas | null>(null);
  const [stackingModalMinimized, setStackingModalMinimized] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const stackingFileInputRef = useRef<HTMLInputElement | null>(null);

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

  const [stackingDeepLinkId, setStackingDeepLinkId] = useState<string | null>(null);

  // Cargar borradores de stacking desde localStorage al montar (cliente); normalizar claves para sincronizar por nombre de nave
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STACKING_DRAFTS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, StackingDraft>;
      if (parsed && typeof parsed === "object") {
        setStackingDrafts(normalizeDraftsKeys(parsed));
      }
    } catch {
      // Ignorar errores de parseo y seguir con estado vacío
    }
  }, []);

  // Leer parámetro stackingItId de la URL para abrir directamente el modal de stacking
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("stackingItId");
      if (id) setStackingDeepLinkId(id);
    } catch {
      // Ignorar errores de URL
    }
  }, []);

  // Guardar borradores de stacking en localStorage cuando cambien
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STACKING_DRAFTS_STORAGE_KEY, JSON.stringify(stackingDrafts));
    } catch {
      // Ignorar errores de almacenamiento (por ejemplo, sin espacio)
    }
  }, [stackingDrafts]);

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

  // Scroll al servicio pendiente tras renderizar las tablas
  useEffect(() => {
    if (!pendingScrollServicio || !selectedAreaFromMap) return;
    const id = `srv-${pendingScrollServicio}`;
    const el = document.getElementById(id);
    if (el) {
      setTimeout(() => {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);
      setPendingScrollServicio(null);
    }
  }, [pendingScrollServicio, selectedAreaFromMap, itinerarios]);

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

  const handleDownloadPDF = useCallback(async () => {
    if (pdfLoading || itinerarios.length === 0) return;
    setPdfLoading(true);
    try {
      // Filtrar por área activa (igual que las tablas en pantalla)
      const isAreaFilter = !!selectedAreaFromMap && selectedAreaFromMap !== "ALL";
      const filtered = isAreaFilter
        ? itinerarios.filter((it) =>
            (it.escalas ?? []).some(
              (e) => ((e.area || "").trim() || "") === selectedAreaFromMap
            )
          )
        : itinerarios;
      await generateItinerarioPDF(filtered, selectedAreaFromMap, locale as "es" | "en");
    } catch (err) {
      console.error("Error generando PDF:", err);
    } finally {
      setPdfLoading(false);
    }
  }, [pdfLoading, itinerarios, selectedAreaFromMap, locale]);

  /** Al hacer clic en un marcador del mapa: seleccionar el área y hacer scroll al servicio. */
  const handlePortClick = useCallback((port: MapPortPoint) => {
    const targetArea = port.area?.trim() || "ALL";
    setSelectedAreaFromMap(targetArea);
    if (port.servicio?.trim()) {
      setPendingScrollServicio(port.servicio.trim());
    }
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

  const handleOpenStackingModal = useCallback(
    (it: ItinerarioWithEscalas) => {
      // Buscar imagen compartida por nombre de nave (misma nave = misma imagen en todos los itinerarios)
      const naveNorm = normalizeNave(it.nave);
      const sharedImageUrl =
        it.stacking_imagen_url ??
        (naveNorm
          ? itinerarios.find(
              (other) =>
                other.id !== it.id &&
                normalizeNave(other.nave) === naveNorm &&
                other.stacking_imagen_url
            )?.stacking_imagen_url
          : null) ??
        null;

      setStackingModalItinerario(
        sharedImageUrl ? { ...it, stacking_imagen_url: sharedImageUrl } : it
      );
      setStackingModalMinimized(false);
      setStackingEditMode(false);
      setStackingForm((prev) => {
        const existing = getDraftForItinerary(stackingDrafts, it);
        if (existing) return existing;
        return {
          dryInicio: "",
          dryFin: "",
          reeferInicio: "",
          reeferFin: "",
          lateInicio: "",
          lateFin: "",
          cutoffDry: "",
          cutoffReefer: "",
          cutoffAnticipado: "",
          cutoffAnticipadoDescripcion: "",
        };
      });
      setStackingImageUrl(sharedImageUrl);
    },
    [itinerarios, stackingDrafts]
  );

  // Si venimos desde stacking con stackingItId en la URL, abrir automáticamente el modal de stacking
  useEffect(() => {
    if (!stackingDeepLinkId || !itinerarios || stackingModalItinerario) return;
    const it = itinerarios.find((item) => item.id === stackingDeepLinkId);
    if (!it) return;
    handleOpenStackingModal(it);
    setStackingDeepLinkId(null);
  }, [stackingDeepLinkId, itinerarios, stackingModalItinerario, handleOpenStackingModal]);

  const handleCloseStackingModal = useCallback(() => {
    setStackingModalItinerario(null);
    setStackingModalMinimized(false);
    setStackingEditMode(false);
    setStackingExtractError(null);

    if (typeof window !== "undefined") {
      try {
        const params = new URLSearchParams(window.location.search);
        if (params.get("stackingItId")) {
          window.location.assign("/stacking");
        }
      } catch {
        // Ignorar errores de navegación
      }
    }
  }, []);

  const handleChangeStackingField = useCallback(
    (field: keyof typeof stackingForm, value: string) => {
      setStackingForm((prev) => {
        const next = { ...prev, [field]: value };
        if (stackingModalItinerario) {
          const key = getStackingDraftKey(stackingModalItinerario.nave);
          setStackingDrafts((drafts) => ({ ...drafts, [key]: next }));
        }
        return next;
      });
    },
    [stackingModalItinerario]
  );

  const handleUploadStackingImageClick = useCallback(() => {
    if (!isSuperadmin) return;
    stackingFileInputRef.current?.click();
  }, [isSuperadmin]);

  const handleUploadStackingImageChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!isSuperadmin) return;
      const file = e.target.files?.[0];
      if (!file || !stackingModalItinerario) return;
      setStackingImageUploading(true);
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const bucket = "itinerarios-stacking";
        const path = `${stackingModalItinerario.id}/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
        if (error) {
          console.error("Error subiendo imagen de stacking:", error);
          return;
        }
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        if (data?.publicUrl) {
          await updateItinerarioStackingImage(stackingModalItinerario.id, data.publicUrl);
          setStackingImageUrl(data.publicUrl);
          // Sincronizar en estado: todos los itinerarios con la misma nave muestran la imagen
          const naveNorm = normalizeNave(stackingModalItinerario.nave);
          setItinerarios((prev) =>
            prev.map((it) =>
              normalizeNave(it.nave) === naveNorm ? { ...it, stacking_imagen_url: data.publicUrl } : it
            )
          );
          setStackingModalItinerario((prev) =>
            prev ? { ...prev, stacking_imagen_url: data.publicUrl } : prev
          );
        }
      } catch (err) {
        console.error("Error inesperado al subir imagen de stacking:", err);
      } finally {
        setStackingImageUploading(false);
        e.target.value = "";
      }
    },
    [isSuperadmin, stackingModalItinerario]
  );

  const handleDeleteStackingImage = useCallback(async () => {
    if (!isSuperadmin || !stackingModalItinerario) return;
    const url = stackingImageUrl ?? stackingModalItinerario.stacking_imagen_url ?? null;
    if (!url) return;
    setStackingImageUploading(true);
    try {
      try {
        const pathMatch = url.split("itinerarios-stacking/")[1];
        if (pathMatch) {
          const path = pathMatch.split("?")[0];
          const { createClient } = await import("@/lib/supabase/client");
          const supabase = createClient();
          await supabase.storage.from("itinerarios-stacking").remove([path]);
        }
      } catch {
        // Ignorar si falla borrar del storage; igual limpiamos la BD
      }
      await updateItinerarioStackingImage(stackingModalItinerario.id, null);
      setStackingImageUrl(null);
      // Sincronizar en estado: quitar imagen de todos los itinerarios con la misma nave
      const naveNorm = normalizeNave(stackingModalItinerario.nave);
      setItinerarios((prev) =>
        prev.map((it) =>
          normalizeNave(it.nave) === naveNorm ? { ...it, stacking_imagen_url: null } : it
        )
      );
      setStackingModalItinerario((prev) =>
        prev ? { ...prev, stacking_imagen_url: null } : prev
      );
    } catch (err) {
      console.error("Error al borrar imagen de stacking:", err);
    } finally {
      setStackingImageUploading(false);
    }
  }, [isSuperadmin, stackingModalItinerario, stackingImageUrl]);

  const handleExtractStackingFromImage = useCallback(async () => {
    const url = stackingImageUrl ?? stackingModalItinerario?.stacking_imagen_url ?? null;
    if (!url || !stackingModalItinerario) return;
    setStackingExtractError(null);
    setStackingOcrLoading(true);
    try {
      const { analyzeStackingImage } = await import("@/lib/stacking-ocr");
      const parsed = await analyzeStackingImage(url);
      const key = getStackingDraftKey(stackingModalItinerario.nave);
      setStackingEditMode(true);
      setStackingForm((prev) => {
        const next = { ...prev, ...parsed };
        setStackingDrafts((drafts) => ({ ...drafts, [key]: next }));
        return next;
      });
    } catch (err) {
      setStackingExtractError(
        err instanceof Error ? err.message : tr.stackingExtractError ?? "Error al analizar la imagen."
      );
    } finally {
      setStackingOcrLoading(false);
    }
  }, [stackingImageUrl, stackingModalItinerario]);

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
    (it: ItinerarioWithEscalas) => {
      const msg = tr.confirmDeleteItinerary
        .replace("{{nave}}", it.nave ?? "")
        .replace("{{viaje}}", it.viaje ?? "");
      setConfirmDialog({
        title: "Eliminar itinerario",
        message: msg,
        onConfirm: () => {
          setConfirmDialog(null);
          setDeletingId(it.id);
          deleteItinerario(it.id)
            .then(() => { sileo.success({ title: tr.successDeleted }); loadItinerarios(); })
            .catch((e: unknown) => setError(e instanceof Error ? e.message : tr.errorCreate))
            .finally(() => setDeletingId(null));
        },
      });
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
      sileo.success({ title: tr.addRowSuccess });
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
        sileo.success({ title: tr.successUpdated });
      } else {
        await createItinerario(payload);
        sileo.success({ title: tr.successCreated });
      }
      handleCloseModal();
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
  const hasAreaFilter = !!selectedAreaFromMap && selectedAreaFromMap !== "ALL";

  const areasWithData = itinerarios.length > 0
    ? [...new Set(itinerarios.flatMap((it) => (it.escalas ?? []).map((e) => (e.area || "").trim()).filter(Boolean)))]
    : [];
  const itinerariosForPorts =
    hasAreaFilter && itinerarios.length > 0
      ? itinerarios.filter((it) =>
          (it.escalas ?? []).some((e) => ((e.area || "").trim() || "") === selectedAreaFromMap)
        )
      : itinerarios;

  /** Todos los puntos de destino (cada escala) con detalle para el mapa: POL, ETD, ETA, TT, servicio, naviera, area. */
  const mapPortPoints = useMemo((): MapPortPoint[] => {
    const out: MapPortPoint[] = [];
    for (const it of itinerarios) {
      const pol = (it.pol ?? "").trim();
      const etd = it.etd ?? null;
      const servicio = (it.servicio ?? "").trim();
      const naviera = (it.operador ?? it.naviera ?? "").trim();
      for (const e of it.escalas ?? []) {
        if (!e.puerto?.trim() && !e.puerto_nombre?.trim()) continue;
        const eta = e.eta ?? null;
        const tt = etd && eta ? diasTransito(etd, eta) : (e.dias_transito ?? null);
        out.push({
          puerto: (e.puerto ?? "").trim(),
          puerto_nombre: e.puerto_nombre?.trim() ?? null,
          pol,
          etd,
          eta,
          dias_transito: tt,
          servicio,
          naviera,
          area: (e.area ?? "").trim() || undefined,
        });
      }
    }
    return out;
  }, [itinerarios]);

  /** Resultados de búsqueda de destino: coincidencias de puerto_nombre o puerto con destSearch */
  const destSearchResults = useMemo((): MapPortPoint[] => {
    const q = destSearch.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    const seen = new Set<string>();
    const results: MapPortPoint[] = [];
    for (const p of mapPortPoints) {
      const name = (p.puerto_nombre || p.puerto || "").toLowerCase();
      const key = `${p.puerto_nombre || p.puerto}__${p.servicio}`;
      if (name.includes(q) && !seen.has(key)) {
        seen.add(key);
        results.push(p);
        if (results.length >= 8) break;
      }
    }
    return results;
  }, [destSearch, mapPortPoints]);

  const portNames = [
    ...new Set(
      itinerarios.flatMap((it) => {
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
    <>
    <main
      className="flex-1 min-h-0 min-w-0 w-full bg-brand-blue flex flex-col overflow-hidden"
      role="main"
    >
      {/* Título y acciones arriba: mínimo padding para usar toda la pantalla */}
      <header className="flex-shrink-0 flex flex-wrap items-center justify-between gap-2 w-full px-4 py-2.5">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-white tracking-tight leading-tight">
            {tr.title}
          </h1>
          <p className="text-white/70 text-xs sm:text-sm mt-0.5 sm:mt-2 hidden xs:block sm:block">{tr.subtitle}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Botón descargar PDF */}
          {itinerarios.length > 0 && (
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={pdfLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/15 border border-white/25 text-white text-sm font-medium hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-white/40 disabled:opacity-60 disabled:cursor-not-allowed transition-colors backdrop-blur-sm"
              aria-label={locale === "es" ? "Descargar PDF" : "Download PDF"}
            >
              {pdfLoading ? (
                <>
                  <Icon icon="lucide:loader-2" width={16} height={16} className="animate-spin" aria-hidden />
                  {locale === "es" ? "Generando…" : "Generating…"}
                </>
              ) : (
                <>
                  <Icon icon="lucide:file-down" width={16} height={16} aria-hidden />
                  PDF
                </>
              )}
            </button>
          )}
          {isLoggedIn && isSuperadmin && (
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
        </div>
      </header>

      {/* Pantalla de selección de área: 25% info, 75% mapa */}
      {!selectedAreaFromMap && (
        <section className="flex-1 min-h-0 flex flex-col w-full overflow-hidden">
          <div className="flex-1 min-h-0 w-full h-full flex flex-col overflow-hidden bg-white">
            <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
              {/* Columna info: 20% — fondo navy elegante */}
              <div className="w-full lg:w-[20%] flex flex-col gap-2 px-3 py-3 bg-gradient-to-br from-[#00529b] via-[#00407a] to-[#002f5c] border-b lg:border-b-0 lg:border-r border-white/10 relative overflow-hidden flex-shrink-0 lg:flex-shrink-0">
                {/* Círculos decorativos de fondo */}
                <div className="absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-white/[0.04] pointer-events-none" aria-hidden />
                <div className="absolute top-0 -left-10 h-36 w-36 rounded-full bg-white/[0.03] pointer-events-none" aria-hidden />
                <div className="absolute top-1/2 right-4 h-20 w-20 rounded-full bg-white/[0.03] pointer-events-none" aria-hidden />

                {/* Encabezado — solo desktop */}
                <div className="relative hidden lg:block">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-semibold text-white/70 mb-1.5 border border-white/20">
                    <Icon icon="lucide:globe-2" width={10} height={10} aria-hidden />
                    {tr.mapViewGlobal}
                  </div>
                  <h2 className="text-sm font-bold text-white leading-tight">
                    {tr.mapDiscoverTitle}
                  </h2>
                  <p className="mt-1 text-[11px] text-white/55 leading-relaxed">
                    {tr.mapDiscoverDesc}
                  </p>
                </div>

                {/* Chips de regiones */}
                {areasWithData.length > 0 && (
                  <div className="relative">
                    <p className="text-[10px] font-bold text-white/35 uppercase tracking-[0.15em] mb-1.5 hidden lg:block">Regiones</p>
                    {/* Mobile: fila compacta horizontal */}
                    <div className="flex gap-1.5 lg:hidden overflow-x-auto scrollbar-none pb-0.5">
                      {(
                        [
                          { area: "AMERICA",            bg: "bg-emerald-400/15 border-emerald-400/35 text-emerald-200", dot: "bg-emerald-400" },
                          { area: "ASIA",               bg: "bg-amber-400/15 border-amber-400/35 text-amber-200",  dot: "bg-amber-400" },
                          { area: "EUROPA",             bg: "bg-sky-400/15 border-sky-400/35 text-sky-200",         dot: "bg-sky-400" },
                          { area: "MEDIO-ORIENTE",      bg: "bg-orange-400/15 border-orange-400/35 text-orange-200", dot: "bg-orange-400" },
                          { area: "OCEANIA",            bg: "bg-teal-400/15 border-teal-400/35 text-teal-200",      dot: "bg-teal-400" },
                        ]
                      )
                        .filter(({ area }) => areasWithData.includes(area))
                        .map(({ area, bg, dot }) => (
                          <button
                            key={area}
                            type="button"
                            onClick={() => setSelectedAreaFromMap(area)}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold uppercase shrink-0 ${bg}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dot}`} />
                            {area === "MEDIO-ORIENTE" ? "M.Oriente" : area === "OCEANIA" ? "Oceanía" : area}
                          </button>
                        ))}
                    </div>
                    {/* Desktop: grid 2 cols */}
                    <div className="hidden lg:grid grid-cols-2 gap-1.5">
                      {(
                        [
                          { area: "AMERICA",            bg: "bg-emerald-400/15 hover:bg-emerald-400/25 border-emerald-400/35 text-emerald-200", dot: "bg-emerald-400" },
                          { area: "ASIA",               bg: "bg-amber-400/15  hover:bg-amber-400/25  border-amber-400/35  text-amber-200",  dot: "bg-amber-400" },
                          { area: "EUROPA",             bg: "bg-sky-400/15    hover:bg-sky-400/25    border-sky-400/35    text-sky-200",    dot: "bg-sky-400" },
                          { area: "MEDIO-ORIENTE",      bg: "bg-orange-400/15 hover:bg-orange-400/25 border-orange-400/35 text-orange-200", dot: "bg-orange-400" },
                          { area: "OCEANIA",            bg: "bg-teal-400/15   hover:bg-teal-400/25   border-teal-400/35   text-teal-200",   dot: "bg-teal-400" },
                        ]
                      )
                        .filter(({ area }) => areasWithData.includes(area))
                        .map(({ area, bg, dot }) => (
                          <button
                            key={area}
                            type="button"
                            onClick={() => setSelectedAreaFromMap(area)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold uppercase tracking-wide transition-all duration-150 hover:scale-[1.03] active:scale-95 w-full justify-center ${bg}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dot}`} />
                            <span>{area === "MEDIO-ORIENTE" ? "M.Oriente" : area === "OCEANIA" ? "Oceanía" : area}</span>
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {/* Buscador de destino — solo desktop */}
                <div className="relative hidden lg:flex lg:flex-col">
                  <p className="text-[10px] font-bold text-white/35 uppercase tracking-[0.15em] mb-1.5">Buscar destino</p>
                  <div className="relative">
                    <Icon icon="lucide:search" width={14} height={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" aria-hidden />
                    <input
                      type="text"
                      value={destSearch}
                      onChange={(e) => setDestSearch(e.target.value)}
                      placeholder="Ej: Shangai, Rotterdam…"
                      className="w-full pl-8 pr-8 py-2 rounded-xl bg-white/10 border border-white/20 text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-white/30 focus:bg-white/15 transition-all"
                    />
                    {destSearch && (
                      <button
                        type="button"
                        onClick={() => setDestSearch("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                        aria-label="Limpiar búsqueda"
                      >
                        <Icon icon="lucide:x" width={13} height={13} />
                      </button>
                    )}
                  </div>

                  {/* Resultados */}
                  {destSearch.trim().length >= 2 && (
                    <div className="mt-2 rounded-xl bg-white/10 border border-white/15 overflow-y-auto max-h-[40vh] backdrop-blur-sm">
                      {destSearchResults.length === 0 ? (
                        <p className="px-3 py-3 text-xs text-white/40 text-center">Sin coincidencias</p>
                      ) : (
                        <ul>
                          {destSearchResults.map((p, i) => {
                            const areaColors: Record<string, string> = {
                              ASIA: "bg-amber-400/20 text-amber-300",
                              EUROPA: "bg-sky-400/20 text-sky-300",
                              AMERICA: "bg-emerald-400/20 text-emerald-300",
                              "MEDIO-ORIENTE": "bg-orange-400/20 text-orange-300",
                              OCEANIA: "bg-teal-400/20 text-teal-300",
                            };
                            const areaLabel = p.area === "MEDIO-ORIENTE" ? "M.Oriente" : p.area === "OCEANIA" ? "Oceanía" : (p.area ?? "");
                            const areaClass = p.area ? (areaColors[p.area] ?? "bg-white/10 text-white/50") : "";
                            return (
                              <li key={i}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handlePortClick(p);
                                    setDestSearch("");
                                  }}
                                  className="w-full text-left px-3 py-2.5 hover:bg-white/10 transition-colors border-b border-white/10 last:border-b-0 group"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-white/90 truncate group-hover:text-white transition-colors">
                                        {p.puerto_nombre || p.puerto}
                                      </p>
                                      <p className="text-[11px] text-white/45 truncate mt-0.5">
                                        {[p.servicio, p.naviera].filter(Boolean).join(" · ")}
                                      </p>
                                    </div>
                                    {areaLabel && (
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${areaClass}`}>
                                        {areaLabel}
                                      </span>
                                    )}
                                  </div>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                {/* Tip — solo desktop, empujado al fondo */}
                <div className="hidden lg:block mt-auto pt-2 rounded-xl bg-white/8 border border-white/10 px-2.5 py-2">
                  <p className="text-[10px] text-white/45 leading-relaxed">
                    <strong className="text-white/65 font-semibold">Tip:</strong> {tr.mapTip}
                  </p>
                </div>

              </div>

              {/* Columna mapa: 80% del espacio */}
              <div className="w-full lg:w-[80%] flex-1 min-h-[50vw] sm:min-h-[45vw] lg:min-h-[400px] relative">
                <div className="absolute inset-0 overflow-hidden">
                  <ItinerarioMap
                    compact={false}
                    selectedArea={selectedAreaFromMap}
                    onSelectArea={setSelectedAreaFromMap}
                    areasWithData={areasWithData}
                    portPoints={mapPortPoints}
                    onPortClick={handlePortClick}
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
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/10 border border-white/20 px-3 py-2 text-sm text-white">
            <span>
              {selectedAreaFromMap === "ALL" ? (
                <>
                  {tr.showingItinerariesFor}{" "}
                  <span className="font-semibold">{tr.showingItinerariesAllAreas}</span>.
                </>
              ) : (
                <>
                  {tr.showingItinerariesFor} {tr.showingItinerariesForArea}{" "}
                  <span className="font-semibold">
                    {selectedAreaFromMap}
                  </span>
                  .
                </>
              )}
            </span>
            <button
              type="button"
              onClick={() => setSelectedAreaFromMap(null)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/90 text-brand-blue px-3 py-1.5 text-xs font-medium hover:bg-white focus:outline-none focus:ring-2 focus:ring-white/60"
            >
              <Icon icon="lucide:globe-2" width={14} height={14} aria-hidden />
              {tr.viewAllAreas}
            </button>
          </div>
        )}

        {/* Si hay área seleccionada pero no hay itinerarios, mostrar mensaje claro */}
        {selectedAreaFromMap && itinerarios.length === 0 && (
          <div className="mt-4 bg-white/95 rounded-2xl shadow-mac-modal border border-neutral-200 p-6 text-center">
            <Icon icon="lucide:ship" width={40} height={40} className="mx-auto mb-3 text-neutral-300" />
            <p className="text-neutral-700 font-medium">
              {tr.emptyTitle}
            </p>
            <p className="text-sm text-neutral-500 mt-1">
              {tr.emptySubtitle}
            </p>
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
              const areaOrder = ["AMERICA", "ASIA", "EUROPA", "MEDIO-ORIENTE", "OCEANIA", ""];

              // Group: byArea[area][serviceName] = itinerarios[]
              const byArea = new Map<string, Map<string, ItinerarioWithEscalasType[]>>();
              for (const it of itinerarios) {
                const escalas = it.escalas ?? [];
                const areasOfIt = new Set<string>();
                for (const e of escalas) {
                  const a = (e.area || "").trim() || "";
                  if (hasAreaFilter && a !== selectedAreaFromMap) continue;
                  areasOfIt.add(a);
                }
                if (areasOfIt.size === 0) {
                  if (!hasAreaFilter) areasOfIt.add("");
                }
                for (const area of areasOfIt) {
                  if (!byArea.has(area)) byArea.set(area, new Map());
                  const areaMap = byArea.get(area)!;
                  const key = (it.servicio || "").trim() || "—";
                  const list = areaMap.get(key) ?? [];
                  list.push(it);
                  areaMap.set(key, list);
                }
              }

              const sortedAreas = [
                ...areaOrder.filter((a) => byArea.has(a)),
                ...[...byArea.keys()].filter((a) => !areaOrder.includes(a)).sort(),
              ];

              const areaDisplayLabels: Record<string, string> = {
                AMERICA: "América",
                ASIA: "Asia",
                EUROPA: "Europa",
                "MEDIO-ORIENTE": "Medio Oriente",
                OCEANIA: "Oceanía",
              };
              const areaDisplayIcons: Record<string, string> = {
                AMERICA: "lucide:trees",
                ASIA: "lucide:building-2",
                EUROPA: "lucide:landmark",
                "MEDIO-ORIENTE": "lucide:sun",
                OCEANIA: "lucide:waves",
              };
              const areaGradients: Record<string, string> = {
                AMERICA: "from-emerald-600 to-emerald-700",
                ASIA: "from-amber-500 to-amber-600",
                EUROPA: "from-sky-600 to-sky-700",
                "MEDIO-ORIENTE": "from-orange-500 to-orange-600",
                OCEANIA: "from-teal-500 to-teal-600",
              };

              return (
                <div className="space-y-6 mt-5">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-medium backdrop-blur-sm border border-white/20">
                      <Icon icon="lucide:list" width={13} height={13} aria-hidden />
                      {tr.resultsCount.replace("{{count}}", String(itinerarios.length))}
                    </span>
                  </div>

                  {sortedAreas.map((area) => {
                    const serviceMap = byArea.get(area)!;
                    const serviceNames = [...serviceMap.keys()].sort((a, b) =>
                      a.localeCompare(b, undefined, { sensitivity: "base" })
                    );
                    const gradient = areaGradients[area] ?? "from-neutral-600 to-neutral-700";
                    const icon = areaDisplayIcons[area] ?? "lucide:map-pin";
                    const label = areaDisplayLabels[area] ?? area;

                    return (
                      <div key={area} className="space-y-2.5">
                        {/* ── Cabecera de región ─────────────────────────────────────────── */}
                        <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-gradient-to-r ${gradient} shadow-md`}>
                          <span className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                            <Icon icon={icon} width={14} height={14} className="text-white" aria-hidden />
                          </span>
                          <div className="flex items-baseline gap-2">
                            <h2 className="text-sm font-bold text-white tracking-tight">{label}</h2>
                            <span className="text-[11px] text-white/60">{serviceNames.length} {serviceNames.length === 1 ? "servicio" : "servicios"}</span>
                          </div>
                        </div>

                        {/* ── Servicios en esta región ───────────────────────────────────── */}
                        <div className="space-y-3 pl-2">
                          {serviceNames.map((servicioNombre) => {
                            const list = serviceMap.get(servicioNombre)!;
                            const navieras = [...new Set(list.map((it) => it.naviera).filter(Boolean))] as string[];

                            const escalasEnArea = list.flatMap((it) =>
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

                            const itinerariosEnArea = list.filter((it) =>
                              (it.escalas ?? []).some((e) => ((e.area || "").trim() || "") === area)
                            );

                            const getEscalaForPort = (escalas: ItinerarioWithEscalasType["escalas"], portKey: string) =>
                              (escalas ?? []).find((e) => ((e.puerto_nombre || e.puerto) || "—") === portKey);

                            const areaKey = `${servicioNombre}__${area || "sin-area"}`;
                            const isExpanded = expandedAreas[areaKey] ?? false;
                            const displayedItinerarios = isExpanded ? itinerariosEnArea : itinerariosEnArea.slice(0, 4);

                            return (
                              <section key={servicioNombre} id={`srv-${area}-${servicioNombre}`}>
                                <div className="relative bg-white rounded-2xl overflow-hidden shadow-[0_4px_24px_-4px_rgba(0,82,155,0.15),0_1px_3px_rgba(0,0,0,0.06)] ring-1 ring-brand-blue/10">
                                  {/* ── Service header ── */}
                                  <div className="px-4 py-2.5 border-b border-[#0a2659]/20 bg-gradient-to-r from-[#00529b] via-[#0d6cbf] to-[#1a7ad4] flex items-center justify-between gap-3 flex-wrap">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <h3 className="text-sm font-bold text-white tracking-tight truncate">
                                        {servicioNombre}
                                      </h3>
                                      {navieras.length > 0 && (
                                        <span className="hidden sm:inline-flex items-center gap-1 text-xs text-white/70 shrink-0">
                                          <Icon icon="lucide:ship" width={11} height={11} className="shrink-0" aria-hidden />
                                          {navieras.join(" · ")}
                                        </span>
                                      )}
                                    </div>
                                    {/* ── Add Row inline ── */}
                                    {isLoggedIn && isSuperadmin && (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenAddRowModal(itinerariosEnArea[0], servicioNombre, area)}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-white bg-white/15 border border-white/25 rounded-lg hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-white/40 transition-colors shrink-0"
                                        aria-label={tr.addRow}
                                      >
                                        <Icon icon="lucide:plus" width={13} height={13} aria-hidden />
                                        {tr.addRow}
                                      </button>
                                    )}
                                  </div>
                          <div className="sm:hidden divide-y divide-neutral-100/80">
                            {displayedItinerarios.map((it) => {
                              const escalas = it.escalas ?? [];
                              const naveNorm = normalizeNave(it.nave);
                              const sharedImageUrl =
                                it.stacking_imagen_url ??
                                (naveNorm
                                  ? itinerarios.find(
                                      (other) =>
                                        other.id !== it.id &&
                                        normalizeNave(other.nave) === naveNorm &&
                                        other.stacking_imagen_url
                                    )?.stacking_imagen_url
                                  : null) ??
                                null;
                              const hasStackingImage =
                                typeof sharedImageUrl === "string" && sharedImageUrl.trim().length > 0;
                              return (
                                <div key={it.id} className="p-4 odd:bg-[#f8faff] even:bg-white">
                                  {/* Encabezado de tarjeta: semana + nave + viaje */}
                                  <div className="flex items-start justify-between gap-2 mb-3">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      {it.semana != null && (
                                        <span className="inline-flex items-center justify-center h-8 w-8 shrink-0 rounded-full bg-brand-blue text-white font-bold text-xs shadow-sm shadow-brand-blue/30">
                                          {it.semana}
                                        </span>
                                      )}
                                      <div className="min-w-0">
                                        <p className="font-bold text-neutral-900 text-sm leading-tight truncate">{it.nave || "—"}</p>
                                        {it.operador || it.naviera ? (
                                          <p className="text-xs text-neutral-500 truncate mt-0.5">{it.operador || it.naviera}</p>
                                        ) : null}
                                      </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <p className="text-[10px] text-neutral-400 uppercase tracking-wide">{tr.colViaje}</p>
                                      <p className="font-semibold text-neutral-800 text-sm">{it.viaje || "—"}</p>
                                    </div>
                                  </div>

                                  {/* POL + ETD */}
                                  <div className="flex items-center gap-3 mb-3 px-3 py-2.5 rounded-xl bg-brand-blue/5 border border-brand-blue/10">
                                    <Icon icon="lucide:anchor" width={14} height={14} className="text-brand-blue/50 shrink-0" aria-hidden />
                                    <div className="flex-1 min-w-0">
                                      <span className="text-[10px] text-neutral-400 uppercase tracking-wide block">{tr.colPol}</span>
                                      <span className="text-sm font-semibold text-neutral-800 truncate">{it.pol || "—"}</span>
                                    </div>
                                    <div className="text-right shrink-0 border-l border-brand-blue/10 pl-3">
                                      <span className="text-[10px] text-neutral-400 uppercase tracking-wide block">{tr.colEtd}</span>
                                      <span className="text-sm font-bold text-brand-blue tabular-nums">{it.etd ? formatDate(it.etd) : "—"}</span>
                                    </div>
                                  </div>

                                  {/* Destinos */}
                                  {destinosColumnas.length > 0 && (
                                    <div className="space-y-1.5 mb-3">
                                      {destinosColumnas.map((portKey) => {
                                        const e = getEscalaForPort(escalas, portKey);
                                        return (
                                          <div key={portKey} className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-brand-blue/[0.04] border border-brand-blue/[0.08]">
                                            <Icon icon="lucide:map-pin" width={12} height={12} className="text-brand-blue/50 shrink-0" aria-hidden />
                                            <span className="text-xs font-semibold text-brand-blue flex-1 truncate">{portKey}</span>
                                            {e ? (
                                              <div className="flex items-center gap-1.5 shrink-0">
                                                <span className="text-xs font-semibold text-neutral-800 tabular-nums">{e.eta ? formatDate(e.eta) : "—"}</span>
                                                {e.dias_transito != null && (
                                                  <span className="inline-flex px-1.5 py-0.5 rounded-full bg-brand-blue/10 text-brand-blue text-[10px] font-bold tabular-nums">{e.dias_transito}d</span>
                                                )}
                                              </div>
                                            ) : (
                                              <span className="text-neutral-300 text-xs">—</span>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {/* Acciones: stacking + admin */}
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenStackingModal(it)}
                                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                                        hasStackingImage
                                          ? "text-brand-teal bg-brand-teal/10 hover:bg-brand-teal/20 focus:ring-brand-teal/30"
                                          : "text-brand-blue bg-brand-blue/10 hover:bg-brand-blue/20 focus:ring-brand-blue/30"
                                      }`}
                                    >
                                      <Icon icon="lucide:calendar-clock" width={14} height={14} aria-hidden />
                                      {hasStackingImage ? (tr as any).openStacking : (tr as any).uploadStacking}
                                    </button>
                                    {isLoggedIn && (
                                      <div className="flex gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => handleOpenEdit(it)}
                                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-brand-blue bg-brand-blue/10 rounded-lg hover:bg-brand-blue/20 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                                        >
                                          <Icon icon="lucide:pencil" width={13} height={13} aria-hidden />
                                          {tr.editItinerary}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDelete(it)}
                                          disabled={deletingId === it.id}
                                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50"
                                        >
                                          {deletingId === it.id ? (
                                            <Icon icon="lucide:loader-2" width={13} height={13} className="animate-spin" aria-hidden />
                                          ) : (
                                            <Icon icon="lucide:trash-2" width={13} height={13} aria-hidden />
                                          )}
                                          {tr.deleteItinerary}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          {/* ── Vista de tabla (sm+) ─────────────────────────── */}
                          <div className="overflow-x-auto hidden sm:block">
                            <table className="w-full text-sm" role="table">
                              <thead>
                                <tr className="border-b border-neutral-200 bg-[#f4f7fd]">
                                  <th className="text-center px-3 py-3 font-semibold text-neutral-500 whitespace-nowrap text-[11px] uppercase tracking-wide">
                                    {tr.colSemana}
                                  </th>
                                  <th className="text-center px-3 py-3 font-semibold text-neutral-500 whitespace-nowrap text-[11px] uppercase tracking-wide">
                                    {tr.colNave}
                                  </th>
                                  <th className="text-center px-3 py-3 font-semibold text-neutral-500 whitespace-nowrap text-[11px] uppercase tracking-wide">
                                    {tr.colOperador}
                                  </th>
                                  <th className="text-center px-3 py-3 font-semibold text-neutral-500 whitespace-nowrap text-[11px] uppercase tracking-wide">
                                    {tr.colViaje}
                                  </th>
                                  <th className="text-center px-3 py-3 font-semibold text-neutral-500 whitespace-nowrap text-[11px] uppercase tracking-wide">
                                    <span className="block">{tr.colPol}</span>
                                    <span className="block text-[10px] font-normal text-neutral-400 mt-0.5 normal-case tracking-normal">{tr.colEtd}</span>
                                  </th>
                                  {destinosColumnas.map((portKey) => (
                                    <th
                                      key={portKey}
                                      className="text-center px-3 py-3 whitespace-nowrap min-w-[100px] bg-brand-blue/[0.07]"
                                    >
                                      <span className="block text-brand-blue font-bold text-xs">{portKey}</span>
                                      <span className="block text-[10px] font-normal text-brand-blue/50 mt-0.5">
                                        {tr.eta} / {tr.daysTransit}
                                      </span>
                                    </th>
                                  ))}
                                  <th className="text-center px-3 py-3 font-semibold text-neutral-500 whitespace-nowrap text-[11px] uppercase tracking-wide min-w-[100px]">
                                    {tr.colStacking}
                                  </th>
                                  {isLoggedIn && (
                                    <th className="text-center px-3 py-3 font-semibold text-neutral-500 whitespace-nowrap text-[11px] uppercase tracking-wide min-w-[180px]">
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
                                      className={`border-b border-neutral-100/70 last:border-0 transition-colors duration-100 ${
                                        isEven ? "bg-white" : "bg-[#f8faff]"
                                      } hover:bg-brand-blue/[0.05] group`}
                                    >
                                      <td className="px-3 py-3 text-center align-middle">
                                        {it.semana != null ? (
                                          <span className="inline-flex items-center justify-center min-w-[2rem] h-7 px-2.5 rounded-full bg-brand-blue text-white font-bold text-xs shadow-sm shadow-brand-blue/30">
                                            {String(it.semana)}
                                          </span>
                                        ) : (
                                          <span className="text-neutral-300">—</span>
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
                                          <td key={portKey} className="px-3 py-3 whitespace-nowrap text-center align-middle bg-brand-blue/[0.03] group-hover:bg-brand-blue/[0.07] transition-colors duration-100">
                                            {e ? (
                                              <span className="block">
                                                <span className="text-neutral-800 font-semibold tabular-nums">{e.eta ? formatDate(e.eta) : "—"}</span>
                                                {e.dias_transito != null && (
                                                  <span className="inline-flex items-center justify-center mt-1 px-1.5 py-0.5 rounded-full bg-brand-blue/10 text-brand-blue text-[10px] font-bold tabular-nums">{e.dias_transito}d</span>
                                                )}
                                              </span>
                                            ) : (
                                              <span className="text-neutral-200">—</span>
                                            )}
                                          </td>
                                        );
                                      })}
                                      <td className="px-3 py-3 text-center align-middle">
                                        {(() => {
                                          // Imagen compartida por nombre de nave; Ver stacking = solo si hay imagen
                                          const naveNorm = normalizeNave(it.nave);
                                          const sharedImageUrl =
                                            it.stacking_imagen_url ??
                                            (naveNorm
                                              ? itinerarios.find(
                                                  (other) =>
                                                    other.id !== it.id &&
                                                    normalizeNave(other.nave) === naveNorm &&
                                                    other.stacking_imagen_url
                                                )?.stacking_imagen_url
                                              : null) ??
                                            null;

                                          const hasStackingImage =
                                            typeof sharedImageUrl === "string" && sharedImageUrl.trim().length > 0;
                                          const hasFullStacking = hasStackingImage;

                                          const tIt = tr as any;
                                          const label = hasFullStacking ? tIt.openStacking : tIt.uploadStacking;
                                          const baseAria =
                                            (hasFullStacking ? tIt.openStackingAria : tIt.uploadStackingAria) ??
                                            tIt.openStackingAria;
                                          const ariaLabel = baseAria
                                            .replace("{{nave}}", it.nave ?? "")
                                            .replace("{{viaje}}", it.viaje ?? "");

                                          const baseButtonClasses =
                                            "inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 transition-colors";
                                          const colorClasses = hasFullStacking
                                            ? "text-brand-teal bg-brand-teal/10 hover:bg-brand-teal/20 focus:ring-brand-teal/30"
                                            : "text-brand-blue bg-brand-blue/10 hover:bg-brand-blue/20 focus:ring-brand-blue/30";

                                          return (
                                            <button
                                              type="button"
                                              onClick={() => handleOpenStackingModal(it)}
                                              className={`${baseButtonClasses} ${colorClasses}`}
                                              aria-label={ariaLabel}
                                            >
                                              <Icon icon="lucide:calendar-clock" width={16} height={16} aria-hidden />
                                              {label}
                                            </button>
                                          );
                                        })()}
                                      </td>
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
                              <div className="px-4 py-3 border-t border-neutral-200 bg-neutral-50/60 flex justify-center sm:justify-end">
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
                              </section>
                            );
                          })}
                        </div>
                      </div>
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
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-itinerario-title"
          onClick={(e) => e.target === e.currentTarget && handleCloseModal()}
        >
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-4xl max-h-[96dvh] sm:max-h-[92dvh] flex flex-col overflow-hidden">
          {/* Hero header con gradiente */}
          <div className="flex-shrink-0 bg-gradient-to-r from-[#00529b] via-[#0d6cbf] to-[#1a7ad4] px-5 sm:px-7 py-5 relative overflow-hidden">
            {/* Círculos decorativos */}
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/[0.06] pointer-events-none" aria-hidden />
            <div className="absolute -bottom-10 right-16 w-24 h-24 rounded-full bg-white/[0.04] pointer-events-none" aria-hidden />
            <div className="flex items-center justify-between gap-3 relative">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0 border border-white/20">
                  <Icon icon="lucide:ship" width={20} height={20} className="text-white" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h2 id="modal-itinerario-title" className="text-base sm:text-lg font-bold text-white tracking-tight drop-shadow-sm truncate">
                    {editingItinerarioId ? tr.modalTitleEdit : tr.modalTitle}
                  </h2>
                  <p className="text-xs text-white/70 mt-0.5 leading-relaxed truncate">
                    {tr.modalDescription}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="ml-2 p-2 rounded-lg text-white/70 hover:bg-white/15 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40 shrink-0 transition-colors"
                aria-label={tr.cancel}
              >
                <Icon icon="lucide:x" width={20} height={20} aria-hidden />
              </button>
            </div>
          </div>
          <div ref={modalRef} className="flex flex-col min-h-0 flex-1 overflow-y-auto">
            <div className="p-4 sm:p-6 w-full">

              {modalError && (
                <div className="mb-5 p-4 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200 flex items-center gap-3" role="alert">
                  <Icon icon="lucide:alert-circle" width={20} height={20} className="shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="space-y-5">
                {/* Sección: Servicio / Consorcio */}
                <section className="rounded-xl border border-brand-blue/15 overflow-hidden shadow-sm">
                  <div className="px-5 py-3 bg-gradient-to-r from-brand-blue/8 via-brand-blue/4 to-transparent border-b border-brand-blue/10 flex items-center gap-2">
                    <Icon icon="lucide:layers" width={15} height={15} className="text-brand-blue shrink-0" />
                    <h3 className="text-xs font-bold text-brand-blue uppercase tracking-wider">{tr.sectionServiceConsortium}</h3>
                  </div>
                  <div className="p-5 sm:p-6 bg-white">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <label htmlFor="it-servicio" className="block text-sm font-medium text-neutral-700">
                          {tr.service}
                        </label>
                        {serviciosConDetalle.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectByAreaMode("servicio");
                              setSelectByAreaOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md text-brand-blue bg-white border border-brand-blue/30 hover:bg-brand-blue/5"
                          >
                            <Icon icon="lucide:map" width={12} height={12} aria-hidden />
                            Ver por área
                          </button>
                        )}
                      </div>
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
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <label htmlFor="it-consorcio" className="block text-sm font-medium text-neutral-700">
                          {tr.consortium}
                        </label>
                        {consorciosConDetalle.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectByAreaMode("consorcio");
                              setSelectByAreaOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md text-brand-blue bg-white border border-brand-blue/30 hover:bg-brand-blue/5"
                          >
                            <Icon icon="lucide:map" width={12} height={12} aria-hidden />
                            Ver por área
                          </button>
                        )}
                      </div>
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
                  </div>
                </section>

                {/* Sección: Naviera, Nave, Viaje */}
                <section className="rounded-xl border border-brand-blue/15 overflow-hidden shadow-sm">
                  <div className="px-5 py-3 bg-gradient-to-r from-brand-blue/8 via-brand-blue/4 to-transparent border-b border-brand-blue/10 flex items-center gap-2">
                    <Icon icon="lucide:ship" width={15} height={15} className="text-brand-blue shrink-0" />
                    <h3 className="text-xs font-bold text-brand-blue uppercase tracking-wider">{tr.sectionVesselVoyage}</h3>
                  </div>
                  <div className="p-5 sm:p-6 bg-white">
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
                  </div>
                </section>

                {/* Sección: Salida (POL, ETD, Semana) */}
                <section className="rounded-xl border border-brand-blue/15 overflow-hidden shadow-sm">
                  <div className="px-5 py-3 bg-gradient-to-r from-brand-blue/8 via-brand-blue/4 to-transparent border-b border-brand-blue/10 flex items-center gap-2">
                    <Icon icon="lucide:calendar" width={15} height={15} className="text-brand-blue shrink-0" />
                    <h3 className="text-xs font-bold text-brand-blue uppercase tracking-wider">{tr.sectionDeparture}</h3>
                  </div>
                  <div className="p-5 sm:p-6 bg-white">
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
                  </div>
                </section>

                {/* Sección: Escalas */}
                <section className="rounded-xl border border-brand-blue/15 overflow-hidden shadow-sm">
                  <div className="px-5 py-3 bg-gradient-to-r from-brand-blue/8 via-brand-blue/4 to-transparent border-b border-brand-blue/10 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon icon="lucide:route" width={15} height={15} className="text-brand-blue shrink-0" />
                      <h3 className="text-xs font-bold text-brand-blue uppercase tracking-wider">{tr.sectionScales} <span className="text-red-400">*</span></h3>
                    </div>
                    <button
                      type="button"
                      onClick={addEscala}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-blue bg-white border border-brand-blue/30 rounded-lg hover:bg-brand-blue/5 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 transition-colors"
                    >
                      <Icon icon="lucide:plus" width={14} height={14} />
                      {tr.addScale}
                    </button>
                  </div>
                  <div className="p-5 sm:p-6 bg-white">
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
                  </div>
                </section>
              </div>

            </div>
          </div>
          {/* Footer */}
          <div className="flex-shrink-0 flex gap-3 px-5 sm:px-7 py-4 bg-neutral-50/80 border-t border-neutral-100">
            <button
              type="button"
              onClick={handleCloseModal}
              disabled={saving}
              className="flex-1 px-5 py-2.5 rounded-xl border border-neutral-200 text-neutral-700 font-medium hover:bg-neutral-100 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 transition-colors text-sm"
            >
              {tr.cancel}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="flex-[2] px-5 py-2.5 rounded-xl bg-brand-blue text-white font-medium hover:bg-brand-blue/90 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 transition-colors text-sm shadow-sm shadow-brand-blue/30"
            >
              {saving ? (
                <>
                  <Icon icon="lucide:loader-2" width={16} height={16} className="inline-block animate-spin mr-1.5 align-middle" aria-hidden />
                  {tr.saving}
                </>
              ) : editingItinerarioId ? tr.saveChanges : tr.create}
            </button>
          </div>
          </div>
        </div>
      )}

      {/* Modal Stacking: nave / viaje / puerto y horarios (Dry, Reefer, Cut off) */}
      {stackingModalItinerario && (
        <div
          className="fixed inset-0 z-50 flex h-screen min-h-screen flex-col bg-white"
          role="dialog"
          aria-modal="true"
          aria-labelledby="stacking-modal-title"
          onClick={(e) => e.target === e.currentTarget && handleCloseStackingModal()}
        >
          <div
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50/80 flex-shrink-0">
              <h2 id="stacking-modal-title" className="text-lg font-semibold text-brand-blue">
                {tr.stackingModalTitle}
              </h2>
              <button
                type="button"
                onClick={handleCloseStackingModal}
                className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-200 hover:text-neutral-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                aria-label={tr.cancel}
              >
                <Icon icon="lucide:x" width={20} height={20} aria-hidden />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col px-6 py-5 overflow-hidden">
              {/* Datos del itinerario (compactos) */}
              <div className="flex-shrink-0 flex flex-wrap items-center gap-3 mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-blue/10 text-brand-blue text-sm font-medium">
                  <Icon icon="lucide:ship" width={14} height={14} aria-hidden />
                  {stackingModalItinerario.nave || "—"}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 text-neutral-700 text-sm font-medium">
                  <Icon icon="lucide:route" width={14} height={14} aria-hidden />
                  {stackingModalItinerario.viaje || "—"}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 text-neutral-700 text-sm">
                  {stackingModalItinerario.pol || "—"} · {formatDate(stackingModalItinerario.etd ?? null)}
                </span>
              </div>

              {/* Mensaje: información oficial de la línea */}
              <div className="flex-shrink-0 flex items-center gap-3 rounded-xl border border-brand-blue/20 bg-brand-blue/5 px-4 py-3 mb-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-brand-blue/10 text-brand-blue shrink-0">
                  <Icon icon="lucide:badge-check" width={22} height={22} aria-hidden />
                </div>
                <div>
                  <p className="text-sm font-semibold text-brand-blue">
                    {(tr as { stackingOfficialLineInfo?: string }).stackingOfficialLineInfo ?? tr.stackingOfficialTitle}
                  </p>
                  <p className="text-xs text-neutral-600 mt-0.5">
                    {tr.stackingOfficialDescription}
                  </p>
                </div>
              </div>

              {/* Área de imagen: acciones admin + imagen */}
              <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-neutral-200 bg-neutral-50/50 overflow-hidden shadow-sm">
                <div className="flex flex-shrink-0 items-center justify-between gap-3 flex-wrap px-4 py-3 border-b border-neutral-200 bg-white">
                  <span className="text-sm font-medium text-neutral-700">{tr.stackingOfficialTitle}</span>
                  {isSuperadmin && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleUploadStackingImageClick}
                        disabled={stackingImageUploading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-blue text-white hover:bg-brand-blue/90 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 transition-colors disabled:opacity-60 disabled:pointer-events-none"
                      >
                        <Icon icon="lucide:upload" width={16} height={16} aria-hidden />
                        {tr.stackingOfficialUpload}
                      </button>
                      {(stackingImageUrl ?? stackingModalItinerario.stacking_imagen_url) && (
                        <button
                          type="button"
                          onClick={handleDeleteStackingImage}
                          disabled={stackingImageUploading}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-300 text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200 transition-colors disabled:opacity-60 disabled:pointer-events-none"
                        >
                          <Icon icon="lucide:trash-2" width={16} height={16} aria-hidden />
                          {tr.stackingOfficialDelete}
                        </button>
                      )}
                      <input
                        ref={stackingFileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleUploadStackingImageChange}
                      />
                    </div>
                  )}
                </div>
                {stackingImageUploading && (
                  <div className="flex-shrink-0 px-4 py-2 bg-brand-blue/5 border-b border-brand-blue/10" role="status" aria-live="polite">
                    <p className="text-xs text-brand-blue flex items-center gap-2">
                      <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" aria-hidden />
                      {tr.stackingImageUploading}
                    </p>
                  </div>
                )}
                <div className="flex min-h-[320px] flex-1 overflow-auto p-4">
                  {stackingImageUrl ?? stackingModalItinerario.stacking_imagen_url ? (
                    <div className="w-full min-h-[280px] rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-inner flex justify-center">
                      <img
                        src={stackingImageUrl ?? stackingModalItinerario.stacking_imagen_url ?? ""}
                        alt={tr.stackingOfficialTitle}
                        className="w-full max-w-full h-auto object-contain object-top block"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-200 bg-white/80 px-6 py-12 text-center">
                      <div className="flex items-center justify-center w-14 h-14 rounded-full bg-neutral-100 text-neutral-400 mb-3">
                        <Icon icon="lucide:image-plus" width={28} height={28} aria-hidden />
                      </div>
                      <p className="text-sm font-medium text-neutral-600">{tr.stackingOfficialNoImage}</p>
                      {isSuperadmin && (
                        <p className="text-xs text-neutral-500 mt-1">
                          {tr.stackingOfficialUpload} para agregar la información oficial.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-neutral-200 flex-shrink-0">
              <button
                type="button"
                onClick={handleCloseStackingModal}
                className="w-full px-4 py-2.5 rounded-lg bg-brand-blue text-white font-medium hover:bg-brand-blue/90 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 transition-colors"
              >
                {tr.stackingClose}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal "Ver por área": servicios o consorcios agrupados por área */}
      {selectByAreaOpen && (
        <div
          className="fixed inset-0 z-[60] flex flex-col bg-white"
          role="dialog"
          aria-modal="true"
          aria-label={selectByAreaMode === "servicio" ? tr.selectByAreaTitleService : tr.selectByAreaTitleConsorcio}
        >
          <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-200 bg-neutral-50 flex-shrink-0">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">
                {selectByAreaMode === "servicio" ? tr.selectByAreaTitleService : tr.selectByAreaTitleConsorcio}
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                {selectByAreaMode === "servicio" ? tr.selectByAreaDescService : tr.selectByAreaDescConsorcio}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectByAreaOpen(false)}
              className="p-2 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              aria-label={tr.closeSelectByArea}
            >
              <Icon icon="lucide:x" width={18} height={18} aria-hidden />
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-auto px-5 py-4">
            {selectByAreaMode === "servicio"
              ? (() => {
                  const areaOrder = [...AREAS_CANONICAL];
                  const areaLabels: Record<string, string> = {
                    ASIA: "Asia",
                    EUROPA: "Europa",
                    AMERICA: "América",
                    "MEDIO-ORIENTE": "Medio Oriente",
                    OCEANIA: "Oceanía",
                    SIN_AREA: "Sin área",
                  };
                  const grouped: Record<string, ServicioConDetalle[]> = {};
                  for (const srv of serviciosConDetalle) {
                    const areasSrv = new Set(
                      (srv.destinos ?? [])
                        .map((d) => normalizeArea(d.area))
                        .filter((a) => a.length > 0)
                    );
                    if (areasSrv.size === 0) {
                      (grouped.SIN_AREA ??= []).push(srv);
                    } else {
                      for (const area of areasSrv) {
                        (grouped[area] ??= []).push(srv);
                      }
                    }
                  }
                  const orderedAreas = [
                    ...areaOrder.filter((a) => (grouped[a]?.length ?? 0) > 0),
                    ...(grouped.SIN_AREA?.length ? ["SIN_AREA"] : []),
                  ];
                  if (orderedAreas.length === 0) {
                    return (
                      <p className="text-sm text-neutral-500">
                        No hay servicios con destinos configurados.
                      </p>
                    );
                  }
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                      {orderedAreas.map((areaKey) => (
                        <section
                          key={areaKey}
                          className="rounded-xl border border-neutral-200 bg-neutral-50/80 p-3 flex flex-col gap-2"
                        >
                          <h3 className="text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-brand-blue" aria-hidden />
                            {areaLabels[areaKey] ?? areaKey}
                          </h3>
                          <div className="space-y-2">
                            {(grouped[areaKey] ?? []).map((srv) => (
                              <button
                                key={srv.id}
                                type="button"
                                onClick={() => {
                                  applyServicioToForm(srv);
                                  setSelectedServicioId(srv.id);
                                  setSelectedConsorcioId("");
                                  setSelectByAreaOpen(false);
                                }}
                                className="w-full text-left rounded-lg border border-neutral-200 bg-white px-3 py-2.5 hover:border-brand-blue/70 hover:bg-brand-blue/5 transition-colors"
                              >
                                <p className="text-xs font-semibold text-neutral-900 flex items-center justify-between gap-2">
                                  <span className="truncate">{srv.nombre}</span>
                                  <span className="text-[10px] font-medium text-brand-blue uppercase shrink-0">
                                    {srv.naviera_nombre?.trim() ?? "—"}
                                  </span>
                                </p>
                                <p className="text-[11px] text-neutral-500 mt-0.5 truncate">
                                  POL: {srv.puerto_origen?.trim() || "—"}
                                </p>
                                <p className="text-[11px] text-neutral-500 mt-0.5 truncate">
                                  Naves: {(srv.naves ?? []).map((n) => n.nave_nombre ?? "").filter(Boolean).join(", ") || "—"}
                                </p>
                              </button>
                            ))}
                          </div>
                        </section>
                      ))}
                    </div>
                  );
                })()
              : (() => {
                  const areaOrder = [...AREAS_CANONICAL];
                  const areaLabels: Record<string, string> = {
                    ASIA: "Asia",
                    EUROPA: "Europa",
                    AMERICA: "América",
                    "MEDIO-ORIENTE": "Medio Oriente",
                    OCEANIA: "Oceanía",
                    SIN_AREA: "Sin área",
                  };
                  const grouped: Record<string, ConsorcioConDetalle[]> = {};
                  for (const con of consorciosConDetalle) {
                    const areasCon = new Set<string>();
                    for (const { servicio_unico } of con.servicios ?? []) {
                      if (!servicio_unico?.destinos?.length) continue;
                      for (const d of servicio_unico.destinos) {
                        const a = normalizeArea(d.area);
                        if (a.length > 0) areasCon.add(a);
                      }
                    }
                    if (areasCon.size === 0) {
                      (grouped.SIN_AREA ??= []).push(con);
                    } else {
                      for (const area of areasCon) {
                        (grouped[area] ??= []).push(con);
                      }
                    }
                  }
                  const orderedAreas = [
                    ...areaOrder.filter((a) => (grouped[a]?.length ?? 0) > 0),
                    ...(grouped.SIN_AREA?.length ? ["SIN_AREA"] : []),
                  ];
                  if (orderedAreas.length === 0) {
                    return (
                      <p className="text-sm text-neutral-500">
                        No hay consorcios con servicios que tengan destinos configurados.
                      </p>
                    );
                  }
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                      {orderedAreas.map((areaKey) => (
                        <section
                          key={areaKey}
                          className="rounded-xl border border-neutral-200 bg-neutral-50/80 p-3 flex flex-col gap-2"
                        >
                          <h3 className="text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-brand-blue" aria-hidden />
                            {areaLabels[areaKey] ?? areaKey}
                          </h3>
                          <div className="space-y-2">
                            {(grouped[areaKey] ?? []).map((con) => (
                              <button
                                key={con.id}
                                type="button"
                                onClick={() => {
                                  applyConsorcioToForm(con);
                                  setSelectedConsorcioId(con.id);
                                  setSelectedServicioId("");
                                  setSelectByAreaOpen(false);
                                }}
                                className="w-full text-left rounded-lg border border-neutral-200 bg-white px-3 py-2.5 hover:border-brand-blue/70 hover:bg-brand-blue/5 transition-colors"
                              >
                                <p className="text-xs font-semibold text-neutral-900 truncate">
                                  {con.nombre}
                                </p>
                                <p className="text-[11px] text-neutral-500 mt-0.5 truncate">
                                  Servicios: {(con.servicios ?? []).length}
                                </p>
                                <p className="text-[11px] text-neutral-500 mt-0.5 truncate">
                                  Navieras: {[
                                    ...new Set(
                                      (con.servicios ?? [])
                                        .map((s) => s.servicio_unico?.naviera_nombre?.trim())
                                        .filter((n): n is string => Boolean(n))
                                    ),
                                  ].join(", ") || "—"}
                                </p>
                              </button>
                            ))}
                          </div>
                        </section>
                      ))}
                    </div>
                  );
                })()}
          </div>
        </div>
      )}

      {addRowModalOpen && addRowContext && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-row-modal-title"
          onClick={(e) => e.target === e.currentTarget && handleCloseAddRowModal()}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-md overflow-hidden">
            <div className="h-[3px] bg-gradient-to-r from-brand-blue to-brand-teal" />
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
              <div>
                <h2 id="add-row-modal-title" className="text-base font-semibold text-brand-blue tracking-tight">
                  {tr.addRowModalTitle}
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {tr.addRowModalDescription}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseAddRowModal}
                className="p-2 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                aria-label={tr.cancel}
              >
                <Icon icon="lucide:x" width={18} height={18} aria-hidden />
              </button>
            </div>
            <div className="p-6">
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
    {confirmDialog && (
      <ConfirmDialog
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(null)}
      />
    )}
    </>
  );
}
