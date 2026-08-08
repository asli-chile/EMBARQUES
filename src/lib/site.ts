import { brand, icons } from "./brand";

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
  ] as const,
  sidebarItems: [
    { labelKey: "dashboard", id: "dashboard", href: "/dashboard" },
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
        { labelKey: "papeleraTransportes", id: "papelera-transportes", href: "/transportes/papelera" },
      ],
    },
    {
      labelKey: "documentos",
      id: "documentos",
      children: [
        { labelKey: "misDocumentos", id: "mis-documentos", href: "/documentos/mis-documentos" },
      ],
    },
    { labelKey: "registros", id: "registros", href: "/registros" },
    {
      labelKey: "configuracion",
      id: "configuracion",
      adminAndAbove: true,
      children: [
        { labelKey: "usuarios", id: "usuarios", href: "/configuracion/usuarios" },
        { labelKey: "clientes", id: "clientes", href: "/configuracion/clientes" },
        { labelKey: "asignarClientesEmpresas", id: "asignar-clientes-empresas", href: "/configuracion/asignar-clientes-empresas" },
        { labelKey: "configuracionTransportes", id: "configuracion-transportes", href: "/configuracion/transportes" },
        { labelKey: "consignatarios", id: "consignatarios", href: "/configuracion/consignatarios" },
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
