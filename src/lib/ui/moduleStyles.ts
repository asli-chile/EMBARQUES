/**
 * Clases visuales compartidas del ERP (estilo Mis Reservas / Dashboard).
 * Fondo tintado azul + tipografía legible + acentos brand-blue.
 */

export const modulePageBg = "bg-[#D9E3F2]";

export const moduleHero =
  "flex-shrink-0 bg-gradient-to-br from-brand-blue via-[#0d1c42] to-brand-dark-teal text-white";

export const moduleHeroRounded =
  "rounded-2xl bg-gradient-to-br from-brand-blue via-[#0d1c42] to-brand-dark-teal text-white overflow-hidden shadow-sm";

export const moduleToolbar =
  "flex-shrink-0 bg-[#E8F0FA]/95 border-b border-brand-blue/15 backdrop-blur-md";

export const moduleCard =
  "bg-white rounded-2xl border border-brand-blue/15 shadow-sm overflow-hidden";

export const moduleCardAccent =
  "h-[3px] bg-gradient-to-r from-brand-blue to-brand-teal";

export const moduleLabel =
  "block text-base font-semibold text-brand-blue mb-1.5";

export const moduleInput =
  "w-full px-3.5 py-3 border border-brand-blue/20 bg-[#F4F8FC] rounded-lg text-base text-brand-blue placeholder:text-brand-blue/40 focus:outline-none focus:ring-2 focus:ring-brand-blue/25 focus:border-brand-blue focus:bg-white transition-all";

export const moduleBtnPrimary =
  "inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-base font-semibold bg-brand-blue text-white hover:bg-brand-blue/90 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/40";

/** Botón blanco sobre hero navy (no combinar con moduleBtnPrimary: text-white gana en Tailwind). */
export const moduleBtnOnHero =
  "inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-base font-semibold bg-white text-brand-blue hover:bg-white/90 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-white/40";

export const moduleBtnSecondary =
  "inline-flex items-center gap-1.5 px-3.5 py-2.5 border border-brand-blue/20 bg-[#F4F8FC] hover:bg-white rounded-lg text-base font-semibold text-brand-blue/80 transition-colors";

export const moduleSectionTitle =
  "text-base font-bold text-brand-blue tracking-wide";

export const moduleMetaText = "text-base text-neutral-600";
