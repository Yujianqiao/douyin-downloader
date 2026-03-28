import React, { useState, useCallback } from 'react';
import { Upload, Droplets, Type, Loader2, Check, AlertCircle, FileVideo } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface LocalVideoPageProps {
  defaultSettings: {
    downloadPath: string;
  };
}

export const LocalVideoPage: React.FC<LocalVideoPageProps> = ({ defaultSettings }) => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [outputPath, setOutputPath] = useState(defaultSettings.downloadPath);
  const [removeWatermark, setRemoveWatermark] = useState(false);
  const [removeSubtitle, setRemoveSubtitle] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // 选择本地视频文件（使用原生文件选择）
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const handleSelectFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 注意：浏览器无法获取完整路径，需要用户手动输入或使用其他方式
      setSelectedFile(file.name);
      setError(null);
      setSuccess(false);
    }
  };

  // 处理视频
  const handleProcess = async () => {
    if (!selectedFile) {
      setError('请先选择视频文件');
      return;
    }

    if (!removeWatermark && !removeSubtitle) {
      setError('请至少选择一项处理功能（去水印或去字幕）');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setError(null);
    setSuccess(false);

    try {
      const result = await invoke<{
        success: boolean;
        output_path?: string;
        error?: string;
      }>('process_local_video', {
        inputPath: selectedFile,
        outputPath: outputPath,
        removeWatermark: removeWatermark,
        removeSubtitle: removeSubtitle,
      });

      if (result.success) {
        setSuccess(true);
        setSelectedFile(null);
      } else {
        setError(result.error || '处理失败');
      }
    } catch (err) {
      console.error('处理视频失败:', err);
      setError(err instanceof Error ? err.message : '处理视频失败');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* 标题 */}
      <div className="card-douyin p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-2 flex items-center gap-2">
          <Upload className="w-5 h-5 text-douyin-red" />
          本地上传视频处理
        </h3>
        <p className="text-text-secondary text-sm">
          上传本地视频文件，进行去水印或去字幕处理
        </p>
      </div>

      {/* 文件选择 */}
      <div className="card-douyin p-6">
        <h4 className="text-base font-medium text-text-primary mb-4">选择视频文件</h4>
        
        {/* 隐藏的文件输入 */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp4,.avi,.mov,.mkv,.flv,.wmv"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        
        <div className="flex gap-3 mb-3">
          <input
            type="text"
            value={selectedFile || ''}
            onChange={(e) => setSelectedFile(e.target.value)}
            placeholder="输入完整文件路径，如: D:\\Videos\\video.mp4"
            className="input-douyin flex-1"
          />
          <button
            onClick={handleSelectFile}
            disabled={isProcessing}
            className="btn-primary px-6 flex items-center gap-2 disabled:opacity-50"
          >
            <FileVideo className="w-4 h-4" />
            浏览
          </button>
        </div>
        
        <p className="text-xs text-text-tertiary">
          提示：由于浏览器安全限制，无法自动获取完整路径。请手动输入完整路径或点击"浏览"选择文件。
        </p>

        {selectedFile && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-douyin">
            <p className="text-green-700 flex items-center gap-2">
              <Check className="w-4 h-4" />
              已选择: {selectedFile.split(/[/\\]/).pop()}
            </p>
          </div>
        )}
      </div>

      {/* 输出路径 */}
      <div className="card-douyin p-6">
        <h4 className="text-base font-medium text-text-primary mb-4">输出位置</h4>
        <input
          type="text"
          value={outputPath}
          onChange={(e) => setOutputPath(e.target.value)}
          className="input-douyin w-full"
          placeholder="选择输出路径..."
        />
        <p className="text-xs text-text-tertiary mt-2">
          处理后的视频将保存到该目录
        </p>
      </div>

      {/* 功能选择 */}
      <div className="card-douyin p-6">
        <h4 className="text-base font-medium text-text-primary mb-4">处理功能</h4>
        
        <div className="grid grid-cols-2 gap-4">
          {/* 去水印开关 */}
          <button
            onClick={() => setRemoveWatermark(!removeWatermark)}
            disabled={isProcessing}
            className={`p-4 border rounded-douyin flex items-center gap-3 transition-all duration-200 disabled:opacity-50 ${
              removeWatermark
                ? 'border-douyin-red bg-douyin-red/5'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              removeWatermark ? 'bg-douyin-red text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              <Droplets className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="font-medium text-text-primary">去水印</div>
              <div className="text-xs text-text-tertiary">去除视频水印</div>
            </div>
            <div className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              removeWatermark ? 'border-douyin-red bg-douyin-red' : 'border-gray-300'
            }`}>
              {removeWatermark && <Check className="w-3 h-3 text-white" />}
            </div>
          </button>

          {/* 去字幕开关 */}
          <button
            onClick={() => setRemoveSubtitle(!removeSubtitle)}
            disabled={isProcessing}
            className={`p-4 border rounded-douyin flex items-center gap-3 transition-all duration-200 disabled:opacity-50 ${
              removeSubtitle
                ? 'border-douyin-red bg-douyin-red/5'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              removeSubtitle ? 'bg-douyin-red text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              <Type className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="font-medium text-text-primary">去字幕</div>
              <div className="text-xs text-text-tertiary">AI 智能去除字幕</div>
            </div>
            <div className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              removeSubtitle ? 'border-douyin-red bg-douyin-red' : 'border-gray-300'
            }`}>
              {removeSubtitle && <Check className="w-3 h-3 text-white" />}
            </div>
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-douyin flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-700 font-medium">处理失败</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* 成功提示 */}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-douyin flex items-start gap-3">
          <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-green-700 font-medium">处理成功</p>
            <p className="text-green-600 text-sm mt-1">
              视频已处理完成并保存到输出目录
            </p>
          </div>
        </div>
      )}

      {/* 进度条 */}
      {isProcessing && (
        <div className="card-douyin p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-text-primary">处理进度</span>
            <span className="text-sm text-text-secondary">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-douyin-red h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* 开始处理按钮 */}
      <button
        onClick={handleProcess}
        disabled={isProcessing || !selectedFile}
        className="w-full btn-primary py-4 text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            处理中...
          </>
        ) : (
          <>
            <Upload className="w-5 h-5" />
            开始处理
          </>
        )}
      </button>
    </div>
  );
};
