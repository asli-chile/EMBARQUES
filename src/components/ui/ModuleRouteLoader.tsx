import { useLocale } from "@/lib/i18n";

/**
 * Fallback de Suspense al cargar chunks lazy de cada ruta (AppShell).
 * Estilo alineado a la marca: azul institucional, tarjeta suave, animación CSS (sin GSAP).
 */
export function ModuleRouteLoader() {
  const { t } = useLocale();

  return (
    <main
      className="flex-1 min-h-0 min-w-0 overflow-auto flex items-center justify-center bg-gradient-to-b from-neutral-50 via-neutral-100 to-neutral-100/95 relative"
      role="main"
      style={{ minHeight: "120px" }}
      aria-busy="true"
      aria-live="polite"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(29, 78, 216, 0.14), transparent), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(13, 148, 136, 0.08), transparent)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-6 px-8 py-10 sm:py-12 max-w-sm w-full mx-4 rounded-2xl border border-neutral-200/90 bg-white/85 backdrop-blur-sm shadow-[0_24px_60px_-16px_rgba(29,78,216,0.18)] transition-[box-shadow] duration-500">
        <div className="flex flex-col items-center gap-5" aria-hidden>
          <svg
            width="120"
            height="56"
            viewBox="0 0 120 56"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-brand-blue animate-module-loader-ship drop-shadow-sm"
          >
            <path
              d="M8 38h104v4H8v-4z"
              className="fill-neutral-200"
            />
            <path
              d="M14 26h14v10H14V26zm22 0h14v10H36V26zm22 0h14v10H58V26z"
              className="fill-brand-blue/85"
            />
            <path
              d="M12 20h52v6H12v-6z"
              className="fill-brand-blue/25"
            />
            <path
              d="M4 42c18 4 36 4 54 0s36-4 54 0"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="text-brand-teal/40"
            />
          </svg>

          <div className="flex items-end justify-center gap-1.5 h-8 w-full max-w-[7rem]">
            <span
              className="w-2 rounded-sm bg-brand-blue animate-module-loader-bar"
              style={{ height: "1.35rem", animationDelay: "0ms" }}
            />
            <span
              className="w-2 rounded-sm bg-brand-teal animate-module-loader-bar"
              style={{ height: "1.35rem", animationDelay: "140ms" }}
            />
            <span
              className="w-2 rounded-sm bg-brand-blue animate-module-loader-bar"
              style={{ height: "1.35rem", animationDelay: "280ms" }}
            />
          </div>
        </div>

        <p className="text-sm font-medium text-neutral-600 text-center tracking-tight m-0 px-2">
          {t.header.preparingUi}
        </p>

        <div
          className="h-1 w-full max-w-[11rem] rounded-full bg-neutral-200/90 overflow-hidden"
          aria-hidden
        >
          <div className="h-full w-2/5 rounded-full bg-gradient-to-r from-brand-blue via-brand-teal to-brand-blue bg-[length:200%_100%] animate-module-loader-rail" />
        </div>
      </div>
    </main>
  );
}
