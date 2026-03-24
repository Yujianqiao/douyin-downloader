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

use commands::subtitle::*;
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .manage(ProcessingState::default())
        .invoke_handler(tauri::generate_handler![
            // 字幕去除命令
            detect_subtitle_area,
            remove_subtitles,
            cancel_subtitle_removal,
            get_processing_status,
        ])
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
