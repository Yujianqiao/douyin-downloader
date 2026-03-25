import { invoke } from '@tauri-apps/api/core';
import type {
  ParseResult,
  DownloadResult,
  DownloadOptions,
  DownloadProgress,
} from '../types/tauri';

/**
 * 解析抖音链接，获取视频信息
 * @param url 抖音视频链接
 * @returns 解析结果
 */
export async function parseLink(url: string): Promise<ParseResult> {
  try {
    const result = await invoke<ParseResult>('parse_link', { url });
    return result;
  } catch (error) {
    console.error('解析链接失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '解析失败',
    };
  }
}

/**
 * 下载视频
 * @param url 抖音视频链接
 * @param options 下载选项
 * @returns 下载结果
 */
export async function downloadVideo(
  url: string,
  options: DownloadOptions
): Promise<DownloadResult> {
  try {
    const result = await invoke<DownloadResult>('download_video', {
      url,
      options,
    });
    return result;
  } catch (error) {
    console.error('下载视频失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '下载失败',
    };
  }
}

/**
 * 获取当前下载进度
 * @returns 下载进度信息
 */
export async function getDownloadProgress(): Promise<DownloadProgress> {
  try {
    const progress = await invoke<DownloadProgress>('get_download_progress');
    return progress;
  } catch (error) {
    console.error('获取下载进度失败:', error);
    return {
      status: 'error',
      progress: 0,
      downloaded_bytes: 0,
      error_message: error instanceof Error ? error.message : '获取进度失败',
    };
  }
}

/**
 * 取消当前下载
 */
export async function cancelDownload(): Promise<void> {
  try {
    await invoke('cancel_download');
  } catch (error) {
    console.error('取消下载失败:', error);
    throw error;
  }
}

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @returns 格式化后的字符串
 */
export function formatFileSize(bytes?: number): string {
  if (bytes === undefined || bytes === null) return '未知大小';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * 格式化时长
 * @param seconds 秒数
 * @returns 格式化后的字符串 (MM:SS)
 */
export function formatDuration(seconds?: number): string {
  if (seconds === undefined || seconds === null) return '--:--';
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 生成唯一ID
 * @returns 唯一ID字符串
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 使用系统默认播放器打开视频文件
 * @param filePath 视频文件路径
 */
export async function openVideoFile(filePath: string): Promise<void> {
  try {
    await invoke('open_video_file', { filePath });
  } catch (error) {
    console.error('打开视频文件失败:', error);
    throw error;
  }
}

/**
 * 打开文件所在文件夹
 * @param filePath 文件路径
 */
export async function openFileFolder(filePath: string): Promise<void> {
  try {
    await invoke('open_file_folder', { filePath });
  } catch (error) {
    console.error('打开文件夹失败:', error);
    throw error;
  }
}
