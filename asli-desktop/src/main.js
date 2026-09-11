/**
 * Splash local. En release, Rust comprueba updates y luego navega al ERP
 * con `WebviewWindow::navigate`. Este timeout es solo respaldo si el shell
 * no llega a navegar (p. ej. fallo silencioso del updater).
 */
const ERP_URL = "https://www.asli.cl/embarques/";

setTimeout(() => {
  const bust = Date.now();
  window.location.replace(`${ERP_URL}?desktop=${bust}`);
}, 45_000);
