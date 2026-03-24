/**
 * 字幕去除组件
 * 提供视频字幕检测和去除功能
 */

import React, { useState, useCallback } from 'react';
import { Loader2, Play, Square, CheckCircle, AlertCircle, Settings, Video } from 'lucide-react';
import { useSubtitleRemover } from '../hooks/useSubtitleRemover';

interface SubtitleRemoverProps {
  videoPath: string;
  onComplete?: (outputPath: string) => void;
  onError?: (error: string) => void;
}

export const SubtitleRemover: React.FC<SubtitleRemoverProps> = ({
  videoPath,
  onComplete,
  onError,
}) => {
  const [detectMethod, setDetectMethod] = useState<'auto' | 'ocr'>('auto');
  const [showSettings, setShowSettings] = useState(false);

  const {
    isProcessing,
    progress,
    status,
    message,
    removeSubtitles,
    cancelProcessing,
    reset,
  } = useSubtitleRemover({
    onComplete,
    onError,
  });

  // 开始去除字幕
  const handleStart = useCallback(async () => {
    if (!videoPath) {
      return;
    }

    const outputPath = videoPath.replace(/\.[^.]+$/, '_no_subtitle.mp4');

    await removeSubtitles({
      input_path: videoPath,
      output_path: outputPath,
      detect_method: detectMethod,
      sample_interval: 30,
    });
  }, [videoPath, detectMethod, removeSubtitles]);

  // 取消处理
  const handleCancel = useCallback(async () => {
    await cancelProcessing();
  }, [cancelProcessing]);

  // 获取状态颜色
  const getStatusColor = () => {
    switch (status) {
      case 'processing':
        return 'text-blue-500';
      case 'completed':
        return 'text-green-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  // 获取状态图标
  const getStatusIcon = () => {
    switch (status) {
      case 'processing':
        return <Loader2 className="w-5 h-5 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Video className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Settings className="w-5 h-5" />
          AI 字幕去除
        </h3>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="text-sm text-blue-500 hover:text-blue-600 transition-colors"
        >
          {showSettings ? '隐藏设置' : '显示设置'}
        </button>
      </div>

      {/* 设置面板 */}
      {showSettings && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                检测模式
              </label>
              <select
                value={detectMethod}
                onChange={(e) => setDetectMethod(e.target.value as 'auto' | 'ocr')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="auto">自动检测（推荐）</option>
                <option value="ocr">OCR 识别（更精确）</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                自动检测：快速识别底部字幕区域<br />
                OCR 识别：逐帧识别文字位置（较慢但更精确）
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 进度显示 */}
      {status !== 'idle' && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className={`text-sm font-medium ${getStatusColor()}`}>
                {message}
              </span>
            </div>
            <span className="text-sm text-gray-500">
              {progress.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex gap-3">
        {!isProcessing ? (
          <button
            onClick={handleStart}
            disabled={!videoPath || status === 'completed'}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Play className="w-4 h-4" />
            {status === 'completed' ? '已完成' : '开始去除字幕'}
          </button>
        ) : (
          <button
            onClick={handleCancel}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            <Square className="w-4 h-4" />
            取消处理
          </button>
        )}

        {status === 'completed' && (
          <button
            onClick={reset}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            重置
          </button>
        )}
      </div>

      {/* 提示信息 */}
      {!videoPath && (
        <p className="text-sm text-gray-500 mt-3 text-center">
          请先选择或下载视频文件
        </p>
      )}
    </div>
  );
};

export default SubtitleRemover;
