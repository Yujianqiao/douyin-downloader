import React, { useState, useEffect } from 'react';
import {
  FolderOpen,
  Bell,
  FileText,
  HardDrive,
  Save,
  RotateCcw,
  Check,
  AlertCircle,
} from 'lucide-react';
import type { AppSettings } from '../types/tauri';

interface SettingsPageProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  onSettingsChange,
}) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // 当外部设置变化时更新本地状态
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  // 处理设置变更
  const handleChange = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
    setSaveStatus('idle');
  };

  // 保存设置
  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      // TODO: 调用 Tauri 保存设置到配置文件
      onSettingsChange(localSettings);
      setHasChanges(false);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      setSaveStatus('error');
    }
  };

  // 重置设置
  const handleReset = () => {
    setLocalSettings(settings);
    setHasChanges(false);
    setSaveStatus('idle');
  };

  // 恢复默认设置
  const handleRestoreDefaults = () => {
    const defaultSettings: AppSettings = {
      defaultDownloadPath: './downloads',
      defaultQuality: 'best',
      maxConcurrentDownloads: 3,
      enableNotifications: true,
      namingRule: '%(title)s.%(ext)s',
    };
    setLocalSettings(defaultSettings);
    setHasChanges(true);
  };

  // 选择下载路径
  const handleSelectPath = async () => {
    // TODO: 调用 Tauri 打开文件夹选择对话框
    console.log('选择下载路径');
  };

  // 画质选项
  const qualityOptions = [
    { value: 'best', label: '最高画质', description: '下载可用的最高清晰度' },
    { value: '1080p', label: '1080P', description: '全高清' },
    { value: '720p', label: '720P', description: '高清' },
    { value: '480p', label: '480P', description: '标清' },
  ];

  // 命名规则变量说明
  const namingVariables = [
    { var: '%(title)s', desc: '视频标题' },
    { var: '%(author)s', desc: '作者名' },
    { var: '%(id)s', desc: '视频ID' },
    { var: '%(ext)s', desc: '文件扩展名' },
    { var: '%(upload_date)s', desc: '上传日期 (YYYYMMDD)' },
    { var: '%(resolution)s', desc: '分辨率' },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* 保存提示 */}
      {hasChanges && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-douyin p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <span className="text-yellow-800">您有未保存的更改</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="btn-secondary text-sm"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50"
            >
              {saveStatus === 'saving' ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  保存中...
                </>
              ) : saveStatus === 'saved' ? (
                <>
                  <Check className="w-4 h-4" />
                  已保存
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  保存设置
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 下载设置 */}
      <div className="card-douyin p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-6 flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-douyin-red" />
          下载设置
        </h3>

        <div className="space-y-6">
          {/* 默认下载路径 */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              默认下载路径
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={localSettings.defaultDownloadPath}
                onChange={(e) => handleChange('defaultDownloadPath', e.target.value)}
                className="input-douyin flex-1"
                placeholder="./downloads"
              />
              <button
                onClick={handleSelectPath}
                className="btn-secondary flex items-center gap-2"
              >
                <FolderOpen className="w-4 h-4" />
                浏览
              </button>
            </div>
            <p className="text-xs text-text-tertiary mt-1">
              下载的视频将默认保存到此位置
            </p>
          </div>

          {/* 默认画质 */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-3">
              默认画质
            </label>
            <div className="grid grid-cols-2 gap-3">
              {qualityOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start gap-3 p-4 border rounded-douyin cursor-pointer transition-all duration-200 ${
                    localSettings.defaultQuality === option.value
                      ? 'border-douyin-red bg-douyin-red/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="quality"
                    value={option.value}
                    checked={localSettings.defaultQuality === option.value}
                    onChange={(e) => handleChange('defaultQuality', e.target.value)}
                    className="mt-0.5 w-4 h-4 text-douyin-red focus:ring-douyin-red"
                  />
                  <div>
                    <div className="font-medium text-text-primary">{option.label}</div>
                    <div className="text-xs text-text-tertiary mt-0.5">
                      {option.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 同时下载任务数 */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              同时下载任务数
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="10"
                value={localSettings.maxConcurrentDownloads}
                onChange={(e) => handleChange('maxConcurrentDownloads', parseInt(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-douyin-red"
              />
              <span className="w-12 text-center font-medium text-text-primary">
                {localSettings.maxConcurrentDownloads}
              </span>
            </div>
            <p className="text-xs text-text-tertiary mt-1">
              建议设置为 1-3，过大的数值可能导致网络拥堵
            </p>
          </div>
        </div>
      </div>

      {/* 通知设置 */}
      <div className="card-douyin p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-6 flex items-center gap-2">
          <Bell className="w-5 h-5 text-douyin-red" />
          通知设置
        </h3>

        <label className="flex items-center justify-between p-4 bg-bg-secondary rounded-douyin cursor-pointer">
          <div>
            <div className="font-medium text-text-primary">下载完成通知</div>
            <div className="text-sm text-text-tertiary mt-1">
              当视频下载完成时显示系统通知
            </div>
          </div>
          <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-douyin-red focus:ring-offset-2">
            <input
              type="checkbox"
              checked={localSettings.enableNotifications}
              onChange={(e) => handleChange('enableNotifications', e.target.checked)}
              className="sr-only peer"
            />
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                localSettings.enableNotifications ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
            <span
              className={`absolute inset-0 rounded-full transition-colors ${
                localSettings.enableNotifications ? 'bg-douyin-red' : ''
              }`}
            />
          </div>
        </label>
      </div>

      {/* 命名规则 */}
      <div className="card-douyin p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-6 flex items-center gap-2">
          <FileText className="w-5 h-5 text-douyin-red" />
          文件命名规则
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              命名模板
            </label>
            <input
              type="text"
              value={localSettings.namingRule}
              onChange={(e) => handleChange('namingRule', e.target.value)}
              className="input-douyin w-full font-mono text-sm"
              placeholder="%(title)s.%(ext)s"
            />
          </div>

          {/* 可用变量 */}
          <div className="bg-bg-secondary rounded-douyin p-4">
            <p className="text-sm font-medium text-text-secondary mb-3">可用变量：</p>
            <div className="grid grid-cols-2 gap-2">
              {namingVariables.map(({ var: variable, desc }) => (
                <div
                  key={variable}
                  className="flex items-center gap-2 text-sm"
                >
                  <code className="px-2 py-1 bg-white rounded text-douyin-red font-mono text-xs">
                    {variable}
                  </code>
                  <span className="text-text-tertiary">{desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 预览 */}
          <div className="border border-gray-200 rounded-douyin p-4">
            <p className="text-sm font-medium text-text-secondary mb-2">预览：</p>
            <p className="text-sm text-text-primary font-mono">
              {localSettings.namingRule
                .replace('%(title)s', '示例视频标题')
                .replace('%(author)s', '作者名')
                .replace('%(id)s', '1234567890')
                .replace('%(ext)s', 'mp4')
                .replace('%(upload_date)s', '20240304')
                .replace('%(resolution)s', '1080p')}
            </p>
          </div>
        </div>
      </div>

      {/* 恢复默认 */}
      <div className="flex justify-end">
        <button
          onClick={handleRestoreDefaults}
          className="text-text-tertiary hover:text-text-secondary text-sm flex items-center gap-2 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          恢复默认设置
        </button>
      </div>
    </div>
  );
};
