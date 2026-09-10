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
import { getEstadoOperacionStyle } from "@/lib/ui/estadoOperacion";
import { etiquetaEstado } from "@/lib/operaciones/estados";
import { aplicarFiltroTemporada } from "@/lib/temporadas";
import { useTemporadaActiva } from "@/lib/useTemporadaActiva";
import { useNeonTheme } from "@/lib/ui/neonTheme";
import {
  ContenedorTransporteModal,
  type ContenedorTransporteSaved,
} from "@/components/reservas/ContenedorTransporteModal";

/** Evita pintar filas fuera de viewport (~1000 filas). */
const ROW_CV: CSSProperties = { contentVisibility: "auto", containIntrinsicSize: "auto 44px" };

const FILTER_FIELD =
  "dash-control w-full px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-dash-neon/40";
const FILTER_LABEL = "mb-1 block text-[10px] font-bold uppercase tracking-wider text-dash-muted";

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
  transporte: string | null;
  chofer: string | null;
  rut_chofer: string | null;
  telefono_chofer: string | null;
  patente_camion: string | null;
  patente_remolque: string | null;
  contenedor: string | null;
  sello: string | null;
  tara: number | null;
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

type SortField = "ref_asli" | "referencia_externa" | "cliente" | "especie" | "naviera" | "nave" | "pol" | "pod" | "etd" | "eta" | "tt" | "booking" | "contenedor" | "estado_operacion" | "solicitud_ventana";
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
  return <span className="text-dash-muted text-xs">—</span>;
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
      <span className="text-[13px] text-dash-fg/90 font-medium truncate block max-w-full" title={String(value)}>
        {value}
      </span>
    );
  }

  if (!canEdit) {
    return <span className="text-dash-muted text-xs">—</span>;
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
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-dash-muted border border-dashed border-dash-neon/35 hover:border-dash-neon/50 hover:text-dash-fg hover:bg-dash-neon/10 transition-colors"
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
      className="dash-control w-full min-w-[6rem] max-w-[11rem] px-2 py-1 text-[12px] font-semibold focus:outline-none focus:ring-2 focus:ring-dash-neon/40"
      placeholder={addLabel}
    />
  );
}

function CardDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-bold uppercase tracking-wider text-dash-muted">{label}</p>
      <p className="text-xs font-semibold text-dash-fg leading-snug break-words mt-0.5">{value}</p>
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
    ["Estado", etiquetaEstado(op.estado_operacion)],
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
    <th className={`sticky top-0 z-20 bg-[color-mix(in_srgb,var(--dash-control)_92%,transparent)] px-3 py-2.5 whitespace-nowrap border-b border-dash-border text-center backdrop-blur-sm ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className={`inline-flex items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-wider transition-colors ${
          isActive ? "text-dash-neon" : "text-dash-muted hover:text-dash-fg"
        }`}
      >
        {label}
        <span className="flex flex-col gap-px">
          <Icon icon="typcn:arrow-sorted-up" width={10} height={10} className={isActive && sortDirection === "asc" ? "text-dash-neon" : "text-dash-muted/40"} />
          <Icon icon="typcn:arrow-sorted-down" width={10} height={10} className={isActive && sortDirection === "desc" ? "text-dash-neon" : "text-dash-muted/40"} />
        </span>
      </button>
    </th>
  );
}

// ─── ReservaCard ──────────────────────────────────────────────────────────────

type CardProps = {
  op: Operacion;
  isCliente: boolean;
  canEditContenedor: boolean;
  selected: boolean;
  actionLoading: boolean;
  tr: ReturnType<typeof useLocale>["t"]["misReservas"];
  onSelect: (id: string) => void;
  onCopy: (op: Operacion) => void;
  onEmail: (op: Operacion) => void;
  onBooking: (op: Operacion) => void;
  onContenedor: (op: Operacion) => void;
  onContextMenu: (event: MouseEvent, op: Operacion) => void;
};

const ReservaCard = memo(function ReservaCard({ op, isCliente, canEditContenedor, selected, actionLoading: _actionLoading, tr, onSelect, onCopy, onEmail, onBooking, onContenedor, onContextMenu }: CardProps) {
  const [expanded, setExpanded] = useState(false);
  const cfg = getEstadoOperacionStyle(op.estado_operacion);
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
      className={`relative dash-card rounded-xl flex flex-col overflow-hidden transition-all duration-150 border ${
        !isCliente ? "cursor-pointer" : ""
      } ${
        selected
          ? "border-dash-neon/50 ring-2 ring-dash-neon/25 shadow-md"
          : "border-dash-border hover:border-dash-neon/35 hover:shadow-sm"
      }`}
    >
      <span className={`absolute inset-y-0 left-0 w-[3px] ${cfg ? cfg.dot : "bg-dash-neon/25"}`} aria-hidden />

      <div className="pl-4 pr-3 pt-3 pb-2 flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          {!isCliente && (
            <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-all ${
              selected ? "border-dash-neon/50 bg-dash-neon/30" : "border-dash-neon/35 bg-dash-control"
            }`}>
              {selected && <Icon icon="lucide:check" width={10} height={10} className="text-dash-neon" />}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-bold text-dash-fg leading-tight tabular-nums tracking-tight">
              {displayRefAsli(op.ref_asli, op.correlativo)}
            </p>
            <p className="text-xs text-dash-muted truncate mt-0.5 font-medium">{op.cliente ?? "-"}</p>
          </div>
        </div>
        {cfg && (
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border whitespace-nowrap shrink-0 ${cfg.bg} ${cfg.text} ${cfg.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} shrink-0`} />
            {etiquetaEstado(op.estado_operacion)}
          </span>
        )}
      </div>

      {op.solicitud_ventana ? (
        <div className="px-3 pb-2">
          <VentanaBadge value={op.solicitud_ventana} />
        </div>
      ) : null}

      <div className="mx-3 mb-2.5 bg-dash-control rounded-lg px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-wider text-dash-muted">{tr.cardOrigin}</p>
            <p className="text-sm font-bold text-dash-fg truncate leading-tight">{op.pol ?? "-"}</p>
          </div>
          <div className="flex flex-col items-center gap-0.5 shrink-0">
            <div className="w-10 h-px bg-dash-neon/25" />
            {op.tt !== null ? (
              <span className="text-[10px] font-bold text-dash-fg tabular-nums">{op.tt}d</span>
            ) : (
              <Icon icon="lucide:arrow-right" width={12} height={12} className="text-dash-muted" />
            )}
            <div className="w-10 h-px bg-dash-neon/25" />
          </div>
          <div className="flex-1 min-w-0 text-right">
            <p className="text-[9px] font-bold uppercase tracking-wider text-dash-muted">{tr.cardDestino}</p>
            <p className="text-sm font-bold text-dash-fg truncate leading-tight">{op.pod ?? "-"}</p>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] tabular-nums">
          <span className="text-dash-muted">ETD <span className="font-semibold text-dash-fg">{fmtDate(op.etd)}</span></span>
          <span className="text-dash-muted">ETA <span className="font-semibold text-dash-fg">{fmtDate(op.eta)}</span></span>
        </div>
      </div>

      <div className="px-3 pb-2 flex-1 space-y-1 text-xs">
        {(op.naviera || op.nave) && (
          <p className="text-dash-fg/90 truncate">
            <span className="font-semibold">{op.naviera ?? "-"}</span>
            {op.nave ? <span className="text-dash-muted"> · {op.nave}</span> : null}
          </p>
        )}
        {op.especie && (
          <p className="text-dash-muted truncate">{op.especie}</p>
        )}
      </div>

      {expanded && (
        <div className="mx-3 mb-2.5 rounded-lg border border-dash-border bg-dash-control px-3 py-2.5 grid grid-cols-2 gap-x-3 gap-y-2.5">
          <CardDetail label={tr.colRefExterna} value={op.referencia_externa || "—"} />
          <CardDetail label={tr.colBooking} value={op.booking || "—"} />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-dash-muted mb-0.5">{tr.colContainer}</p>
            {canEditContenedor ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onContenedor(op);
                }}
                className={`inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold ${
                  op.contenedor
                    ? "border-dash-border bg-dash-control text-dash-fg hover:border-dash-neon/40 hover:bg-dash-neon/10"
                    : "border-dashed border-dash-neon/35 text-dash-muted hover:border-dash-neon/50 hover:text-dash-fg hover:bg-dash-neon/10"
                }`}
                title={op.contenedor ? tr.editContainerTitle : tr.addContainerTitle}
              >
                <Icon icon={op.contenedor ? "lucide:pencil" : "typcn:box"} width={12} height={12} className="shrink-0" />
                <span className="truncate font-mono">{op.contenedor || tr.inlineAdd}</span>
              </button>
            ) : (
              <p className="text-xs font-semibold text-dash-fg truncate">{op.contenedor || "—"}</p>
            )}
          </div>
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
        className="mx-3 mb-2 inline-flex items-center justify-center gap-1 rounded-lg border border-dash-border bg-dash-control px-2.5 py-1.5 text-[11px] font-semibold text-dash-fg hover:bg-dash-neon/15 hover:border-dash-neon/35 transition-colors"
      >
        {expanded ? tr.cardHideDetails : tr.cardShowDetails}
        <Icon icon={expanded ? "lucide:chevron-up" : "lucide:chevron-down"} width={14} height={14} />
      </button>

      <div className="px-2.5 py-1.5 border-t border-dash-border flex items-center justify-between bg-dash-control/40">
        {!isCliente ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onBooking(op); }}
            className={`inline-flex items-center gap-1 max-w-[58%] px-2 py-1 rounded-md text-[11px] font-semibold border truncate ${
              op.booking_doc_url
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : op.booking
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-dash-control text-dash-muted border-dashed border-dash-neon/35"
            }`}
            title={op.booking ? tr.editBookingTitle : tr.confirmBookingTitle}
          >
            {op.booking_doc_url ? <IcoPaperclip size={12} className="shrink-0" /> : <IcoBookmark size={12} className="shrink-0" />}
            <span className="font-mono truncate">{op.booking ?? tr.confirmShort}</span>
          </button>
        ) : (
          <span className="font-mono text-[11px] text-dash-muted truncate max-w-[58%]">{op.booking || "—"}</span>
        )}
        <div className="flex items-center">
          <button type="button" onClick={(e) => { e.stopPropagation(); onCopy(op); }} className="p-2 min-h-[40px] min-w-[40px] inline-flex items-center justify-center text-dash-muted hover:text-dash-fg hover:bg-dash-neon/15 rounded-lg transition-colors" title={tr.copyTitle}>
            <IcoCopy size={16} />
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onEmail(op); }} className="p-2 min-h-[40px] min-w-[40px] inline-flex items-center justify-center text-dash-muted hover:text-dash-fg hover:bg-dash-neon/15 rounded-lg transition-colors" title={tr.emailTitle}>
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
  canEditContenedor: boolean;
  addEmptyLabel: string;
  typeExternal: string;
  typePendiente: string;
  copyShort: string;
  emailTitle: string;
  editBookingTitle: string;
  confirmBookingTitle: string;
  confirmShort: string;
  editContainerTitle: string;
  addContainerTitle: string;
  onSelect: (id: string) => void;
  onCopy: (op: Operacion) => void;
  onEmail: (op: Operacion) => void;
  onBooking: (op: Operacion) => void;
  onContenedor: (op: Operacion) => void;
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
  canEditContenedor,
  addEmptyLabel,
  typeExternal,
  typePendiente,
  copyShort,
  emailTitle,
  editBookingTitle,
  confirmBookingTitle,
  confirmShort,
  editContainerTitle,
  addContainerTitle,
  onSelect,
  onCopy,
  onEmail,
  onBooking,
  onContenedor,
  onContextMenu,
  onInlineSave,
}: TableRowProps) {
  const cfg = getEstadoOperacionStyle(op.estado_operacion);
  return (
    <tr
      style={ROW_CV}
      onContextMenu={(event) => onContextMenu(event, op)}
      className={`border-b border-dash-border ${
        selected ? "bg-dash-neon/15" : idx % 2 === 0 ? "bg-transparent hover:bg-dash-neon/10" : "bg-dash-control/30 hover:bg-dash-neon/10"
      }`}
    >
      {!isCliente && (
        <td className="relative px-3 py-2 text-center w-10">
          {cfg && <span className={`absolute inset-y-0 left-0 w-[3px] ${cfg.dot}`} aria-hidden />}
          <input type="checkbox" checked={selected} onChange={() => onSelect(op.id)} className="w-4 h-4 rounded border-neutral-300 accent-[var(--dash-neon)]" />
        </td>
      )}
      <td className={`px-3 py-2 text-center ${isCliente ? "relative" : ""}`}>
        {isCliente && cfg && <span className={`absolute inset-y-0 left-0 w-[3px] ${cfg.dot}`} aria-hidden />}
        <span className="font-bold text-dash-fg text-[13px] tabular-nums tracking-tight">{displayRefAsli(op.ref_asli, op.correlativo, "-")}</span>
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
                  : "bg-dash-control text-dash-muted border-dash-border border-dashed hover:border-amber-400/60 hover:text-amber-500 hover:bg-amber-500/10"
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
            <span className="text-[12px] font-mono text-dash-fg/90">{op.booking || "—"}</span>
            {op.booking_doc_url && (
              <a href={op.booking_doc_url} target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:text-emerald-700">
                <IcoPaperclip size={12} />
              </a>
            )}
          </div>
        )}
      </td>
      <td className="px-3 py-2 text-center whitespace-nowrap">
        {canEditContenedor ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onContenedor(op);
            }}
            className={`inline-flex max-w-[200px] items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold ${
              op.contenedor
                ? "border-dash-border bg-dash-control text-dash-fg hover:border-dash-neon/40 hover:bg-dash-neon/10"
                : "border-dashed border-dash-neon/35 text-dash-muted hover:border-dash-neon/50 hover:text-dash-fg hover:bg-dash-neon/10"
            }`}
            title={op.contenedor ? editContainerTitle : addContainerTitle}
          >
            <Icon icon={op.contenedor ? "lucide:pencil" : "typcn:box"} width={12} height={12} className="shrink-0" />
            <span className="truncate font-mono tracking-tight">
              {op.contenedor || addEmptyLabel}
            </span>
          </button>
        ) : op.contenedor ? (
          <span className="text-[12px] font-mono font-semibold text-dash-fg tracking-tight">{op.contenedor}</span>
        ) : (
          <span className="text-dash-muted text-xs">—</span>
        )}
      </td>
      <td className="px-3 py-2 text-center text-[13px] text-dash-fg font-medium whitespace-nowrap max-w-[10rem] truncate">{op.cliente || "—"}</td>
      <td className="px-3 py-2 text-center text-[13px] text-dash-muted max-w-[8rem] truncate">{op.especie || "—"}</td>
      <td className="px-3 py-2 text-center text-[13px] text-dash-muted whitespace-nowrap">{op.naviera || "—"}</td>
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
      <td className="px-3 py-2 text-center text-[12px] text-dash-fg font-semibold whitespace-nowrap tabular-nums">{fmtDate(op.etd)}</td>
      <td className="px-3 py-2 text-center text-[12px] text-dash-fg font-semibold whitespace-nowrap tabular-nums">{fmtDate(op.eta)}</td>
      <td className="px-3 py-2 text-center">
        {op.tt !== null ? (
          <span className="text-[11px] font-bold text-dash-fg tabular-nums">{op.tt}d</span>
        ) : <span className="text-dash-muted text-xs">—</span>}
      </td>
      <td className="px-3 py-2 text-center">
        <VentanaBadge value={op.solicitud_ventana} />
      </td>
      <td className="px-3 py-2 text-center">
        {cfg ? (
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} shrink-0`} />
            {etiquetaEstado(op.estado_operacion)}
          </span>
        ) : <span className="text-dash-muted text-xs">—</span>}
      </td>
      <td className="px-3 py-2 text-center">
        {op.tipo_reserva_transporte === "asli" ? (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-dash-neon/15 text-dash-fg border border-dash-border">
            ASLI
          </span>
        ) : op.tipo_reserva_transporte === "externa" ? (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-200">
            {typeExternal}
          </span>
        ) : (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-transparent text-dash-muted border border-dashed border-dash-border">
            {typePendiente}
          </span>
        )}
      </td>
      <td className="px-2 py-2 text-center">
        <div className="flex items-center justify-center">
          <button type="button" onClick={() => onCopy(op)} className="p-1.5 text-dash-muted hover:text-dash-fg hover:bg-dash-neon/15 rounded-md" title={copyShort}>
            <IcoCopy size={15} />
          </button>
          <button type="button" onClick={() => onEmail(op)} className="p-1.5 text-dash-muted hover:text-dash-fg hover:bg-dash-neon/15 rounded-md" title={emailTitle}>
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
  const [theme] = useNeonTheme();
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
    <div className="dash-neon fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" data-theme={theme}>
      <div className="dash-card motion-enter-lift w-full max-w-sm rounded-2xl p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${sent ? "border-emerald-400/35 bg-emerald-500/15" : "border-dash-neon/35 bg-dash-neon/15"}`}>
            <Icon icon={sent ? "lucide:check-circle" : "lucide:mail"} width={20} height={20} className={sent ? "text-emerald-300" : "text-dash-neon"} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-dash-fg">{sent ? tr.emailSentTitle : tr.emailSendTitle}</h3>
            <p className="text-xs text-dash-muted">{displayRefAsli(op.ref_asli, op.correlativo)} · {op.cliente ?? ""}</p>
          </div>
        </div>

        {error && <div className="mb-3 rounded-lg border border-red-400/35 bg-red-500/15 p-2.5 text-xs text-dash-fg">{error}</div>}

        {sent ? (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-400/35 bg-emerald-500/15 p-3 text-xs text-emerald-300">
            <Icon icon="lucide:send" width={14} height={14} className="shrink-0" />
            Correo enviado a <strong>roodericus7@gmail.com</strong> desde tu cuenta.
          </div>
        ) : (
          <div className="mb-4 space-y-2">
            <p className="text-xs text-dash-muted">El correo se enviará desde tu cuenta <strong className="text-dash-fg">@asli.cl</strong> a <strong className="text-dash-fg">roodericus7@gmail.com</strong>.</p>
            <div className="rounded-lg border border-dash-border bg-dash-control/70 px-3 py-2">
              <p className="mb-1 text-[10px] font-semibold uppercase text-dash-muted">{tr.emailSubject}</p>
              <p className="line-clamp-2 text-xs font-medium leading-snug text-dash-fg">{subject}</p>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button type="button" onClick={onClose} disabled={sending}
            className="dash-control flex-1 px-4 py-2.5 text-xs font-semibold disabled:opacity-60">
            {sent ? tr.close : tr.cancel}
          </button>
          {!sent && (
          <button type="button" onClick={() => void handleEnviar()} disabled={sending}
            className="dash-cta flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs disabled:opacity-60">
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
  const [theme] = useNeonTheme();
  const [bookingInput, setBookingInput] = useState(op.booking ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const acceptFile = (next: File | null) => {
    if (!next) {
      setFile(null);
      return;
    }
    const okType =
      next.type === "application/pdf" ||
      next.type.startsWith("image/") ||
      /\.(pdf|png|jpe?g|webp)$/i.test(next.name);
    if (!okType) {
      setError("Solo se permiten PDF o imágenes.");
      return;
    }
    setError(null);
    setFile(next);
  };

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
    <div
      className="dash-neon fixed inset-0 z-50 flex items-end justify-center bg-black/65 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      data-theme={theme}
      onClick={onClose}
    >
      <div
        className="dash-card motion-enter-lift flex max-h-[min(92dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-[3px] shrink-0 bg-gradient-to-r from-dash-neon to-dash-neon-hot" />

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6 sm:p-8">
          <div className="mb-6 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber-400/40 bg-amber-500/15 shadow-[0_0_24px_-8px_rgba(251,191,36,0.45)]">
              <Icon icon="lucide:bookmark-check" width={24} height={24} className="text-amber-300" />
            </div>
            <div className="min-w-0 pt-0.5">
              <h3 className="text-lg font-bold tracking-tight text-dash-fg sm:text-xl">
                {tr.confirmBookingModal}
              </h3>
              <p className="mt-1 font-mono text-sm font-semibold tracking-wider text-dash-neon/90 sm:text-base">
                {displayRefAsli(op.ref_asli, op.correlativo)}
                <span className="mx-2 text-dash-muted/50">·</span>
                <span className="font-sans font-medium tracking-normal text-dash-muted">
                  {op.cliente ?? ""}
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="ml-auto -mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-dash-muted transition-colors hover:bg-dash-control hover:text-dash-fg"
              aria-label={tr.close}
            >
              <Icon icon="lucide:x" width={18} height={18} />
            </button>
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-red-400/35 bg-red-500/15 px-4 py-3 text-sm text-dash-fg">
              {error}
            </div>
          )}

          <div className="mb-7">
            <label className="mb-2.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-dash-muted">
              {tr.bookingNumberLabel}
            </label>
            <div className="relative">
              <input
                type="text"
                value={bookingInput}
                onChange={(e) => setBookingInput(e.target.value.toUpperCase())}
                placeholder="ABC123456"
                spellCheck={false}
                autoComplete="off"
                className="dash-control w-full rounded-2xl border-dash-neon/30 bg-dash-control/90 px-5 py-5 text-center font-mono text-2xl font-bold tracking-[0.18em] text-dash-fg shadow-[inset_0_0_0_1px_rgba(45,212,191,0.08),0_0_28px_-14px_rgba(45,212,191,0.35)] placeholder:tracking-[0.12em] placeholder:text-dash-muted/35 focus:border-dash-neon/55 focus:outline-none focus:ring-2 focus:ring-dash-neon/35 sm:py-6 sm:text-3xl sm:tracking-[0.22em]"
              />
            </div>
          </div>

          <div className="mb-2">
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-dash-muted">
              {tr.bookingDocFieldLabel}
            </label>

            {hasDoc && !file && (
              <div className="mb-3 flex items-center gap-3 rounded-xl border border-emerald-400/35 bg-emerald-500/15 px-4 py-3">
                <Icon icon="lucide:paperclip" width={18} height={18} className="shrink-0 text-emerald-300" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-emerald-200">
                  {tr.docAttached}
                </span>
                <a
                  href={op.booking_doc_url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-sm font-semibold text-emerald-300 hover:underline"
                >
                  {tr.view}
                </a>
              </div>
            )}

            <label
              className={`group relative flex min-h-[11rem] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-5 py-8 text-center transition-all duration-200 ${
                file
                  ? "border-dash-neon/55 bg-dash-neon/10 shadow-[0_0_32px_-12px_rgba(45,212,191,0.45)]"
                  : dragging
                    ? "border-dash-neon bg-dash-neon/15 scale-[1.01]"
                    : "border-dash-neon/35 bg-dash-control/80 hover:border-dash-neon/60 hover:bg-dash-neon/10"
              }`}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragging(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragging(false);
                acceptFile(e.dataTransfer.files?.[0] ?? null);
              }}
            >
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl border transition-colors ${
                  file
                    ? "border-dash-neon/50 bg-dash-neon/20 text-dash-neon"
                    : "border-dash-neon/40 bg-dash-neon/15 text-dash-neon group-hover:bg-dash-neon/25"
                }`}
              >
                <Icon icon={file ? "lucide:file-check-2" : "lucide:upload-cloud"} width={28} height={28} />
              </div>

              {file ? (
                <>
                  <p className="max-w-full truncate px-2 text-base font-bold text-dash-fg">{file.name}</p>
                  <p className="text-sm text-dash-muted">
                    {(file.size / 1024).toFixed(0)} KB · {hasDoc ? tr.replaceDoc : tr.uploadDoc}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-base font-bold text-dash-fg">{tr.uploadDropHint}</p>
                  <p className="text-sm font-medium text-dash-neon">{tr.uploadDropOr}</p>
                  <p className="text-xs text-dash-muted">{tr.uploadDropFormats}</p>
                </>
              )}

              <input
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={(e) => acceptFile(e.target.files?.[0] ?? null)}
              />
            </label>

            {file && (
              <button
                type="button"
                onClick={() => setFile(null)}
                className="mt-2.5 text-sm font-medium text-dash-muted transition-colors hover:text-red-300"
              >
                {tr.removeFile}
              </button>
            )}
          </div>
        </div>

        <div className="flex shrink-0 gap-3 border-t border-dash-border/60 bg-dash-control/40 px-6 py-4 sm:px-8">
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="dash-control flex-1 px-4 py-3 text-sm font-semibold disabled:opacity-60"
          >
            {tr.cancel}
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={uploading || (!bookingInput.trim() && !file)}
            className="dash-cta inline-flex flex-[1.35] items-center justify-center gap-2 px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading ? (
              <>
                <Icon icon="typcn:refresh" width={16} height={16} className="animate-spin" />
                {tr.saving}
              </>
            ) : (
              <>
                <Icon icon="lucide:save" width={16} height={16} />
                {tr.save}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MisReservasContent ───────────────────────────────────────────────────────

export function MisReservasContent() {
  const { t } = useLocale();
  const { isCliente, isEjecutivo, isStaff, isAdmin, isSuperadmin, empresaNombres, isLoading: authLoading, user, profile } = useAuth();
  const [theme] = useNeonTheme();
  const canInlineEdit = isEjecutivo || isStaff;
  const canEditContenedor = isEjecutivo || isAdmin || isSuperadmin;
  const tr = t.misReservas;
  const { temporadaActiva, temporadaLoading } = useTemporadaActiva();

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
  const [contenedorModal, setContenedorModal] = useState<Operacion | null>(null);
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
    if (!supabase || authLoading || temporadaLoading) return;
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
         booking_doc_url, transporte, chofer, rut_chofer, telefono_chofer, patente_camion, patente_remolque, contenedor, sello, tara,
         enviado_transporte, tipo_reserva_transporte, estado_operacion, solicitud_ventana, created_at, consignatario, tipo_unidad, pallets, peso_neto,
         temperatura, ventilacion, deposito, planta_presentacion, citacion, inicio_stacking, fin_stacking`
      )
      .is("deleted_at", null);

    q = applyOperacionesClienteFilter(q, scope);
    q = aplicarFiltroTemporada(q, temporadaActiva);
    const { data, error } = await q.order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading operaciones:", error);
    } else {
      setOperaciones((data ?? []) as Operacion[]);
    }
    setLoading(false);
  }, [supabase, authLoading, temporadaLoading, temporadaActiva, isCliente, isEjecutivo, empresaNombres]);

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
            op.contenedor?.toLowerCase().includes(search) ||
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
  const handleOpenContenedor = useCallback((op: Operacion) => {
    if (!canEditContenedor) return;
    setContenedorModal(op);
  }, [canEditContenedor]);

  const handleContenedorSaved = useCallback((opId: string, updated: ContenedorTransporteSaved) => {
    setOperaciones((prev) =>
      prev.map((row) => (row.id === opId ? { ...row, ...updated } : row))
    );
    sileo.success({ title: tr.containerSavedMsg });
    setContenedorModal(null);
  }, [tr.containerSavedMsg]);

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

      const rows = toSend.map((op) => ({ operacion_id: op.id, cliente: op.cliente || null, booking: op.booking || null, naviera: op.naviera || null, nave: op.nave || null, pod: op.pod || null, etd: op.etd || null }));
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
      <div className="dash-neon flex min-h-0 flex-1 flex-col" data-theme={theme}>
        <main className="dash-page relative flex min-h-0 flex-1 flex-col overflow-hidden" role="main">
          <div className="flex flex-1 items-center justify-center">
            <div className="dash-card flex items-center gap-2.5 rounded-xl border border-dash-border px-5 py-3.5 text-base font-medium text-dash-fg">
              <Icon icon="typcn:refresh" className="h-4 w-4 animate-spin text-dash-neon" />
              <span>{tr.loading}</span>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if ((isCliente || isEjecutivo) && empresaNombres.length === 0) {
    return (
      <div className="dash-neon flex min-h-0 flex-1 flex-col" data-theme={theme}>
        <main className="dash-page relative flex min-h-0 flex-1 flex-col overflow-hidden" role="main">
          <div className="flex flex-1 items-center justify-center px-4">
            <div className="dash-card max-w-md rounded-xl px-6 py-8 text-center">
              <Icon icon="lucide:building-2" className="mx-auto mb-3 text-dash-muted" width={40} height={40} />
              <p className="mb-2 text-lg font-semibold text-dash-fg">Sin empresa asignada</p>
              <p className="text-sm text-dash-muted">
                {isEjecutivo
                  ? "Aún no tienes clientes asignados. Un administrador debe asignártelos en Configuración → Asignar ejecutivos a clientes."
                  : "Tu usuario cliente aún no tiene una empresa vinculada. Un administrador debe asignarte en Configuración → Asignar clientes-empresas."}
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const exportCols: { key: keyof Operacion; label: string }[] = [
    { key: "ref_asli",        label: "Ref. ASLI" },
    { key: "referencia_externa", label: "Ref. Externa" },
    { key: "booking",         label: "Booking" },
    { key: "contenedor",      label: "Contenedor" },
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
    <div className="dash-neon flex min-h-0 flex-1 flex-col" data-theme={theme}>
    <main className="dash-page relative flex min-h-0 flex-1 flex-col overflow-hidden" role="main">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -right-16 top-8 h-64 w-64 rounded-full bg-dash-neon/15 blur-3xl" />
        <div className="absolute bottom-20 left-1/4 h-56 w-56 rounded-full bg-dash-neon-hot/10 blur-3xl" />
      </div>

      {/* ── Toolbar ── */}
      <div className="dash-toolbar relative z-10 shrink-0">
        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => goBackOr(withBase("/inicio"))}
              title={tr.btnBack}
              aria-label={tr.btnBack}
              className="dash-control inline-flex h-9 shrink-0 items-center gap-1.5 px-2.5 text-sm font-semibold sm:px-3"
            >
              <Icon icon="lucide:arrow-left" width={18} height={18} className="shrink-0" />
              <span className="hidden sm:inline">{tr.btnBack}</span>
            </button>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-dash-neon/40 bg-dash-neon/15">
              <Icon icon="typcn:clipboard" width={18} height={18} className="text-dash-neon" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold leading-tight tracking-tight text-dash-fg sm:text-xl">{t.sidebar.misReservas}</h1>
              <p className="mt-0.5 text-xs text-dash-muted">
                <span className="font-semibold tabular-nums text-dash-neon">{filteredOperaciones.length}</span>
                {filteredOperaciones.length !== operaciones.length
                  ? <span className="text-dash-muted/70"> / {operaciones.length}</span>
                  : null
                } {tr.records}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <div className="flex items-center rounded-lg border border-dash-border bg-dash-control/80 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                title={tr.viewCards}
                className={`rounded-md px-2.5 py-1.5 transition-all ${viewMode === "cards" ? "bg-dash-neon/25 text-dash-fg border border-dash-neon/40" : "border border-transparent text-dash-muted hover:text-dash-fg"}`}
              >
                <Icon icon="lucide:layout-grid" width={14} height={14} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                title={tr.viewTable}
                className={`rounded-md px-2.5 py-1.5 transition-all ${viewMode === "table" ? "bg-dash-neon/25 text-dash-fg border border-dash-neon/40" : "border border-transparent text-dash-muted hover:text-dash-fg"}`}
              >
                <Icon icon="lucide:list" width={14} height={14} />
              </button>
            </div>
            <a
              href={withBase("/reservas/papelera")}
              className="dash-control rounded-lg p-2 text-dash-muted hover:text-dash-fg"
              title="Papelera"
            >
              <Icon icon="lucide:trash-2" width={14} height={14} />
            </a>
            <a
              href={withBase("/reservas/crear")}
              className="dash-cta inline-flex items-center gap-1.5 px-3 py-2 text-sm"
            >
              <Icon icon="lucide:plus" width={13} height={13} />
              <span className="hidden sm:inline">{tr.newBooking}</span>
              <span className="sm:hidden">{tr.newMobile}</span>
            </a>
          </div>
        </div>
      </div>

      {/* ── Barra de búsqueda y filtros ── */}
      <div className="relative z-10 shrink-0 border-b border-dash-border bg-[color-mix(in_srgb,var(--dash-header)_70%,transparent)] backdrop-blur-md">
        <div className="px-3 sm:px-4 py-2 flex items-center gap-1.5">
          <div className="flex-1 min-w-0 relative">
            <Icon icon="lucide:search" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-dash-muted w-3.5 h-3.5 pointer-events-none" />
            <input
              type="text"
              placeholder={tr.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-8 py-2 border border-dash-border bg-dash-control rounded-lg text-sm text-dash-fg placeholder:text-dash-muted focus:outline-none focus:ring-2 focus:ring-dash-neon/40 focus:border-dash-neon/50 transition-all"
            />
            {searchTerm && (
              <button type="button" onClick={() => setSearchTerm("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-dash-muted hover:text-dash-fg transition-colors">
                <Icon icon="lucide:x" width={13} height={13} />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-2 border rounded-lg text-sm font-semibold transition-colors shrink-0 ${
              showFilters || activeFiltersCount > 0
                ? "border-dash-neon/50 bg-dash-neon/15 text-dash-fg"
                : "border-dash-border bg-dash-control text-dash-muted hover:bg-dash-control"
            }`}
          >
            <Icon icon="lucide:sliders-horizontal" width={13} height={13} />
            <span className="hidden sm:inline">{tr.filters}</span>
            {activeFiltersCount > 0 && (
              <span className="min-w-4 h-4 px-1 text-[10px] font-bold bg-dash-neon/25 text-white rounded-full flex items-center justify-center">{activeFiltersCount}</span>
            )}
          </button>
          <button
            onClick={() => void handleExportExcel()}
            disabled={filteredOperaciones.length === 0}
            className="inline-flex items-center gap-1 px-2.5 py-2 border border-dash-border bg-dash-control hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 rounded-lg text-sm font-semibold text-dash-muted transition-colors shrink-0 disabled:opacity-40"
            title="Exportar a Excel"
          >
            <Icon icon="lucide:table-2" width={13} height={13} />
            <span className="hidden sm:inline">Excel</span>
          </button>
          <button
            onClick={handleExportPDF}
            disabled={filteredOperaciones.length === 0}
            className="inline-flex items-center gap-1 px-2.5 py-2 border border-dash-border bg-dash-control hover:bg-red-50 hover:border-red-300 hover:text-red-700 rounded-lg text-sm font-semibold text-dash-muted transition-colors shrink-0 disabled:opacity-40"
            title="Exportar a PDF"
          >
            <Icon icon="lucide:file-text" width={13} height={13} />
            <span className="hidden sm:inline">PDF</span>
          </button>
          <button
            onClick={fetchOperaciones}
            className="p-2 text-dash-muted hover:text-dash-fg hover:bg-dash-control rounded-lg transition-colors shrink-0"
            title={tr.refresh}
          >
            <Icon icon="lucide:refresh-cw" width={14} height={14} />
          </button>
        </div>

        {/* Barra de selección */}
        {!isCliente && selectedIds.size > 0 && (
          <div className="px-3 sm:px-4 py-2 border-t border-dash-border flex items-center gap-2 bg-dash-neon/10">
            <span className="text-sm font-semibold text-dash-fg flex-1">{selectedIds.size} seleccionada{selectedIds.size !== 1 ? "s" : ""}</span>
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
            <button onClick={() => setSelectedIds(new Set())} className="p-1.5 text-dash-muted hover:text-dash-fg hover:bg-dash-neon/15 rounded-lg transition-colors">
              <Icon icon="lucide:x" width={13} height={13} />
            </button>
          </div>
        )}

        {/* Panel de filtros */}
        {showFilters && (
          <div className="px-3 sm:px-4 py-2.5 border-t border-dash-border bg-dash-control/70 space-y-2">
            {/* Fila 1: Estado, Cliente, Naviera, Especie, Nave */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              <div>
                <label className={FILTER_LABEL}>{tr.colStatus}</label>
                <select value={estadoFilter} onChange={(e) => setEstadoFilter(e.target.value)} className={FILTER_FIELD}>
                  <option value="">{tr.allStates}</option>
                  {estados.map((e) => <option key={e} value={e!}>{etiquetaEstado(e)}</option>)}
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
              <button onClick={clearAllFilters} className="text-xs text-dash-fg hover:underline font-semibold">
                {tr.clearAllFilters}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Área de contenido ── */}
      <div className="relative z-10 flex-1 min-h-0 overflow-auto p-2 sm:p-3">

        {/* Vista Tabla */}
        {viewMode === "table" && (
          <div className="dash-card-static flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-dash-border bg-[color-mix(in_srgb,var(--dash-surface)_92%,transparent)]" style={{ minHeight: 300 }}>
            <div className="overflow-auto flex-1 min-h-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[color-mix(in_srgb,var(--dash-control)_92%,transparent)]">
                    {!isCliente && (
                      <th className="sticky top-0 z-20 bg-[color-mix(in_srgb,var(--dash-control)_92%,transparent)] px-3 py-2.5 w-10 border-b border-dash-border">
                        <input type="checkbox" checked={selectedIds.size === filteredOperaciones.length && filteredOperaciones.length > 0} onChange={handleSelectAll} className="w-4 h-4 rounded border-neutral-300 accent-[var(--dash-neon)]" />
                      </th>
                    )}
                    <SortableHeader field="ref_asli" label={tr.colRef} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader field="referencia_externa" label={tr.colRefExterna} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} className="min-w-[7rem]" />
                    <SortableHeader field="booking" label={tr.colBooking} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} className="min-w-[9rem]" />
                    <SortableHeader field="contenedor" label={tr.colContainer} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} className="min-w-[8rem]" />
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
                    <th className="sticky top-0 z-20 bg-[color-mix(in_srgb,var(--dash-control)_92%,transparent)] px-3 py-2.5 text-center text-[11px] font-bold uppercase tracking-wider text-dash-muted border-b border-dash-border">{tr.colTransport}</th>
                    <th className="sticky top-0 z-20 bg-[color-mix(in_srgb,var(--dash-control)_92%,transparent)] px-3 py-2.5 text-center text-[11px] font-bold uppercase tracking-wider text-dash-muted border-b border-dash-border">{tr.colActions}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOperaciones.length === 0 ? (
                    <tr>
                      <td colSpan={isCliente ? 16 : 17} className="px-4 py-14 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <span className="w-10 h-10 rounded-xl bg-dash-control border border-dash-border flex items-center justify-center">
                            <Icon icon="typcn:clipboard" width={20} height={20} className="text-dash-muted" />
                          </span>
                          <p className="text-dash-muted font-medium text-sm">{tr.noResults}</p>
                          {(activeFiltersCount > 0 || searchTerm) && (
                            <button onClick={clearAllFilters} className="text-xs text-dash-fg hover:underline font-medium mt-1">{tr.clearFilters}</button>
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
                        canEditContenedor={canEditContenedor}
                        addEmptyLabel={tr.inlineAdd}
                        typeExternal={tr.typeExternal}
                        typePendiente={tr.typePendiente}
                        copyShort={tr.copyShort}
                        emailTitle={tr.emailTitle}
                        editBookingTitle={tr.editBookingTitle}
                        confirmBookingTitle={tr.confirmBookingTitle}
                        confirmShort={tr.confirmShort}
                        editContainerTitle={tr.editContainerTitle}
                        addContainerTitle={tr.addContainerTitle}
                        onSelect={handleSelect}
                        onCopy={handleCopy}
                        onEmail={handleOpenEmail}
                        onBooking={handleOpenBooking}
                        onContenedor={handleOpenContenedor}
                        onContextMenu={handleOpenContextMenu}
                        onInlineSave={handleInlineSave}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {filteredOperaciones.length > 0 && (
              <div className="px-3 py-2 border-t border-dash-border flex items-center justify-between bg-[color-mix(in_srgb,var(--dash-control)_90%,transparent)] flex-shrink-0">
                <span className="text-xs text-dash-muted font-medium tabular-nums">
                  {filteredOperaciones.length} {filteredOperaciones.length === 1 ? tr.registro : tr.records}
                  {filteredOperaciones.length !== operaciones.length && ` de ${operaciones.length}`}
                </span>
                {selectedIds.size > 0 && (
                  <span className="text-xs text-dash-fg font-semibold">{selectedIds.size} seleccionado{selectedIds.size !== 1 ? "s" : ""}</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Vista Tarjetas */}
        {viewMode === "cards" && (
          <>
            {filteredOperaciones.length === 0 ? (
              <div className="dash-card rounded-xl border border-dash-border px-4 py-12 flex flex-col items-center gap-2">
                <span className="w-10 h-10 rounded-xl bg-dash-control border border-dash-border flex items-center justify-center">
                  <Icon icon="typcn:clipboard" width={20} height={20} className="text-dash-muted" />
                </span>
                <p className="text-dash-muted font-medium text-sm">{tr.noResults}</p>
                {(activeFiltersCount > 0 || searchTerm) && (
                  <button onClick={clearAllFilters} className="text-xs text-dash-fg hover:underline font-medium mt-1">Limpiar filtros</button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {filteredOperaciones.map((op) => (
                  <ReservaCard
                    key={op.id}
                    op={op}
                    isCliente={isCliente}
                    canEditContenedor={canEditContenedor}
                    selected={selectedIds.has(op.id)}
                    actionLoading={actionLoading}
                    tr={tr}
                    onSelect={handleSelect}
                    onCopy={handleCopy}
                    onEmail={handleOpenEmail}
                    onBooking={handleOpenBooking}
                    onContenedor={handleOpenContenedor}
                    onContextMenu={handleOpenContextMenu}
                  />
                ))}
              </div>
            )}
            {filteredOperaciones.length > 0 && (
              <p className="text-xs text-dash-muted text-center mt-3 font-medium">
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
        <div className="dash-neon fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" data-theme={theme}>
          <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-dash-border bg-[color-mix(in_srgb,var(--dash-surface)_96%,transparent)] shadow-2xl">
            <div className="h-[3px] bg-emerald-500" />
            <div className="p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-emerald-400/35 bg-emerald-500/15">
                <Icon icon="lucide:truck" width={24} height={24} className="text-emerald-400" />
              </div>
              <h3 className="mb-2 font-bold text-dash-fg">{tr.sentSuccessTitle}</h3>
              <p className="mb-5 text-sm text-dash-muted">{successTransport}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSuccessTransport(null)}
                  className="flex-1 rounded-xl border border-dash-border bg-dash-control px-4 py-2.5 text-sm font-medium text-dash-fg transition-colors hover:bg-dash-neon/15"
                >
                  {tr.close}
                </button>
                <a
                  href={withBase("/transportes/reserva-asli")}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
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
        <div className="dash-neon fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" data-theme={theme}>
          <div className="motion-enter-lift mx-4 w-full max-w-sm rounded-2xl border border-dash-border bg-[color-mix(in_srgb,var(--dash-surface)_96%,transparent)] p-6 shadow-mac-modal">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/35 bg-emerald-500/15">
                <Icon icon="lucide:truck" width={20} height={20} className="text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-dash-fg">{tr.sendToTransports}</h3>
                <p className="text-xs text-dash-muted">{selectedIds.size} operación{selectedIds.size > 1 ? "es" : ""} seleccionada{selectedIds.size > 1 ? "s" : ""}</p>
              </div>
            </div>

            {(alreadyInAsli.length > 0 || alreadyInExt.length > 0) && (
              <div className="mb-3 space-y-0.5 rounded-lg border border-amber-400/40 bg-amber-500/10 p-2.5 text-xs text-amber-700">
                {alreadyInAsli.length > 0 && (
                  <p>{alreadyInAsli.length} ya está{alreadyInAsli.length > 1 ? "n" : ""} en <strong>ASLI</strong> ({alreadyInAsli.map((o) => displayRefAsli(o.ref_asli, o.correlativo)).join(", ")})</p>
                )}
                {alreadyInExt.length > 0 && (
                  <p>{alreadyInExt.length} ya está{alreadyInExt.length > 1 ? "n" : ""} en <strong>Externa</strong> ({alreadyInExt.map((o) => displayRefAsli(o.ref_asli, o.correlativo)).join(", ")})</p>
                )}
                {!allAssigned && <p className="font-medium text-amber-600">Solo se enviarán las {pendientes.length} pendiente{pendientes.length > 1 ? "s" : ""}.</p>}
              </div>
            )}

            {allAssigned ? (
              <>
                <p className="mb-4 text-xs text-dash-muted">{tr.allAssignedMsg}</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowTransportModal(false)} className="flex-1 rounded-xl border border-dash-border bg-dash-control px-4 py-2.5 text-xs font-semibold text-dash-fg transition-colors hover:bg-dash-neon/15">
                    {tr.close}
                  </button>
                  <a href={withBase("/transportes/reserva-asli")} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700">
                    {tr.goToTransports}
                    <Icon icon="typcn:arrow-right" width={14} height={14} />
                  </a>
                </div>
              </>
            ) : (
              <>
                <p className="mb-4 text-xs text-dash-muted">{tr.selectTransportType}</p>
                <div className="flex flex-col gap-2">
                  <button type="button" onClick={() => void handleSendToAsli()} className="group flex w-full items-center gap-3 rounded-xl border border-dash-border p-3 text-left transition-all hover:border-dash-neon/50 hover:bg-dash-neon/10">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-dash-neon/15 transition-colors group-hover:bg-dash-neon/25">
                      <Icon icon="lucide:building-2" width={18} height={18} className="text-dash-neon" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-dash-fg">{tr.reservaAsliName}</p>
                      <p className="text-[11px] text-dash-muted">{tr.reservaAsliDesc}</p>
                    </div>
                  </button>
                  <button type="button" onClick={() => void handleSendToExterna()} className="group flex w-full items-center gap-3 rounded-xl border border-dash-border p-3 text-left transition-all hover:border-emerald-400/50 hover:bg-emerald-500/10">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 transition-colors group-hover:bg-emerald-500/25">
                      <Icon icon="lucide:globe" width={18} height={18} className="text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-dash-fg">{tr.reservaExtName}</p>
                      <p className="text-[11px] text-dash-muted">{tr.reservaExtDesc}</p>
                    </div>
                  </button>
                </div>
                <button type="button" onClick={() => setShowTransportModal(false)} className="mt-3 w-full rounded-xl border border-dash-border bg-dash-control px-4 py-2 text-xs font-semibold text-dash-fg transition-colors hover:bg-dash-neon/15">
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
            className="dash-neon fixed z-[80] min-w-[220px] rounded-lg border border-dash-border bg-[color-mix(in_srgb,var(--dash-surface)_96%,transparent)] py-1 shadow-lg"
            data-theme={theme}
            style={{ left, top }}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
          >
            <p className="truncate px-3 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-wider text-dash-muted">
              {ctxMenu.refLabel}
            </p>
            <button
              type="button"
              role="menuitem"
              onClick={handleCtxViewDocuments}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm font-semibold text-dash-fg transition-colors hover:bg-dash-neon/15"
            >
              <Icon icon="lucide:folder-open" width={16} height={16} className="shrink-0 text-dash-neon" />
              {tr.contextViewDocuments}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={handleCtxMoveToTrash}
              disabled={actionLoading}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/15 disabled:opacity-50"
            >
              <Icon icon="lucide:trash-2" width={16} height={16} className="shrink-0 text-red-400" />
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
      {contenedorModal && createPortal(
        <ContenedorTransporteModal
          op={contenedorModal}
          supabase={supabase}
          onClose={() => setContenedorModal(null)}
          onSaved={(updated) => handleContenedorSaved(contenedorModal.id, updated)}
        />,
        document.body
      )}
    </main>
    </div>
  );
}
