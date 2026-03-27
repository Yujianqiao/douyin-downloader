import { useState, useCallback, useEffect } from 'react';
import { Layout } from './components/Layout';
import { DownloadPage } from './pages/DownloadPage';
import { TasksPage } from './pages/TasksPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { LocalVideoPage } from './pages/LocalVideoPage';
import type { DownloadTask, HistoryItem, AppSettings } from './types/tauri';

// 默认设置
const defaultSettings: AppSettings = {
  defaultDownloadPath: './downloads',
  defaultQuality: 'best',
  maxConcurrentDownloads: 3,
  enableNotifications: true,
  namingRule: '%(title)s.%(ext)s',
};

type Page = 'download' | 'local' | 'tasks' | 'history' | 'settings';

function App() {
  // 当前页面
  const [currentPage, setCurrentPage] = useState<Page>('download');

  // 下载任务列表
  const [tasks, setTasks] = useState<DownloadTask[]>([]);

  // 历史记录
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // 应用设置
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  // 从本地存储加载数据
  useEffect(() => {
    const loadData = () => {
      try {
        // 加载设置
        const savedSettings = localStorage.getItem('douyin-downloader-settings');
        if (savedSettings) {
          setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });
        }

        // 加载历史记录
        const savedHistory = localStorage.getItem('douyin-downloader-history');
        if (savedHistory) {
          setHistory(JSON.parse(savedHistory));
        }

        // 加载任务列表（仅恢复未完成的任务）
        const savedTasks = localStorage.getItem('douyin-downloader-tasks');
        if (savedTasks) {
          const parsedTasks: DownloadTask[] = JSON.parse(savedTasks);
          // 只保留未完成的任务
          const incompleteTasks = parsedTasks.filter(
            (t) => t.progress.status === 'downloading' || t.progress.status === 'pending'
          );
          // 将下载中的任务标记为错误（因为重启后无法恢复下载）
          const resetTasks = incompleteTasks.map((t) => ({
            ...t,
            progress: {
              ...t.progress,
              status: 'error' as const,
              error_message: '程序重启，请重新下载',
            },
          }));
          setTasks(resetTasks);
        }
      } catch (error) {
        console.error('加载数据失败:', error);
      }
    };

    loadData();
  }, []);

  // 保存数据到本地存储
  useEffect(() => {
    localStorage.setItem('douyin-downloader-settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('douyin-downloader-history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('douyin-downloader-tasks', JSON.stringify(tasks));
  }, [tasks]);

  // 处理新任务开始
  const handleDownloadStart = useCallback((task: DownloadTask) => {
    setTasks((prev) => [task, ...prev]);
    // 自动切换到任务管理页
    setCurrentPage('tasks');
  }, []);

  // 更新任务
  const handleTaskUpdate = useCallback((taskId: string, updates: Partial<DownloadTask>) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;

        const updatedTask = { ...task, ...updates };

        // 如果任务完成，添加到历史记录
        if (
          updates.progress?.status === 'completed' &&
          task.progress.status !== 'completed'
        ) {
          const historyItem: HistoryItem = {
            id: task.id,
            url: task.url,
            title: task.videoInfo?.title || '未知标题',
            author: task.videoInfo?.author || '未知作者',
            thumbnail: task.videoInfo?.thumbnail,
            filePath: task.options.output_path || '',
            fileSize: updates.progress.total_bytes || task.progress.total_bytes,
            downloadDate: Date.now(),
            duration: task.videoInfo?.duration,
          };
          setHistory((prev) => [historyItem, ...prev]);

          // 显示通知
          if (settings.enableNotifications) {
            // TODO: 调用 Tauri 发送系统通知
            console.log('下载完成通知:', task.videoInfo?.title);
          }
        }

        return updatedTask;
      })
    );
  }, [settings.enableNotifications]);

  // 删除任务
  const handleTaskRemove = useCallback((taskId: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
  }, []);

  // 重试任务
  const handleTaskRetry = useCallback((task: DownloadTask) => {
    // 重置任务状态
    const retriedTask: DownloadTask = {
      ...task,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      progress: {
        status: 'downloading',
        progress: 0,
        downloaded_bytes: 0,
      },
      createdAt: Date.now(),
    };

    setTasks((prev) => [retriedTask, ...prev.filter((t) => t.id !== task.id)]);

    // 重新调用下载
    import('./utils/tauri').then(({ downloadVideo }) => {
      downloadVideo(task.url, task.options);
    });
  }, []);

  // 删除历史记录
  const handleHistoryDelete = useCallback((id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // 清空历史记录
  const handleClearAllHistory = useCallback(() => {
    if (window.confirm('确定要清空所有历史记录吗？此操作不可恢复。')) {
      setHistory([]);
    }
  }, []);

  // 渲染当前页面
  const renderPage = () => {
    switch (currentPage) {
      case 'download':
        return (
          <DownloadPage
            onDownloadStart={handleDownloadStart}
            defaultSettings={{
              downloadPath: settings.defaultDownloadPath,
              defaultQuality: settings.defaultQuality,
            }}
          />
        );
      case 'local':
        return (
          <LocalVideoPage
            defaultSettings={{
              downloadPath: settings.defaultDownloadPath,
            }}
          />
        );
      case 'tasks':
        return (
          <TasksPage
            tasks={tasks}
            onTaskUpdate={handleTaskUpdate}
            onTaskRemove={handleTaskRemove}
            onTaskRetry={handleTaskRetry}
          />
        );
      case 'history':
        return (
          <HistoryPage
            history={history}
            onDelete={handleHistoryDelete}
            onClearAll={handleClearAllHistory}
          />
        );
      case 'settings':
        return (
          <SettingsPage
            settings={settings}
            onSettingsChange={setSettings}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

export default App;
