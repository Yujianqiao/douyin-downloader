/**
 * 带字幕去除功能的下载组件
 * 集成到现有下载流程
 */

import React, { useState, useCallback } from 'react';
import { Download, Sparkles, FileVideo, CheckCircle } from 'lucide-react';
import { SubtitleRemover } from './SubtitleRemover';

interface DownloadTask {
  id: string;
  url: string;
  status: 'pending' | 'downloading' | 'completed' | 'error';
  progress: number;
  filePath?: string;
  outputPath?: string;
}

export const DownloadWithSubtitleRemoval: React.FC = () => {
  const [url, setUrl] = useState('');
  const [enableSubtitleRemoval, setEnableSubtitleRemoval] = useState(false);
  const [tasks, setTasks] = useState<DownloadTask[]>([]);
  const [currentTask, setCurrentTask] = useState<DownloadTask | null>(null);

  // 添加下载任务
  const addTask = useCallback(() => {
    if (!url.trim()) return;

    const newTask: DownloadTask = {
      id: Date.now().toString(),
      url: url.trim(),
      status: 'pending',
      progress: 0,
    };

    setTasks((prev) => [...prev, newTask]);
    setCurrentTask(newTask);
    setUrl('');

    // 模拟下载完成（实际应调用下载API）
    setTimeout(() => {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === newTask.id
            ? { ...t, status: 'completed', filePath: `/downloads/video_${t.id}.mp4` }
            : t
        )
      );
      setCurrentTask((prev) =>
        prev?.id === newTask.id
          ? { ...prev, status: 'completed', filePath: `/downloads/video_${newTask.id}.mp4` }
          : prev
      );
    }, 2000);
  }, [url]);

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
          AI 字幕去除
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
            onClick={addTask}
            disabled={!url.trim()}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            下载
          </button>
        </div>

        {/* 字幕去除开关 */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={enableSubtitleRemoval}
              onChange={(e) => setEnableSubtitleRemoval(e.target.checked)}
              className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
              <Sparkles className="w-4 h-4 text-blue-500" />
              下载完成后自动去除字幕
            </span>
          </label>
          <span className="text-xs text-gray-500">
            使用 AI 技术智能识别并去除视频中的字幕
          </span>
        </div>
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
                  {currentTask.status === 'completed' ? '已完成' : currentTask.status === 'downloading' ? '下载中...' : '等待中'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${currentTask.progress}%` }}
                />
              </div>
              {currentTask.filePath && (
                <div className="p-3 bg-green-50 rounded-lg flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-700">下载完成</span>
                </div>
              )}
            </div>
          </div>

          {/* 字幕去除 */}
          {enableSubtitleRemoval && currentTask.filePath && (
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
                  {task.outputPath && (
                    <span className="text-xs text-blue-500 bg-blue-50 px-2 py-1 rounded">
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

export default DownloadWithSubtitleRemoval;
