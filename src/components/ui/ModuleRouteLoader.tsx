import { useLocale } from "@/lib/i18n";
import { brand } from "@/lib/brand";

/**
 * Fallback de Suspense al cargar chunks lazy de cada ruta (AppShell).
 * Estilo alineado a la marca: logo ASLI, tarjeta suave, animación CSS (sin GSAP).
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
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute -left-[12%] -top-[18%] h-[90%] w-[95%] animate-module-loader-bg rounded-full opacity-90 blur-3xl sm:blur-[72px]"
          style={{
            background:
              "radial-gradient(ellipse 72% 58% at 48% 42%, rgba(29, 78, 216, 0.2), transparent 72%)",
          }}
        />
        <div
          className="absolute -bottom-[22%] -right-[18%] h-[80%] w-[90%] animate-module-loader-bg-reverse rounded-full opacity-90 blur-3xl sm:blur-[64px]"
          style={{
            background:
              "radial-gradient(ellipse 68% 56% at 58% 48%, rgba(13, 148, 136, 0.16), transparent 70%)",
          }}
        />
        <svg
          className="absolute bottom-0 left-[-8%] h-14 w-[116%] min-w-[640px] text-brand-blue/20 animate-module-loader-wave sm:h-[4.25rem]"
          viewBox="0 0 1200 100"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 52 C 200 42 280 62 400 52 S 600 38 800 52 S 1000 62 1200 48"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d="M0 68 C 180 78 320 58 520 68 S 720 82 920 68 S 1080 58 1200 72"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.15"
            strokeLinecap="round"
            className="text-brand-teal/30"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 px-8 py-10 sm:py-12 max-w-sm w-full mx-4 rounded-2xl border border-neutral-200/90 bg-white/85 backdrop-blur-sm shadow-[0_24px_60px_-16px_rgba(29,78,216,0.18)] transition-[box-shadow] duration-500">
        <div className="flex flex-col items-center gap-5">
          <img
            src={brand.logo}
            alt={brand.companyShort}
            width={200}
            height={56}
            className="h-12 sm:h-14 w-auto max-w-[min(220px,85vw)] object-contain object-center drop-shadow-sm animate-module-loader-ship"
            decoding="async"
            fetchPriority="high"
          />

          <div className="flex items-end justify-center gap-1.5 h-8 w-full max-w-[7rem]" aria-hidden>
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
