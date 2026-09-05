/** Íconos Lucide por id de `siteConfig.sidebarItems`. */
export const SIDEBAR_ICONS: Record<string, string> = {
  dashboard: "lucide:layout-dashboard",
  tareas: "lucide:list-checks",
  reservas: "lucide:calendar-plus",
  "crear-reserva": "lucide:plus-circle",
  "mis-reservas": "lucide:folder-open",
  papelera: "lucide:trash-2",
  transportes: "lucide:truck",
  "reserva-asli": "lucide:ship",
  "reserva-ext": "lucide:container",
  "papelera-transportes": "lucide:trash-2",
  documentos: "lucide:file-text",
  "mis-documentos": "lucide:files",
  registros: "lucide:table",
  comunicaciones: "lucide:megaphone",
  informativos: "lucide:mail",
  "cartolas-nubox": "lucide:wallet-cards",
  configuracion: "lucide:settings",
  usuarios: "lucide:users",
  clientes: "lucide:building-2",
  "asignar-clientes-empresas": "lucide:link",
  "asignar-ejecutivos": "lucide:user-cog",
  "configuracion-transportes": "lucide:sliders-horizontal",
  consignatarios: "lucide:handshake",
  "formatos-documentos": "lucide:file-stack",
  temporadas: "lucide:calendar-range",
  tracking: "lucide:map",
};

export function sidebarIconFor(id: string): string {
  return SIDEBAR_ICONS[id] ?? "lucide:circle";
}
