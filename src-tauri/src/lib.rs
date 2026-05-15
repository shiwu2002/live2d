use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      use tauri::window::Color;

      if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_background_color(Some(Color(0, 0, 0, 0)));

        #[cfg(target_os = "windows")]
        {
          use tauri::Manager;
          if let Some(win) = app.get_webview_window("main") {
            let _ = win.set_decorations(false);
          }
        }
      }

      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
