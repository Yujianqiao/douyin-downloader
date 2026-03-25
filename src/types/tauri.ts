/**
 * Tauri 后端 API 类型定义
 * 对应 Rust 后端的 models.rs
 */

// 视频格式/清晰度选项
export interface VideoFormat {
  format_id: string;
  quality: string;
  resolution?: string;
  filesize?: number;
  ext: string;
}

// 视频信息
export interface VideoInfo {
  title: string;
  author: string;
  duration?: number;
  thumbnail?: string;
  formats: VideoFormat[];
  original_url: string;
}

// 下载选项
export interface DownloadOptions {
  format_id?: string;
  output_path?: string;
  filename?: string;
  remove_watermark?: boolean;
  remove_subtitle?: boolean;
}

// 下载进度
export interface DownloadProgress {
  status: 'pending' | 'downloading' | 'completed' | 'error' | 'cancelled';
  progress: number;  // 0.0 - 100.0
  downloaded_bytes: number;
  total_bytes?: number;
  speed?: string;
  eta?: string;
  error_message?: string;
}

// 解析链接结果
export interface ParseResult {
  success: boolean;
  video_info?: VideoInfo;
  error?: string;
}

// 下载结果
export interface DownloadResult {
  success: boolean;
  file_path?: string;
  error?: string;
}

// 下载任务（前端扩展）
export interface DownloadTask {
  id: string;
  url: string;
  videoInfo?: VideoInfo;
  options: DownloadOptions;
  progress: DownloadProgress;
  createdAt: number;
  completedAt?: number;
  processing?: {
    remove_watermark: boolean;
    remove_subtitle: boolean;
    status: 'pending' | 'processing' | 'completed' | 'error';
    progress?: number;
  };
}

// 历史记录项
export interface HistoryItem {
  id: string;
  url: string;
  title: string;
  author: string;
  thumbnail?: string;
  filePath: string;
  fileSize?: number;
  downloadDate: number;
  duration?: number;
}

// 应用设置
export interface AppSettings {
  defaultDownloadPath: string;
  defaultQuality: string;
  maxConcurrentDownloads: number;
  enableNotifications: boolean;
  namingRule: string;
}
