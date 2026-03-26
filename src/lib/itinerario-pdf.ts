/**
 * Generador de PDF para itinerarios de naves.
 * Usa jsPDF + jspdf-autotable. Agrupa por región → servicio.
 */
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import type { ItinerarioWithEscalas } from "@/types/itinerarios";

const BRAND_BLUE: [number, number, number] = [0, 82, 155];
const BRAND_BLUE_LIGHT: [number, number, number] = [13, 108, 191];
const WHITE: [number, number, number] = [255, 255, 255];
const ROW_ALT: [number, number, number] = [246, 249, 255];
const DEST_BG: [number, number, number] = [232, 241, 254];
const DEST_ALT: [number, number, number] = [214, 230, 252];
const BORDER_COLOR: [number, number, number] = [214, 224, 240];
const TEXT_MUTED: [number, number, number] = [100, 116, 139];
const TEXT_DARK: [number, number, number] = [30, 41, 59];

const AREA_COLORS: Record<string, [number, number, number]> = {
  AMERICA:        [22, 120, 60],
  ASIA:           [180, 115, 0],
  EUROPA:         [14, 100, 175],
  "MEDIO-ORIENTE":[194, 80, 10],
  OCEANIA:        [13, 140, 130],
};
const AREA_LABELS: Record<string, string> = {
  AMERICA: "América", ASIA: "Asia", EUROPA: "Europa",
  "MEDIO-ORIENTE": "Medio Oriente", OCEANIA: "Oceanía",
};
const AREA_ORDER = ["AMERICA", "ASIA", "EUROPA", "MEDIO-ORIENTE", "OCEANIA"];

const COMPANY_NAME = "Asesorías y Servicios Logísticos Integrales Ltda.";
const MAX_ROWS_PER_SERVICE = 6;

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr?.trim()) return "—";
  try {
    const d = dateStr.includes("T") ? dateStr : `${dateStr}T12:00:00`;
    return format(new Date(d), "dd/MM/yyyy");
  } catch { return dateStr; }
}

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
    const dims = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ w: 1, h: 1 });
      img.src = dataUrl;
    });
    return { dataUrl, w: dims.w, h: dims.h };
  } catch { return null; }
}

export async function generateItinerarioPDF(
  itinerarios: ItinerarioWithEscalas[],
  selectedArea: string | null,
  locale: "es" | "en" = "es"
): Promise<void> {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 10;
  const now = new Date();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // ── Filtrar y agrupar: byArea[area][service] = rows ──────────────────────
  const todayRows = itinerarios.filter((it) => {
    if (!it.etd?.trim()) return false;
    const d = new Date(it.etd.includes("T") ? it.etd : `${it.etd}T12:00:00`);
    return !isNaN(d.getTime()) && d >= todayStart;
  });

  const byArea = new Map<string, Map<string, ItinerarioWithEscalas[]>>();
  for (const it of todayRows) {
    const escalas = it.escalas ?? [];
    const areas = new Set<string>(escalas.map((e) => (e.area || "").trim() || "").filter(Boolean));
    if (areas.size === 0) areas.add("—");
    for (const area of areas) {
      if (selectedArea && selectedArea !== "ALL" && area !== selectedArea) continue;
      if (!byArea.has(area)) byArea.set(area, new Map());
      const am = byArea.get(area)!;
      const key = (it.servicio || "").trim() || "—";
      const list = am.get(key) ?? [];
      list.push(it);
      am.set(key, list);
    }
  }

  // Sort each service list by ETD asc, cap at MAX
  for (const am of byArea.values()) {
    for (const [k, list] of am) {
      list.sort((a, b) => (a.etd ? new Date(a.etd).getTime() : Infinity) - (b.etd ? new Date(b.etd).getTime() : Infinity));
      am.set(k, list.slice(0, MAX_ROWS_PER_SERVICE));
    }
  }

  const sortedAreas = [
    ...AREA_ORDER.filter((a) => byArea.has(a)),
    ...[...byArea.keys()].filter((a) => !AREA_ORDER.includes(a)).sort(),
  ];
  const totalRows = [...byArea.values()].reduce((s, am) => s + [...am.values()].reduce((ss, l) => ss + l.length, 0), 0);

  const logo = await loadLogo();

  // ── Header ───────────────────────────────────────────────────────────────
  const HEADER_H = 22;
  const drawPageHeader = () => {
    // Navy bg
    doc.setFillColor(...BRAND_BLUE);
    doc.rect(0, 0, pageW, HEADER_H, "F");
    // Thin accent stripe
    doc.setFillColor(0, 180, 200);
    doc.rect(0, HEADER_H - 1.5, pageW, 1.5, "F");

    let logoDisplayW = 0;
    if (logo) {
      const maxH = 16;
      const displayH = maxH;
      logoDisplayW = displayH * (logo.w / logo.h);
      doc.addImage(logo.dataUrl, "PNG", margin, (HEADER_H - displayH) / 2, logoDisplayW, displayH);
    }
    const textX = margin + logoDisplayW + (logo ? 4 : 0);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...WHITE);
    doc.text(locale === "es" ? "Itinerarios de Naves" : "Ship Itineraries", textX, 10);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(170, 210, 255);
    const filterLabel = selectedArea && selectedArea !== "ALL"
      ? `${AREA_LABELS[selectedArea] ?? selectedArea}`
      : locale === "es" ? "Todas las áreas" : "All areas";
    doc.text(filterLabel, textX, 17);

    // Right: date + count
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...WHITE);
    doc.text(format(now, "dd/MM/yyyy"), pageW - margin, 10, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(170, 210, 255);
    doc.text(`${totalRows} ${locale === "es" ? "registros" : "records"}`, pageW - margin, 17, { align: "right" });
  };

  // ── Footer ────────────────────────────────────────────────────────────────
  const drawFooter = (pageNum: number, totalPages: number) => {
    doc.setDrawColor(...BORDER_COLOR);
    doc.setLineWidth(0.25);
    doc.line(margin, pageH - 7, pageW - margin, pageH - 7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(`${locale === "es" ? "Pág." : "Page"} ${pageNum} / ${totalPages}`, margin, pageH - 3.5);
    doc.text(COMPANY_NAME, pageW / 2, pageH - 3.5, { align: "center" });
    doc.text(format(now, "dd/MM/yyyy"), pageW - margin, pageH - 3.5, { align: "right" });
  };

  drawPageHeader();
  let y = HEADER_H + 4;

  if (totalRows === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(
      locale === "es" ? "No hay itinerarios con ETD pendiente." : "No itineraries with pending ETD.",
      pageW / 2, pageH / 2, { align: "center" }
    );
  } else {
    for (const area of sortedAreas) {
      const serviceMap = byArea.get(area)!;
      const serviceNames = [...serviceMap.keys()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
      const areaColor = AREA_COLORS[area] ?? BRAND_BLUE;
      const areaLabel = AREA_LABELS[area] ?? area;

      // ── Area banner ────────────────────────────────────────────────────
      if (y > pageH - 50) { doc.addPage(); drawPageHeader(); y = HEADER_H + 4; }

      const bannerH = 8;
      doc.setFillColor(...areaColor);
      doc.roundedRect(margin, y, pageW - margin * 2, bannerH, 1.5, 1.5, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...WHITE);
      doc.text(areaLabel.toUpperCase(), margin + 4, y + 5.5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(200, 230, 255);
      doc.text(
        `${serviceNames.length} ${serviceNames.length === 1 ? (locale === "es" ? "servicio" : "service") : (locale === "es" ? "servicios" : "services")}`,
        pageW - margin - 3, y + 5.5, { align: "right" }
      );
      y += bannerH + 3;

      // ── Services ────────────────────────────────────────────────────────
      for (const servicioNombre of serviceNames) {
        const list = serviceMap.get(servicioNombre)!;
        if (list.length === 0) continue;

        const navieras = [...new Set(list.map((it) => it.naviera).filter(Boolean))] as string[];

        // Destinos de ESTA área únicamente
        const portKeysByEta = new Map<string, number>();
        for (const it of list) {
          for (const e of (it.escalas ?? []).filter((e) => (e.area || "").trim() === area)) {
            const key = e.puerto_nombre || e.puerto || "—";
            if (!key) continue;
            const t = e.eta ? new Date(e.eta).getTime() : Infinity;
            if (!portKeysByEta.has(key) || t < (portKeysByEta.get(key) ?? Infinity)) portKeysByEta.set(key, t);
          }
        }
        const destinations = [...portKeysByEta.entries()].sort((a, b) => a[1] - b[1]).map(([n]) => n);

        if (y > pageH - 45) { doc.addPage(); drawPageHeader(); y = HEADER_H + 4; }

        // Service name bar
        doc.setFillColor(BRAND_BLUE_LIGHT[0], BRAND_BLUE_LIGHT[1], BRAND_BLUE_LIGHT[2]);
        doc.rect(margin, y, pageW - margin * 2, 7.5, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(...WHITE);
        doc.text(servicioNombre, margin + 3, y + 5.2);
        if (navieras.length > 0) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(6.5);
          doc.setTextColor(190, 220, 255);
          doc.text(navieras.join(" · "), pageW - margin - 3, y + 5.2, { align: "right" });
        }
        y += 9;

        // Column widths
        const baseCols = [11, 34, 24, 14, 28];
        const usedW = baseCols.reduce((a, b) => a + b, 0);
        const destColW = destinations.length > 0
          ? Math.max(18, Math.min(36, (pageW - margin * 2 - usedW) / destinations.length))
          : 28;

        const head: string[] = [
          locale === "es" ? "Sem." : "Wk.",
          locale === "es" ? "Nave" : "Vessel",
          locale === "es" ? "Operador" : "Operator",
          locale === "es" ? "Viaje" : "Voyage",
          `POL\nETD`,
          ...destinations.map((d) => `${d}\nETA / TT`),
        ];

        const body = list.map((it) => {
          const escalas = (it.escalas ?? []).filter((e) => (e.area || "").trim() === area);
          return [
            it.semana != null ? String(it.semana) : "—",
            it.nave || "—",
            it.operador || it.naviera || "—",
            it.viaje || "—",
            `${it.pol || "—"}\n${formatDate(it.etd)}`,
            ...destinations.map((portKey) => {
              const e = escalas.find((esc) => ((esc.puerto_nombre || esc.puerto) || "—") === portKey);
              if (!e) return "—";
              const eta = e.eta ? formatDate(e.eta) : "—";
              const tt = e.dias_transito != null ? `${e.dias_transito}d` : "";
              return tt ? `${eta}\n${tt}` : eta;
            }),
          ];
        });

        const columnStyles: Record<number, object> = {};
        baseCols.forEach((w, i) => {
          columnStyles[i] = { cellWidth: w, halign: i === 0 ? "center" : "left" };
        });
        destinations.forEach((_, i) => {
          columnStyles[baseCols.length + i] = { cellWidth: destColW, halign: "center", fillColor: DEST_BG };
        });

        autoTable(doc, {
          head: [head],
          body,
          startY: y,
          margin: { left: margin, right: margin },
          tableWidth: pageW - margin * 2,
          styles: {
            fontSize: 7,
            cellPadding: { top: 2, bottom: 2, left: 2, right: 2 },
            lineColor: BORDER_COLOR,
            lineWidth: 0.15,
            valign: "middle",
            overflow: "linebreak",
            font: "helvetica",
            textColor: TEXT_DARK,
          },
          headStyles: {
            fillColor: BRAND_BLUE,
            textColor: WHITE,
            fontStyle: "bold",
            fontSize: 7,
            halign: "center",
            valign: "middle",
            cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
            lineColor: BRAND_BLUE,
          },
          alternateRowStyles: { fillColor: ROW_ALT },
          columnStyles,
          didParseCell: (data) => {
            if (data.section === "body" && data.column.index >= baseCols.length) {
              data.cell.styles.fillColor = data.row.index % 2 === 0 ? DEST_BG : DEST_ALT;
            }
            if (data.section === "body" && data.column.index === 0) {
              data.cell.styles.fontStyle = "bold";
              data.cell.styles.textColor = BRAND_BLUE;
            }
          },
          didDrawPage: () => { drawPageHeader(); },
        });

        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;
      }
      y += 3; // extra gap between areas
    }
  }

  // Footers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(i, totalPages);
  }

  const areaSlug = selectedArea && selectedArea !== "ALL" ? `-${selectedArea.toLowerCase()}` : "";
  doc.save(`itinerarios${areaSlug}-${format(now, "yyyy-MM-dd")}.pdf`);
}
