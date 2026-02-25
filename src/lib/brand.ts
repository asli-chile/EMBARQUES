/**
 * EMBARQUES — Identidad visual e imagen de marca
 *
 * Fuente única de verdad para todo lo visual del proyecto.
 * Usar como receta al crear nuevos elementos para mantener congruencia.
 */

// ─── LOGOS Y MARCA ─────────────────────────────────────────────────────────

export const brand = {
  /** Logo principal (header, auth layout) */
  logo: "/LOGO ASLI SIN FONDO AZUL.png",
  /** Logo en blanco — fondo oscuro, página de inicio */
  logoWhite: "/LOGO ASLI SIN FONDO BLANCO.png",
  /** Nombre de la empresa */
  companyTitle: "Asesorias y Servicios Logisticos Integrales Ltda.",
} as const;

// ─── TIPOGRAFÍA ─────────────────────────────────────────────────────────────

export const typography = {
  /** Familia principal: Open Sans (configurada en layout con --font-open-sans) */
  fontFamily: "var(--font-open-sans)" as const,
  /** Clase Tailwind para body */
  fontSans: "font-sans",
  /** Antialiasing en body */
  antialiased: "antialiased",
} as const;

// ─── COLORES (paleta de marca + gris) ────────────────────────────────────────

/** Icono para mostrar muestra de color (círculo relleno — usar con color: hex) */
export const colorSwatchIcon = "typcn:media-record" as const;

export const colors = {
  /** Beige claro / Off-white — fondos sutiles, acentos (PANTONE 7604 CP) */
  cream: "#F6EEE8",
  /** Teal / Aqua — acentos, enlaces secundarios (PANTONE 7713 CP) */
  teal: "#007A7B",
  /** Teal oscuro / Azul-verde profundo — fondos, secciones (PANTONE 7469 CP) */
  darkTeal: "#003F5A",
  /** Azul marino — color principal de marca, títulos, botones (PANTONE 7463 CP) */
  navy: "#11224E",
  /** Verde oliva — acentos, estados de éxito (PANTONE 576 CP) */
  olive: "#669900",
  /** Gris neutro — texto secundario, bordes, UI (añadido a la paleta) */
  gray: "#6B7280",
  /** Rojo — errores, alertas, acciones destructivas */
  red: "#B91C1C",
  /** Clases Tailwind — brand-blue mapea a navy para compatibilidad */
  brandBlueClass: "text-brand-blue",
} as const;

/** Paleta con icono de swatch para mostrar cada color visualmente */
export const colorPalette = [
  { id: "cream", hex: colors.cream, tailwind: "brand-cream" },
  { id: "teal", hex: colors.teal, tailwind: "brand-teal" },
  { id: "darkTeal", hex: colors.darkTeal, tailwind: "brand-dark-teal" },
  { id: "navy", hex: colors.navy, tailwind: "brand-blue" },
  { id: "olive", hex: colors.olive, tailwind: "brand-olive" },
  { id: "gray", hex: colors.gray, tailwind: "brand-gray" },
  { id: "red", hex: colors.red, tailwind: "brand-red" },
] as const;

// ─── ICONOS ─────────────────────────────────────────────────────────────────

export const icons = {
  /** Set: Typicons (Iconify) — ej. typcn:key-outline, typcn:arrow-left-outline */
  set: "typcn" as const,
  /** Icono de auth / perfil — monito con candado */
  auth: "mdi:account-lock-outline" as const,
  /** Icono de muestra de color — círculo relleno, usar con color/hex para mostrar el color */
  colorSwatch: colorSwatchIcon,
} as const;

// ─── FORMAS Y RADIOS ───────────────────────────────────────────────────────

export const shapes = {
  /** Estilo cuadrado tipo Windows — priorizar rounded o rounded-sm */
  radii: {
    subtle: "rounded" as const,
    sm: "rounded-sm" as const,
    md: "rounded-lg" as const,
    lg: "rounded-xl" as const,
    xl: "rounded-2xl" as const,
    full: "rounded-full" as const,
  },
} as const;

// ─── SOMBRAS ────────────────────────────────────────────────────────────────

export const shadows = {
  md: "shadow-md",
  lg: "shadow-lg",
  /** Modales y cards destacadas — definido en tailwind.config.ts */
  modal: "shadow-mac-modal",
  modalBlur: "shadow-modal-blur",
} as const;

// ─── LAYOUT (dimensiones y fondos) ──────────────────────────────────────────

export const layout = {
  header: {
    height: 50,
    heightClass: "h-[50px] min-h-[50px]",
    bg: "bg-white",
  },
  navBanner: {
    height: 40,
    heightClass: "h-[40px] min-h-[40px]",
    bg: "bg-neutral-600",
    shadow: "shadow-md",
  },
  sidebar: {
    width: 160,
    widthClass: "w-40",
    bg: "bg-neutral-600",
    shadow: "shadow-lg",
    padding: "pt-16 pb-3 px-2",
  },
  main: {
    bg: "bg-brand-blue",
  },
} as const;

// ─── ANIMACIONES ────────────────────────────────────────────────────────────

export const animations = {
  /** Curva tipo Mac para sensación premium */
  easing: {
    smooth: "ease-out" as const,
    inOut: "ease-in-out" as const,
    bezier: "cubic-bezier(0.32, 0.72, 0, 1)" as const,
  },
  /** Clases Tailwind */
  modalIn: "animate-modal-in",
  modalOut: "animate-modal-out",
  sidebarIn: "animate-sidebar-in",
} as const;

// ─── PRINCIPIO DE DISEÑO ────────────────────────────────────────────────────

export const designPrinciple = {
  forms: "Cuadrado tipo Windows — bordes rectos o ligeramente redondeados (rounded, rounded-sm)",
  animations: "Fluidas tipo Mac — ease-out, cubic-bezier, transiciones suaves",
} as const;
