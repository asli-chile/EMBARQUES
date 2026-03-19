import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { useAuth } from "@/lib/auth/AuthContext";
import DatePicker, { registerLocale } from "react-datepicker";
import { es } from "date-fns/locale";
import { format, parse, differenceInDays } from "date-fns";
import "react-datepicker/dist/react-datepicker.css";

registerLocale("es", es);

type CatalogoItem = { id: string; valor: string; descripcion?: string };
type SelectOption = { id: string; nombre: string };

type FormData = {
  tipo_operacion: string;
  estado_operacion: string;
  ejecutivo: string;
  cliente: string;
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
  consignatario: "",
  incoterm: "",
  forma_pago: "",
  especie: "",
  pais: "",
  temperatura: "",
  ventilacion: "CERRADO",
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
  const [showClienteSuggestions, setShowClienteSuggestions] = useState(false);
  const [showAddClienteModal, setShowAddClienteModal] = useState(false);
  const [addingCliente, setAddingCliente] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const clienteInputRef = useRef<HTMLInputElement>(null);

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
      ventilacion: prev.ventilacion || "ABIERTO",
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

  // Cerrar dropdown al hacer scroll (evita desincronía con el portal)
  useEffect(() => {
    if (!showClienteSuggestions) return;
    const close = () => setShowClienteSuggestions(false);
    window.addEventListener("scroll", close, true);
    return () => window.removeEventListener("scroll", close, true);
  }, [showClienteSuggestions]);

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
      if (data && data.length > 0) {
        const filtered = data
          .map((d) => d.naves as unknown as SelectOption)
          .filter(Boolean)
          .sort((a, b) => a.nombre.localeCompare(b.nombre));
        setNavesFiltered(filtered);
      } else {
        setNavesFiltered(naves);
      }
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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      if (name === "nave") {
        setViajesSugeridos([]);
        setViajeInputManual(false);
        setFormData((prev) => ({ ...prev, nave: value, viaje: "" }));
      } else if (name === "tipo_atmosfera") {
        setFormData((prev) => ({
          ...prev,
          tipo_atmosfera: value,
          ventilacion: value ? "CERRADO" : prev.ventilacion,
          tratamiento_frio_o2: value ? prev.tratamiento_frio_o2 : "",
          tratamiento_frio_co2: value ? prev.tratamiento_frio_co2 : "",
        }));
      } else {
        setFormData((prev) => ({ ...prev, [name]: value }));
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

  const clientesFiltrados = useMemo(() => {
    if (!clienteInput.trim()) return clientesFiltradosPorRol;
    const search = clienteInput.toLowerCase();
    return clientesFiltradosPorRol.filter((c) => c.nombre.toLowerCase().includes(search));
  }, [clienteInput, clientesFiltradosPorRol]);

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
      deposito: Boolean(formData.deposito),
      observaciones: Boolean(formData.observaciones.trim()),
    };
  }, [formData]);

  const handleClienteInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setClienteInput(value);
    setShowClienteSuggestions(true);
    if (!value.trim()) {
      setFormData((prev) => ({ ...prev, cliente: "" }));
    }
  };

  const handleSelectCliente = (cliente: SelectOption) => {
    setClienteInput(cliente.nombre);
    setFormData((prev) => ({ ...prev, cliente: cliente.id }));
    setShowClienteSuggestions(false);
  };

  const handleClienteBlur = () => {
    setTimeout(() => {
      setShowClienteSuggestions(false);
      if (clienteInput.trim() && !clienteExisteExacto && !formData.cliente) {
        setShowAddClienteModal(true);
      }
    }, 200);
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
      consignatario: formData.consignatario
        ? consignatarios.find((c) => c.id === formData.consignatario)?.nombre
        : null,
      incoterm: formData.incoterm || null,
      forma_pago: formData.forma_pago || null,
      especie: formData.especie
        ? especies.find((e) => e.id === formData.especie)?.nombre
        : null,
      temperatura: formData.temperatura || null,
      ventilacion: formData.ventilacion || null,
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

    const { error: insertError } = await supabase.from("operaciones").insert(payload);

    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setLastSavedPayload(payload);
    setSuccess(tr.successMessage);
    setFormData(initialFormData);
    setClienteInput("");
    setShowEmailModal(true);
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const [sendingEmail, setSendingEmail] = useState(false);

  const buildEmailContent = (p: Record<string, unknown>) => {
    const parts = [
      "SOLICITUD DE RESERVA",
      p.cliente ?? "",
      p.naviera ?? "",
      [p.nave, p.viaje].filter(Boolean).join(" - ") || "",
      p.especie ?? "",
      p.temperatura ?? "",
      p.ventilacion ?? "",
      p.pol ?? "",
      p.pod ?? "",
    ].filter(Boolean);
    const subject = parts.join(" // ").toUpperCase();

    const rows = [
      ["Tipo de operación", p.tipo_operacion],
      ["Cliente", p.cliente],
      ["Ejecutivo", p.ejecutivo],
      ["Consignatario", p.consignatario],
      ["Incoterm", p.incoterm],
      ["Forma de pago", p.forma_pago],
    ];
    const cargaRows = [
      ["Especie", p.especie],
      ["Temperatura", p.temperatura],
      ["Ventilación", p.ventilacion],
      ["Trat. de frío", p.tratamiento_frio],
      ["O₂", p.tratamiento_frio_o2 != null ? `${p.tratamiento_frio_o2}%` : null],
      ["CO₂", p.tratamiento_frio_co2 != null ? `${p.tratamiento_frio_co2}%` : null],
      ["Tipo atmósfera", p.tipo_atmosfera],
      ["Tipo unidad", p.tipo_unidad],
    ];
    const navRows = [
      ["Naviera", p.naviera],
      ["Nave", p.nave],
      ["Viaje", p.viaje],
      ["POL", p.pol],
      ["POD", p.pod],
      ["ETD", p.etd],
      ["ETA", p.eta],
      ["TT", p.tt != null ? `${p.tt} días` : null],
      ["Booking", p.booking],
    ];
    const plantaRows = [
      ["Planta", p.planta_presentacion],
      ["Depósito", p.deposito],
    ];

    const renderTable = (title: string, data: (string | unknown)[][]) => {
      const rowsHtml = data
        .map(([label, val]) => {
          const v = val ?? "-";
          return `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-size:13px;white-space:nowrap">${label}</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#1f2937">${v}</td></tr>`;
        })
        .join("");
      return `<div style="margin-bottom:16px"><div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#2563eb;margin-bottom:6px;border-bottom:1px solid #e5e7eb;padding-bottom:4px">${title}</div><table style="border-collapse:collapse">${rowsHtml}</table></div>`;
    };

    let htmlBody = `<div style="font-family:Arial,sans-serif;color:#374151"><p>Estimado equipo,</p><p>Se ha creado una nueva solicitud de reserva con los siguientes datos:</p>`;
    htmlBody += renderTable("General", rows);
    htmlBody += renderTable("Carga", cargaRows);
    htmlBody += renderTable("Naviera / Viaje", navRows);
    htmlBody += renderTable("Planta / Depósito", plantaRows);
    if (p.observaciones) {
      htmlBody += renderTable("Observaciones", [["Nota", p.observaciones]]);
    }
    htmlBody += `<p>Quedo atento.</p></div>`;

    return { subject, htmlBody };
  };

  const handleSendEmail = async () => {
    if (!lastSavedPayload) return;
    const scriptUrl = import.meta.env.PUBLIC_GMAIL_DRAFT_SCRIPT_URL;
    if (!scriptUrl) {
      setError("No se ha configurado la URL del script de Gmail. Contacta al administrador.");
      setShowEmailModal(false);
      return;
    }

    setSendingEmail(true);
    const { subject, htmlBody } = buildEmailContent(lastSavedPayload);

    try {
      const res = await fetch(scriptUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          to: "informaciones@asli.cl",
          subject,
          htmlBody,
        }),
      });
      const data = await res.json();
      if (data.success && data.draftUrl) {
        window.open(data.draftUrl, "_blank");
        setSuccess("Borrador creado en Gmail. Revísalo y presiona Enviar.");
      } else if (data.success) {
        window.open("https://mail.google.com/mail/#drafts", "_blank");
        setSuccess("Borrador creado en Gmail. Ábrelo desde Borradores y presiona Enviar.");
      } else {
        setError(data.error || "Error al crear el borrador en Gmail.");
      }
    } catch {
      setError("No se pudo conectar con el servicio de correo.");
    }

    setSendingEmail(false);
    setShowEmailModal(false);
  };

  const inputClass =
    "w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:bg-white transition-all disabled:opacity-60 disabled:cursor-not-allowed";

  const selectClass = inputClass;

  const labelClass = "block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1";

  const renderCatalogoSelect = (
    name: keyof FormData,
    categoria: string,
    label: string
  ) => {
    const items = catalogos[categoria] ?? [];
    return (
      <div>
        <label htmlFor={name} className={labelClass}>
          {label}
        </label>
        <select
          id={name}
          name={name}
          value={formData[name] as string}
          onChange={handleChange}
          className={selectClass}
          disabled={loadingCatalogos}
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
        value={formData[name] as string}
        onChange={handleChange}
        className={selectClass}
        disabled={loadingCatalogos}
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
        type={type}
        value={formData[name] as string}
        onChange={handleChange}
        placeholder={placeholder}
        className={inputClass}
      />
    </div>
  );

  const renderClienteCombobox = () => {
    const isClienteRole = profile?.rol === "cliente";
    const isReadOnly = isClienteRole && clientesFiltradosPorRol.length >= 1;
    const canAddNew = !isReadOnly;

    // Posición del dropdown via portal (fixed, coordenadas del input en viewport)
    const rect = clienteInputRef.current?.getBoundingClientRect();
    const dropdownPortal =
      showClienteSuggestions &&
      clienteInput.trim() &&
      rect &&
      typeof document !== "undefined"
        ? createPortal(
            <div
              className="bg-white border border-neutral-200 rounded-xl shadow-xl max-h-60 overflow-y-auto"
              style={{
                position: "fixed",
                top: rect.bottom + 4,
                left: rect.left,
                width: rect.width,
                zIndex: 9999,
              }}
            >
              {clientesFiltrados.length > 0 ? (
                clientesFiltrados.map((cliente) => (
                  <button
                    key={cliente.id}
                    type="button"
                    onMouseDown={() => handleSelectCliente(cliente)}
                    className="w-full px-4 py-2.5 text-left hover:bg-brand-blue/5 text-neutral-800 font-medium transition-colors text-sm border-b border-neutral-50 last:border-b-0"
                  >
                    {cliente.nombre}
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-sm text-neutral-500">
                  No se encontró "<span className="text-neutral-700 font-medium">{clienteInput}</span>"
                  {canAddNew && (
                    <button
                      type="button"
                      onMouseDown={() => setShowAddClienteModal(true)}
                      className="flex items-center gap-1.5 mt-2 text-brand-blue hover:text-brand-blue/80 font-semibold text-xs transition-colors"
                    >
                      <Icon icon="typcn:plus" width={14} height={14} />
                      Agregar como nueva empresa
                    </button>
                  )}
                </div>
              )}
            </div>,
            document.body
          )
        : null;

    return (
      <div className="relative">
        <label htmlFor="cliente" className={labelClass}>
          {tr.cliente}
          {clientesFiltradosPorRol.length > 0 && (
            <span className="ml-2 text-neutral-400 font-normal">({clientesFiltradosPorRol.length})</span>
          )}
          {isReadOnly && (
            <span className="ml-2 text-brand-blue/60 font-normal normal-case tracking-normal">· asignado</span>
          )}
        </label>
        <input
          ref={clienteInputRef}
          id="cliente"
          name="cliente"
          type="text"
          value={clienteInput}
          onChange={handleClienteInputChange}
          onFocus={() => { if (!isReadOnly) setShowClienteSuggestions(true); }}
          onBlur={handleClienteBlur}
          placeholder={tr.placeholderCliente || "Buscar o escribir empresa..."}
          className={`${inputClass} ${isReadOnly ? "opacity-70 cursor-default" : ""}`}
          autoComplete="off"
          readOnly={isReadOnly}
          disabled={isReadOnly}
        />
        {dropdownPortal}
      </div>
    );
  };

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
              <h3 className="font-bold text-neutral-900">Agregar nueva empresa</h3>
            </div>
            <p className="text-sm text-neutral-500 mb-4">
              ¿Agregar <span className="font-semibold text-neutral-800">"{clienteInput}"</span> a la lista de empresas?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setShowAddClienteModal(false); setClienteInput(""); }}
                className="px-4 py-2 text-sm text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors font-medium"
                disabled={addingCliente}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAddCliente}
                disabled={addingCliente}
                className="px-4 py-2 text-sm bg-brand-blue text-white rounded-xl hover:bg-brand-blue/90 transition-colors font-semibold disabled:opacity-50 shadow-md shadow-brand-blue/20"
              >
                {addingCliente ? "Agregando..." : "Agregar"}
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
          { label: tr.tipoUnidad, value: formData.tipo_unidad },
          { label: tr.temperatura, value: formData.temperatura },
          { label: tr.ventilacion, value: formData.ventilacion },
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
                <h3 className="text-sm font-bold text-neutral-900 leading-tight">Vista previa</h3>
                <p className="text-[11px] text-neutral-400 mt-0.5">Confirma los datos antes de crear</p>
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
                      {clienteNombre !== "-" ? clienteNombre : "Sin cliente"}
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {[especieNombre !== "-" ? especieNombre : null, formData.tipo_unidad || null]
                        .filter(Boolean).join(" · ") || "Sin datos de carga"}
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
                    <p className="text-[10px] text-neutral-400 uppercase tracking-wide leading-none mb-0.5">Naviera · Nave</p>
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
                        {transitTime}d tránsito
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
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="px-4 py-2.5 text-sm font-semibold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors shrink-0"
              >
                Editar
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
                  <><Icon icon="typcn:input-checked" width={16} height={16} />{tr.guardar}</>
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
        {renderClienteCombobox()}
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
        {renderSelect("especie", especies, tr.especie)}
        {renderInput("temperatura", tr.temperatura, "text", tr.placeholderTemperatura)}
        <div>
          <label htmlFor="ventilacion" className={labelClass}>
            {tr.ventilacion}
            {formData.tipo_atmosfera && (
              <span className="ml-2 text-brand-blue/60 font-normal normal-case tracking-normal">· forzado por atmósfera</span>
            )}
          </label>
          <select
            id="ventilacion"
            name="ventilacion"
            value={formData.ventilacion}
            onChange={handleChange}
            className={selectClass}
            disabled={loadingCatalogos || !!formData.tipo_atmosfera}
          >
            <option value="">{tr.selectPlaceholder}</option>
            {(catalogos["ventilacion"] ?? []).map((item) => (
              <option key={item.id} value={item.valor}>
                {item.valor}{item.descripcion ? ` - ${item.descripcion}` : ""}
              </option>
            ))}
          </select>
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
            placeholder="Ej: 21"
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
            placeholder="Ej: 5"
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
              <span className="ml-2 text-brand-blue font-normal normal-case">desde itinerario</span>
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
                name="viaje"
                type="text"
                value={formData.viaje}
                onChange={handleChange}
                placeholder="Ej: 241N"
                className={`${inputClass} flex-1`}
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
              placeholderText="dd-mm-aaaa"
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
              placeholderText="dd-mm-aaaa"
              className={inputClass}
              isClearable
              autoComplete="one-time-code"
            />
          </div>
          <div>
            <label className={labelClass}>TT (días)</label>
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
        {renderSelect("planta_presentacion", plantas, tr.planta)}
        <div>
          <label htmlFor="citacion" className={labelClass}>{tr.citacion}</label>
          <input id="citacion" name="citacion" type="datetime-local" value={formData.citacion} onChange={handleChange} className={inputClass} />
        </div>
      </>
    ),
    deposito: (
      <>
        {renderSelect("deposito", depositos, tr.deposito)}
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
      <div ref={mainRef} className="flex-1 overflow-auto">

        {/* Header */}
        <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-0">
          <div className="rounded-2xl bg-white border border-neutral-200 shadow-sm overflow-hidden">
            <div className="h-[3px] bg-gradient-to-r from-brand-blue to-brand-teal" />
            <div className="px-5 py-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-blue flex items-center justify-center flex-shrink-0">
                  <Icon icon="typcn:plus" width={20} height={20} className="text-white" />
                </div>
                <div>
                  <h1 className="text-sm sm:text-base font-bold text-neutral-900 leading-tight">{tr.title}</h1>
                  <p className="text-xs text-neutral-400 mt-0.5">{tr.subtitle}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isSuperadmin && (
                  <button
                    type="button"
                    onClick={loadDatosDePrueba}
                    className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 transition-colors"
                    title="Cargar datos de prueba (sin booking)"
                  >
                    <Icon icon="typcn:flash" width={14} height={14} />
                    Datos de prueba
                  </button>
                )}
                <span className="text-xs font-bold text-brand-blue bg-brand-blue/10 rounded-full px-2.5 py-1">
                  {completedCount}/{SECTION_ORDER.length}
                </span>
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
                            isComplete
                              ? "bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-200"
                              : isActive
                              ? "bg-brand-blue border-brand-blue text-white shadow-md shadow-brand-blue/30"
                              : "bg-white border-neutral-200 text-neutral-400"
                          }`}
                        >
                          {isComplete
                            ? <Icon icon="typcn:tick" width={14} height={14} />
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
                <h3 className="font-bold text-neutral-900 mb-2">Error al guardar</h3>
                <p className="text-sm text-neutral-600 mb-5">{error}</p>
                <button type="button" onClick={() => setError(null)} className="w-full px-4 py-2.5 bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 transition-colors font-semibold text-sm">
                  Entendido
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
                <h3 className="font-bold text-neutral-900 mb-2">Reserva guardada</h3>
                <p className="text-sm text-neutral-600 mb-5">{success}</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setSuccess(null)} className="flex-1 px-4 py-2.5 bg-neutral-100 text-neutral-700 rounded-xl hover:bg-neutral-200 transition-colors font-medium text-sm">Cerrar</button>
                  <a href="/reservas/mis-reservas" className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-semibold text-sm">
                    Ver reservas <Icon icon="typcn:arrow-right" width={14} height={14} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step content card */}
        <div className="px-4 sm:px-6 pt-4 pb-4">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
            {/* Section header */}
            <div className="px-5 py-3 border-b border-neutral-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${sectionValidation[activeKey] ? "bg-emerald-500" : "bg-brand-blue"}`}>
                  <Icon icon={sectionValidation[activeKey] ? "typcn:tick" : sectionIcons[activeKey]} width={16} height={16} className="text-white" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-neutral-900 leading-tight">{sectionTitles[activeKey]}</h2>
                  <p className="text-xs text-neutral-400 mt-0.5">Paso {currentStep + 1} de {SECTION_ORDER.length}</p>
                </div>
              </div>
              {sectionValidation[activeKey] && (
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5 shrink-0">
                  Listo
                </span>
              )}
            </div>

            {/* Fields */}
            <form id="reserva-form" onSubmit={handleSubmit} className="px-5 py-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sectionFieldsMap[activeKey]}
            </form>
          </div>
        </div>

      </div>{/* ← cierra flex-1 overflow-auto */}

      {/* Barra de acciones */}
      <div
        className="shrink-0 border-t border-neutral-200 bg-white px-4 sm:px-6 py-3"
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
              Anterior
            </button>
          )}
          {!isLastStep ? (
            <button
              type="button"
              onClick={() => setCurrentStep((s) => s + 1)}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-brand-blue text-white shadow-md shadow-brand-blue/20 hover:bg-brand-blue/90 transition-all"
            >
              Siguiente
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
                <><Icon icon="typcn:refresh" width={16} height={16} className="animate-spin" />{tr.guardando}</>
              ) : (
                <><Icon icon="typcn:eye" width={16} height={16} />Revisar reserva</>
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
                  <h3 className="font-bold text-neutral-900">Enviar solicitud por correo</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">La reserva ya fue guardada exitosamente</p>
                </div>
              </div>
              <p className="text-sm text-neutral-600 mb-5">
                ¿Deseas enviar los datos de esta reserva por correo a <span className="font-semibold text-neutral-800">informaciones@asli.cl</span>?
              </p>
              <p className="text-xs text-neutral-400 mb-5">
                Se creará un borrador en Gmail con todos los datos y tu firma. Solo tendrás que abrirlo y presionar Enviar.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleSendEmail()}
                  disabled={sendingEmail}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-blue text-white rounded-xl hover:bg-brand-blue/90 transition-colors font-semibold text-sm shadow-md shadow-brand-blue/20 disabled:opacity-60"
                >
                  {sendingEmail ? (
                    <>
                      <Icon icon="typcn:refresh" width={15} height={15} className="animate-spin" />
                      Creando borrador...
                    </>
                  ) : (
                    <>
                      <Icon icon="lucide:send" width={15} height={15} />
                      Sí, crear borrador
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  disabled={sendingEmail}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-neutral-600 bg-neutral-100 border border-neutral-200 rounded-xl hover:bg-neutral-200 transition-colors disabled:opacity-60"
                >
                  No, omitir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
