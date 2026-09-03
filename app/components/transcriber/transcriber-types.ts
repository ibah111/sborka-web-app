export const DEFAULT_MODELS = [
  "tiny",
  "base",
  "small",
  "medium",
  "large-v2",
  "large-v3",
  "large",
];


export type ToolStatus =
  | "idle"
  | "queued"
  | "uploading"
  | "connecting"
  | "transcribing"
  | "completed"
  | "error"
  | "viewing";

export interface SpeakerMetadata {
  name: string;
  main_speaker: boolean;
}

export interface TranscriptRecord {
  id: number;
  user_id: number;
  task_id: string;
  original_filename: string;
  media_type: string | null;
  whisper_model: string;
  whisper_device: string;
  transcript_text: string;
  speaker_names: Record<string, SpeakerMetadata>;
  speaker_count: number;
  created_at: string;
}

export interface TranscriptListResponse {
  items: TranscriptRecord[];
  total: number;
}

export interface ModelsResponse {
  whisper_models?: string[];
}

export interface TranscribeRouteResponse {
  id: string;
  user_id: number;
  original_filename: string;
  media_type: string | null;
  status: "queued" | "processing" | "completed" | "failed";
  error_message: string | null;
  transcription_id: number | null;
  created_at: string;
}

export interface LogEntry {
  id: string;
  level: string;
  message: string;
  logger?: string;
  at: string;
}

export interface ProgressLogEvent {
  type: "transcribe_progress";
  task_id: string;
  logger?: string;
  level?: string;
  message?: string;
}

export interface ProgressChunkEvent {
  type: "transcribe_progress_chunk";
  task_id: string;
  progress_percent?: number;
  segment_index?: number;
  segment_text?: string;
}

export interface CompletedEvent {
  type: "transcribe_completed";
  task_id: string;
  transcription_id?: number;
  original_filename?: string;
  transcript_text?: string;
  speaker_names?: Record<string, SpeakerMetadata>;
  speaker_count?: number;
}

export interface StartedEvent {
  type: "transcribe_started";
  task_id: string;
  original_filename?: string;
}

export interface FailedEvent {
  type: "transcribe_failed";
  task_id: string;
  detail?: string;
}

export type TranscriberProgressEvent =
  | ProgressLogEvent
  | ProgressChunkEvent
  | CompletedEvent
  | StartedEvent
  | FailedEvent;

export function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatBytes(size: number): string {
  if (!Number.isFinite(size) || size <= 0) {
    return "0 Б";
  }

  const units = ["Б", "КБ", "МБ", "ГБ"];
  const power = Math.min(
    Math.floor(Math.log(size) / Math.log(1024)),
    units.length - 1,
  );
  const value = size / 1024 ** power;

  return `${value.toFixed(value >= 10 || power === 0 ? 0 : 1)} ${units[power]}`;
}

export function buildTranscriptFromSegments(segments: Map<number, string>): string {
  return [...segments.entries()]
    .sort(([leftIndex], [rightIndex]) => leftIndex - rightIndex)
    .map(([, text]) => text.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+([,.!?;:])/g, "$1");
}

export function applySpeakerNames(text: string, speakerNames: Record<string, SpeakerMetadata>): string {
  return text.replace(/\[(SPEAKER_[^\]]+)\]/g, (label, speaker) => {
    const displayName = speakerNames[speaker]?.name?.trim();
    return displayName ? `[${displayName}]` : label;
  });
}

export function getStatusChipProps(status: ToolStatus) {
  switch (status) {
    case "connecting":
      return { label: "Подключение", color: "info" as const };
    case "queued":
      return { label: "В очереди", color: "info" as const };
    case "uploading":
      return { label: "Загрузка", color: "info" as const };
    case "transcribing":
      return { label: "Транскрибация", color: "warning" as const };
    case "completed":
      return { label: "Готово", color: "success" as const };
    case "error":
      return { label: "Ошибка", color: "error" as const };
    case "viewing":
      return { label: "Просмотр истории", color: "secondary" as const };
    default:
      return { label: "Ожидание файла", color: "default" as const };
  }
}

export function extractErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const detail = (payload as { detail?: unknown }).detail;
  if (typeof detail === "string" && detail.trim().length > 0) {
    return detail;
  }

  const error = (payload as { error?: unknown }).error;
  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  const message = (payload as { message?: unknown }).message;
  if (typeof message === "string" && message.trim().length > 0) {
    return message;
  }

  return fallback;
}
