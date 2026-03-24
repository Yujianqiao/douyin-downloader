/**
 * 字幕去除功能模块导出
 */

export { SubtitleRemover } from './components/SubtitleRemover';
export { DownloadWithSubtitleRemoval } from './components/DownloadWithSubtitleRemoval';
export { DownloadWithOptions } from './components/DownloadWithOptions';
export { useSubtitleRemover } from './hooks/useSubtitleRemover';
export type {
  ProgressPayload,
  RemoveSubtitleRequest,
  RemoveSubtitleResponse,
  SubtitleArea,
  UseSubtitleRemoverOptions,
} from './hooks/useSubtitleRemover';
