import React, { useState, useCallback } from 'react';
import { Link2, Loader2, Download, FolderOpen, Check, AlertCircle, Droplets, Type } from 'lucide-react';
import type { VideoInfo, VideoFormat, DownloadOptions } from '../types/tauri';
import { parseLink, downloadVideo, formatFileSize, formatDuration, generateId } from '../utils/tauri';

interface DownloadPageProps {
  onDownloadStart: (task: any) => void;
  defaultSettings: {
    downloadPath: string;
    defaultQuality: string;
    pythonPath?: string;
  };
}

export const DownloadPage: React.FC<DownloadPageProps> = ({ onDownloadStart, defaultSettings }) => {
  const [url, setUrl] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<string>('');
  const [outputPath, setOutputPath] = useState(defaultSettings.downloadPath);
  const [customFilename, setCustomFilename] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [removeWatermark, setRemoveWatermark] = useState(false);
  const [removeSubtitle, setRemoveSubtitle] = useState(false);

  // 处理粘贴事件
  const lastPastedUrl = React.useRef<string>('');
  
  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    const pastedText = e.clipboardData?.getData('text');
    if (pastedText && (pastedText.includes('douyin.com') || pastedText.includes('iesdouyin.com'))) {
      // 防止重复粘贴
      if (pastedText === lastPastedUrl.current) {
        return;
      }
      lastPastedUrl.current = pastedText;
      
      setUrl(pastedText);
      // 自动触发解析
      setTimeout(() => handleParse(pastedText), 100);
    }
  }, []);

  // 监听粘贴事件
  React.useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  // 解析链接
  const handleParse = async (inputUrl?: string) => {
    const targetUrl = inputUrl || url;
    if (!targetUrl.trim()) return;

    setIsParsing(true);
    setParseError(null);
    setVideoInfo(null);

    try {
      const result = await parseLink(targetUrl.trim(), defaultSettings.pythonPath);
      
      if (result.success && result.video_info) {
        setVideoInfo(result.video_info);
        // 默认选择最高画质
        if (result.video_info.formats.length > 0) {
          setSelectedFormat(result.video_info.formats[0].format_id);
        }
      } else {
        setParseError(result.error || '解析失败，请检查链接是否正确');
      }
    } catch (error) {
      setParseError('解析过程中发生错误');
    } finally {
      setIsParsing(false);
    }
  };

  // 开始下载
  const handleDownload = async () => {
    if (!videoInfo) return;

    setIsDownloading(true);

    const options: DownloadOptions = {
      format_id: selectedFormat,
      output_path: outputPath,
      filename: customFilename || '%(title)s.%(ext)s',
      remove_watermark: removeWatermark,
      remove_subtitle: removeSubtitle,
    };

    // 创建任务对象
    const task = {
      id: generateId(),
      url: videoInfo.original_url,
      videoInfo,
      options,
      progress: {
        status: 'downloading' as const,
        progress: 0,
        downloaded_bytes: 0,
      },
      createdAt: Date.now(),
    };

    onDownloadStart(task);

    try {
      await downloadVideo(videoInfo.original_url, options);
    } catch (error) {
      console.error('下载失败:', error);
    } finally {
      setIsDownloading(false);
      // 重置表单
      setUrl('');
      setVideoInfo(null);
      setCustomFilename('');
    }
  };

  // 获取选中的格式信息
  const getSelectedFormatInfo = (): VideoFormat | undefined => {
    return videoInfo?.formats.find(f => f.format_id === selectedFormat);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* 链接输入区域 */}
      <div className="card-douyin p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Link2 className="w-5 h-5 text-douyin-red" />
          粘贴抖音链接
        </h3>
        
        <div className="flex gap-3">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://v.douyin.com/xxxxx 或 https://www.douyin.com/video/xxxxx"
            className="input-douyin flex-1"
            onKeyDown={(e) => e.key === 'Enter' && handleParse()}
          />
          <button
            onClick={() => handleParse()}
            disabled={isParsing || !url.trim()}
            className="btn-primary px-6 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isParsing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                解析中...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                解析
              </>
            )}
          </button>
        </div>

        {parseError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-douyin flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-700 font-medium">解析失败</p>
              <p className="text-red-600 text-sm mt-1">{parseError}</p>
            </div>
          </div>
        )}
      </div>

      {/* 视频预览卡片 */}
      {videoInfo && (
        <div className="card-douyin p-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <h3 className="text-lg font-semibold text-text-primary mb-4">视频信息</h3>
          
          <div className="flex gap-6">
            {/* 缩略图 */}
            <div className="w-48 h-36 bg-gray-100 rounded-douyin overflow-hidden flex-shrink-0">
              {videoInfo.thumbnail ? (
                <img
                  src={videoInfo.thumbnail}
                  alt={videoInfo.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-text-tertiary">
                  暂无缩略图
                </div>
              )}
            </div>

            {/* 视频详情 */}
            <div className="flex-1 space-y-3">
              <h4 className="font-semibold text-text-primary text-lg line-clamp-2">
                {videoInfo.title}
              </h4>
              <p className="text-text-secondary">
                <span className="text-text-tertiary">作者：</span>
                {videoInfo.author}
              </p>
              <p className="text-text-secondary">
                <span className="text-text-tertiary">时长：</span>
                {formatDuration(videoInfo.duration)}
              </p>
            </div>
          </div>

          {/* 下载选项 */}
          <div className="mt-6 pt-6 border-t border-gray-100 space-y-4">
            {/* 画质选择 */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                选择画质
              </label>
              <div className="grid grid-cols-3 gap-3">
                {videoInfo.formats.map((format) => (
                  <button
                    key={format.format_id}
                    onClick={() => setSelectedFormat(format.format_id)}
                    className={`p-3 border rounded-douyin text-left transition-all duration-200 ${
                      selectedFormat === format.format_id
                        ? 'border-douyin-red bg-douyin-red/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-text-primary">
                      {format.quality}
                    </div>
                    <div className="text-xs text-text-tertiary mt-1">
                      {format.resolution || '未知分辨率'} · {formatFileSize(format.filesize)}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 保存路径 */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                保存位置
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={outputPath}
                  onChange={(e) => setOutputPath(e.target.value)}
                  className="input-douyin flex-1"
                  placeholder="选择保存路径..."
                />
                <button className="btn-secondary flex items-center gap-2">
                  <FolderOpen className="w-4 h-4" />
                  浏览
                </button>
              </div>
            </div>

            {/* 文件名 */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                文件名（可选）
              </label>
              <input
                type="text"
                value={customFilename}
                onChange={(e) => setCustomFilename(e.target.value)}
                className="input-douyin w-full"
                placeholder="%(title)s.%(ext)s（使用默认命名规则）"
              />
              <p className="text-xs text-text-tertiary mt-1">
                支持变量：%(title)s - 视频标题, %(author)s - 作者名, %(ext)s - 扩展名
              </p>
            </div>

            {/* 功能开关 */}
            <div className="grid grid-cols-2 gap-4">
              {/* 去水印开关 */}
              <button
                onClick={() => setRemoveWatermark(!removeWatermark)}
                className={`p-4 border rounded-douyin flex items-center gap-3 transition-all duration-200 ${
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
                  <div className="text-xs text-text-tertiary">自动去除视频水印</div>
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
                className={`p-4 border rounded-douyin flex items-center gap-3 transition-all duration-200 ${
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

            {/* 立即下载按钮 */}
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full btn-primary py-4 text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  准备下载...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  立即下载
                  {getSelectedFormatInfo()?.filesize && (
                    <span className="text-sm opacity-80">
                      ({formatFileSize(getSelectedFormatInfo()?.filesize)})
                    </span>
                  )}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 提示信息 */}
      {!videoInfo && !isParsing && !parseError && (
        <div className="text-center py-12 text-text-tertiary">
          <Link2 className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p>在上方粘贴抖音视频链接开始下载</p>
          <p className="text-sm mt-2">支持短链接和完整链接格式</p>
        </div>
      )}
    </div>
  );
};
