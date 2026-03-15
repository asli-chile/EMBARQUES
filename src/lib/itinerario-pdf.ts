/**
 * Generador de PDF para itinerarios de naves.
 * Usa jsPDF + jspdf-autotable para tablas profesionales.
 */
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import type { ItinerarioWithEscalas } from "@/types/itinerarios";

const BRAND_BLUE: [number, number, number] = [0, 82, 155];
const BRAND_BLUE_LIGHT: [number, number, number] = [26, 111, 196];
const WHITE: [number, number, number] = [255, 255, 255];
const ROW_ALT: [number, number, number] = [244, 247, 253];
const DEST_BG: [number, number, number] = [232, 240, 252];
const BORDER_COLOR: [number, number, number] = [220, 228, 240];
const TEXT_MUTED: [number, number, number] = [100, 116, 139];

const COMPANY_NAME = "Asesorías y Servicios Logísticos Integrales Ltda.";
/** Máximo de filas (semanas) por servicio en el PDF */
const MAX_ROWS_PER_SERVICE = 4;

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr?.trim()) return "—";
  try {
    const d = dateStr.includes("T") ? dateStr : `${dateStr}T12:00:00`;
    return format(new Date(d), "dd/MM/yyyy");
  } catch {
    return dateStr;
  }
}

/** Devuelve el DataURL del logo y sus dimensiones naturales */
async function loadLogo(): Promise<{ dataUrl: string; w: number; h: number } | null> {
  try {
    const resp = await fetch("/LOGO ASLI SIN FONDO AZUL.png");
    if (!resp.ok) return null;
    const blob = await resp.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    // Obtener dimensiones naturales para mantener aspect ratio
    const dims = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ w: 1, h: 1 });
      img.src = dataUrl;
    });
    return { dataUrl, w: dims.w, h: dims.h };
  } catch {
    return null;
  }
}

export async function generateItinerarioPDF(
  itinerarios: ItinerarioWithEscalas[],
  selectedArea: string | null,
  locale: "es" | "en" = "es"
): Promise<void> {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth(); // 297
  const pageH = doc.internal.pageSize.getHeight(); // 210
  const margin = 12;
  const now = new Date();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // ── Filtrar: solo filas con ETD >= hoy, max 4 por servicio ──────────────
  const byServicio = new Map<string, ItinerarioWithEscalas[]>();
  for (const it of itinerarios) {
    // Incluir solo si ETD no ha pasado (o si no tiene ETD la omitimos)
    if (!it.etd?.trim()) continue;
    const etdDate = new Date(it.etd.includes("T") ? it.etd : `${it.etd}T12:00:00`);
    if (isNaN(etdDate.getTime()) || etdDate < todayStart) continue;

    const key = (it.servicio || "").trim() || "—";
    const list = byServicio.get(key) ?? [];
    list.push(it);
    byServicio.set(key, list);
  }

  // Ordenar cada grupo por ETD asc y tomar máximo 4
  for (const [key, list] of byServicio) {
    list.sort((a, b) => {
      const ta = a.etd ? new Date(a.etd).getTime() : Infinity;
      const tb = b.etd ? new Date(b.etd).getTime() : Infinity;
      return ta - tb;
    });
    byServicio.set(key, list.slice(0, MAX_ROWS_PER_SERVICE));
  }

  // Si no quedan datos, crear PDF con mensaje
  const totalRows = [...byServicio.values()].reduce((s, l) => s + l.length, 0);

  const logo = await loadLogo();

  // ── Header de página ─────────────────────────────────────────────────────
  const HEADER_H = 26;
  const drawPageHeader = () => {
    doc.setFillColor(...BRAND_BLUE);
    doc.rect(0, 0, pageW, HEADER_H, "F");

    // Logo: escalar proporcionalmente a max 19mm de alto
    let logoX = margin;
    let logoDisplayW = 0;
    if (logo) {
      const maxH = 19;
      const ratio = logo.w / logo.h;
      const displayH = maxH;
      logoDisplayW = displayH * ratio;
      const logoY = (HEADER_H - displayH) / 2;
      doc.addImage(logo.dataUrl, "PNG", logoX, logoY, logoDisplayW, displayH);
    }

    const textX = logo ? margin + logoDisplayW + 4 : margin;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...WHITE);
    doc.text(
      locale === "es" ? "Itinerarios de Naves" : "Ship Itineraries",
      textX,
      11.5
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(190, 215, 245);
    const filterLabel =
      selectedArea && selectedArea !== "ALL"
        ? `${locale === "es" ? "Área" : "Area"}: ${selectedArea}`
        : locale === "es"
        ? "Todas las áreas"
        : "All areas";
    doc.text(filterLabel, textX, 19);

    // Derecha: solo fecha (sin "Generado:")
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(190, 215, 245);
    doc.text(format(now, "dd/MM/yyyy HH:mm"), pageW - margin, 11.5, { align: "right" });
    doc.text(
      `${totalRows} ${locale === "es" ? "itinerarios" : "itineraries"}`,
      pageW - margin,
      19,
      { align: "right" }
    );
  };

  // ── Footer: empresa centrada, nro página izq, fecha der ─────────────────
  const drawFooter = (pageNum: number, totalPages: number) => {
    doc.setDrawColor(...BORDER_COLOR);
    doc.setLineWidth(0.3);
    doc.line(margin, pageH - 8, pageW - margin, pageH - 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...TEXT_MUTED);
    // Página — izquierda
    doc.text(
      `${locale === "es" ? "Pág." : "Page"} ${pageNum} / ${totalPages}`,
      margin,
      pageH - 4
    );
    // Empresa — centro
    doc.text(COMPANY_NAME, pageW / 2, pageH - 4, { align: "center" });
    // Fecha — derecha
    doc.text(format(now, "dd/MM/yyyy"), pageW - margin, pageH - 4, { align: "right" });
  };

  drawPageHeader();
  let y = HEADER_H + 5;

  if (totalRows === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(
      locale === "es"
        ? "No hay itinerarios con ETD pendiente."
        : "No itineraries with pending ETD.",
      pageW / 2,
      pageH / 2,
      { align: "center" }
    );
  } else {
    for (const [servicioNombre, list] of byServicio) {
      if (list.length === 0) continue;

      const navieras = [
        ...new Set(list.map((it) => it.naviera).filter(Boolean)),
      ] as string[];

      // Destinos únicos ordenados por ETA más temprana
      const portKeysByEta = new Map<string, number>();
      for (const it of list) {
        for (const e of it.escalas ?? []) {
          const key = e.puerto_nombre || e.puerto || "—";
          if (!key) continue;
          const t = e.eta ? new Date(e.eta).getTime() : Infinity;
          if (!portKeysByEta.has(key) || t < (portKeysByEta.get(key) ?? Infinity)) {
            portKeysByEta.set(key, t);
          }
        }
      }
      const destinations = [...portKeysByEta.entries()]
        .sort((a, b) => a[1] - b[1])
        .map(([nombre]) => nombre);

      // Salto de página si no hay espacio
      if (y > pageH - 55) {
        doc.addPage();
        drawPageHeader();
        y = HEADER_H + 5;
      }

      // Barra de servicio
      doc.setFillColor(...BRAND_BLUE_LIGHT);
      doc.rect(margin, y, pageW - margin * 2, 9, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...WHITE);
      doc.text(servicioNombre, margin + 3, y + 6.2);

      if (navieras.length > 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(200, 225, 255);
        doc.text(navieras.join(" · "), pageW - margin - 3, y + 6.2, { align: "right" });
      }
      y += 11;

      // Anchos de columnas
      const baseColWidths = [13, 36, 28, 16, 30];
      const totalBaseW = baseColWidths.reduce((a, b) => a + b, 0);
      const availableW = pageW - margin * 2 - totalBaseW;
      const destColW =
        destinations.length > 0
          ? Math.max(20, Math.min(38, availableW / destinations.length))
          : 30;

      // Cabeceras
      const headRow: string[] = [
        locale === "es" ? "Sem." : "Wk.",
        locale === "es" ? "Nave" : "Vessel",
        locale === "es" ? "Operador" : "Operator",
        locale === "es" ? "Viaje" : "Voyage",
        `POL\nETD`,
        ...destinations.map((d) => `${d}\nETA / TT`),
      ];

      // Filas
      const rows = list.map((it) => {
        const escalas = it.escalas ?? [];
        const baseRow = [
          it.semana != null ? String(it.semana) : "—",
          it.nave || "—",
          it.operador || it.naviera || "—",
          it.viaje || "—",
          `${it.pol || "—"}\n${formatDate(it.etd)}`,
        ];
        const destCells = destinations.map((portKey) => {
          const e = escalas.find(
            (esc) => ((esc.puerto_nombre || esc.puerto) || "—") === portKey
          );
          if (!e) return "—";
          const etaStr = e.eta ? formatDate(e.eta) : "—";
          const ttStr = e.dias_transito != null ? `${e.dias_transito}d` : "";
          return ttStr ? `${etaStr}\n${ttStr}` : etaStr;
        });
        return [...baseRow, ...destCells];
      });

      // Estilos de columnas
      const columnStyles: Record<number, object> = {};
      baseColWidths.forEach((w, i) => {
        columnStyles[i] = { cellWidth: w, halign: i === 0 ? "center" : "left" };
      });
      destinations.forEach((_, i) => {
        columnStyles[baseColWidths.length + i] = {
          cellWidth: destColW,
          halign: "center",
          fillColor: DEST_BG,
        };
      });

      autoTable(doc, {
        head: [headRow],
        body: rows,
        startY: y,
        margin: { left: margin, right: margin },
        tableWidth: pageW - margin * 2,
        styles: {
          fontSize: 7.5,
          cellPadding: { top: 2.5, bottom: 2.5, left: 2.5, right: 2.5 },
          lineColor: BORDER_COLOR,
          lineWidth: 0.2,
          valign: "middle",
          overflow: "linebreak",
          font: "helvetica",
        },
        headStyles: {
          fillColor: BRAND_BLUE,
          textColor: WHITE,
          fontStyle: "bold",
          fontSize: 7.5,
          halign: "center",
          valign: "middle",
          cellPadding: { top: 3, bottom: 3, left: 2.5, right: 2.5 },
          lineColor: BRAND_BLUE,
        },
        alternateRowStyles: { fillColor: ROW_ALT },
        columnStyles,
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index >= baseColWidths.length) {
            data.cell.styles.fillColor =
              data.row.index % 2 === 0 ? DEST_BG : [210, 228, 248];
          }
          if (data.section === "body" && data.column.index === 0) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.textColor = BRAND_BLUE;
          }
        },
        didDrawPage: () => {
          drawPageHeader();
        },
      });

      y =
        (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
          .finalY + 8;
    }
  }

  // Footers en todas las páginas
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(i, totalPages);
  }

  const areaSlug =
    selectedArea && selectedArea !== "ALL"
      ? `-${selectedArea.toLowerCase()}`
      : "";
  doc.save(`itinerarios${areaSlug}-${format(now, "yyyy-MM-dd")}.pdf`);
}
