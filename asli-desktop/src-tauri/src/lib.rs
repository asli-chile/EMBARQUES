#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(
            tauri_plugin_autostart::Builder::new()
                .app_name("ASLI Embarques")
                .build(),
        )
        .setup(|app| {
            // Siempre sin chrome nativo: el header del ERP es la barra de título.
            #[cfg(desktop)]
            {
                use tauri::Manager;
                if let Some(win) = app.get_webview_window("main") {
                    if let Err(err) = win.set_decorations(false) {
                        eprintln!("[asli-desktop] set_decorations: {err}");
                    }
                    // Maximizada al abrir (llena el monitor; sigue viéndose la barra de tareas).
                    if let Err(err) = win.maximize() {
                        eprintln!("[asli-desktop] maximize: {err}");
                    }
                }
            }

            // Registrar en el inicio de Windows (HKCU Run) si aún no está.
            #[cfg(desktop)]
            {
                use tauri_plugin_autostart::ManagerExt;
                let launcher = app.autolaunch();
                match launcher.is_enabled() {
                    Ok(true) => {}
                    Ok(false) | Err(_) => {
                        if let Err(err) = launcher.enable() {
                            eprintln!("[asli-desktop] autostart: {err}");
                        }
                    }
                }
            }

            #[cfg(not(debug_assertions))]
            {
                let handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    // Esperar a que la webview cargue; si no, el overlay no se ve.
                    tokio::time::sleep(std::time::Duration::from_millis(1800)).await;
                    if let Err(err) = run_updater(handle.clone()).await {
                        eprintln!("[asli-desktop] updater: {err}");
                        hide_update_overlay(&handle);
                        show_error_overlay(
                            &handle,
                            "No se pudo actualizar el acceso de escritorio",
                            &format!(
                                "{err}\n\nPuedes instalar a mano desde GitHub Releases (desktop-v más reciente)."
                            ),
                        );
                    }
                });
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running ASLI Embarques");
}

#[cfg(not(debug_assertions))]
fn eval_main(app: &tauri::AppHandle, script: &str) {
    use tauri::Manager;
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.set_focus();
        if let Err(err) = win.eval(script) {
            eprintln!("[asli-desktop] eval: {err}");
        }
    }
}

#[cfg(not(debug_assertions))]
fn escape_js(value: &str) -> String {
    value
        .replace('\\', "\\\\")
        .replace('\'', "\\'")
        .replace('\n', "\\n")
        .replace('\r', "")
        .replace('<', "\\u003c")
}

#[cfg(not(debug_assertions))]
fn hide_update_overlay(app: &tauri::AppHandle) {
    eval_main(
        app,
        r#"(function(){
  var el = document.getElementById('asli-desktop-update-overlay');
  if (el) el.remove();
  window.__ASLI_UPDATE_CHOICE = null;
})();"#,
    );
}

#[cfg(not(debug_assertions))]
fn show_update_overlay(app: &tauri::AppHandle, title: &str, subtitle: &str) {
    let title = escape_js(title);
    let subtitle = escape_js(subtitle);
    eval_main(
        app,
        &format!(
            r#"(function(){{
  var el = document.getElementById('asli-desktop-update-overlay');
  if (!el) {{
    el = document.createElement('div');
    el.id = 'asli-desktop-update-overlay';
    el.setAttribute('role', 'alertdialog');
    el.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(10,18,36,.72);display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;';
    el.innerHTML = '<div style="width:min(400px,92vw);background:#fff;color:#11224E;border-radius:4px;padding:22px 24px;box-shadow:0 16px 48px rgba(0,0,0,.35);text-align:center">' +
      '<div id="asli-desktop-update-title" style="font-weight:700;font-size:16px;margin-bottom:6px"></div>' +
      '<div id="asli-desktop-update-sub" style="font-size:13px;color:#5a6b85;margin-bottom:16px;line-height:1.45;white-space:pre-wrap"></div>' +
      '<div id="asli-desktop-update-progress-wrap">' +
      '<div style="height:8px;background:#e8eef5;border-radius:2px;overflow:hidden">' +
      '<div id="asli-desktop-update-bar" style="height:100%;width:2%;background:#11224E;transition:width .15s linear"></div></div>' +
      '<div id="asli-desktop-update-pct" style="margin-top:10px;font-size:12px;font-weight:600;color:#5a6b85">0%</div></div></div>';
    document.documentElement.appendChild(el);
  }}
  var t = document.getElementById('asli-desktop-update-title');
  var s = document.getElementById('asli-desktop-update-sub');
  var prog = document.getElementById('asli-desktop-update-progress-wrap');
  if (t) t.textContent = '{title}';
  if (s) s.textContent = '{subtitle}';
  if (prog) prog.style.display = 'block';
}})();"#
        ),
    );
}

#[cfg(not(debug_assertions))]
fn set_update_progress(app: &tauri::AppHandle, pct: u32) {
    let pct = pct.min(100);
    eval_main(
        app,
        &format!(
            r#"(function(){{
  var bar = document.getElementById('asli-desktop-update-bar');
  var label = document.getElementById('asli-desktop-update-pct');
  var prog = document.getElementById('asli-desktop-update-progress-wrap');
  if (prog) prog.style.display = 'block';
  if (bar) bar.style.width = '{pct}%';
  if (label) label.textContent = '{pct}%';
}})();"#
        ),
    );
}

#[cfg(not(debug_assertions))]
fn show_error_overlay(app: &tauri::AppHandle, title: &str, body: &str) {
    let title = escape_js(title);
    let body = escape_js(body);
    eval_main(
        app,
        &format!(
            r#"(function(){{
  var el = document.getElementById('asli-desktop-update-overlay');
  if (el) el.remove();
  el = document.createElement('div');
  el.id = 'asli-desktop-update-overlay';
  el.setAttribute('role', 'alertdialog');
  el.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(10,18,36,.72);display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;';
  el.innerHTML = '<div style="width:min(420px,92vw);background:#fff;color:#11224E;border-radius:4px;padding:22px 24px;box-shadow:0 16px 48px rgba(0,0,0,.35);text-align:left">' +
    '<div style="font-weight:700;font-size:16px;margin-bottom:8px">{title}</div>' +
    '<div style="font-size:13px;color:#5a6b85;line-height:1.45;white-space:pre-wrap;margin-bottom:18px">{body}</div>' +
    '<div style="text-align:right"><button id="asli-desktop-update-ok" style="appearance:none;border:0;background:#11224E;color:#fff;font-weight:600;font-size:13px;padding:10px 16px;border-radius:4px;cursor:pointer">Entendido</button></div></div>';
  document.documentElement.appendChild(el);
  document.getElementById('asli-desktop-update-ok').onclick = function(){{ el.remove(); }};
}})();"#
        ),
    );
}

/// Prompt dentro de la webview (los diálogos nativos quedan detrás sin chrome de Windows).
#[cfg(not(debug_assertions))]
async fn ask_update_in_webview(app: &tauri::AppHandle, current: &str, next: &str) -> bool {
    use tauri::Manager;

    let title = escape_js("Actualización ASLI Embarques");
    let body = escape_js(&format!(
        "Hay una nueva versión del acceso de escritorio ({current} → {next}).\n\n\
El ERP web ya se actualiza solo con cada deploy; esto solo actualiza el contenedor (.exe).\n\n\
¿Instalar ahora?"
    ));

    eval_main(
        app,
        &format!(
            r#"(function(){{
  window.__ASLI_UPDATE_CHOICE = null;
  var el = document.getElementById('asli-desktop-update-overlay');
  if (el) el.remove();
  el = document.createElement('div');
  el.id = 'asli-desktop-update-overlay';
  el.setAttribute('role', 'alertdialog');
  el.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(10,18,36,.72);display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;';
  el.innerHTML = '<div style="width:min(420px,92vw);background:#fff;color:#11224E;border-radius:4px;padding:22px 24px;box-shadow:0 16px 48px rgba(0,0,0,.35);text-align:left">' +
    '<div style="font-weight:700;font-size:16px;margin-bottom:8px">{title}</div>' +
    '<div style="font-size:13px;color:#5a6b85;line-height:1.45;white-space:pre-wrap;margin-bottom:18px">{body}</div>' +
    '<div style="display:flex;gap:10px;justify-content:flex-end">' +
    '<button id="asli-desktop-update-later" style="appearance:none;border:1px solid #d5dde8;background:#fff;color:#3d4f6f;font-weight:600;font-size:13px;padding:10px 14px;border-radius:4px;cursor:pointer">Más tarde</button>' +
    '<button id="asli-desktop-update-now" style="appearance:none;border:0;background:#11224E;color:#fff;font-weight:600;font-size:13px;padding:10px 14px;border-radius:4px;cursor:pointer">Actualizar ahora</button>' +
    '</div></div>';
  document.documentElement.appendChild(el);
  document.getElementById('asli-desktop-update-now').onclick = function(){{ window.__ASLI_UPDATE_CHOICE = true; }};
  document.getElementById('asli-desktop-update-later').onclick = function(){{ window.__ASLI_UPDATE_CHOICE = false; }};
}})();"#
        ),
    );

    let Some(win) = app.get_webview_window("main") else {
        return false;
    };

    let original_title = win.title().unwrap_or_else(|_| "ASLI Embarques".into());

    // Poll: los botones setean __ASLI_UPDATE_CHOICE; lo leemos vía document.title.
    for _ in 0..3_600 {
        tokio::time::sleep(std::time::Duration::from_millis(250)).await;
        let _ = win.eval(
            r#"(function(){
  var v = window.__ASLI_UPDATE_CHOICE;
  if (v === true) document.title = '__ASLI_UPD_1__';
  else if (v === false) document.title = '__ASLI_UPD_0__';
})()"#,
        );
        tokio::time::sleep(std::time::Duration::from_millis(30)).await;
        let title = win.title().unwrap_or_default();
        if title.contains("__ASLI_UPD_1__") {
            let _ = win.set_title(&original_title);
            hide_update_overlay(app);
            return true;
        }
        if title.contains("__ASLI_UPD_0__") {
            let _ = win.set_title(&original_title);
            hide_update_overlay(app);
            return false;
        }
    }

    let _ = win.set_title(&original_title);
    hide_update_overlay(app);
    false
}

#[cfg(not(debug_assertions))]
async fn run_updater(app: tauri::AppHandle) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    use std::sync::atomic::{AtomicU64, Ordering};
    use std::sync::Arc;
    use tauri::Manager;
    use tauri_plugin_updater::UpdaterExt;

    if let Some(win) = app.get_webview_window("main") {
        let _ = win.set_focus();
    }

    let Some(update) = app.updater()?.check().await? else {
        eprintln!("[asli-desktop] updater: sin actualizaciones");
        return Ok(());
    };

    eprintln!(
        "[asli-desktop] updater: disponible {} → {}",
        update.current_version, update.version
    );

    let want_update = ask_update_in_webview(&app, &update.current_version, &update.version).await;
    if !want_update {
        return Ok(());
    }

    show_update_overlay(
        &app,
        "Descargando actualización…",
        "No cierres la ventana. Al terminar se abrirá el instalador.",
    );
    set_update_progress(&app, 0);

    let downloaded = Arc::new(AtomicU64::new(0));
    let app_progress = app.clone();
    let downloaded_cb = Arc::clone(&downloaded);

    update
        .download_and_install(
            move |chunk_len, content_len| {
                let done =
                    downloaded_cb.fetch_add(chunk_len as u64, Ordering::Relaxed) + chunk_len as u64;
                if let Some(total) = content_len {
                    if total > 0 {
                        let pct = ((done as f64 / total as f64) * 100.0).floor() as u32;
                        set_update_progress(&app_progress, pct);
                    }
                } else {
                    let pct = ((done / 50_000) % 90) as u32 + 5;
                    set_update_progress(&app_progress, pct);
                }
            },
            || {
                eprintln!("[asli-desktop] updater: descarga completa, lanzando instalador…");
            },
        )
        .await
        .map_err(|e| -> Box<dyn std::error::Error + Send + Sync> { e.into() })?;

    set_update_progress(&app, 100);
    show_update_overlay(
        &app,
        "Instalando…",
        "Se abrirá el instalador y esta ventana se cerrará.",
    );

    tokio::time::sleep(std::time::Duration::from_millis(600)).await;
    app.restart();
}
