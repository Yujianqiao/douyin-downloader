#!/usr/bin/env python3
"""
抖音视频下载模块 - 基于 yt-dlp
"""

import sys
import json
import os
import re
from pathlib import Path
from typing import Optional, Dict, Any, List

try:
    import yt_dlp
except ImportError:
    print(json.dumps({
        "error": "yt-dlp not installed. Please run: pip install yt-dlp"
    }))
    sys.exit(1)


class ProgressHook:
    """下载进度钩子"""
    
    def __init__(self):
        self.progress = {
            "status": "idle",
            "percent": 0.0,
            "downloaded_bytes": 0,
            "total_bytes": 0,
            "speed": 0,
            "eta": 0
        }
    
    def __call__(self, d: dict):
        if d['status'] == 'downloading':
            self.progress['status'] = 'downloading'
            
            # 计算百分比
            if 'downloaded_bytes' in d and 'total_bytes' in d:
                self.progress['downloaded_bytes'] = d['downloaded_bytes']
                self.progress['total_bytes'] = d['total_bytes']
                if d['total_bytes'] > 0:
                    self.progress['percent'] = (d['downloaded_bytes'] / d['total_bytes']) * 100
            elif 'downloaded_bytes' in d and 'total_bytes_estimate' in d:
                self.progress['downloaded_bytes'] = d['downloaded_bytes']
                self.progress['total_bytes'] = d['total_bytes_estimate']
                if d['total_bytes_estimate'] > 0:
                    self.progress['percent'] = (d['downloaded_bytes'] / d['total_bytes_estimate']) * 100
            
            # 速度
            if 'speed' in d and d['speed']:
                self.progress['speed'] = d['speed']
            
            # 预计时间
            if 'eta' in d and d['eta']:
                self.progress['eta'] = d['eta']
                
        elif d['status'] == 'finished':
            self.progress['status'] = 'finished'
            self.progress['percent'] = 100.0
            
        # 输出进度到 stderr，方便 Rust 捕获
        print(json.dumps(self.progress), file=sys.stderr, flush=True)


def parse_douyin_url(url: str) -> Optional[str]:
    """
    解析抖音链接，提取视频ID或直接可用的URL
    支持多种格式：短链接、分享链接等
    """
    # 清理URL（移除跟踪参数）
    url = url.strip()
    
    # 抖音短链接
    if 'v.douyin.com' in url:
        return url
    
    # 抖音网页版链接
    if 'www.douyin.com' in url or 'douyin.com/video/' in url:
        return url
    
    # 抖音分享链接（包含中文描述的情况）
    # 尝试提取 http:// 或 https:// 开头的URL
    url_pattern = r'https?://[^\s]+'
    matches = re.findall(url_pattern, url)
    if matches:
        for match in matches:
            if 'douyin' in match:
                return match
    
    return None


def get_video_info(url: str) -> Dict[str, Any]:
    """
    获取视频信息（标题、作者、清晰度选项等）
    """
    parsed_url = parse_douyin_url(url)
    if not parsed_url:
        return {"error": "无法解析的抖音链接"}
    
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(parsed_url, download=False)
            
            if not info:
                return {"error": "无法获取视频信息"}
            
            # 提取格式信息
            formats = []
            if 'formats' in info:
                for fmt in info['formats']:
                    format_info = {
                        'format_id': fmt.get('format_id', ''),
                        'ext': fmt.get('ext', ''),
                        'quality': fmt.get('quality', 0),
                        'resolution': fmt.get('resolution', 'unknown'),
                        'filesize': fmt.get('filesize') or fmt.get('filesize_approx', 0),
                        'vcodec': fmt.get('vcodec', 'unknown'),
                        'acodec': fmt.get('acodec', 'unknown'),
                    }
                    formats.append(format_info)
            
            # 按质量排序
            formats.sort(key=lambda x: x['quality'], reverse=True)
            
            result = {
                "success": True,
                "title": info.get('title', '未知标题'),
                "author": info.get('uploader', info.get('channel', '未知作者')),
                "duration": info.get('duration', 0),
                "thumbnail": info.get('thumbnail', ''),
                "webpage_url": info.get('webpage_url', parsed_url),
                "formats": formats[:10],  # 只返回前10个最佳格式
                "original_url": url
            }
            
            return result
            
    except Exception as e:
        return {"error": f"获取视频信息失败: {str(e)}"}


def download_video(
    url: str,
    output_dir: str,
    filename: Optional[str] = None,
    format_id: Optional[str] = None,
    quality: str = "best"
) -> Dict[str, Any]:
    """
    下载视频
    
    Args:
        url: 视频链接
        output_dir: 输出目录
        filename: 自定义文件名（不含扩展名）
        format_id: 指定格式ID
        quality: 质量选择 (best/worst/bestvideo+bestaudio)
    """
    parsed_url = parse_douyin_url(url)
    if not parsed_url:
        return {"error": "无法解析的抖音链接"}
    
    # 确保输出目录存在
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    # 设置输出模板
    if filename:
        outtmpl = str(output_path / f"{filename}.%(ext)s")
    else:
        outtmpl = str(output_path / "%(title)s_%(id)s.%(ext)s")
    
    # 构建格式选择
    if format_id:
        format_spec = format_id
    elif quality == "best":
        format_spec = "best[ext=mp4]/best"
    elif quality == "worst":
        format_spec = "worst[ext=mp4]/worst"
    else:
        format_spec = "best[ext=mp4]/best"
    
    progress_hook = ProgressHook()
    
    ydl_opts = {
        'format': format_spec,
        'outtmpl': outtmpl,
        'progress_hooks': [progress_hook],
        'quiet': True,
        'no_warnings': True,
        # 添加一些额外的选项以提高兼容性
        'cookiesfrombrowser': None,  # 不使用浏览器cookie
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://www.douyin.com/',
        }
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(parsed_url, download=True)
            
            if not info:
                return {"error": "下载失败：无法获取视频信息"}
            
            # 获取实际下载的文件路径
            downloaded_file = ydl.prepare_filename(info)
            
            return {
                "success": True,
                "message": "下载完成",
                "file_path": downloaded_file,
                "title": info.get('title', '未知标题'),
                "author": info.get('uploader', '未知作者'),
            }
            
    except Exception as e:
        return {"error": f"下载失败: {str(e)}"}


def main():
    """命令行入口"""
    if len(sys.argv) < 2:
        print(json.dumps({"error": "用法: python downloader.py <command> [args]"}))
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "info":
        # 获取视频信息
        if len(sys.argv) < 3:
            print(json.dumps({"error": "请提供视频链接"}))
            sys.exit(1)
        url = sys.argv[2]
        result = get_video_info(url)
        print(json.dumps(result, ensure_ascii=False))
        
    elif command == "download":
        # 下载视频
        if len(sys.argv) < 4:
            print(json.dumps({"error": "用法: python downloader.py download <url> <output_dir> [filename] [format_id]"}))
            sys.exit(1)
        
        url = sys.argv[2]
        output_dir = sys.argv[3]
        filename = sys.argv[4] if len(sys.argv) > 4 else None
        format_id = sys.argv[5] if len(sys.argv) > 5 else None
        
        result = download_video(url, output_dir, filename, format_id)
        print(json.dumps(result, ensure_ascii=False))
        
    else:
        print(json.dumps({"error": f"未知命令: {command}"}))
        sys.exit(1)


if __name__ == "__main__":
    main()
