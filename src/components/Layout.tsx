import React from 'react';
import { Download, ListTodo, History, Settings } from 'lucide-react';

type Page = 'download' | 'tasks' | 'history' | 'settings';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: Page;
  onPageChange: (page: Page) => void;
}

const menuItems = [
  { id: 'download' as Page, label: '下载', icon: Download },
  { id: 'tasks' as Page, label: '任务管理', icon: ListTodo },
  { id: 'history' as Page, label: '历史记录', icon: History },
  { id: 'settings' as Page, label: '设置', icon: Settings },
];

export const Layout: React.FC<LayoutProps> = ({ children, currentPage, onPageChange }) => {
  return (
    <div className="flex h-screen bg-bg-secondary">
      {/* 侧边栏 */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-douyin-red rounded-douyin flex items-center justify-center">
              <Download className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-text-primary text-lg">抖音下载器</h1>
              <p className="text-xs text-text-tertiary">Douyin Downloader</p>
            </div>
          </div>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              
              return (
                <li key={item.id}>
                  <button
                    onClick={() => onPageChange(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-douyin transition-all duration-200 ${
                      isActive
                        ? 'bg-douyin-red text-white shadow-md'
                        : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* 底部信息 */}
        <div className="p-4 border-t border-gray-100">
          <p className="text-xs text-text-tertiary text-center">
            版本 0.1.0
          </p>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* 顶部栏 */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <h2 className="text-xl font-semibold text-text-primary">
            {menuItems.find(item => item.id === currentPage)?.label}
          </h2>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-douyin-red/10 rounded-full flex items-center justify-center">
              <span className="text-douyin-red font-medium text-sm">U</span>
            </div>
          </div>
        </header>

        {/* 页面内容 */}
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
};
