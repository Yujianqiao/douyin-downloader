import React, { useState, useEffect } from 'react';
import {
  X,
  RotateCcw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  MoreHorizontal,
} from 'lucide-react';
import type { DownloadTask, DownloadProgress } from '../types/tauri';
import { getDownloadProgress, cancelDownload, formatFileSize, formatDuration } from '../utils/tauri';

interface TasksPageProps {
  tasks: DownloadTask[];
  onTaskUpdate: (taskId: string, updates: Partial<DownloadTask>) => void;
  onTaskRemove: (taskId: string) => void;
  onTaskRetry: (task: DownloadTask) => void;
}

type TaskFilter = 'all' | 'downloading' | 'completed' | 'error';

export const TasksPage: React.FC<TasksPageProps> = ({
  tasks,
  onTaskUpdate,
  onTaskRemove,
  onTaskRetry,
}) => {
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  // 轮询下载进度
  useEffect(() => {
    const interval = setInterval(async () => {
      const downloadingTasks = tasks.filter(t => t.progress.status === 'downloading');
      
      for (const task of downloadingTasks) {
        try {
          const progress = await getDownloadProgress();
          onTaskUpdate(task.id, { progress });
        } catch (error) {
          console.error('获取进度失败:', error);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [tasks, onTaskUpdate]);

  // 过滤任务
  const filteredTasks = tasks.filter((task) => {
    if (filter === 'all') return true;
    return task.progress.status === filter;
  });

  // 获取状态图标和颜色
  const getStatusDisplay = (status: DownloadProgress['status']) => {
    switch (status) {
      case 'downloading':
        return {
          icon: <Loader2 className="w-4 h-4 animate-spin" />,
          text: '下载中',
          color: 'text-blue-500',
          bgColor: 'bg-blue-50',
        };
      case 'completed':
        return {
          icon: <CheckCircle2 className="w-4 h-4" />,
          text: '已完成',
          color: 'text-green-500',
          bgColor: 'bg-green-50',
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-4 h-4" />,
          text: '失败',
          color: 'text-red-500',
          bgColor: 'bg-red-50',
        };
      case 'cancelled':
        return {
          icon: <X className="w-4 h-4" />,
          text: '已取消',
          color: 'text-gray-500',
          bgColor: 'bg-gray-50',
        };
      default:
        return {
          icon: <Clock className="w-4 h-4" />,
          text: '等待中',
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-50',
        };
    }
  };

  // 处理取消下载
  const handleCancel = async (taskId: string) => {
    try {
      await cancelDownload();
      onTaskUpdate(taskId, {
        progress: {
          status: 'cancelled',
          progress: 0,
          downloaded_bytes: 0,
        },
      });
    } catch (error) {
      console.error('取消下载失败:', error);
    }
  };

  // 处理批量选择
  const toggleSelection = (taskId: string) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };

  // 全选
  const selectAll = () => {
    if (selectedTasks.size === filteredTasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(filteredTasks.map(t => t.id)));
    }
  };

  // 批量删除
  const batchDelete = () => {
    selectedTasks.forEach((taskId) => {
      onTaskRemove(taskId);
    });
    setSelectedTasks(new Set());
  };

  // 统计
  const stats = {
    all: tasks.length,
    downloading: tasks.filter(t => t.progress.status === 'downloading').length,
    completed: tasks.filter(t => t.progress.status === 'completed').length,
    error: tasks.filter(t => t.progress.status === 'error').length,
  };

  const filters: { key: TaskFilter; label: string; count: number }[] = [
    { key: 'all', label: '全部', count: stats.all },
    { key: 'downloading', label: '下载中', count: stats.downloading },
    { key: 'completed', label: '已完成', count: stats.completed },
    { key: 'error', label: '失败', count: stats.error },
  ];

  return (
    <div className="space-y-6">
      {/* 筛选标签 */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {filters.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-douyin font-medium transition-all duration-200 ${
                filter === key
                  ? 'bg-douyin-red text-white'
                  : 'bg-white text-text-secondary hover:bg-gray-50'
              }`}
            >
              {label}
              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                filter === key ? 'bg-white/20' : 'bg-gray-100'
              }`}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* 批量操作 */}
        {selectedTasks.size > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-text-secondary">
              已选择 {selectedTasks.size} 项
            </span>
            <button
              onClick={batchDelete}
              className="btn-secondary text-red-500 hover:text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              批量删除
            </button>
          </div>
        )}
      </div>

      {/* 任务列表 */}
      <div className="card-douyin overflow-hidden">
        {/* 表头 */}
        <div className="grid grid-cols-12 gap-4 p-4 bg-bg-secondary border-b border-gray-200 text-sm font-medium text-text-secondary">
          <div className="col-span-1">
            <input
              type="checkbox"
              checked={filteredTasks.length > 0 && selectedTasks.size === filteredTasks.length}
              onChange={selectAll}
              className="w-4 h-4 rounded border-gray-300 text-douyin-red focus:ring-douyin-red"
            />
          </div>
          <div className="col-span-5">视频信息</div>
          <div className="col-span-3">进度</div>
          <div className="col-span-2">状态</div>
          <div className="col-span-1">操作</div>
        </div>

        {/* 任务项 */}
        {filteredTasks.length === 0 ? (
          <div className="p-12 text-center text-text-tertiary">
            <MoreHorizontal className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p>暂无{filter === 'all' ? '' : filters.find(f => f.key === filter)?.label}任务</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredTasks.map((task) => {
              const status = getStatusDisplay(task.progress.status);
              const isSelected = selectedTasks.has(task.id);

              return (
                <div
                  key={task.id}
                  className={`grid grid-cols-12 gap-4 p-4 items-center hover:bg-bg-secondary/50 transition-colors ${
                    isSelected ? 'bg-douyin-red/5' : ''
                  }`}
                >
                  {/* 选择框 */}
                  <div className="col-span-1">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelection(task.id)}
                      className="w-4 h-4 rounded border-gray-300 text-douyin-red focus:ring-douyin-red"
                    />
                  </div>

                  {/* 视频信息 */}
                  <div className="col-span-5">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-douyin-sm overflow-hidden flex-shrink-0">
                        {task.videoInfo?.thumbnail ? (
                          <img
                            src={task.videoInfo.thumbnail}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-text-tertiary text-xs">
                            无图
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-text-primary truncate">
                          {task.videoInfo?.title || '未知标题'}
                        </p>
                        <p className="text-sm text-text-tertiary truncate">
                          {task.videoInfo?.author || '未知作者'} · {formatDuration(task.videoInfo?.duration)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 进度 */}
                  <div className="col-span-3">
                    {task.progress.status === 'downloading' ? (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-text-secondary">
                            {formatFileSize(task.progress.downloaded_bytes)}
                            {task.progress.total_bytes && ` / ${formatFileSize(task.progress.total_bytes)}`}
                          </span>
                          <span className="text-douyin-red font-medium">
                            {task.progress.progress.toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-douyin-red transition-all duration-300"
                            style={{ width: `${task.progress.progress}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-text-tertiary">
                          <span>{task.progress.speed || '--'}</span>
                          <span>剩余 {task.progress.eta || '--'}</span>
                        </div>
                      </div>
                    ) : task.progress.status === 'completed' ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-sm">下载完成</span>
                      </div>
                    ) : task.progress.status === 'error' ? (
                      <div className="text-sm text-red-500 truncate" title={task.progress.error_message}>
                        {task.progress.error_message || '下载失败'}
                      </div>
                    ) : (
                      <span className="text-sm text-text-tertiary">--</span>
                    )}
                  </div>

                  {/* 状态 */}
                  <div className="col-span-2">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
                      {status.icon}
                      {status.text}
                    </span>
                  </div>

                  {/* 操作 */}
                  <div className="col-span-1">
                    <div className="flex items-center gap-1">
                      {task.progress.status === 'downloading' && (
                        <button
                          onClick={() => handleCancel(task.id)}
                          className="p-2 text-text-tertiary hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="取消"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      {task.progress.status === 'error' && (
                        <button
                          onClick={() => onTaskRetry(task)}
                          className="p-2 text-text-tertiary hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                          title="重试"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => onTaskRemove(task.id)}
                        className="p-2 text-text-tertiary hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
