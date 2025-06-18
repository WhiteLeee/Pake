use crate::util::{check_file_or_append, get_download_message, show_toast, MessageType};
use std::fs::{self, File};
use std::io::Write;
use std::str::FromStr;
use std::sync::{Arc, Mutex};
use std::collections::VecDeque;
use tauri::http::Method;
use tauri::{command, AppHandle, Manager, Url, WebviewWindow};
use tauri_plugin_http::reqwest::{ClientBuilder, Request};
use chrono::Local;
use serde::{Deserialize, Serialize};

// 全局日志存储
static LOG_BUFFER: once_cell::sync::Lazy<Arc<Mutex<VecDeque<LogEntry>>>> =
    once_cell::sync::Lazy::new(|| Arc::new(Mutex::new(VecDeque::new())));

const MAX_LOG_ENTRIES: usize = 5000;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub timestamp: String,
    pub level: String,
    pub message: String,
}

// 添加日志条目的函数
pub fn add_log_entry(level: &str, message: &str) {
    let entry = LogEntry {
        timestamp: Local::now().format("%Y-%m-%d %H:%M:%S%.3f").to_string(),
        level: level.to_string(),
        message: message.to_string(),
    };

    let mut buffer = LOG_BUFFER.lock().unwrap();
    buffer.push_back(entry);

    // 保持最大条目数限制
    while buffer.len() > MAX_LOG_ENTRIES {
        buffer.pop_front();
    }
}

#[derive(serde::Deserialize)]
pub struct DownloadFileParams {
    url: String,
    filename: String,
}

#[derive(serde::Deserialize)]
pub struct BinaryDownloadParams {
    filename: String,
    binary: Vec<u8>,
}

#[derive(serde::Deserialize)]
pub struct NotificationParams {
    title: String,
    body: String,
    icon: String,
}

#[command]
pub async fn download_file(app: AppHandle, params: DownloadFileParams) -> Result<(), String> {
    let filename = params.filename.clone();
    let url = params.url.clone();
    add_log_entry("INFO", &format!("开始下载文件: {}", filename));
    let window: WebviewWindow = app.get_webview_window("pake").unwrap();
    show_toast(&window, &get_download_message(MessageType::Start));

    let output_path = app.path().download_dir().unwrap().join(params.filename);
    let file_path = check_file_or_append(output_path.to_str().unwrap());
    let client = ClientBuilder::new().build().unwrap();

    let response = client
        .execute(Request::new(
            Method::GET,
            Url::from_str(&url).unwrap(),
        ))
        .await;

    match response {
        Ok(res) => {
            let bytes = res.bytes().await.unwrap();

            let mut file = File::create(file_path).unwrap();
            file.write_all(&bytes).unwrap();
            add_log_entry("INFO", &format!("文件下载成功: {}", filename));
            show_toast(&window, &get_download_message(MessageType::Success));
            Ok(())
        }
        Err(e) => {
            add_log_entry("ERROR", &format!("文件下载失败: {} - {}", filename, e));
            show_toast(&window, &get_download_message(MessageType::Failure));
            Err(e.to_string())
        }
    }
}

#[command]
pub async fn download_file_by_binary(
    app: AppHandle,
    params: BinaryDownloadParams,
) -> Result<(), String> {
    let filename = params.filename.clone();
    add_log_entry("INFO", &format!("开始二进制文件下载: {}", filename));
    let window: WebviewWindow = app.get_webview_window("pake").unwrap();
    show_toast(&window, &get_download_message(MessageType::Start));
    let output_path = app.path().download_dir().unwrap().join(params.filename);
    let file_path = check_file_or_append(output_path.to_str().unwrap());
    let download_file_result = fs::write(file_path, &params.binary);
    match download_file_result {
        Ok(_) => {
            add_log_entry("INFO", &format!("二进制文件下载成功: {}", filename));
            show_toast(&window, &get_download_message(MessageType::Success));
            Ok(())
        }
        Err(e) => {
            add_log_entry("ERROR", &format!("二进制文件下载失败: {} - {}", filename, e));
            show_toast(&window, &get_download_message(MessageType::Failure));
            Err(e.to_string())
        }
    }
}

#[command]
pub fn send_notification(app: AppHandle, params: NotificationParams) -> Result<(), String> {
    let title = params.title.clone();
    add_log_entry("INFO", &format!("发送通知: {}", title));
    use tauri_plugin_notification::NotificationExt;

    // 发送通知
    let mut notification_builder = app.notification()
        .builder()
        .title(&params.title)
        .body(&params.body)
        .icon(&params.icon);

    // 根据平台设置通知声音
    #[cfg(target_os = "macos")]
    {
        notification_builder = notification_builder.sound("default");
    }

    #[cfg(target_os = "windows")]
    {
        notification_builder = notification_builder.sound("Default");
    }

    #[cfg(target_os = "linux")]
    {
        notification_builder = notification_builder.sound("message-new-instant");
    }

    notification_builder.show().unwrap();
    add_log_entry("INFO", "通知发送成功");

    // 请求用户注意力，让系统托盘图标跳动
    if let Some(window) = app.get_webview_window("pake") {
        #[cfg(target_os = "macos")]
        {
            use tauri::UserAttentionType;
            let _ = window.request_user_attention(Some(UserAttentionType::Informational));
        }

        #[cfg(target_os = "windows")]
        {
            use tauri::UserAttentionType;
            let _ = window.request_user_attention(Some(UserAttentionType::Informational));
        }

        #[cfg(target_os = "linux")]
        {
            use tauri::UserAttentionType;
            let _ = window.request_user_attention(Some(UserAttentionType::Informational));
        }
    }

    Ok(())
}

#[command]
pub fn get_logs() -> Result<Vec<LogEntry>, String> {
    let buffer = LOG_BUFFER.lock().unwrap();
    Ok(buffer.iter().cloned().collect())
}

#[command]
pub fn clear_logs() -> Result<(), String> {
    let mut buffer = LOG_BUFFER.lock().unwrap();
    buffer.clear();
    add_log_entry("INFO", "日志已清空");
    Ok(())
}
