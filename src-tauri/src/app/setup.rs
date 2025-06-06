use std::str::FromStr;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::TrayIconBuilder,
    AppHandle, Manager,
    image::Image,
};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};
use tauri_plugin_window_state::{AppHandleExt, StateFlags};
use crate::app::config::PakeConfig;

pub fn set_system_tray(app: &AppHandle, show_system_tray: bool, pake_config: &PakeConfig) -> tauri::Result<()> {
    if !show_system_tray {
        app.remove_tray_by_id("pake-tray");
        return Ok(());
    }

    let hide_app = MenuItemBuilder::with_id("hide_app", "Hide").build(app)?;
    let show_app = MenuItemBuilder::with_id("show_app", "Show").build(app)?;
    let quit = MenuItemBuilder::with_id("quit", "Quit").build(app)?;

    let menu = MenuBuilder::new(app)
        .items(&[&hide_app, &show_app, &quit])
        .build()?;

    app.app_handle().remove_tray_by_id("pake-tray");

    // 尝试加载自定义托盘图标
    let icon = if !pake_config.system_tray_path.is_empty() {
        // 在macOS上，优先尝试ICNS格式的图标
        let icon_name = std::path::Path::new(&pake_config.system_tray_path)
            .file_stem()
            .unwrap()
            .to_str()
            .unwrap();
        
        let possible_icon_paths = vec![
            format!("icons/{}.icns", icon_name),  // ICNS格式优先
            pake_config.system_tray_path.clone(), // 原始路径
        ];
        
        let mut loaded_icon = None;
        for icon_path_str in possible_icon_paths {
            let possible_paths = vec![
                // 打包后的应用资源目录
                app.path().resource_dir().ok().map(|p| p.join(&icon_path_str)),
                // 开发环境的项目目录
                app.path().app_local_data_dir().ok().map(|p| p.parent().unwrap().parent().unwrap().join(&icon_path_str)),
            ];
            
            for path_opt in possible_paths {
                if let Some(icon_path) = path_opt {
                    if icon_path.exists() {
                        match Image::from_path(&icon_path) {
                            Ok(icon) => {
                                println!("Successfully loaded system tray icon from: {}", icon_path.display());
                                loaded_icon = Some(icon);
                                break;
                            }
                            Err(e) => {
                                eprintln!("Failed to load system tray icon from {}: {}", icon_path.display(), e);
                            }
                        }
                    } else {
                        eprintln!("System tray icon path does not exist: {}", icon_path.display());
                    }
                }
            }
            
            if loaded_icon.is_some() {
                break;
            }
        }
        
        loaded_icon.unwrap_or_else(|| {
            eprintln!("Could not find system tray icon, using default");
            app.default_window_icon().unwrap().clone()
        })
    } else {
        app.default_window_icon().unwrap().clone()
    };

    let tray = TrayIconBuilder::new()
        .menu(&menu)
        .on_menu_event(move |app, event| match event.id().as_ref() {
            "hide_app" => {
                if let Some(window) = app.get_webview_window("pake") {
                    window.minimize().unwrap();
                }
            }
            "show_app" => {
                if let Some(window) = app.get_webview_window("pake") {
                    window.show().unwrap();
                }
            }
            "quit" => {
                app.save_window_state(StateFlags::all()).unwrap();
                std::process::exit(0);
            }
            _ => (),
        })
        .icon(icon)
        .build(app)?;

    tray.set_icon_as_template(false)?;
    Ok(())
}

pub fn set_global_shortcut(app: &AppHandle, shortcut: String) -> tauri::Result<()> {
    if shortcut.is_empty() {
        return Ok(());
    }

    let app_handle = app.clone();
    let shortcut_hotkey = Shortcut::from_str(&shortcut).unwrap();
    let last_triggered = Arc::new(Mutex::new(Instant::now()));

    app_handle
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler({
                    let last_triggered = Arc::clone(&last_triggered);
                    move |app, event, _shortcut| {
                        let mut last_triggered = last_triggered.lock().unwrap();
                        if Instant::now().duration_since(*last_triggered)
                            < Duration::from_millis(300)
                        {
                            return;
                        }
                        *last_triggered = Instant::now();

                        if shortcut_hotkey.eq(event) {
                            if let Some(window) = app.get_webview_window("pake") {
                                let is_visible = window.is_visible().unwrap();
                                if is_visible {
                                    window.hide().unwrap();
                                } else {
                                    window.show().unwrap();
                                    window.set_focus().unwrap();
                                }
                            }
                        }
                    }
                })
                .build(),
        )
        .expect("Failed to set global shortcut");

    app.global_shortcut().register(shortcut_hotkey).unwrap();

    Ok(())
}
