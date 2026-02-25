import { brand, icons } from "./brand";

export const siteConfig = {
  logo: brand.logo,
  companyTitle: brand.companyTitle,
  navItems: [
    { labelKey: "inicio", href: "/inicio" },
    { labelKey: "servicios", href: "/servicios" },
    { labelKey: "sobreNosotros", href: "/sobre-nosotros" },
    { labelKey: "tracking", href: "/tracking" },
    { labelKey: "itinerario", href: "/itinerario" },
  ] as const,
  sidebarItems: [
    { labelKey: "dashboard", id: "dashboard", href: "/dashboard" },
    { labelKey: "registros", id: "registros", href: "/registros" },
    { labelKey: "cliente", id: "cliente", href: "/cliente" },
    { labelKey: "reportes", id: "reportes", href: "/reportes" },
    { labelKey: "finanzas", id: "finanzas", href: "/finanzas" },
    {
      labelKey: "reservas",
      id: "reservas",
      children: [
        { labelKey: "crearReserva", id: "crear-reserva", href: "/reservas/crear" },
        { labelKey: "misReservas", id: "mis-reservas", href: "/reservas/mis-reservas" },
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
        { labelKey: "crearInstructivo", id: "crear-instructivo", href: "/documentos/crear-instructivo" },
        { labelKey: "crearProforma", id: "crear-proforma", href: "/documentos/crear-proforma" },
      ],
    },
    {
      labelKey: "configuracion",
      id: "configuracion",
      children: [
        { labelKey: "clientes", id: "clientes", href: "/configuracion/clientes" },
        { labelKey: "formatosDocumentos", id: "formatos-documentos", href: "/configuracion/formatos-documentos" },
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
