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
                    if let Err(err) = run_updater(handle).await {
                        eprintln!("[asli-desktop] updater: {err}");
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
            "Actualizar".into(),
            "Más tarde".into(),
        ))
        .blocking_show();

    if !want_update {
        return Ok(());
    }

    update
        .download_and_install(|_chunk, _progress| {}, || {})
        .await?;

    app.dialog()
        .message("Actualización instalada. La aplicación se reiniciará.")
        .title("ASLI Embarques")
        .kind(MessageDialogKind::Info)
        .blocking_show();

    app.restart();
}
