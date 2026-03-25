//! Tauri 命令模块

pub mod subtitle;

pub use subtitle::*;

use crate::models::*;
use std::process::Stdio;
use std::sync::Arc;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio::sync::Mutex;
use lazy_static::lazy_static;

// 全局下载进度状态
lazy_static! {
    static ref DOWNLOAD_PROGRESS: Arc<Mutex<DownloadProgress>> =
        Arc::new(Mutex::new(DownloadProgress::default()));
    static ref DOWNLOAD_CANCELLED: Arc<Mutex<bool>> =
        Arc::new(Mutex::new(false));
}

/// 验证抖音链接格式
fn is_valid_douyin_url(url: &str) -> bool {
    url.contains("douyin.com") || url.contains("iesdouyin.com")
}

/// 解析抖音链接，获取视频信息
#[tauri::command]
pub async fn parse_link(url: String) -> Result<ParseResult, String> {
    log::info!("Parsing URL: {}", url);

    // 验证URL格式
    if !is_valid_douyin_url(&url) {
        return Ok(ParseResult {
            success: false,
            video_info: None,
            error: Some("无效的抖音链接格式".to_string()),
        });
    }

    // 调用Python脚本获取视频信息
    let output = Command::new("python3")
        .arg("src-tauri/python/downloader.py")
        .arg("info")
        .arg(&url)
        .output()
        .await
        .map_err(|e| format!("Failed to execute Python script: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Ok(ParseResult {
            success: false,
            video_info: None,
            error: Some(format!("获取视频信息失败: {}", stderr)),
        });
    }

    let stdout = String::from_utf8_lossy(&output.stdout);

    // 解析JSON响应
    match serde_json::from_str::<VideoInfo>(&stdout) {
        Ok(video_info) => Ok(ParseResult {
            success: true,
            video_info: Some(video_info),
            error: None,
        }),
        Err(e) => Ok(ParseResult {
            success: false,
            video_info: None,
            error: Some(format!("解析视频信息失败: {}", e)),
        }),
    }
}

/// 下载视频
#[tauri::command]
pub async fn download_video(
    url: String,
    options: DownloadOptions,
) -> Result<DownloadResult, String> {
    log::info!("Starting download for URL: {}", url);

    // 重置下载状态
    {
        let mut progress = DOWNLOAD_PROGRESS.lock().await;
        *progress = DownloadProgress {
            status: "downloading".to_string(),
            progress: 0.0,
            downloaded_bytes: 0,
            total_bytes: None,
            speed: None,
            eta: None,
            error_message: None,
        };
    }
    {
        let mut cancelled = DOWNLOAD_CANCELLED.lock().await;
        *cancelled = false;
    }

    // 构建输出路径
    let output_dir = options.output_path.clone().unwrap_or_else(|| "./downloads".to_string());
    let filename = options.filename.clone().unwrap_or_else(|| "%(title)s.%(ext)s".to_string());
    let output_template = format!("{}/{}", output_dir, filename);

    // 确保下载目录存在
    std::fs::create_dir_all(&output_dir).map_err(|e| format!("创建下载目录失败: {}", e))?;

    // 构建下载命令
    let mut cmd = Command::new("python3");
    cmd.arg("src-tauri/python/downloader.py")
        .arg("download")
        .arg(&url)
        .arg(&output_template);

    if let Some(ref format_id) = options.format_id {
        cmd.arg(format_id);
    }

    cmd.stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let mut child = cmd.spawn().map_err(|e| format!("启动下载进程失败: {}", e))?;

    // 读取输出并更新进度
    if let Some(stdout) = child.stdout.take() {
        let reader = BufReader::new(stdout);
        let mut lines = reader.lines();

        while let Ok(Some(line)) = lines.next_line().await {
            // 检查是否被取消
            let is_cancelled = {
                let cancelled = DOWNLOAD_CANCELLED.lock().await;
                *cancelled
            };

            if is_cancelled {
                let _ = child.kill().await;
                return Ok(DownloadResult {
                    success: false,
                    file_path: None,
                    error: Some("下载已取消".to_string()),
                });
            }

            // 解析进度信息
            if let Ok(progress_data) = serde_json::from_str::<serde_json::Value>(&line) {
                let mut progress = DOWNLOAD_PROGRESS.lock().await;
                if let Some(p) = progress_data.get("progress") {
                    progress.progress = p.as_f64().unwrap_or(0.0);
                }
                if let Some(speed) = progress_data.get("speed") {
                    progress.speed = speed.as_str().map(|s| s.to_string());
                }
                if let Some(eta) = progress_data.get("eta") {
                    progress.eta = eta.as_str().map(|s| s.to_string());
                }
            }
        }
    }

    // 等待进程完成
    let status = child.wait().await.map_err(|e| format!("等待下载进程失败: {}", e))?;

    if status.success() {
        let mut progress = DOWNLOAD_PROGRESS.lock().await;
        progress.status = "completed".to_string();
        progress.progress = 100.0;

        // 获取实际下载的文件路径
        let downloaded_file = get_downloaded_file_path(&output_dir, &filename);

        // 后处理：去水印和去字幕
        let final_file_path = if options.remove_watermark.unwrap_or(false) || options.remove_subtitle.unwrap_or(false) {
            progress.status = "processing".to_string();
            match post_process_video(&downloaded_file, &options).await {
                Ok(path) => path,
                Err(e) => {
                    log::warn!("后处理失败: {}, 使用原始文件", e);
                    downloaded_file
                }
            }
        } else {
            downloaded_file
        };

        Ok(DownloadResult {
            success: true,
            file_path: Some(final_file_path),
            error: None,
        })
    } else {
        let mut progress = DOWNLOAD_PROGRESS.lock().await;
        progress.status = "error".to_string();

        let error_msg = if let Some(stderr) = child.stderr {
            let mut reader = BufReader::new(stderr);
            let mut error = String::new();
            let _ = reader.read_line(&mut error).await;
            error
        } else {
            "下载失败".to_string()
        };

        progress.error_message = Some(error_msg.clone());

        Ok(DownloadResult {
            success: false,
            file_path: None,
            error: Some(error_msg),
        })
    }
}

/// 获取下载进度
#[tauri::command]
pub async fn get_download_progress() -> Result<DownloadProgress, String> {
    let progress = DOWNLOAD_PROGRESS.lock().await;
    Ok(progress.clone())
}

/// 取消下载
#[tauri::command]
pub async fn cancel_download() -> Result<bool, String> {
    let mut cancelled = DOWNLOAD_CANCELLED.lock().await;
    *cancelled = true;
    Ok(true)
}

/// 使用系统默认程序打开视频文件
#[tauri::command]
pub async fn open_video_file(file_path: String) -> Result<(), String> {
    log::info!("Opening video file: {}", file_path);
    
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(&["/C", "start", "", &file_path])
            .spawn()
            .map_err(|e| format!("打开文件失败: {}", e))?;
    }
    
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&file_path)
            .spawn()
            .map_err(|e| format!("打开文件失败: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&file_path)
            .spawn()
            .map_err(|e| format!("打开文件失败: {}", e))?;
    }
    
    Ok(())
}

/// 打开文件所在文件夹
#[tauri::command]
pub async fn open_file_folder(file_path: String) -> Result<(), String> {
    log::info!("Opening folder for file: {}", file_path);
    
    let path = std::path::Path::new(&file_path);
    let folder = path.parent()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| ".".to_string());
    
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&folder)
            .spawn()
            .map_err(|e| format!("打开文件夹失败: {}", e))?;
    }
    
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&folder)
            .spawn()
            .map_err(|e| format!("打开文件夹失败: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&folder)
            .spawn()
            .map_err(|e| format!("打开文件夹失败: {}", e))?;
    }
    
    Ok(())
}

/// 获取实际下载的文件路径
fn get_downloaded_file_path(output_dir: &str, filename_template: &str) -> String {
    // 如果文件名模板包含变量，尝试查找最新下载的文件
    if filename_template.contains("%(") {
        let output_path = std::path::Path::new(output_dir);
        if let Ok(entries) = std::fs::read_dir(output_path) {
            let mut latest_file: Option<(std::fs::DirEntry, std::time::SystemTime)> = None;
            for entry in entries.flatten() {
                if let Ok(metadata) = entry.metadata() {
                    if metadata.is_file() {
                        if let Ok(modified) = metadata.modified() {
                            if latest_file.as_ref().map(|(_, t)| modified > *t).unwrap_or(true) {
                                latest_file = Some((entry, modified));
                            }
                        }
                    }
                }
            }
            if let Some((entry, _)) = latest_file {
                return entry.path().to_string_lossy().to_string();
            }
        }
    }
    
    // 默认返回模板路径
    format!("{}/{}", output_dir, filename_template)
}

/// 视频后处理（去水印/去字幕）
async fn post_process_video(
    input_path: &str,
    _options: &DownloadOptions,
) -> Result<String, String> {
    use std::path::Path;
    
    let input = Path::new(input_path);
    let stem = input.file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("video");
    let ext = input.extension()
        .and_then(|s| s.to_str())
        .unwrap_or("mp4");
    
    // 生成输出文件路径
    let output_path = input.with_file_name(format!("{}_processed.{}", stem, ext));
    let output_str = output_path.to_string_lossy().to_string();
    
    // 目前使用 FFmpeg 进行基础处理
    // TODO: 集成 AI 去字幕和去水印功能
    let mut cmd = Command::new("ffmpeg");
    cmd.arg("-i")
        .arg(input_path)
        .arg("-c:v")
        .arg("libx264")
        .arg("-preset")
        .arg("medium")
        .arg("-crf")
        .arg("18")
        .arg("-c:a")
        .arg("copy")
        .arg("-y")
        .arg(&output_str);
    
    let output = cmd.output()
        .await
        .map_err(|e| format!("FFmpeg 执行失败: {}", e))?;
    
    if output.status.success() {
        Ok(output_str)
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("视频处理失败: {}", stderr))
    }
}
