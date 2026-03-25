use serde::{Deserialize, Serialize};

/// 视频信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoInfo {
    pub title: String,
    pub author: String,
    pub duration: Option<f64>,
    pub thumbnail: Option<String>,
    pub formats: Vec<VideoFormat>,
    pub original_url: String,
}

/// 视频格式/清晰度选项
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoFormat {
    pub format_id: String,
    pub quality: String,
    pub resolution: Option<String>,
    pub filesize: Option<u64>,
    pub ext: String,
}

/// 下载选项
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadOptions {
    pub format_id: Option<String>,
    pub output_path: Option<String>,
    pub filename: Option<String>,
    pub remove_watermark: Option<bool>,
    pub remove_subtitle: Option<bool>,
}

/// 下载进度
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadProgress {
    pub status: String, // "pending", "downloading", "completed", "error", "cancelled"
    pub progress: f64,  // 0.0 - 100.0
    pub downloaded_bytes: u64,
    pub total_bytes: Option<u64>,
    pub speed: Option<String>,
    pub eta: Option<String>,
    pub error_message: Option<String>,
}

impl Default for DownloadProgress {
    fn default() -> Self {
        Self {
            status: "pending".to_string(),
            progress: 0.0,
            downloaded_bytes: 0,
            total_bytes: None,
            speed: None,
            eta: None,
            error_message: None,
        }
    }
}

/// 解析链接结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParseResult {
    pub success: bool,
    pub video_info: Option<VideoInfo>,
    pub error: Option<String>,
}

/// 下载结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadResult {
    pub success: bool,
    pub file_path: Option<String>,
    pub error: Option<String>,
}
