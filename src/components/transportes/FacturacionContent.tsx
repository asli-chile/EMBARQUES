import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { sileo } from "sileo";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { brand } from "@/lib/brand";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type Operacion = {
  id: string;
  ref_asli: string;
  correlativo: number;
  cliente: string;
  naviera: string;
  nave: string;
  booking: string;
  pod: string;
  etd: string | null;
  estado_operacion: string;
  factura_transporte: string | null;
  monto_facturado: number | null;
  numero_factura_asli: string | null;
  // Campos de transporte (sincronizados desde Reserva ASLI)
  transporte: string | null;
  chofer: string | null;
  rut_chofer: string | null;
  telefono_chofer: string | null;
  patente_camion: string | null;
  patente_remolque: string | null;
  tramo: string | null;
  valor_tramo: number | null;
  contenedor: string | null;
  sello: string | null;
  tara: number | null;
  deposito: string | null;
  moneda: string | null;
  concepto_facturado: string | null;
  tipo_cambio: number | null;
  margen_estimado: number | null;
  margen_real: number | null;
  fecha_entrega_factura: string | null;
  fecha_pago_cliente: string | null;
  fecha_pago_transporte: string | null;
};

type FormData = {
  operacion_id: string;
  factura_transporte: string;
  monto_facturado: string;
  numero_factura_asli: string;
  concepto_facturado: string;
  moneda: string;
  tipo_cambio: string;
  margen_estimado: string;
  margen_real: string;
  fecha_entrega_factura: string;
  fecha_pago_cliente: string;
  fecha_pago_transporte: string;
};

type ItemProforma = {
  id: string;
  descripcion: string;
  cantidad: string;
  monto_unitario: string;
  moneda: string;
};

type CostoExtra = {
  id: string;
  concepto: string;
  tarifa_valor: number | null;
  tarifa_texto: string | null;
  moneda: string;
  condicion: string | null;
};

const initialFormData: FormData = {
  operacion_id: "",
  factura_transporte: "",
  monto_facturado: "",
  numero_factura_asli: "",
  concepto_facturado: "",
  moneda: "",
  tipo_cambio: "",
  margen_estimado: "",
  margen_real: "",
  fecha_entrega_factura: "",
  fecha_pago_cliente: "",
  fecha_pago_transporte: "",
};

const MONEDAS_DEFAULT = ["USD", "CLP", "EUR"];
const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const EXTRA_COST_TRANSLATIONS_EN: Record<string, string> = {
  "cobertura de seguro": "Insurance Coverage",
  "conexion reefer en deposito": "Reefer Connection at Warehouse",
  "falso flete en deposito (export) o en puerto (import)": "False Freight at Warehouse (Export) or Port (Import)",
  "falso flete en transito o cliente": "False Freight in Transit or Client",
  "multistop (de 0 a 30 kms)": "Multistop (0 to 30 km)",
  "sobre estadia en planta": "Demurrage at Plant",
  "sobre estadia en puerto": "Demurrage at Port",
  "caso a caso": "Case by case",
  "segun cobro": "As charged",
};

function normalizeText(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function FacturacionContent() {
  const { t, locale } = useLocale();
  const { isCliente, empresaNombres, isLoading: authLoading } = useAuth();
  const tr = t.facturacion;
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [operaciones, setOperaciones] = useState<Operacion[]>([]);
  const [monedas, setMonedas] = useState<string[]>(MONEDAS_DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPending, setFilterPending] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<"select" | "form">("select");
  const [itemsProforma, setItemsProforma] = useState<ItemProforma[]>([]);
  const [costosExtra, setCostosExtra] = useState<CostoExtra[]>([]);

  const supabase = useMemo(() => {
    try { return createClient(); } catch { return null; }
  }, []);

  const fetchData = useCallback(async () => {
    if (!supabase || authLoading) return;
    setLoading(true);

    let qOp = supabase
      .from("operaciones")
      .select("id, ref_asli, correlativo, cliente, naviera, nave, booking, pod, etd, estado_operacion, factura_transporte, monto_facturado, numero_factura_asli, transporte, chofer, rut_chofer, telefono_chofer, patente_camion, patente_remolque, tramo, valor_tramo, contenedor, sello, tara, deposito, moneda, concepto_facturado, tipo_cambio, margen_estimado, margen_real, fecha_entrega_factura, fecha_pago_cliente, fecha_pago_transporte")
      .is("deleted_at", null)
      .is("transporte_deleted_at", null)
      .eq("enviado_transporte", true)
      .or("tipo_reserva_transporte.eq.asli,tipo_reserva_transporte.is.null");
    if (empresaNombres.length > 0) qOp = qOp.in("cliente", empresaNombres);

    const [operacionesRes, monedasRes, costosRes] = await Promise.all([
      qOp.order("created_at", { ascending: false }),
      supabase.from("catalogos").select("valor").eq("tipo", "moneda").eq("activo", true),
      supabase.from("transportes_costos_extra").select("id, concepto, tarifa_valor, tarifa_texto, moneda, condicion").eq("activo", true).order("concepto"),
    ]);

    setOperaciones((operacionesRes.data ?? []) as Operacion[]);
    const monedasDB = (monedasRes.data ?? []).map((m) => m.valor).filter(Boolean);
    if (monedasDB.length > 0) setMonedas(monedasDB);
    setCostosExtra((costosRes.data ?? []) as CostoExtra[]);
    setLoading(false);
  }, [supabase, authLoading, isCliente, empresaNombres]);

  useEffect(() => {
    if (!authLoading) void fetchData();
    else setOperaciones([]);
  }, [authLoading, fetchData]);

  const selectedOperacion = useMemo(
    () => operaciones.find((op) => op.id === formData.operacion_id),
    [operaciones, formData.operacion_id]
  );

  const filteredOperaciones = useMemo(() => {
    let filtered = operaciones;
    if (filterPending) filtered = filtered.filter((op) => !op.numero_factura_asli);
    if (!searchTerm.trim()) return filtered;
    const search = searchTerm.toLowerCase();
    return filtered.filter((op) => {
      const ref = op.ref_asli || `A${String(op.correlativo).padStart(5, "0")}`;
      return (
        ref.toLowerCase().includes(search) ||
        (op.cliente ?? "").toLowerCase().includes(search) ||
        (op.booking ?? "").toLowerCase().includes(search) ||
        (op.naviera ?? "").toLowerCase().includes(search) ||
        (op.nave ?? "").toLowerCase().includes(search) ||
        (op.pod ?? "").toLowerCase().includes(search)
      );
    });
  }, [operaciones, searchTerm, filterPending]);

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  // Genera y RESERVA el siguiente número TRA correlativo (lo graba inmediatamente para evitar duplicados)
  const reserveNextInvoiceNumber = useCallback(async (operacionId: string): Promise<string> => {
    if (!supabase) return "TRA0001";
    // Re-consultar en tiempo real para evitar race conditions
    const { data } = await supabase
      .from("operaciones")
      .select("numero_factura_asli")
      .like("numero_factura_asli", "TRA%")
      .not("numero_factura_asli", "is", null);
    const nums = (data ?? [])
      .map((r: { numero_factura_asli: string | null }) => {
        const n = parseInt((r.numero_factura_asli ?? "").replace(/^TRA/, ""), 10);
        return isNaN(n) ? 0 : n;
      });
    const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    const newNum = `TRA${String(next).padStart(4, "0")}`;
    // Guardar inmediatamente para reservar el número
    await supabase
      .from("operaciones")
      .update({ numero_factura_asli: newNum })
      .eq("id", operacionId);
    // Actualizar el array local para que reflejar el cambio sin refetch
    setOperaciones((prev) =>
      prev.map((o) => o.id === operacionId ? { ...o, numero_factura_asli: newNum } : o)
    );
    return newNum;
  }, [supabase]);

  const handleSelectOperation = (id: string) => {
    const op = operaciones.find((o) => o.id === id);
    if (!op) { setError(null); return; }

    const loadForm = (invoiceNum: string) => {
      setFormData({
        operacion_id: op.id,
        factura_transporte: op.factura_transporte || "",
        monto_facturado: op.monto_facturado?.toString() || "",
        numero_factura_asli: invoiceNum,
        concepto_facturado: op.concepto_facturado || "",
        moneda: op.moneda || "",
        tipo_cambio: op.tipo_cambio?.toString() || "",
        margen_estimado: op.margen_estimado?.toString() || "",
        margen_real: op.margen_real?.toString() || "",
        fecha_entrega_factura: op.fecha_entrega_factura || "",
        fecha_pago_cliente: op.fecha_pago_cliente || "",
        fecha_pago_transporte: op.fecha_pago_transporte || "",
      });
      const items: ItemProforma[] = [];
      if (op.tramo && op.valor_tramo) {
        items.push({
          id: genId(),
          descripcion: `Tramo de transporte: ${op.tramo}`,
          cantidad: "1",
          monto_unitario: String(op.valor_tramo),
          moneda: op.moneda || "USD",
        });
      }
      setItemsProforma(items);
      setMobilePanel("form");
    };

    if (op.numero_factura_asli) {
      loadForm(op.numero_factura_asli);
    } else if (!isCliente) {
      reserveNextInvoiceNumber(op.id).then((num) => loadForm(num));
    } else {
      loadForm("");
    }
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !formData.operacion_id || isCliente) return;
    setSaving(true);
    setError(null);

    const totalProforma = itemsProforma.reduce(
      (sum, item) => sum + parseFloat(item.cantidad || "1") * parseFloat(item.monto_unitario || "0"),
      0
    );

    const updates: Record<string, unknown> = {
      factura_transporte: formData.factura_transporte || null,
      monto_facturado: totalProforma > 0 ? totalProforma : (formData.monto_facturado ? parseFloat(formData.monto_facturado) : null),
      numero_factura_asli: formData.numero_factura_asli || null,
      concepto_facturado: formData.concepto_facturado || null,
      moneda: formData.moneda || null,
      tipo_cambio: formData.tipo_cambio ? parseFloat(formData.tipo_cambio) : null,
      margen_estimado: formData.margen_estimado ? parseFloat(formData.margen_estimado) : null,
      margen_real: formData.margen_real ? parseFloat(formData.margen_real) : null,
      fecha_entrega_factura: formData.fecha_entrega_factura || null,
      fecha_pago_cliente: formData.fecha_pago_cliente || null,
      fecha_pago_transporte: formData.fecha_pago_transporte || null,
    };

    const { error: err } = await supabase.from("operaciones").update(updates).eq("id", formData.operacion_id);
    setSaving(false);
    if (err) { setError(err.message); } else { sileo.success({ title: tr.saveSuccess }); void fetchData(); }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try { return format(new Date(dateStr), "dd MMM yyyy", { locale: locale === "es" ? es : undefined }); }
    catch { return dateStr; }
  };

  const formatMonto = (val: string | number | null | undefined, mon?: string) => {
    if (!val && val !== 0) return "-";
    const n = parseFloat(String(val));
    if (isNaN(n)) return "-";
    const isCLP = (mon || "").toUpperCase() === "CLP";
    return `${mon || ""} ${n.toLocaleString("es-CL", { minimumFractionDigits: isCLP ? 0 : 2, maximumFractionDigits: isCLP ? 0 : 2 })}`.trim();
  };

  // Helper de formato de monto para PDF/Excel
  const fmtAmt = (n: number, mon: string) => {
    const isCLP = mon.toUpperCase() === "CLP";
    return n.toLocaleString("es-CL", { minimumFractionDigits: isCLP ? 0 : 2, maximumFractionDigits: isCLP ? 0 : 2 });
  };

  // ─── Proforma items helpers ───────────────────────────────────────────────
  const totalProforma = useMemo(() =>
    itemsProforma.reduce((s, i) => s + parseFloat(i.cantidad || "1") * parseFloat(i.monto_unitario || "0"), 0),
    [itemsProforma]
  );

  const translateExtraCostText = useCallback(
    (text: string) => {
      if (locale !== "en") return text;
      const key = normalizeText(text);
      return EXTRA_COST_TRANSLATIONS_EN[key] ?? text;
    },
    [locale]
  );

  const addCostoExtra = (ce: CostoExtra) =>
    setItemsProforma((prev) => [
      ...prev,
      {
        id: genId(),
        descripcion: translateExtraCostText(ce.concepto) + (ce.condicion ? ` (${translateExtraCostText(ce.condicion)})` : ""),
        cantidad: "1",
        monto_unitario: ce.tarifa_valor != null ? String(ce.tarifa_valor) : "",
        moneda: ce.moneda || formData.moneda || "CLP",
      },
    ]);

  const removeItem = (id: string) => setItemsProforma((prev) => prev.filter((i) => i.id !== id));

  const updateItem = (id: string, field: keyof ItemProforma, value: string) =>
    setItemsProforma((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));

  // ─── Exportar Excel con formato profesional (xlsx-js-style) ────────────
  const exportarExcel = async () => {
    const op = selectedOperacion;
    if (!op) return;
    const XLSX = await import("xlsx-js-style");
    const ref = op.ref_asli || `A${String(op.correlativo).padStart(5, "0")}`;
    const fecha = format(new Date(), "dd/MM/yyyy");
    const monedaDoc = formData.moneda || itemsProforma[0]?.moneda || "USD";

    // Paleta de colores
    const BLUE = "1D4ED8";
    const BLUE_LIGHT = "DBEAFE";
    const BLUE_MID = "EFF6FF";
    const GRAY = "F8FAFC";
    const GRAY_TEXT = "64748B";
    const DARK = "1A1A2E";
    const WHITE = "FFFFFF";

    type CellStyle = { font?: object; fill?: object; border?: object; alignment?: object };
    const styleHeader: CellStyle = {
      font: { bold: true, sz: 20, color: { rgb: BLUE }, name: "Segoe UI" },
      alignment: { horizontal: "center", vertical: "center" },
    };
    const styleSubHeader: CellStyle = {
      font: { sz: 10, color: { rgb: GRAY_TEXT }, name: "Segoe UI" },
      alignment: { horizontal: "center" },
    };
    const styleSectionHead: CellStyle = {
      font: { bold: true, sz: 10, color: { rgb: WHITE }, name: "Segoe UI" },
      fill: { fgColor: { rgb: BLUE } },
      alignment: { horizontal: "left", vertical: "center", indent: 1 },
      border: { top: { style: "thin", color: { rgb: BLUE } }, bottom: { style: "thin", color: { rgb: BLUE } } },
    };
    const styleLabel: CellStyle = {
      font: { sz: 10, color: { rgb: GRAY_TEXT }, name: "Segoe UI" },
      fill: { fgColor: { rgb: GRAY } },
      alignment: { horizontal: "left", indent: 1 },
    };
    const styleValue: CellStyle = {
      font: { bold: true, sz: 10, color: { rgb: DARK }, name: "Segoe UI" },
      alignment: { horizontal: "left", indent: 1 },
    };
    const styleTableHead: CellStyle = {
      font: { bold: true, sz: 10, color: { rgb: WHITE }, name: "Segoe UI" },
      fill: { fgColor: { rgb: BLUE } },
      alignment: { horizontal: "center", vertical: "center" },
      border: { top: { style: "thin", color: { rgb: "1E40AF" } }, bottom: { style: "thin", color: { rgb: "1E40AF" } }, left: { style: "thin", color: { rgb: "1E40AF" } }, right: { style: "thin", color: { rgb: "1E40AF" } } },
    };
    const styleTableRow: CellStyle = {
      font: { sz: 10, color: { rgb: DARK }, name: "Segoe UI" },
      border: { top: { style: "thin", color: { rgb: "E2E8F0" } }, bottom: { style: "thin", color: { rgb: "E2E8F0" } }, left: { style: "thin", color: { rgb: "E2E8F0" } }, right: { style: "thin", color: { rgb: "E2E8F0" } } },
    };
    const styleTableRowAlt: CellStyle = {
      ...styleTableRow,
      fill: { fgColor: { rgb: GRAY } },
    };
    const styleTotal: CellStyle = {
      font: { bold: true, sz: 12, color: { rgb: WHITE }, name: "Segoe UI" },
      fill: { fgColor: { rgb: BLUE } },
      alignment: { horizontal: "right", vertical: "center" },
      border: { top: { style: "medium", color: { rgb: BLUE } }, bottom: { style: "medium", color: { rgb: BLUE } } },
    };
    const styleTotalLabel: CellStyle = {
      ...styleTotal,
      alignment: { horizontal: "left", indent: 1, vertical: "center" },
    };
    const styleNote: CellStyle = {
      font: { italic: true, sz: 9, color: { rgb: GRAY_TEXT }, name: "Segoe UI" },
      alignment: { wrapText: true },
    };
    const styleRef: CellStyle = {
      font: { bold: true, sz: 11, color: { rgb: BLUE }, name: "Segoe UI" },
      fill: { fgColor: { rgb: BLUE_LIGHT } },
      alignment: { horizontal: "right", vertical: "center", indent: 1 },
    };

    const ws: Record<string, unknown> = {};
    let row = 1;

    const c = (col: number, r: number) => String.fromCharCode(64 + col) + r;
    const setCell = (col: number, r: number, v: string | number, s: CellStyle) => {
      ws[c(col, r)] = { v, t: typeof v === "number" ? "n" : "s", s };
    };
    const merge = (r1: number, c1: number, r2: number, c2: number) => {
      if (!ws["!merges"]) ws["!merges"] = [];
      (ws["!merges"] as object[]).push({ s: { r: r1 - 1, c: c1 - 1 }, e: { r: r2 - 1, c: c2 - 1 } });
    };

    // ── ENCABEZADO ──
    setCell(1, row, "PROFORMA INVOICE", styleHeader); merge(row, 1, row, 3);
    setCell(4, row, `N°: ${formData.numero_factura_asli || ref}`, styleRef); merge(row, 4, row, 5);
    row++;
    setCell(1, row, "Asesorías y Servicios Logísticos Integrales Ltda.", styleSubHeader); merge(row, 1, row, 3);
    setCell(4, row, `Ref: ${ref}`, { ...styleLabel, alignment: { horizontal: "right", indent: 1 } }); merge(row, 4, row, 5);
    row++;
    setCell(4, row, `Fecha: ${fecha}`, { ...styleLabel, alignment: { horizontal: "right", indent: 1 } }); merge(row, 4, row, 5);
    row++;

    // ── BILL TO / EMBARQUE ──
    setCell(1, row, "FACTURAR A / BILL TO", styleSectionHead); merge(row, 1, row, 2);
    setCell(3, row, "DATOS DEL EMBARQUE", styleSectionHead); merge(row, 3, row, 5);
    row++;
    setCell(1, row, "Cliente:", styleLabel);
    setCell(2, row, op.cliente || "—", styleValue);
    setCell(3, row, "Naviera:", styleLabel);
    setCell(4, row, op.naviera || "—", styleValue); merge(row, 4, row, 5);
    row++;
    setCell(3, row, "Nave:", styleLabel);
    setCell(4, row, op.nave || "—", styleValue); merge(row, 4, row, 5);
    row++;
    setCell(3, row, "Booking:", styleLabel);
    setCell(4, row, op.booking || "—", styleValue); merge(row, 4, row, 5);
    row++;
    setCell(3, row, "POD:", styleLabel);
    setCell(4, row, op.pod || "—", styleValue); merge(row, 4, row, 5);
    row++;
    setCell(3, row, "ETD:", styleLabel);
    setCell(4, row, op.etd ? formatDate(op.etd) : "—", styleValue); merge(row, 4, row, 5);
    row++;

    // ── TRANSPORTE ──
    if (op.transporte || op.contenedor || op.chofer) {
      setCell(1, row, "INFORMACIÓN DE TRANSPORTE", styleSectionHead); merge(row, 1, row, 5);
      row++;
      setCell(1, row, "Empresa transp.:", styleLabel);
      setCell(2, row, op.transporte || "—", styleValue);
      setCell(3, row, "Tramo:", styleLabel);
      setCell(4, row, op.tramo || "—", styleValue); merge(row, 4, row, 5);
      row++;
      if (op.chofer) {
        setCell(1, row, "Chofer:", styleLabel);
        setCell(2, row, `${op.chofer}${op.rut_chofer ? ` · ${op.rut_chofer}` : ""}`, styleValue);
        setCell(3, row, "Teléfono:", styleLabel);
        setCell(4, row, op.telefono_chofer || "—", styleValue); merge(row, 4, row, 5);
        row++;
      }
      if (op.patente_camion) {
        setCell(1, row, "Patente camión:", styleLabel);
        setCell(2, row, `${op.patente_camion}${op.patente_remolque ? ` / ${op.patente_remolque}` : ""}`, styleValue);
        setCell(3, row, "Contenedor:", styleLabel);
        setCell(4, row, op.contenedor || "—", styleValue); merge(row, 4, row, 5);
        row++;
      }
      if (op.sello || op.deposito) {
        setCell(1, row, "Sello:", styleLabel);
        setCell(2, row, op.sello || "—", styleValue);
        setCell(3, row, "Depósito:", styleLabel);
        setCell(4, row, op.deposito || "—", styleValue); merge(row, 4, row, 5);
        row++;
      }
    }
    row++;

    // ── TABLA DE ÍTEMS ──
    setCell(1, row, "#", { ...styleTableHead, alignment: { horizontal: "center" } });
    setCell(2, row, "DESCRIPCIÓN DEL SERVICIO", styleTableHead);
    setCell(3, row, "CANT.", { ...styleTableHead, alignment: { horizontal: "center" } });
    setCell(4, row, "PRECIO UNITARIO", { ...styleTableHead, alignment: { horizontal: "right" } });
    setCell(5, row, "TOTAL", { ...styleTableHead, alignment: { horizontal: "right" } });
    row++;

    const firstItemRow = row;
    itemsProforma.forEach((item, i) => {
      const sub = parseFloat(item.cantidad || "1") * parseFloat(item.monto_unitario || "0");
      const st = i % 2 === 0 ? styleTableRow : styleTableRowAlt;
      setCell(1, row, i + 1, { ...st, alignment: { horizontal: "center" } });
      setCell(2, row, item.descripcion || "—", { ...st, alignment: { horizontal: "left", indent: 1 } });
      setCell(3, row, parseFloat(item.cantidad || "1"), { ...st, alignment: { horizontal: "center" } });
      setCell(4, row, `${item.moneda} ${fmtAmt(parseFloat(item.monto_unitario || "0"), item.moneda)}`, { ...st, alignment: { horizontal: "right" } });
      setCell(5, row, `${item.moneda} ${fmtAmt(sub, item.moneda)}`, { ...st, font: { ...((st as { font?: object }).font ?? {}), bold: true }, alignment: { horizontal: "right" } });
      row++;
    });
    if (itemsProforma.length === 0) {
      setCell(1, row, "Sin ítems registrados", { ...styleNote, alignment: { horizontal: "center" } }); merge(row, 1, row, 5);
      row++;
    }
    void firstItemRow; // usado implícitamente

    // ── TOTAL ──
    setCell(1, row, "TOTAL A PAGAR", styleTotalLabel); merge(row, 1, row, 4);
    setCell(5, row, `${monedaDoc} ${fmtAmt(totalProforma, monedaDoc)}`, { ...styleTotal, fill: { fgColor: { rgb: BLUE } } });
    row += 2;

    // ── NOTAS ──
    if (formData.concepto_facturado) {
      setCell(1, row, "Concepto / Notas:", styleLabel);
      setCell(2, row, formData.concepto_facturado, styleNote); merge(row, 2, row, 5);
      row++;
    }
    if (formData.numero_factura_asli) {
      setCell(1, row, "N° Factura ASLI:", styleLabel);
      setCell(2, row, formData.numero_factura_asli, styleValue); merge(row, 2, row, 5);
      row++;
    }
    if (formData.factura_transporte) {
      setCell(1, row, "Factura Transporte:", styleLabel);
      setCell(2, row, formData.factura_transporte, styleValue); merge(row, 2, row, 5);
      row++;
    }
    row++;

    // ── PIE ──
    setCell(1, row, "Este documento es una Proforma Invoice y no tiene validez tributaria.", styleNote); merge(row, 1, row, 5);
    row++;
    setCell(1, row, `Generado el ${fecha} — ${brand.companyShort} — ${ref}`, styleNote); merge(row, 1, row, 5);

    // Configuración de hoja
    ws["!ref"] = `A1:E${row}`;
    ws["!cols"] = [{ wch: 20 }, { wch: 36 }, { wch: 10 }, { wch: 22 }, { wch: 22 }];
    ws["!rows"] = [{ hpt: 28 }, { hpt: 18 }]; // primera fila más alta

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws as never, "Proforma Invoice");
    const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });

    // xlsx-js-style no soporta !views — inyectamos showGridLines="0" via JSZip
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(out);
    const sheetFile = zip.file("xl/worksheets/sheet1.xml");
    if (sheetFile) {
      let xml = await sheetFile.async("string");
      // Si ya existe <sheetView …> le agregamos el atributo; si no existe lo creamos
      if (xml.includes("<sheetView")) {
        xml = xml.replace(/<sheetView(?![^>]*showGridLines)/g, '<sheetView showGridLines="0"');
      } else {
        xml = xml.replace("<sheetData", '<sheetViews><sheetView showGridLines="0" tabSelected="1" workbookViewId="0"/></sheetViews><sheetData');
      }
      zip.file("xl/worksheets/sheet1.xml", xml);
    }
    const fixedOut = await zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE" });

    const blob = new Blob([fixedOut], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Proforma_${ref}_${format(new Date(), "yyyyMMdd")}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Exportar PDF — Factura Proforma profesional ──────────────────────────
  const exportarPDF = () => {
    const op = selectedOperacion;
    if (!op) return;
    const ref = op.ref_asli || `A${String(op.correlativo).padStart(5, "0")}`;
    const fecha = format(new Date(), "dd/MM/yyyy");
    const monedaDoc = formData.moneda || itemsProforma[0]?.moneda || "USD";
    const subtotalProforma = totalProforma;

    const itemsHTML = itemsProforma.length > 0
      ? itemsProforma.map((item, i) => {
          const sub = parseFloat(item.cantidad || "1") * parseFloat(item.monto_unitario || "0");
          return `<tr>
            <td class="td-center">${i + 1}</td>
            <td class="td-left" style="font-weight:500">${item.descripcion || "-"}</td>
            <td class="td-center">${parseFloat(item.cantidad || "1").toLocaleString("es-CL")}</td>
            <td class="td-right">${item.moneda} ${fmtAmt(parseFloat(item.monto_unitario || "0"), item.moneda)}</td>
            <td class="td-right" style="font-weight:600">${item.moneda} ${fmtAmt(sub, item.moneda)}</td>
          </tr>`;
        }).join("")
      : `<tr><td colspan="5" class="td-center" style="padding:18px;color:#9ca3af;font-style:italic">Sin ítems registrados</td></tr>`;

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Proforma Invoice ${ref}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Arial,sans-serif;font-size:11pt;color:#1a1a2e;background:#fff}
    @page{size:A4;margin:12mm 14mm 14mm 14mm}
    @media print{body{font-size:10pt}.no-print{display:none!important}}
    .page{padding:0;max-width:780px;margin:0 auto}

    /* ── Banda superior ── */
    .top-bar{background:#1d4ed8;height:6px;width:100%}

    /* ── Encabezado ── */
    .header{display:flex;justify-content:space-between;align-items:flex-start;padding:18px 0 14px;border-bottom:1px solid #e2e8f0}
    .logo-area img{height:50px;display:block}
    .company-info{margin-top:6px}
    .company-name{font-size:10pt;font-weight:700;color:#1d4ed8;letter-spacing:0.3px}
    .company-sub{font-size:8pt;color:#64748b;margin-top:1px;line-height:1.4}
    .invoice-box{text-align:right}
    .invoice-title{font-size:22pt;font-weight:800;color:#1d4ed8;letter-spacing:1px;text-transform:uppercase;line-height:1}
    .invoice-subtitle{font-size:9pt;color:#64748b;margin-top:2px;text-transform:uppercase;letter-spacing:2px}
    .invoice-meta{margin-top:8px;display:inline-block;text-align:left;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden}
    .invoice-meta table{border-collapse:collapse}
    .invoice-meta td{padding:4px 10px;font-size:9pt;border-bottom:1px solid #f1f5f9}
    .invoice-meta td:first-child{color:#64748b;white-space:nowrap;background:#f8fafc}
    .invoice-meta td:last-child{font-weight:700;color:#1a1a2e}
    .invoice-meta tr:last-child td{border-bottom:none}

    /* ── Sección Bill To / Embarque ── */
    .section-row{display:flex;gap:12px;margin:12px 0}
    .section-box{flex:1;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden}
    .section-box.full{flex:none;width:100%}
    .section-head{background:#1d4ed8;color:#fff;font-size:8pt;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:5px 10px}
    .section-body{padding:10px 12px}
    .info-grid{display:grid;grid-template-columns:auto 1fr;gap:3px 14px}
    .info-label{font-size:8.5pt;color:#64748b;white-space:nowrap;padding-top:1px}
    .info-value{font-size:8.5pt;font-weight:600;color:#1a1a2e}
    .info-grid-3{display:grid;grid-template-columns:repeat(3,auto 1fr);gap:3px 16px}

    /* ── Tabla de ítems ── */
    .items-section{margin:12px 0}
    .items-title{font-size:8pt;font-weight:700;color:#1d4ed8;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;padding-bottom:4px;border-bottom:2px solid #1d4ed8}
    .items-table{width:100%;border-collapse:collapse;font-size:9.5pt}
    .items-table thead tr{background:#1d4ed8}
    .items-table thead th{color:#fff;padding:7px 8px;font-size:8pt;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;border:1px solid #1e40af}
    .items-table tbody tr:nth-child(even){background:#f8fafc}
    .items-table tbody tr:hover{background:#eff6ff}
    .items-table tbody td{border:1px solid #e2e8f0;padding:8px}
    .td-center{text-align:center}
    .td-left{text-align:left}
    .td-right{text-align:right}
    .total-section{display:flex;justify-content:flex-end;margin-top:4px}
    .total-box{border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;min-width:280px}
    .total-row-minor td{padding:5px 12px;font-size:8.5pt;border-bottom:1px solid #f1f5f9}
    .total-row-minor td:first-child{color:#64748b;background:#f8fafc}
    .total-row-minor td:last-child{text-align:right;font-weight:600}
    .total-row-major td{padding:8px 12px;font-size:11pt;font-weight:800;background:#1d4ed8;color:#fff}
    .total-row-major td:last-child{text-align:right}

    /* ── Notas / condiciones ── */
    .notes-row{display:flex;gap:12px;margin:12px 0}
    .notes-box{flex:1;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden}
    .notes-body{padding:8px 12px;font-size:8.5pt;color:#374151;line-height:1.5}

    /* ── Pie de página ── */
    .footer{margin-top:14px;padding-top:12px;border-top:2px solid #e2e8f0;display:flex;justify-content:space-between;align-items:flex-end}
    .footer-left{font-size:8pt;color:#94a3b8;line-height:1.7;max-width:340px}
    .footer-left strong{color:#64748b}
    .sign-area{text-align:center;min-width:180px}
    .sign-line{border-top:1.5px solid #374151;width:160px;margin:36px auto 0}
    .sign-name{font-size:8pt;font-weight:700;color:#374151;margin-top:4px}
    .sign-role{font-size:7.5pt;color:#94a3b8}

    /* ── Banda inferior ── */
    .bottom-bar{background:linear-gradient(to right,#1d4ed8,#0ea5e9);height:4px;width:100%;margin-top:14px}

    /* ── Botón imprimir (no imprime) ── */
    .print-btn{position:fixed;top:16px;right:16px;padding:10px 20px;background:#1d4ed8;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;box-shadow:0 2px 8px rgba(29,78,216,.3)}
    .print-btn:hover{background:#1e40af}
  </style>
</head>
<body>
<button class="print-btn no-print" onclick="window.print()">Imprimir / Guardar PDF</button>
<div class="page">
  <div class="top-bar"></div>

  <!-- ENCABEZADO -->
  <div class="header">
    <div class="logo-area">
      <img src="${typeof window !== "undefined" ? window.location.origin : ""}${brand.logo}" alt="ASLI"
           onerror="this.style.display='none';document.getElementById('brand-text').style.display='block'">
      <div id="brand-text" style="display:none">
        <div class="company-name">ASLI Ltda.</div>
      </div>
      <div class="company-info">
        <div class="company-name">Asesorías y Servicios Logísticos Integrales Ltda.</div>
        <div class="company-sub">Agentes de Carga Internacional · Santiago, Chile</div>
      </div>
    </div>
    <div class="invoice-box">
      <div class="invoice-title">Proforma</div>
      <div class="invoice-subtitle">Invoice</div>
      <div class="invoice-meta">
        <table>
          <tr><td>N° Documento</td><td>${formData.numero_factura_asli || ref}</td></tr>
          <tr><td>Referencia ASLI</td><td>${ref}</td></tr>
          <tr><td>Fecha emisión</td><td>${fecha}</td></tr>
          ${formData.moneda ? `<tr><td>Moneda</td><td>${formData.moneda}</td></tr>` : ""}
        </table>
      </div>
    </div>
  </div>

  <!-- BILL TO / EMBARQUE -->
  <div class="section-row">
    <div class="section-box">
      <div class="section-head">Facturar a / Bill To</div>
      <div class="section-body">
        <div class="info-grid">
          <span class="info-label">Cliente:</span><span class="info-value">${op.cliente || "—"}</span>
        </div>
      </div>
    </div>
    <div class="section-box">
      <div class="section-head">Datos del Embarque</div>
      <div class="section-body">
        <div class="info-grid">
          <span class="info-label">Naviera:</span><span class="info-value">${op.naviera || "—"}</span>
          <span class="info-label">Nave:</span><span class="info-value">${op.nave || "—"}</span>
          <span class="info-label">Booking:</span><span class="info-value">${op.booking || "—"}</span>
          <span class="info-label">POD:</span><span class="info-value">${op.pod || "—"}</span>
          <span class="info-label">ETD:</span><span class="info-value">${op.etd ? formatDate(op.etd) : "—"}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- TRANSPORTE -->
  ${(op.transporte || op.contenedor || op.chofer || op.patente_camion) ? `
  <div class="section-row" style="margin-bottom:10px">
    <div class="section-box full">
      <div class="section-head">Información de Transporte</div>
      <div class="section-body">
        <div class="info-grid-3">
          ${op.transporte ? `<span class="info-label">Empresa:</span><span class="info-value">${op.transporte}</span>` : ""}
          ${op.chofer ? `<span class="info-label">Chofer:</span><span class="info-value">${op.chofer}${op.rut_chofer ? ` · ${op.rut_chofer}` : ""}${op.telefono_chofer ? ` · ${op.telefono_chofer}` : ""}</span>` : ""}
          ${op.patente_camion ? `<span class="info-label">Patente camión:</span><span class="info-value">${op.patente_camion}${op.patente_remolque ? ` / ${op.patente_remolque}` : ""}</span>` : ""}
          ${op.contenedor ? `<span class="info-label">Contenedor:</span><span class="info-value">${op.contenedor}</span>` : ""}
          ${op.sello ? `<span class="info-label">Sello:</span><span class="info-value">${op.sello}</span>` : ""}
          ${op.tara ? `<span class="info-label">Tara:</span><span class="info-value">${op.tara} kg</span>` : ""}
          ${op.deposito ? `<span class="info-label">Depósito:</span><span class="info-value">${op.deposito}</span>` : ""}
          ${op.tramo ? `<span class="info-label">Tramo:</span><span class="info-value">${op.tramo}</span>` : ""}
        </div>
      </div>
    </div>
  </div>` : ""}

  <!-- ÍTEMS -->
  <div class="items-section">
    <div class="items-title">Detalle de Servicios / Ítems</div>
    <table class="items-table">
      <thead>
        <tr>
          <th class="td-center" style="width:36px">#</th>
          <th class="td-left">Descripción del Servicio</th>
          <th class="td-center" style="width:60px">Cant.</th>
          <th class="td-right" style="width:130px">Precio Unit.</th>
          <th class="td-right" style="width:130px">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHTML}
      </tbody>
    </table>

    <!-- TOTALES -->
    <div class="total-section">
      <table class="total-box" style="border-collapse:collapse">
        ${formData.tipo_cambio && formData.moneda !== "CLP" ? `
        <tr class="total-row-minor">
          <td>Tipo de cambio</td>
          <td>1 ${formData.moneda || "USD"} = CLP ${parseFloat(formData.tipo_cambio).toLocaleString("es-CL")}</td>
        </tr>` : ""}
        <tr class="total-row-minor">
          <td style="font-weight:700">Subtotal</td>
          <td>${monedaDoc} ${fmtAmt(subtotalProforma, monedaDoc)}</td>
        </tr>
        <tr class="total-row-major">
          <td>TOTAL A PAGAR</td>
          <td>${monedaDoc} ${fmtAmt(subtotalProforma, monedaDoc)}</td>
        </tr>
      </table>
    </div>
  </div>

  <!-- NOTAS / CONCEPTO -->
  ${(formData.concepto_facturado || formData.factura_transporte) ? `
  <div class="notes-row">
    ${formData.concepto_facturado ? `
    <div class="notes-box">
      <div class="section-head">Concepto / Notas</div>
      <div class="notes-body">${formData.concepto_facturado}</div>
    </div>` : ""}
    ${formData.factura_transporte ? `
    <div class="notes-box" style="flex:0 0 auto;min-width:200px">
      <div class="section-head">Referencias</div>
      <div class="notes-body">
        <div class="info-grid">
          <span class="info-label">N° Fact. ASLI:</span><span class="info-value">${formData.numero_factura_asli || "—"}</span>
          <span class="info-label">Fact. Transporte:</span><span class="info-value">${formData.factura_transporte}</span>
        </div>
      </div>
    </div>` : ""}
  </div>` : ""}

  <!-- PIE DE PÁGINA -->
  <div class="footer">
    <div class="footer-left">
      <strong>${brand.companyShort} — ${brand.companyTitle}</strong><br>
      Este documento es una <strong>Proforma Invoice</strong> y no tiene validez tributaria.<br>
      Generado el ${fecha} · Referencia ${ref}
    </div>
    <div class="sign-area">
      <div class="sign-line"></div>
      <div class="sign-name">Firma Autorizada</div>
      <div class="sign-role">${brand.companyShort}</div>
    </div>
  </div>
  <div class="bottom-bar"></div>
</div>
</body>
</html>`;

    const win = window.open("", "_blank", "width=960,height=750");
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  // ─── Clases base ─────────────────────────────────────────────────────────
  const inputClass =
    "w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:bg-white transition-all text-sm";
  const labelClass = "block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1";

  const renderInput = (label: string, field: keyof FormData, type = "text", placeholder?: string) => (
    <div>
      <label className={labelClass}>{label}</label>
      <input
        type={type}
        value={formData[field]}
        onChange={(e) => handleChange(field, e.target.value)}
        placeholder={placeholder}
        readOnly={isCliente}
        className={`${inputClass} ${isCliente ? "cursor-default opacity-70" : ""}`}
      />
    </div>
  );

  const renderSelect = (label: string, field: keyof FormData, options: string[], placeholder?: string) => (
    <div>
      <label className={labelClass}>{label}</label>
      <select value={formData[field]} onChange={(e) => handleChange(field, e.target.value)} disabled={isCliente} className={`${inputClass} ${isCliente ? "cursor-default opacity-70" : ""}`}>
        <option value="">{placeholder || tr.select}</option>
        {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );

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
        <div className="rounded-2xl bg-gradient-to-br from-brand-blue via-brand-blue/90 to-teal-700 text-white overflow-hidden shadow-sm">
          <div className="px-5 py-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
                <Icon icon="lucide:receipt" width={22} height={22} className="text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-bold leading-tight">{tr.title}</h1>
                <p className="text-xs text-white/70 mt-0.5">{tr.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {formData.numero_factura_asli && (
                <div className="flex items-center gap-1.5 bg-white/15 rounded-xl px-3 py-1.5">
                  <Icon icon="lucide:hash" width={13} height={13} className="text-white/80" />
                  <span className="text-xs font-bold">{formData.numero_factura_asli}</span>
                </div>
              )}
              {formData.operacion_id && (
                <>
                  <button
                    type="button"
                    onClick={exportarExcel}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/15 hover:bg-white/25 text-white transition-colors"
                    title={tr.exportExcelTitle}
                  >
                    <Icon icon="lucide:table-2" width={14} height={14} />
                    <span className="hidden sm:inline">{tr.excelShort}</span>
                  </button>
                  <button
                    type="button"
                    onClick={exportarPDF}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-brand-blue hover:bg-white/90 transition-colors shadow-sm"
                    title={tr.exportPdfTitle}
                  >
                    <Icon icon="lucide:file-text" width={14} height={14} />
                    <span className="hidden sm:inline">{tr.pdfShort}</span>
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => void fetchData()}
                className="p-2 bg-white/15 hover:bg-white/25 rounded-xl transition-colors text-white"
                title={t.misReservas?.refresh ?? tr.refresh}
              >
                <Icon icon="lucide:refresh-cw" width={16} height={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs mobile */}
        <div className="lg:hidden flex bg-neutral-100 rounded-2xl p-1 gap-1">
          <button
            type="button"
            onClick={() => setMobilePanel("select")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
              mobilePanel === "select" ? "bg-white text-brand-blue shadow-sm" : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            <Icon icon="lucide:list" width={14} height={14} />
            {tr.operationsTab}
          </button>
          <button
            type="button"
            onClick={() => setMobilePanel("form")}
            disabled={!formData.operacion_id}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              mobilePanel === "form" ? "bg-white text-brand-blue shadow-sm" : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            <Icon icon="lucide:receipt" width={14} height={14} />
            {tr.billingTab}
            {formData.operacion_id && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            )}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-4">

          {/* Panel izquierdo — lista de operaciones */}
          <div className={`w-full lg:w-72 xl:w-80 lg:flex-shrink-0 ${mobilePanel !== "select" ? "hidden lg:block" : ""}`}>
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden lg:sticky lg:top-0">
              <div className="h-[2px] bg-gradient-to-r from-brand-blue/60 to-brand-teal/60" />
              <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                    <Icon icon="lucide:search" className="w-3.5 h-3.5 text-brand-blue" />
                  </span>
                  <h2 className="text-xs font-bold text-neutral-600 uppercase tracking-wider">{tr.selectOperation}</h2>
                </div>
                <span className="text-[10px] font-semibold text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">
                  {filteredOperaciones.length}
                </span>
              </div>
              <div className="p-3 space-y-2">
                <div className="relative">
                  <Icon icon="lucide:search" className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-3.5 h-3.5 pointer-events-none" />
                  <input
                    type="text"
                    placeholder={tr.searchPlaceholder}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-neutral-200 bg-neutral-50 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:bg-white transition-all"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs text-neutral-600 cursor-pointer px-1 py-0.5 rounded-lg hover:bg-neutral-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={filterPending}
                    onChange={(e) => setFilterPending(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-neutral-300 accent-brand-blue"
                  />
                  {tr.pendingOnly}
                </label>

                {filteredOperaciones.length === 0 ? (
                  <div className="py-10 text-center">
                    <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center mx-auto mb-2">
                      <Icon icon="lucide:file-x" width={18} height={18} className="text-neutral-300" />
                    </div>
                    <p className="text-neutral-400 text-xs font-medium">{tr.noOperations}</p>
                  </div>
                ) : (
                  <div className="max-h-[calc(100vh-340px)] overflow-y-auto space-y-1.5 pr-0.5">
                    {filteredOperaciones.map((op) => {
                      const isActive = formData.operacion_id === op.id;
                      const ref = op.ref_asli || `A${String(op.correlativo).padStart(5, "0")}`;
                      const facturado = !!op.numero_factura_asli;
                      return (
                        <button
                          key={op.id}
                          type="button"
                          onClick={() => handleSelectOperation(op.id)}
                          className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all ${
                            isActive
                              ? "border-brand-blue bg-brand-blue/5 ring-1 ring-brand-blue/20"
                              : "border-neutral-100 hover:border-neutral-200 hover:bg-neutral-50"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <p className={`font-bold text-xs ${isActive ? "text-brand-blue" : "text-neutral-700"}`}>{ref}</p>
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                              facturado ? "bg-emerald-100" : "bg-amber-100"
                            }`}>
                              <Icon
                                icon={facturado ? "lucide:check" : "lucide:clock"}
                                className={`w-3 h-3 ${facturado ? "text-emerald-600" : "text-amber-600"}`}
                              />
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-500 truncate">{op.cliente}</p>
                          <p className="text-[10px] text-neutral-400 truncate mt-0.5">
                            {op.naviera}{op.booking ? ` · ${op.booking}` : ""}
                          </p>
                          {op.valor_tramo && (
                            <p className="text-[10px] text-brand-blue/70 mt-0.5 font-medium">
                              {formatMonto(op.valor_tramo, op.moneda ?? undefined)}
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Panel derecho — formulario */}
          <div className={`flex-1 min-w-0 ${mobilePanel !== "form" ? "hidden lg:block" : ""}`}>
            {formData.operacion_id ? (
              <div className="space-y-4">

                {/* Banner operación seleccionada */}
                {selectedOperacion && (
                  <div className="rounded-2xl bg-white border border-neutral-200 shadow-sm overflow-hidden">
                    <div className="h-[2px] bg-gradient-to-r from-brand-blue to-brand-teal" />
                    <div className="p-4 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold text-brand-blue uppercase tracking-wider mb-0.5">
                          {tr.selectedOperation}
                        </p>
                        <p className="text-neutral-900 font-bold text-sm">
                          {selectedOperacion.ref_asli || `A${String(selectedOperacion.correlativo).padStart(5, "0")}`}
                          {" "}—{" "}{selectedOperacion.cliente}
                        </p>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          {selectedOperacion.naviera}
                          {selectedOperacion.nave ? ` · ${selectedOperacion.nave}` : ""}
                          {selectedOperacion.booking ? ` · ${selectedOperacion.booking}` : ""}
                        </p>
                        {selectedOperacion.transporte && (
                          <p className="text-xs text-neutral-400 mt-0.5 flex items-center gap-1">
                            <Icon icon="lucide:truck" width={11} height={11} />
                            {selectedOperacion.transporte}
                            {selectedOperacion.contenedor ? ` · ${selectedOperacion.contenedor}` : ""}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={exportarPDF}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          <Icon icon="lucide:file-text" width={12} height={12} />
                          {tr.pdfShort}
                        </button>
                        <button
                          type="button"
                          onClick={exportarExcel}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                        >
                          <Icon icon="lucide:table-2" width={12} height={12} />
                          {tr.excelShort}
                        </button>
                        <button
                          type="button"
                          onClick={() => setMobilePanel("select")}
                          className="lg:hidden inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-brand-blue bg-white border border-brand-blue/30 rounded-lg hover:bg-brand-blue/5 transition-colors"
                        >
                          <Icon icon="lucide:list" width={12} height={12} />
                          {tr.change}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Info de factura */}
                  <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                    <div className="h-[2px] bg-gradient-to-r from-brand-blue/60 to-brand-teal/60" />
                    <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                        <Icon icon="lucide:file-text" className="w-3.5 h-3.5 text-brand-blue" />
                      </span>
                      <h2 className="text-xs font-bold text-neutral-600 uppercase tracking-wider">{tr.invoiceInfo}</h2>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-3">
                      {renderInput(tr.asliInvoice, "numero_factura_asli")}
                      <div>
                        <label className={labelClass}>{tr.invoicedAmount}</label>
                        <div className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-neutral-100 text-neutral-700 text-sm font-bold flex items-center justify-between gap-2 min-h-[42px]">
                          <span className="text-xs text-neutral-400 font-normal">{tr.calculadoDeItems}</span>
                          <span className={totalProforma > 0 ? "text-brand-blue" : "text-neutral-400"}>
                            {totalProforma > 0
                              ? formatMonto(totalProforma, formData.moneda || itemsProforma[0]?.moneda)
                              : "—"}
                          </span>
                        </div>
                      </div>
                      {renderInput(tr.transportInvoice, "factura_transporte")}
                      {renderInput(tr.invoicedConcept, "concepto_facturado")}
                    </div>
                  </div>

                  {/* Financiero */}
                  <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                    <div className="h-[2px] bg-gradient-to-r from-brand-blue/60 to-brand-teal/60" />
                    <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                        <Icon icon="lucide:bar-chart-2" className="w-3.5 h-3.5 text-brand-blue" />
                      </span>
                      <h2 className="text-xs font-bold text-neutral-600 uppercase tracking-wider">{tr.financial}</h2>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-3">
                      {renderSelect(tr.currency, "moneda", monedas)}
                      {renderInput(tr.exchangeRate, "tipo_cambio", "number")}
                      {renderInput(tr.estimatedMargin, "margen_estimado", "number")}
                      {renderInput(tr.realMargin, "margen_real", "number")}
                    </div>
                  </div>
                </div>

                {/* ── Ítems de Proforma ──────────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                  <div className="h-[2px] bg-gradient-to-r from-brand-blue to-brand-teal" />
                  <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                        <Icon icon="lucide:list-checks" className="w-3.5 h-3.5 text-brand-blue" />
                      </span>
                      <h2 className="text-xs font-bold text-neutral-600 uppercase tracking-wider">
                        {tr.proformaItemsTitle}
                      </h2>
                    </div>
                    <div className="flex items-center gap-2">
                      {totalProforma > 0 && (
                        <span className="text-xs font-bold text-brand-blue bg-brand-blue/10 px-2.5 py-1 rounded-full">
                          {tr.total}: {formatMonto(totalProforma, formData.moneda || itemsProforma[0]?.moneda)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ── Costos extra rápidos ── */}
                  {!isCliente && costosExtra.length > 0 && (
                    <div className="px-4 py-2.5 bg-sky-50 border-b border-sky-100 flex items-start gap-3">
                      <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5">
                        <Icon icon="lucide:zap" width={12} height={12} className="text-sky-500" />
                        <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wide whitespace-nowrap">
                          {tr.costosExtraLabel}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {costosExtra.map((ce) => (
                          <button
                            key={ce.id}
                            type="button"
                            onClick={() => addCostoExtra(ce)}
                            title={
                              ce.tarifa_texto
                                ? translateExtraCostText(ce.tarifa_texto)
                                : (ce.tarifa_valor != null ? `${ce.moneda} ${ce.tarifa_valor.toLocaleString("es-CL")}` : "")
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-sky-700 bg-white border border-sky-200 rounded-lg hover:bg-sky-100 hover:border-sky-400 transition-colors shadow-sm"
                          >
                            <Icon icon="lucide:plus" width={10} height={10} />
                            {translateExtraCostText(ce.concepto)}
                            {ce.tarifa_valor != null && (
                              <span className="text-sky-400 font-normal ml-0.5">
                                {ce.moneda} {ce.tarifa_valor.toLocaleString("es-CL")}
                              </span>
                            )}
                            {ce.tarifa_texto && !ce.tarifa_valor && (
                              <span className="text-sky-400 font-normal ml-0.5">{translateExtraCostText(ce.tarifa_texto)}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {itemsProforma.length === 0 ? (
                    <div className="py-8 text-center px-4">
                      <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center mx-auto mb-2">
                        <Icon icon="lucide:package-open" width={18} height={18} className="text-neutral-300" />
                      </div>
                      <p className="text-neutral-400 text-xs font-medium">{tr.noItems}</p>
                    </div>
                  ) : (
                    <div className="p-4 space-y-2">
                      {/* Header de columnas */}
                      <div className={`hidden sm:grid gap-2 px-1 ${isCliente ? "grid-cols-[1fr_80px_120px_100px]" : "grid-cols-[1fr_80px_120px_100px_36px]"}`}>
                        <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wide">{tr.itemDescription}</span>
                        <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wide text-center">{tr.itemQty}</span>
                        <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wide">{tr.itemUnitAmount}</span>
                        <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wide">{tr.itemCurrency}</span>
                        {!isCliente && <span />}
                      </div>

                      {itemsProforma.map((item) => {
                        const subtotal = parseFloat(item.cantidad || "1") * parseFloat(item.monto_unitario || "0");
                        return (
                          <div key={item.id} className={`grid grid-cols-1 gap-2 items-center p-3 rounded-xl bg-neutral-50 border border-neutral-100 ${isCliente ? "sm:grid-cols-[1fr_80px_120px_100px]" : "sm:grid-cols-[1fr_80px_120px_100px_36px]"}`}>
                            <input
                              type="text"
                              value={item.descripcion}
                              onChange={(e) => updateItem(item.id, "descripcion", e.target.value)}
                              placeholder={tr.itemDescriptionPlaceholder}
                              readOnly={isCliente}
                              className={`w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all ${isCliente ? "cursor-default opacity-70" : ""}`}
                            />
                            <input
                              type="number"
                              value={item.cantidad}
                              onChange={(e) => updateItem(item.id, "cantidad", e.target.value)}
                              placeholder="1"
                              min="1"
                              readOnly={isCliente}
                              className={`w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-xs text-center focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all ${isCliente ? "cursor-default opacity-70" : ""}`}
                            />
                            <div className="relative">
                              <input
                                type="number"
                                value={item.monto_unitario}
                                onChange={(e) => updateItem(item.id, "monto_unitario", e.target.value)}
                                placeholder="0.00"
                                readOnly={isCliente}
                                className={`w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all ${isCliente ? "cursor-default opacity-70" : ""}`}
                              />
                              {subtotal > 0 && (
                                <span className="absolute -bottom-4 left-0 text-[9px] text-brand-blue font-medium">
                                  = {subtotal.toLocaleString("es-CL")}
                                </span>
                              )}
                            </div>
                            <select
                              value={item.moneda}
                              onChange={(e) => updateItem(item.id, "moneda", e.target.value)}
                              disabled={isCliente}
                              className={`w-full px-2 py-2 rounded-lg border border-neutral-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all ${isCliente ? "cursor-default opacity-70" : ""}`}
                            >
                              {monedas.map((m) => <option key={m} value={m}>{m}</option>)}
                            </select>
                            {!isCliente && (
                              <button
                                type="button"
                                onClick={() => removeItem(item.id)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                              >
                                <Icon icon="lucide:trash-2" width={14} height={14} />
                              </button>
                            )}
                          </div>
                        );
                      })}

                      {/* Total */}
                      {itemsProforma.length > 0 && (
                        <div className="flex justify-end pt-2 border-t border-neutral-100">
                          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-brand-blue/5 border border-brand-blue/20">
                            <span className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">{tr.totalProformaLabel}</span>
                            <span className="text-sm font-bold text-brand-blue">
                              {formatMonto(totalProforma, formData.moneda || itemsProforma[0]?.moneda)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Fechas de pago */}
                <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                  <div className="h-[2px] bg-gradient-to-r from-brand-blue/60 to-brand-teal/60" />
                  <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                      <Icon icon="lucide:calendar" className="w-3.5 h-3.5 text-brand-blue" />
                    </span>
                    <h2 className="text-xs font-bold text-neutral-600 uppercase tracking-wider">{tr.paymentDates}</h2>
                  </div>
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {renderInput(tr.invoiceDelivery, "fecha_entrega_factura", "date")}
                    {renderInput(tr.clientPayment, "fecha_pago_cliente", "date")}
                    {renderInput(tr.transportPayment, "fecha_pago_transporte", "date")}
                  </div>
                </div>

                {error && (
                  <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium flex items-center gap-2">
                    <Icon icon="lucide:alert-circle" className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}


                {/* Acciones */}
                {isCliente ? (
                  <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs">
                    <Icon icon="lucide:lock" width={14} height={14} className="shrink-0" />
                    <span>{tr.readOnlyNotice}</span>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-3 justify-end">
                    <div className="flex gap-3 ml-auto">
                      <button
                        type="button"
                        onClick={() => { setFormData(initialFormData); setItemsProforma([]); setError(null); }}
                        className="px-4 py-2.5 text-sm font-semibold text-neutral-600 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors"
                      >
                        {tr.cancel}
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-brand-blue rounded-xl hover:bg-brand-blue/90 transition-colors shadow-sm shadow-brand-blue/20 disabled:opacity-50"
                      >
                        {saving ? (
                          <><Icon icon="typcn:refresh" className="w-4 h-4 animate-spin" />{tr.saving}</>
                        ) : (
                          <><Icon icon="lucide:save" className="w-4 h-4" />{tr.save}</>
                        )}
                      </button>
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div className="rounded-2xl bg-white border border-neutral-200 shadow-sm overflow-hidden">
                <div className="py-16 px-6 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-4">
                    <Icon icon="lucide:receipt" width={28} height={28} className="text-neutral-300" />
                  </div>
                  <p className="text-neutral-700 font-semibold text-sm mb-1">{tr.selectOperation}</p>
                  <p className="text-neutral-400 text-xs">{tr.selectOpHint}</p>
                  <button
                    type="button"
                    onClick={() => setMobilePanel("select")}
                    className="lg:hidden mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-brand-blue rounded-xl hover:bg-brand-blue/90 transition-colors"
                  >
                    <Icon icon="lucide:list" width={13} height={13} />
                    {tr.viewOperations}
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}
