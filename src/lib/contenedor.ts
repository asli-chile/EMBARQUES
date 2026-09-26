/**
 * Formato único del número de contenedor: 4 letras, 6 dígitos, guion y dígito
 * verificador. "seku 1234567" → "SEKU123456-7".
 *
 * Es la misma regla que `public.normalizar_contenedor` en la base
 * (migración 20260925000003), que la impone con un trigger en cada guardado.
 * Aquí sirve para que el usuario vea el formato antes de guardar; si se cambia
 * una, cambiar la otra.
 *
 * Se corrige cada contenedor que aparezca en el texto y el resto se deja como
 * está, porque el campo admite varios separados por `|`, `,`, `;` o salto de
 * línea (Registros los muestra por separado). Lo que no se reconoce como
 * contenedor solo pasa a mayúsculas: no se le inventa un guion.
 */
const CONTENEDOR = /\b([A-Z]{4})[ .-]*(\d{6})[ .-]*(\d)\b/g;

export function normalizarContenedor(valor: string): string;
export function normalizarContenedor(valor: string | null | undefined): string | null | undefined;
export function normalizarContenedor(valor: string | null | undefined): string | null | undefined {
  if (valor == null) return valor;
  return valor.trim().toUpperCase().replace(CONTENEDOR, "$1$2-$3");
}
