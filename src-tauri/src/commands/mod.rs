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
        .arg("--info")
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
    let output_dir = options.output_path.unwrap_or_else(|| "./downloads".to_string());
    let filename = options.filename.unwrap_or_else(|| "%(title)s.%(ext)s".to_string());
    let output_template = format!("{}/{}", output_dir, filename);

    // 确保下载目录存在
    std::fs::create_dir_all(&output_dir).map_err(|e| format!("创建下载目录失败: {}", e))?;

    // 构建下载命令
    let mut cmd = Command::new("python3");
    cmd.arg("src-tauri/python/downloader.py")
        .arg("--download")
        .arg(&url)
        .arg("--output")
        .arg(&output_template);

    if let Some(format_id) = options.format_id {
        cmd.arg("--format").arg(format_id);
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

        Ok(DownloadResult {
            success: true,
            file_path: Some(output_template),
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
