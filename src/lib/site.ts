import { brand, icons } from "./brand";
import { CARTOLAS_NUBOX_ALLOWED_EMAILS } from "./cartolas-nubox-access";

/** Inicio del sitio web corporativo (fuera de la app /embarques). Usar en el logo del header. */
export const marketingHomeUrl = "/" as const;

export const siteConfig = {
  logo: brand.logo,
  companyTitle: brand.companyTitle,
  navItems: [
    { labelKey: "inicio", href: "/inicio" },
    { labelKey: "servicios", href: "/servicios" },
    { labelKey: "sobreNosotros", href: "/sobre-nosotros" },
    { labelKey: "tracking", href: "/tracking" },
    { labelKey: "itinerario", href: "/itinerario" },
    { labelKey: "stacking", href: "/stacking" },
  ] as const,
  sidebarItems: [
    {
      labelKey: "reservas",
      id: "reservas",
      children: [
        { labelKey: "crearReserva", id: "crear-reserva", href: "/reservas/crear" },
        { labelKey: "misReservas", id: "mis-reservas", href: "/reservas/mis-reservas" },
        { labelKey: "papelera", id: "papelera", href: "/reservas/papelera" },
      ],
    },
    {
      labelKey: "transportes",
      id: "transportes",
      children: [
        { labelKey: "reservaAsli", id: "reserva-asli", href: "/transportes/reserva-asli" },
        { labelKey: "reservaExt", id: "reserva-ext", href: "/transportes/reserva-ext" },
        { labelKey: "facturacion", id: "facturacion", href: "/transportes/facturacion" },
      ],
    },
    {
      labelKey: "documentos",
      id: "documentos",
      children: [
        { labelKey: "misDocumentos", id: "mis-documentos", href: "/documentos/mis-documentos" },
        { labelKey: "crearInstructivo", id: "crear-instructivo", href: "/documentos/crear-instructivo", ejecutivoAndAbove: true },
        { labelKey: "crearProforma", id: "crear-proforma", href: "/documentos/crear-proforma", ejecutivoAndAbove: true },
      ],
    },
    {
      labelKey: "comunicaciones",
      id: "comunicaciones",
      children: [
        {
          labelKey: "correoInformativo",
          id: "correo-informativo",
          href: "/comunicaciones/correo-informativo",
          ejecutivoAndAbove: true,
        },
      ],
    },
    { labelKey: "reportes", id: "reportes", href: "/reportes" },
    { labelKey: "finanzas", id: "finanzas", href: "/finanzas" },
    {
      labelKey: "cartolasNubox",
      id: "cartolas-nubox",
      href: "/cartolas-nubox",
      allowedEmails: [...CARTOLAS_NUBOX_ALLOWED_EMAILS],
    },
    { labelKey: "dashboard", id: "dashboard", href: "/dashboard" },
    { labelKey: "registros", id: "registros", href: "/registros" },
    {
      labelKey: "configuracion",
      id: "configuracion",
      superadminOnly: true,
      children: [
        { labelKey: "usuarios", id: "usuarios", href: "/configuracion/usuarios" },
        { labelKey: "clientes", id: "clientes", href: "/configuracion/clientes" },
        { labelKey: "asignarClientesEmpresas", id: "asignar-clientes-empresas", href: "/configuracion/asignar-clientes-empresas" },
        { labelKey: "configuracionTransportes", id: "configuracion-transportes", href: "/configuracion/transportes" },
        { labelKey: "consignatarios", id: "consignatarios", href: "/configuracion/consignatarios" },
        { labelKey: "formatosDocumentos", id: "formatos-documentos", href: "/configuracion/formatos-documentos" },
        { labelKey: "itinerarios", id: "itinerarios-sub", superadminOnly: true },
      ],
    },
  ],
  authIcon: icons.auth,
  user: {
    name: "Usuario",
    email: "usuario@ejemplo.com",
    level: "Administrador",
  },
} as const;
