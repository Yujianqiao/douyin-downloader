//! Douyin Downloader - Tauri 主入口
//!
//! 功能：
//! - 视频下载
//! - 字幕去除（AI 功能）
//! - 视频处理

#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod commands;
mod models;

use commands::*;
use commands::subtitle::*;

fn main() {
    tauri::Builder::default()
        .manage(ProcessingState::default())
        .invoke_handler(tauri::generate_handler![
            // 视频下载命令
            parse_link,
            download_video,
            get_download_progress,
            cancel_download,
            // 字幕去除命令
            detect_subtitle_area,
            remove_subtitles,
            cancel_subtitle_removal,
            get_processing_status,
        ])
        .setup(|_app| {
            #[cfg(debug_assertions)]
            {
                // 在 Tauri v2 中，窗口管理方式不同
                // 如果需要打开开发者工具，可以通过 WebView 设置
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
