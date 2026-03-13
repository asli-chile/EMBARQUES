import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";

const AREAS = ["ASIA", "EUROPA", "AMERICA", "INDIA-MEDIOORIENTE"] as const;

/** Normaliza el área a un valor canónico para guardar (evita errores por "INDIA MEDIO ORIENTE" vs "INDIA-MEDIOORIENTE"). */
function normalizeArea(area: string | null | undefined): string {
  if (!area || !String(area).trim()) return "ASIA";
  const t = String(area).trim().toUpperCase().replace(/\s+/g, "-");
  if ((AREAS as readonly string[]).includes(t)) return t;
  const alias: Record<string, string> = {
    "INDIA-MEDIO-ORIENTE": "INDIA-MEDIOORIENTE",
    "INDIA-MEDIOORIENTE": "INDIA-MEDIOORIENTE",
  };
  return alias[t] ?? t;
}

function getApiUrl(): string {
  if (typeof import.meta !== "undefined" && import.meta.env?.PUBLIC_API_URL) {
    return String(import.meta.env.PUBLIC_API_URL);
  }
  return "";
}

type Naviera = { id: string; nombre: string };
type NaveCatalog = { id: string; nombre: string };
type DestinoCatalog = { id: string; nombre: string; codigo_puerto?: string | null; pais?: string | null };
type ServicioUnico = {
  id: string;
  nombre: string;
  naviera_id: string;
  naviera_nombre?: string | null;
  puerto_origen: string;
  naves: { id: string; nave_nombre: string }[];
  destinos: { id: string; puerto: string; puerto_nombre: string | null; area: string | null }[];
};

const defaultServiciosTr: Record<string, string> = {
  title: "Servicios por naviera",
  newService: "Nuevo servicio",
  newServiceAria: "Nuevo servicio",
  errorLoadNavieras: "Error cargando navieras",
  errorLoadServicios: "Error cargando servicios",
  noServices: "No hay servicios únicos",
  noServicesHint: "Cree uno con el botón «Nuevo servicio».",
  areaLabel: "Área",
  origin: "Origen",
  vessels: "Naves",
  destinations: "Destinos",
  regions: "Regiones",
  unassigned: "Sin asignar",
  viewDetail: "Ver detalle",
  viewLess: "Ver menos",
  expandAria: "Ver detalle del servicio",
  collapseAria: "Contraer detalle",
  edit: "Editar",
  delete: "Eliminar",
  modalTitleNew: "Nuevo servicio por naviera",
  modalTitleEdit: "Editar servicio",
  modalDescNew: "Defina nombre, naviera, puerto de origen, naves y destinos (POD) del servicio.",
  modalDescEdit: "Modifique los datos del servicio y guarde los cambios.",
  copyFromService: "Usar datos de otro servicio",
  copyFromServiceHint: "Seleccione un servicio existente para copiar nombre, origen, naves y destinos. Elija después la naviera del nuevo servicio.",
  copyFromAria: "Copiar datos desde un servicio existente",
  noCopy: "No copiar — crear desde cero",
  serviceData: "Datos del servicio",
  serviceName: "Nombre del servicio",
  serviceNamePlaceholder: "Ej. ANDES EXPRESS",
  carrier: "Naviera",
  selectCarrier: "Seleccione naviera",
  pol: "Puerto de origen (POL)",
  polPlaceholder: "Ej. SAC, CLVAN",
  vesselsSection: "Naves",
  vesselsHint: "Seleccione naves existentes de la naviera o escriba una nueva para guardarla en el catálogo. Al menos una nave.",
  selectCarrierFirst: "Seleccione primero una naviera para cargar las naves disponibles.",
  selectVessel: "Seleccione una nave existente",
  loading: "Cargando…",
  writeNewVessel: "Escribir nueva nave",
  add: "Añadir",
  pasteVessels: "Pegar varias naves",
  pasteVesselsHint: "Pegue una lista de naves (una por línea o separadas por coma). Se buscarán coincidencias en el catálogo de la naviera y se agregarán al servicio.",
  pasteVesselsAria: "Pegar varias naves para buscar en el catálogo",
  searchAndAdd: "Buscar y agregar",
  newVesselPrompt: "«{{name}}» no está en el catálogo. ¿Guardar como nueva nave y asignarla a una naviera?",
  assignCarrierAria: "Naviera a la que asignar la nueva nave",
  destinosSection: "Destinos (POD)",
  destinosHint: "Seleccione destinos del catálogo o escriba uno nuevo para guardarlo. Al menos un destino. Puede ajustar código, nombre y área en cada fila.",
  selectDestino: "Seleccione un destino existente",
  writeNewDestino: "Escribir nuevo destino",
  pasteDestinos: "Pegar varios destinos",
  pasteDestinosHint: "Pegue una lista de destinos (una por línea o separados por coma). Se buscarán coincidencias en el catálogo y se agregarán al servicio.",
  newDestinoPrompt: "«{{name}}» no está en el catálogo. ¿Guardar como nuevo destino?",
  destinosDelServicio: "Destinos del servicio",
  addRowManual: "+ Añadir fila manual",
  removeDestino: "Quitar destino",
  saveAndAdd: "Guardar y agregar",
  cancel: "Cancelar",
  save: "Guardar cambios",
  create: "Crear servicio",
  saving: "Guardando…",
  errorServiceName: "Ingrese el nombre del servicio.",
  errorCarrier: "Seleccione una naviera.",
  errorPol: "Ingrese el puerto de origen (POL).",
  errorMinVessel: "Agregue al menos una nave.",
  errorMinDestino: "Agregue al menos un destino (código de puerto).",
  errorSave: "Error al guardar. Intente de nuevo.",
  successCreated: "Servicio creado correctamente.",
  successUpdated: "Servicio actualizado correctamente.",
  successDeleted: "Servicio eliminado correctamente.",
  confirmDelete: "¿Eliminar el servicio «{{name}}»? Esta acción no se puede deshacer.",
  errorDelete: "Error al eliminar el servicio.",
  noArea: "Sin área",
  vesselCount: "{{count}} nave",
  vesselCount_other: "{{count}} naves",
  destinationCount: "{{count}} destino",
  destinationCount_other: "{{count}} destinos",
  regionCount: "{{count}} región",
  regionCount_other: "{{count}} regiones",
  serviceCount: "{{count}} servicio",
  serviceCount_other: "{{count}} servicios",
  servicesInNavieras: "{{count}} servicios en {{n}} naviera",
  servicesInNavieras_other: "{{count}} servicios en {{n}} navieras",
  editAria: "Editar servicio {{name}}",
  deleteAria: "Eliminar servicio {{name}}",
  expandNavieraAria: "Desplegar {{name}}",
  collapseNavieraAria: "Contraer {{name}}",
};

export function ServiciosUnicosContent() {
  const { t } = useLocale();
  const tr = { ...defaultServiciosTr, ...(t?.serviciosPage as Record<string, string> | undefined) };
  const [servicios, setServicios] = useState<ServicioUnico[]>([]);
  const [navieras, setNavieras] = useState<Naviera[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const [navesCatalog, setNavesCatalog] = useState<NaveCatalog[]>([]);
  const [loadingNaves, setLoadingNaves] = useState(false);
  const [naveInputValue, setNaveInputValue] = useState("");
  const [pasteNavesText, setPasteNavesText] = useState("");
  const [newNaveFlow, setNewNaveFlow] = useState<{ nombre: string } | null>(null);
  const [newNaveNavieraId, setNewNaveNavieraId] = useState("");
  const [savingNewNave, setSavingNewNave] = useState(false);
  const [destinosCatalog, setDestinosCatalog] = useState<DestinoCatalog[]>([]);
  const [loadingDestinos, setLoadingDestinos] = useState(false);
  const [destinoInputValue, setDestinoInputValue] = useState("");
  const [pasteDestinosText, setPasteDestinosText] = useState("");
  const [newDestinoFlow, setNewDestinoFlow] = useState<{ nombre: string } | null>(null);
  const [newDestinoPais, setNewDestinoPais] = useState("");
  const [newDestinoCodigo, setNewDestinoCodigo] = useState("");
  const [savingNewDestino, setSavingNewDestino] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [expandedNavieras, setExpandedNavieras] = useState<Set<string>>(new Set());
  const [copyFromServiceId, setCopyFromServiceId] = useState<string>("");
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [copyModalExpandedId, setCopyModalExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    nombre: "",
    naviera_id: "",
    puerto_origen: "",
    naves: [] as string[],
    destinos: [{ puerto: "", puerto_nombre: "", area: "ASIA" }],
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const base = getApiUrl() || "";
    try {
      const [navRes, servRes] = await Promise.all([
        fetch(`${base}/api/public/navieras`),
        fetch(`${base}/api/admin/servicios-unicos`, { credentials: "include" }),
      ]);
      let navData: { navieras?: Naviera[]; error?: string } = {};
      try {
        navData = (await navRes.json()) as { navieras?: Naviera[]; error?: string };
      } catch {
        navData = { error: "Respuesta inválida de navieras" };
      }
      if (!navRes.ok) {
        setNavieras([]);
        throw new Error(navData.error ?? tr.errorLoadNavieras);
      }
      setNavieras(navData.navieras ?? []);

      if (!servRes.ok) {
        let errMsg = tr.errorLoadServicios;
        try {
          const errData = (await servRes.json()) as { error?: string };
          if (errData?.error) errMsg = errData.error;
        } catch {
          errMsg = `${errMsg} (${servRes.status})`;
        }
        throw new Error(errMsg);
      }
      let servData: { servicios?: ServicioUnico[] } = {};
      try {
        servData = (await servRes.json()) as { servicios?: ServicioUnico[] };
      } catch {
        servData = { servicios: [] };
      }
      setServicios(servData.servicios ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setServicios([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleOpenModal = useCallback(() => {
    setEditingId(null);
    setCopyFromServiceId("");
    setModalError(null);
    setNaveInputValue("");
    setPasteNavesText("");
    setNewNaveFlow(null);
    setDestinoInputValue("");
    setPasteDestinosText("");
    setNewDestinoFlow(null);
    const navieraId = navieras[0]?.id ?? "";
    setForm({
      nombre: "",
      naviera_id: navieraId,
      puerto_origen: "",
      naves: [],
      destinos: [{ puerto: "", puerto_nombre: "", area: "ASIA" }],
    });
    setModalOpen(true);
  }, [navieras]);

  const handleCopyFromService = useCallback((servicio: ServicioUnico) => {
    if (!servicio) return;
    setForm((prev) => ({
      ...prev,
      nombre: servicio.nombre,
      puerto_origen: servicio.puerto_origen ?? "",
      naves: servicio.naves?.map((n) => n.nave_nombre) ?? [],
      destinos:
        servicio.destinos?.length > 0
          ? servicio.destinos.map((d) => ({
              puerto: d.puerto ?? "",
              puerto_nombre: d.puerto_nombre ?? "",
              area: normalizeArea(d.area),
            }))
          : [{ puerto: "", puerto_nombre: "", area: "ASIA" }],
    }));
    setCopyFromServiceId(servicio.id);
  }, []);

  const handleOpenEdit = useCallback((servicio: ServicioUnico) => {
    setModalError(null);
    setNaveInputValue("");
    setPasteNavesText("");
    setNewNaveFlow(null);
    setDestinoInputValue("");
    setPasteDestinosText("");
    setNewDestinoFlow(null);
    setEditingId(servicio.id);
    setForm({
      nombre: servicio.nombre,
      naviera_id: servicio.naviera_id,
      puerto_origen: servicio.puerto_origen ?? "",
      naves: servicio.naves?.map((n) => n.nave_nombre) ?? [],
      destinos:
        servicio.destinos?.length > 0
          ? servicio.destinos.map((d) => ({
              puerto: d.puerto ?? "",
              puerto_nombre: d.puerto_nombre ?? "",
              area: normalizeArea(d.area),
            }))
          : [{ puerto: "", puerto_nombre: "", area: "ASIA" }],
    });
    setModalOpen(true);
  }, []);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = useCallback(
    async (servicio: ServicioUnico) => {
      if (!window.confirm(tr.confirmDelete.replace("{{name}}", servicio.nombre))) return;
      setDeletingId(servicio.id);
      setError(null);
      const base = getApiUrl() || "";
      try {
        const res = await fetch(`${base}/api/admin/servicios-unicos/${servicio.id}`, {
          method: "DELETE",
          credentials: "include",
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error ?? tr.errorDelete);
        setSuccessMessage(tr.successDeleted);
        setTimeout(() => setSuccessMessage(null), 4000);
        load();
      } catch (e) {
        setError(e instanceof Error ? e.message : tr.errorDelete);
      } finally {
        setDeletingId(null);
      }
    },
    [load, tr]
  );

  const loadNavesForNaviera = useCallback(async (navieraId: string) => {
    if (!navieraId) {
      setNavesCatalog([]);
      return;
    }
    setLoadingNaves(true);
    const base = getApiUrl();
    try {
      const res = await fetch(`${base}/api/public/naves?naviera_id=${encodeURIComponent(navieraId)}`);
      const data = (await res.json()) as { naves?: NaveCatalog[]; error?: string };
      if (res.ok) setNavesCatalog(data.naves ?? []);
      else setNavesCatalog([]);
    } catch {
      setNavesCatalog([]);
    } finally {
      setLoadingNaves(false);
    }
  }, []);

  useEffect(() => {
    if (form.naviera_id && modalOpen) loadNavesForNaviera(form.naviera_id);
    else if (!form.naviera_id) setNavesCatalog([]);
  }, [form.naviera_id, modalOpen, loadNavesForNaviera]);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setEditingId(null);
    setModalError(null);
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleCloseModal();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [modalOpen, handleCloseModal]);

  useEffect(() => {
    if (modalOpen && modalRef.current) {
      const firstInput = modalRef.current.querySelector<HTMLInputElement>("#servicio-nombre");
      firstInput?.focus();
    }
  }, [modalOpen]);

  const addNaveByName = useCallback((nombre: string) => {
    const name = nombre.trim();
    if (!name) return;
    setForm((f) => {
      if (f.naves.includes(name)) return f;
      return { ...f, naves: [...f.naves, name] };
    });
    setNaveInputValue("");
    setNewNaveFlow(null);
  }, []);

  const handleAddNaveFromSelect = useCallback(
    (naveNombre: string) => {
      if (!naveNombre) return;
      addNaveByName(naveNombre);
    },
    [addNaveByName]
  );

  const saveNaveToCatalog = useCallback(
    async (nombre: string, navieraId: string): Promise<void> => {
      const name = nombre.trim();
      if (!name) throw new Error("Nombre de nave vacío");
      if (!navieraId) throw new Error("Naviera no seleccionada");
      const base = getApiUrl() || "";
      const res = await fetch(`${base}/api/admin/naves`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: name, naviera_id: navieraId }),
      });
      const data = await res.json().catch(() => ({})) as { error?: string };
      const msg = typeof data?.error === "string" ? data.error : `Error al guardar nave (${res.status})`;
      if (!res.ok) throw new Error(msg);
    },
    []
  );

  const handleAddNaveFromInput = useCallback(async () => {
    const name = naveInputValue.trim();
    if (!name) return;
    const exists = navesCatalog.some((n) => n.nombre.toUpperCase() === name.toUpperCase());
    if (exists) {
      addNaveByName(name);
      return;
    }
    const navieraId = form.naviera_id || navieras[0]?.id;
    if (navieraId) {
      setSavingNewNave(true);
      setModalError(null);
      try {
        await saveNaveToCatalog(name, navieraId);
        addNaveByName(name);
        if (navieraId === form.naviera_id) loadNavesForNaviera(form.naviera_id);
      } catch (e) {
        setModalError(e instanceof Error ? e.message : "Error al guardar la nave en el catálogo.");
      } finally {
        setSavingNewNave(false);
      }
      return;
    }
    setNewNaveFlow({ nombre: name });
    setNewNaveNavieraId(navieras[0]?.id ?? "");
  }, [naveInputValue, navesCatalog, form.naviera_id, navieras, addNaveByName, saveNaveToCatalog, loadNavesForNaviera]);

  const handleSaveNewNaveAndAdd = useCallback(async () => {
    if (!newNaveFlow || !newNaveNavieraId) return;
    setSavingNewNave(true);
    setModalError(null);
    const base = getApiUrl();
    try {
      const res = await fetch(`${base}/api/admin/naves`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: newNaveFlow.nombre.trim(), naviera_id: newNaveNavieraId }),
      });
      const data = (await res.json()) as { error?: string; nave?: { nombre: string } };
      if (!res.ok) throw new Error(data.error ?? "Error al guardar nave");
      addNaveByName(newNaveFlow.nombre.trim());
      if (newNaveNavieraId === form.naviera_id) {
        loadNavesForNaviera(form.naviera_id);
      }
    } catch (e) {
      setModalError(e instanceof Error ? e.message : "Error al guardar la nave.");
    } finally {
      setSavingNewNave(false);
    }
  }, [newNaveFlow, newNaveNavieraId, form.naviera_id, addNaveByName, loadNavesForNaviera]);

  const handleRemoveNave = useCallback((i: number) => {
    setForm((f) => ({ ...f, naves: f.naves.filter((_, j) => j !== i) }));
  }, []);

  const handlePasteNavesProcess = useCallback(async () => {
    const raw = pasteNavesText.trim();
    if (!raw) return;
    const names = raw
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const uniqueNames = [...new Set(names)].filter((n) => n.length > 0);
    const toAddFromCatalog: string[] = [];
    const toSaveAndAdd: string[] = [];
    for (const name of uniqueNames) {
      const match = navesCatalog.find((n) => n.nombre.toUpperCase() === name.toUpperCase());
      const resolved = match ? match.nombre : name;
      if (form.naves.includes(resolved)) continue;
      if (toAddFromCatalog.includes(resolved) || toSaveAndAdd.includes(name)) continue;
      if (match) toAddFromCatalog.push(resolved);
      else toSaveAndAdd.push(name);
    }
    const navieraId = form.naviera_id;
    if (toSaveAndAdd.length > 0 && !navieraId) {
      setModalError("Seleccione la naviera del servicio para guardar en el catálogo las naves que no existan.");
      return;
    }
    if (toSaveAndAdd.length > 0 && navieraId) {
      setSavingNewNave(true);
      setModalError(null);
      try {
        for (const name of toSaveAndAdd) {
          await saveNaveToCatalog(name, navieraId);
        }
        if (navesCatalog.length === 0 || toSaveAndAdd.length > 0) {
          loadNavesForNaviera(navieraId);
        }
      } catch (e) {
        setModalError(e instanceof Error ? e.message : "Error al guardar naves en el catálogo.");
        setSavingNewNave(false);
        return;
      }
      setSavingNewNave(false);
    }
    const allToAdd = [...toAddFromCatalog, ...toSaveAndAdd];
    if (allToAdd.length === 0) {
      setPasteNavesText("");
      return;
    }
    setForm((f) => ({ ...f, naves: [...f.naves, ...allToAdd] }));
    setPasteNavesText("");
  }, [pasteNavesText, navesCatalog, form.naves, form.naviera_id, saveNaveToCatalog, loadNavesForNaviera]);

  const loadDestinosCatalog = useCallback(async () => {
    setLoadingDestinos(true);
    const base = getApiUrl() || "";
    try {
      const res = await fetch(`${base}/api/public/destinos`);
      const data = (await res.json()) as { destinos?: DestinoCatalog[]; error?: string };
      if (res.ok) setDestinosCatalog(data.destinos ?? []);
      else setDestinosCatalog([]);
    } catch {
      setDestinosCatalog([]);
    } finally {
      setLoadingDestinos(false);
    }
  }, []);

  useEffect(() => {
    if (modalOpen) loadDestinosCatalog();
  }, [modalOpen, loadDestinosCatalog]);

  const addDestinoToForm = useCallback((puerto: string, puerto_nombre: string, area = "ASIA") => {
    setForm((f) => {
      const exists = f.destinos.some(
        (d) => (d.puerto && d.puerto === puerto) || (d.puerto_nombre && d.puerto_nombre === puerto_nombre)
      );
      if (exists) return f;
      return { ...f, destinos: [...f.destinos, { puerto, puerto_nombre, area }] };
    });
    setDestinoInputValue("");
    setNewDestinoFlow(null);
  }, []);

  const handleAddDestinoFromSelect = useCallback(
    (d: DestinoCatalog) => {
      const puerto = d.codigo_puerto?.trim() || d.nombre;
      addDestinoToForm(puerto, d.nombre);
    },
    [addDestinoToForm]
  );

  const handleAddDestinoFromInput = useCallback(() => {
    const name = destinoInputValue.trim();
    if (!name) return;
    const exists = destinosCatalog.some((d) => d.nombre.toUpperCase() === name.toUpperCase());
    if (exists) {
      const d = destinosCatalog.find((x) => x.nombre.toUpperCase() === name.toUpperCase())!;
      handleAddDestinoFromSelect(d);
      return;
    }
    setNewDestinoFlow({ nombre: name });
    setNewDestinoPais("");
    setNewDestinoCodigo("");
  }, [destinoInputValue, destinosCatalog, handleAddDestinoFromSelect]);

  const handleSaveNewDestinoAndAdd = useCallback(async () => {
    if (!newDestinoFlow) return;
    setSavingNewDestino(true);
    setModalError(null);
    const base = getApiUrl() || "";
    try {
      const res = await fetch(`${base}/api/admin/destinos`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: newDestinoFlow.nombre.trim(),
          codigo_puerto: newDestinoCodigo.trim() || undefined,
          pais: newDestinoPais.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string; destino?: DestinoCatalog };
      if (!res.ok) throw new Error(data.error ?? "Error al guardar destino");
      if (data.destino) {
        setDestinosCatalog((prev) => {
          if (prev.some((x) => x.nombre.toUpperCase() === data.destino!.nombre.toUpperCase())) return prev;
          return [...prev, data.destino!].sort((a, b) => a.nombre.localeCompare(b.nombre));
        });
      }
      addDestinoToForm(newDestinoCodigo.trim() || newDestinoFlow.nombre.trim(), newDestinoFlow.nombre.trim());
    } catch (e) {
      setModalError(e instanceof Error ? e.message : "Error al guardar el destino.");
    } finally {
      setSavingNewDestino(false);
    }
  }, [newDestinoFlow, newDestinoCodigo, newDestinoPais, addDestinoToForm]);

  const handlePasteDestinosProcess = useCallback(() => {
    const raw = pasteDestinosText.trim();
    if (!raw) return;
    const names = raw
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const uniqueNames = [...new Set(names)];
    const currentKeys = new Set(
      form.destinos.map((d) => `${(d.puerto || "").toUpperCase()}|${(d.puerto_nombre || "").toUpperCase()}`)
    );
    for (const name of uniqueNames) {
      const key = `${name.toUpperCase()}|${name.toUpperCase()}`;
      if (currentKeys.has(key)) continue;
      const match = destinosCatalog.find((d) => d.nombre.toUpperCase() === name.toUpperCase());
      if (match) {
        const puerto = match.codigo_puerto?.trim() || match.nombre;
        const keyMatch = `${puerto.toUpperCase()}|${match.nombre.toUpperCase()}`;
        if (currentKeys.has(keyMatch)) continue;
        addDestinoToForm(puerto, match.nombre);
        currentKeys.add(keyMatch);
      } else {
        addDestinoToForm(name, name);
        currentKeys.add(key);
      }
    }
    setPasteDestinosText("");
  }, [pasteDestinosText, destinosCatalog, form.destinos, addDestinoToForm]);

  const handleAddDestinoBlank = useCallback(() => {
    setForm((f) => ({ ...f, destinos: [...f.destinos, { puerto: "", puerto_nombre: "", area: "ASIA" }] }));
  }, []);
  const handleRemoveDestino = useCallback((i: number) => {
    setForm((f) => ({ ...f, destinos: f.destinos.filter((_, j) => j !== i) }));
  }, []);
  const handleDestinoChange = useCallback(
    (i: number, field: "puerto" | "puerto_nombre" | "area", v: string) => {
      setForm((f) => {
        const d = [...f.destinos];
        d[i] = { ...d[i], [field]: v };
        return { ...f, destinos: d };
      });
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    setModalError(null);
    const nombre = form.nombre.trim();
    if (!nombre) {
      setModalError(tr.errorServiceName);
      return;
    }
    if (!form.naviera_id) {
      setModalError(tr.errorCarrier);
      return;
    }
    if (!form.puerto_origen.trim()) {
      setModalError(tr.errorPol);
      return;
    }
    const navesOk = form.naves.filter((n) => n.trim().length > 0);
    if (navesOk.length === 0) {
      setModalError(tr.errorMinVessel);
      return;
    }
    const destinosOk = form.destinos
      .map((d) => ({
        puerto: d.puerto.trim(),
        puerto_nombre: d.puerto_nombre.trim() || null,
        area: normalizeArea(d.area),
      }))
      .filter((d) => d.puerto);
    if (destinosOk.length === 0) {
      setModalError(tr.errorMinDestino);
      return;
    }
    setSaving(true);
    const base = getApiUrl() || "";
    const url = editingId
      ? `${base}/api/admin/servicios-unicos/${editingId}`
      : `${base}/api/admin/servicios-unicos`;
    const method = editingId ? "PUT" : "POST";
    try {
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          naviera_id: form.naviera_id,
          naviera_nombre: navieras.find((n) => n.id === form.naviera_id)?.nombre ?? "",
          puerto_origen: form.puerto_origen.trim(),
          naves: navesOk,
          destinos: destinosOk,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? tr.errorSave);
      handleCloseModal();
      setSuccessMessage(editingId ? tr.successUpdated : tr.successCreated);
      setTimeout(() => setSuccessMessage(null), 4000);
      load();
    } catch (e) {
      setModalError(e instanceof Error ? e.message : tr.errorSave);
    } finally {
      setSaving(false);
    }
  }, [form, editingId, navieras, load, handleCloseModal, tr]);

  return (
    <main className="flex-1 min-h-0 min-w-0 overflow-auto bg-neutral-50" role="main">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-brand-blue">
            {tr.title}
          </h1>
          <button
            type="button"
            onClick={handleOpenModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-blue text-white text-sm font-medium hover:bg-brand-blue/90 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
            aria-label={tr.newServiceAria}
          >
            <Icon icon="lucide:plus" width={18} height={18} />
            {tr.newService}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200" role="alert">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 text-emerald-800 text-sm border border-emerald-200 flex items-center gap-2" role="status">
            <Icon icon="lucide:check-circle" width={18} height={18} aria-hidden />
            {successMessage}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Icon icon="lucide:loader-2" width={32} height={32} className="animate-spin text-brand-blue" aria-hidden />
          </div>
        ) : servicios.length === 0 ? (
          <div className="bg-white rounded-xl border border-neutral-200 p-8 text-center text-neutral-500">
            <Icon icon="lucide:ship" width={40} height={40} className="mx-auto mb-3 opacity-50" />
            <p className="font-medium">{tr.noServices}</p>
            <p className="text-sm mt-1">{tr.noServicesHint}</p>
          </div>
        ) : (() => {
          const getServiceAreas = (s: ServicioUnico): string[] => {
            const areas = (s.destinos ?? [])
              .map((d) => (d.area && d.area.trim() ? d.area.trim() : null))
              .filter((a): a is string => Boolean(a));
            return [...new Set(areas)];
          };

          type ByNaviera = Record<string, ServicioUnico[]>;
          const byAreaThenNaviera: Record<string, ByNaviera> = {};
          const areaOrderList: string[] = [...AREAS, tr.noArea];
          servicios.forEach((s) => {
            const navieraName = s.naviera_nombre ?? tr.unassigned;
            const areas = getServiceAreas(s);
            if (areas.length === 0) {
              const area = tr.noArea;
              if (!byAreaThenNaviera[area]) byAreaThenNaviera[area] = {};
              if (!byAreaThenNaviera[area][navieraName]) byAreaThenNaviera[area][navieraName] = [];
              byAreaThenNaviera[area][navieraName].push(s);
            } else {
              areas.forEach((area) => {
                if (!byAreaThenNaviera[area]) byAreaThenNaviera[area] = {};
                if (!byAreaThenNaviera[area][navieraName]) byAreaThenNaviera[area][navieraName] = [];
                byAreaThenNaviera[area][navieraName].push(s);
              });
            }
          });
          const sortedAreaNames = [...new Set(Object.keys(byAreaThenNaviera))].sort((a, b) => {
            const iA = areaOrderList.indexOf(a);
            const iB = areaOrderList.indexOf(b);
            if (iA >= 0 && iB >= 0) return iA - iB;
            if (iA >= 0) return -1;
            if (iB >= 0) return 1;
            return a.localeCompare(b, undefined, { sensitivity: "base" });
          });

          /** Columnas fijas: las 4 áreas canónicas + "Sin área" si existe */
          const hasNoArea = sortedAreaNames.some((a) => a === tr.noArea);
          const areasForColumns = hasNoArea ? [...AREAS, tr.noArea] : [...AREAS];

          const renderCard = (s: ServicioUnico) => {
            const numNaves = s.naves?.length ?? 0;
            const numDestinos = s.destinos?.length ?? 0;
            const regiones = [
              ...new Set(
                (s.destinos ?? [])
                  .map((d) => (d.area && d.area.trim() ? d.area.trim() : null))
                  .filter((a): a is string => Boolean(a))
              ),
            ];
            const numRegiones = regiones.length;
            const isExpanded = expandedCardId === s.id;
            const navieraLabel = s.naviera_nombre ?? tr.unassigned;
            return (
              <li
                key={s.id}
                className="bg-white rounded-xl border border-neutral-200 shadow-sm min-w-0 overflow-hidden transition-shadow hover:shadow-md flex flex-col"
              >
                <div className="p-4 flex flex-col h-full">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setExpandedCardId((id) => (id === s.id ? null : s.id))}
                      className="flex-1 min-w-0 text-left focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:ring-inset rounded-lg -m-1 p-1"
                      aria-expanded={isExpanded}
                      aria-label={isExpanded ? tr.collapseAria : tr.expandAria}
                    >
                      <p className="text-lg font-extrabold text-neutral-800 truncate" title={navieraLabel}>
                        {navieraLabel}
                      </p>
                      <p className="font-bold text-brand-blue truncate mt-0.5" title={s.nombre}>{s.nombre}</p>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {tr.origin}: {s.puerto_origen || "—"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-xs font-medium text-neutral-600">
                        <span>{numNaves === 1 ? tr.vesselCount.replace("{{count}}", String(numNaves)) : tr.vesselCount_other.replace("{{count}}", String(numNaves))}</span>
                        <span className="text-neutral-300" aria-hidden>·</span>
                        <span>{numDestinos === 1 ? tr.destinationCount.replace("{{count}}", String(numDestinos)) : tr.destinationCount_other.replace("{{count}}", String(numDestinos))}</span>
                        <span className="text-neutral-300" aria-hidden>·</span>
                        <span>{numRegiones === 1 ? tr.regionCount.replace("{{count}}", String(numRegiones)) : tr.regionCount_other.replace("{{count}}", String(numRegiones))}</span>
                      </div>
                      <span className="inline-flex items-center mt-1.5 text-xs text-brand-blue font-medium" aria-hidden>
                        {isExpanded ? tr.viewLess : tr.viewDetail}
                        <Icon icon={isExpanded ? "lucide:chevron-up" : "lucide:chevron-down"} width={16} height={16} className="ml-0.5" />
                      </span>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleOpenEdit(s); }}
                        className="p-1.5 rounded-lg text-neutral-500 hover:text-brand-blue hover:bg-neutral-100 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                        aria-label={tr.editAria.replace("{{name}}", s.nombre)}
                        title={tr.edit}
                      >
                        <Icon icon="lucide:pencil" width={18} height={18} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDelete(s); }}
                        disabled={deletingId === s.id}
                        className="p-1.5 rounded-lg text-neutral-500 hover:text-red-600 hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/30 disabled:opacity-50"
                        aria-label={tr.deleteAria.replace("{{name}}", s.nombre)}
                        title={tr.delete}
                      >
                        <Icon icon="lucide:trash-2" width={18} height={18} />
                      </button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="pb-3 pt-2 mt-1 border-t border-neutral-200 space-y-3">
                      {numRegiones > 0 && (
                        <div>
                          <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-0.5">{tr.regions}</p>
                          <p className="text-sm text-neutral-700">{regiones.join(", ")}</p>
                        </div>
                      )}
                      {s.naves?.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-0.5">{tr.vessels}</p>
                          <p className="text-sm text-neutral-700 break-words" title={s.naves.map((n) => n.nave_nombre).join(", ")}>
                            {s.naves.map((n) => n.nave_nombre).join(", ")}
                          </p>
                        </div>
                      )}
                      {s.destinos?.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-0.5">{tr.destinations}</p>
                          <p className="text-sm text-neutral-700 break-words" title={s.destinos.map((d) => d.puerto_nombre || d.puerto).join(" → ")}>
                            {s.destinos.map((d) => d.puerto_nombre || d.puerto).join(" → ")}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          };

          const navieraKey = (area: string, naviera: string) => `${area}|${naviera}`;
          const toggleNaviera = (key: string) => {
            setExpandedNavieras((prev) => {
              const next = new Set(prev);
              if (next.has(key)) next.delete(key);
              else next.add(key);
              return next;
            });
          };

          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" role="list">
              {areasForColumns.map((areaName) => {
                const byNaviera = byAreaThenNaviera[areaName] ?? {};
                const navieraNamesInArea = Object.keys(byNaviera).sort((a, b) =>
                  a.localeCompare(b, undefined, { sensitivity: "base" })
                );
                const sortedNavierasInArea = navieraNamesInArea.map((name) => ({
                  name,
                  list: [...(byNaviera[name] ?? [])].sort((a, b) =>
                    (a.nombre ?? "").localeCompare(b.nombre ?? "", undefined, { sensitivity: "base" })
                  ),
                }));
                const totalServices = sortedNavierasInArea.reduce((sum, n) => sum + n.list.length, 0);

                return (
                  <section key={areaName} className="min-w-0">
                    <h2 className="text-base font-bold text-neutral-800 mb-1 flex items-center gap-2">
                      <Icon icon="lucide:map-pin" width={16} height={16} className="text-brand-blue shrink-0" />
                      {areaName}
                    </h2>
                    <p className="text-xs text-neutral-500 mb-3">
                      {totalServices === 1
                        ? tr.servicesInNavieras.replace("{{count}}", String(totalServices)).replace("{{n}}", String(sortedNavierasInArea.length))
                        : tr.servicesInNavieras_other.replace("{{count}}", String(totalServices)).replace("{{n}}", String(sortedNavierasInArea.length))}
                    </p>
                    <div className="space-y-4" role="list">
                      {sortedNavierasInArea.map(({ name: navieraName, list: serviceList }) => {
                        const key = navieraKey(areaName, navieraName);
                        const isNavieraExpanded = expandedNavieras.has(key);
                        return (
                          <article
                            key={key}
                            className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden flex flex-col min-w-0"
                          >
                            <button
                              type="button"
                              onClick={() => toggleNaviera(key)}
                              className="w-full px-4 py-3 text-left hover:bg-neutral-50/80 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:ring-inset flex items-center justify-between gap-3"
                              aria-expanded={isNavieraExpanded}
                              aria-label={isNavieraExpanded ? tr.collapseNavieraAria.replace("{{name}}", navieraName) : tr.expandNavieraAria.replace("{{name}}", navieraName)}
                            >
                              <div className="min-w-0 flex-1">
                                <h3 className="text-base font-bold text-neutral-800 truncate">
                                  {navieraName}
                                </h3>
                                <p className="text-xs text-neutral-500 mt-0.5">
                                  {serviceList.length === 1 ? tr.serviceCount.replace("{{count}}", String(serviceList.length)) : tr.serviceCount_other.replace("{{count}}", String(serviceList.length))}
                                </p>
                              </div>
                              <Icon
                                icon={isNavieraExpanded ? "lucide:chevron-up" : "lucide:chevron-down"}
                                width={20}
                                height={20}
                                className="flex-shrink-0 text-neutral-500"
                                aria-hidden
                              />
                            </button>
                            {isNavieraExpanded && (
                              <div className="border-t border-neutral-200 p-3 bg-neutral-50/50 overflow-y-auto flex-1 min-h-0">
                                <ul className="space-y-3" role="list">
                                  {serviceList.map((s) => renderCard(s))}
                                </ul>
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          );
        })()}
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-white"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-servicio-title"
        >
          <div ref={modalRef} className="flex flex-col min-h-0 flex-1 overflow-y-auto">
            <div className="p-6 sm:p-8 w-full pb-10">
              <header className="mb-8">
                <h2 id="modal-servicio-title" className="text-xl font-semibold text-brand-blue tracking-tight">
                  {editingId ? tr.modalTitleEdit : tr.modalTitleNew}
                </h2>
                <p className="text-sm text-neutral-500 mt-2 leading-relaxed">
                  {editingId ? tr.modalDescEdit : tr.modalDescNew}
                </p>
              </header>

              {modalError && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200 flex items-center gap-3" role="alert">
                  <Icon icon="lucide:alert-circle" width={20} height={20} className="shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="space-y-8">
                {!editingId && servicios.length > 0 && (
                  <section className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-5 sm:p-6">
                    <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Icon icon="lucide:copy" width={16} height={16} className="text-brand-blue" />
                      {tr.copyFromService}
                    </h3>
                    <p className="text-sm text-neutral-600 mb-4">
                      {tr.copyFromServiceHint}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                      <button
                        type="button"
                        onClick={() => setCopyModalOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand-blue text-white text-sm font-medium hover:bg-brand-blue/90 focus:outline-none focus:ring-2 focus:ring-brand-blue/40"
                      >
                        <Icon icon="lucide:rows" width={16} height={16} aria-hidden />
                        Ver servicios por región
                      </button>
                      {copyFromServiceId && (
                        <p className="text-xs text-neutral-600">
                          Servicio seleccionado:{" "}
                          <span className="font-medium text-neutral-800">
                            {servicios.find((s) => s.id === copyFromServiceId)?.nombre ?? ""}
                          </span>
                        </p>
                      )}
                    </div>
                  </section>
                )}

                <section className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-5 sm:p-6">
                  <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Icon icon="lucide:file-text" width={16} height={16} className="text-brand-blue" />
                    {tr.serviceData}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                      <label htmlFor="servicio-nombre" className="block text-sm font-medium text-neutral-700 mb-2">
                        {tr.serviceName}
                      </label>
                      <input
                        id="servicio-nombre"
                        type="text"
                        value={form.nombre}
                        onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue bg-white transition-colors"
                        placeholder={tr.serviceNamePlaceholder}
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <label htmlFor="servicio-naviera" className="block text-sm font-medium text-neutral-700 mb-2">
                        {tr.carrier}
                      </label>
                      <select
                        id="servicio-naviera"
                        value={form.naviera_id}
                        onChange={(e) => setForm((f) => ({ ...f, naviera_id: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue bg-white transition-colors"
                      >
                        <option value="">{tr.selectCarrier}</option>
                        {navieras.map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="servicio-pol" className="block text-sm font-medium text-neutral-700 mb-2">
                        {tr.pol}
                      </label>
                      <input
                        id="servicio-pol"
                        type="text"
                        value={form.puerto_origen}
                        onChange={(e) => setForm((f) => ({ ...f, puerto_origen: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue bg-white transition-colors"
                        placeholder={tr.polPlaceholder}
                        autoComplete="off"
                      />
                    </div>
                  </div>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <section className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-5 sm:p-6 space-y-4 min-w-0">
                    <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wider flex items-center gap-2">
                      <Icon icon="lucide:ship" width={16} height={16} className="text-brand-blue" />
                      {tr.vesselsSection}
                    </h3>
                    <p className="text-sm text-neutral-500">
                      {tr.vesselsHint}
                    </p>
                    {!form.naviera_id ? (
                      <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        {tr.selectCarrierFirst}
                      </p>
                    ) : (
                      <>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <select
                            id="nave-select"
                            value=""
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v) handleAddNaveFromSelect(v);
                              e.target.value = "";
                            }}
                            className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors"
                            aria-label={tr.selectVessel}
                            disabled={loadingNaves}
                          >
                            <option value="">
                              {loadingNaves ? tr.loading : tr.selectVessel}
                            </option>
                            {navesCatalog.map((n) => (
                              <option key={n.id} value={n.nombre}>
                                {n.nombre}
                              </option>
                            ))}
                          </select>
                          <span className="text-neutral-400 self-center text-sm hidden sm:inline">o</span>
                          <div className="flex gap-2 flex-1 min-w-0">
                            <input
                              type="text"
                              value={naveInputValue}
                              onChange={(e) => setNaveInputValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleAddNaveFromInput();
                                }
                              }}
                              className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors"
                              placeholder={tr.writeNewVessel}
                              list="naves-datalist"
                              aria-label={tr.writeNewVessel}
                            />
                            <button
                              type="button"
                              onClick={() => handleAddNaveFromInput()}
                              disabled={!naveInputValue.trim() || savingNewNave}
                              className="shrink-0 px-3 py-2 rounded-lg bg-brand-blue text-white text-sm font-medium hover:bg-brand-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                            >
                              {savingNewNave ? tr.saving : tr.add}
                            </button>
                          </div>
                        </div>
                        <div className="mt-4">
                          <label htmlFor="paste-naves" className="block text-sm font-medium text-neutral-700 mb-1.5">
                            {tr.pasteVessels}
                          </label>
                          <p className="text-xs text-neutral-500 mb-2">
                            {tr.pasteVesselsHint}
                          </p>
                          <div className="flex gap-2">
                            <textarea
                              id="paste-naves"
                              value={pasteNavesText}
                              onChange={(e) => setPasteNavesText(e.target.value)}
                              rows={3}
                              className="flex-1 min-w-0 px-4 py-2.5 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue bg-white transition-colors resize-y"
                              placeholder={tr.pasteVessels}
                              aria-label={tr.pasteVesselsAria}
                            />
                            <button
                              type="button"
                              onClick={() => handlePasteNavesProcess()}
                              disabled={!pasteNavesText.trim() || savingNewNave}
                              className="shrink-0 self-end px-3 py-2 rounded-lg bg-neutral-100 text-neutral-700 text-sm font-medium hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue/30 border border-neutral-200"
                            >
                              {savingNewNave ? tr.saving : tr.searchAndAdd}
                            </button>
                          </div>
                        </div>
                        <datalist id="naves-datalist">
                          {navesCatalog.map((n) => (
                            <option key={n.id} value={n.nombre} />
                          ))}
                        </datalist>
                        {newNaveFlow && (
                          <div className="mt-3 p-3 rounded-lg border border-brand-blue/30 bg-brand-blue/5 space-y-2">
                            <p className="text-sm font-medium text-brand-blue">
                              {tr.newVesselPrompt.replace("{{name}}", newNaveFlow.nombre)}
                            </p>
                            <div className="flex flex-wrap gap-2 items-center">
                              <select
                                value={newNaveNavieraId}
                                onChange={(e) => setNewNaveNavieraId(e.target.value)}
                                className="px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                                aria-label={tr.assignCarrierAria}
                              >
                                {navieras.map((n) => (
                                  <option key={n.id} value={n.id}>
                                    {n.nombre}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={handleSaveNewNaveAndAdd}
                                disabled={savingNewNave || !newNaveNavieraId}
                                className="px-3 py-2 rounded-lg bg-brand-blue text-white text-sm font-medium hover:bg-brand-blue/90 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                              >
                                {savingNewNave ? tr.saving : tr.saveAndAdd}
                              </button>
                              <button
                                type="button"
                                onClick={() => setNewNaveFlow(null)}
                                className="px-3 py-2 rounded-lg border border-neutral-200 text-neutral-600 text-sm hover:bg-neutral-50 transition-colors"
                              >
                                {tr.cancel}
                              </button>
                            </div>
                          </div>
                        )}
                        {form.naves.length > 0 && (
                          <ul className="flex flex-wrap gap-2 mt-2" aria-label="Naves del servicio">
                            {form.naves.map((nombre, i) => (
                              <li key={`${nombre}-${i}`} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-100 border border-neutral-200 text-sm">
                                <span>{nombre}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveNave(i)}
                                  className="p-0.5 text-neutral-500 hover:text-red-600 rounded focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                                  aria-label={`Quitar nave ${nombre}`}
                                >
                                  <Icon icon="lucide:x" width={14} height={14} />
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    )}
                  </section>

                  <section className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-5 sm:p-6 space-y-4 min-w-0">
                    <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wider flex items-center gap-2">
                      <Icon icon="lucide:map-pin" width={16} height={16} className="text-brand-blue" />
                      {tr.destinosSection}
                    </h3>
                    <p className="text-sm text-neutral-500">
                      {tr.destinosHint}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <select
                        id="destino-select"
                        value=""
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) return;
                          const d = destinosCatalog.find((x) => x.id === val);
                          if (d) handleAddDestinoFromSelect(d);
                          e.target.value = "";
                        }}
                        className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors"
                        aria-label={tr.selectDestino}
                        disabled={loadingDestinos}
                      >
                        <option value="">
                          {loadingDestinos ? tr.loading : tr.selectDestino}
                        </option>
                        {destinosCatalog.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.nombre}
                            {d.codigo_puerto ? ` (${d.codigo_puerto})` : ""}
                            {d.pais ? ` — ${d.pais}` : ""}
                          </option>
                        ))}
                      </select>
                      <span className="text-neutral-400 self-center text-sm hidden sm:inline">o</span>
                      <div className="flex gap-2 flex-1 min-w-0">
                        <input
                          type="text"
                          value={destinoInputValue}
                          onChange={(e) => setDestinoInputValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddDestinoFromInput();
                            }
                          }}
                          className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors"
                          placeholder={tr.writeNewDestino}
                          list="destinos-datalist"
                          aria-label={tr.writeNewDestino}
                        />
                        <button
                          type="button"
                          onClick={handleAddDestinoFromInput}
                          disabled={!destinoInputValue.trim()}
                          className="shrink-0 px-3 py-2 rounded-lg bg-brand-blue text-white text-sm font-medium hover:bg-brand-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                        >
                          {tr.add}
                        </button>
                      </div>
                    </div>
                    <div className="mt-4">
                      <label htmlFor="paste-destinos" className="block text-sm font-medium text-neutral-700 mb-1.5">
                        {tr.pasteDestinos}
                      </label>
                      <p className="text-xs text-neutral-500 mb-2">
                        {tr.pasteDestinosHint}
                      </p>
                      <div className="flex gap-2">
                        <textarea
                          id="paste-destinos"
                          value={pasteDestinosText}
                          onChange={(e) => setPasteDestinosText(e.target.value)}
                          rows={3}
                          className="flex-1 min-w-0 px-4 py-2.5 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue bg-white transition-colors resize-y"
                          placeholder={tr.pasteDestinos}
                          aria-label={tr.pasteDestinosAria ?? tr.pasteDestinos}
                        />
                        <button
                          type="button"
                          onClick={handlePasteDestinosProcess}
                          disabled={!pasteDestinosText.trim()}
                          className="shrink-0 self-end px-3 py-2 rounded-lg bg-neutral-100 text-neutral-700 text-sm font-medium hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue/30 border border-neutral-200"
                        >
                          {tr.searchAndAdd}
                        </button>
                      </div>
                    </div>
                    <datalist id="destinos-datalist">
                      {destinosCatalog.map((d) => (
                        <option key={d.id} value={d.nombre} />
                      ))}
                    </datalist>
                    {newDestinoFlow && (
                      <div className="mt-3 p-3 rounded-lg border border-brand-blue/30 bg-brand-blue/5 space-y-2">
                        <p className="text-sm font-medium text-brand-blue">
                          {tr.newDestinoPrompt.replace("{{name}}", newDestinoFlow.nombre)}
                        </p>
                        <div className="flex flex-wrap gap-2 items-end">
                          <div>
                            <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-0.5">Código (opcional)</label>
                            <input
                              type="text"
                              value={newDestinoCodigo}
                              onChange={(e) => setNewDestinoCodigo(e.target.value)}
                              className="w-28 px-2 py-1.5 rounded-lg border border-neutral-200 text-sm"
                              placeholder="CNSHA"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-0.5">País (opcional)</label>
                            <input
                              type="text"
                              value={newDestinoPais}
                              onChange={(e) => setNewDestinoPais(e.target.value)}
                              className="w-40 px-2 py-1.5 rounded-lg border border-neutral-200 text-sm"
                              placeholder="China"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleSaveNewDestinoAndAdd}
                            disabled={savingNewDestino}
                            className="px-3 py-2 rounded-lg bg-brand-blue text-white text-sm font-medium hover:bg-brand-blue/90 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                          >
                            {savingNewDestino ? tr.saving : tr.saveAndAdd}
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewDestinoFlow(null)}
                            className="px-3 py-2 rounded-lg border border-neutral-200 text-neutral-600 text-sm hover:bg-neutral-50 transition-colors"
                          >
                            {tr.cancel}
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-neutral-500">{tr.destinosDelServicio}</span>
                      <button
                        type="button"
                        onClick={handleAddDestinoBlank}
                        className="text-xs font-medium text-brand-blue hover:underline focus:outline-none focus:ring-2 focus:ring-brand-blue/30 rounded"
                      >
                        {tr.addRowManual}
                      </button>
                    </div>
                    <ul className="space-y-3" aria-label="Lista de destinos">
                      {form.destinos.map((d, i) => (
                        <li key={i} className="p-3 rounded-lg border border-neutral-100 bg-neutral-50/50">
                          <div className="grid grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto] gap-2 items-end">
                            <div className="min-w-0">
                              <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-0.5">Código</label>
                              <input
                                type="text"
                                value={d.puerto}
                                onChange={(e) => handleDestinoChange(i, "puerto", e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors"
                                placeholder="CNSHA"
                                aria-label={`Destino ${i + 1} código`}
                              />
                            </div>
                            <div className="min-w-0">
                              <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-0.5">Nombre</label>
                              <input
                                type="text"
                                value={d.puerto_nombre}
                                onChange={(e) => handleDestinoChange(i, "puerto_nombre", e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors"
                                placeholder="Shanghai"
                                aria-label={`Destino ${i + 1} nombre`}
                              />
                            </div>
                            <div className="min-w-[100px]">
                              <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-0.5">Área</label>
                              <select
                                value={normalizeArea(d.area)}
                                onChange={(e) => handleDestinoChange(i, "area", e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors"
                                aria-label={`Destino ${i + 1} área`}
                              >
                                {AREAS.map((a) => (
                                  <option key={a} value={a}>
                                    {a}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveDestino(i)}
                              disabled={form.destinos.length <= 1}
                              className="p-2 text-neutral-500 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed rounded focus:outline-none focus:ring-2 focus:ring-brand-blue/30 h-[34px] shrink-0"
                              aria-label={tr.removeDestino}
                            >
                              <Icon icon="lucide:trash-2" width={16} height={16} />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>
              </div>

              <footer className="mt-8 flex gap-4 pt-4 border-t border-neutral-200 bg-white">
                <div className="w-full flex gap-4">
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
                    {saving ? (
                      <>
                        <Icon icon="lucide:loader-2" width={18} height={18} className="inline-block animate-spin mr-1.5 align-middle" aria-hidden />
                        {tr.saving}
                      </>
                    ) : editingId ? (
                      tr.save
                    ) : (
                      tr.create
                    )}
                  </button>
                </div>
              </footer>
            </div>
          </div>
        </div>
      )}
      {copyModalOpen && servicios.length > 0 && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Seleccionar servicio para copiar"
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-hidden
            onClick={() => setCopyModalOpen(false)}
          />
          <div className="relative w-full max-w-6xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-neutral-200 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-200 bg-neutral-50">
              <div>
                <h2 className="text-sm font-semibold text-neutral-900">
                  Usar datos de otro servicio
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Explora los servicios por área y selecciona uno para copiar su configuración.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCopyModalOpen(false)}
                className="p-2 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                aria-label="Cerrar selección de servicio"
              >
                <Icon icon="lucide:x" width={18} height={18} aria-hidden />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-auto px-5 py-4">
              {(() => {
                const AREAS_ORDER = ["ASIA", "EUROPA", "AMERICA", "INDIA-MEDIOORIENTE"] as const;
                const areaLabels: Record<string, string> = {
                  ASIA: "Asia",
                  EUROPA: "Europa",
                  AMERICA: "América",
                  "INDIA-MEDIOORIENTE": "India y Medio Oriente",
                  SIN_AREA: "Sin área",
                };
                const grouped: Record<string, ServicioUnico[]> = {};
                for (const srv of servicios) {
                  const areasSrv = new Set(
                    (srv.destinos ?? [])
                      .map((d) => normalizeArea(d.area))
                      .filter((a) => a && a.length > 0)
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
                  ...AREAS_ORDER.filter((a) => grouped[a]?.length),
                  ...(grouped.SIN_AREA ? ["SIN_AREA"] : []),
                ];
                if (orderedAreas.length === 0) {
                  return (
                    <p className="text-sm text-neutral-500">
                      No hay servicios con destinos configurados aún.
                    </p>
                  );
                }
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    {orderedAreas.map((areaKey) => (
                      <section
                        key={areaKey}
                        className="rounded-xl border border-neutral-200 bg-neutral-50/80 p-3 flex flex-col gap-2"
                      >
                        <h3 className="text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-brand-blue" />
                          {areaLabels[areaKey] ?? areaKey}
                        </h3>
                        <div className="space-y-2">
                          {grouped[areaKey]!.map((srv) => (
                            <button
                              key={srv.id}
                              type="button"
                              onClick={() => {
                                handleCopyFromService(srv);
                                setCopyFromServiceId(srv.id);
                                setCopyModalOpen(false);
                              }}
                              className="w-full text-left rounded-lg border border-neutral-200 bg-white px-3 py-2.5 hover:border-brand-blue/70 hover:bg-brand-blue/5 transition-colors"
                            >
                              <p className="text-xs font-semibold text-neutral-900 flex items-center justify-between gap-2">
                                <span className="truncate">{srv.nombre}</span>
                                <span className="text-[10px] font-medium text-brand-blue uppercase">
                                  {srv.naviera_nombre ?? tr.unassigned}












































                                </span>
                              </p>
                              <p className="text-[11px] text-neutral-500 mt-0.5 truncate">
                                POL: {srv.puerto_origen || "—"}
                              </p>
                              <p className="text-[11px] text-neutral-500 mt-0.5 truncate">
                                Naves: {(srv.naves ?? []).map((n) => n.nave_nombre).join(", ") || "—"}
                              </p>
                              <p className="text-[11px] text-neutral-500 mt-0.5 line-clamp-2">
                                Destinos:{" "}
                                {(srv.destinos ?? [])
                                  .map((d) => d.puerto_nombre || d.puerto)
                                  .filter(Boolean)
                                  .join(", ") || "—"}
                              </p>
                              <p className="mt-1 text-[11px] font-medium text-brand-blue">
                                Ver detalle
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
        </div>
      )}
    </main>
  );
}
