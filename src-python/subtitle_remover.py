"""
AI 视频去字幕模块
功能：
1. OCR 识别视频字幕位置
2. Inpainting 算法去除字幕
3. 视频后处理
"""

import cv2
import numpy as np
from PIL import Image
import pytesseract
from typing import List, Tuple, Optional, Callable
import os
from dataclasses import dataclass
from pathlib import Path
import subprocess
import json


@dataclass
class SubtitleRegion:
    """字幕区域数据结构"""
    x: int
    y: int
    width: int
    height: int
    text: str = ""
    confidence: float = 0.0


class SubtitleDetector:
    """字幕检测器 - 使用 OCR 识别字幕位置"""
    
    def __init__(self, lang: str = 'chi_sim+eng'):
        self.lang = lang
        self.min_confidence = 60
        
    def detect_frame(self, frame: np.ndarray) -> List[SubtitleRegion]:
        """检测单帧中的字幕区域"""
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        pil_image = Image.fromarray(rgb_frame)
        
        data = pytesseract.image_to_data(
            pil_image, 
            lang=self.lang,
            output_type=pytesseract.Output.DICT
        )
        
        regions = []
        n_boxes = len(data['text'])
        
        for i in range(n_boxes):
            confidence = int(data['conf'][i])
            if confidence > self.min_confidence:
                text = data['text'][i].strip()
                if text:
                    x, y, w, h = data['left'][i], data['top'][i], data['width'][i], data['height'][i]
                    if w > 20 and h > 10:
                        regions.append(SubtitleRegion(x=x, y=y, width=w, height=h, text=text, confidence=confidence))
        
        return regions
    
    def detect_subtitle_area(self, frame: np.ndarray) -> Optional[Tuple[int, int, int, int]]:
        """检测视频帧中字幕的大致区域（通常在底部）"""
        height, width = frame.shape[:2]
        bottom_region = frame[int(height * 0.75):, :]
        gray = cv2.cvtColor(bottom_region, cv2.COLOR_BGR2GRAY)
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if not contours:
            return None
            
        all_points = []
        for cnt in contours:
            x, y, w, h = cv2.boundingRect(cnt)
            if w > 30 and h > 10 and h < 100:
                all_points.append((x, y + int(height * 0.75), w, h))
        
        if not all_points:
            return None
            
        min_x = min(p[0] for p in all_points)
        min_y = min(p[1] for p in all_points)
        max_x = max(p[0] + p[2] for p in all_points)
        max_y = max(p[1] + p[3] for p in all_points)
        
        padding = 10
        return (max(0, min_x - padding), max(0, min_y - padding), 
                min(width, max_x + padding) - max(0, min_x - padding),
                min(height, max_y + padding) - max(0, min_y - padding))


class SubtitleInpainter:
    """字幕修复器 - 使用 Inpainting 算法去除字幕"""
    
    def __init__(self, method: str = 'opencv'):
        self.method = method
    
    def remove_subtitles(self, frame: np.ndarray, regions: List[SubtitleRegion]) -> np.ndarray:
        """去除字幕"""
        if not regions:
            return frame
            
        mask = np.zeros(frame.shape[:2], dtype=np.uint8)
        for region in regions:
            padding = 5
            x1, y1 = max(0, region.x - padding), max(0, region.y - padding)
            x2 = min(frame.shape[1], region.x + region.width + padding)
            y2 = min(frame.shape[0], region.y + region.height + padding)
            mask[y1:y2, x1:x2] = 255
        
        return cv2.inpaint(frame, mask, inpaintRadius=3, flags=cv2.INPAINT_TELEA)
    
    def remove_subtitle_area(self, frame: np.ndarray, area: Tuple[int, int, int, int]) -> np.ndarray:
        """去除指定区域"""
        x, y, w, h = area
        region = SubtitleRegion(x=x, y=y, width=w, height=h)
        return self.remove_subtitles(frame, [region])


class VideoSubtitleRemover:
    """视频字幕去除器 - 主控制器"""
    
    def __init__(self, detect_method: str = 'auto', inpaint_method: str = 'opencv', sample_interval: int = 30):
        self.detector = SubtitleDetector()
        self.inpainter = SubtitleInpainter(method=inpaint_method)
        self.detect_method = detect_method
        self.sample_interval = sample_interval
        self.subtitle_area = None
        
    def process_video(self, input_path: str, output_path: str, progress_callback: Callable = None) -> bool:
        """处理视频，去除字幕"""
        try:
            cap = cv2.VideoCapture(input_path)
            if not cap.isOpened():
                raise ValueError(f"Cannot open video: {input_path}")
            
            fps = cap.get(cv2.CAP_PROP_FPS)
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            
            temp_output = output_path + ".temp.mp4"
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            out = cv2.VideoWriter(temp_output, fourcc, fps, (width, height))
            
            if not out.isOpened():
                raise ValueError("Cannot create video writer")
            
            frame_count = 0
            self.subtitle_area = None
            
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                # 采样检测字幕区域
                if frame_count % self.sample_interval == 0 or self.subtitle_area is None:
                    if self.detect_method == 'ocr':
                        regions = self.detector.detect_frame(frame)
                        if regions:
                            self.subtitle_area = self._regions_to_area(regions, width, height)
                    else:
                        self.subtitle_area = self.detector.detect_subtitle_area(frame)
                
                # 去除字幕
                if self.subtitle_area:
                    frame = self.inpainter.remove_subtitle_area(frame, self.subtitle_area)
                
                out.write(frame)
                frame_count += 1
                
                if progress_callback and frame_count % 10 == 0:
                    progress_callback((frame_count / total_frames) * 100, frame_count, total_frames)
            
            cap.release()
            out.release()
            
            # FFmpeg 重新编码
            self._reencode_with_ffmpeg(temp_output, output_path)
            if os.path.exists(temp_output):
                os.remove(temp_output)
            
            return True
            
        except Exception as e:
            print(f"Error: {e}")
            return False
    
    def _regions_to_area(self, regions: List[SubtitleRegion], width: int, height: int) -> Tuple[int, int, int, int]:
        """合并多个区域"""
        min_x = min(r.x for r in regions)
        min_y = min(r.y for r in regions)
        max_x = max(r.x + r.width for r in regions)
        max_y = max(r.y + r.height for r in regions)
        padding = 15
        return (max(0, min_x - padding), max(0, min_y - padding),
                min(width, max_x + padding) - max(0, min_x - padding),
                min(height, max_y + padding) - max(0, min_y - padding))
    
    def _reencode_with_ffmpeg(self, input_path: str, output_path: str):
        """使用 FFmpeg 重新编码"""
        try:
            cmd = [
                'ffmpeg', '-y', '-i', input_path,
                '-c:v', 'libx264', '-preset', 'medium', '-crf', '18',
                '-c:a', 'aac', '-b:a', '192k',
                '-movflags', '+faststart',
                output_path
            ]
            subprocess.run(cmd, check=True, capture_output=True)
        except Exception as e:
            # 如果 FFmpeg 失败，直接复制临时文件
            import shutil
            shutil.copy2(input_path, output_path)


def main():
    """命令行入口"""
    import argparse
    parser = argparse.ArgumentParser(description='AI Video Subtitle Remover')
    parser.add_argument('input', help='Input video path')
    parser.add_argument('output', help='Output video path')
    parser.add_argument('--method', choices=['ocr', 'auto'], default='auto', help='Detection method')
    parser.add_argument('--interval', type=int, default=30, help='Sample interval (frames)')
    
    args = parser.parse_args()
    
    remover = VideoSubtitleRemover(detect_method=args.method, sample_interval=args.interval)
    
    def progress(percent, current, total):
        print(f"\rProgress: {percent:.1f}% ({current}/{total} frames)", end='', flush=True)
    
    success = remover.process_video(args.input, args.output, progress)
    print()
    
    if success:
        print(f"✓ Successfully removed subtitles: {args.output}")
    else:
        print("✗ Failed to process video")
        exit(1)


if __name__ == '__main__':
    main()