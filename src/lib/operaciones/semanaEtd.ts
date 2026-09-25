/**
 * Semana ISO del ETD ("WK ETD").
 *
 * Se calcula siempre desde `etd` y no se lee de `operaciones.semana`: esa
 * columna se llenaba a mano y quedaba vacía o desfasada cuando el zarpe se
 * corría. Registros y la ficha de Mis Reservas usan esta misma función para
 * que las dos pantallas nunca digan semanas distintas.
 *
 * Acepta `2026-10-01` (columna `date`) o un ISO con hora; toma solo la fecha,
 * así la zona horaria no puede mover el día.
 */
export function semanaIsoDeFecha(value: string | null | undefined): number | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value).trim());
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (Number.isNaN(d.getTime())) return null;
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
