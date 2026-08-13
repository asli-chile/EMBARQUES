/**
 * Fallback de Suspense al cambiar de módulo.
 * Fondo y hero alineados a moduleStyles — sin pantalla navy (evita el pestañeo).
 */
export function ModuleSoftFallback() {
  return (
    <main
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#D9E3F2]"
      role="main"
      aria-busy="true"
      aria-live="polite"
      aria-label="Cargando módulo"
    >
      <div className="flex-shrink-0 bg-gradient-to-br from-brand-blue via-[#0d1c42] to-brand-dark-teal px-4 sm:px-6 pt-5 pb-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 shrink-0 rounded-lg bg-white/15 border border-white/20" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-7 w-40 max-w-[55%] rounded-md bg-white/20" />
            <div className="h-4 w-28 max-w-[40%] rounded-md bg-white/12" />
          </div>
        </div>
      </div>
      <div className="flex-shrink-0 border-b border-brand-blue/15 bg-[#E8F0FA]/95 px-3 sm:px-4 py-3">
        <div className="flex flex-wrap gap-2">
          <div className="h-10 w-24 rounded-lg bg-brand-blue/10" />
          <div className="h-10 w-28 rounded-lg bg-brand-blue/10" />
          <div className="h-10 w-20 rounded-lg bg-brand-blue/10" />
        </div>
      </div>
      <div className="min-h-0 flex-1 p-3 sm:p-4">
        <div className="h-full min-h-[200px] rounded-xl border border-brand-blue/15 bg-white/80 shadow-sm" />
      </div>
    </main>
  );
}
