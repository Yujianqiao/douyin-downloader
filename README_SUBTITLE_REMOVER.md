# AI 视频去字幕功能

基于 OCR + Inpainting 算法的智能视频字幕去除功能，集成到抖音下载器桌面应用。

## 功能特性

- ✅ **OCR 字幕识别** - 自动检测视频中的字幕位置
- ✅ **Inpainting 修复** - 智能去除字幕并修复画面
- ✅ **批量处理** - 支持批量视频处理
- ✅ **进度实时显示** - 前端实时显示处理进度
- ✅ **多种检测模式** - 自动检测 / OCR 精确识别

## 技术架构

```
douyin-downloader/
├── src-python/
│   └── subtitle_remover.py      # Python 核心处理模块
├── src-tauri/src/
│   ├── main.rs                  # Tauri 主入口
│   └── commands/
│       ├── mod.rs               # 命令模块
│       └── subtitle.rs          # 字幕去除命令
└── src-react/
    ├── components/
    │   ├── SubtitleRemover.tsx         # 字幕去除组件
    │   └── DownloadWithSubtitleRemoval.tsx  # 集成下载组件
    ├── hooks/
    │   └── useSubtitleRemover.ts       # 自定义 Hook
    └── index.ts                        # 模块导出
```

## 安装依赖

### Python 依赖

```bash
# 安装 Tesseract OCR（系统依赖）
# Ubuntu/Debian:
sudo apt-get install tesseract-ocr tesseract-ocr-chi-sim

# macOS:
brew install tesseract tesseract-lang

# Windows:
# 下载安装包: https://github.com/UB-Mannheim/tesseract/wiki

# 安装 Python 包
pip install opencv-python-headless numpy pillow pytesseract
```

### Rust 依赖

```bash
# 确保已安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### Node.js 依赖

```bash
npm install
# 或
yarn install
```

## 使用方法

### 1. 启动开发服务器

```bash
npm run tauri dev
```

### 2. 使用字幕去除功能

1. 粘贴抖音视频链接
2. 勾选"下载完成后自动去除字幕"
3. 点击下载按钮
4. 下载完成后自动启动字幕去除
5. 等待处理完成

### 3. 命令行使用（Python 模块）

```bash
# 使用自动检测模式
python src-python/subtitle_remover.py input.mp4 output.mp4

# 使用 OCR 模式（更精确但较慢）
python src-python/subtitle_remover.py input.mp4 output.mp4 --method ocr

# 调整采样间隔
python src-python/subtitle_remover.py input.mp4 output.mp4 --interval 60
```

## API 文档

### Tauri 命令

#### `detect_subtitle_area`

检测视频中的字幕区域。

```typescript
const area = await invoke('detect_subtitle_area', {
  videoPath: '/path/to/video.mp4'
});
// 返回: { x: number, y: number, width: number, height: number } | null
```

#### `remove_subtitles`

去除视频字幕。

```typescript
const result = await invoke('remove_subtitles', {
  request: {
    input_path: '/path/to/input.mp4',
    output_path: '/path/to/output.mp4',
    detect_method: 'auto', // 'auto' | 'ocr'
    sample_interval: 30
  }
});
// 返回: { success: boolean, message: string, output_path?: string }
```

#### `cancel_subtitle_removal`

取消正在进行的处理。

```typescript
const cancelled = await invoke('cancel_subtitle_removal');
// 返回: boolean
```

### React Hook

```typescript
import { useSubtitleRemover } from './hooks/useSubtitleRemover';

function MyComponent() {
  const {
    isProcessing,
    progress,
    status,
    message,
    removeSubtitles,
    cancelProcessing,
  } = useSubtitleRemover({
    onComplete: (outputPath) => console.log('完成:', outputPath),
    onError: (error) => console.error('错误:', error),
  });

  const handleRemove = async () => {
    await removeSubtitles({
      input_path: 'input.mp4',
      output_path: 'output.mp4',
      detect_method: 'auto',
    });
  };

  return (
    <div>
      <p>进度: {progress}%</p>
      <button onClick={handleRemove}>去除字幕</button>
    </div>
  );
}
```

## 构建发布

```bash
# 构建桌面应用
cargo tauri build

# 输出目录
# src-tauri/target/release/bundle/
```

## 性能优化

1. **采样间隔**: 默认每 30 帧检测一次，可通过 `--interval` 调整
2. **检测模式**: 
   - `auto`: 快速检测底部区域（推荐）
   - `ocr`: 逐帧 OCR 识别（更精确但较慢）
3. **硬件加速**: OpenCV 自动使用可用硬件加速

## 常见问题

### Q: 字幕去除后画面有痕迹？
A: 尝试使用 OCR 模式，或调整采样间隔更频繁地检测字幕区域变化。

### Q: 处理速度太慢？
A: 增大采样间隔（如 `--interval 60`），或使用自动检测模式。

### Q: 某些字幕无法识别？
A: 确保已安装中文语言包 `tesseract-ocr-chi-sim`。

## 许可证

MIT License
