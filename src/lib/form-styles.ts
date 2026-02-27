/**
 * Clases Tailwind para formularios — alineadas con docs/ESTILOS-VISUALES.md
 * Evita duplicación entre LoginForm, RegistroForm y otros formularios.
 */

export const formStyles = {
  input:
    "w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-brand-blue placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
  label:
    "block text-xs font-medium text-neutral-600 uppercase tracking-wider mb-1.5",
  submitButton:
    "w-full py-3 px-4 rounded-lg bg-brand-blue text-white font-medium hover:bg-brand-blue/90 focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:ring-offset-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
  card:
    "bg-white/95 backdrop-blur-xl rounded-2xl shadow-mac-modal p-6 border border-black/5",
  successMessage: "mb-4 p-3 rounded-lg bg-emerald-50 text-emerald-800 text-sm",
  errorMessage: "mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm",
} as const;
