#[cfg_attr(mobile, tauri::mobile_entry_point)]
use serde::{Deserialize, Serialize};
use std::io::Write;
use tauri::Manager;
use zip::write::{FileOptions, ZipWriter};
use chrono::Utc;
use log::{error, info};
use std::io::Cursor;
use reqwest::Client;


/// 从前端传递过来的日志数据结构
#[derive(Deserialize)]
struct LogsPayload {
    runtime: Vec<String>,
    xhr: Vec<String>,
}

/// 请求预签名URL的请求体结构
#[derive(Serialize)]
struct PresignedUrlRequest {
    file_name: String,
    content_type: String,
    expiration: i32,
    path: String,
}

/// 预签名URL的响应体结构
#[derive(Deserialize)]
struct PresignedUrlResponse {
    presigned_url: String,
    // 根据实际API响应添加其他字段
}

/// Tauri Command: 获取应用信息
#[tauri::command]
fn get_app_info() -> serde_json::Value {
    let (_, tauri_config) = util::get_pake_config();

    serde_json::json!({
        "version": tauri_config.version.unwrap_or_else(|| "NaN".to_string()),
        "product_name": tauri_config.product_name.unwrap_or_else(|| "NaN".to_string())
    })
}

/// Tauri Command: 处理日志上传
/// 接收前端发送的运行时日志和XHR日志，将它们打包成ZIP文件，
/// 然后获取预签名URL，并将ZIP文件上传到该URL。
#[tauri::command]
async fn handle_log_upload(logs: LogsPayload) -> Result<String, tauri::Error> { // Return success message
    // 硬编码的API配置
    let presigned_url_api = "https://gateway.yitongweb.com/s3/api/get-presigned-url";
    let api_key = "D1kSHode9yQM1syjd";

    // 1. 创建 ZIP 文件内容
    // 使用内存中的 Cursor 作为写入目标，避免直接写磁盘，提高效率并减少IO操作。
    let mut zip_buffer = Cursor::new(Vec::new());
    {
        let mut zip = ZipWriter::new(&mut zip_buffer);
        // 设置ZIP文件内条目的压缩选项，这里使用Deflate压缩算法。
        let options = FileOptions::default().compression_method(zip::CompressionMethod::Deflated);

        // 添加运行时日志到ZIP中，文件名为 runtime.log
        zip.start_file("runtime.log", options)
            .map_err(|e| tauri::Error::Io(std::io::Error::new(std::io::ErrorKind::Other, format!("Failed to start runtime.log in zip: {}", e))))?;
        for log_entry in logs.runtime {
            writeln!(zip, "{}", log_entry).map_err(|e| tauri::Error::Io(e))?;
        }

        // 添加 XHR 日志到ZIP中，文件名为 xhr.log
        zip.start_file("xhr.log", options)
            .map_err(|e| tauri::Error::Io(std::io::Error::new(std::io::ErrorKind::Other, format!("Failed to start xhr.log in zip: {}", e))))?;
        for log_entry in logs.xhr {
            writeln!(zip, "{}", log_entry).map_err(|e| tauri::Error::Io(e))?;
        }
        zip.finish().map_err(|e| tauri::Error::Io(std::io::Error::new(std::io::ErrorKind::Other, format!("Failed to finalize zip: {}", e))))?;
    }
    // 将Cursor中的ZIP数据转换为Vec<u8>
    let zip_data = zip_buffer.into_inner();

    // 2. 获取预签名 URL
    // 创建一个 reqwest 客户端用于发送HTTP请求。此客户端支持阻塞式请求。
    let client = Client::new();
    // 生成带时间戳的文件名，格式为 pake_logs_YYYYMMDDHHMMSS.zip，确保文件名唯一性。
    let timestamp = Utc::now().format("%Y%m%d%H%M%S");
    let app_info = get_app_info();
    log::info!("{:?}", app_info["product_name"]);
    let product_name = app_info["product_name"].as_str().unwrap_or("pake_logs");
    let file_name = format!("{}_{}.zip", product_name, timestamp);

    // 构建获取预签名URL的请求体
    let presigned_url_payload = PresignedUrlRequest {
        file_name: file_name.clone(), // 上传到S3的文件名
        content_type: "application/zip".to_string(), // 文件类型
        expiration: 3600, // 预签名URL有效期，单位秒 (1小时)
        path: "upload-log/".to_string(), // 文件在S3存储桶中的路径前缀
    };

    // 使用硬编码的API URL和Key
    // 发送POST请求到预签名URL API，获取用于上传的URL
    let res = client
        .post(presigned_url_api)
        .header("Content-Type", "application/json") // 设置请求头Content-Type
        .header("X-API-Key", api_key) // 设置API密钥请求头
        .json(&presigned_url_payload) // 将请求体序列化为JSON并发送
        .send()
        .await
        .map_err(|e| tauri::Error::Io(std::io::Error::new(std::io::ErrorKind::Other, format!("Failed to request presigned URL: {}", e))))?; // 错误处理

    // 检查获取预签名URL的请求是否成功
    // 如果请求失败，记录错误并返回
    let status = res.status();
    if !status.is_success() {
        let error_body = res.text().await.unwrap_or_else(|_| "Unknown error from presigned URL API".to_string());
        error!("Failed to get presigned URL: {} - {}", status, error_body);
            return Err(tauri::Error::Io(std::io::Error::new(std::io::ErrorKind::Other, format!(
                 "Failed to get presigned URL: {} - {}",
                 status,
                 error_body
             ))));
    }

    // 解析预签名URL的JSON响应
    let presigned_info = res
        .json::<PresignedUrlResponse>() // 将响应体反序列化为PresignedUrlResponse结构体
        .await
        .map_err(|e| tauri::Error::Io(std::io::Error::new(std::io::ErrorKind::Other, format!("Failed to parse presigned URL response: {}", e))))?; // 错误处理

    // 3. 上传 ZIP 文件到获取到的预签名 URL
    // 使用HTTP PUT方法上传ZIP文件数据
    let upload_res = client
        .put(&presigned_info.presigned_url) // 目标URL为获取到的预签名URL
        .header("Content-Type", "application/zip") // 设置Content-Type为application/zip
        .body(zip_data) // 请求体为ZIP文件数据
        .send()
        .await
        .map_err(|e| tauri::Error::Io(std::io::Error::new(std::io::ErrorKind::Other, format!("Failed to upload zip file: {}", e))))?; // 错误处理

    // 检查文件上传是否成功
    // 如果上传失败，记录错误并返回
    let upload_status = upload_res.status();
    if !upload_status.is_success() {
        let error_body = upload_res.text().await.unwrap_or_else(|_| "Unknown error during upload".to_string());
        error!(
                "Failed to upload logs: {} - {}",
                upload_status,
                error_body
            );
            return Err(tauri::Error::Io(std::io::Error::new(std::io::ErrorKind::Other, format!(
                 "Failed to upload logs: {} - {}",
                 upload_status,
                 error_body
             ))));
    }

    // 如果一切顺利，返回成功信息
    info!("日志上传成功: {}", file_name);
    Ok(format!("日志上传成功！文件名: {}", file_name))
}

mod app;
mod util;

// use tauri::Manager; // Removed duplicate import
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
            handle_log_upload,
            get_app_info,
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
