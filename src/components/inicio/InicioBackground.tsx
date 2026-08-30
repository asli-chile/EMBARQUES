import { useEffect, useState } from "react";
import { shouldUseHeavyVisualEffects } from "@/lib/ui/devicePerf";

export function InicioBackground({ parallaxRef }: { parallaxRef: React.RefObject<HTMLDivElement | null> }) {
  const [heavy, setHeavy] = useState(false);

  useEffect(() => {
    setHeavy(shouldUseHeavyVisualEffects());
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden min-h-[100dvh] w-full">
      <div ref={parallaxRef} className="absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-brand-cream" />

        {heavy ? (
          <>
            <div
              className="inicio-aurora absolute -top-[15%] -left-[10%] h-[60%] w-[55%] opacity-45 blur-[110px]"
              style={{ background: "radial-gradient(circle, rgba(0,122,123,0.16) 0%, transparent 70%)" }}
            />
            <div
              className="inicio-aurora absolute -bottom-[20%] -right-[8%] h-[55%] w-[50%] opacity-40 blur-[110px]"
              style={{
                background: "radial-gradient(circle, rgba(17,34,78,0.12) 0%, transparent 70%)",
                animationDelay: "-6s",
              }}
            />
            <div
              className="inicio-aurora absolute top-[35%] right-[18%] h-[30%] w-[28%] opacity-30 blur-[90px]"
              style={{
                background: "radial-gradient(circle, rgba(102,153,0,0.14) 0%, transparent 70%)",
                animationDelay: "-12s",
              }}
            />
          </>
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(0,122,123,0.1) 0%, transparent 70%)" }}
          />
        )}
      </div>

      <div className="inicio-noise absolute inset-0 opacity-60" />
    </div>
  );
}
