import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { ComboboxInput } from "@/components/ui/ComboboxInput";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { sendEmail } from "@/lib/email/sendEmail";
import { brand } from "@/lib/brand";
import { withBase } from "@/lib/basePath";
import { useAuth } from "@/lib/auth/AuthContext";
import DatePicker, { registerLocale } from "react-datepicker";
import { es } from "date-fns/locale";
import { format, parse, differenceInDays } from "date-fns";
import "react-datepicker/dist/react-datepicker.css";
import {
  STACKING_DRAFTS_STORAGE_KEY,
  getDraftForItinerary,
  getEmptyStackingDraft,
  normalizeDraftsKeys,
  type StackingDraft,
} from "@/lib/stacking-drafts";
import {
  draftToReservaStackingDatetimeFields,
  pickItinerarioForStackingSync,
} from "@/lib/stacking-reserva-sync";

registerLocale("es", es);

type CatalogoItem = { id: string; valor: string; descripcion?: string };
type SelectOption = { id: string; nombre: string };

type FormData = {
  tipo_operacion: string;
  estado_operacion: string;
  ejecutivo: string;
  cliente: string;
  dueno_reserva: string;
  consignatario: string;
  incoterm: string;
  forma_pago: string;
  especie: string;
  pais: string;
  temperatura: string;
  ventilacion: string;
  tratamiento_frio: string;
  tratamiento_frio_o2: string;
  tratamiento_frio_co2: string;
  tipo_atmosfera: string;
  tipo_unidad: string;
  naviera: string;
  nave: string;
  viaje: string;
  pol: string;
  pod: string;
  etd: string;
  eta: string;
  booking: string;
  planta_presentacion: string;
  citacion: string;
  deposito: string;
  inicio_stacking: string;
  fin_stacking: string;
  corte_documental: string;
  observaciones: string;
};

const initialFormData: FormData = {
  tipo_operacion: "EXPORTACIÓN",
  estado_operacion: "PENDIENTE",
  ejecutivo: "",
  cliente: "",
  dueno_reserva: "ASLI",
  consignatario: "",
  incoterm: "",
  forma_pago: "",
  especie: "",
  pais: "",
  temperatura: "",
  ventilacion: "",
  tratamiento_frio: "",
  tratamiento_frio_o2: "",
  tratamiento_frio_co2: "",
  tipo_atmosfera: "",
  tipo_unidad: "40RF",
  naviera: "",
  nave: "",
  viaje: "",
  pol: "",
  pod: "",
  etd: "",
  eta: "",
  booking: "",
  planta_presentacion: "",
  citacion: "",
  deposito: "",
  inicio_stacking: "",
  fin_stacking: "",
  corte_documental: "",
  observaciones: "",
};

type SectionKey =
  | "general"
  | "comercial"
  | "carga"
  | "naviera"
  | "planta"
  | "deposito"
  | "observaciones";

const sectionIcons: Record<SectionKey, string> = {
  general: "typcn:clipboard",
  comercial: "typcn:briefcase",
  carga: "typcn:archive",
  naviera: "typcn:plane",
  planta: "typcn:home",
  deposito: "typcn:location",
  observaciones: "typcn:document-text",
};

const SECTION_ORDER: SectionKey[] = [
  "general",
  "comercial",
  "carga",
  "naviera",
  "planta",
  "deposito",
  "observaciones",
];

export function CrearReservaContent() {
  const { t } = useLocale();
  const tr = t.crearReserva;
  const { profile, empresaNombres, isSuperadmin } = useAuth();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [lastSavedPayload, setLastSavedPayload] = useState<Record<string, unknown> | null>(null);
  const [lastSavedIds, setLastSavedIds] = useState<{ id: string; ref_asli: string | null }[]>([]);
  const xlsxCache = useRef<{ base64: string; name: string } | null>(null);

  const [catalogos, setCatalogos] = useState<Record<string, CatalogoItem[]>>({});
  const [navieras, setNavieras] = useState<SelectOption[]>([]);
  const [naves, setNaves] = useState<SelectOption[]>([]);
  const [navesFiltered, setNavesFiltered] = useState<SelectOption[]>([]);
  const [plantas, setPlantas] = useState<SelectOption[]>([]);
  const [depositos, setDepositos] = useState<SelectOption[]>([]);
  const [destinos, setDestinos] = useState<SelectOption[]>([]);
  const [puertosOrigen, setPuertosOrigen] = useState<SelectOption[]>([]);
  const [consignatarios, setConsignatarios] = useState<SelectOption[]>([]);
  const [ejecutivos, setEjecutivos] = useState<SelectOption[]>([]);
  const [clientes, setClientes] = useState<SelectOption[]>([]);
  const [especies, setEspecies] = useState<SelectOption[]>([]);
  const [loadingCatalogos, setLoadingCatalogos] = useState(true);

  // Estado para sugerencias de viaje desde itinerario
  const [viajesSugeridos, setViajesSugeridos] = useState<string[]>([]);
  const [viajeInputManual, setViajeInputManual] = useState(false);

  // Estados para el combobox de clientes
  const [clienteInput, setClienteInput] = useState("");
  const [showAddClienteModal, setShowAddClienteModal] = useState(false);
  const [addingCliente, setAddingCliente] = useState(false);

  // Estados para el combobox de planta de presentación
  const [plantaInput, setPlantaInput] = useState("");
  const [addingPlanta, setAddingPlanta] = useState(false);

  // Estados para el combobox de especie
  const [especieInput, setEspecieInput] = useState("");
  const [addingEspecie, setAddingEspecie] = useState(false);

  const [showPreview, setShowPreview] = useState(false);
  const [copias, setCopias] = useState(1);
  const mainRef = useRef<HTMLElement>(null);

  const loadDatosDePrueba = useCallback(() => {
    const firstId = (opts: SelectOption[]) => opts[0]?.id ?? "";
    const today = new Date();
    const etd = format(today, "yyyy-MM-dd");
    const eta = format(new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000), "yyyy-MM-dd");

    const ejecutivoId =
      profile?.id && ejecutivos.some((e) => e.id === profile.id) ? profile.id : firstId(ejecutivos);

    const clienteId = firstId(clientes);

    setFormData((prev) => ({
      ...prev,
      tipo_operacion: prev.tipo_operacion || "EXPORTACIÓN",
      ejecutivo: prev.ejecutivo || ejecutivoId,
      incoterm: prev.incoterm || "FOB",
      forma_pago: prev.forma_pago || "CRÉDITO",
      consignatario: prev.consignatario || firstId(consignatarios),
      cliente: prev.cliente || clienteId,
      especie: prev.especie || firstId(especies),
      temperatura: prev.temperatura || "0",
      ventilacion: prev.ventilacion || "25",
      tratamiento_frio: prev.tratamiento_frio || "",
      tipo_atmosfera: prev.tipo_atmosfera || "",
      tratamiento_frio_o2: prev.tratamiento_frio_o2 || "",
      tratamiento_frio_co2: prev.tratamiento_frio_co2 || "",
      naviera: prev.naviera || firstId(navieras),
      nave: prev.nave || firstId(navesFiltered.length ? navesFiltered : naves),
      viaje: prev.viaje || "001A",
      pol: prev.pol || firstId(puertosOrigen),
      pod: prev.pod || firstId(destinos),
      etd: prev.etd || etd,
      eta: prev.eta || eta,
      booking: "", // explícitamente vacío
      planta_presentacion: prev.planta_presentacion || firstId(plantas),
      deposito: prev.deposito || firstId(depositos),
      citacion: prev.citacion || "",
      observaciones: prev.observaciones || "",
    }));

    setClienteInput((prev) => prev || (clientes.find((c) => c.id === clienteId)?.nombre ?? ""));
  }, [
    profile?.id,
    ejecutivos,
    clientes,
    consignatarios,
    especies,
    navieras,
    naves,
    navesFiltered,
    puertosOrigen,
    destinos,
    plantas,
    depositos,
  ]);

  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  const fetchCatalogos = useCallback(async () => {
    if (!supabase) return;
    setLoadingCatalogos(true);
    setError(null);

    try {
      const [
        catalogosRes,
        navierasRes,
        navesRes,
        plantasRes,
        depositosRes,
        destinosRes,
        puertosRes,
        consigRes,
        ejecutivosRes,
        clientesRes,
        especiesRes,
      ] = await Promise.all([
        supabase.from("catalogos").select("*").eq("activo", true).order("orden"),
        supabase.from("navieras").select("id, nombre").order("nombre"),
        supabase.from("naves").select("id, nombre").order("nombre"),
        supabase.from("plantas").select("id, nombre").eq("activo", true).order("nombre"),
        supabase.from("depositos").select("id, nombre").eq("activo", true).order("nombre"),
        supabase.from("destinos").select("id, nombre").eq("activo", true).order("nombre"),
        supabase.from("puertos_origen").select("id, nombre").eq("activo", true).order("nombre"),
        supabase.from("consignatarios").select("id, nombre").eq("activo", true).order("nombre"),
        supabase.from("usuarios").select("id, nombre").in("rol", ["ejecutivo", "admin", "superadmin"]).eq("activo", true).order("nombre"),
        supabase.from("empresas").select("id, nombre").order("nombre"),
        supabase.from("especies").select("id, nombre").order("nombre"),
      ]);

      if (catalogosRes.error) {
        console.error("Error loading catalogos:", catalogosRes.error);
      } else if (catalogosRes.data) {
        const grouped: Record<string, CatalogoItem[]> = {};
        for (const item of catalogosRes.data) {
          const cat = item.categoria as string;
          if (!grouped[cat]) grouped[cat] = [];
          grouped[cat].push({ id: item.id, valor: item.valor, descripcion: item.descripcion });
        }
        setCatalogos(grouped);
      }

      if (navierasRes.error) {
        console.error("Error loading navieras:", navierasRes.error);
      } else if (navierasRes.data) {
        setNavieras(navierasRes.data);
      }

      if (navesRes.error) {
        console.error("Error loading naves:", navesRes.error);
      } else if (navesRes.data) {
        setNaves(navesRes.data);
        setNavesFiltered(navesRes.data);
      }

      if (plantasRes.error) {
        console.error("Error loading plantas:", plantasRes.error);
      } else if (plantasRes.data) {
        setPlantas(plantasRes.data);
      }

      if (depositosRes.error) {
        console.error("Error loading depositos:", depositosRes.error);
      } else if (depositosRes.data) {
        setDepositos(depositosRes.data);
      }

      if (destinosRes.error) {
        console.error("Error loading destinos:", destinosRes.error);
      } else if (destinosRes.data) {
        setDestinos(destinosRes.data);
      }

      if (puertosRes.error) {
        console.error("Error loading puertos_origen:", puertosRes.error);
      } else if (puertosRes.data) {
        setPuertosOrigen(puertosRes.data);
      }

      if (consigRes.error) {
        console.error("Error loading consignatarios:", consigRes.error);
      } else if (consigRes.data) {
        setConsignatarios(consigRes.data);
      }

      if (ejecutivosRes.error) {
        console.error("Error loading ejecutivos:", ejecutivosRes.error);
      } else if (ejecutivosRes.data) {
        const sorted = [...ejecutivosRes.data];
        if (profile?.id) {
          const idx = sorted.findIndex((e) => e.id === profile.id);
          if (idx > 0) {
            const [me] = sorted.splice(idx, 1);
            sorted.unshift(me);
          }
        }
        setEjecutivos(sorted);
      }

      if (especiesRes.error) {
        console.error("Error loading especies:", especiesRes.error);
      } else if (especiesRes.data) {
        setEspecies(especiesRes.data);
      }

      if (clientesRes.error) {
        console.error("Error loading empresas:", clientesRes.error);
      } else if (clientesRes.data) {
        setClientes(clientesRes.data);
      }
    } catch (err) {
      console.error("Error fetching catalogos:", err);
      setError(tr.supabaseError);
    }

    setLoadingCatalogos(false);
  }, [supabase, tr.supabaseError]);

  useEffect(() => {
    void fetchCatalogos();
  }, [fetchCatalogos]);

  // Auto-seleccionar ejecutivo logueado
  useEffect(() => {
    if (profile?.id && ejecutivos.length > 0 && !formData.ejecutivo) {
      const me = ejecutivos.find((e) => e.id === profile.id);
      if (me) setFormData((prev) => ({ ...prev, ejecutivo: me.id }));
    }
  }, [ejecutivos, profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!formData.naviera || !supabase) {
      setNavesFiltered(naves);
      return;
    }
    const fetchNavesNaviera = async () => {
      const { data } = await supabase
        .from("navieras_naves")
        .select("nave_id, naves(id, nombre)")
        .eq("naviera_id", formData.naviera);
      const filtered =
        data && data.length > 0
          ? data.map((d) => d.naves as unknown as SelectOption).filter(Boolean).sort((a, b) => a.nombre.localeCompare(b.nombre))
          : naves;
      setNavesFiltered(filtered);
      // Si la nave actual no está en la nueva lista filtrada, seleccionar la primera
      setFormData((prev) => {
        if (!prev.nave || filtered.some((n) => n.id === prev.nave)) return prev;
        return { ...prev, nave: filtered[0]?.id ?? "" };
      });
    };
    void fetchNavesNaviera();
  }, [formData.naviera, supabase, naves]);

  // Al cambiar la nave, buscar viajes disponibles en itinerarios
  useEffect(() => {
    if (!formData.nave || !supabase) {
      setViajesSugeridos([]);
      return;
    }
    const naveName = navesFiltered.find((n) => n.id === formData.nave)?.nombre
      ?? naves.find((n) => n.id === formData.nave)?.nombre;
    if (!naveName) return;

    const fetchViajes = async () => {
      const { data } = await supabase
        .from("itinerarios")
        .select("viaje")
        .eq("nave", naveName)
        .not("viaje", "is", null);

      if (data && data.length > 0) {
        const unique = [...new Set(data.map((d) => d.viaje as string).filter(Boolean))];
        setViajesSugeridos(unique);
        // Auto-seleccionar si solo hay un viaje y el usuario no ha escrito nada
        if (unique.length === 1 && !formData.viaje) {
          setFormData((prev) => ({ ...prev, viaje: unique[0] }));
          setViajeInputManual(false);
        }
      } else {
        setViajesSugeridos([]);
      }
    };
    void fetchViajes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.nave, supabase]);

  // Sincronizar inicio/fin stacking y corte documental desde borradores de Stacking (localStorage) cuando nave + viaje coinciden con un itinerario
  useEffect(() => {
    if (typeof window === "undefined" || !supabase) return;

    const naveName =
      navesFiltered.find((n) => n.id === formData.nave)?.nombre ??
      naves.find((n) => n.id === formData.nave)?.nombre;
    const viaje = (formData.viaje || "").trim();
    if (!naveName || !viaje) return;

    let cancelled = false;

    const run = async () => {
      const { data, error } = await supabase
        .from("itinerarios")
        .select("id, viaje, stacking_imagen_url")
        .eq("nave", naveName);

      if (error || cancelled || !data?.length) return;

      const it = pickItinerarioForStackingSync(data, viaje);
      if (!it) return;

      let draftsRaw: Record<string, StackingDraft> = {};
      try {
        const ls = localStorage.getItem(STACKING_DRAFTS_STORAGE_KEY);
        if (ls) {
          draftsRaw = normalizeDraftsKeys(JSON.parse(ls) as Record<string, StackingDraft>);
        }
      } catch {
        draftsRaw = {};
      }

      const draftMerged = {
        ...getEmptyStackingDraft(),
        ...(getDraftForItinerary(draftsRaw, { id: it.id, nave: naveName, viaje }) ?? {}),
      };
      const mapped = draftToReservaStackingDatetimeFields(draftMerged);

      setFormData((prev) => {
        if (cancelled) return prev;
        const canFillInicio = Boolean(mapped.inicio_stacking && !prev.inicio_stacking.trim());
        const canFillFin = Boolean(mapped.fin_stacking && !prev.fin_stacking.trim());
        const canFillCorte = Boolean(mapped.corte_documental && !prev.corte_documental.trim());
        if (!canFillInicio && !canFillFin && !canFillCorte) return prev;
        return {
          ...prev,
          inicio_stacking: canFillInicio ? mapped.inicio_stacking : prev.inicio_stacking,
          fin_stacking: canFillFin ? mapped.fin_stacking : prev.fin_stacking,
          corte_documental: canFillCorte ? mapped.corte_documental : prev.corte_documental,
        };
      });
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [formData.nave, formData.viaje, supabase, navesFiltered, naves]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const fieldName = (e.target as HTMLInputElement).dataset.field || e.target.name;
    const { type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [fieldName]: checked }));
    } else {
      const rawValue = e.target.value;
      const noUpper =
        fieldName === "ventilacion" ||
        fieldName === "temperatura" ||
        type === "number";
      const value =
        e.target.tagName === "SELECT" ? rawValue : noUpper ? rawValue : rawValue.toUpperCase();
      if (fieldName === "nave") {
        setViajesSugeridos([]);
        setViajeInputManual(false);
        setFormData((prev) => ({ ...prev, nave: value, viaje: "" }));
      } else if (fieldName === "tipo_atmosfera") {
        setFormData((prev) => ({
          ...prev,
          tipo_atmosfera: value,
          ventilacion: value ? "0" : prev.ventilacion,
          tratamiento_frio_o2: value ? prev.tratamiento_frio_o2 : "",
          tratamiento_frio_co2: value ? prev.tratamiento_frio_co2 : "",
        }));
      } else {
        setFormData((prev) => ({ ...prev, [fieldName]: value }));
      }
    }
  };

  // Funciones para el combobox de clientes

  // Lista de clientes permitidos según el rol del usuario
  const clientesFiltradosPorRol = useMemo(() => {
    const rol = profile?.rol;
    if ((rol === "ejecutivo" || rol === "cliente") && empresaNombres.length > 0) {
      return clientes.filter((c) => empresaNombres.includes(c.nombre));
    }
    return clientes;
  }, [clientes, profile?.rol, empresaNombres]);

  // Auto-seleccionar empresa para rol "cliente" cuando solo tiene una opción
  useEffect(() => {
    if (
      profile?.rol === "cliente" &&
      clientesFiltradosPorRol.length >= 1 &&
      !formData.cliente
    ) {
      const empresa = clientesFiltradosPorRol[0];
      setClienteInput(empresa.nombre);
      setFormData((prev) => ({ ...prev, cliente: empresa.id }));
    }
  }, [profile?.rol, clientesFiltradosPorRol]); // eslint-disable-line react-hooks/exhaustive-deps

  const clienteExisteExacto = useMemo(() => {
    const search = clienteInput.trim().toLowerCase();
    return clientes.some((c) => c.nombre.toLowerCase() === search);
  }, [clienteInput, clientes]);

  const transitTime = useMemo(() => {
    if (!formData.etd || !formData.eta) return null;
    try {
      const etdDate = parse(formData.etd, "yyyy-MM-dd", new Date());
      const etaDate = parse(formData.eta, "yyyy-MM-dd", new Date());
      const days = differenceInDays(etaDate, etdDate);
      return days >= 0 ? days : null;
    } catch {
      return null;
    }
  }, [formData.etd, formData.eta]);

  const sectionValidation = useMemo(() => {
    return {
      general: Boolean(
        formData.tipo_operacion &&
        formData.ejecutivo &&
        formData.cliente
      ),
      comercial: Boolean(
        formData.incoterm &&
        formData.forma_pago
      ),
      carga: Boolean(
        formData.especie &&
        formData.tipo_unidad
      ),
      naviera: Boolean(
        formData.naviera &&
        formData.nave &&
        formData.viaje &&
        formData.pol &&
        formData.pod &&
        formData.etd
      ),
      planta: Boolean(formData.planta_presentacion),
      deposito: true,
      observaciones: Boolean(formData.observaciones.trim()),
    };
  }, [formData]);

  const handleSelectCliente = (cliente: SelectOption) => {
    setClienteInput(cliente.nombre);
    setFormData((prev) => ({ ...prev, cliente: cliente.id }));
  };

  const handleAddCliente = async () => {
    if (!supabase || !clienteInput.trim()) return;
    setAddingCliente(true);
    try {
      const { data, error: insertError } = await supabase
        .from("empresas")
        .insert({ nombre: clienteInput.trim() })
        .select("id, nombre")
        .single();

      if (insertError) {
        console.error("Error adding empresa:", insertError);
        setError("Error al agregar la empresa");
      } else if (data) {
        setClientes((prev) => [...prev, data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
        setFormData((prev) => ({ ...prev, cliente: data.id }));
        setShowAddClienteModal(false);
      }
    } catch (err) {
      console.error("Error adding empresa:", err);
    }
    setAddingCliente(false);
  };

  // Sincronizar plantaInput cuando cambia el valor del form (ej. carga de datos de prueba)
  useEffect(() => {
    const nombre = plantas.find((p) => p.id === formData.planta_presentacion)?.nombre ?? "";
    setPlantaInput(nombre);
  }, [formData.planta_presentacion, plantas]);

  // Sincronizar especieInput cuando cambia el valor del form
  useEffect(() => {
    const nombre = especies.find((e) => e.id === formData.especie)?.nombre ?? "";
    setEspecieInput(nombre);
  }, [formData.especie, especies]);

  const handleAddPlanta = async (text: string) => {
    if (!supabase || !text.trim()) return;
    setAddingPlanta(true);
    const nombre = text.trim().toUpperCase();
    const { data, error: insertError } = await supabase
      .from("plantas")
      .insert({ nombre, activo: true })
      .select("id, nombre")
      .single();
    if (!insertError && data) {
      setPlantas((prev) => [...prev, data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setFormData((prev) => ({ ...prev, planta_presentacion: data.id }));
      setPlantaInput(data.nombre);
    } else if (insertError) {
      console.error("Error adding planta:", insertError);
    }
    setAddingPlanta(false);
  };

  const handleAddEspecie = async (text: string) => {
    if (!supabase || !text.trim()) return;
    setAddingEspecie(true);
    const nombre = text.trim().toUpperCase();
    const { data, error: insertError } = await supabase
      .from("especies")
      .insert({ nombre })
      .select("id, nombre")
      .single();
    if (!insertError && data) {
      setEspecies((prev) => [...prev, data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setFormData((prev) => ({ ...prev, especie: data.id }));
      setEspecieInput(data.nombre);
    } else if (insertError) {
      console.error("Error adding especie:", insertError);
    }
    setAddingEspecie(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowPreview(true);
  };

  const handleConfirmSubmit = async () => {
    if (!supabase) {
      setError(tr.supabaseError);
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const payload = {
      tipo_operacion: formData.tipo_operacion || null,
      estado_operacion: formData.estado_operacion || "PENDIENTE",
      ejecutivo: formData.ejecutivo
        ? ejecutivos.find((e) => e.id === formData.ejecutivo)?.nombre
        : null,
      cliente: formData.cliente
        ? clientes.find((c) => c.id === formData.cliente)?.nombre
        : null,
      dueno_reserva: formData.dueno_reserva || "ASLI",
      consignatario: formData.consignatario
        ? consignatarios.find((c) => c.id === formData.consignatario)?.nombre
        : null,
      incoterm: formData.incoterm || null,
      forma_pago: formData.forma_pago || null,
      especie: formData.especie
        ? especies.find((e) => e.id === formData.especie)?.nombre
        : null,
      temperatura: formData.temperatura || null,
      ventilacion: (() => {
        const v = formData.ventilacion.trim();
        if (!v) return null;
        const n = parseInt(v, 10);
        return Number.isFinite(n) ? n : null;
      })(),
      tratamiento_frio: formData.tratamiento_frio || null,
      tratamiento_frio_o2: formData.tratamiento_frio_o2 ? parseInt(formData.tratamiento_frio_o2, 10) : null,
      tratamiento_frio_co2: formData.tratamiento_frio_co2 ? parseInt(formData.tratamiento_frio_co2, 10) : null,
      tipo_atmosfera: formData.tipo_atmosfera || null,
      tipo_unidad: formData.tipo_unidad || null,
      naviera: formData.naviera
        ? navieras.find((n) => n.id === formData.naviera)?.nombre
        : null,
      nave: formData.nave
        ? navesFiltered.find((n) => n.id === formData.nave)?.nombre
        : null,
      viaje: formData.viaje || null,
      pol: formData.pol
        ? puertosOrigen.find((p) => p.id === formData.pol)?.nombre
        : null,
      pod: formData.pod
        ? destinos.find((d) => d.id === formData.pod)?.nombre
        : null,
      etd: formData.etd || null,
      eta: formData.eta || null,
      tt: transitTime,
      booking: formData.booking || null,
      planta_presentacion: formData.planta_presentacion
        ? plantas.find((p) => p.id === formData.planta_presentacion)?.nombre
        : null,
      deposito: formData.deposito
        ? depositos.find((d) => d.id === formData.deposito)?.nombre
        : null,
      observaciones: formData.observaciones || null,
      origen_registro: "reserva_web",
    };

    const rows = Array(copias).fill(payload);
    const { data: insertedRows, error: insertError } = await supabase
      .from("operaciones")
      .insert(rows)
      .select("id, ref_asli");

    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setLastSavedPayload(payload);
    setLastSavedIds(insertedRows ?? []);
    setLastSavedCopias(copias);
    setSuccess(copias > 1 ? `${copias} operaciones guardadas correctamente.` : tr.successMessage);
    setCopias(1);
    setShowEmailModal(true);
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });

    // Pre-generar Excel en background mientras el usuario decide si enviar correo
    xlsxCache.current = null;
    const clienteSlugPre = String(payload.cliente ?? "").replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();
    const cantidadLabelPre = copias > 1 ? `${copias}_RESERVAS` : "1_RESERVA";
    const xlsxNamePre = `SOLICITUD_DE_${cantidadLabelPre}_-_${clienteSlugPre}.xlsx`;
    void generateReservaExcel(payload, copias).then((base64) => {
      xlsxCache.current = { base64, name: xlsxNamePre };
    });
  };

  const [sendingEmail, setSendingEmail] = useState(false);
  const [lastSavedCopias, setLastSavedCopias] = useState(1);

  const buildEmailContent = (p: Record<string, unknown>) => {
    const subject = [
      "SOLICITUD DE RESERVA",
      p.cliente ?? "",
      p.naviera ?? "",
      [p.nave, p.viaje].filter(Boolean).join(" - ") || "",
      p.especie ?? "",
      p.temperatura ?? "",
      p.pol ?? "",
      p.pod ?? "",
    ].filter(Boolean).join(" // ").toUpperCase();

    const val = (v: unknown) => (v != null && v !== "" ? String(v) : null);
    const pct = (v: unknown) => (v != null && v !== "" ? String(v) + "%" : null);
    const dias = (v: unknown) => (v != null && v !== "" ? String(v) + " dias" : null);

    const makeRow = (label: string, value: string | null, even: boolean) => {
      if (!value) return "";
      const bg = even ? "#f5f5f5" : "#ffffff";
      return "<tr>"
        + "<td style=\"padding:7px 12px;background:" + bg + ";color:#555555;font-size:13px;font-family:Arial,sans-serif;width:150px;border-bottom:1px solid #dddddd\">" + label + "</td>"
        + "<td style=\"padding:7px 12px;background:" + bg + ";color:#111111;font-size:13px;font-weight:bold;font-family:Arial,sans-serif;border-bottom:1px solid #dddddd\">" + value + "</td>"
        + "</tr>";
    };

    const makeSection = (title: string, pairs: Array<[string, string | null]>) => {
      let rows = "";
      let idx = 0;
      for (const [label, value] of pairs) {
        if (value) { rows += makeRow(label, value, idx % 2 === 0); idx++; }
      }
      if (!rows) return "";
      return "<table width=\"560\" cellpadding=\"0\" cellspacing=\"0\" style=\"width:100%;max-width:560px;margin-bottom:16px;border-collapse:collapse;border:1px solid #cccccc\">"
        + "<tr><td colspan=\"2\" style=\"background:#1d4ed8;color:#ffffff;font-size:11px;font-weight:bold;text-transform:uppercase;padding:8px 12px;font-family:Arial,sans-serif\">" + title + "</td></tr>"
        + rows
        + "</table>";
    };

    const general = makeSection("General", [
      ["Tipo de operacion", val(p.tipo_operacion)],
      ["Cliente",           val(p.cliente)],
      ["Ejecutivo",         val(p.ejecutivo)],
      ["Consignatario",     val(p.consignatario)],
      ["Incoterm",          val(p.incoterm)],
      ["Forma de pago",     val(p.forma_pago)],
    ]);
    const carga = makeSection("Carga", [
      ["Especie",        val(p.especie)],
      ["Tipo de unidad", val(p.tipo_unidad)],
      ["Temperatura",    val(p.temperatura)],
      ["Ventilacion",    val(p.ventilacion)],
      ["Trat. de frio",  val(p.tratamiento_frio)],
      ["O2",             pct(p.tratamiento_frio_o2)],
      ["CO2",            pct(p.tratamiento_frio_co2)],
      ["Atmosfera",      val(p.tipo_atmosfera)],
    ]);
    const naviera = makeSection("Naviera / Viaje", [
      ["Naviera",   val(p.naviera)],
      ["Nave",      val(p.nave)],
      ["Viaje",     val(p.viaje)],
      ["POL",       val(p.pol)],
      ["POD",       val(p.pod)],
      ["ETD",       val(p.etd)],
      ["ETA",       val(p.eta)],
      ["Transito",  dias(p.tt)],
      ["Booking",   val(p.booking)],
    ]);
    const planta = makeSection("Planta / Deposito", [
      ["Planta",   val(p.planta_presentacion)],
      ["Deposito", val(p.deposito)],
    ]);
    const obs = p.observaciones ? makeSection("Observaciones", [["Nota", val(p.observaciones)]]) : "";

    const htmlBody =
      "<html><body style=\"margin:0;padding:0;background:#ffffff;font-family:Arial,sans-serif\">"
      + "<div style=\"max-width:600px;margin:24px 0;background:#ffffff;padding:24px;border-radius:8px\">"
      + "<p style=\"font-size:14px;color:#222;margin-top:0\">Estimado equipo,</p>"
      + "<p style=\"font-size:14px;color:#222\">Se ha creado una nueva solicitud de reserva con los siguientes datos:</p>"
      + general + carga + naviera + planta + obs
      + "<p style=\"font-size:14px;color:#222\">Quedo atento.</p>"
      + `<p style="color:#aaa;font-size:11px;margin-bottom:0">${brand.companyShort} &middot; Sistema de Reservas</p>`
      + "</div>"
      + "</body></html>";

    return { subject, htmlBody };
  };

  const generateReservaExcel = async (p: Record<string, unknown>, copias: number): Promise<string> => {
    const XLSX = await import("xlsx-js-style");
    const val = (v: unknown) => (v != null && v !== "" ? String(v) : "");
    const fecha = new Date().toLocaleDateString("es-CL");

    // ── Paleta de estilos ────────────────────────────────────────────────────
    const BLUE_DARK  = "0F3478";
    const BLUE_MID   = "1D4ED8";
    const BLUE_LIGHT = "EEF2FF";
    const BLUE_ALT   = "F8FAFF";
    const GRAY_LABEL = "6B7280";
    const WHITE      = "FFFFFF";
    const DARK_TXT   = "0F172A";
    const BORDER_CLR = "C7D2F0";

    const border = {
      top:    { style: "thin", color: { rgb: BORDER_CLR } },
      bottom: { style: "thin", color: { rgb: BORDER_CLR } },
      left:   { style: "thin", color: { rgb: BORDER_CLR } },
      right:  { style: "thin", color: { rgb: BORDER_CLR } },
    };

    const ws: Record<string, unknown> = {};

    // ── Fila 1: título principal ─────────────────────────────────────────────
    const titulo = copias > 1
      ? `SOLICITUD DE ${copias} RESERVAS — ASLI Ltda.`
      : "SOLICITUD DE RESERVA — ASLI Ltda.";
    ws["A1"] = {
      v: titulo, t: "s",
      s: {
        font: { bold: true, sz: 16, color: { rgb: WHITE } },
        fill: { fgColor: { rgb: BLUE_DARK } },
        alignment: { horizontal: "center", vertical: "center" },
      },
    };

    // ── Fila 2: meta-información ─────────────────────────────────────────────
    ws["A2"] = {
      v: `Cliente: ${val(p.cliente)}   |   Dueño reserva: ${val(p.dueno_reserva)}   |   Ejecutivo: ${val(p.ejecutivo)}   |   Fecha: ${fecha}`,
      t: "s",
      s: {
        font: { sz: 9, color: { rgb: WHITE } },
        fill: { fgColor: { rgb: BLUE_MID } },
        alignment: { horizontal: "center", vertical: "center" },
      },
    };

    // ── Fila 3: info operación (naviera/viaje/carga) ──────────────────────────
    const infoLine = [
      val(p.naviera) && `Naviera: ${val(p.naviera)}`,
      val(p.nave) && `Nave: ${val(p.nave)}`,
      val(p.viaje) && `Viaje: ${val(p.viaje)}`,
      val(p.pol) && `POL: ${val(p.pol)}`,
      val(p.pod) && `POD: ${val(p.pod)}`,
      val(p.etd) && `ETD: ${val(p.etd)}`,
      val(p.especie) && `Especie: ${val(p.especie)}`,
      val(p.tipo_unidad) && `Unidad: ${val(p.tipo_unidad)}`,
      val(p.temperatura) && `Temp: ${val(p.temperatura)}`,
    ].filter(Boolean).join("   |   ");
    ws["A3"] = {
      v: infoLine || " ",
      t: "s",
      s: {
        font: { sz: 8, italic: true, color: { rgb: "3B4B7A" } },
        fill: { fgColor: { rgb: BLUE_LIGHT } },
        alignment: { horizontal: "center", vertical: "center" },
      },
    };

    // ── Fila 4: vacía separadora ──────────────────────────────────────────────
    ws["A4"] = { v: "", t: "s", s: { fill: { fgColor: { rgb: "F1F5FF" } } } };

    // ── Definición de columnas de la tabla ───────────────────────────────────
    const colDefs: { header: string; value: string }[] = [
      { header: "#",                 value: String(copias) },
      { header: "Booking",           value: val(p.booking) },
      { header: "Naviera",           value: val(p.naviera) },
      { header: "Nave",              value: val(p.nave) },
      { header: "Viaje",             value: val(p.viaje) },
      { header: "POL",               value: val(p.pol) },
      { header: "POD",               value: val(p.pod) },
      { header: "Depósito",          value: val(p.deposito) },
      { header: "ETD",               value: val(p.etd) },
      { header: "ETA",               value: val(p.eta) },
      { header: "Especie",           value: val(p.especie) },
      { header: "T°",                value: val(p.temperatura) },
      { header: "CBM",               value: val(p.ventilacion) },
      { header: "Planta",            value: val(p.planta_presentacion) },
      { header: "Incoterm",          value: val(p.incoterm) },
      { header: "Cláusula de venta", value: val(p.forma_pago) },
    ];
    const cols = colDefs.map((c, i) => ({
      header: c.header,
      key: (ii: number) => i === 0 ? String(ii + 1) : c.value,
      // wch = max(header length, content length) + 2 chars de padding
      wch: Math.max(c.header.length, c.value.length || 7) + 2,
    }));

    const HEADER_ROW = 5; // fila Excel donde van los encabezados (1-indexed)
    const DATA_START  = HEADER_ROW + 1;

    // ── Fila 5: encabezados de columna ───────────────────────────────────────
    cols.forEach((col, ci) => {
      const addr = XLSX.utils.encode_cell({ r: HEADER_ROW - 1, c: ci });
      ws[addr] = {
        v: col.header, t: "s",
        s: {
          font: { bold: true, sz: 8, color: { rgb: WHITE } },
          fill: { fgColor: { rgb: BLUE_MID } },
          alignment: { horizontal: "center", vertical: "center", wrapText: false },
          border,
        },
      };
    });

    // ── Filas de datos (una por copia) ────────────────────────────────────────
    // Columna Booking (índice 1) resaltada en amarillo → campo a rellenar
    const EDITABLE_COLS = new Set([1]); // índices 0-based

    for (let i = 0; i < copias; i++) {
      const rowIdx = DATA_START - 1 + i; // 0-based para XLSX
      const isAlt = i % 2 === 1;

      cols.forEach((col, ci) => {
        const addr = XLSX.utils.encode_cell({ r: rowIdx, c: ci });
        const isEditable = EDITABLE_COLS.has(ci);
        const isNum = ci === 0;
        const bgColor = isEditable
          ? "FFFBEB"
          : isAlt ? BLUE_ALT : WHITE;

        ws[addr] = {
          v: isNum ? i + 1 : col.key(i),
          t: isNum ? "n" : "s",
          s: {
            font: {
              sz: 8,
              bold: isNum,
              color: { rgb: isEditable ? "92400E" : DARK_TXT },
            },
            fill: { fgColor: { rgb: bgColor } },
            alignment: { horizontal: "center", vertical: "center", wrapText: false },
            border,
          },
        };
      });
    }

    // ── Rango de la hoja ─────────────────────────────────────────────────────
    ws["!ref"] = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: DATA_START - 1 + copias - 1, c: cols.length - 1 },
    });

    // ── Merges: título y meta se extienden todo el ancho ─────────────────────
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: cols.length - 1 } }, // fila 1 título
      { s: { r: 1, c: 0 }, e: { r: 1, c: cols.length - 1 } }, // fila 2 meta
      { s: { r: 2, c: 0 }, e: { r: 2, c: cols.length - 1 } }, // fila 3 info
      { s: { r: 3, c: 0 }, e: { r: 3, c: cols.length - 1 } }, // fila 4 sep
    ];

    // ── Anchos de columna ─────────────────────────────────────────────────────
    ws["!cols"] = cols.map((c) => ({ wch: c.wch }));

    // ── Altura de filas ───────────────────────────────────────────────────────
    ws["!rows"] = [
      { hpt: 22 }, // fila 1 título
      { hpt: 14 }, // fila 2 meta
      { hpt: 13 }, // fila 3 info
      { hpt: 4  }, // fila 4 separadora
      { hpt: 16 }, // fila 5 encabezados
      ...Array(copias).fill({ hpt: 14 }),
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws as never, "Solicitud Reserva");
    const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });

    // Convertir ArrayBuffer → base64
    const bytes = new Uint8Array(out as ArrayBuffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  };

  const handleSendEmail = async () => {
    if (!lastSavedPayload || !supabase) return;
    const p = lastSavedPayload;
    setSendingEmail(true);

    const subject = [
      lastSavedCopias > 1 ? `SOLICITUD DE ${lastSavedCopias} RESERVAS` : "SOLICITUD DE RESERVA",
      p.cliente ?? "",
      p.naviera ?? "",
      [p.nave, p.viaje].filter(Boolean).join(" - ") || "",
      p.especie ?? "",
      p.temperatura ?? "",
      p.pol ?? "",
      p.pod ?? "",
    ].filter(Boolean).join(" // ").toUpperCase();

    const { htmlBody } = buildEmailContent(p);

    // Usar Excel pre-generado si está listo, sino generar ahora
    const clienteSlug = String(p.cliente ?? "").replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();
    const cantidadLabel = lastSavedCopias > 1 ? `${lastSavedCopias}_RESERVAS` : "1_RESERVA";
    const xlsxName = `SOLICITUD_DE_${cantidadLabel}_-_${clienteSlug}.xlsx`;
    const xlsxMime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    const xlsxBase64 = xlsxCache.current?.base64 ?? await generateReservaExcel(p, lastSavedCopias);

    // Subir Excel a storage y guardar en documentos (fire & forget)
    if (lastSavedIds.length > 0) {
      const firstId = lastSavedIds[0].id;
      const filePath = `documentos/${firstId}/${xlsxName}`;
      const xlsxBytes = Uint8Array.from(atob(xlsxBase64), (c) => c.charCodeAt(0));
      const savedIds = lastSavedIds;
      void (async () => {
        const { data: uploadData } = await supabase!.storage
          .from("documentos")
          .upload(filePath, xlsxBytes, { contentType: xlsxMime, upsert: true });
        if (uploadData) {
          const { data: urlData } = supabase!.storage.from("documentos").getPublicUrl(filePath);
          const docRows = savedIds.map(({ id }) => ({
            operacion_id: id,
            tipo: "SOLICITUD_RESERVA",
            nombre_archivo: xlsxName,
            url: urlData.publicUrl,
            mime_type: xlsxMime,
            tamano: xlsxBytes.length,
          }));
          await supabase!.from("documentos").insert(docRows);
        }
      })();
    }

    const dueno = String((lastSavedPayload as Record<string, unknown>)?.dueno_reserva ?? "ASLI").toUpperCase();
    const emailTo = dueno === "ASLI" ? "roodericus7@gmail.com" : "ignacio.caceres94@outlook.com";

    const result = await sendEmail({
      to: emailTo,
      subject: String(subject),
      body: htmlBody,
      attachments: [{ name: xlsxName, content: xlsxBase64, mimeType: xlsxMime }],
    });

    setSendingEmail(false);
    setShowEmailModal(false);
    if (result.success) {
      setSuccess(`Correo enviado correctamente desde ${result.sender ?? "tu cuenta @asli.cl"}.`);
    } else {
      setError(result.error ?? "Error al enviar el correo.");
    }
  };

  const inputClass =
    "w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/25 focus:border-brand-blue transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-neutral-50";

  const selectClass = inputClass;

  const labelClass = "block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1.5";

  const renderCatalogoSelect = (
    name: keyof FormData,
    categoria: string,
    label: string
  ) => {
    const htmlName = name === "forma_pago" ? "form_payment_method" : name;
    const items = catalogos[categoria] ?? [];
    return (
      <div>
        <label htmlFor={name} className={labelClass}>
          {label}
        </label>
        <select
          id={name}
          name={htmlName}
          data-field={name}
          value={formData[name] as string}
          onChange={handleChange}
          className={selectClass}
          disabled={loadingCatalogos}
          autoComplete="off"
        >
          <option value="">{tr.selectPlaceholder}</option>
          {items.map((item) => (
            <option key={item.id} value={item.valor}>
              {item.valor}
              {item.descripcion ? ` - ${item.descripcion}` : ""}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const renderSelect = (
    name: keyof FormData,
    options: SelectOption[],
    label: string
  ) => (
    <div>
      <label htmlFor={name} className={labelClass}>
        {label}
        {options.length > 0 && (
          <span className="ml-2 text-neutral-400 font-normal">({options.length})</span>
        )}
      </label>
      <select
        id={name}
        name={name}
        data-field={name}
        value={formData[name] as string}
        onChange={handleChange}
        className={selectClass}
        disabled={loadingCatalogos}
        autoComplete="off"
      >
        <option value="">{tr.selectPlaceholder}</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.nombre}
          </option>
        ))}
      </select>
    </div>
  );

  const renderInput = (
    name: keyof FormData,
    label: string,
    type: string = "text",
    placeholder?: string
  ) => (
    <div>
      <label htmlFor={name} className={labelClass}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        data-field={name}
        type={type}
        value={formData[name] as string}
        onChange={handleChange}
        placeholder={placeholder}
        className={inputClass}
        autoComplete="off"
      />
    </div>
  );


  const renderAddClienteModal = () => {
    if (!showAddClienteModal) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
          <div className="h-[3px] bg-gradient-to-r from-brand-blue to-brand-teal" />
          <div className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-9 h-9 rounded-xl bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                <Icon icon="typcn:business-card" width={18} height={18} className="text-brand-blue" />
              </span>
              <h3 className="font-bold text-neutral-900">{tr.addNewEmpresa}</h3>
            </div>
            <p className="text-sm text-neutral-500 mb-4">
              {tr.confirmAddEmpresa} <span className="font-semibold text-neutral-800">"{clienteInput}"</span>
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setShowAddClienteModal(false); setClienteInput(""); }}
                className="px-4 py-2 text-sm text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors font-medium"
                disabled={addingCliente}
              >
                {tr.btnCancel}
              </button>
              <button
                type="button"
                onClick={handleAddCliente}
                disabled={addingCliente}
                className="px-4 py-2 text-sm bg-brand-blue text-white rounded-xl hover:bg-brand-blue/90 transition-colors font-semibold disabled:opacity-50 shadow-md shadow-brand-blue/20"
              >
                {addingCliente ? tr.btnAdding : tr.btnAdd}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const getDisplayValue = (id: string, options: SelectOption[]) => {
    return options.find((o) => o.id === id)?.nombre || "-";
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return "-";
    try {
      const date = parse(dateStr, "yyyy-MM-dd", new Date());
      return format(date, "dd-MM-yyyy");
    } catch {
      return dateStr;
    }
  };

  const renderPreviewModal = () => {
    if (!showPreview) return null;

    const clienteNombre = getDisplayValue(formData.cliente, clientes);
    const navieraNombre = getDisplayValue(formData.naviera, navieras);
    const naveNombre = getDisplayValue(formData.nave, navesFiltered);
    const polNombre = getDisplayValue(formData.pol, puertosOrigen);
    const podNombre = getDisplayValue(formData.pod, destinos);
    const especieNombre = getDisplayValue(formData.especie, especies);

    const estadoColors: Record<string, { bg: string; text: string; dot: string }> = {
      PENDIENTE:   { bg: "bg-amber-50",    text: "text-amber-700",   dot: "bg-amber-400" },
      ABIERTA:     { bg: "bg-brand-blue/10", text: "text-brand-blue", dot: "bg-brand-blue" },
      CERRADA:     { bg: "bg-neutral-100", text: "text-neutral-600",  dot: "bg-neutral-400" },
      CANCELADA:   { bg: "bg-red-50",      text: "text-red-600",     dot: "bg-red-400" },
    };
    const esCfg = estadoColors[formData.estado_operacion ?? ""] ?? { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" };

    const sections = [
      {
        icon: "typcn:clipboard", title: tr.sectionGeneral,
        cols: 3,
        items: [
          { label: tr.tipoOperacion, value: formData.tipo_operacion },
          { label: tr.ejecutivo, value: getDisplayValue(formData.ejecutivo, ejecutivos) },
          { label: tr.incoterm, value: formData.incoterm },
          { label: tr.formaPago, value: formData.forma_pago },
          { label: tr.consignatario, value: getDisplayValue(formData.consignatario, consignatarios) },
        ],
      },
      {
        icon: "typcn:archive", title: tr.sectionCarga,
        cols: 3,
        items: [
          { label: tr.especie, value: especieNombre },
          { label: tr.tipoUnidad, value: formData.tipo_unidad },
          { label: tr.temperatura, value: formData.temperatura },
          { label: tr.ventilacion, value: formData.ventilacion !== "" ? formData.ventilacion : "—" },
          { label: tr.tratamientoFrio, value: formData.tratamiento_frio },
          ...(formData.tratamiento_frio_o2 ? [{ label: tr.o2, value: `${formData.tratamiento_frio_o2}%` }] : []),
          ...(formData.tratamiento_frio_co2 ? [{ label: tr.co2, value: `${formData.tratamiento_frio_co2}%` }] : []),
          ...(formData.tipo_atmosfera ? [{ label: tr.tipoAtmosfera, value: formData.tipo_atmosfera }] : []),
        ],
      },
      {
        icon: "typcn:plane", title: tr.sectionNaviera,
        cols: 3,
        items: [
          { label: tr.booking, value: formData.booking },
          { label: tr.viaje, value: formData.viaje },
          ...(transitTime !== null ? [{ label: "TT", value: `${transitTime} días` }] : []),
        ],
      },
      {
        icon: "typcn:home", title: tr.sectionPlanta,
        cols: 2,
        items: [
          { label: tr.planta, value: getDisplayValue(formData.planta_presentacion, plantas) },
          ...(formData.citacion ? [{ label: tr.citacion, value: formData.citacion }] : []),
        ],
      },
      {
        icon: "typcn:location", title: tr.sectionDeposito,
        cols: 2,
        items: [
          { label: tr.deposito, value: getDisplayValue(formData.deposito, depositos) },
        ],
      },
      ...(formData.observaciones ? [{
        icon: "typcn:document-text", title: tr.sectionObservaciones,
        cols: 1,
        items: [{ label: tr.observaciones, value: formData.observaciones, wide: true }],
      }] : []),
    ];

    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
        <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[94dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden">
          <div className="h-[3px] bg-gradient-to-r from-brand-blue to-brand-teal shrink-0" />

          {/* Header */}
          <div className="px-5 pt-4 pb-3 shrink-0 flex items-center justify-between gap-3 border-b border-neutral-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-brand-blue flex items-center justify-center shrink-0">
                <Icon icon="typcn:eye" width={17} height={17} className="text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900 leading-tight">{tr.previewTitle}</h3>
                <p className="text-[11px] text-neutral-400 mt-0.5">{tr.previewHint}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              <Icon icon="lucide:x" width={17} height={17} />
            </button>
          </div>

          {/* Scroll area */}
          <div className="flex-1 overflow-y-auto">

            {/* Hero card */}
            <div className="px-5 pt-4 pb-3">
              <div className="rounded-2xl bg-gradient-to-br from-brand-blue/6 to-brand-teal/6 border border-brand-blue/15 p-4">
                {/* Nombre cliente + estado */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="text-base font-bold text-neutral-900 leading-tight truncate">
                      {clienteNombre !== "-" ? clienteNombre : tr.noClient}
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {[especieNombre !== "-" ? especieNombre : null, formData.tipo_unidad || null]
                        .filter(Boolean).join(" · ") || tr.noCargoData}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 ${esCfg.bg} ${esCfg.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${esCfg.dot} shrink-0`} />
                    {formData.estado_operacion || "PENDIENTE"}
                  </span>
                </div>

                <div className="h-px bg-brand-blue/10 mb-3" />

                {/* Naviera · Nave + Ruta */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] text-neutral-400 uppercase tracking-wide leading-none mb-0.5">{tr.navieraNaveLabel}</p>
                    <p className="text-sm font-semibold text-neutral-800 truncate">
                      {[navieraNombre !== "-" ? navieraNombre : null, naveNombre !== "-" ? naveNombre : null].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="font-mono text-xs font-bold text-neutral-700 bg-white border border-neutral-200 px-2 py-0.5 rounded-lg shadow-sm">
                      {polNombre !== "-" ? polNombre : "—"}
                    </span>
                    <Icon icon="lucide:arrow-right" width={11} height={11} className="text-neutral-300 shrink-0" />
                    <span className="font-mono text-xs font-bold text-neutral-700 bg-white border border-neutral-200 px-2 py-0.5 rounded-lg shadow-sm">
                      {podNombre !== "-" ? podNombre : "—"}
                    </span>
                  </div>
                </div>

                {/* Fechas + TT */}
                {(formData.etd || formData.eta || transitTime !== null) && (
                  <div className="flex items-center gap-4 mt-2.5 pt-2.5 border-t border-brand-blue/10">
                    {formData.etd && (
                      <div>
                        <p className="text-[10px] text-neutral-400 uppercase tracking-wide leading-none">ETD</p>
                        <p className="text-xs font-bold text-neutral-800 mt-0.5">{formatDateDisplay(formData.etd)}</p>
                      </div>
                    )}
                    {formData.eta && (
                      <div>
                        <p className="text-[10px] text-neutral-400 uppercase tracking-wide leading-none">ETA</p>
                        <p className="text-xs font-bold text-neutral-800 mt-0.5">{formatDateDisplay(formData.eta)}</p>
                      </div>
                    )}
                    {transitTime !== null && (
                      <span className="ml-auto px-2.5 py-0.5 rounded-full bg-brand-blue text-white text-[11px] font-bold shrink-0">
                        {transitTime}d {tr.transitDays}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Secciones de detalle */}
            <div className="px-5 pb-4 space-y-2">
              {sections.map((section, sIdx) => {
                const visibles = section.items.filter((i) => i.value && i.value !== "-");
                if (visibles.length === 0) return null;
                return (
                  <div key={sIdx} className="rounded-xl border border-neutral-100 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2 bg-neutral-50/80">
                      <Icon icon={section.icon} width={13} height={13} className="text-brand-blue/70 shrink-0" />
                      <span className="text-[10px] font-bold text-brand-blue/80 uppercase tracking-wider">{section.title}</span>
                    </div>
                    <div className={`px-4 pt-2.5 pb-3 grid gap-x-5 gap-y-2.5 ${
                      section.cols === 1 ? "grid-cols-1" : section.cols === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"
                    }`}>
                      {visibles.map((item, iIdx) => (
                        <div key={iIdx} className={"wide" in item && item.wide ? "col-span-full" : ""}>
                          <p className="text-[10px] text-neutral-400 uppercase tracking-wide leading-none">{item.label}</p>
                          <p className="text-sm font-semibold text-neutral-800 mt-0.5 leading-snug">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 px-5 py-4 border-t border-neutral-100 bg-white"
               style={{ paddingBottom: "max(env(safe-area-inset-bottom), 16px)" }}>
            {/* Selector de copias */}
            <div className="flex items-center gap-3 mb-3 p-3 rounded-xl bg-neutral-50 border border-neutral-200">
              <Icon icon="typcn:document-add" width={16} height={16} className="text-neutral-400 shrink-0" />
              <span className="text-sm text-neutral-600 flex-1">{tr.copiesLabel}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCopias((c) => Math.max(1, c - 1))}
                  className="w-7 h-7 rounded-lg bg-white border border-neutral-200 flex items-center justify-center text-neutral-600 hover:bg-neutral-100 transition-colors font-bold text-lg leading-none"
                >−</button>
                <input
                  type="number"
                  min={1}
                  value={copias}
                  onChange={(e) => setCopias(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-14 text-center font-bold text-neutral-800 text-sm border border-neutral-200 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-brand-blue/25 focus:border-brand-blue"
                />
                <button
                  type="button"
                  onClick={() => setCopias((c) => c + 1)}
                  className="w-7 h-7 rounded-lg bg-white border border-neutral-200 flex items-center justify-center text-neutral-600 hover:bg-neutral-100 transition-colors font-bold text-lg leading-none"
                >+</button>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="px-4 py-2.5 text-sm font-semibold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors shrink-0"
              >
                {tr.btnEdit}
              </button>
              <button
                type="button"
                onClick={() => { setShowPreview(false); void handleConfirmSubmit(); }}
                disabled={submitting}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-brand-blue text-white shadow-md shadow-brand-blue/25 hover:bg-brand-blue/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <><Icon icon="typcn:refresh" width={16} height={16} className="animate-spin" />{tr.guardando}</>
                ) : (
                  <><Icon icon="typcn:input-checked" width={16} height={16} />
                  {copias > 1 ? `${tr.saveMultiple} (${copias})` : tr.guardar}</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // No renderSection needed — wizard shows one step at a time

  if (loadingCatalogos) {
    return (
      <main className="flex-1 min-h-0 overflow-auto bg-neutral-50 p-4" role="main">
        <div className="w-full flex items-center justify-center min-h-[300px]">
          <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-white border border-neutral-200 shadow-md text-neutral-600 font-medium">
            <Icon icon="typcn:refresh" width={24} height={24} className="animate-spin text-brand-blue" />
            <span>{tr.loading}</span>
          </div>
        </div>
      </main>
    );
  }

  const sectionTitles: Record<SectionKey, string> = {
    general: tr.sectionGeneral,
    comercial: tr.sectionComercial,
    carga: tr.sectionCarga,
    naviera: tr.sectionNaviera,
    planta: tr.sectionPlanta,
    deposito: tr.sectionDeposito,
    observaciones: tr.sectionObservaciones,
  };

  const sectionFieldsMap: Record<SectionKey, React.ReactNode> = {
    general: (
      <>
        {renderCatalogoSelect("tipo_operacion", "tipo_operacion", tr.tipoOperacion)}
        {renderCatalogoSelect("estado_operacion", "estado_operacion", tr.estadoOperacion)}
        {renderSelect("ejecutivo", ejecutivos, tr.ejecutivo)}
        {(() => {
          const isReadOnly = profile?.rol === "cliente" && clientesFiltradosPorRol.length >= 1;
          return (
            <ComboboxInput
              id="cliente"
              label={tr.cliente}
              labelClass={labelClass}
              inputClass={`${inputClass}${isReadOnly ? " opacity-70 cursor-default" : ""}`}
              labelExtra={isReadOnly ? <span className="ml-2 text-brand-blue/60 font-normal normal-case tracking-normal">· asignado</span> : undefined}
              value={clienteInput}
              options={clientesFiltradosPorRol}
              onSelect={handleSelectCliente}
              onChange={(val) => {
                setClienteInput(val);
                if (!val.trim()) setFormData((prev) => ({ ...prev, cliente: "" }));
              }}
              onBlurExtra={() => {
                if (clienteInput.trim() && !clienteExisteExacto && !formData.cliente && profile?.rol !== "cliente") {
                  setShowAddClienteModal(true);
                }
              }}
              onAddNew={profile?.rol !== "cliente" ? () => { setShowAddClienteModal(true); } : undefined}
              addNewLabel={() => tr.addNewLabel}
              placeholder={tr.placeholderCliente || "Buscar o escribir empresa..."}
              disabled={isReadOnly}
              readOnly={isReadOnly}
            />
          );
        })()}
        <div>
          <label htmlFor="dueno_reserva" className={labelClass}>
            Dueño de reserva
          </label>
          <select
            id="dueno_reserva"
            value={formData.dueno_reserva}
            onChange={(e) => setFormData((prev) => ({ ...prev, dueno_reserva: e.target.value }))}
            className={selectClass}
          >
            <option value="ASLI">ASLI</option>
            <option value="CHILFRESH">CHILFRESH</option>
            <option value="SURLOGISTICA">SURLOGISTICA</option>
          </select>
        </div>
      </>
    ),
    comercial: (
      <>
        {renderCatalogoSelect("incoterm", "incoterm", tr.incoterm)}
        {renderCatalogoSelect("forma_pago", "forma_pago", tr.formaPago)}
        {renderSelect("consignatario", consignatarios, tr.consignatario)}
      </>
    ),
    carga: (
      <>
        <ComboboxInput
          id="especie"
          label={tr.especie}
          labelClass={labelClass}
          inputClass={inputClass}
          value={especieInput}
          options={especies}
          onSelect={(opt) => {
            setEspecieInput(opt.nombre);
            setFormData((prev) => ({ ...prev, especie: opt.id }));
          }}
          onChange={(val) => {
            setEspecieInput(val);
            setFormData((prev) => ({ ...prev, especie: "" }));
          }}
          onAddNew={handleAddEspecie}
          addNewLabel={(text) => `${tr.addNewEspecie} "${text}"`}
          addingNew={addingEspecie}
          placeholder={tr.searchEspecie}
          disabled={loadingCatalogos}
        />
        {renderInput("temperatura", tr.temperatura, "text", tr.placeholderTemperatura)}
        <div>
          <label htmlFor="ventilacion" className={labelClass}>
            {tr.ventilacion}
            {formData.tipo_atmosfera && (
              <span className="ml-2 text-brand-blue/60 font-normal normal-case tracking-normal">· {tr.ventilacionNote}</span>
            )}
          </label>
          <input
            id="ventilacion"
            name="ventilacion"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            data-field="ventilacion"
            autoComplete="off"
            value={formData.ventilacion}
            onChange={handleChange}
            placeholder={tr.placeholderVentilacion}
            className={inputClass}
            disabled={loadingCatalogos || !!formData.tipo_atmosfera}
          />
        </div>
        {renderCatalogoSelect("tratamiento_frio", "tratamiento_frio", tr.tratamientoFrio)}
        {renderCatalogoSelect("tipo_atmosfera", "tipo_atmosfera", tr.tipoAtmosfera)}
        <div>
          <label htmlFor="tratamiento_frio_o2" className={labelClass}>{tr.o2}</label>
          <input
            id="tratamiento_frio_o2"
            name="tratamiento_frio_o2"
            type="number"
            value={formData.tratamiento_frio_o2}
            onChange={handleChange}
            placeholder={tr.placeholderO2}
            className={inputClass}
            disabled={!formData.tipo_atmosfera}
          />
        </div>
        <div>
          <label htmlFor="tratamiento_frio_co2" className={labelClass}>{tr.co2}</label>
          <input
            id="tratamiento_frio_co2"
            name="tratamiento_frio_co2"
            type="number"
            value={formData.tratamiento_frio_co2}
            onChange={handleChange}
            placeholder={tr.placeholderCO2}
            className={inputClass}
            disabled={!formData.tipo_atmosfera}
          />
        </div>
        {renderCatalogoSelect("tipo_unidad", "tipo_unidad", tr.tipoUnidad)}
      </>
    ),
    naviera: (
      <>
        {renderSelect("naviera", navieras, tr.naviera)}
        {renderSelect("nave", navesFiltered, tr.nave)}
        <div>
          <label htmlFor="viaje" className={labelClass}>
            {tr.viaje}
            {viajesSugeridos.length > 0 && !viajeInputManual && (
              <span className="ml-2 text-brand-blue font-normal normal-case">{tr.fromItinerary}</span>
            )}
          </label>
          {viajesSugeridos.length > 0 && !viajeInputManual ? (
            <div className="flex gap-2">
              <select
                id="viaje"
                name="viaje"
                value={formData.viaje}
                onChange={handleChange}
                className={`${selectClass} flex-1`}
              >
                <option value="">{tr.selectPlaceholder}</option>
                {viajesSugeridos.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => { setViajeInputManual(true); setFormData((prev) => ({ ...prev, viaje: "" })); }}
                className="text-xs text-neutral-500 hover:text-neutral-700 px-2 shrink-0"
                title={tr.viajeManual}
              >
                <Icon icon="lucide:pencil" width={14} height={14} />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                id="viaje"
                name="voyage_code_field"
                type="text"
                value={formData.viaje}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, viaje: e.target.value }))
                }
                placeholder={tr.placeholderViaje}
                className={`${inputClass} flex-1`}
                autoComplete="one-time-code"
                inputMode="text"
                aria-autocomplete="none"
              />
              {viajesSugeridos.length > 0 && (
                <button
                  type="button"
                  onClick={() => setViajeInputManual(false)}
                  className="text-xs text-brand-blue hover:underline px-2 shrink-0"
                  title={tr.viajeDesdeItinerario}
                >
                  <Icon icon="lucide:list" width={14} height={14} />
                </button>
              )}
            </div>
          )}
        </div>
        {renderSelect("pol", puertosOrigen, tr.pol)}
        {renderSelect("pod", destinos, tr.pod)}
        <div className="col-span-1 sm:col-span-2 lg:col-span-3 grid grid-cols-3 gap-3">
          <div>
            <label htmlFor="etd" className={labelClass}>{tr.etd}</label>
            <DatePicker
              id="etd"
              name="etd_date_field"
              selected={formData.etd ? parse(formData.etd, "yyyy-MM-dd", new Date()) : null}
              onChange={(date: Date | null) => setFormData((prev) => ({ ...prev, etd: date ? format(date, "yyyy-MM-dd") : "" }))}
              dateFormat="dd-MM-yyyy"
              locale="es"
              placeholderText={tr.datePlaceholder}
              className={inputClass}
              isClearable
              autoComplete="one-time-code"
            />
          </div>
          <div>
            <label htmlFor="eta" className={labelClass}>{tr.eta}</label>
            <DatePicker
              id="eta"
              name="eta_date_field"
              selected={formData.eta ? parse(formData.eta, "yyyy-MM-dd", new Date()) : null}
              onChange={(date: Date | null) => setFormData((prev) => ({ ...prev, eta: date ? format(date, "yyyy-MM-dd") : "" }))}
              dateFormat="dd-MM-yyyy"
              locale="es"
              placeholderText={tr.datePlaceholder}
              className={inputClass}
              isClearable
              autoComplete="one-time-code"
            />
          </div>
          <div>
            <label className={labelClass}>{tr.ttDays}</label>
            <div className="rounded-lg border border-neutral-300 bg-brand-blue/5 px-4 py-2.5 flex items-center justify-center font-bold text-brand-blue text-lg">
              {transitTime !== null ? transitTime : "-"}
            </div>
          </div>
        </div>
        {renderInput("booking", tr.booking, "text", tr.placeholderBooking)}
      </>
    ),
    planta: (
      <>
        <ComboboxInput
          id="planta_presentacion"
          label={tr.planta}
          labelClass={labelClass}
          inputClass={inputClass}
          value={plantaInput}
          options={plantas}
          onSelect={(opt) => {
            setPlantaInput(opt.nombre);
            setFormData((prev) => ({ ...prev, planta_presentacion: opt.id }));
          }}
          onChange={(val) => {
            setPlantaInput(val);
            setFormData((prev) => ({ ...prev, planta_presentacion: "" }));
          }}
          onAddNew={handleAddPlanta}
          addNewLabel={(text) => `${tr.addNewPlanta} "${text}"`}
          addingNew={addingPlanta}
          placeholder={tr.searchPlanta}
          disabled={loadingCatalogos}
        />
        <div>
          <label htmlFor="citacion" className={labelClass}>{tr.citacion}</label>
          <input id="citacion" name="citacion" type="datetime-local" value={formData.citacion} onChange={handleChange} className={inputClass} />
        </div>
      </>
    ),
    deposito: (
      <>
        {renderSelect("deposito", depositos, tr.deposito)}
        <p className="sm:col-span-2 lg:col-span-3 text-[11px] text-neutral-500 leading-snug rounded-lg border border-brand-blue/15 bg-brand-blue/[0.04] px-3 py-2">
          <Icon icon="lucide:info" className="inline-block align-middle mr-1 text-brand-blue" width={14} height={14} aria-hidden />
          {tr.depositoStackingAutoHint}
        </p>
        <div>
          <label htmlFor="inicio_stacking" className={labelClass}>{tr.inicioStacking}</label>
          <input id="inicio_stacking" name="inicio_stacking" type="datetime-local" value={formData.inicio_stacking} onChange={handleChange} className={inputClass} />
        </div>
        <div>
          <label htmlFor="fin_stacking" className={labelClass}>{tr.finStacking}</label>
          <input id="fin_stacking" name="fin_stacking" type="datetime-local" value={formData.fin_stacking} onChange={handleChange} className={inputClass} />
        </div>
        <div>
          <label htmlFor="corte_documental" className={labelClass}>{tr.corteDocumental}</label>
          <input id="corte_documental" name="corte_documental" type="datetime-local" value={formData.corte_documental} onChange={handleChange} className={inputClass} />
        </div>
      </>
    ),
    observaciones: (
      <div className="sm:col-span-2 lg:col-span-3">
        <label htmlFor="observaciones" className={labelClass}>{tr.observaciones}</label>
        <textarea
          id="observaciones"
          name="observaciones"
          value={formData.observaciones}
          onChange={handleChange}
          rows={4}
          placeholder={tr.placeholderObservaciones}
          className={`${inputClass} resize-none`}
        />
      </div>
    ),
  };

  const activeKey = SECTION_ORDER[currentStep];
  const isLastStep = currentStep === SECTION_ORDER.length - 1;
  const completedCount = Object.values(sectionValidation).filter(Boolean).length;

  return (
    <main className="flex-1 min-h-0 flex flex-col bg-neutral-50" role="main">

      {/* Marco verde cuando el paso está completo */}
      <div
        className={`fixed inset-0 z-40 pointer-events-none rounded-none transition-all duration-500 ${
          sectionValidation[activeKey]
            ? "ring-8 ring-inset ring-emerald-500 opacity-100"
            : "ring-0 opacity-0"
        }`}
      />

      <div ref={mainRef} className="flex-1 overflow-auto">

        {/* Hero gradient header */}
        <div className="bg-gradient-to-br from-brand-blue via-brand-blue/90 to-cyan-700 text-white px-4 sm:px-6 pt-5 pb-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
                <Icon icon="typcn:plus" width={22} height={22} className="text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-bold leading-tight truncate">{tr.title}</h1>
                <p className="text-xs text-white/70 mt-0.5">{tr.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isSuperadmin && (
                <button
                  type="button"
                  onClick={loadDatosDePrueba}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/15 hover:bg-white/25 text-white transition-colors"
                  title={tr.loadTestData}
                >
                  <Icon icon="typcn:flash" width={13} height={13} />
                  {tr.testDataBtn}
                </button>
              )}
              <div className="flex items-center gap-1.5 bg-white/20 rounded-xl px-3 py-1.5">
                <Icon icon="lucide:check-circle" width={13} height={13} className="text-white/80" />
                <span className="text-xs font-bold">{completedCount}/{SECTION_ORDER.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Horizontal Stepper */}
        <div className="px-4 sm:px-6 pt-4 pb-0">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm px-4 py-4">
            <div className="overflow-x-auto">
              <div className="flex items-start justify-between min-w-[520px]">
                {SECTION_ORDER.map((key, idx) => {
                  const isActive = idx === currentStep;
                  const isComplete = sectionValidation[key];
                  const isPast = idx < currentStep;
                  return (
                    <div key={key} className="flex items-start flex-1">
                      {/* Step */}
                      <div className="flex flex-col items-center flex-1">
                        <button
                          type="button"
                          onClick={() => { if (isPast || isComplete || idx <= currentStep) setCurrentStep(idx); }}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all font-bold text-xs border-2 ${
                            isActive
                              ? "bg-brand-blue border-brand-blue text-white shadow-md shadow-brand-blue/30 scale-110"
                              : isComplete
                                ? "bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-200"
                                : "bg-white border-neutral-200 text-neutral-400"
                          }`}
                        >
                          {isComplete
                            ? <Icon icon="lucide:check" width={14} height={14} />
                            : <span>{idx + 1}</span>
                          }
                        </button>
                        <span className={`text-[9px] font-semibold mt-1.5 text-center leading-tight max-w-[52px] uppercase tracking-wide ${
                          isActive ? "text-brand-blue" : isComplete ? "text-emerald-600" : "text-neutral-400"
                        }`}>
                          {sectionTitles[key]}
                        </span>
                      </div>
                      {/* Connector */}
                      {idx < SECTION_ORDER.length - 1 && (
                        <div className={`h-0.5 w-full max-w-[40px] mt-4 mx-0 rounded-full transition-all ${
                          idx < currentStep ? "bg-emerald-400" : "bg-neutral-150"
                        }`}
                        style={{ backgroundColor: idx < currentStep ? undefined : "#e5e7eb" }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Modals de error/éxito */}
        {error && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="h-[3px] bg-red-500" />
              <div className="p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
                  <Icon icon="typcn:warning" width={24} height={24} className="text-red-500" />
                </div>
                <h3 className="font-bold text-neutral-900 mb-2">{tr.errorSaving}</h3>
                <p className="text-sm text-neutral-600 mb-5">{error}</p>
                <button type="button" onClick={() => setError(null)} className="w-full px-4 py-2.5 bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 transition-colors font-semibold text-sm">
                  {tr.understood}
                </button>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="h-[3px] bg-emerald-500" />
              <div className="p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-emerald-50 flex items-center justify-center">
                  <Icon icon="typcn:tick" width={24} height={24} className="text-emerald-500" />
                </div>
                <h3 className="font-bold text-neutral-900 mb-2">{tr.bookingSaved}</h3>
                <p className="text-sm text-neutral-600 mb-5">{success}</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setSuccess(null)} className="flex-1 px-4 py-2.5 bg-neutral-100 text-neutral-700 rounded-xl hover:bg-neutral-200 transition-colors font-medium text-sm">{tr.btnClose}</button>
                  <a href={withBase("/reservas/mis-reservas")} className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-semibold text-sm">
                    Ver reservas <Icon icon="typcn:arrow-right" width={14} height={14} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step content card */}
        <div className="px-4 sm:px-6 pt-4 pb-4">
          <div className={`bg-white rounded-2xl border-2 shadow-sm overflow-hidden transition-colors ${
            sectionValidation[activeKey] ? "border-emerald-400 shadow-emerald-100" : "border-neutral-200"
          }`}>
            {/* Section header */}
            <div className={`px-5 py-3.5 border-b flex items-center justify-between gap-3 transition-colors ${
              sectionValidation[activeKey] ? "border-emerald-100 bg-emerald-50/40" : "border-neutral-100 bg-neutral-50/50"
            }`}>
              <div className="flex items-center gap-3">
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${sectionValidation[activeKey] ? "bg-emerald-500" : "bg-brand-blue"}`}>
                  <Icon icon={sectionValidation[activeKey] ? "lucide:check" : sectionIcons[activeKey]} width={16} height={16} className="text-white" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-neutral-900 leading-tight">{sectionTitles[activeKey]}</h2>
                  <p className="text-xs text-neutral-400 mt-0.5">{tr.stepLabel} {currentStep + 1} {tr.stepOf} {SECTION_ORDER.length}</p>
                </div>
              </div>
              {sectionValidation[activeKey] && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 border border-emerald-200 rounded-full px-2.5 py-0.5 shrink-0">
                  <Icon icon="lucide:check" width={11} height={11} />{tr.complete}
                </span>
              )}
            </div>

            {/* Fields */}
            <form id="reserva-form" onSubmit={handleSubmit} autoComplete="off" className="px-5 py-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sectionFieldsMap[activeKey]}
            </form>
          </div>
        </div>

      </div>{/* ← cierra flex-1 overflow-auto */}

      {/* Barra de acciones */}
      <div
        className="shrink-0 border-t border-neutral-100 bg-white/95 backdrop-blur-sm px-4 sm:px-6 py-3"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setFormData(initialFormData); setClienteInput(""); setCurrentStep(0); }}
            className="shrink-0 px-3 py-2.5 rounded-xl text-xs font-medium text-neutral-500 bg-neutral-100 hover:bg-neutral-200 transition-colors"
          >
            {tr.limpiar}
          </button>
          {currentStep > 0 && (
            <button
              type="button"
              onClick={() => setCurrentStep((s) => s - 1)}
              className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition-colors"
            >
              <Icon icon="lucide:arrow-left" width={15} height={15} />
              {tr.btnPrev}
            </button>
          )}
          {!isLastStep ? (
            <button
              type="button"
              onClick={() => setCurrentStep((s) => s + 1)}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-brand-blue text-white shadow-md shadow-brand-blue/20 hover:bg-brand-blue/90 transition-all"
            >
              {tr.btnNext}
              <Icon icon="lucide:arrow-right" width={15} height={15} />
            </button>
          ) : (
            <button
              type="submit"
              form="reserva-form"
              disabled={submitting}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-brand-blue text-white shadow-md shadow-brand-blue/20 hover:bg-brand-blue/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <><Icon icon="lucide:loader-2" width={16} height={16} className="animate-spin" />{tr.guardando}</>
              ) : (
                <><Icon icon="lucide:eye" width={16} height={16} />{tr.btnReview}</>
              )}
            </button>
          )}
        </div>
      </div>

      {renderAddClienteModal()}
      {renderPreviewModal()}

      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="h-[3px] bg-gradient-to-r from-brand-blue to-brand-teal" />
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                  <Icon icon="lucide:mail" width={20} height={20} className="text-brand-blue" />
                </span>
                <div>
                  <h3 className="font-bold text-neutral-900">{tr.sendEmailTitle}</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">{tr.bookingSavedMsg}</p>
                </div>
              </div>
              <p className="text-sm text-neutral-600 mb-3">
                ¿Deseas enviar los datos de esta reserva a <span className="font-semibold text-neutral-800">roodericus7@gmail.com</span>?
              </p>
              <div className="flex items-start gap-2 p-3 rounded-xl bg-brand-blue/5 border border-brand-blue/15 mb-5">
                <Icon icon="lucide:info" width={14} height={14} className="text-brand-blue shrink-0 mt-0.5" />
                <p className="text-xs text-neutral-600">
                  El correo se enviará directamente desde <strong>tu cuenta @asli.cl</strong> a roodericus7@gmail.com.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleSendEmail()}
                  disabled={sendingEmail}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-blue text-white rounded-xl hover:bg-brand-blue/90 transition-colors font-semibold text-sm shadow-md shadow-brand-blue/20 disabled:opacity-60"
                >
                  {sendingEmail
                    ? <><Icon icon="typcn:refresh" width={15} height={15} className="animate-spin" />{tr.sending}</>
                    : <><Icon icon="lucide:send" width={15} height={15} />{tr.sendFromAccount}</>
                  }
                </button>
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-neutral-600 bg-neutral-100 border border-neutral-200 rounded-xl hover:bg-neutral-200 transition-colors"
                >
                  {tr.skip}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
