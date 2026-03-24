#!/bin/bash
# AI 视频去字幕功能安装脚本

set -e

echo "🚀 安装 AI 视频去字幕功能..."

# 检测操作系统
OS=$(uname -s)
ARCH=$(uname -m)

echo "📋 系统信息: $OS $ARCH"

# 安装系统依赖
if [[ "$OS" == "Linux" ]]; then
    echo "🐧 检测到 Linux 系统"
    
    # 检测发行版
    if command -v apt-get &> /dev/null; then
        echo "📦 使用 apt-get 安装依赖..."
        sudo apt-get update
        sudo apt-get install -y \
            tesseract-ocr \
            tesseract-ocr-chi-sim \
            tesseract-ocr-eng \
            ffmpeg \
            libopencv-dev \
            python3-pip
    elif command -v yum &> /dev/null; then
        echo "📦 使用 yum 安装依赖..."
        sudo yum install -y \
            tesseract \
            tesseract-langpack-chi_sim \
            ffmpeg \
            opencv-python \
            python3-pip
    else
        echo "⚠️ 未识别的包管理器，请手动安装 Tesseract 和 FFmpeg"
    fi

elif [[ "$OS" == "Darwin" ]]; then
    echo "🍎 检测到 macOS 系统"
    
    if command -v brew &> /dev/null; then
        echo "📦 使用 Homebrew 安装依赖..."
        brew install tesseract tesseract-lang ffmpeg opencv
    else
        echo "⚠️ 请先安装 Homebrew: https://brew.sh"
        exit 1
    fi

elif [[ "$OS" == MINGW* ]] || [[ "$OS" == CYGWIN* ]] || [[ "$OS" == MSYS* ]]; then
    echo "🪟 检测到 Windows 系统"
    echo "⚠️ 请手动安装以下依赖:"
    echo "   1. Tesseract: https://github.com/UB-Mannheim/tesseract/wiki"
    echo "   2. FFmpeg: https://ffmpeg.org/download.html"
    echo "   3. 将安装路径添加到系统环境变量 PATH"
fi

# 安装 Python 依赖
echo "🐍 安装 Python 依赖..."
if command -v pip3 &> /dev/null; then
    pip3 install -r requirements.txt
elif command -v pip &> /dev/null; then
    pip install -r requirements.txt
else
    echo "❌ 未找到 pip，请安装 Python 3"
    exit 1
fi

# 验证安装
echo "✅ 验证安装..."
python3 -c "import cv2; import pytesseract; print('OpenCV 版本:', cv2.__version__)"
tesseract --version | head -1

echo ""
echo "🎉 安装完成！"
echo ""
echo "📖 使用方法:"
echo "   1. 开发模式: npm run tauri dev"
echo "   2. 构建发布: cargo tauri build"
echo ""
echo "📚 详细文档: README_SUBTITLE_REMOVER.md"
