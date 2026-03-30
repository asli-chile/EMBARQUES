/**
 * Generador de PDF para itinerarios de naves.
 * Usa jsPDF + jspdf-autotable. Agrupa por región → servicio.
 */
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import type { ItinerarioWithEscalas } from "@/types/itinerarios";
import { withBase } from "@/lib/basePath";

const BRAND_BLUE: [number, number, number] = [0, 82, 155];
const WHITE: [number, number, number] = [255, 255, 255];
const ROW_ALT: [number, number, number] = [245, 249, 255];
const DEST_BG: [number, number, number] = [235, 245, 255];
const DEST_ALT: [number, number, number] = [219, 234, 254];
const BORDER_COLOR: [number, number, number] = [210, 222, 240];
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
    const resp = await fetch(withBase("/logoblanco.png"));
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

  // ── Filtrar y agrupar: byArea[area][naviera][service] = rows ─────────────
  const todayRows = itinerarios.filter((it) => {
    if (!it.etd?.trim()) return false;
    const d = new Date(it.etd.includes("T") ? it.etd : `${it.etd}T12:00:00`);
    return !isNaN(d.getTime()) && d >= todayStart;
  });

  // Map<area, Map<naviera, Map<service, rows[]>>>
  const byArea = new Map<string, Map<string, Map<string, ItinerarioWithEscalas[]>>>();
  for (const it of todayRows) {
    const escalas = it.escalas ?? [];
    const areas = new Set<string>(escalas.map((e) => (e.area || "").trim() || "").filter(Boolean));
    if (areas.size === 0) areas.add("—");
    for (const area of areas) {
      if (selectedArea && selectedArea !== "ALL" && area !== selectedArea) continue;
      if (!byArea.has(area)) byArea.set(area, new Map());
      const navMap = byArea.get(area)!;
      const navKey = (it.naviera || "—").trim();
      if (!navMap.has(navKey)) navMap.set(navKey, new Map());
      const svcMap = navMap.get(navKey)!;
      const svcKey = (it.servicio || "—").trim();
      const list = svcMap.get(svcKey) ?? [];
      list.push(it);
      svcMap.set(svcKey, list);
    }
  }

  // Sort each service list by ETD asc, cap at MAX
  for (const navMap of byArea.values()) {
    for (const svcMap of navMap.values()) {
      for (const [k, list] of svcMap) {
        list.sort((a, b) => (a.etd ? new Date(a.etd).getTime() : Infinity) - (b.etd ? new Date(b.etd).getTime() : Infinity));
        svcMap.set(k, list.slice(0, MAX_ROWS_PER_SERVICE));
      }
    }
  }

  const sortedAreas = [
    ...AREA_ORDER.filter((a) => byArea.has(a)),
    ...[...byArea.keys()].filter((a) => !AREA_ORDER.includes(a)).sort(),
  ];
  const totalRows = [...byArea.values()].reduce((s, navMap) =>
    s + [...navMap.values()].reduce((s2, svcMap) =>
      s2 + [...svcMap.values()].reduce((s3, l) => s3 + l.length, 0), 0), 0);

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
    doc.setFontSize(9.5);
    doc.setTextColor(...WHITE);
    doc.text(locale === "es" ? "Itinerarios de Naves" : "Ship Itineraries", textX, 10);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(170, 210, 255);
    const filterLabel = selectedArea && selectedArea !== "ALL"
      ? `${AREA_LABELS[selectedArea] ?? selectedArea}`
      : locale === "es" ? "Todas las áreas" : "All areas";
    doc.text(filterLabel, textX, 17);

    // Right: date + count
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...WHITE);
    doc.text(format(now, "dd/MM/yyyy"), pageW - margin, 10, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(170, 210, 255);
    doc.text(`${totalRows} ${locale === "es" ? "registros" : "records"}`, pageW - margin, 17, { align: "right" });
  };

  // ── Footer ────────────────────────────────────────────────────────────────
  const drawFooter = (pageNum: number, totalPages: number) => {
    doc.setDrawColor(...BORDER_COLOR);
    doc.setLineWidth(0.25);
    doc.line(margin, pageH - 7, pageW - margin, pageH - 7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(`${locale === "es" ? "Pág." : "Page"} ${pageNum} / ${totalPages}`, margin, pageH - 3.5);
    doc.text(COMPANY_NAME, pageW / 2, pageH - 3.5, { align: "center" });
    doc.text(format(now, "dd/MM/yyyy"), pageW - margin, pageH - 3.5, { align: "right" });
  };

  drawPageHeader();
  let y = HEADER_H + 4;

  if (totalRows === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(
      locale === "es" ? "No hay itinerarios con ETD pendiente." : "No itineraries with pending ETD.",
      pageW / 2, pageH / 2, { align: "center" }
    );
  } else {
    for (const [areaIndex, area] of sortedAreas.entries()) {
      const navMap = byArea.get(area)!;
      const sortedNavieras = [...navMap.keys()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
      const areaColor = AREA_COLORS[area] ?? BRAND_BLUE;
      const areaLabel = AREA_LABELS[area] ?? area;
      const totalNavieras = sortedNavieras.length;

      // ── Cada región empieza en hoja nueva (excepto la primera) ─────────
      if (areaIndex > 0) { doc.addPage(); drawPageHeader(); y = HEADER_H + 4; }

      const bannerH = 9;
      const bannerMidY = y + bannerH / 2 + 0.9; // baseline centrada verticalmente (7pt cap ≈ 1.73mm → offset ~0.87)
      doc.setFillColor(...areaColor);
      doc.roundedRect(margin, y, pageW - margin * 2, bannerH, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...WHITE);
      // Centrar etiqueta de área horizontalmente
      doc.text(areaLabel.toUpperCase(), margin + (pageW - margin * 2) / 2, bannerMidY, { align: "center" });
      const areaCount = `${totalNavieras} ${totalNavieras === 1 ? (locale === "es" ? "naviera" : "carrier") : (locale === "es" ? "navieras" : "carriers")}`;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(5);
      doc.setTextColor(210, 228, 250);
      doc.text(areaCount, pageW - margin - 4, bannerMidY, { align: "right" });
      y += bannerH + 2;

      // ── Servicios (barra única naviera + servicio combinados) ───────────
      for (const naviera of sortedNavieras) {
        const svcMap = navMap.get(naviera)!;
        const serviceNames = [...svcMap.keys()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

        for (const servicioNombre of serviceNames) {
          const list = svcMap.get(servicioNombre)!;
          if (list.length === 0) continue;

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

          // ── Barra única combinada (naviera + servicio en una sola fila) ─
          const svcBarH = 9;

          // Estimar altura total del bloque
          const EST_HEAD_H = 10;
          const EST_ROW_H = 6;
          const estServiceH = svcBarH + 0.5 + EST_HEAD_H + list.length * EST_ROW_H + 4;
          const usablePage = pageH - margin - HEADER_H;
          if (y + estServiceH > pageH - margin && estServiceH <= usablePage) {
            doc.addPage(); drawPageHeader(); y = HEADER_H + 4;
          } else if (y > pageH - 40) {
            doc.addPage(); drawPageHeader(); y = HEADER_H + 4;
          }

          const barMidY = y + svcBarH / 2 + 0.9;
          // Fondo navy oscuro
          doc.setFillColor(25, 48, 95);
          doc.rect(margin, y, pageW - margin * 2, svcBarH, "F");
          // Acento de color de región a la izquierda
          doc.setFillColor(...areaColor);
          doc.rect(margin, y, 3, svcBarH, "F");
          // Naviera — bold, blanco, prominente
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7);
          doc.setTextColor(...WHITE);
          doc.text(naviera, margin + 6, barMidY);
          // Separador + nombre de servicio — más tenue
          const navieraW = doc.getTextWidth(naviera);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(5.5);
          doc.setTextColor(160, 195, 240);
          doc.text(`  ·  ${servicioNombre}`, margin + 6 + navieraW, barMidY);
          // "servicio / consorcio" a la derecha
          doc.setFontSize(4.5);
          doc.setTextColor(100, 150, 210);
          doc.text(locale === "es" ? "servicio / consorcio" : "service / consortium", pageW - margin - 3, barMidY, { align: "right" });
          y += svcBarH + 0.5;

          // Column widths: Sem | Nave | Viaje | POL+ETD | destinations...
          const availableW = pageW - margin * 2;
          const destCount = destinations.length;
          const BASE_COLS_COUNT = 4;
          const rawBase  = [9, 28, 13, 24];         // Sem | Nave | Viaje | POL+ETD (naturales)
          const minBase  = [8, 22, 11, 20];         // mínimos absolutos — nunca comprimir más
          const rawBaseTotal = rawBase.reduce((a, b) => a + b, 0); // 74mm
          const minBaseTotal = minBase.reduce((a, b) => a + b, 0); // 61mm
          const MIN_DEST_W = 16;

          let baseCols: number[];
          let destColW: number;
          if (destCount === 0) {
            baseCols = rawBase.map((w) => w * (availableW / rawBaseTotal));
            destColW = 0;
          } else {
            const idealDestTotal = destCount * MIN_DEST_W;
            const baseAvail = availableW - idealDestTotal;
            if (baseAvail >= rawBaseTotal) {
              // Espacio suficiente — base a tamaño natural
              baseCols = rawBase.slice();
              destColW = (availableW - rawBaseTotal) / destCount;
            } else if (baseAvail >= minBaseTotal) {
              // Comprimir base proporcionalmente pero respetando mínimos
              const scale = baseAvail / rawBaseTotal;
              baseCols = rawBase.map((w, i) => Math.max(minBase[i], w * scale));
              destColW = (availableW - baseCols.reduce((a, b) => a + b, 0)) / destCount;
            } else {
              // Demasiados destinos: usar mínimos absolutos
              baseCols = minBase.slice();
              destColW = Math.max(MIN_DEST_W, (availableW - minBaseTotal) / destCount);
            }
          }

          const head: string[] = [
            locale === "es" ? "Sem." : "Wk.",
            locale === "es" ? "Nave" : "Vessel",
            locale === "es" ? "Viaje" : "Voyage",
            `POL / ETD`,
            ...destinations.map((d) => `${d}\nETA / TT`),
          ];

          const body = list.map((it) => {
            const escalas = (it.escalas ?? []).filter((e) => (e.area || "").trim() === area);
            return [
              it.semana != null ? String(it.semana) : "—",
              it.nave || "—",
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
            columnStyles[i] = { cellWidth: w, halign: "center", overflow: "ellipsis" };
          });
          destinations.forEach((_, i) => {
            columnStyles[BASE_COLS_COUNT + i] = { cellWidth: destColW, halign: "center" };
          });

          autoTable(doc, {
            head: [head],
            body,
            startY: y,
            margin: { left: margin, right: margin },
            tableWidth: pageW - margin * 2,
            styles: {
              fontSize: 5.5,
              cellPadding: { top: 1.5, bottom: 1.5, left: 2, right: 2 },
              lineColor: BORDER_COLOR,
              lineWidth: 0.15,
              valign: "middle",
              overflow: "linebreak",
              font: "helvetica",
              textColor: TEXT_DARK,
            },
            headStyles: {
              fillColor: [30, 58, 110] as [number, number, number],
              textColor: WHITE,
              fontStyle: "bold",
              fontSize: 5,
              halign: "center",
              valign: "middle",
              cellPadding: { top: 2, bottom: 2, left: 1.5, right: 1.5 },
              lineColor: [20, 45, 90] as [number, number, number],
              overflow: "linebreak",
            },
            alternateRowStyles: { fillColor: ROW_ALT },
            columnStyles,
            didParseCell: (data) => {
              if (data.section === "body" && data.column.index >= BASE_COLS_COUNT) {
                data.cell.styles.fillColor = data.row.index % 2 === 0 ? DEST_BG : DEST_ALT;
              }
              if (data.section === "body" && data.column.index === 0) {
                data.cell.styles.fontStyle = "bold";
                data.cell.styles.textColor = BRAND_BLUE;
                data.cell.styles.halign = "center";
              }
              if (data.section === "head" && data.column.index >= BASE_COLS_COUNT) {
                data.cell.styles.fillColor = [20, 70, 160] as [number, number, number];
                // Smaller font + tighter padding so port names wrap at spaces, not mid-word
                data.cell.styles.fontSize = 4.5;
                data.cell.styles.cellPadding = { top: 1.5, bottom: 1.5, left: 1, right: 1 };
              }
            },
            didDrawPage: () => { drawPageHeader(); },
          });

          y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 3;
        }
        y += 4; // gap between navieras
      }
      y += 3; // gap between areas
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
