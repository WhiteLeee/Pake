#[cfg_attr(mobile, tauri::mobile_entry_point)]
mod app;
mod util;

use tauri::Manager;
use tauri_plugin_window_state::Builder as WindowStatePlugin;
use tauri_plugin_window_state::StateFlags;

#[cfg(target_os = "macos")]
use std::time::Duration;

use app::{
    invoke::{download_file, download_file_by_binary, send_notification, get_logs, clear_logs},
    setup::{set_global_shortcut, set_system_tray},
    window::set_window,
};
use util::get_pake_config;

pub fn run_app() {
    let (pake_config, tauri_config) = get_pake_config();
    let tauri_app = tauri::Builder::default();

    let show_system_tray = pake_config.show_system_tray();
    let activation_shortcut = pake_config.windows[0].activation_shortcut.clone();
    let init_fullscreen = pake_config.windows[0].fullscreen;

    let window_state_plugin = WindowStatePlugin::default()
        .with_state_flags(if init_fullscreen {
            StateFlags::FULLSCREEN
        } else {
            // Prevent flickering on the first open.
            StateFlags::all() & !StateFlags::VISIBLE
        })
        .build();

    #[allow(deprecated)]
    tauri_app
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // 当尝试启动新实例时，聚焦到现有窗口
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
                let _ = window.unminimize();
            }
        }))
        .plugin(window_state_plugin)
        .plugin(tauri_plugin_oauth::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            download_file,
            download_file_by_binary,
            send_notification,
            get_logs,
            clear_logs,
        ])
        .setup(move |app| {
            // 添加应用启动日志
            app::invoke::add_log_entry("INFO", "应用正在启动...");
            
            let window = set_window(app, &pake_config, &tauri_config);
            app::invoke::add_log_entry("INFO", "窗口设置完成");
            
            set_system_tray(app.app_handle(), show_system_tray, &pake_config).unwrap();
            app::invoke::add_log_entry("INFO", "系统托盘设置完成");
            
            set_global_shortcut(app.app_handle(), activation_shortcut).unwrap();
            app::invoke::add_log_entry("INFO", "全局快捷键设置完成");
            
            // Prevent flickering on the first open.
            window.show().unwrap();
            app::invoke::add_log_entry("INFO", "应用启动完成，窗口已显示");
            
            Ok(())
        })
        .on_window_event(|_window, _event| {
            #[cfg(target_os = "macos")]
            if let tauri::WindowEvent::CloseRequested { api, .. } = _event {
                let window = _window.clone();
                tauri::async_runtime::spawn(async move {
                    if window.is_fullscreen().unwrap_or(false) {
                        window.set_fullscreen(false).unwrap();
                        tokio::time::sleep(Duration::from_millis(900)).await;
                    }
                    window.minimize().unwrap();
                    window.hide().unwrap();
                });
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

pub fn run() {
    run_app()
}
