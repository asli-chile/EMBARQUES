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
                        let _ = show_error(
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
async fn run_updater(app: tauri::AppHandle) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
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

    // Feedback inmediato: sin esto el download parece “no hacer nada”.
    app.dialog()
        .message(
            "Descargando e instalando la actualización…\n\n\
En Windows verás el instalador a continuación y esta ventana se cerrará sola.",
        )
        .title("ASLI Embarques")
        .kind(MessageDialogKind::Info)
        .blocking_show();

    update
        .download_and_install(
            |_chunk, _progress| {},
            || {
                eprintln!("[asli-desktop] updater: descarga completa, lanzando instalador…");
            },
        )
        .await
        .map_err(|e| -> Box<dyn std::error::Error + Send + Sync> { e.into() })?;

    // En Windows download_and_install suele terminar el proceso al lanzar el NSIS.
    // En otros SO hay que reiniciar a mano.
    app.dialog()
        .message("Actualización instalada. La aplicación se reiniciará.")
        .title("ASLI Embarques")
        .kind(MessageDialogKind::Info)
        .blocking_show();

    app.restart();
}
