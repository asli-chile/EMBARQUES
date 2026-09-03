import { brand, icons } from "./brand";
import { CARTOLAS_NUBOX_ALLOWED_EMAILS } from "./cartolas-nubox-access";

/** @deprecated Usar withBase("/inicio") para el logo del header dentro del ERP. */
export const marketingHomeUrl = "/" as const;

export const siteConfig = {
  logo: brand.logo,
  companyTitle: brand.companyTitle,
  navItems: [
    { labelKey: "inicio", href: "/inicio" },
    { labelKey: "servicios", href: "/servicios" },
    { labelKey: "sobreNosotros", href: "/sobre-nosotros" },
    { labelKey: "tracking", href: "/tracking" },
  ] as const,
  sidebarItems: [
    { labelKey: "dashboard", id: "dashboard", href: "/dashboard", operational: true },
    { labelKey: "tareas", id: "tareas", href: "/tareas", staffOnly: true },
    {
      labelKey: "reservas",
      id: "reservas",
      children: [
        { labelKey: "crearReserva", id: "crear-reserva", href: "/reservas/crear", operational: true },
        { labelKey: "misReservas", id: "mis-reservas", href: "/reservas/mis-reservas", operational: true },
        { labelKey: "papelera", id: "papelera", href: "/reservas/papelera", staffOnly: true },
      ],
    },
    {
      labelKey: "transportes",
      id: "transportes",
      staffOnly: true,
      children: [
        { labelKey: "reservaAsli", id: "reserva-asli", href: "/transportes/reserva-asli", staffOnly: true },
        { labelKey: "reservaExt", id: "reserva-ext", href: "/transportes/reserva-ext", staffOnly: true },
        { labelKey: "papeleraTransportes", id: "papelera-transportes", href: "/transportes/papelera", staffOnly: true },
      ],
    },
    {
      labelKey: "documentos",
      id: "documentos",
      children: [
        { labelKey: "misDocumentos", id: "mis-documentos", href: "/documentos/mis-documentos", operational: true },
      ],
    },
    { labelKey: "registros", id: "registros", href: "/registros", staffOnly: true },
    {
      labelKey: "comunicaciones",
      id: "comunicaciones",
      staffOnly: true,
      children: [
        {
          labelKey: "informativos",
          id: "informativos",
          href: "/comunicaciones/informativos",
          staffOnly: true,
        },
      ],
    },
    {
      labelKey: "cartolasNubox",
      id: "cartolas-nubox",
      href: "/cartolas-nubox",
      allowedEmails: [...CARTOLAS_NUBOX_ALLOWED_EMAILS],
    },
    {
      labelKey: "configuracion",
      id: "configuracion",
      adminAndAbove: true,
      children: [
        { labelKey: "usuarios", id: "usuarios", href: "/configuracion/usuarios" },
        { labelKey: "clientes", id: "clientes", href: "/configuracion/clientes" },
        { labelKey: "asignarClientesEmpresas", id: "asignar-clientes-empresas", href: "/configuracion/asignar-clientes-empresas" },
        { labelKey: "asignarEjecutivos", id: "asignar-ejecutivos", href: "/configuracion/asignar-ejecutivos" },
        { labelKey: "configuracionTransportes", id: "configuracion-transportes", href: "/configuracion/transportes" },
        { labelKey: "consignatarios", id: "consignatarios", href: "/configuracion/consignatarios" },
        { labelKey: "formatosDocumentos", id: "formatos-documentos", href: "/configuracion/formatos-documentos" },
        { labelKey: "temporadas", id: "temporadas", href: "/configuracion/temporadas", superadminOnly: true },
      ],
    },
    { labelKey: "tracking", id: "tracking", href: "/tracking" },
  ],
  authIcon: icons.auth,
  /** Contacto para solicitar usuario y contraseña en la plataforma */
  accessRequest: {
    email: "rodrigo.caceres@asli.cl",
    phone: "+56 9 6839 4225",
    mailtoSubject: "Solicitud de acceso EMBARQUES",
  },
  user: {
    name: "Usuario",
    email: "usuario@ejemplo.com",
    level: "Administrador",
  },
} as const;
