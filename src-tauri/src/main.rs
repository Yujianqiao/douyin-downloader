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

fn main() {
    tauri::Builder::default()
        .manage(commands::subtitle::ProcessingState::default())
        .invoke_handler(tauri::generate_handler![
            // 视频下载命令
            parse_link,
            download_video,
            get_download_progress,
            cancel_download,
            // 文件操作命令
            open_video_file,
            open_file_folder,
            // 字幕去除命令
            detect_subtitle_area,
            remove_subtitles,
            cancel_subtitle_removal,
            get_processing_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
