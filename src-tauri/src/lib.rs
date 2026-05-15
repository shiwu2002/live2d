use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      use tauri::window::Color;

      // 在窗口创建时就设置透明背景，确保原生层透明
      if let Some(window) = app.get_webview_window("main") {
        // 同时设置 window 和 webview 的背景色
        // macOS: window 层生效，webview 层调用虽然无效但无害
        let _ = window.set_background_color(Some(Color(0, 0, 0, 0)));
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
