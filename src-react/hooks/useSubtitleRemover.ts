/**
 * useSubtitleRemover Hook
 * 封装字幕去除功能的 Tauri 命令调用
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { listen, Event, UnlistenFn } from '@tauri-apps/api/event';
import { open, save } from '@tauri-apps/api/dialog';

export interface SubtitleArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ProgressPayload {
  percent: number;
  current_frame: number;
  total_frames: number;
  status: string;
}

export interface RemoveSubtitleRequest {
  input_path: string;
  output_path: string;
  detect_method?: 'ocr' | 'auto';
  sample_interval?: number;
}

export interface RemoveSubtitleResponse {
  success: boolean;
  message: string;
  output_path?: string;
}

export interface UseSubtitleRemoverReturn {
  // 状态
  isProcessing: boolean;
  progress: number;
  currentFrame: number;
  totalFrames: number;
  status: string;
  error: string | null;
  subtitleArea: SubtitleArea | null;
  
  // 方法
  detectSubtitleArea: (videoPath: string) => Promise<SubtitleArea | null>;
  removeSubtitles: (request: RemoveSubtitleRequest) => Promise<RemoveSubtitleResponse>;
  cancelProcessing: () => Promise<boolean>;
  selectInputFile: () => Promise<string | null>;
  selectOutputFile: () => Promise<string | null>;
  reset: () => void;
}

export function useSubtitleRemover(): UseSubtitleRemoverReturn {
  // 状态
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState<string | null>(null);
  const [subtitleArea, setSubtitleArea] = useState<SubtitleArea | null>(null);
  
  // 事件监听引用
  const unlistenRef = useRef<UnlistenFn | null>(null);

  // 监听进度事件
  useEffect(() => {
    let isMounted = true;
    
    const setupListener = async () => {
      try {
        const unlisten = await listen<ProgressPayload>('subtitle:progress', (event: Event<ProgressPayload>) => {
          if (!isMounted) return;
          
          const payload = event.payload;
          setProgress(payload.percent);
          setCurrentFrame(payload.current_frame);
          setTotalFrames(payload.total_frames);
          setStatus(payload.status);
        });
        
        unlistenRef.current = unlisten;
      } catch (err) {
        console.error('Failed to setup event listener:', err);
      }
    };
    
    setupListener();
    
    return () => {
      isMounted = false;
      if (unlistenRef.current) {
        unlistenRef.current();
        unlistenRef.current = null;
      }
    };
  }, []);

  /**
   * 检测字幕区域
   */
  const detectSubtitleArea = useCallback(async (videoPath: string): Promise<SubtitleArea | null> => {
    try {
      setError(null);
      setStatus('detecting');
      
      const area = await invoke<SubtitleArea | null>('detect_subtitle_area', {
        videoPath,
      });
      
      setSubtitleArea(area);
      setStatus(area ? 'detected' : 'no_subtitle');
      return area;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      setStatus('error');
      return null;
    }
  }, []);

  /**
   * 去除字幕
   */
  const removeSubtitles = useCallback(async (
    request: RemoveSubtitleRequest
  ): Promise<RemoveSubtitleResponse> => {
    try {
      setError(null);
      setIsProcessing(true);
      setProgress(0);
      setStatus('processing');
      
      const response = await invoke<RemoveSubtitleResponse>('remove_subtitles', {
        request,
      });
      
      if (response.success) {
        setProgress(100);
        setStatus('completed');
      } else {
        setError(response.message);
        setStatus('error');
      }
      
      return response;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      setStatus('error');
      
      return {
        success: false,
        message: errorMsg,
      };
    } finally {
      setIsProcessing(false);
    }
  }, []);

  /**
   * 取消处理
   */
  const cancelProcessing = useCallback(async (): Promise<boolean> => {
    try {
      const cancelled = await invoke<boolean>('cancel_subtitle_removal');
      if (cancelled) {
        setStatus('cancelled');
        setIsProcessing(false);
      }
      return cancelled;
    } catch (err) {
      console.error('Failed to cancel:', err);
      return false;
    }
  }, []);

  /**
   * 选择输入文件
   */
  const selectInputFile = useCallback(async (): Promise<string | null> => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: 'Video Files',
            extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm'],
          },
        ],
      });
      
      return selected as string | null;
    } catch (err) {
      console.error('Failed to select file:', err);
      return null;
    }
  }, []);

  /**
   * 选择输出文件
   */
  const selectOutputFile = useCallback(async (): Promise<string | null> => {
    try {
      const selected = await save({
        filters: [
          {
            name: 'MP4 Video',
            extensions: ['mp4'],
          },
        ],
      });
      
      return selected;
    } catch (err) {
      console.error('Failed to select output:', err);
      return null;
    }
  }, []);

  /**
   * 重置状态
   */
  const reset = useCallback(() => {
    setIsProcessing(false);
    setProgress(0);
    setCurrentFrame(0);
    setTotalFrames(0);
    setStatus('idle');
    setError(null);
    setSubtitleArea(null);
  }, []);

  return {
    isProcessing,
    progress,
    currentFrame,
    totalFrames,
    status,
    error,
    subtitleArea,
    detectSubtitleArea,
    removeSubtitles,
    cancelProcessing,
    selectInputFile,
    selectOutputFile,
    reset,
  };
}
