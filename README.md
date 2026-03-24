# 抖音视频下载器

基于 Tauri + React + Python 的桌面端抖音视频下载工具。

## 功能特性

- ✅ 单视频下载 - 粘贴链接即可下载
- ✅ 批量下载 - 支持多个视频同时下载
- ✅ 任务管理 - 实时查看下载进度
- ✅ 历史记录 - 自动保存下载历史
- ✅ 画质选择 - 支持多种清晰度
- ✅ 去水印 - 自动去除抖音水印

## 技术栈

- **前端**: React 18 + TypeScript + Tailwind CSS
- **后端**: Rust (Tauri)
- **下载引擎**: Python + yt-dlp

## 下载安装

### Windows
从 [Releases](https://github.com/Yujianqiao/douyin-downloader/releases) 页面下载 `.msi` 安装包

### Linux
```bash
# Debian/Ubuntu
sudo dpkg -i douyin-downloader_1.0.0_amd64.deb

# Fedora/CentOS
sudo rpm -i douyin-downloader-1.0.0-1.x86_64.rpm
```

## 开发构建

### 前置要求
- Node.js 18+
- Rust
- Python 3.8+

### 本地开发
```bash
# 安装依赖
npm install

# 启动开发服务器
npm run tauri dev
```

### 构建发布版
```bash
# 构建安装包
cargo tauri build
```

## 项目结构

```
douyin-downloader/
├── src/                    # React 前端源码
│   ├── pages/             # 页面组件
│   ├── components/        # 公共组件
│   └── utils/             # 工具函数
├── src-tauri/             # Tauri 后端
│   ├── src/               # Rust 源码
│   └── python/            # Python 下载模块
└── .github/workflows/     # CI/CD 配置
```

## 许可证

MIT License
