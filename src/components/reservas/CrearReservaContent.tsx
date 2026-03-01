import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/LocaleContext";
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
  pallets: string;
  peso_bruto: string;
  peso_neto: string;
  tipo_unidad: string;
  naviera: string;
  nave: string;
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
  prioridad: string;
  operacion_critica: boolean;
  observaciones: string;
};

const initialFormData: FormData = {
  tipo_operacion: "EXPORTACIÓN",
  estado_operacion: "PENDIENTE",
  ejecutivo: "",
  cliente: "",
  consignatario: "",
  incoterm: "FOB",
  forma_pago: "PREPAID",
  especie: "",
  pais: "",
  temperatura: "",
  ventilacion: "CERRADO",
  pallets: "",
  peso_bruto: "",
  peso_neto: "",
  tipo_unidad: "40RF",
  naviera: "",
  nave: "",
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
  prioridad: "MEDIA",
  operacion_critica: false,
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

export function CrearReservaContent() {
  const { t } = useLocale();
  const tr = t.crearReserva;
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [expandedSections, setExpandedSections] = useState<Set<SectionKey>>(
    new Set(["general", "comercial", "carga"])
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  // Estados para el combobox de clientes
  const [clienteInput, setClienteInput] = useState("");
  const [showClienteSuggestions, setShowClienteSuggestions] = useState(false);
  const [showAddClienteModal, setShowAddClienteModal] = useState(false);
  const [addingCliente, setAddingCliente] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

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
        supabase.from("usuarios").select("id, nombre").in("rol", ["ejecutivo", "admin"]).eq("activo", true).order("nombre"),
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
        setEjecutivos(ejecutivosRes.data);
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

  const toggleSection = (section: SectionKey) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Funciones para el combobox de clientes
  const clientesFiltrados = useMemo(() => {
    if (!clienteInput.trim()) return clientes;
    const search = clienteInput.toLowerCase();
    return clientes.filter((c) => c.nombre.toLowerCase().includes(search));
  }, [clienteInput, clientes]);

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
        formData.pol &&
        formData.pod &&
        formData.etd &&
        formData.booking
      ),
      planta: Boolean(formData.planta_presentacion),
      deposito: Boolean(formData.deposito),
      observaciones: true,
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
      pallets: formData.pallets ? parseInt(formData.pallets, 10) : null,
      peso_bruto: formData.peso_bruto ? parseFloat(formData.peso_bruto) : null,
      peso_neto: formData.peso_neto ? parseFloat(formData.peso_neto) : null,
      tipo_unidad: formData.tipo_unidad || null,
      naviera: formData.naviera
        ? navieras.find((n) => n.id === formData.naviera)?.nombre
        : null,
      nave: formData.nave
        ? navesFiltered.find((n) => n.id === formData.nave)?.nombre
        : null,
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

    setSuccess(tr.successMessage);
    setFormData(initialFormData);
    setClienteInput("");
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const inputClass =
    "w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-brand-blue placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors disabled:opacity-60 disabled:cursor-not-allowed";

  const selectClass = inputClass;

  const labelClass = "block text-xs font-medium text-neutral-600 uppercase tracking-wider mb-1.5";

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

  const renderClienteCombobox = () => (
    <div className="relative">
      <label htmlFor="cliente" className={labelClass}>
        {tr.cliente}
        {clientes.length > 0 && (
          <span className="ml-2 text-neutral-400 font-normal">({clientes.length})</span>
        )}
      </label>
      <input
        id="cliente"
        name="cliente"
        type="text"
        value={clienteInput}
        onChange={handleClienteInputChange}
        onFocus={() => setShowClienteSuggestions(true)}
        onBlur={handleClienteBlur}
        placeholder={tr.placeholderCliente || "Buscar o escribir empresa..."}
        className={inputClass}
        autoComplete="off"
      />
      {showClienteSuggestions && clienteInput.trim() && (
        <div className="absolute z-[9999] w-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {clientesFiltrados.length > 0 ? (
            clientesFiltrados.map((cliente) => (
              <button
                key={cliente.id}
                type="button"
                onMouseDown={() => handleSelectCliente(cliente)}
                className="w-full px-4 py-2 text-left hover:bg-brand-blue/10 transition-colors text-sm"
              >
                {cliente.nombre}
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-neutral-500">
              No se encontró "{clienteInput}"
              <button
                type="button"
                onMouseDown={() => setShowAddClienteModal(true)}
                className="block mt-1 text-brand-blue hover:underline font-medium"
              >
                + Agregar como nueva empresa
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderAddClienteModal = () => {
    if (!showAddClienteModal) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
          <h3 className="text-lg font-semibold text-neutral-800 mb-2">
            Agregar nueva empresa
          </h3>
          <p className="text-neutral-600 mb-4">
            ¿Deseas agregar "<span className="font-medium">{clienteInput}</span>" a la lista de empresas?
          </p>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => {
                setShowAddClienteModal(false);
                setClienteInput("");
              }}
              className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
              disabled={addingCliente}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleAddCliente}
              disabled={addingCliente}
              className="px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue/90 transition-colors disabled:opacity-50"
            >
              {addingCliente ? "Agregando..." : "Agregar"}
            </button>
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

    const previewData = [
      { section: tr.sectionGeneral, items: [
        { label: tr.tipoOperacion, value: formData.tipo_operacion || "-" },
        { label: tr.estadoOperacion, value: formData.estado_operacion || "-" },
        { label: tr.ejecutivo, value: getDisplayValue(formData.ejecutivo, ejecutivos) },
        { label: tr.cliente, value: getDisplayValue(formData.cliente, clientes) },
      ]},
      { section: tr.sectionComercial, items: [
        { label: tr.incoterm, value: formData.incoterm || "-" },
        { label: tr.formaPago, value: formData.forma_pago || "-" },
        { label: tr.consignatario, value: getDisplayValue(formData.consignatario, consignatarios) },
      ]},
      { section: tr.sectionCarga, items: [
        { label: tr.especie, value: getDisplayValue(formData.especie, especies) },
        { label: tr.temperatura, value: formData.temperatura || "-" },
        { label: tr.ventilacion, value: formData.ventilacion || "-" },
        { label: tr.pallets, value: formData.pallets || "-" },
        { label: tr.pesoBruto, value: formData.peso_bruto ? `${formData.peso_bruto} kg` : "-" },
        { label: tr.pesoNeto, value: formData.peso_neto ? `${formData.peso_neto} kg` : "-" },
        { label: tr.tipoUnidad, value: formData.tipo_unidad || "-" },
      ]},
      { section: tr.sectionNaviera, items: [
        { label: tr.naviera, value: getDisplayValue(formData.naviera, navieras) },
        { label: tr.nave, value: getDisplayValue(formData.nave, navesFiltered) },
        { label: tr.pol, value: getDisplayValue(formData.pol, puertosOrigen) },
        { label: tr.pod, value: getDisplayValue(formData.pod, destinos) },
        { label: tr.etd, value: formatDateDisplay(formData.etd) },
        { label: tr.eta, value: formatDateDisplay(formData.eta) },
        { label: "TT", value: transitTime !== null ? `${transitTime} días` : "-" },
        { label: tr.booking, value: formData.booking || "-" },
      ]},
      { section: tr.sectionPlanta, items: [
        { label: tr.planta, value: getDisplayValue(formData.planta_presentacion, plantas) },
      ]},
      { section: tr.sectionDeposito, items: [
        { label: tr.deposito, value: getDisplayValue(formData.deposito, depositos) },
      ]},
    ];

    if (formData.observaciones) {
      previewData.push({
        section: tr.sectionObservaciones,
        items: [{ label: tr.observaciones, value: formData.observaciones }],
      });
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
          <div className="p-6 border-b border-neutral-200">
            <h3 className="text-xl font-semibold text-brand-blue flex items-center gap-2">
              <Icon icon="typcn:eye" width={24} height={24} />
              Vista previa de la reserva
            </h3>
            <p className="text-neutral-500 text-sm mt-1">
              Revisa los datos antes de guardar
            </p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {previewData.map((section, idx) => (
              <div key={idx} className="border border-neutral-200 rounded-lg overflow-hidden">
                <div className="bg-neutral-50 px-4 py-2 font-medium text-brand-blue text-sm">
                  {section.section}
                </div>
                <div className="p-4 grid gap-3 sm:grid-cols-2">
                  {section.items.map((item, itemIdx) => (
                    <div key={itemIdx}>
                      <span className="text-xs text-neutral-500 uppercase tracking-wider">{item.label}</span>
                      <p className="text-neutral-800 font-medium">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="p-6 border-t border-neutral-200 flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className="px-4 py-2.5 text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors font-medium"
            >
              Seguir editando
            </button>
            <button
              type="button"
              onClick={() => {
                setShowPreview(false);
                void handleConfirmSubmit();
              }}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-blue text-white rounded-lg hover:bg-brand-blue/90 transition-colors font-medium disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Icon icon="typcn:refresh" width={16} height={16} className="animate-spin" />
                  {tr.guardando}
                </>
              ) : (
                <>
                  <Icon icon="typcn:input-checked" width={16} height={16} />
                  Confirmar y guardar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderSection = (
    key: SectionKey,
    title: string,
    children: React.ReactNode
  ) => {
    const isExpanded = expandedSections.has(key);
    const isComplete = sectionValidation[key];
    return (
      <div className="border border-neutral-200 rounded-lg bg-white overflow-visible">
        <button
          type="button"
          onClick={() => toggleSection(key)}
          className="w-full flex items-center justify-between px-4 py-3 bg-neutral-50 hover:bg-neutral-100 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-blue/30"
          aria-expanded={isExpanded}
        >
          <span className="flex items-center gap-2 text-brand-blue font-medium">
            <Icon icon={sectionIcons[key]} width={20} height={20} />
            {title}
          </span>
          <span className="flex items-center gap-2">
            {isComplete && (
              <span className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                <Icon
                  icon="typcn:tick"
                  width={16}
                  height={16}
                  className="text-white"
                />
              </span>
            )}
            <Icon
              icon={isExpanded ? "typcn:minus" : "typcn:plus"}
              width={18}
              height={18}
              className="text-neutral-500"
            />
          </span>
        </button>
        {isExpanded && <div className="p-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>}
      </div>
    );
  };

  if (loadingCatalogos) {
    return (
      <main className="flex-1 min-h-0 overflow-auto bg-neutral-100 p-4" role="main">
        <div className="w-full flex items-center justify-center min-h-[300px]">
          <div className="flex items-center gap-3 text-neutral-500">
            <Icon icon="typcn:refresh" width={24} height={24} className="animate-spin" />
            <span>{tr.loading}</span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main ref={mainRef} className="flex-1 min-h-0 overflow-auto bg-neutral-100" role="main">
      <div className="w-full p-4">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-brand-blue tracking-tight">
            {tr.title}
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            {tr.subtitle}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 rounded-lg bg-emerald-50 border border-emerald-200" role="status">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-800">
                <Icon icon="typcn:tick" width={20} height={20} className="text-emerald-600" />
                <span className="font-medium">{success}</span>
              </div>
              <a
                href="/reservas/mis-reservas"
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
              >
                <Icon icon="typcn:arrow-right" width={16} height={16} />
                Ir a Mis Reservas
              </a>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {renderSection(
            "general",
            tr.sectionGeneral,
            <>
              {renderCatalogoSelect("tipo_operacion", "tipo_operacion", tr.tipoOperacion)}
              {renderCatalogoSelect("estado_operacion", "estado_operacion", tr.estadoOperacion)}
              {renderSelect("ejecutivo", ejecutivos, tr.ejecutivo)}
              {renderClienteCombobox()}
            </>
          )}

          {renderSection(
            "comercial",
            tr.sectionComercial,
            <>
              {renderCatalogoSelect("incoterm", "incoterm", tr.incoterm)}
              {renderCatalogoSelect("forma_pago", "forma_pago", tr.formaPago)}
              {renderSelect("consignatario", consignatarios, tr.consignatario)}
            </>
          )}

          {renderSection(
            "carga",
            tr.sectionCarga,
            <>
              {renderSelect("especie", especies, tr.especie)}
              {renderSelect("pod", destinos, tr.paisDestino)}
              {renderInput("temperatura", tr.temperatura, "text", tr.placeholderTemperatura)}
              {renderCatalogoSelect("ventilacion", "ventilacion", tr.ventilacion)}
              {renderInput("pallets", tr.pallets, "number", tr.placeholderCantidad)}
              {renderInput("peso_bruto", tr.pesoBruto, "number", "Kg")}
              {renderInput("peso_neto", tr.pesoNeto, "number", "Kg")}
              {renderCatalogoSelect("tipo_unidad", "tipo_unidad", tr.tipoUnidad)}
            </>
          )}

          {renderSection(
            "naviera",
            tr.sectionNaviera,
            <>
              {renderSelect("naviera", navieras, tr.naviera)}
              {renderSelect("nave", navesFiltered, tr.nave)}
              {renderSelect("pol", puertosOrigen, tr.pol)}
              {renderSelect("pod", destinos, tr.pod)}
              <div className="col-span-1 sm:col-span-2 lg:col-span-3 grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor="etd" className={labelClass}>
                    {tr.etd}
                  </label>
                  <DatePicker
                    id="etd"
                    selected={formData.etd ? parse(formData.etd, "yyyy-MM-dd", new Date()) : null}
                    onChange={(date: Date | null) => {
                      setFormData((prev) => ({
                        ...prev,
                        etd: date ? format(date, "yyyy-MM-dd") : "",
                      }));
                    }}
                    dateFormat="dd-MM-yyyy"
                    locale="es"
                    placeholderText="dd-mm-aaaa"
                    className={inputClass}
                    isClearable
                  />
                </div>
                <div>
                  <label htmlFor="eta" className={labelClass}>
                    {tr.eta}
                  </label>
                  <DatePicker
                    id="eta"
                    selected={formData.eta ? parse(formData.eta, "yyyy-MM-dd", new Date()) : null}
                    onChange={(date: Date | null) => {
                      setFormData((prev) => ({
                        ...prev,
                        eta: date ? format(date, "yyyy-MM-dd") : "",
                      }));
                    }}
                    dateFormat="dd-MM-yyyy"
                    locale="es"
                    placeholderText="dd-mm-aaaa"
                    className={inputClass}
                    isClearable
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    TT (días)
                  </label>
                  <div className={`${inputClass} bg-neutral-50 flex items-center justify-center font-semibold text-brand-blue`}>
                    {transitTime !== null ? transitTime : "-"}
                  </div>
                </div>
              </div>
              {renderInput("booking", tr.booking, "text", tr.placeholderBooking)}
            </>
          )}

          {renderSection(
            "planta",
            tr.sectionPlanta,
            <>
              {renderSelect("planta_presentacion", plantas, tr.planta)}
              <div>
                <label htmlFor="citacion" className={labelClass}>
                  {tr.citacion}
                </label>
                <input
                  id="citacion"
                  name="citacion"
                  type="datetime-local"
                  value={formData.citacion}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
            </>
          )}

          {renderSection(
            "deposito",
            tr.sectionDeposito,
            <>
              {renderSelect("deposito", depositos, tr.deposito)}
              <div>
                <label htmlFor="inicio_stacking" className={labelClass}>
                  {tr.inicioStacking}
                </label>
                <input
                  id="inicio_stacking"
                  name="inicio_stacking"
                  type="datetime-local"
                  value={formData.inicio_stacking}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="fin_stacking" className={labelClass}>
                  {tr.finStacking}
                </label>
                <input
                  id="fin_stacking"
                  name="fin_stacking"
                  type="datetime-local"
                  value={formData.fin_stacking}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="corte_documental" className={labelClass}>
                  {tr.corteDocumental}
                </label>
                <input
                  id="corte_documental"
                  name="corte_documental"
                  type="datetime-local"
                  value={formData.corte_documental}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
            </>
          )}

          {renderSection(
            "observaciones",
            tr.sectionObservaciones,
            <div className="sm:col-span-2 lg:col-span-3">
              <label htmlFor="observaciones" className={labelClass}>
                {tr.observaciones}
              </label>
              <textarea
                id="observaciones"
                name="observaciones"
                value={formData.observaciones}
                onChange={handleChange}
                rows={3}
                placeholder={tr.placeholderObservaciones}
                className={`${inputClass} resize-none`}
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                const testData: FormData = {
                  tipo_operacion: "EXPORTACIÓN",
                  estado_operacion: "PENDIENTE",
                  ejecutivo: ejecutivos[0]?.id || "",
                  cliente: clientes[0]?.id || "",
                  consignatario: consignatarios[0]?.id || "",
                  incoterm: "FOB",
                  forma_pago: "PREPAID",
                  especie: especies[0]?.id || "",
                  pais: "",
                  temperatura: "-0.5°C",
                  ventilacion: "CERRADO",
                  pallets: "20",
                  peso_bruto: "25000",
                  peso_neto: "22000",
                  tipo_unidad: "40RF",
                  naviera: navieras[0]?.id || "",
                  nave: navesFiltered[0]?.id || "",
                  pol: puertosOrigen[0]?.id || "",
                  pod: destinos[0]?.id || "",
                  etd: format(new Date(), "yyyy-MM-dd"),
                  eta: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
                  booking: "BK-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
                  planta_presentacion: plantas[0]?.id || "",
                  citacion: "",
                  deposito: depositos[0]?.id || "",
                  inicio_stacking: "",
                  fin_stacking: "",
                  corte_documental: "",
                  prioridad: "MEDIA",
                  operacion_critica: false,
                  observaciones: "Datos de prueba generados automáticamente",
                };
                setFormData(testData);
                setClienteInput(clientes[0]?.nombre || "");
              }}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            >
              Cargar prueba
            </button>
            <button
              type="button"
              onClick={() => { setFormData(initialFormData); setClienteInput(""); }}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
            >
              {tr.limpiar}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium bg-brand-blue text-white hover:bg-brand-blue/90 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Icon icon="typcn:refresh" width={16} height={16} className="animate-spin" />
                  {tr.guardando}
                </>
              ) : (
                <>
                  <Icon icon="typcn:input-checked" width={16} height={16} />
                  {tr.guardar}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      {renderAddClienteModal()}
      {renderPreviewModal()}
    </main>
  );
}
