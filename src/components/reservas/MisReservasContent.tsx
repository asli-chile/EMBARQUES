import { memo, useCallback, useDeferredValue, useEffect, useMemo, useState, type CSSProperties, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { sendEmail } from "@/lib/email/sendEmail";
import { Icon } from "@iconify/react";
import { sileo } from "sileo";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { useLocale } from "@/lib/i18n/LocaleContext";
import {
  applyOperacionesClienteFilter,
  shouldSkipOperacionesForCliente,
} from "@/lib/auth/operacionesClienteScope";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { withBase } from "@/lib/basePath";
import { goBackOr } from "@/lib/navigation";
import { displayRefAsli, formatRefAsli } from "@/lib/refAsli";
import { ESTADO_OPERACION_STYLES } from "@/lib/ui/estadoOperacion";

/** Evita pintar filas fuera de viewport (~1000 filas). */
const ROW_CV: CSSProperties = { contentVisibility: "auto", containIntrinsicSize: "auto 44px" };

const FILTER_FIELD =
  "w-full px-2.5 py-2 border border-brand-blue/20 bg-white rounded-lg text-sm text-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/25 focus:border-brand-blue transition-all";
const FILTER_LABEL = "block text-[10px] font-bold uppercase tracking-wider text-brand-blue/50 mb-1";

type SvgProps = { size?: number; className?: string };

function IcoCopy({ size = 18, className }: SvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}
function IcoMail({ size = 18, className }: SvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}
function IcoExternal({ size = 16, className }: SvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  );
}
function IcoPaperclip({ size = 16, className }: SvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}
function IcoBookmark({ size = 16, className }: SvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
    </svg>
  );
}

type Operacion = {
  id: string;
  correlativo: number | null;
  ref_asli: string | null;
  referencia_externa: string | null;
  cliente: string | null;
  especie: string | null;
  naviera: string | null;
  nave: string | null;
  pol: string | null;
  pod: string | null;
  etd: string | null;
  eta: string | null;
  tt: number | null;
  booking: string | null;
  booking_doc_url: string | null;
  enviado_transporte: boolean | null;
  tipo_reserva_transporte: string | null;
  estado_operacion: string | null;
  solicitud_ventana: string | null;
  created_at: string;
  // campos adicionales para email / tarjeta
  consignatario: string | null;
  tipo_unidad: string | null;
  pallets: number | null;
  peso_neto: number | null;
  temperatura: number | null;
  ventilacion: number | null;
  deposito: string | null;
  planta_presentacion: string | null;
  citacion: string | null;
  inicio_stacking: string | null;
  fin_stacking: string | null;
};

const estadoConfig = ESTADO_OPERACION_STYLES;

type SortField = "ref_asli" | "referencia_externa" | "cliente" | "especie" | "naviera" | "nave" | "pol" | "pod" | "etd" | "eta" | "tt" | "booking" | "estado_operacion" | "solicitud_ventana";
type SortDirection = "asc" | "desc";
type ViewMode = "table" | "cards";

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  const iso = dateStr.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split("-");
    return `${d}-${m}-${y}`;
  }
  try { return format(new Date(dateStr), "dd-MM-yyyy", { locale: es }); } catch { return dateStr; }
}

function fmtDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const stamp = dateStr.slice(0, 16);
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(stamp)) {
    const [dayPart, timePart] = stamp.split("T");
    const [y, m, d] = dayPart.split("-");
    return `${d}-${m}-${y} ${timePart}`;
  }
  return fmtDate(dateStr);
}

function VentanaBadge({ value }: { value: string | null | undefined }) {
  if (value === "LATE") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border bg-amber-50 text-amber-800 border-amber-300">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
        Late
      </span>
    );
  }
  if (value === "EXTRA_LATE") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border bg-red-50 text-red-700 border-red-300">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
        Extra late
      </span>
    );
  }
  if (value === "NORMAL") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border bg-sky-50 text-sky-800 border-sky-200">
        <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
        Normal
      </span>
    );
  }
  return <span className="text-brand-blue/30 text-xs">—</span>;
}

function ventanaLabel(value: string | null | undefined): string {
  if (value === "LATE") return "Late";
  if (value === "EXTRA_LATE") return "Extra late";
  if (value === "NORMAL") return "Normal";
  return "";
}

function isBlank(value: string | null | undefined): boolean {
  return value == null || String(value).trim() === "";
}

type EmptyInlineCellProps = {
  value: string | null | undefined;
  canEdit: boolean;
  addLabel: string;
  saving?: boolean;
  onSave: (next: string) => Promise<boolean>;
};

function EmptyInlineCell({ value, canEdit, addLabel, saving, onSave }: EmptyInlineCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  if (!isBlank(value)) {
    return (
      <span className="text-[13px] text-brand-blue/80 font-medium truncate block max-w-full" title={String(value)}>
        {value}
      </span>
    );
  }

  if (!canEdit) {
    return <span className="text-brand-blue/30 text-xs">—</span>;
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setDraft("");
          setEditing(true);
        }}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-brand-blue/55 border border-dashed border-brand-blue/30 hover:border-brand-blue/50 hover:text-brand-blue hover:bg-brand-blue/5 transition-colors"
        title={addLabel}
      >
        <Icon icon="lucide:pencil" width={12} height={12} />
        {addLabel}
      </button>
    );
  }

  const commit = async () => {
    const next = draft.trim();
    if (!next) {
      setEditing(false);
      return;
    }
    setBusy(true);
    const ok = await onSave(next);
    setBusy(false);
    if (ok) setEditing(false);
  };

  return (
    <input
      autoFocus
      value={draft}
      disabled={busy || saving}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => { void commit(); }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          void commit();
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setEditing(false);
        }
      }}
      className="w-full min-w-[6rem] max-w-[11rem] px-2 py-1 rounded-md border border-brand-blue/35 text-[12px] font-semibold text-brand-blue bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/25"
      placeholder={addLabel}
    />
  );
}

function CardDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-bold uppercase tracking-wider text-brand-blue/45">{label}</p>
      <p className="text-xs font-semibold text-brand-blue leading-snug break-words mt-0.5">{value}</p>
    </div>
  );
}

function renderHtmlTable(title: string, data: [string, unknown][]) {
  const rowsHtml = data
    .map(([label, val]) => {
      const v = val ?? "-";
      return `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-size:13px;white-space:nowrap">${label}</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#1f2937">${v}</td></tr>`;
    })
    .join("");
  return `<div style="margin-bottom:16px"><div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#2563eb;margin-bottom:6px;border-bottom:1px solid #e5e7eb;padding-bottom:4px">${title}</div><table style="border-collapse:collapse">${rowsHtml}</table></div>`;
}

function buildEmailContent(op: Operacion) {
  const subject = [
    "SOLICITUD DE RESERVA",
    op.cliente ?? "",
    op.naviera ?? "",
    [op.nave, op.tt ? `${op.tt}D` : ""].filter(Boolean).join(" - ") || "",
    op.especie ?? "",
    op.temperatura != null ? `${op.temperatura}°C` : "",
    op.ventilacion != null ? String(op.ventilacion) : "",
    op.pol ?? "",
    op.pod ?? "",
  ].filter(Boolean).join(" // ");

  let htmlBody = `<div style="font-family:Arial,sans-serif;color:#374151">`;
  htmlBody += `<p>Estimado equipo,</p><p>Se solicita la siguiente reserva:</p>`;
  htmlBody += renderHtmlTable("General", [
    ["Ref. ASLI", formatRefAsli(op.ref_asli, op.correlativo)],
    ["Ref. Externa", op.referencia_externa],
    ["Cliente", op.cliente],
    ["Estado", op.estado_operacion],
  ]);
  htmlBody += renderHtmlTable("Carga", [
    ["Especie", op.especie],
    ["Tipo unidad", op.tipo_unidad],
    ["Temperatura", op.temperatura != null ? `${op.temperatura}°C` : null],
    ["Ventilación (CBM/h)", op.ventilacion != null ? op.ventilacion : null],
    ["Consignatario", op.consignatario],
  ]);
  htmlBody += renderHtmlTable("Embarque", [
    ["Naviera", op.naviera],
    ["Nave", op.nave],
    ["Booking", op.booking],
    ["POL", op.pol],
    ["POD", op.pod],
    ["ETD", fmtDate(op.etd)],
    ["ETA", fmtDate(op.eta)],
    ["Tránsito", op.tt ? `${op.tt} días` : null],
  ]);
  htmlBody += `<p>Quedo atento.</p></div>`;

  return { subject, htmlBody };
}

function buildReservaBody(op: Operacion): string {
  const lines: string[] = [
    `SOLICITUD DE RESERVA`,
    `Ref: ${displayRefAsli(op.ref_asli, op.correlativo)}`,
    op.referencia_externa ? `Ref. Externa: ${op.referencia_externa}` : "",
    `Cliente: ${op.cliente ?? "-"}`,
    `Naviera: ${op.naviera ?? "-"}  |  Nave: ${op.nave ?? "-"}`,
    `POL: ${op.pol ?? "-"}  |  POD: ${op.pod ?? "-"}`,
    `ETD: ${op.etd ? format(new Date(op.etd), "dd/MM/yyyy") : "-"}`,
    `Especie: ${op.especie ?? "-"}`,
    op.temperatura != null ? `Temperatura: ${op.temperatura}°C` : "",
    op.ventilacion != null ? `Ventilación: ${op.ventilacion} CBM/h` : "",
    op.booking ? `Booking: ${op.booking}` : "",
  ].filter(Boolean);
  return lines.join("\n");
}

async function copyToClipboard(op: Operacion): Promise<boolean> {
  const text = buildReservaBody(op);
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// ─── SortableHeader ───────────────────────────────────────────────────────────

type SortableHeaderProps = {
  field: SortField;
  label: string;
  sortField: SortField | null;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  className?: string;
};

function SortableHeader({ field, label, sortField, sortDirection, onSort, className }: SortableHeaderProps) {
  const isActive = sortField === field;
  return (
    <th className={`sticky top-0 z-20 bg-[#E8EEF7] px-3 py-2.5 whitespace-nowrap border-b border-brand-blue/15 text-center ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className={`inline-flex items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-wider transition-colors ${
          isActive ? "text-brand-blue" : "text-brand-blue/45 hover:text-brand-blue"
        }`}
      >
        {label}
        <span className="flex flex-col gap-px">
          <Icon icon="typcn:arrow-sorted-up" width={10} height={10} className={isActive && sortDirection === "asc" ? "text-brand-blue" : "text-brand-blue/20"} />
          <Icon icon="typcn:arrow-sorted-down" width={10} height={10} className={isActive && sortDirection === "desc" ? "text-brand-blue" : "text-brand-blue/20"} />
        </span>
      </button>
    </th>
  );
}

// ─── ReservaCard ──────────────────────────────────────────────────────────────

type CardProps = {
  op: Operacion;
  isCliente: boolean;
  selected: boolean;
  actionLoading: boolean;
  tr: ReturnType<typeof useLocale>["t"]["misReservas"];
  onSelect: (id: string) => void;
  onCopy: (op: Operacion) => void;
  onEmail: (op: Operacion) => void;
  onBooking: (op: Operacion) => void;
  onContextMenu: (event: MouseEvent, op: Operacion) => void;
};

const ReservaCard = memo(function ReservaCard({ op, isCliente, selected, actionLoading: _actionLoading, tr, onSelect, onCopy, onEmail, onBooking, onContextMenu }: CardProps) {
  const [expanded, setExpanded] = useState(false);
  const cfg = op.estado_operacion ? estadoConfig[op.estado_operacion] : null;
  const transportLabel =
    op.tipo_reserva_transporte === "asli"
      ? tr.reservaAsliName
      : op.tipo_reserva_transporte === "externa"
        ? tr.typeExternal
        : tr.typePendiente;

  return (
    <div
      onClick={!isCliente ? () => onSelect(op.id) : undefined}
      onContextMenu={(event) => onContextMenu(event, op)}
      className={`relative bg-white rounded-xl flex flex-col overflow-hidden transition-all duration-150 border ${
        !isCliente ? "cursor-pointer" : ""
      } ${
        selected
          ? "border-brand-blue ring-2 ring-brand-blue/20 shadow-md"
          : "border-brand-blue/12 hover:border-brand-blue/30 hover:shadow-sm"
      }`}
    >
      <span className={`absolute inset-y-0 left-0 w-[3px] ${cfg ? cfg.dot : "bg-brand-blue"}`} aria-hidden />

      <div className="pl-4 pr-3 pt-3 pb-2 flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          {!isCliente && (
            <div className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
              selected ? "bg-brand-blue border-brand-blue" : "border-brand-blue/30 bg-white"
            }`}>
              {selected && <Icon icon="lucide:check" width={10} height={10} className="text-white" />}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-bold text-brand-blue leading-tight tabular-nums tracking-tight">
              {displayRefAsli(op.ref_asli, op.correlativo)}
            </p>
            <p className="text-xs text-brand-blue/65 truncate mt-0.5 font-medium">{op.cliente ?? "-"}</p>
          </div>
        </div>
        {cfg && (
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border whitespace-nowrap shrink-0 ${cfg.bg} ${cfg.text} ${cfg.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} shrink-0`} />
            {op.estado_operacion}
          </span>
        )}
      </div>

      {op.solicitud_ventana ? (
        <div className="px-3 pb-2">
          <VentanaBadge value={op.solicitud_ventana} />
        </div>
      ) : null}

      <div className="mx-3 mb-2.5 bg-[#F4F8FC] rounded-lg px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-wider text-brand-blue/45">{tr.cardOrigin}</p>
            <p className="text-sm font-bold text-brand-blue truncate leading-tight">{op.pol ?? "-"}</p>
          </div>
          <div className="flex flex-col items-center gap-0.5 shrink-0">
            <div className="w-10 h-px bg-brand-blue/20" />
            {op.tt !== null ? (
              <span className="text-[10px] font-bold text-brand-blue tabular-nums">{op.tt}d</span>
            ) : (
              <Icon icon="lucide:arrow-right" width={12} height={12} className="text-brand-blue/30" />
            )}
            <div className="w-10 h-px bg-brand-blue/20" />
          </div>
          <div className="flex-1 min-w-0 text-right">
            <p className="text-[9px] font-bold uppercase tracking-wider text-brand-blue/45">{tr.cardDestino}</p>
            <p className="text-sm font-bold text-brand-blue truncate leading-tight">{op.pod ?? "-"}</p>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] tabular-nums">
          <span className="text-brand-blue/50">ETD <span className="font-semibold text-brand-blue">{fmtDate(op.etd)}</span></span>
          <span className="text-brand-blue/50">ETA <span className="font-semibold text-brand-blue">{fmtDate(op.eta)}</span></span>
        </div>
      </div>

      <div className="px-3 pb-2 flex-1 space-y-1 text-xs">
        {(op.naviera || op.nave) && (
          <p className="text-brand-blue/80 truncate">
            <span className="font-semibold">{op.naviera ?? "-"}</span>
            {op.nave ? <span className="text-brand-blue/50"> · {op.nave}</span> : null}
          </p>
        )}
        {op.especie && (
          <p className="text-brand-blue/60 truncate">{op.especie}</p>
        )}
      </div>

      {expanded && (
        <div className="mx-3 mb-2.5 rounded-lg border border-brand-blue/12 bg-white px-3 py-2.5 grid grid-cols-2 gap-x-3 gap-y-2.5">
          <CardDetail label={tr.colRefExterna} value={op.referencia_externa || "—"} />
          <CardDetail label={tr.cardConsignee} value={op.consignatario || "—"} />
          <CardDetail label={tr.cardUnitType} value={op.tipo_unidad || "—"} />
          <CardDetail label={tr.cardPallets} value={op.pallets != null ? String(op.pallets) : "—"} />
          <CardDetail label={tr.cardNetWeight} value={op.peso_neto != null ? `${op.peso_neto} kg` : "—"} />
          <CardDetail label={tr.cardTemperature} value={op.temperatura != null ? `${op.temperatura}°C` : "—"} />
          <CardDetail label={tr.cardVentilation} value={op.ventilacion != null ? `${op.ventilacion} CBM/h` : "—"} />
          <CardDetail label={tr.cardDepot} value={op.deposito || "—"} />
          <CardDetail label={tr.cardPlant} value={op.planta_presentacion || "—"} />
          <CardDetail label={tr.cardCitation} value={fmtDateTime(op.citacion)} />
          <CardDetail label={tr.cardStackingStart} value={fmtDateTime(op.inicio_stacking)} />
          <CardDetail label={tr.cardStackingEnd} value={fmtDateTime(op.fin_stacking)} />
          <CardDetail label={tr.colTransport} value={transportLabel} />
          {op.booking_doc_url && (
            <div className="col-span-2 min-w-0">
              <a
                href={op.booking_doc_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
              >
                <IcoPaperclip size={12} />
                {tr.cardViewDoc}
                <IcoExternal size={12} />
              </a>
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setExpanded((open) => !open);
        }}
        aria-expanded={expanded}
        className="mx-3 mb-2 inline-flex items-center justify-center gap-1 rounded-lg border border-brand-blue/15 bg-[#F4F8FC] px-2.5 py-1.5 text-[11px] font-semibold text-brand-blue hover:bg-brand-blue/8 hover:border-brand-blue/25 transition-colors"
      >
        {expanded ? tr.cardHideDetails : tr.cardShowDetails}
        <Icon icon={expanded ? "lucide:chevron-up" : "lucide:chevron-down"} width={14} height={14} />
      </button>

      <div className="px-2.5 py-1.5 border-t border-brand-blue/8 flex items-center justify-between bg-[#F7FAFD]">
        {!isCliente ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onBooking(op); }}
            className={`inline-flex items-center gap-1 max-w-[58%] px-2 py-1 rounded-md text-[11px] font-semibold border truncate ${
              op.booking_doc_url
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : op.booking
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-white text-brand-blue/40 border-dashed border-brand-blue/25"
            }`}
            title={op.booking ? tr.editBookingTitle : tr.confirmBookingTitle}
          >
            {op.booking_doc_url ? <IcoPaperclip size={12} className="shrink-0" /> : <IcoBookmark size={12} className="shrink-0" />}
            <span className="font-mono truncate">{op.booking ?? tr.confirmShort}</span>
          </button>
        ) : (
          <span className="font-mono text-[11px] text-brand-blue/70 truncate max-w-[58%]">{op.booking || "—"}</span>
        )}
        <div className="flex items-center">
          <button type="button" onClick={(e) => { e.stopPropagation(); onCopy(op); }} className="p-2 min-h-[40px] min-w-[40px] inline-flex items-center justify-center text-brand-blue/40 hover:text-brand-blue hover:bg-brand-blue/8 rounded-lg transition-colors" title={tr.copyTitle}>
            <IcoCopy size={16} />
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onEmail(op); }} className="p-2 min-h-[40px] min-w-[40px] inline-flex items-center justify-center text-brand-blue/40 hover:text-brand-blue hover:bg-brand-blue/8 rounded-lg transition-colors" title={tr.emailTitle}>
            <IcoMail size={16} />
          </button>
        </div>
      </div>
    </div>
  );
});

type TableRowProps = {
  op: Operacion;
  idx: number;
  selected: boolean;
  isCliente: boolean;
  canInlineEdit: boolean;
  addEmptyLabel: string;
  typeExternal: string;
  typePendiente: string;
  copyShort: string;
  emailTitle: string;
  editBookingTitle: string;
  confirmBookingTitle: string;
  confirmShort: string;
  onSelect: (id: string) => void;
  onCopy: (op: Operacion) => void;
  onEmail: (op: Operacion) => void;
  onBooking: (op: Operacion) => void;
  onContextMenu: (event: MouseEvent, op: Operacion) => void;
  onInlineSave: (op: Operacion, field: InlineEditableField, next: string) => Promise<boolean>;
};

type InlineEditableField = "referencia_externa" | "nave" | "pol" | "pod";

const MisReservasTableRow = memo(function MisReservasTableRow({
  op,
  idx,
  selected,
  isCliente,
  canInlineEdit,
  addEmptyLabel,
  typeExternal,
  typePendiente,
  copyShort,
  emailTitle,
  editBookingTitle,
  confirmBookingTitle,
  confirmShort,
  onSelect,
  onCopy,
  onEmail,
  onBooking,
  onContextMenu,
  onInlineSave,
}: TableRowProps) {
  const cfg = op.estado_operacion ? estadoConfig[op.estado_operacion] : null;
  return (
    <tr
      style={ROW_CV}
      onContextMenu={(event) => onContextMenu(event, op)}
      className={`border-b border-brand-blue/[0.07] ${
        selected ? "bg-brand-blue/[0.08]" : idx % 2 === 0 ? "bg-white hover:bg-brand-blue/[0.04]" : "bg-[#F7FAFD] hover:bg-brand-blue/[0.04]"
      }`}
    >
      {!isCliente && (
        <td className="relative px-3 py-2 text-center w-10">
          {cfg && <span className={`absolute inset-y-0 left-0 w-[3px] ${cfg.dot}`} aria-hidden />}
          <input type="checkbox" checked={selected} onChange={() => onSelect(op.id)} className="w-4 h-4 rounded border-neutral-300 accent-brand-blue" />
        </td>
      )}
      <td className={`px-3 py-2 text-center ${isCliente ? "relative" : ""}`}>
        {isCliente && cfg && <span className={`absolute inset-y-0 left-0 w-[3px] ${cfg.dot}`} aria-hidden />}
        <span className="font-bold text-brand-blue text-[13px] tabular-nums tracking-tight">{displayRefAsli(op.ref_asli, op.correlativo, "-")}</span>
      </td>
      <td className="px-3 py-2 text-center max-w-[9rem]">
        <EmptyInlineCell
          value={op.referencia_externa}
          canEdit={canInlineEdit}
          addLabel={addEmptyLabel}
          onSave={(next) => onInlineSave(op, "referencia_externa", next)}
        />
      </td>
      <td className="px-3 py-2 min-w-[9rem] text-center">
        {!isCliente ? (
          <div className="inline-flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => onBooking(op)}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold border max-w-[200px] ${
                op.booking_doc_url
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                  : op.booking
                  ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                  : "bg-white text-neutral-400 border-neutral-200 border-dashed hover:border-amber-300 hover:text-amber-500 hover:bg-amber-50"
              }`}
              title={op.booking ? editBookingTitle : confirmBookingTitle}
            >
              {op.booking_doc_url ? <IcoPaperclip size={12} className="shrink-0" /> : <IcoBookmark size={12} className="shrink-0" />}
              <span className="font-mono truncate">{op.booking ?? confirmShort}</span>
            </button>
            {op.booking_doc_url && (
              <a href={op.booking_doc_url} target="_blank" rel="noopener noreferrer" title="Ver documento" className="p-1 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded">
                <IcoExternal size={13} />
              </a>
            )}
          </div>
        ) : (
          <div className="inline-flex items-center gap-1">
            <span className="text-[12px] font-mono text-brand-blue/80">{op.booking || "—"}</span>
            {op.booking_doc_url && (
              <a href={op.booking_doc_url} target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:text-emerald-700">
                <IcoPaperclip size={12} />
              </a>
            )}
          </div>
        )}
      </td>
      <td className="px-3 py-2 text-center text-[13px] text-brand-blue font-medium whitespace-nowrap max-w-[10rem] truncate">{op.cliente || "—"}</td>
      <td className="px-3 py-2 text-center text-[13px] text-brand-blue/75 max-w-[8rem] truncate">{op.especie || "—"}</td>
      <td className="px-3 py-2 text-center text-[13px] text-brand-blue/75 whitespace-nowrap">{op.naviera || "—"}</td>
      <td className="px-3 py-2 text-center max-w-[9rem]">
        <EmptyInlineCell
          value={op.nave}
          canEdit={canInlineEdit}
          addLabel={addEmptyLabel}
          onSave={(next) => onInlineSave(op, "nave", next)}
        />
      </td>
      <td className="px-3 py-2 text-center">
        <EmptyInlineCell
          value={op.pol}
          canEdit={canInlineEdit}
          addLabel={addEmptyLabel}
          onSave={(next) => onInlineSave(op, "pol", next)}
        />
      </td>
      <td className="px-3 py-2 text-center">
        <EmptyInlineCell
          value={op.pod}
          canEdit={canInlineEdit}
          addLabel={addEmptyLabel}
          onSave={(next) => onInlineSave(op, "pod", next)}
        />
      </td>
      <td className="px-3 py-2 text-center text-[12px] text-brand-blue font-semibold whitespace-nowrap tabular-nums">{fmtDate(op.etd)}</td>
      <td className="px-3 py-2 text-center text-[12px] text-brand-blue font-semibold whitespace-nowrap tabular-nums">{fmtDate(op.eta)}</td>
      <td className="px-3 py-2 text-center">
        {op.tt !== null ? (
          <span className="text-[11px] font-bold text-brand-blue tabular-nums">{op.tt}d</span>
        ) : <span className="text-brand-blue/30 text-xs">—</span>}
      </td>
      <td className="px-3 py-2 text-center">
        <VentanaBadge value={op.solicitud_ventana} />
      </td>
      <td className="px-3 py-2 text-center">
        {cfg ? (
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} shrink-0`} />
            {op.estado_operacion}
          </span>
        ) : <span className="text-brand-blue/30 text-xs">—</span>}
      </td>
      <td className="px-3 py-2 text-center">
        {op.tipo_reserva_transporte === "asli" ? (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-brand-blue/10 text-brand-blue border border-brand-blue/20">
            ASLI
          </span>
        ) : op.tipo_reserva_transporte === "externa" ? (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-200">
            {typeExternal}
          </span>
        ) : (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-transparent text-brand-blue/40 border border-dashed border-brand-blue/20">
            {typePendiente}
          </span>
        )}
      </td>
      <td className="px-2 py-2 text-center">
        <div className="flex items-center justify-center">
          <button type="button" onClick={() => onCopy(op)} className="p-1.5 text-brand-blue/35 hover:text-brand-blue hover:bg-brand-blue/8 rounded-md" title={copyShort}>
            <IcoCopy size={15} />
          </button>
          <button type="button" onClick={() => onEmail(op)} className="p-1.5 text-brand-blue/35 hover:text-brand-blue hover:bg-brand-blue/8 rounded-md" title={emailTitle}>
            <IcoMail size={15} />
          </button>
        </div>
      </td>
    </tr>
  );
});

// ─── EmailModal ───────────────────────────────────────────────────────────────

function EmailModal({ op, onClose }: { op: Operacion; onClose: () => void }) {
  const { t } = useLocale();
  const tr = t.misReservas;
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { subject } = buildEmailContent(op);
  const body = buildReservaBody(op);

  const handleEnviar = async () => {
    setSending(true);
    setError(null);
    const result = await sendEmail({ to: "roodericus7@gmail.com", subject, body });
    setSending(false);
    if (result.success) {
      setSent(true);
    } else {
      setError(result.error ?? "Error al enviar.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
      <div className="bg-white rounded-2xl shadow-mac-modal border border-neutral-200 p-6 w-full max-w-sm mx-4 animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${sent ? "bg-emerald-100 border border-emerald-200" : "bg-brand-blue/10 border border-brand-blue/20"}`}>
            <Icon icon={sent ? "lucide:check-circle" : "lucide:mail"} width={20} height={20} className={sent ? "text-emerald-600" : "text-brand-blue"} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-900">{sent ? tr.emailSentTitle : tr.emailSendTitle}</h3>
            <p className="text-xs text-neutral-500">{displayRefAsli(op.ref_asli, op.correlativo)} · {op.cliente ?? ""}</p>
          </div>
        </div>

        {error && <div className="mb-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">{error}</div>}

        {sent ? (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-2">
            <Icon icon="lucide:send" width={14} height={14} className="shrink-0" />
            Correo enviado a <strong>roodericus7@gmail.com</strong> desde tu cuenta.
          </div>
        ) : (
          <div className="mb-4 space-y-2">
            <p className="text-xs text-neutral-600">El correo se enviará desde tu cuenta <strong>@asli.cl</strong> a <strong>roodericus7@gmail.com</strong>.</p>
            <div className="px-3 py-2 rounded-lg bg-neutral-50 border border-neutral-200">
              <p className="text-[10px] text-neutral-400 uppercase font-semibold mb-1">{tr.emailSubject}</p>
              <p className="text-xs text-neutral-700 font-medium leading-snug line-clamp-2">{subject}</p>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button type="button" onClick={onClose} disabled={sending}
            className="flex-1 px-4 py-2.5 text-xs font-semibold text-neutral-600 bg-neutral-100 border border-neutral-200 rounded-xl hover:bg-neutral-200 transition-colors disabled:opacity-60">
            {sent ? tr.close : tr.cancel}
          </button>
          {!sent && (
          <button type="button" onClick={() => void handleEnviar()} disabled={sending}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-blue text-white rounded-xl hover:bg-brand-blue/90 transition-colors font-semibold text-xs shadow-md shadow-brand-blue/20 disabled:opacity-60">
            {sending
              ? <><Icon icon="typcn:refresh" width={14} height={14} className="animate-spin" />{tr.sending}</>
              : <><Icon icon="lucide:send" width={14} height={14} />{tr.sendFromAccount}</>
            }
          </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── BookingModal ─────────────────────────────────────────────────────────────

type BookingModalProps = {
  op: Operacion;
  supabase: ReturnType<typeof createClient> | null;
  onClose: () => void;
  onSaved: (updated: { booking: string | null; booking_doc_url: string | null }) => void;
};

function BookingModal({ op, supabase, onClose, onSaved }: BookingModalProps) {
  const { t } = useLocale();
  const tr = t.misReservas;
  const [bookingInput, setBookingInput] = useState(op.booking ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!supabase) return;
    setUploading(true);
    setError(null);

    let docUrl = op.booking_doc_url ?? null;

    if (file) {
      const ext = file.name.split(".").pop() ?? "pdf";
      const path = `${op.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("booking-docs")
        .upload(path, file, { upsert: true });

      if (uploadError) {
        setError(`Error al subir el archivo: ${uploadError.message}`);
        setUploading(false);
        return;
      }

      const { data: urlData } = supabase.storage.from("booking-docs").getPublicUrl(path);
      docUrl = urlData.publicUrl;
    }

    const { error: updateError } = await supabase
      .from("operaciones")
      .update({ booking: bookingInput.trim() || null, booking_doc_url: docUrl })
      .eq("id", op.id);

    if (updateError) {
      setError(updateError.message);
      setUploading(false);
      return;
    }

    onSaved({ booking: bookingInput.trim() || null, booking_doc_url: docUrl });
    setUploading(false);
    onClose();
  };

  const hasDoc = !!op.booking_doc_url;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4">
      <div className="bg-white rounded-2xl shadow-mac-modal border border-neutral-200 w-full max-w-sm animate-fade-in overflow-hidden">
        <div className="h-[3px] bg-gradient-to-r from-amber-400 to-amber-500" />
        <div className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
              <Icon icon="lucide:bookmark-check" width={20} height={20} className="text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">{tr.confirmBookingModal}</h3>
              <p className="text-xs text-neutral-500">{displayRefAsli(op.ref_asli, op.correlativo)} · {op.cliente ?? ""}</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">{error}</div>
          )}

          {/* Número de booking */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1.5">
              {tr.bookingNumberLabel}
            </label>
            <input
              type="text"
              value={bookingInput}
              onChange={(e) => setBookingInput(e.target.value)}
              placeholder="Ej: ABC123456"
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 bg-neutral-50 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 focus:bg-white transition-all"
            />
          </div>

          {/* Documento */}
          <div className="mb-5">
            <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1.5">
              {tr.bookingDocFieldLabel}
            </label>

            {hasDoc && !file && (
              <div className="flex items-center gap-2 mb-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                <Icon icon="lucide:paperclip" width={14} height={14} className="text-emerald-600 shrink-0" />
                <span className="text-xs text-emerald-700 font-medium flex-1 truncate">{tr.docAttached}</span>
                <a
                  href={op.booking_doc_url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-emerald-600 hover:underline font-semibold shrink-0"
                >
                  {tr.view}
                </a>
              </div>
            )}

            <label className="flex items-center gap-2 cursor-pointer group">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                file
                  ? "border-amber-300 bg-amber-50 text-amber-700"
                  : "border-neutral-200 bg-neutral-50 text-neutral-600 hover:border-neutral-300 hover:bg-neutral-100"
              }`}>
                <Icon icon={file ? "lucide:file-check" : "lucide:upload"} width={14} height={14} />
                {file ? file.name : (hasDoc ? tr.replaceDoc : tr.uploadDoc)}
              </div>
              <input
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {file && (
              <button
                type="button"
                onClick={() => setFile(null)}
                className="mt-1.5 text-xs text-neutral-400 hover:text-red-500 transition-colors"
              >
                {tr.removeFile}
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="flex-1 px-4 py-2.5 text-xs font-semibold text-neutral-600 bg-neutral-100 border border-neutral-200 rounded-xl hover:bg-neutral-200 transition-colors disabled:opacity-60"
            >
              {tr.cancel}
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={uploading || (!bookingInput.trim() && !file)}
              className="flex-1 px-4 py-2.5 text-xs font-semibold bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5"
            >
              {uploading ? (
                <><Icon icon="typcn:refresh" width={14} height={14} className="animate-spin" />{tr.saving}</>
              ) : (
                <><Icon icon="lucide:save" width={14} height={14} />{tr.save}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MisReservasContent ───────────────────────────────────────────────────────

export function MisReservasContent() {
  const { t } = useLocale();
  const { isCliente, isEjecutivo, isStaff, empresaNombres, isLoading: authLoading, user, profile } = useAuth();
  const canInlineEdit = isEjecutivo || isStaff;
  const tr = t.misReservas;

  const [operaciones, setOperaciones] = useState<Operacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<string>("");
  const [clienteFilter, setClienteFilter] = useState<string>("");
  const [navieraFilter, setNavieraFilter] = useState<string>("");
  const [especieFilter, setEspecieFilter] = useState<string>("");
  const [podFilter, setPodFilter] = useState<string>("");
  const [naveFilter, setNaveFilter] = useState<string>("");
  const [etdDesde, setEtdDesde] = useState<string>("");
  const [etdHasta, setEtdHasta] = useState<string>("");
  const [transporteFilter, setTransporteFilter] = useState<string>(""); // "" | "enviado" | "sin_enviar"
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState(false);
  const [showTransportModal, setShowTransportModal] = useState(false);
  const [successTransport, setSuccessTransport] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField | null>("ref_asli");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    typeof window !== "undefined" && window.innerWidth >= 768 ? "table" : "cards"
  );
  const [emailModal, setEmailModal] = useState<Operacion | null>(null);
  const [bookingModal, setBookingModal] = useState<Operacion | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{
    x: number;
    y: number;
    operacionId: string;
    refLabel: string;
  } | null>(null);
  const deferredSearch = useDeferredValue(searchTerm);

  const supabase = useMemo(() => {
    try { return createClient(); } catch { return null; }
  }, []);

  const fetchOperaciones = useCallback(async () => {
    if (!supabase || authLoading) return;
    setLoading(true);

    const scope = { isCliente, isEjecutivo, empresaNombres };
    if (shouldSkipOperacionesForCliente(scope)) {
      setOperaciones([]);
      setLoading(false);
      return;
    }

    let q = supabase
      .from("operaciones")
      .select(
        `id, correlativo, ref_asli, referencia_externa, cliente, especie, naviera, nave, pol, pod, etd, eta, tt, booking,
         booking_doc_url, enviado_transporte, tipo_reserva_transporte, estado_operacion, solicitud_ventana, created_at, consignatario, tipo_unidad, pallets, peso_neto,
         temperatura, ventilacion, deposito, planta_presentacion, citacion, inicio_stacking, fin_stacking`
      )
      .is("deleted_at", null);

    q = applyOperacionesClienteFilter(q, scope);
    const { data, error } = await q.order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading operaciones:", error);
    } else {
      setOperaciones((data ?? []) as Operacion[]);
    }
    setLoading(false);
  }, [supabase, authLoading, isCliente, isEjecutivo, empresaNombres]);

  useEffect(() => {
    if (!authLoading) void fetchOperaciones();
    else setOperaciones([]);
  }, [authLoading, fetchOperaciones]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getFilteredData = useCallback(
    (excludeFilter?: "estado" | "cliente" | "naviera" | "especie" | "pod" | "nave") => {
      let result = operaciones;
      if (deferredSearch.trim()) {
        const search = deferredSearch.toLowerCase();
        result = result.filter(
          (op) =>
            op.cliente?.toLowerCase().includes(search) ||
            op.booking?.toLowerCase().includes(search) ||
            op.naviera?.toLowerCase().includes(search) ||
            op.nave?.toLowerCase().includes(search) ||
            op.ref_asli?.toLowerCase().includes(search) ||
            formatRefAsli(op.ref_asli, op.correlativo)?.toLowerCase().includes(search) ||
            op.referencia_externa?.toLowerCase().includes(search) ||
            op.especie?.toLowerCase().includes(search) ||
            op.pod?.toLowerCase().includes(search) ||
            op.pol?.toLowerCase().includes(search)
        );
      }
      if (estadoFilter && excludeFilter !== "estado") result = result.filter((op) => op.estado_operacion === estadoFilter);
      if (clienteFilter && excludeFilter !== "cliente") result = result.filter((op) => op.cliente === clienteFilter);
      if (navieraFilter && excludeFilter !== "naviera") result = result.filter((op) => op.naviera === navieraFilter);
      if (especieFilter && excludeFilter !== "especie") result = result.filter((op) => op.especie === especieFilter);
      if (podFilter && excludeFilter !== "pod") result = result.filter((op) => op.pod === podFilter);
      if (naveFilter && excludeFilter !== "nave") result = result.filter((op) => op.nave === naveFilter);
      if (etdDesde) result = result.filter((op) => op.etd && op.etd >= etdDesde);
      if (etdHasta) result = result.filter((op) => op.etd && op.etd <= etdHasta);
      if (transporteFilter === "enviado") result = result.filter((op) => op.enviado_transporte);
      if (transporteFilter === "sin_enviar") result = result.filter((op) => !op.enviado_transporte);
      return result;
    },
    [operaciones, deferredSearch, estadoFilter, clienteFilter, navieraFilter, especieFilter, podFilter, naveFilter, etdDesde, etdHasta, transporteFilter]
  );

  const filteredOperaciones = useMemo(() => {
    let result = getFilteredData();
    if (sortField) {
      result = [...result].sort((a, b) => {
        let aVal = a[sortField];
        let bVal = b[sortField];
        if (aVal === null || aVal === undefined) aVal = "";
        if (bVal === null || bVal === undefined) bVal = "";
        if (sortField === "tt") {
          const aNum = Number(aVal) || 0;
          const bNum = Number(bVal) || 0;
          return sortDirection === "asc" ? aNum - bNum : bNum - aNum;
        }
        if (sortField === "etd" || sortField === "eta") {
          const aDate = aVal ? new Date(aVal as string).getTime() : 0;
          const bDate = bVal ? new Date(bVal as string).getTime() : 0;
          return sortDirection === "asc" ? aDate - bDate : bDate - aDate;
        }
        const cmp = String(aVal).toLowerCase().localeCompare(String(bVal).toLowerCase());
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [getFilteredData, sortField, sortDirection]);

  const estados = useMemo(() => Array.from(new Set(getFilteredData("estado").map((op) => op.estado_operacion).filter(Boolean))).sort(), [getFilteredData]);
  const clientes = useMemo(() => Array.from(new Set(getFilteredData("cliente").map((op) => op.cliente).filter(Boolean))).sort() as string[], [getFilteredData]);
  const navieras = useMemo(() => Array.from(new Set(getFilteredData("naviera").map((op) => op.naviera).filter(Boolean))).sort() as string[], [getFilteredData]);
  const especies = useMemo(() => Array.from(new Set(getFilteredData("especie").map((op) => op.especie).filter(Boolean))).sort() as string[], [getFilteredData]);
  const pods     = useMemo(() => Array.from(new Set(getFilteredData("pod").map((op) => op.pod).filter(Boolean))).sort() as string[], [getFilteredData]);
  const naves    = useMemo(() => Array.from(new Set(getFilteredData("nave").map((op) => op.nave).filter(Boolean))).sort() as string[], [getFilteredData]);

  const activeFiltersCount = useMemo(() =>
    [estadoFilter, clienteFilter, navieraFilter, especieFilter, podFilter, naveFilter, etdDesde, etdHasta, transporteFilter].filter(Boolean).length,
    [estadoFilter, clienteFilter, navieraFilter, especieFilter, podFilter, naveFilter, etdDesde, etdHasta, transporteFilter]
  );

  const clearAllFilters = () => {
    setSearchTerm(""); setEstadoFilter(""); setClienteFilter(""); setNavieraFilter(""); setEspecieFilter("");
    setPodFilter(""); setNaveFilter(""); setEtdDesde(""); setEtdHasta(""); setTransporteFilter("");
  };
  const handleSelectAll = useCallback(() => {
    setSelectedIds((prev) =>
      prev.size === filteredOperaciones.length ? new Set() : new Set(filteredOperaciones.map((op) => op.id))
    );
  }, [filteredOperaciones]);
  const handleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleCopy = useCallback(async (op: Operacion) => {
    const ok = await copyToClipboard(op);
    if (ok) sileo.success({ title: tr.copiedSuccess });
  }, [tr.copiedSuccess]);

  const handleOpenEmail = useCallback((op: Operacion) => setEmailModal(op), []);
  const handleOpenBooking = useCallback((op: Operacion) => setBookingModal(op), []);

  const handleOpenContextMenu = useCallback((event: MouseEvent, op: Operacion) => {
    event.preventDefault();
    event.stopPropagation();
    setCtxMenu({
      x: event.clientX,
      y: event.clientY,
      operacionId: op.id,
      refLabel: formatRefAsli(op.ref_asli, op.correlativo) ?? "—",
    });
  }, []);

  const handleInlineSave = useCallback(async (op: Operacion, field: InlineEditableField, next: string) => {
    if (!supabase || !canInlineEdit) return false;
    const trimmed = next.trim();
    if (!trimmed) return false;
    if (!isBlank(op[field])) return false;

    const previous = op[field] ?? null;
    const { error } = await supabase.from("operaciones").update({ [field]: trimmed }).eq("id", op.id);
    if (error) {
      sileo.error({ title: error.message || "No se pudo guardar el campo" });
      return false;
    }

    const { error: auditError } = await supabase.from("operaciones_cambios").insert({
      operacion_id: op.id,
      campo: field,
      valor_anterior: previous,
      valor_nuevo: trimmed,
      usuario_auth_id: user?.id ?? null,
      usuario_nombre: profile?.nombre ?? user?.name ?? null,
      usuario_email: profile?.email ?? user?.email ?? null,
    });
    if (auditError) {
      console.error("Auditoría operaciones_cambios:", auditError.message);
    }

    setOperaciones((prev) =>
      prev.map((row) => (row.id === op.id ? { ...row, [field]: trimmed } : row))
    );
    sileo.success({ title: tr.inlineSaved });
    return true;
  }, [supabase, canInlineEdit, user, profile, tr.inlineSaved]);

  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const t = window.setTimeout(() => {
      window.addEventListener("click", close);
      window.addEventListener("contextmenu", close);
      window.addEventListener("scroll", close, true);
      window.addEventListener("keydown", onKey);
    }, 0);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("click", close);
      window.removeEventListener("contextmenu", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [ctxMenu]);

  const handleMoveToTrash = useCallback(async (ids: string[]) => {
    if (!supabase || ids.length === 0) return;
    setActionLoading(true);
    const { error } = await supabase.from("operaciones").update({ deleted_at: new Date().toISOString() }).in("id", ids);
    if (error) sileo.error({ title: tr.errorMovingToTrash });
    else { setSelectedIds(new Set()); await fetchOperaciones(); }
    setActionLoading(false);
  }, [supabase, tr.errorMovingToTrash, fetchOperaciones]);

  const handleCtxViewDocuments = useCallback(() => {
    if (!ctxMenu) return;
    const url = `${withBase("/documentos/mis-documentos")}?op=${encodeURIComponent(ctxMenu.operacionId)}`;
    setCtxMenu(null);
    window.location.assign(url);
  }, [ctxMenu]);

  const handleCtxMoveToTrash = useCallback(() => {
    if (!ctxMenu) return;
    const id = ctxMenu.operacionId;
    setCtxMenu(null);
    void handleMoveToTrash([id]);
  }, [ctxMenu, handleMoveToTrash]);

  const getSelectedOps = useCallback(() => operaciones.filter((op) => selectedIds.has(op.id)), [operaciones, selectedIds]);

  const handleSendToAsli = useCallback(async () => {
    const selected = getSelectedOps();
    if (!selected.length || !supabase) return;
    setShowTransportModal(false);
    setActionLoading(true);

    const alreadySent = selected.filter((op) => op.tipo_reserva_transporte);
    const toSend = selected.filter((op) => !op.tipo_reserva_transporte);

    if (toSend.length > 0) {
      const { error } = await supabase.from("operaciones").update({ enviado_transporte: true, tipo_reserva_transporte: "asli" }).in("id", toSend.map((op) => op.id));
      if (error) { setActionLoading(false); sileo.error({ title: error.message }); return; }
    }

    setActionLoading(false);
    setSelectedIds(new Set());

    const msgs: string[] = [];
    if (toSend.length > 0) msgs.push(`${toSend.length} enviada${toSend.length > 1 ? "s" : ""} a Reserva ASLI`);
    if (alreadySent.length > 0) {
      const asli = alreadySent.filter((op) => op.tipo_reserva_transporte === "asli").length;
      const ext = alreadySent.filter((op) => op.tipo_reserva_transporte === "externa").length;
      if (asli > 0) msgs.push(`${asli} ya estaba${asli > 1 ? "n" : ""} en ASLI`);
      if (ext > 0) msgs.push(`${ext} ya estaba${ext > 1 ? "n" : ""} en Externa`);
    }
    setSuccessTransport(msgs.join(". "));

    setOperaciones((prev) => prev.map((op) =>
      toSend.some((s) => s.id === op.id) ? { ...op, enviado_transporte: true, tipo_reserva_transporte: "asli" } : op
    ));
  }, [supabase, getSelectedOps]);

  const handleSendToExterna = useCallback(async () => {
    const selected = getSelectedOps();
    if (!selected.length || !supabase) return;
    setShowTransportModal(false);
    setActionLoading(true);

    const alreadySent = selected.filter((op) => op.tipo_reserva_transporte);
    const toSend = selected.filter((op) => !op.tipo_reserva_transporte);

    if (toSend.length > 0) {
      const { error: updateError } = await supabase.from("operaciones").update({ enviado_transporte: true, tipo_reserva_transporte: "externa" }).in("id", toSend.map((op) => op.id));
      if (updateError) { setActionLoading(false); sileo.error({ title: updateError.message }); return; }

      const rows = toSend.map((op) => ({ cliente: op.cliente || null, booking: op.booking || null, naviera: op.naviera || null, nave: op.nave || null, pod: op.pod || null, etd: op.etd || null }));
      const { error: insertError } = await supabase.from("transportes_reservas_ext").insert(rows);
      if (insertError) { setActionLoading(false); sileo.error({ title: insertError.message }); return; }
    }

    setActionLoading(false);
    setSelectedIds(new Set());

    const msgs: string[] = [];
    if (toSend.length > 0) msgs.push(`${toSend.length} enviada${toSend.length > 1 ? "s" : ""} a Reserva Externa`);
    if (alreadySent.length > 0) {
      const asli = alreadySent.filter((op) => op.tipo_reserva_transporte === "asli").length;
      const ext = alreadySent.filter((op) => op.tipo_reserva_transporte === "externa").length;
      if (asli > 0) msgs.push(`${asli} ya estaba${asli > 1 ? "n" : ""} en ASLI`);
      if (ext > 0) msgs.push(`${ext} ya estaba${ext > 1 ? "n" : ""} en Externa`);
    }
    setSuccessTransport(msgs.join(". "));

    setOperaciones((prev) => prev.map((op) =>
      toSend.some((s) => s.id === op.id) ? { ...op, enviado_transporte: true, tipo_reserva_transporte: "externa" } : op
    ));
  }, [supabase, getSelectedOps]);

  const handleBookingSaved = (opId: string, updated: { booking: string | null; booking_doc_url: string | null }) => {
    setOperaciones((prev) => prev.map((op) => op.id === opId ? { ...op, ...updated } : op));
    setBookingModal(null);
    sileo.success({ title: tr.bookingSavedMsg });
  };

  if (loading) {
    return (
      <main className="flex-1 min-h-0 overflow-hidden flex flex-col bg-[#D9E3F2]" role="main">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2.5 px-5 py-3.5 bg-[#F4F8FC] rounded-lg border border-brand-blue/15 shadow-mac-modal text-brand-blue text-base font-medium">
            <Icon icon="typcn:refresh" className="w-4 h-4 animate-spin text-brand-blue" />
            <span>{tr.loading}</span>
          </div>
        </div>
      </main>
    );
  }

  if ((isCliente || isEjecutivo) && empresaNombres.length === 0) {
    return (
      <main className="flex-1 min-h-0 overflow-hidden flex flex-col bg-[#D9E3F2]" role="main">
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-md text-center px-6 py-8 bg-[#F4F8FC] rounded-xl border border-brand-blue/15 shadow-mac-modal">
            <Icon icon="lucide:building-2" className="mx-auto mb-3 text-brand-blue/50" width={40} height={40} />
            <p className="text-brand-blue font-semibold text-lg mb-2">Sin empresa asignada</p>
            <p className="text-brand-blue/70 text-sm">
              {isEjecutivo
                ? "Aún no tienes clientes asignados. Un administrador debe asignártelos en Configuración → Asignar ejecutivos a clientes."
                : "Tu usuario cliente aún no tiene una empresa vinculada. Un administrador debe asignarte en Configuración → Asignar clientes-empresas."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  const exportCols: { key: keyof Operacion; label: string }[] = [
    { key: "ref_asli",        label: "Ref. ASLI" },
    { key: "referencia_externa", label: "Ref. Externa" },
    { key: "booking",         label: "Booking" },
    { key: "cliente",         label: "Cliente" },
    { key: "especie",         label: "Especie" },
    { key: "naviera",         label: "Naviera" },
    { key: "nave",            label: "Nave" },
    { key: "pol",             label: "POL" },
    { key: "pod",             label: "POD" },
    { key: "etd",             label: "ETD" },
    { key: "eta",             label: "ETA" },
    { key: "tt",              label: "TT (días)" },
    { key: "solicitud_ventana", label: "Tipo de operación" },
    { key: "estado_operacion",label: "Estado" },
  ];

  const exportRows = filteredOperaciones.map((op) =>
    exportCols.map(({ key }) => {
      if (key === "ref_asli") return displayRefAsli(op.ref_asli, op.correlativo, "");
      if (key === "solicitud_ventana") return ventanaLabel(op.solicitud_ventana);
      const v = op[key];
      if (key === "etd" || key === "eta") return fmtDate(v as string | null);
      return v ?? "";
    })
  );

  const handleExportExcel = async () => {
    type ExcelJsCtor = typeof import("exceljs");
    const raw = (await import("exceljs")) as ExcelJsCtor & { default?: ExcelJsCtor };
    const d = raw.default;
    const ExcelJS =
      d && typeof (d as { Workbook?: unknown }).Workbook === "function"
        ? d
        : raw;

    const headers = exportCols.map((c) => c.label);
    const nCols = headers.length;
    const blue = "FF1D4ED8";
    const white = "FFFFFFFF";
    const graySub = "FF888888";
    const body = "FF1E293B";
    const zebra = "FFF5F5F5";
    const border = "FFE2E8F0";

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Reservas", { views: [{ showGridLines: true }] });

    ws.mergeCells(1, 1, 1, nCols);
    const title = ws.getCell(1, 1);
    title.value = "MIS RESERVAS";
    title.font = { bold: true, size: 13, color: { argb: white } };
    title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: blue } };
    title.alignment = { vertical: "middle", horizontal: "left", wrapText: false };
    ws.getRow(1).height = 22;

    ws.mergeCells(2, 1, 2, nCols);
    const sub = ws.getCell(2, 1);
    sub.value = `Exportado: ${new Date().toLocaleDateString("es-CL")}   |   ${filteredOperaciones.length} registros`;
    sub.font = { size: 8, color: { argb: graySub } };
    sub.alignment = { vertical: "middle", horizontal: "left", wrapText: false };
    ws.getRow(2).height = 16;

    const headerRowIndex = 3;
    const hr = ws.getRow(headerRowIndex);
    hr.height = 18;
    headers.forEach((h, i) => {
      const cell = hr.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true, size: 9, color: { argb: white } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: blue } };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: false };
    });

    exportRows.forEach((row, ri) => {
      const r = ws.getRow(headerRowIndex + 1 + ri);
      r.height = 16;
      const z = ri % 2 === 1;
      row.forEach((val, ci) => {
        const cell = r.getCell(ci + 1);
        cell.value = String(val ?? "");
        cell.font = { size: 9, color: { argb: body } };
        cell.alignment = { vertical: "middle", wrapText: false };
        if (z) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: zebra } };
        }
        cell.border = {
          top: { style: "thin", color: { argb: border } },
          bottom: { style: "thin", color: { argb: border } },
          left: { style: "thin", color: { argb: border } },
          right: { style: "thin", color: { argb: border } },
        };
      });
    });

    headers.forEach((_, i) => {
      const w = i === 2 ? 22 : i === 4 || i === 5 ? 18 : 12;
      ws.getColumn(i + 1).width = w;
    });

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `MisReservas_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
    const blue: [number, number, number] = [29, 78, 216];

    doc.setFillColor(...blue);
    doc.rect(0, 0, 297, 18, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("MIS RESERVAS", 14, 12);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`${filteredOperaciones.length} registros  ·  ${new Date().toLocaleDateString("es-CL")}`, 283, 12, { align: "right" });

    autoTable(doc, {
      startY: 22,
      head: [exportCols.map((c) => c.label)],
      body: exportRows,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: blue, textColor: [255, 255, 255] as [number,number,number], fontStyle: "bold", fontSize: 7 },
      alternateRowStyles: { fillColor: [245, 245, 245] as [number,number,number] },
      margin: { left: 14, right: 14 },
      theme: "grid",
    });

    const pageH = doc.internal.pageSize.getHeight();
    doc.setFontSize(6);
    doc.setTextColor(150, 150, 150);
    doc.text("Asesorías y Servicios Logísticos Integrales Ltda.", 14, pageH - 5);
    doc.save(`MisReservas_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <main className="relative flex-1 min-h-0 overflow-hidden flex flex-col bg-[#D9E3F2]" role="main">

      {/* ── Hero ── */}
      <div className="flex-shrink-0 bg-gradient-to-r from-brand-blue via-[#0d1c42] to-brand-dark-teal text-white px-4 sm:px-5 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => goBackOr(withBase("/inicio"))}
              title={tr.btnBack}
              aria-label={tr.btnBack}
              className="inline-flex items-center gap-1.5 shrink-0 px-2.5 sm:px-3 h-9 rounded-lg border border-white/25 bg-white/15 text-white text-sm font-semibold hover:bg-white/25 transition-colors"
            >
              <Icon icon="lucide:arrow-left" width={18} height={18} className="shrink-0" />
              <span className="hidden sm:inline">{tr.btnBack}</span>
            </button>
            <div className="w-9 h-9 rounded-lg bg-white/12 border border-white/20 flex items-center justify-center shrink-0">
              <Icon icon="typcn:clipboard" width={18} height={18} className="text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold leading-tight tracking-tight">{t.sidebar.misReservas}</h1>
              <p className="text-xs text-white/65 mt-0.5">
                <span className="font-semibold text-white tabular-nums">{filteredOperaciones.length}</span>
                {filteredOperaciones.length !== operaciones.length
                  ? <span className="text-white/45"> / {operaciones.length}</span>
                  : null
                } {tr.records}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center bg-white/12 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                title={tr.viewCards}
                className={`px-2.5 py-1.5 rounded-md transition-all ${viewMode === "cards" ? "bg-white text-brand-blue shadow-sm" : "text-white/75 hover:text-white"}`}
              >
                <Icon icon="lucide:layout-grid" width={14} height={14} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                title={tr.viewTable}
                className={`px-2.5 py-1.5 rounded-md transition-all ${viewMode === "table" ? "bg-white text-brand-blue shadow-sm" : "text-white/75 hover:text-white"}`}
              >
                <Icon icon="lucide:list" width={14} height={14} />
              </button>
            </div>
            <a
              href={withBase("/reservas/papelera")}
              className="p-2 bg-white/12 border border-white/15 rounded-lg hover:bg-white/20 transition-colors text-white/70 hover:text-white"
              title="Papelera"
            >
              <Icon icon="lucide:trash-2" width={14} height={14} />
            </a>
            <a
              href={withBase("/reservas/crear")}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-white text-brand-blue hover:bg-white/90 transition-colors"
            >
              <Icon icon="lucide:plus" width={13} height={13} />
              <span className="hidden sm:inline">{tr.newBooking}</span>
              <span className="sm:hidden">{tr.newMobile}</span>
            </a>
          </div>
        </div>
      </div>

      {/* ── Barra de búsqueda y filtros ── */}
      <div className="flex-shrink-0 bg-[#E8F0FA]/95 border-b border-brand-blue/15 backdrop-blur-md">
        <div className="px-3 sm:px-4 py-2 flex items-center gap-1.5">
          <div className="flex-1 min-w-0 relative">
            <Icon icon="lucide:search" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-brand-blue/35 w-3.5 h-3.5 pointer-events-none" />
            <input
              type="text"
              placeholder={tr.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-8 py-2 border border-brand-blue/20 bg-white rounded-lg text-sm text-brand-blue placeholder:text-brand-blue/35 focus:outline-none focus:ring-2 focus:ring-brand-blue/25 focus:border-brand-blue transition-all"
            />
            {searchTerm && (
              <button type="button" onClick={() => setSearchTerm("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-brand-blue/35 hover:text-brand-blue transition-colors">
                <Icon icon="lucide:x" width={13} height={13} />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-2 border rounded-lg text-sm font-semibold transition-colors shrink-0 ${
              showFilters || activeFiltersCount > 0
                ? "border-brand-blue bg-brand-blue/8 text-brand-blue"
                : "border-brand-blue/20 bg-white hover:bg-[#F4F8FC] text-brand-blue/70"
            }`}
          >
            <Icon icon="lucide:sliders-horizontal" width={13} height={13} />
            <span className="hidden sm:inline">{tr.filters}</span>
            {activeFiltersCount > 0 && (
              <span className="min-w-4 h-4 px-1 text-[10px] font-bold bg-brand-blue text-white rounded-full flex items-center justify-center">{activeFiltersCount}</span>
            )}
          </button>
          <button
            onClick={() => void handleExportExcel()}
            disabled={filteredOperaciones.length === 0}
            className="inline-flex items-center gap-1 px-2.5 py-2 border border-brand-blue/20 bg-white hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 rounded-lg text-sm font-semibold text-brand-blue/70 transition-colors shrink-0 disabled:opacity-40"
            title="Exportar a Excel"
          >
            <Icon icon="lucide:table-2" width={13} height={13} />
            <span className="hidden sm:inline">Excel</span>
          </button>
          <button
            onClick={handleExportPDF}
            disabled={filteredOperaciones.length === 0}
            className="inline-flex items-center gap-1 px-2.5 py-2 border border-brand-blue/20 bg-white hover:bg-red-50 hover:border-red-300 hover:text-red-700 rounded-lg text-sm font-semibold text-brand-blue/70 transition-colors shrink-0 disabled:opacity-40"
            title="Exportar a PDF"
          >
            <Icon icon="lucide:file-text" width={13} height={13} />
            <span className="hidden sm:inline">PDF</span>
          </button>
          <button
            onClick={fetchOperaciones}
            className="p-2 text-brand-blue/55 hover:text-brand-blue hover:bg-white rounded-lg transition-colors shrink-0"
            title={tr.refresh}
          >
            <Icon icon="lucide:refresh-cw" width={14} height={14} />
          </button>
        </div>

        {/* Barra de selección */}
        {!isCliente && selectedIds.size > 0 && (
          <div className="px-3 sm:px-4 py-2 border-t border-brand-blue/10 flex items-center gap-2 bg-brand-blue/5">
            <span className="text-sm font-semibold text-brand-blue flex-1">{selectedIds.size} seleccionada{selectedIds.size !== 1 ? "s" : ""}</span>
            <button
              onClick={() => setShowTransportModal(true)}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              <Icon icon="lucide:truck" width={12} height={12} />
              <span className="hidden sm:inline">{tr.sendToTransports}</span>
              <span className="sm:hidden">{tr.transportShort}</span>
            </button>
            <button
              onClick={() => handleMoveToTrash(Array.from(selectedIds))}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              <Icon icon="lucide:trash-2" width={12} height={12} />
              <span className="hidden sm:inline">{tr.delete}</span>
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors">
              <Icon icon="lucide:x" width={13} height={13} />
            </button>
          </div>
        )}

        {/* Panel de filtros */}
        {showFilters && (
          <div className="px-3 sm:px-4 py-2.5 border-t border-brand-blue/10 bg-[#DCE6F4]/80 space-y-2">
            {/* Fila 1: Estado, Cliente, Naviera, Especie, Nave */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              <div>
                <label className={FILTER_LABEL}>{tr.colStatus}</label>
                <select value={estadoFilter} onChange={(e) => setEstadoFilter(e.target.value)} className={FILTER_FIELD}>
                  <option value="">{tr.allStates}</option>
                  {estados.map((e) => <option key={e} value={e!}>{e}</option>)}
                </select>
              </div>
              <div className={isCliente ? "hidden" : ""}>
                <label className={FILTER_LABEL}>{tr.colClient}</label>
                <select value={clienteFilter} onChange={(e) => setClienteFilter(e.target.value)} className={FILTER_FIELD}>
                  <option value="">{tr.allClients}</option>
                  {clientes.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={FILTER_LABEL}>{tr.colCarrier}</label>
                <select value={navieraFilter} onChange={(e) => setNavieraFilter(e.target.value)} className={FILTER_FIELD}>
                  <option value="">{tr.allCarriers}</option>
                  {navieras.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className={FILTER_LABEL}>{tr.colSpecies}</label>
                <select value={especieFilter} onChange={(e) => setEspecieFilter(e.target.value)} className={FILTER_FIELD}>
                  <option value="">{tr.allSpecies}</option>
                  {especies.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label className={FILTER_LABEL}>{tr.colVessel}</label>
                <select value={naveFilter} onChange={(e) => setNaveFilter(e.target.value)} className={FILTER_FIELD}>
                  <option value="">Todas</option>
                  {naves.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
            {/* Fila 2: POD, ETD desde, ETD hasta, Transporte */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className={FILTER_LABEL}>{tr.colPOD}</label>
                <select value={podFilter} onChange={(e) => setPodFilter(e.target.value)} className={FILTER_FIELD}>
                  <option value="">Todos</option>
                  {pods.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className={FILTER_LABEL}>ETD Desde</label>
                <input type="date" value={etdDesde} onChange={(e) => setEtdDesde(e.target.value)} className={FILTER_FIELD} />
              </div>
              <div>
                <label className={FILTER_LABEL}>ETD Hasta</label>
                <input type="date" value={etdHasta} onChange={(e) => setEtdHasta(e.target.value)} className={FILTER_FIELD} />
              </div>
              <div>
                <label className={FILTER_LABEL}>Transporte</label>
                <select value={transporteFilter} onChange={(e) => setTransporteFilter(e.target.value)} className={FILTER_FIELD}>
                  <option value="">Todos</option>
                  <option value="enviado">Enviado a transporte</option>
                  <option value="sin_enviar">Sin enviar</option>
                </select>
              </div>
            </div>
            {activeFiltersCount > 0 && (
              <button onClick={clearAllFilters} className="text-xs text-brand-blue hover:underline font-semibold">
                {tr.clearAllFilters}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Área de contenido ── */}
      <div className="flex-1 min-h-0 overflow-auto p-2 sm:p-3">

        {/* Vista Tabla */}
        {viewMode === "table" && (
          <div className="bg-white rounded-xl border border-brand-blue/12 overflow-hidden flex flex-col h-full min-h-0 shadow-sm" style={{ minHeight: 300 }}>
            <div className="overflow-auto flex-1 min-h-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#E8EEF7]">
                    {!isCliente && (
                      <th className="sticky top-0 z-20 bg-[#E8EEF7] px-3 py-2.5 w-10 border-b border-brand-blue/15">
                        <input type="checkbox" checked={selectedIds.size === filteredOperaciones.length && filteredOperaciones.length > 0} onChange={handleSelectAll} className="w-4 h-4 rounded border-neutral-300 accent-brand-blue" />
                      </th>
                    )}
                    <SortableHeader field="ref_asli" label={tr.colRef} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader field="referencia_externa" label={tr.colRefExterna} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} className="min-w-[7rem]" />
                    <SortableHeader field="booking" label={tr.colBooking} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} className="min-w-[9rem]" />
                    <SortableHeader field="cliente" label={tr.colClient} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader field="especie" label={tr.colSpecies} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader field="naviera" label={tr.colCarrier} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader field="nave" label={tr.colVessel} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader field="pol" label={tr.colPOL} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader field="pod" label={tr.colPOD} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader field="etd" label={tr.colETD} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} className="min-w-[6.5rem]" />
                    <SortableHeader field="eta" label={tr.colETA} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} className="min-w-[6.5rem]" />
                    <SortableHeader field="tt" label={tr.colTT} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader field="solicitud_ventana" label={tr.colTipoOperacion} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader field="estado_operacion" label={tr.colStatus} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                    <th className="sticky top-0 z-20 bg-[#E8EEF7] px-3 py-2.5 text-center text-[11px] font-bold uppercase tracking-wider text-brand-blue/45 border-b border-brand-blue/15">{tr.colTransport}</th>
                    <th className="sticky top-0 z-20 bg-[#E8EEF7] px-3 py-2.5 text-center text-[11px] font-bold uppercase tracking-wider text-brand-blue/45 border-b border-brand-blue/15">{tr.colActions}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOperaciones.length === 0 ? (
                    <tr>
                      <td colSpan={isCliente ? 15 : 16} className="px-4 py-14 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <span className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center">
                            <Icon icon="typcn:clipboard" width={20} height={20} className="text-neutral-400" />
                          </span>
                          <p className="text-brand-blue/70 font-medium text-sm">{tr.noResults}</p>
                          {(activeFiltersCount > 0 || searchTerm) && (
                            <button onClick={clearAllFilters} className="text-xs text-brand-blue hover:underline font-medium mt-1">{tr.clearFilters}</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredOperaciones.map((op, idx) => (
                      <MisReservasTableRow
                        key={op.id}
                        op={op}
                        idx={idx}
                        selected={selectedIds.has(op.id)}
                        isCliente={isCliente}
                        canInlineEdit={canInlineEdit}
                        addEmptyLabel={tr.inlineAdd}
                        typeExternal={tr.typeExternal}
                        typePendiente={tr.typePendiente}
                        copyShort={tr.copyShort}
                        emailTitle={tr.emailTitle}
                        editBookingTitle={tr.editBookingTitle}
                        confirmBookingTitle={tr.confirmBookingTitle}
                        confirmShort={tr.confirmShort}
                        onSelect={handleSelect}
                        onCopy={handleCopy}
                        onEmail={handleOpenEmail}
                        onBooking={handleOpenBooking}
                        onContextMenu={handleOpenContextMenu}
                        onInlineSave={handleInlineSave}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {filteredOperaciones.length > 0 && (
              <div className="px-3 py-2 border-t border-brand-blue/10 flex items-center justify-between bg-[#E8EEF7]/90 flex-shrink-0">
                <span className="text-xs text-brand-blue/60 font-medium tabular-nums">
                  {filteredOperaciones.length} {filteredOperaciones.length === 1 ? tr.registro : tr.records}
                  {filteredOperaciones.length !== operaciones.length && ` de ${operaciones.length}`}
                </span>
                {selectedIds.size > 0 && (
                  <span className="text-xs text-brand-blue font-semibold">{selectedIds.size} seleccionado{selectedIds.size !== 1 ? "s" : ""}</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Vista Tarjetas */}
        {viewMode === "cards" && (
          <>
            {filteredOperaciones.length === 0 ? (
              <div className="bg-white rounded-xl border border-brand-blue/12 px-4 py-12 flex flex-col items-center gap-2">
                <span className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center">
                  <Icon icon="typcn:clipboard" width={20} height={20} className="text-neutral-400" />
                </span>
                <p className="text-brand-blue/70 font-medium text-sm">{tr.noResults}</p>
                {(activeFiltersCount > 0 || searchTerm) && (
                  <button onClick={clearAllFilters} className="text-xs text-brand-blue hover:underline font-medium mt-1">Limpiar filtros</button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {filteredOperaciones.map((op) => (
                  <ReservaCard
                    key={op.id}
                    op={op}
                    isCliente={isCliente}
                    selected={selectedIds.has(op.id)}
                    actionLoading={actionLoading}
                    tr={tr}
                    onSelect={handleSelect}
                    onCopy={handleCopy}
                    onEmail={handleOpenEmail}
                    onBooking={handleOpenBooking}
                    onContextMenu={handleOpenContextMenu}
                  />
                ))}
              </div>
            )}
            {filteredOperaciones.length > 0 && (
              <p className="text-xs text-brand-blue/55 text-center mt-3 font-medium">
                {filteredOperaciones.length} {filteredOperaciones.length === 1 ? tr.reservaSingular : tr.reservasPlural}
                {filteredOperaciones.length !== operaciones.length && ` de ${operaciones.length}`}
                {selectedIds.size > 0 && ` · ${selectedIds.size} seleccionada${selectedIds.size !== 1 ? "s" : ""}`}
              </p>
            )}
          </>
        )}

      </div>

      {/* Modal éxito transporte */}
      {successTransport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="h-[3px] bg-emerald-500" />
            <div className="p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-emerald-50 flex items-center justify-center">
                <Icon icon="lucide:truck" width={24} height={24} className="text-emerald-500" />
              </div>
              <h3 className="font-bold text-neutral-900 mb-2">{tr.sentSuccessTitle}</h3>
              <p className="text-sm text-neutral-600 mb-5">{successTransport}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSuccessTransport(null)}
                  className="flex-1 px-4 py-2.5 bg-neutral-100 text-neutral-700 rounded-xl hover:bg-neutral-200 transition-colors font-medium text-sm"
                >
                  {tr.close}
                </button>
                <a
                  href={withBase("/transportes/reserva-asli")}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-semibold text-sm"
                >
                  {tr.goToTransports}
                  <Icon icon="typcn:arrow-right" width={14} height={14} />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal tipo de transporte */}
      {showTransportModal && (() => {
        const selOps = operaciones.filter((op) => selectedIds.has(op.id));
        const alreadyInAsli = selOps.filter((op) => op.tipo_reserva_transporte === "asli");
        const alreadyInExt = selOps.filter((op) => op.tipo_reserva_transporte === "externa");
        const pendientes = selOps.filter((op) => !op.tipo_reserva_transporte);
        const allAssigned = pendientes.length === 0;
        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
          <div className="bg-white rounded-2xl shadow-mac-modal border border-neutral-200 p-6 w-full max-w-sm mx-4 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                <Icon icon="lucide:truck" width={20} height={20} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900">{tr.sendToTransports}</h3>
                <p className="text-xs text-neutral-500">{selectedIds.size} operación{selectedIds.size > 1 ? "es" : ""} seleccionada{selectedIds.size > 1 ? "s" : ""}</p>
              </div>
            </div>

            {(alreadyInAsli.length > 0 || alreadyInExt.length > 0) && (
              <div className="mb-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700 space-y-0.5">
                {alreadyInAsli.length > 0 && (
                  <p>{alreadyInAsli.length} ya está{alreadyInAsli.length > 1 ? "n" : ""} en <strong>ASLI</strong> ({alreadyInAsli.map((o) => displayRefAsli(o.ref_asli, o.correlativo)).join(", ")})</p>
                )}
                {alreadyInExt.length > 0 && (
                  <p>{alreadyInExt.length} ya está{alreadyInExt.length > 1 ? "n" : ""} en <strong>Externa</strong> ({alreadyInExt.map((o) => displayRefAsli(o.ref_asli, o.correlativo)).join(", ")})</p>
                )}
                {!allAssigned && <p className="text-amber-600 font-medium">Solo se enviarán las {pendientes.length} pendiente{pendientes.length > 1 ? "s" : ""}.</p>}
              </div>
            )}

            {allAssigned ? (
              <>
                <p className="text-xs text-neutral-500 mb-4">{tr.allAssignedMsg}</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowTransportModal(false)} className="flex-1 px-4 py-2.5 text-xs font-semibold text-neutral-600 bg-neutral-100 border border-neutral-200 rounded-xl hover:bg-neutral-200 transition-colors">
                    {tr.close}
                  </button>
                  <a href={withBase("/transportes/reserva-asli")} className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-semibold text-xs">
                    {tr.goToTransports}
                    <Icon icon="typcn:arrow-right" width={14} height={14} />
                  </a>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-neutral-500 mb-4">{tr.selectTransportType}</p>
                <div className="flex flex-col gap-2">
                  <button type="button" onClick={() => void handleSendToAsli()} className="flex items-center gap-3 w-full p-3 rounded-xl border border-neutral-200 hover:border-brand-blue hover:bg-brand-blue/5 transition-all text-left group">
                    <div className="w-9 h-9 rounded-lg bg-brand-blue/10 flex items-center justify-center shrink-0 group-hover:bg-brand-blue/20 transition-colors">
                      <Icon icon="lucide:building-2" width={18} height={18} className="text-brand-blue" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-neutral-800">{tr.reservaAsliName}</p>
                      <p className="text-[11px] text-neutral-400">{tr.reservaAsliDesc}</p>
                    </div>
                  </button>
                  <button type="button" onClick={() => void handleSendToExterna()} className="flex items-center gap-3 w-full p-3 rounded-xl border border-neutral-200 hover:border-emerald-400 hover:bg-emerald-50/50 transition-all text-left group">
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0 group-hover:bg-emerald-200 transition-colors">
                      <Icon icon="lucide:globe" width={18} height={18} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-neutral-800">{tr.reservaExtName}</p>
                      <p className="text-[11px] text-neutral-400">{tr.reservaExtDesc}</p>
                    </div>
                  </button>
                </div>
                <button type="button" onClick={() => setShowTransportModal(false)} className="w-full mt-3 px-4 py-2 text-xs font-semibold text-neutral-600 bg-neutral-100 border border-neutral-200 rounded-xl hover:bg-neutral-200 transition-colors">
                  {tr.cancel}
                </button>
              </>
            )}
          </div>
        </div>
        );
      })()}

      {ctxMenu && createPortal((() => {
        const menuW = 240;
        const menuH = 132;
        const left = Math.max(8, Math.min(ctxMenu.x, window.innerWidth - menuW - 8));
        const top = Math.max(8, Math.min(ctxMenu.y, window.innerHeight - menuH - 8));
        return (
          <div
            role="menu"
            className="fixed z-[80] min-w-[220px] rounded-lg border border-neutral-200 bg-white shadow-lg py-1"
            style={{ left, top }}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
          >
            <p className="px-3 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 truncate">
              {ctxMenu.refLabel}
            </p>
            <button
              type="button"
              role="menuitem"
              onClick={handleCtxViewDocuments}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm font-semibold text-neutral-800 hover:bg-brand-blue/8 hover:text-brand-blue transition-colors"
            >
              <Icon icon="lucide:folder-open" width={16} height={16} className="shrink-0 text-brand-blue" />
              {tr.contextViewDocuments}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={handleCtxMoveToTrash}
              disabled={actionLoading}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm font-semibold text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <Icon icon="lucide:trash-2" width={16} height={16} className="shrink-0 text-red-600" />
              {tr.moveToTrash}
            </button>
          </div>
        );
      })(), document.body)}

      {/* Modals — renderizados en document.body via portal para evitar problemas de
          fixed positioning en iOS Safari cuando los ancestros tienen overflow:hidden */}
      {emailModal && createPortal(
        <EmailModal op={emailModal} onClose={() => setEmailModal(null)} />,
        document.body
      )}
      {bookingModal && createPortal(
        <BookingModal
          op={bookingModal}
          supabase={supabase}
          onClose={() => setBookingModal(null)}
          onSaved={(updated) => handleBookingSaved(bookingModal.id, updated)}
        />,
        document.body
      )}
    </main>
  );
}
