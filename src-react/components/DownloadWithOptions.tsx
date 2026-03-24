/**
 * 带选项的下载组件
 * 支持去水印和去字幕功能
 */

import React, { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { Download, Sparkles, Droplets, FileVideo, CheckCircle, AlertCircle } from 'lucide-react';
import { SubtitleRemover } from './SubtitleRemover';

interface DownloadTask {
  id: string;
  url: string;
  status: 'pending' | 'downloading' | 'completed' | 'error';
  progress: number;
  filePath?: string;
  outputPath?: string;
  error?: string;
}

interface DownloadOptions {
  removeWatermark: boolean;
  removeSubtitle: boolean;
}

export const DownloadWithOptions: React.FC = () => {
  const [url, setUrl] = useState('');
  const [options, setOptions] = useState<DownloadOptions>({
    removeWatermark: true,
    removeSubtitle: false,
  });
  const [tasks, setTasks] = useState<DownloadTask[]>([]);
  const [currentTask, setCurrentTask] = useState<DownloadTask | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [parseError, setParseError] = useState('');

  // 解析链接
  const handleParse = useCallback(async () => {
    if (!url.trim()) {
      setParseError('请输入抖音视频链接');
      return;
    }

    setIsLoading(true);
    setParseError('');

    try {
      // 调用 Tauri 命令解析链接
      const result = await invoke('parse_link', { url: url.trim() });
      
      if (result.success && result.video_info) {
        // 解析成功，创建任务
        const newTask: DownloadTask = {
          id: Date.now().toString(),
          url: url.trim(),
          status: 'pending',
          progress: 0,
        };
        setTasks((prev) => [...prev, newTask]);
        setCurrentTask(newTask);
        setUrl('');
      } else {
        setParseError(result.error || '解析失败，请检查链接格式');
      }
    } catch (error) {
      setParseError(`解析出错: ${error}`);
    } finally {
      setIsLoading(false);
    }
  }, [url]);

  // 开始下载
  const handleDownload = useCallback(async () => {
    if (!currentTask) return;

    setIsLoading(true);
    
    try {
      // 调用下载命令
      const downloadOptions = {
        url: currentTask.url,
        remove_watermark: options.removeWatermark,
        remove_subtitle: options.removeSubtitle,
      };

      const result = await invoke('download_video', { options: downloadOptions });
      
      if (result.success) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === currentTask.id
              ? { ...t, status: 'completed', filePath: result.file_path }
              : t
          )
        );
        setCurrentTask((prev) =>
          prev ? { ...prev, status: 'completed', filePath: result.file_path } : null
        );
      } else {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === currentTask.id
              ? { ...t, status: 'error', error: result.error }
              : t
          )
        );
      }
    } catch (error) {
      console.error('下载失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentTask, options]);

  // 字幕去除完成回调
  const handleSubtitleComplete = useCallback((outputPath: string) => {
    if (currentTask) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === currentTask.id ? { ...t, outputPath } : t
        )
      );
    }
  }, [currentTask]);

  // 字幕去除错误回调
  const handleSubtitleError = useCallback((error: string) => {
    console.error('字幕去除失败:', error);
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <Download className="w-6 h-6" />
        抖音视频下载器
        <span className="text-sm font-normal text-blue-500 bg-blue-50 px-2 py-1 rounded-full flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          AI 增强版
        </span>
      </h1>

      {/* URL 输入区域 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="粘贴抖音视频链接..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleParse}
            disabled={!url.trim() || isLoading}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                解析中...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                解析
              </>
            )}
          </button>
        </div>

        {/* 错误提示 */}
        {parseError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-700">{parseError}</span>
          </div>
        )}

        {/* 功能选项开关 */}
        <div className="space-y-3">
          {/* 去水印开关 */}
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.removeWatermark}
                onChange={(e) => setOptions((prev) => ({ ...prev, removeWatermark: e.target.checked }))}
                className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <Droplets className="w-4 h-4 text-blue-500" />
                自动去水印
              </span>
            </label>
            <span className="text-xs text-gray-500">
              下载无水印高清视频
            </span>
          </div>

          {/* 去字幕开关 */}
          <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.removeSubtitle}
                onChange={(e) => setOptions((prev) => ({ ...prev, removeSubtitle: e.target.checked }))}
                className="w-4 h-4 text-purple-500 rounded focus:ring-purple-500"
              />
              <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-purple-500" />
                AI 去字幕
              </span>
            </label>
            <span className="text-xs text-gray-500">
              智能识别并去除视频字幕
            </span>
          </div>
        </div>

        {/* 下载按钮 */}
        {currentTask && currentTask.status === 'pending' && (
          <div className="mt-4">
            <button
              onClick={handleDownload}
              disabled={isLoading}
              className="w-full px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  下载中...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  开始下载
                  {options.removeWatermark && <span className="text-xs bg-green-600 px-2 py-0.5 rounded">去水印</span>}
                  {options.removeSubtitle && <span className="text-xs bg-purple-600 px-2 py-0.5 rounded">去字幕</span>}
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* 当前任务区域 */}
      {currentTask && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 下载状态 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FileVideo className="w-5 h-5" />
              下载状态
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">状态</span>
                <span
                  className={`text-sm font-medium ${
                    currentTask.status === 'completed'
                      ? 'text-green-500'
                      : currentTask.status === 'error'
                      ? 'text-red-500'
                      : 'text-blue-500'
                  }`}
                >
                  {currentTask.status === 'completed' ? '已完成' : 
                   currentTask.status === 'error' ? '失败' : 
                   currentTask.status === 'downloading' ? '下载中...' : '等待中'}
                </span>
              </div>
              
              {currentTask.status === 'downloading' && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${currentTask.progress}%` }}
                  />
                </div>
              )}
              
              {currentTask.filePath && (
                <div className="p-3 bg-green-50 rounded-lg flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-700">下载完成</span>
                </div>
              )}
              
              {currentTask.error && (
                <div className="p-3 bg-red-50 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-red-700">{currentTask.error}</span>
                </div>
              )}
            </div>
          </div>

          {/* 字幕去除 */}
          {options.removeSubtitle && currentTask.filePath && (
            <SubtitleRemover
              videoPath={currentTask.filePath}
              onComplete={handleSubtitleComplete}
              onError={handleSubtitleError}
            />
          )}
        </div>
      )}

      {/* 任务列表 */}
      {tasks.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">下载历史</h2>
          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <FileVideo className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-700 truncate max-w-xs">
                    {task.url}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {task.status === 'completed' && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                  {task.status === 'error' && (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                  {task.outputPath && (
                    <span className="text-xs text-purple-500 bg-purple-50 px-2 py-1 rounded">
                      已去字幕
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DownloadWithOptions;