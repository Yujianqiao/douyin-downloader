import React, { useState, useMemo } from 'react';
import {
  Search,
  Calendar,
  Play,
  FolderOpen,
  Trash2,
  Download,
  Filter,
  ChevronDown,
} from 'lucide-react';
import type { HistoryItem } from '../types/tauri';
import { formatFileSize, formatDuration, openVideoFile, openFileFolder } from '../utils/tauri';

interface HistoryPageProps {
  history: HistoryItem[];
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

type SortBy = 'date' | 'size' | 'title';
type GroupBy = 'date' | 'author' | 'none';

export const HistoryPage: React.FC<HistoryPageProps> = ({
  history,
  onDelete,
  onClearAll,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [groupBy, setGroupBy] = useState<GroupBy>('date');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // 过滤和排序历史记录
  const filteredHistory = useMemo(() => {
    let result = [...history];

    // 搜索过滤
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.author.toLowerCase().includes(query)
      );
    }

    // 排序
    result.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return b.downloadDate - a.downloadDate;
        case 'size':
          return (b.fileSize || 0) - (a.fileSize || 0);
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    return result;
  }, [history, searchQuery, sortBy]);

  // 按日期分组
  const groupedHistory = useMemo(() => {
    if (groupBy !== 'date') {
      return { '全部记录': filteredHistory };
    }

    const groups: Record<string, HistoryItem[]> = {};
    
    filteredHistory.forEach((item) => {
      const date = new Date(item.downloadDate);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let groupKey: string;
      if (date.toDateString() === today.toDateString()) {
        groupKey = '今天';
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupKey = '昨天';
      } else {
        groupKey = date.toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
    });

    return groups;
  }, [filteredHistory, groupBy]);

  // 格式化日期时间
  const formatDateTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 处理播放
  const handlePlay = async (filePath: string) => {
    try {
      await openVideoFile(filePath);
    } catch (error) {
      console.error('播放视频失败:', error);
      alert('无法打开视频文件，请检查文件是否存在');
    }
  };

  // 处理打开文件夹
  const handleOpenFolder = async (filePath: string) => {
    try {
      await openFileFolder(filePath);
    } catch (error) {
      console.error('打开文件夹失败:', error);
      alert('无法打开文件夹');
    }
  };

  // 处理选择
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  // 批量删除
  const batchDelete = () => {
    selectedItems.forEach((id) => {
      onDelete(id);
    });
    setSelectedItems(new Set());
  };

  // 重新下载
  const handleRedownload = (item: HistoryItem) => {
    // 触发自定义事件，通知 App 组件跳转到下载页并填充链接
    const event = new CustomEvent('redownload', { detail: item });
    window.dispatchEvent(event);
  };

  return (
    <div className="space-y-6">
      {/* 工具栏 */}
      <div className="flex items-center justify-between gap-4">
        {/* 搜索框 */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索视频标题或作者..."
            className="input-douyin pl-10 w-full"
          />
        </div>

        {/* 筛选和排序 */}
        <div className="flex items-center gap-3">
          {/* 排序 */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="appearance-none bg-white border border-gray-200 rounded-douyin px-4 py-2 pr-10 text-sm focus:outline-none focus:border-douyin-red cursor-pointer"
            >
              <option value="date">按时间排序</option>
              <option value="size">按大小排序</option>
              <option value="title">按名称排序</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
          </div>

          {/* 分组 */}
          <div className="relative">
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupBy)}
              className="appearance-none bg-white border border-gray-200 rounded-douyin px-4 py-2 pr-10 text-sm focus:outline-none focus:border-douyin-red cursor-pointer"
            >
              <option value="date">按日期分组</option>
              <option value="none">不分组</option>
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
          </div>

          {/* 批量操作 */}
          {selectedItems.size > 0 && (
            <>
              <span className="text-sm text-text-secondary">
                已选择 {selectedItems.size} 项
              </span>
              <button
                onClick={batchDelete}
                className="btn-secondary text-red-500 hover:text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                删除
              </button>
            </>
          )}

          {/* 清空历史 */}
          {history.length > 0 && !selectedItems.size && (
            <button
              onClick={onClearAll}
              className="btn-secondary text-text-secondary hover:text-red-500"
            >
              清空历史
            </button>
          )}
        </div>
      </div>

      {/* 历史记录列表 */}
      {Object.keys(groupedHistory).length === 0 ? (
        <div className="card-douyin p-12 text-center text-text-tertiary">
          <Calendar className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p>{searchQuery ? '没有找到匹配的记录' : '暂无下载历史'}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedHistory).map(([groupName, items]) => (
            <div key={groupName} className="card-douyin overflow-hidden">
              {/* 分组标题 */}
              <div className="px-6 py-3 bg-bg-secondary border-b border-gray-100">
                <h3 className="font-medium text-text-secondary flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {groupName}
                  <span className="text-xs text-text-tertiary">({items.length})</span>
                </h3>
              </div>

              {/* 记录列表 */}
              <div className="divide-y divide-gray-100">
                {items.map((item) => {
                  const isSelected = selectedItems.has(item.id);

                  return (
                    <div
                      key={item.id}
                      className={`p-4 flex items-center gap-4 hover:bg-bg-secondary/50 transition-colors ${
                        isSelected ? 'bg-douyin-red/5' : ''
                      }`}
                    >
                      {/* 选择框 */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelection(item.id)}
                        className="w-4 h-4 rounded border-gray-300 text-douyin-red focus:ring-douyin-red"
                      />

                      {/* 缩略图 */}
                      <div className="w-20 h-14 bg-gray-100 rounded-douyin-sm overflow-hidden flex-shrink-0">
                        {item.thumbnail ? (
                          <img
                            src={item.thumbnail}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-text-tertiary text-xs">
                            无图
                          </div>
                        )}
                      </div>

                      {/* 信息 */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-text-primary truncate">
                          {item.title}
                        </h4>
                        <div className="flex items-center gap-4 mt-1 text-sm text-text-tertiary">
                          <span>{item.author}</span>
                          <span>·</span>
                          <span>{formatDuration(item.duration)}</span>
                          <span>·</span>
                          <span>{formatFileSize(item.fileSize)}</span>
                          <span>·</span>
                          <span>{formatDateTime(item.downloadDate)}</span>
                        </div>
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePlay(item.filePath)}
                          className="p-2 text-text-tertiary hover:text-douyin-red hover:bg-douyin-red/10 rounded-lg transition-colors"
                          title="播放"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenFolder(item.filePath)}
                          className="p-2 text-text-tertiary hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                          title="打开文件夹"
                        >
                          <FolderOpen className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRedownload(item)}
                          className="p-2 text-text-tertiary hover:text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                          title="重新下载"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDelete(item.id)}
                          className="p-2 text-text-tertiary hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="删除记录"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
