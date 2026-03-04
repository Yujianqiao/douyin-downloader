# Windows 桌面端构建指南

## 📋 前置要求

在 Windows 电脑上安装以下工具：

### 1. Rust
```powershell
# 下载并运行 rustup-init.exe
# https://rustup.rs/
# 或使用 winget:
winget install Rustlang.Rustup
```

### 2. Node.js
```powershell
# 下载 LTS 版本
# https://nodejs.org/
# 或使用 winget:
winget install OpenJS.NodeJS.LTS
```

### 3. Visual Studio Build Tools
```powershell
# 下载 Visual Studio Build Tools
# https://visualstudio.microsoft.com/visual-cpp-build-tools/
# 安装时选择 "Desktop development with C++"
```

---

## 🔨 构建步骤

### 步骤1：克隆项目
```powershell
git clone <项目仓库地址>
cd douyin-downloader
```

### 步骤2：安装前端依赖
```powershell
npm install
```

### 步骤3：安装 Tauri CLI
```powershell
cargo install tauri-cli
```

### 步骤4：构建 Windows 安装包
```powershell
cargo tauri build
```

---

## 📦 输出文件

构建完成后，安装包位于：

```
src-tauri/target/release/bundle/
├── msi/
│   └── 抖音视频下载器_1.0.0_x64.msi          # MSI 安装包
└── nsis/
    └── 抖音视频下载器_1.0.0_x64-setup.exe    # EXE 安装程序
```

---

## 🚀 安装使用

### 方式1：MSI 安装包
双击 `抖音视频下载器_1.0.0_x64.msi` 按向导安装

### 方式2：EXE 安装程序
双击 `抖音视频下载器_1.0.0_x64-setup.exe` 一键安装

### 方式3：免安装运行
直接运行可执行文件：
```
src-tauri/target/release/抖音视频下载器.exe
```

---

## ⚠️ 常见问题

### 1. 缺少 WebView2 Runtime
如果运行时提示缺少 WebView2，请下载安装：
https://developer.microsoft.com/en-us/microsoft-edge/webview2/

### 2. 构建失败
确保已安装 Visual Studio Build Tools 的以下组件：
- MSVC v143 - VS 2022 C++ x64/x86 生成工具
- Windows 10/11 SDK

### 3. 权限问题
以管理员身份运行 PowerShell 或 CMD

---

## 📝 快速命令总结

```powershell
# 完整构建流程（复制粘贴执行）
npm install
cargo install tauri-cli
cargo tauri build

# 开发模式预览
npm run tauri dev
```
