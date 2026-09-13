export interface KpiData {
  operacionesTotal: number;
  contenedoresHistoricos: number;
  operacionesMesActual: number;
  operacionesMesAnterior: number;
  operacionesCompletadas: number;
}

export const emptyKpiData = (): KpiData => ({
  operacionesTotal: 0,
  contenedoresHistoricos: 0,
  operacionesMesActual: 0,
  operacionesMesAnterior: 0,
  operacionesCompletadas: 0,
});

/**
 * Los cuatro módulos del sistema, contados a quien todavía no entra.
 *
 * En el orden en que el exportador los vive: reserva la carga, arma los
 * documentos, sigue el barco y controla la operación. No es el orden del menú
 * ni el del organigrama; es el del trabajo.
 *
 * Llevan acento de color como los atajos de adentro, para que la visita
 * reconozca el módulo cuando lo vea con sesión iniciada.
 */
export const pillars = [
  {
    key: "pillarReserva" as const,
    descKey: "pillarReservaDesc" as const,
    icon: "lucide:package",
    mark: "lucide:ship",
    accent: "teal" as const,
    features: ["pillarReservaF1", "pillarReservaF2", "pillarReservaF3", "pillarReservaF4"] as const,
  },
  {
    key: "pillarDocumentacion" as const,
    descKey: "pillarDocumentacionDesc" as const,
    icon: "lucide:file-text",
    mark: "lucide:files",
    accent: "amber" as const,
    features: [
      "pillarDocumentacionF1",
      "pillarDocumentacionF2",
      "pillarDocumentacionF3",
      "pillarDocumentacionF4",
    ] as const,
  },
  {
    key: "pillarSeguimiento" as const,
    descKey: "pillarSeguimientoDesc" as const,
    icon: "lucide:radar",
    mark: "lucide:map",
    accent: "violet" as const,
    features: [
      "pillarSeguimientoF1",
      "pillarSeguimientoF2",
      "pillarSeguimientoF3",
      "pillarSeguimientoF4",
    ] as const,
  },
  {
    key: "pillarOperaciones" as const,
    descKey: "pillarOperacionesDesc" as const,
    icon: "lucide:layout-dashboard",
    mark: "lucide:bar-chart-3",
    accent: "blue" as const,
    features: [
      "pillarOperacionesF1",
      "pillarOperacionesF2",
      "pillarOperacionesF3",
      "pillarOperacionesF4",
    ] as const,
  },
] as const;

export const stats = [
  { valueKey: "stat1Value" as const, labelKey: "stat1Label" as const, icon: "lucide:package-check", accent: "teal" as const },
  { valueKey: "stat2Value" as const, labelKey: "stat2Label" as const, icon: "lucide:clock", accent: "amber" as const },
  { valueKey: "stat3Value" as const, labelKey: "stat3Label" as const, icon: "lucide:shield-check", accent: "violet" as const },
  { valueKey: "stat4Value" as const, labelKey: "stat4Label" as const, icon: "lucide:file-check", accent: "blue" as const },
] as const;

/**
 * Los cuatro módulos que se le muestran a una visita.
 *
 * Mismo lenguaje visual que los atajos del inicio con sesión —acento de color,
 * marca de agua y pie— porque son lo mismo visto desde afuera: lo que esta
 * persona va a usar cuando entre. Enseñarle una versión apagada de lo que
 * después será otra cosa no ayuda a nadie.
 *
 * No llevan a la ruta: abren el formulario de acceso. Mandar a una visita a una
 * pantalla que el guard va a rebotar es prometer algo que no se cumple.
 */
export const guestModules = [
  {
    key: "guestModDashboard" as const,
    descKey: "guestModDashboardDesc" as const,
    footKey: "guestModDashboardFoot" as const,
    icon: "lucide:layout-dashboard",
    mark: "lucide:bar-chart-3",
    accent: "blue" as const,
  },
  {
    key: "guestModReservas" as const,
    descKey: "guestModReservasDesc" as const,
    footKey: "guestModReservasFoot" as const,
    icon: "lucide:package",
    mark: "lucide:ship",
    accent: "teal" as const,
  },
  {
    key: "guestModSeguimiento" as const,
    descKey: "guestModSeguimientoDesc" as const,
    footKey: "guestModSeguimientoFoot" as const,
    icon: "lucide:radar",
    mark: "lucide:map",
    accent: "violet" as const,
  },
  {
    key: "guestModDocumentos" as const,
    descKey: "guestModDocumentosDesc" as const,
    footKey: "guestModDocumentosFoot" as const,
    icon: "lucide:file-text",
    mark: "lucide:files",
    accent: "amber" as const,
  },
] as const;

export const quickLinks = [
  {
    key: "quickDashboard" as const,
    descKey: "quickDashboardDesc" as const,
    footKey: "quickDashboardFoot" as const,
    href: "/dashboard",
    icon: "lucide:layout-dashboard",
    mark: "lucide:bar-chart-3",
    accent: "blue" as const,
  },
  {
    key: "quickCreate" as const,
    descKey: "quickCreateDesc" as const,
    footKey: "quickCreateFoot" as const,
    href: "/reservas/crear",
    icon: "lucide:plus",
    mark: "lucide:ship",
    accent: "teal" as const,
  },
  {
    key: "quickRecords" as const,
    descKey: "quickRecordsDesc" as const,
    footKey: "quickRecordsFoot" as const,
    href: "/registros",
    icon: "lucide:table-2",
    mark: "lucide:rows-3",
    accent: "violet" as const,
  },
  {
    key: "quickDocument" as const,
    descKey: "quickDocumentDesc" as const,
    footKey: "quickDocumentFoot" as const,
    href: "/documentos/mis-documentos",
    icon: "lucide:file-text",
    mark: "lucide:files",
    accent: "amber" as const,
  },
  {
    key: "quickTransport" as const,
    descKey: "quickTransportDesc" as const,
    footKey: "quickTransportFoot" as const,
    href: "/transportes/reserva-asli",
    icon: "lucide:truck",
    mark: "lucide:container",
    accent: "sky" as const,
  },
  {
    key: "quickTracking" as const,
    descKey: "quickTrackingDesc" as const,
    footKey: "quickTrackingFoot" as const,
    href: "/tracking",
    icon: "lucide:ship",
    mark: "lucide:globe-2",
    accent: "cyan" as const,
  },
] as const;

export const clientQuickLinks = [
  {
    key: "quickDashboard" as const,
    descKey: "quickDashboardDesc" as const,
    footKey: "quickDashboardFoot" as const,
    href: "/dashboard",
    icon: "lucide:layout-dashboard",
    mark: "lucide:bar-chart-3",
    accent: "blue" as const,
  },
  {
    key: "quickCreate" as const,
    descKey: "quickCreateDesc" as const,
    footKey: "quickCreateFoot" as const,
    href: "/reservas/crear",
    icon: "lucide:plus",
    mark: "lucide:ship",
    accent: "teal" as const,
  },
  {
    key: "quickReservas" as const,
    descKey: "quickReservasDesc" as const,
    footKey: "quickReservasFoot" as const,
    href: "/reservas/mis-reservas",
    icon: "lucide:package",
    mark: "lucide:warehouse",
    accent: "violet" as const,
  },
  {
    key: "quickDocument" as const,
    descKey: "quickDocumentDesc" as const,
    footKey: "quickDocumentFoot" as const,
    href: "/documentos/mis-documentos",
    icon: "lucide:file-text",
    mark: "lucide:files",
    accent: "amber" as const,
  },
  {
    key: "quickTracking" as const,
    descKey: "quickTrackingDesc" as const,
    footKey: "quickTrackingFoot" as const,
    href: "/tracking",
    icon: "lucide:ship",
    mark: "lucide:globe-2",
    accent: "cyan" as const,
  },
] as const;

export const kpiConfig = [
  {
    key: "kpiOperations" as const,
    descKey: "kpiOperationsDesc" as const,
    dataKey: "operacionesTotal" as const,
    icon: "lucide:ship",
    accent: "blue" as const,
  },
  {
    key: "kpiContainers" as const,
    descKey: "kpiContainersDesc" as const,
    dataKey: "contenedoresHistoricos" as const,
    icon: "lucide:container",
    accent: "violet" as const,
  },
  {
    key: "kpiMonth" as const,
    descKey: "kpiMonthDesc" as const,
    dataKey: "operacionesMesActual" as const,
    icon: "lucide:calendar-range",
    compareKey: "operacionesMesAnterior" as const,
    accent: "emerald" as const,
  },
  {
    key: "kpiCompleted" as const,
    descKey: "kpiCompletedDesc" as const,
    dataKey: "operacionesCompletadas" as const,
    icon: "lucide:check-circle-2",
    accent: "rose" as const,
  },
] as const;

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}
