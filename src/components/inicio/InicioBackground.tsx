import { useEffect, useState } from "react";
import { shouldUseHeavyVisualEffects } from "@/lib/ui/devicePerf";

export function InicioBackground({ parallaxRef }: { parallaxRef: React.RefObject<HTMLDivElement | null> }) {
  const [heavy, setHeavy] = useState(false);

  useEffect(() => {
    setHeavy(shouldUseHeavyVisualEffects());
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 min-h-[100dvh] w-full overflow-hidden">
      <div ref={parallaxRef} className="absolute inset-0" aria-hidden>
        {/* El fondo base lo pinta `.inicio-surface`; aquí solo auroras */}
        {heavy ? (
          <>
            <div
              className="inicio-aurora absolute -left-[10%] -top-[15%] h-[60%] w-[55%] opacity-50 blur-[110px]"
              style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--inicio-teal) 28%, transparent) 0%, transparent 70%)" }}
            />
            <div
              className="inicio-aurora absolute -bottom-[20%] -right-[8%] h-[55%] w-[50%] opacity-40 blur-[110px]"
              style={{
                background: "radial-gradient(circle, color-mix(in srgb, var(--inicio-hot) 18%, transparent) 0%, transparent 70%)",
                animationDelay: "-6s",
              }}
            />
            <div
              className="inicio-aurora absolute right-[18%] top-[35%] h-[30%] w-[28%] opacity-30 blur-[90px]"
              style={{
                background: "radial-gradient(circle, rgba(80,120,255,0.2) 0%, transparent 70%)",
                animationDelay: "-12s",
              }}
            />
          </>
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 80% 50% at 50% 0%, color-mix(in srgb, var(--inicio-teal) 16%, transparent) 0%, transparent 70%)",
            }}
          />
        )}
      </div>

      <div className="inicio-noise absolute inset-0" />
    </div>
  );
}
