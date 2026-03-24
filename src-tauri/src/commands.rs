use crate::models::*;
use std::process::Stdio;
use std::sync::Arc;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio::sync::Mutex;

// 全局下载进度状态
lazy_static::lazy_static! {
    static ref DOWNLOAD_PROGRESS: Arc<Mutex<DownloadProgress>> = 
        Arc::new(Mutex::new(DownloadProgress::default()));
    static ref DOWNLOAD_CANCELLED: Arc<Mutex<bool>> = 
        Arc::new(Mutex::new(false));
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
        .arg("scripts/download.py")
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
    
    // 构建yt-dlp命令
    let mut cmd = Command::new("python3");
    cmd.arg("scripts/download.py")
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
    
    let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
    let reader = BufReader::new(stdout);
    let mut lines = reader.lines();
    
    // 读取进度输出
    while let Ok(Some(line)) = lines.next_line().await {
        // 检查是否被取消
        let is_cancelled = *DOWNLOAD_CANCELLED.lock().await;
        if is_cancelled {
            let _ = child.kill().await;
            let mut progress = DOWNLOAD_PROGRESS.lock().await;
            progress.status = "cancelled".to_string();
            return Ok(DownloadResult {
                success: false,
                file_path: None,
                error: Some("下载已取消".to_string()),
            });
        }
        
        // 解析进度行 (格式: PROGRESS:progress:downloaded:total:speed:eta)
        if line.starts_with("PROGRESS:") {
            let parts: Vec<&str> = line.trim_start_matches("PROGRESS:").split(':').collect();
            if parts.len() >= 5 {
                let mut progress = DOWNLOAD_PROGRESS.lock().await;
                progress.progress = parts[0].parse().unwrap_or(0.0);
                progress.downloaded_bytes = parts[1].parse().unwrap_or(0);
                progress.total_bytes = parts[2].parse().ok();
                progress.speed = Some(parts[3].to_string());
                progress.eta = Some(parts[4].to_string());
            }
        }
        
        // 解析完成消息
        if line.starts_with("COMPLETE:") {
            let file_path = line.trim_start_matches("COMPLETE:").to_string();
            let mut progress = DOWNLOAD_PROGRESS.lock().await;
            progress.status = "completed".to_string();
            progress.progress = 100.0;
            
            return Ok(DownloadResult {
                success: true,
                file_path: Some(file_path),
                error: None,
            });
        }
        
        // 解析错误消息
        if line.starts_with("ERROR:") {
            let error_msg = line.trim_start_matches("ERROR:").to_string();
            let mut progress = DOWNLOAD_PROGRESS.lock().await;
            progress.status = "error".to_string();
            progress.error_message = Some(error_msg.clone());
            
            return Ok(DownloadResult {
                success: false,
                file_path: None,
                error: Some(error_msg),
            });
        }
    }
    
    // 等待进程结束
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
        progress.error_message = Some("下载失败".to_string());
        
        Ok(DownloadResult {
            success: false,
            file_path: None,
            error: Some("下载失败".to_string()),
        })
    }
}

/// 获取当前下载进度
#[tauri::command]
pub async fn get_download_progress() -> Result<DownloadProgress, String> {
    let progress = DOWNLOAD_PROGRESS.lock().await;
    Ok(progress.clone())
}

/// 取消下载
#[tauri::command]
pub async fn cancel_download() -> Result<(), String> {
    let mut cancelled = DOWNLOAD_CANCELLED.lock().await;
    *cancelled = true;
    Ok(())
}

/// 验证抖音链接格式
fn is_valid_douyin_url(url: &str) -> bool {
    url.contains("douyin.com") || url.contains("iesdouyin.com")
}
