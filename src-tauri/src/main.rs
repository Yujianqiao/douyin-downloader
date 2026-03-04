// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod models;

use commands::*;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            parse_link,
            download_video,
            get_download_progress,
            cancel_download
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
