/**
 * Números de configuración, leídos sin sorpresas.
 *
 * El patrón `Number(import.meta.env.X ?? 360)` tiene una trampa: `??` solo
 * actúa sobre null y undefined, y una variable **definida pero vacía** es la
 * cadena `""`. `Number("")` es **0**, no 360.
 *
 * En este módulo un cero no es un valor raro, es un desastre silencioso:
 *
 *   NAVITRACK_AIS_TTL_MIN = ""    el caché caduca al instante y cada pantalla
 *                                 que se abre gasta un crédito
 *   NAVITRACK_AIS_MAX_DIA = ""    el tope diario es cero: nada funciona
 *   NAVITRACK_CHEQUEO_MAX = ""    el cron no revisa ninguna nave y no avisa
 *
 * Y dejar una variable vacía es de lo más fácil que hay: en el panel de Vercel
 * basta crear la fila y no escribir el valor. Nada avisa.
 *
 * Por eso esta función ignora lo vacío y lo que no sea un número válido, y
 * devuelve el valor por defecto.
 */
export function numeroDeEntorno(bruto: unknown, porDefecto: number): number {
  if (bruto == null) return porDefecto;
  const texto = String(bruto).trim();
  if (!texto) return porDefecto;
  const n = Number(texto);
  // Un negativo tampoco tiene sentido en ninguno de estos ajustes.
  return Number.isFinite(n) && n >= 0 ? n : porDefecto;
}

/**
 * Valor de entorno leído también en tiempo de ejecución.
 *
 * Astro sustituye `import.meta.env.X` **durante la compilación**: si la
 * variable no existía cuando Vercel construyó, queda grabada como `undefined`
 * y ya no hay forma de que aparezca, por más veces que se redespliegue
 * reutilizando la caché de build.
 *
 * Eso convierte "agregué la variable y redesplegué" en un fallo silencioso muy
 * difícil de ver desde afuera: el endpoint responde 403 como si el secreto
 * estuviera mal, cuando en realidad nunca llegó a existir dentro del paquete.
 *
 * `process.env` sí se lee cuando la función corre, así que sirve de red: se
 * intenta primero lo compilado y después lo del entorno vivo.
 */
export function textoDeEntorno(compilado: unknown, nombre: string): string {
  const inline = typeof compilado === "string" ? compilado.trim() : "";
  if (inline) return inline;
  try {
    return (process.env?.[nombre] ?? "").trim();
  } catch {
    return "";
  }
}
