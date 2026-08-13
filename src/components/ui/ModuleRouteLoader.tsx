import { useLocale } from "@/lib/i18n";
import { brand } from "@/lib/brand";

/**
 * Fallback de Suspense al cargar chunks lazy de cada ruta (AppShell).
 * Lenguaje visual alineado a Inicio: navy profundo, glass, logo blanco.
 */
export function ModuleRouteLoader() {
  const { t } = useLocale();

  return (
    <main
      className="relative flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center overflow-hidden bg-[#070f1f]"
      role="main"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute inset-0 bg-gradient-to-br from-brand-blue via-[#0a1a33] to-[#041018]" />
        <div
          className="animate-module-loader-bg absolute -left-[18%] -top-[22%] h-[75%] w-[70%] rounded-full opacity-50 blur-[100px]"
          style={{
            background: "radial-gradient(circle, rgba(0,122,123,0.45) 0%, transparent 68%)",
          }}
        />
        <div
          className="animate-module-loader-bg-reverse absolute -bottom-[28%] -right-[12%] h-[65%] w-[60%] rounded-full opacity-40 blur-[90px]"
          style={{
            background:
              "radial-gradient(circle, rgba(29,78,216,0.55) 0%, rgba(0,122,123,0.18) 42%, transparent 70%)",
          }}
        />
        <div
          className="animate-module-loader-bg absolute top-[28%] right-[18%] h-[32%] w-[28%] rounded-full opacity-25 blur-[70px]"
          style={{
            background: "radial-gradient(circle, rgba(102,153,0,0.35) 0%, transparent 70%)",
            animationDelay: "-8s",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.045]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.55) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.55) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse 75% 65% at 50% 40%, black 15%, transparent 100%)",
          }}
        />

        <svg
          className="absolute bottom-0 left-[-8%] h-16 w-[116%] min-w-[640px] overflow-visible text-brand-teal/25 sm:h-[4.5rem]"
          viewBox="0 0 1200 100"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <g className="animate-module-loader-wave-a">
            <path
              d="M0 52 C 200 42 280 62 400 52 S 600 38 800 52 S 1000 62 1200 48"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </g>
          <g className="animate-module-loader-wave-b">
            <path
              d="M0 68 C 180 78 320 58 520 68 S 720 82 920 68 S 1080 58 1200 72"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              className="text-white/15"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        </svg>
      </div>

      <div className="animate-module-loader-enter relative z-10 mx-4 flex w-full max-w-[22rem] flex-col items-center gap-7 rounded-[1.75rem] border border-white/12 bg-white/[0.06] px-8 py-11 shadow-[0_28px_80px_-20px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-xl sm:py-12">
        <div className="relative flex h-[5.5rem] w-[5.5rem] items-center justify-center">
          <span
            className="animate-module-loader-ring absolute inset-0 rounded-full border border-brand-teal/35"
            aria-hidden
          />
          <span
            className="animate-module-loader-ring-slow absolute -inset-2 rounded-full border border-dashed border-white/15"
            aria-hidden
          />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-br from-white/12 to-white/[0.03] shadow-inner">
            <img
              src={brand.logoWhite}
              alt={brand.companyShort}
              width={120}
              height={48}
              className="h-8 w-auto max-w-[4.5rem] object-contain object-center animate-module-loader-ship"
              decoding="async"
              fetchPriority="high"
            />
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 text-center">
          <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-teal">
            EMBARQUES
          </p>
          <p className="m-0 px-2 text-sm font-medium tracking-tight text-white/80">
            {t.header.preparingUi}
          </p>
        </div>

        <div className="flex w-full flex-col items-center gap-3">
          <div
            className="h-1 w-full max-w-[12rem] overflow-hidden rounded-full bg-white/10"
            aria-hidden
          >
            <div className="animate-module-loader-rail h-full w-2/5 rounded-full bg-gradient-to-r from-brand-blue via-brand-teal to-brand-blue bg-[length:200%_100%]" />
          </div>
          <div className="flex items-end justify-center gap-1.5 h-6" aria-hidden>
            <span
              className="w-1.5 rounded-full bg-brand-teal/90 animate-module-loader-bar"
              style={{ height: "1.1rem", animationDelay: "0ms" }}
            />
            <span
              className="w-1.5 rounded-full bg-white/70 animate-module-loader-bar"
              style={{ height: "1.1rem", animationDelay: "120ms" }}
            />
            <span
              className="w-1.5 rounded-full bg-brand-teal/90 animate-module-loader-bar"
              style={{ height: "1.1rem", animationDelay: "240ms" }}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
