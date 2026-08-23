/** Vuelve atrás en el historial del navegador o redirige al fallback si no hay historial previo. */
export function goBackOr(fallbackHref: string): void {
  if (typeof window === "undefined") return;
  if (window.history.length > 1) {
    window.history.back();
    return;
  }
  window.location.assign(fallbackHref);
}
