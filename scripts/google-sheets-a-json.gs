/**
 * Google Apps Script — Hoja → JSON (desde cero)
 *
 * Instalación:
 * 1. Abre tu Google Sheet → Extensiones → Apps Script.
 * 2. Borra el contenido de Code.gs y pega TODO este archivo (o copia las funciones).
 * 3. Guarda. Recarga la hoja: aparecerá el menú "JSON".
 *
 * Uso:
 * - Primera fila = nombres de campos (ej. cliente, booking, etd).
 * - Desde la fila 2 = datos. Celdas vacías no se agregan al objeto de esa fila.
 *
 * Documento de migración en la raíz del repo EMBARQUES:
 * - Archivo: `migracion 12-04-2026.json` (nombre en NOMBRE_ARCHIVO_JSON).
 * - Formato: el mismo cuerpo que acepta POST /api/admin/import-operaciones-migracion:
 *   { "rows": [ { ...operación }, ... ] }
 * - La fila 1 de la hoja debe usar nombres de columnas como en public.operaciones
 *   (ver GET en ese endpoint o src/lib/import/operacionesMigracion.ts).
 */

/**
 * Nombre exacto de la pestaña. En español suele ser "Hoja 1"; en inglés "Sheet1".
 * Cadena vacía "" = siempre la pestaña que tengas seleccionada al ejecutar el menú.
 */
var NOMBRE_HOJA = "Hoja 1";

/**
 * Nombre del .json al usar "Guardar JSON en Drive" (y convención al copiar al repo).
 * Sin ruta: solo el nombre del archivo.
 */
var NOMBRE_ARCHIVO_JSON = "migracion 12-04-2026.json";

function obtenerHoja_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var n = String(NOMBRE_HOJA || "").trim();
  if (n) {
    var h = ss.getSheetByName(n);
    if (h) return h;
    var existentes = ss.getSheets().map(function (s) {
      return '"' + s.getName() + '"';
    });
    throw new Error(
      'No hay pestaña "' + n + '". En este libro están: ' + existentes.join(", ") + "."
    );
  }
  return ss.getActiveSheet();
}

/**
 * Lee la hoja indicada y devuelve un array de objetos (una fila = un objeto).
 * @returns {Array<Object>}
 */
function hojaAArrayDeObjetos() {
  var hoja = obtenerHoja_();

  var valores = hoja.getDataRange().getValues();
  if (valores.length < 2) {
    return [];
  }

  var cabeceras = valores[0].map(function (celda) {
    return String(celda).trim();
  });

  var filas = [];
  for (var i = 1; i < valores.length; i++) {
    var fila = valores[i];
    var obj = {};
    for (var j = 0; j < cabeceras.length; j++) {
      var clave = cabeceras[j];
      if (!clave) continue;
      var v = fila[j];
      if (v === "" || v === null || v === undefined) continue;
      obj[clave] = v instanceof Date ? v.toISOString() : v;
    }
    if (Object.keys(obj).length > 0) {
      filas.push(obj);
    }
  }
  return filas;
}

/**
 * Objeto listo para migración al ERP (Supabase vía API).
 * @returns {{ rows: Array<Object> }}
 */
function objetoMigracionErp() {
  return { rows: hojaAArrayDeObjetos() };
}

/**
 * JSON indentado para guardar en raíz del repo o enviar al POST de importación.
 * @returns {string}
 */
function obtenerJsonTexto() {
  return JSON.stringify(objetoMigracionErp(), null, 2);
}

/** Menú en la hoja (tras guardar el script y recargar el documento). */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("JSON")
    .addItem("Ver JSON en registros", "verJsonEnRegistros")
    .addItem("Guardar JSON en Drive", "guardarJsonEnDrive")
    .addToUi();
}

function verJsonEnRegistros() {
  var texto = obtenerJsonTexto();
  Logger.log(texto);
  SpreadsheetApp.getUi().alert('Listo. Menú Ver → Registros (o Ctrl+Enter en el editor del script).');
}

function guardarJsonEnDrive() {
  var texto = obtenerJsonTexto();
  var nombre = String(NOMBRE_ARCHIVO_JSON || "").trim() || "migracion.json";
  var archivo = DriveApp.createFile(nombre, texto, MimeType.PLAIN_TEXT);
  SpreadsheetApp.getUi().alert(
    "Archivo en Drive: " + nombre + "\n\nDescárgalo a la raíz del repo EMBARQUES (mismo nombre que en Drive)."
  );
  return archivo.getUrl();
}
