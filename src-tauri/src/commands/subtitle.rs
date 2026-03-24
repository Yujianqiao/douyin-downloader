//! 字幕去除命令模块
//! 提供视频字幕检测和去除的 Tauri 命令

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Command;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

/// 处理进度信息
#[derive(Clone, Serialize)]
pub struct ProgressPayload {
    pub percent: f64,
    pub current_frame: u32,
    pub total_frames: u32,
    pub status: String,
}

/// 字幕去除请求
#[derive(Deserialize)]
pub struct RemoveSubtitleRequest {
    pub input_path: String,
    pub output_path: String,
    pub detect_method: Option<String>, // "ocr" | "auto"
    pub sample_interval: Option<u32>,
}

/// 字幕去除响应
#[derive(Serialize)]
pub struct RemoveSubtitleResponse {
    pub success: bool,
    pub message: String,
    pub output_path: Option<String>,
}

/// 字幕区域信息
#[derive(Serialize)]
pub struct SubtitleArea {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
}

/// 处理状态
pub struct ProcessingState {
    pub is_processing: Mutex<bool>,
}

impl Default for ProcessingState {
    fn default() -> Self {
        Self {
            is_processing: Mutex::new(false),
        }
    }
}

/// 检测视频字幕区域
#[tauri::command]
pub async fn detect_subtitle_area(
    video_path: String,
    app: AppHandle,
) -> Result<Option<SubtitleArea>, String> {
    let python_script = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/../src-python/subtitle_detector.py"));
    
    // 创建临时脚本文件
    let temp_dir = std::env::temp_dir();
    let script_path = temp_dir.join("subtitle_detector_temp.py");
    std::fs::write(&script_path, python_script)
        .map_err(|e| format!("Failed to write temp script: {}", e))?;
    
    // 执行 Python 脚本检测字幕
    let output = Command::new("python3")
        .arg(&script_path)
        .arg("--detect")
        .arg(&video_path)
        .output()
        .map_err(|e| format!("Failed to execute detector: {}", e))?;
    
    // 清理临时文件
    let _ = std::fs::remove_file(&script_path);
    
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Detection failed: {}", stderr));
    }
    
    // 解析输出
    let stdout = String::from_utf8_lossy(&output.stdout);
    if stdout.trim().is_empty() {
        return Ok(None);
    }
    
    // 解析 "x,y,width,height" 格式
    let parts: Vec<u32> = stdout
        .trim()
        .split(',')
        .filter_map(|s| s.parse().ok())
        .collect();
    
    if parts.len() == 4 {
        Ok(Some(SubtitleArea {
            x: parts[0],
            y: parts[1],
            width: parts[2],
            height: parts[3],
        }))
    } else {
        Ok(None)
    }
}

/// 去除视频字幕（带进度回调）
#[tauri::command]
pub async fn remove_subtitles(
    request: RemoveSubtitleRequest,
    state: State<'_, ProcessingState>,
    app: AppHandle,
) -> Result<RemoveSubtitleResponse, String> {
    // 检查是否正在处理
    {
        let mut is_processing = state.is_processing.lock().unwrap();
        if *is_processing {
            return Ok(RemoveSubtitleResponse {
                success: false,
                message: "Another processing task is running".to_string(),
                output_path: None,
            });
        }
        *is_processing = true;
    }
    
    // 发送开始事件
    app.emit_all("subtitle:started", ())
        .map_err(|e| format!("Failed to emit event: {}", e))?;
    
    // 构建 Python 命令
    let detect_method = request.detect_method.unwrap_or_else(|| "auto".to_string());
    let sample_interval = request.sample_interval.unwrap_or(30);
    
    let python_path = get_python_path();
    let script_path = get_script_path();
    
    let mut cmd = Command::new(&python_path);
    cmd.arg(&script_path)
        .arg(&request.input_path)
        .arg(&request.output_path)
        .arg("--method")
        .arg(&detect_method)
        .arg("--interval")
        .arg(sample_interval.to_string());
    
    // 执行处理
    let result = cmd.output();
    
    // 释放处理锁
    {
        let mut is_processing = state.is_processing.lock().unwrap();
        *is_processing = false;
    }
    
    match result {
        Ok(output) => {
            if output.status.success() {
                // 发送完成事件
                let _ = app.emit_all("subtitle:completed", ProgressPayload {
                    percent: 100.0,
                    current_frame: 0,
                    total_frames: 0,
                    status: "completed".to_string(),
                });
                
                Ok(RemoveSubtitleResponse {
                    success: true,
                    message: "Subtitles removed successfully".to_string(),
                    output_path: Some(request.output_path),
                })
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                let _ = app.emit_all("subtitle:error", stderr.to_string());
                
                Ok(RemoveSubtitleResponse {
                    success: false,
                    message: format!("Processing failed: {}", stderr),
                    output_path: None,
                })
            }
        }
        Err(e) => {
            let _ = app.emit_all("subtitle:error", e.to_string());
            
            Ok(RemoveSubtitleResponse {
                success: false,
                message: format!("Execution error: {}", e),
                output_path: None,
            })
        }
    }
}

/// 取消正在进行的处理
#[tauri::command]
pub async fn cancel_subtitle_removal(
    state: State<'_, ProcessingState>,
) -> Result<bool, String> {
    let mut is_processing = state.is_processing.lock().unwrap();
    if *is_processing {
        *is_processing = false;
        Ok(true)
    } else {
        Ok(false)
    }
}

/// 获取处理状态
#[tauri::command]
pub async fn get_processing_status(
    state: State<'_, ProcessingState>,
) -> Result<bool, String> {
    let is_processing = state.is_processing.lock().unwrap();
    Ok(*is_processing)
}

/// 获取 Python 解释器路径
fn get_python_path() -> String {
    // 优先使用虚拟环境中的 Python
    let venv_python = PathBuf::from("../src-python/venv/bin/python3");
    if venv_python.exists() {
        return venv_python.to_string_lossy().to_string();
    }
    
    // 检查系统 Python
    if Command::new("python3").arg("--version").output().is_ok() {
        return "python3".to_string();
    }
    
    "python".to_string()
}

/// 获取脚本路径
fn get_script_path() -> PathBuf {
    // 开发环境
    let dev_path = PathBuf::from("../src-python/subtitle_remover.py");
    if dev_path.exists() {
        return dev_path.canonicalize().unwrap_or(dev_path);
    }
    
    // 生产环境（打包后）
    let exe_dir = std::env::current_exe()
        .unwrap_or_default()
        .parent()
        .unwrap_or(&std::path::Path::new("."))
        .to_path_buf();
    
    exe_dir.join("subtitle_remover.py")
}
