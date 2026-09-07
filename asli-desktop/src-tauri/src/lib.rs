#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            #[cfg(not(debug_assertions))]
            {
                let handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    if let Err(err) = run_updater(handle.clone()).await {
                        eprintln!("[asli-desktop] updater: {err}");
                        hide_update_overlay(&handle);
                        show_error(
                            &handle,
                            format!(
                                "No se pudo completar la actualización del acceso de escritorio.\n\n{err}\n\n\
Puedes instalar a mano el último setup desde GitHub Releases."
                            ),
                        );
                    }
                });
            }
            let _ = app;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running ASLI Embarques");
}

#[cfg(not(debug_assertions))]
fn show_error(app: &tauri::AppHandle, message: String) {
    use tauri_plugin_dialog::{DialogExt, MessageDialogKind};
    app.dialog()
        .message(message)
        .title("ASLI Embarques")
        .kind(MessageDialogKind::Error)
        .blocking_show();
}

#[cfg(not(debug_assertions))]
fn eval_main(app: &tauri::AppHandle, script: &str) {
    use tauri::Manager;
    if let Some(win) = app.get_webview_window("main") {
        if let Err(err) = win.eval(script) {
            eprintln!("[asli-desktop] eval: {err}");
        }
    }
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
    el.innerHTML = '<div style="width:min(380px,90vw);background:#fff;color:#11224E;border-radius:4px;padding:22px 24px;box-shadow:0 16px 48px rgba(0,0,0,.35);text-align:center">' +
      '<div id="asli-desktop-update-title" style="font-weight:700;font-size:16px;margin-bottom:6px"></div>' +
      '<div id="asli-desktop-update-sub" style="font-size:13px;color:#5a6b85;margin-bottom:16px;line-height:1.4"></div>' +
      '<div style="height:8px;background:#e8eef5;border-radius:2px;overflow:hidden">' +
      '<div id="asli-desktop-update-bar" style="height:100%;width:2%;background:#11224E;transition:width .15s linear"></div></div>' +
      '<div id="asli-desktop-update-pct" style="margin-top:10px;font-size:12px;font-weight:600;color:#5a6b85">0%</div></div>';
    document.documentElement.appendChild(el);
  }}
  var t = document.getElementById('asli-desktop-update-title');
  var s = document.getElementById('asli-desktop-update-sub');
  if (t) t.textContent = '{title}';
  if (s) s.textContent = '{subtitle}';
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
  if (bar) bar.style.width = '{pct}%';
  if (label) label.textContent = '{pct}%';
}})();"#
        ),
    );
}

#[cfg(not(debug_assertions))]
fn hide_update_overlay(app: &tauri::AppHandle) {
    eval_main(
        app,
        r#"(function(){ var el = document.getElementById('asli-desktop-update-overlay'); if (el) el.remove(); })();"#,
    );
}

#[cfg(not(debug_assertions))]
fn escape_js(value: &str) -> String {
    value
        .replace('\\', "\\\\")
        .replace('\'', "\\'")
        .replace('\n', "\\n")
        .replace('\r', "")
}

#[cfg(not(debug_assertions))]
async fn run_updater(app: tauri::AppHandle) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    use std::sync::atomic::{AtomicU64, Ordering};
    use std::sync::Arc;
    use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};
    use tauri_plugin_updater::UpdaterExt;

    let Some(update) = app.updater()?.check().await? else {
        return Ok(());
    };

    let want_update = app
        .dialog()
        .message(format!(
            "Hay una nueva versión del acceso de escritorio ({} → {}).\n\n\
El ERP web ya se actualiza solo con cada deploy; esto solo actualiza el contenedor (.exe).\n\n\
¿Instalar ahora?",
            update.current_version, update.version
        ))
        .title("Actualización ASLI Embarques")
        .kind(MessageDialogKind::Info)
        .buttons(MessageDialogButtons::OkCancelCustom(
            "Actualizar ahora".into(),
            "Más tarde".into(),
        ))
        .blocking_show();

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
                let done = downloaded_cb.fetch_add(chunk_len as u64, Ordering::Relaxed) + chunk_len as u64;
                if let Some(total) = content_len {
                    if total > 0 {
                        let pct = ((done as f64 / total as f64) * 100.0).floor() as u32;
                        set_update_progress(&app_progress, pct);
                    }
                } else {
                    // Sin Content-Length: barra indeterminada suave
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

    app.dialog()
        .message("Actualización instalada. La aplicación se reiniciará.")
        .title("ASLI Embarques")
        .kind(MessageDialogKind::Info)
        .blocking_show();

    app.restart();
}
