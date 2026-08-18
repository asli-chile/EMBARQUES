/** Efectos pesados (canvas/GSAP) solo en desktop con buena conexión. */
export function shouldUseHeavyVisualEffects(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  if (window.matchMedia("(max-width: 767px)").matches) return false;
  const connection = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  if (connection?.saveData) return false;
  if (connection?.effectiveType === "2g" || connection?.effectiveType === "slow-2g") return false;
  return true;
}

export function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
}
