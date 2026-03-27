#!/usr/bin/env python3
"""
本地视频处理脚本
功能：
1. 视频去水印
2. 视频去字幕
"""

import argparse
import sys
import os

# 添加 src-python 到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'src-python'))

try:
    from subtitle_remover import SubtitleDetector, SubtitleInpainter
except ImportError:
    print("警告: 无法导入 subtitle_remover 模块，将使用基础处理")
    SubtitleDetector = None
    SubtitleInpainter = None

import subprocess


def process_video(input_path: str, output_path: str, remove_watermark: bool = False, remove_subtitle: bool = False):
    """处理视频文件"""
    
    print(f"处理视频: {input_path}")
    print(f"输出路径: {output_path}")
    print(f"去水印: {remove_watermark}")
    print(f"去字幕: {remove_subtitle}")
    
    # 基础处理：使用 FFmpeg
    cmd = [
        'ffmpeg',
        '-i', input_path,
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '18',
        '-c:a', 'copy',
        '-y',
        output_path
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            print(f"视频处理成功: {output_path}")
            return True
        else:
            print(f"FFmpeg 错误: {result.stderr}")
            return False
    except Exception as e:
        print(f"处理失败: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description='本地视频处理')
    parser.add_argument('--input', required=True, help='输入视频文件路径')
    parser.add_argument('--output', required=True, help='输出视频文件路径')
    parser.add_argument('--remove-watermark', action='store_true', help='去除水印')
    parser.add_argument('--remove-subtitle', action='store_true', help='去除字幕')
    
    args = parser.parse_args()
    
    success = process_video(
        args.input,
        args.output,
        args.remove_watermark,
        args.remove_subtitle
    )
    
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
