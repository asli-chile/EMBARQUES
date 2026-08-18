import { useEffect, useState } from "react";
import { AnimatedNetworkBackground } from "@/components/ui/AnimatedNetworkBackground";
import { shouldUseHeavyVisualEffects } from "@/lib/ui/devicePerf";

export function InicioBackground({ parallaxRef }: { parallaxRef: React.RefObject<HTMLDivElement | null> }) {
  const [heavy, setHeavy] = useState(false);

  useEffect(() => {
    setHeavy(shouldUseHeavyVisualEffects());
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden min-h-[100dvh] w-full">
      <div ref={parallaxRef} className="absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[#070f1f]" />
        <div className="absolute inset-0 bg-gradient-to-br from-brand-blue via-[#0a1a33] to-[#041018]" />

        {heavy ? (
          <>
            <div
              className="inicio-aurora absolute -top-[20%] -left-[10%] h-[70%] w-[65%] rounded-full opacity-40 blur-[100px]"
              style={{ background: "radial-gradient(circle, rgba(0,122,123,0.45) 0%, transparent 68%)" }}
            />
            <div
              className="inicio-aurora absolute -bottom-[25%] -right-[5%] h-[60%] w-[55%] rounded-full opacity-30 blur-[90px]"
              style={{
                background: "radial-gradient(circle, rgba(17,34,78,0.9) 0%, rgba(0,122,123,0.2) 40%, transparent 70%)",
                animationDelay: "-6s",
              }}
            />
            <div
              className="inicio-aurora absolute top-[30%] right-[15%] h-[35%] w-[30%] rounded-full opacity-25 blur-[80px]"
              style={{ background: "radial-gradient(circle, rgba(102,153,0,0.35) 0%, transparent 70%)", animationDelay: "-12s" }}
            />
          </>
        ) : (
          <div
            className="absolute inset-0 opacity-50"
            style={{ background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(0,122,123,0.28) 0%, transparent 70%)" }}
          />
        )}
      </div>

      {heavy ? <AnimatedNetworkBackground className="opacity-[0.22]" /> : null}
      <div className="absolute inset-0 bg-gradient-to-b from-[#070f1f]/20 via-transparent to-[#040810]/90" />
    </div>
  );
}
