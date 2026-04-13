/**
 * Google Apps Script — Hoja 1 → JSON (y opcional envío al ERP EMBARQUES)
 *
 * Cómo usar:
 * 1. En tu hoja de cálculo: Extensiones → Apps Script.
 * 2. Pega este archivo (o su contenido) en Code.gs.
 * 3. Menú: Ejecutar una vez `configurarPropiedades_()` y edita Propiedades del script
 *    (icono engranaje → Propiedades del proyecto → Propiedades del script) o vuelve a ejecutar
 *    con los valores en la función indicada abajo.
 * 4. Primera fila de "Hoja 1" = cabeceras en snake_case (cliente, booking, etd, …).
 *
 * Funciones de menú (tras guardar y recargar la hoja):
 * - ERP migración: sacar JSON al log
 * - ERP migración: guardar JSON en Drive (archivo)
 * - ERP migración: dry-run al servidor
 * - ERP migración: importar al servidor
 */

/** Nombre exacto de la pestaña (por defecto en español). */
var NOMBRE_HOJA = "Hoja 1";

/** Claves en Propiedades del script (Proyecto → icono engranaje → Propiedades del script). */
var PROP_URL_IMPORT = "ERP_IMPORT_URL";
var PROP_SECRET = "ERP_MIGRATION_SECRET";

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("ERP migración")
    .addItem("Sacar JSON (ver Registros / Logger)", "mostrarJsonEnLog_")
    .addItem("Guardar JSON en Drive", "guardarJsonEnDrive_")
    .addSeparator()
    .addItem("Dry-run al servidor (no inserta)", "enviarDryRunAlServidor_")
    .addItem("Importar al servidor (inserta)", "enviarImportAlServidor_")
    .addSeparator()
    .addItem("Descargar guía JSON del servidor (GET)", "descargarGuiaDesdeServidor_")
    .addToUi();
}

/**
 * Ejecuta una vez: define URL del POST y el secreto (o hazlo a mano en Propiedades del script).
 * Ejemplo URL: https://tu-dominio.cl/embarques/api/admin/import-operaciones-migracion
 */
function configurarPropiedades_() {
  var props = PropertiesService.getScriptProperties();
  props.setProperties(
    {
      ERP_IMPORT_URL: "https://CAMBIA/embarques/api/admin/import-operaciones-migracion",
      ERP_MIGRATION_SECRET: "CAMBIA_POR_MIGRATION_IMPORT_SECRET_MIN_16_CHARS",
    },
    true
  );
  SpreadsheetApp.getUi().alert("Propiedades guardadas. Revisa que URL y secreto sean correctos.");
}

function obtenerUrlImport_() {
  var u = PropertiesService.getScriptProperties().getProperty(PROP_URL_IMPORT);
  if (!u) throw new Error('Falta propiedad del script "' + PROP_URL_IMPORT + '". Ejecuta configurarPropiedades_().');
  return u;
}

function obtenerSecret_() {
  var s = PropertiesService.getScriptProperties().getProperty(PROP_SECRET);
  if (!s || String(s).length < 16) {
    throw new Error('Falta o es corto "' + PROP_SECRET + '" (mín. 16 caracteres, igual que MIGRATION_IMPORT_SECRET en el servidor).');
  }
  return s;
}

/**
 * Lee la hoja y devuelve { rows: [ { col: valor, ... }, ... ] }.
 * Fila 1 = cabeceras; desde fila 2 = datos. Celdas vacías se omiten en cada objeto.
 */
function construirPayloadDesdeHoja() {
  var hoja = SpreadsheetApp.getActive().getSheetByName(NOMBRE_HOJA);
  if (!hoja) throw new Error('No existe la pestaña "' + NOMBRE_HOJA + '".');

  var datos = hoja.getDataRange().getValues();
  if (datos.length < 2) {
    return { rows: [] };
  }

  var cabeceras = datos[0].map(function (c) {
    return String(c).trim();
  });

  var rows = [];
  for (var r = 1; r < datos.length; r++) {
    var obj = {};
    for (var c = 0; c < cabeceras.length; c++) {
      var clave = cabeceras[c];
      if (!clave) continue;
      var valor = datos[r][c];
      if (valor === "" || valor === null || valor === undefined) continue;
      obj[clave] = valor;
    }
    if (Object.keys(obj).length) rows.push(obj);
  }

  return { rows: rows };
}

/** Muestra el JSON en Logger (Ver → Registros) y en el registro de ejecución. */
function mostrarJsonEnLog_() {
  var payload = construirPayloadDesdeHoja();
  var texto = JSON.stringify(payload, null, 2);
  Logger.log(texto);
  SpreadsheetApp.getUi().alert("Listo. Abre Ver → Registros (icono lista) y copia el JSON.");
}

/**
 * Crea un archivo en Drive con el JSON (misma cuenta que la hoja).
 * @returns {string} URL del archivo
 */
function guardarJsonEnDrive_() {
  var payload = construirPayloadDesdeHoja();
  var nombre =
    "embarques-migracion-" +
    Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd-HHmmss") +
    ".json";
  var archivo = DriveApp.createFile(nombre, JSON.stringify(payload, null, 2), MimeType.PLAIN_TEXT);
  SpreadsheetApp.getUi().alert("Archivo creado en Drive:\n" + archivo.getUrl());
  return archivo.getUrl();
}

function postJsonAlServidor_(bodyObj) {
  var url = obtenerUrlImport_();
  var secret = obtenerSecret_();
  var resp = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json; charset=utf-8",
    muteHttpExceptions: true,
    headers: { Authorization: "Bearer " + secret },
    payload: JSON.stringify(bodyObj),
  });
  var code = resp.getResponseCode();
  var text = resp.getContentText();
  Logger.log("HTTP " + code);
  Logger.log(text);
  return { code: code, text: text };
}

/** Envía las filas con dryRun: no inserta; devuelve filas normalizadas. */
function enviarDryRunAlServidor_() {
  var base = construirPayloadDesdeHoja();
  if (!base.rows.length) {
    SpreadsheetApp.getUi().alert("No hay filas de datos (solo cabecera o hoja vacía).");
    return;
  }
  var out = postJsonAlServidor_({ dryRun: true, rows: base.rows });
  SpreadsheetApp.getUi().alert("HTTP " + out.code + "\n\nRevisa Ver → Registros para el JSON completo.");
}

/** Inserta en Supabase vía el ERP. */
function enviarImportAlServidor_() {
  var ui = SpreadsheetApp.getUi();
  var confirm = ui.alert(
    "¿Importar al ERP?",
    "Se insertarán " + construirPayloadDesdeHoja().rows.length + " operaciones. ¿Continuar?",
    ui.ButtonSet.YES_NO
  );
  if (confirm !== ui.Button.YES) return;

  var base = construirPayloadDesdeHoja();
  if (!base.rows.length) {
    ui.alert("No hay filas de datos.");
    return;
  }
  var out = postJsonAlServidor_({ rows: base.rows });
  ui.alert("HTTP " + out.code + "\n\nRevisa Ver → Registros para el detalle (insertadas / errores).");
}

/** GET: guía JSON del endpoint (columnas, ejemplos). */
function descargarGuiaDesdeServidor_() {
  var url = obtenerUrlImport_();
  var secret = obtenerSecret_();
  var resp = UrlFetchApp.fetch(url, {
    method: "get",
    muteHttpExceptions: true,
    headers: { Authorization: "Bearer " + secret },
  });
  Logger.log("HTTP " + resp.getResponseCode());
  Logger.log(resp.getContentText());
  SpreadsheetApp.getUi().alert("Guía recibida. Ver → Registros para el JSON.");
}
