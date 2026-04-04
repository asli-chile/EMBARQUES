/**
 * Utilidades de calendario sin date-fns (evita chunks / pre-bundling de Vite que fallan con "Outdated Optimize Dep").
 * Comportamiento alineado con date-fns para fechas locales de formulario (yyyy-MM-dd, dd/MM/yyyy).
 */

/** Fecha local → yyyy-MM-dd */
export function formatIsoDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Fecha local → dd/MM/yyyy */
export function formatDisplayDateLocal(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const y = d.getFullYear();
  return `${day}/${m}/${y}`;
}

/** Igual que date-fns differenceInCalendarDays(left, right): días de calendario left − right */
export function differenceInCalendarDays(left: Date, right: Date): number {
  const L = Date.UTC(left.getFullYear(), left.getMonth(), left.getDate());
  const R = Date.UTC(right.getFullYear(), right.getMonth(), right.getDate());
  return Math.round((L - R) / 86400000);
}

export function addDays(d: Date, amount: number): Date {
  const out = new Date(d.getTime());
  out.setDate(out.getDate() + amount);
  return out;
}

/** Semana ISO 8601 (misma convención que date-fns getISOWeek para componentes de fecha local). */
export function getISOWeek(d: Date): number {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7,
    )
  );
}
