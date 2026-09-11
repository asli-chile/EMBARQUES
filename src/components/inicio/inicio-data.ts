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

export const pillars = [
  {
    key: "pillarOperations" as const,
    descKey: "pillarOperationsDesc" as const,
    icon: "lucide:ship",
    features: ["pillarOperationsF1", "pillarOperationsF2", "pillarOperationsF3", "pillarOperationsF4"] as const,
  },
  {
    key: "pillarTransport" as const,
    descKey: "pillarTransportDesc" as const,
    icon: "lucide:truck",
    features: ["pillarTransportF1", "pillarTransportF2", "pillarTransportF3", "pillarTransportF4"] as const,
  },
  {
    key: "pillarDocuments" as const,
    descKey: "pillarDocumentsDesc" as const,
    icon: "lucide:file-check",
    features: ["pillarDocumentsF1", "pillarDocumentsF2", "pillarDocumentsF3", "pillarDocumentsF4"] as const,
  },
  {
    key: "pillarFinance" as const,
    descKey: "pillarFinanceDesc" as const,
    icon: "lucide:bar-chart-3",
    features: ["pillarFinanceF1", "pillarFinanceF2", "pillarFinanceF3", "pillarFinanceF4"] as const,
  },
] as const;

export const stats = [
  { valueKey: "stat1Value" as const, labelKey: "stat1Label" as const, icon: "lucide:package-check" },
  { valueKey: "stat2Value" as const, labelKey: "stat2Label" as const, icon: "lucide:clock" },
  { valueKey: "stat3Value" as const, labelKey: "stat3Label" as const, icon: "lucide:shield-check" },
  { valueKey: "stat4Value" as const, labelKey: "stat4Label" as const, icon: "lucide:file-check" },
] as const;

export const comparisons = [
  { beforeKey: "comparison1Before" as const, afterKey: "comparison1After" as const },
  { beforeKey: "comparison2Before" as const, afterKey: "comparison2After" as const },
  { beforeKey: "comparison3Before" as const, afterKey: "comparison3After" as const },
  { beforeKey: "comparison4Before" as const, afterKey: "comparison4After" as const },
  { beforeKey: "comparison5Before" as const, afterKey: "comparison5After" as const },
] as const;

export const workflowSteps = [
  { key: "workflowStep1" as const, descKey: "workflowStep1Desc" as const, icon: "lucide:calendar-plus", num: "01" },
  { key: "workflowStep2" as const, descKey: "workflowStep2Desc" as const, icon: "lucide:truck", num: "02" },
  { key: "workflowStep3" as const, descKey: "workflowStep3Desc" as const, icon: "lucide:boxes", num: "03" },
  { key: "workflowStep4" as const, descKey: "workflowStep4Desc" as const, icon: "lucide:ship", num: "04" },
  { key: "workflowStep5" as const, descKey: "workflowStep5Desc" as const, icon: "lucide:file-check", num: "05" },
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
