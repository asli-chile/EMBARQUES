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

/// MessageBox de Win32 siempre encima (MB_TOPMOST). Evita overlay web y dialog Tauri.
#[cfg(all(not(debug_assertions), windows))]
fn ask_update_win32(current: &str, next: &str) -> bool {
    use std::os::windows::ffi::OsStrExt;

    fn wide(s: &str) -> Vec<u16> {
        std::ffi::OsStr::new(s)
            .encode_wide()
            .chain(std::iter::once(0))
            .collect()
    }

    #[link(name = "user32")]
    extern "system" {
        fn MessageBoxW(
            h_wnd: *mut core::ffi::c_void,
            lp_text: *const u16,
            lp_caption: *const u16,
            u_type: u32,
        ) -> i32;
    }

    const MB_YESNO: u32 = 0x0000_0004;
    const MB_ICONINFORMATION: u32 = 0x0000_0040;
    const MB_TOPMOST: u32 = 0x0004_0000;
    const MB_SETFOREGROUND: u32 = 0x0001_0000;
    const IDYES: i32 = 6;

    let body = format!(
        "Hay una nueva versión del acceso de escritorio ({current} → {next}).\n\n\
El ERP web ya se actualiza solo con cada deploy; esto solo actualiza el contenedor (.exe).\n\n\
¿Instalar ahora?"
    );
    let title = wide("Actualización ASLI Embarques");
    let text = wide(&body);
    let flags = MB_YESNO | MB_ICONINFORMATION | MB_TOPMOST | MB_SETFOREGROUND;

    unsafe {
        MessageBoxW(
            std::ptr::null_mut(),
            text.as_ptr(),
            title.as_ptr(),
            flags,
        ) == IDYES
    }
}

/// Confirmación de update: Win32 MessageBox (fiable con ventana maximizada sin chrome).
#[cfg(not(debug_assertions))]
async fn ask_update_install(app: &tauri::AppHandle, current: &str, next: &str) -> bool {
    use tauri::Manager;

    hide_update_overlay(app);

    if let Some(win) = app.get_webview_window("main") {
        let _ = win.set_focus();
    }

    let current = current.to_string();
    let next = next.to_string();

    #[cfg(windows)]
    let choice = {
        let cur = current.clone();
        let nxt = next.clone();
        tokio::task::spawn_blocking(move || ask_update_win32(&cur, &nxt))
            .await
            .unwrap_or(false)
    };

    #[cfg(not(windows))]
    let choice = {
        use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};
        let (tx, rx) = tokio::sync::oneshot::channel::<bool>();
        let message = format!(
            "Hay una nueva versión del acceso de escritorio ({current} → {next}).\n\n¿Instalar ahora?"
        );
        app.dialog()
            .message(message)
            .title("Actualización ASLI Embarques")
            .kind(MessageDialogKind::Info)
            .buttons(MessageDialogButtons::OkCancelCustom(
                "Actualizar ahora".into(),
                "Más tarde".into(),
            ))
            .show(move |answer| {
                let _ = tx.send(answer);
            });
        tokio::time::timeout(std::time::Duration::from_secs(900), rx)
            .await
            .ok()
            .and_then(|r| r.ok())
            .unwrap_or(false)
    };

    if let Some(win) = app.get_webview_window("main") {
        let _ = win.set_focus();
    }

    choice
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

    let want_update = ask_update_install(&app, &update.current_version, &update.version).await;
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
