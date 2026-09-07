/**
 * Página local de respaldo. En producción la ventana abre
 * https://www.asli.cl/embarques/ directo (tauri.conf.json).
 * En `tauri dev` se usa http://localhost:4321/embarques.
 */
const ERP_FALLBACK = "https://www.asli.cl/embarques/";

window.location.replace(ERP_FALLBACK);
