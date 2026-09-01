"use client";

import React from "react";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import GraphicEqRoundedIcon from "@mui/icons-material/GraphicEqRounded";
import SubtitlesRoundedIcon from "@mui/icons-material/SubtitlesRounded";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import TranscriberHistoryPanel from "@/app/components/transcriber/TranscriberHistoryPanel";
import {
  applySpeakerNames,
  buildTranscriptFromSegments,
  DEFAULT_DIARIZATION_DEVICES,
  DEFAULT_DEVICES,
  DEFAULT_MODELS,
  extractErrorMessage,
  formatBytes,
  formatDateTime,
  getStatusChipProps,
  type DevicesResponse,
  type LogEntry,
  type ModelsResponse,
  type ToolStatus,
  type TranscriptListResponse,
  type TranscriptRecord,
  type TranscribeRouteResponse,
  type TranscriberProgressEvent,
} from "@/app/components/transcriber/transcriber-types";

interface ProcessView {
  taskId: string;
  fileName: string;
  fileSize: number;
  status: ToolStatus;
  progress: number;
  transcript: string;
  segments: Record<number, string>;
  logs: LogEntry[];
  error: string | null;
  transcriptionId: number | null;
}

function logEntry(level: string, message: string, logger?: string): LogEntry {
  return {
    id: `${Date.now()}-${Math.random()}`,
    level,
    message,
    logger,
    at: new Date().toLocaleTimeString("ru-RU"),
  };
}

export default function TranscriberTool() {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const eventSourcesRef = React.useRef<Map<string, EventSource>>(new Map());
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [isDragActive, setIsDragActive] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [models, setModels] = React.useState<string[]>(DEFAULT_MODELS);
  const [devices, setDevices] = React.useState<string[]>(DEFAULT_DEVICES);
  const [selectedModel, setSelectedModel] = React.useState("small");
  const [selectedDevice, setSelectedDevice] = React.useState("cpu");
  const [enableDiarization, setEnableDiarization] = React.useState(false);
  const [selectedDiarizationDevice, setSelectedDiarizationDevice] = React.useState("auto");
  const [processes, setProcesses] = React.useState<Record<string, ProcessView>>({});
  const [activeTaskId, setActiveTaskId] = React.useState<string | null>(null);
  const [selectedHistory, setSelectedHistory] = React.useState<TranscriptRecord | null>(null);
  const [transcriptions, setTranscriptions] = React.useState<TranscriptRecord[]>([]);
  const [historyLoading, setHistoryLoading] = React.useState(true);
  const [historyError, setHistoryError] = React.useState<string | null>(null);
  const [speakerNamesDraft, setSpeakerNamesDraft] = React.useState<Record<string, string>>({});
  const [speakerNamesSaving, setSpeakerNamesSaving] = React.useState(false);
  const [speakerNamesError, setSpeakerNamesError] = React.useState<string | null>(null);

  const activeProcess = activeTaskId ? processes[activeTaskId] ?? null : null;
  const shownStatus: ToolStatus = selectedHistory ? "viewing" : activeProcess?.status ?? "idle";
  const statusChip = getStatusChipProps(shownStatus);
  const transcriptText = selectedHistory?.transcript_text ?? activeProcess?.transcript ?? "";
  const displayedTranscriptText = applySpeakerNames(transcriptText, speakerNamesDraft);
  const progressPercent = selectedHistory ? 100 : activeProcess?.progress ?? 0;
  const visibleLogs = selectedHistory
    ? [logEntry("INFO", `Открыта запись от ${formatDateTime(selectedHistory.created_at)}.`, "history")]
    : activeProcess?.logs ?? [];

  const updateProcess = React.useCallback(
    (taskId: string, update: (current: ProcessView) => ProcessView) => {
      setProcesses((current) => {
        const process = current[taskId];
        return process ? { ...current, [taskId]: update(process) } : current;
      });
    },
    [],
  );

  const refreshHistory = React.useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const response = await fetch(
        "/api/transcriber/transcripts?limit=20&offset=0&order_by=created_at&order_direction=desc",
        { cache: "no-store" },
      );
      const payload = (await response.json().catch(() => null)) as TranscriptListResponse | null;
      if (!response.ok) {
        throw new Error(extractErrorMessage(payload, "Не удалось загрузить историю."));
      }
      setTranscriptions(Array.isArray(payload?.items) ? payload.items : []);
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : "Не удалось загрузить историю.");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  React.useEffect(() => {
    setSpeakerNamesDraft(selectedHistory?.speaker_names ?? {});
    setSpeakerNamesError(null);
  }, [selectedHistory]);

  const saveSpeakerNames = React.useCallback(async () => {
    if (!selectedHistory) return;
    setSpeakerNamesSaving(true);
    setSpeakerNamesError(null);
    try {
      const response = await fetch(`/api/transcriber/transcripts/${selectedHistory.id}/speaker-names`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ speaker_names: speakerNamesDraft }),
      });
      const updated = (await response.json().catch(() => null)) as TranscriptRecord | null;
      if (!response.ok || !updated) throw new Error(extractErrorMessage(updated, "Не удалось сохранить имена спикеров."));
      setSelectedHistory(updated);
      setTranscriptions((items) => items.map((item) => item.id === updated.id ? updated : item));
    } catch (error) {
      setSpeakerNamesError(error instanceof Error ? error.message : "Не удалось сохранить имена спикеров.");
    } finally {
      setSpeakerNamesSaving(false);
    }
  }, [selectedHistory, speakerNamesDraft]);

  React.useEffect(() => {
    void refreshHistory();
    void Promise.all([
      fetch("/api/transcriber/models", { cache: "no-store" }),
      fetch("/api/transcriber/devices", { cache: "no-store" }),
    ]).then(async ([modelsResponse, devicesResponse]) => {
      const modelsPayload = (await modelsResponse.json().catch(() => null)) as ModelsResponse | null;
      const devicesPayload = (await devicesResponse.json().catch(() => null)) as DevicesResponse | null;
      if (modelsPayload?.whisper_models?.length) setModels(modelsPayload.whisper_models);
      if (devicesPayload?.whisper_devices?.length) setDevices(devicesPayload.whisper_devices);
    }).catch(() => undefined);

    const sources = eventSourcesRef.current;
    return () => {
      sources.forEach((source) => source.close());
      sources.clear();
    };
  }, [refreshHistory]);

  const connectEvents = React.useCallback((taskId: string) => {
    eventSourcesRef.current.get(taskId)?.close();
    const source = new EventSource(`/api/transcriber/events/${encodeURIComponent(taskId)}`);
    eventSourcesRef.current.set(taskId, source);

    source.onmessage = (event) => {
      const payload = JSON.parse(event.data) as TranscriberProgressEvent;
      updateProcess(taskId, (current) => {
        if (payload.type === "transcribe_progress") {
          return { ...current, logs: [...current.logs, logEntry(payload.level ?? "INFO", payload.message ?? "Прогресс", payload.logger)].slice(-120) };
        }
        if (payload.type === "transcribe_started") {
          return { ...current, status: "transcribing", logs: [...current.logs, logEntry("INFO", "Обработка началась.", "transcriber")].slice(-120) };
        }
        if (payload.type === "transcribe_progress_chunk") {
          const segments = { ...current.segments };
          if (typeof payload.segment_index === "number" && payload.segment_text) {
            segments[payload.segment_index] = payload.segment_text;
          }
          return {
            ...current,
            status: "transcribing",
            progress: typeof payload.progress_percent === "number" ? payload.progress_percent : current.progress,
            segments,
            transcript: buildTranscriptFromSegments(new Map(Object.entries(segments).map(([index, text]) => [Number(index), text]))),
          };
        }
        if (payload.type === "transcribe_failed") {
          source.close();
          eventSourcesRef.current.delete(taskId);
          return { ...current, status: "error", error: payload.detail ?? "Ошибка транскрибации." };
        }
        source.close();
        eventSourcesRef.current.delete(taskId);
        window.setTimeout(() => void refreshHistory(), 0);
        return {
          ...current,
          status: "completed",
          progress: 100,
          transcript: payload.transcript_text ?? current.transcript,
          transcriptionId: payload.transcription_id ?? null,
        };
      });
    };
    source.onerror = () => {
      updateProcess(taskId, (current) => current.status === "completed" || current.status === "error"
        ? current
        : { ...current, logs: [...current.logs, logEntry("WARN", "SSE-соединение переподключается.", "gateway.sse")].slice(-120) });
    };
  }, [refreshHistory, updateProcess]);

  React.useEffect(() => {
    let cancelled = false;
    void fetch("/api/transcriber/sessions", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json().catch(() => [])) as TranscribeRouteResponse[];
        if (cancelled || !response.ok || !Array.isArray(payload)) return;
        const activeSessions = payload.filter((session) => session.status === "queued" || session.status === "processing");
        if (!activeSessions.length) return;
        setProcesses((current) => {
          const next = { ...current };
          for (const session of activeSessions) {
            if (!next[session.id]) {
              next[session.id] = {
                taskId: session.id,
                fileName: session.original_filename,
                fileSize: 0,
                status: session.status === "processing" ? "transcribing" : "queued",
                progress: 0,
                transcript: "",
                segments: {},
                logs: [logEntry("INFO", "Активная сессия восстановлена.", "client")],
                error: null,
                transcriptionId: session.transcription_id,
              };
            }
          }
          return next;
        });
        setActiveTaskId((current) => current ?? activeSessions[0]?.id ?? null);
        activeSessions.forEach((session) => connectEvents(session.id));
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [connectEvents]);

  const submitFile = React.useCallback(async (file: File) => {
    const taskId = crypto.randomUUID();
    const initial: ProcessView = {
      taskId, fileName: file.name, fileSize: file.size, status: "uploading", progress: 0,
      transcript: "", segments: {}, logs: [logEntry("INFO", "Загрузка в auth-gateway.", "client")],
      error: null, transcriptionId: null,
    };
    setProcesses((current) => ({ ...current, [taskId]: initial }));
    setActiveTaskId(taskId);
    setSelectedHistory(null);

    const formData = new FormData();
    formData.append("file", file, file.name);
    formData.append("task_id", taskId);
    formData.append("whisper_model", selectedModel);
    formData.append("whisper_device", selectedDevice);
    formData.append("enable_diarization", String(enableDiarization));
    formData.append("diarization_device", selectedDiarizationDevice);

    try {
      const response = await fetch("/api/transcriber/transcribe", { method: "POST", body: formData });
      const payload = (await response.json().catch(() => null)) as TranscribeRouteResponse | null;
      if (!response.ok || !payload?.id) {
        throw new Error(extractErrorMessage(payload, "Не удалось создать сессию транскрибации."));
      }
      updateProcess(taskId, (current) => ({
        ...current,
        status: "queued",
        logs: [...current.logs, logEntry("INFO", `Сессия ${payload.id} создана.`, "gateway")],
      }));
      connectEvents(taskId);
    } catch (error) {
      updateProcess(taskId, (current) => ({
        ...current,
        status: "error",
        error: error instanceof Error ? error.message : "Ошибка отправки.",
      }));
    }
  }, [connectEvents, enableDiarization, selectedDevice, selectedDiarizationDevice, selectedModel, updateProcess]);

  const submitSelected = React.useCallback(async () => {
    if (!selectedFiles.length || isSubmitting) return;
    const files = selectedFiles;
    setSelectedFiles([]);
    setIsSubmitting(true);
    await Promise.all(files.map(submitFile));
    setIsSubmitting(false);
  }, [isSubmitting, selectedFiles, submitFile]);

  const chooseFiles = React.useCallback((files: FileList | null) => {
    if (!files) return;
    const incoming = Array.from(files).filter((file) => file.size > 0);
    setSelectedFiles((current) => {
      const keyed = new Map(current.map((file) => [`${file.name}:${file.size}:${file.lastModified}`, file]));
      incoming.forEach((file) => keyed.set(`${file.name}:${file.size}:${file.lastModified}`, file));
      return [...keyed.values()];
    });
  }, []);

  return (
    <Stack spacing={3}>
      <Paper variant="outlined" sx={{ borderRadius: 4, p: { xs: 3, md: 4 } }}>
        <Stack spacing={2.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
            <Box>
              <Stack direction="row" spacing={1.5} alignItems="center"><GraphicEqRoundedIcon color="primary" /><Typography variant="h4" fontWeight={700}>Transcriber</Typography></Stack>
              <Typography color="text.secondary">Выберите несколько аудио/видео файлов, настройте обработку и нажмите «Отправить».</Typography>
            </Box>
            <Chip label={statusChip.label} color={statusChip.color} />
          </Stack>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(4, minmax(0, 220px))" }, gap: 2 }}>
            <TextField select label="Whisper model" value={selectedModel} onChange={(event) => setSelectedModel(event.target.value)}>{models.map((model) => <MenuItem key={model} value={model}>{model}</MenuItem>)}</TextField>
            <TextField select label="Device" value={selectedDevice} onChange={(event) => setSelectedDevice(event.target.value)}>{devices.map((device) => <MenuItem key={device} value={device}>{device}</MenuItem>)}</TextField>
            <Stack direction="row" spacing={1} alignItems="center"><Switch checked={enableDiarization} onChange={(event) => setEnableDiarization(event.target.checked)} /><Typography>Диаризация</Typography></Stack>
            <TextField select label="Diarization device" value={selectedDiarizationDevice} disabled={!enableDiarization} onChange={(event) => setSelectedDiarizationDevice(event.target.value)}>{DEFAULT_DIARIZATION_DEVICES.map((device) => <MenuItem key={device} value={device}>{device}</MenuItem>)}</TextField>
          </Box>

          <Box
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={(event) => { event.preventDefault(); setIsDragActive(true); }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => { event.preventDefault(); setIsDragActive(false); }}
            onDrop={(event) => { event.preventDefault(); setIsDragActive(false); chooseFiles(event.dataTransfer.files); }}
            sx={{ border: "2px dashed", borderColor: isDragActive ? "primary.main" : "divider", borderRadius: 4, p: 4, textAlign: "center", cursor: "pointer", bgcolor: isDragActive ? "action.hover" : "transparent" }}
          >
            <CloudUploadRoundedIcon color="primary" sx={{ fontSize: 48 }} />
            <Typography variant="h6">Перетащите аудио или видео сюда</Typography>
            <Typography color="text.secondary">Файлы добавятся в список и не отправятся без нажатия кнопки.</Typography>
          </Box>
          <input ref={fileInputRef} type="file" multiple hidden onChange={(event) => { chooseFiles(event.target.files); event.currentTarget.value = ""; }} />

          {selectedFiles.length > 0 && <Stack spacing={1}>
            <Typography fontWeight={700}>К отправке: {selectedFiles.length}</Typography>
            <Stack direction="row" gap={1} flexWrap="wrap">{selectedFiles.map((file) => <Chip key={`${file.name}:${file.size}:${file.lastModified}`} icon={<DescriptionRoundedIcon />} label={`${file.name} • ${formatBytes(file.size)}`} onDelete={() => setSelectedFiles((current) => current.filter((item) => item !== file))} />)}</Stack>
            <Button variant="contained" disabled={isSubmitting} onClick={() => void submitSelected()}>{isSubmitting ? "Загрузка..." : `Отправить (${selectedFiles.length})`}</Button>
          </Stack>}
        </Stack>
      </Paper>

      {Object.keys(processes).length > 0 && <Paper variant="outlined" sx={{ borderRadius: 4, p: 2 }}>
        <Typography fontWeight={700} sx={{ mb: 1 }}>Активные процессы</Typography>
        <Stack direction="row" gap={1} flexWrap="wrap">{Object.values(processes).map((process) => <Button key={process.taskId} size="small" variant={activeTaskId === process.taskId && !selectedHistory ? "contained" : "outlined"} onClick={() => { setActiveTaskId(process.taskId); setSelectedHistory(null); }}>{process.fileName} · {getStatusChipProps(process.status).label}</Button>)}</Stack>
      </Paper>}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) 360px" }, gap: 3 }}>
        <Stack spacing={3}>
          <Paper variant="outlined" sx={{ borderRadius: 4, p: 3 }}>
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} alignItems="center"><SubtitlesRoundedIcon color="primary" /><Typography variant="h6" fontWeight={700}>{selectedHistory?.original_filename ?? activeProcess?.fileName ?? "Текст транскрибации"}</Typography></Stack>
              {(activeProcess || selectedHistory) && <><LinearProgress variant="determinate" value={progressPercent} /><Typography variant="caption">{progressPercent}% · UUID: {activeProcess?.taskId ?? selectedHistory?.task_id}</Typography></>}
              {activeProcess?.error && <Alert severity="error">{activeProcess.error}</Alert>}
              {selectedHistory && selectedHistory.speaker_count > 0 && <Stack spacing={1} sx={{ pt: 1 }}>
                <Typography variant="subtitle2">Спикеры: {selectedHistory.speaker_count}</Typography>
                {Object.keys(speakerNamesDraft).sort().map((speaker) => <Stack key={speaker} direction="row" spacing={1} alignItems="center"><Chip label={speaker} size="small" /><TextField size="small" label="Отображаемое имя" value={speakerNamesDraft[speaker] ?? ""} onChange={(event) => setSpeakerNamesDraft((current) => ({ ...current, [speaker]: event.target.value }))} /></Stack>)}
                {speakerNamesError && <Alert severity="error">{speakerNamesError}</Alert>}
                <Box><Button size="small" variant="outlined" disabled={speakerNamesSaving} onClick={() => void saveSpeakerNames()}>{speakerNamesSaving ? "Сохранение..." : "Сохранить имена"}</Button></Box>
              </Stack>}
              <TextField value={displayedTranscriptText} multiline minRows={14} maxRows={24} fullWidth placeholder="Выберите процесс или запись истории." InputProps={{ readOnly: true, sx: { fontFamily: "monospace" } }} />
            </Stack>
          </Paper>
          <Paper variant="outlined" sx={{ borderRadius: 4, p: 3 }}><Typography fontWeight={700}>Логи прогресса</Typography><Box sx={{ mt: 1, maxHeight: 220, overflowY: "auto", fontFamily: "monospace", fontSize: 12 }}>{visibleLogs.length ? visibleLogs.map((entry) => <Box key={entry.id}>[{entry.at}] {entry.level} {entry.logger ?? ""}: {entry.message}</Box>) : <Typography variant="caption" color="text.secondary">События выбранного процесса появятся здесь.</Typography>}</Box></Paper>
        </Stack>
        <TranscriberHistoryPanel items={transcriptions} selectedTranscriptId={selectedHistory?.id ?? activeProcess?.transcriptionId ?? null} loading={historyLoading} loadingError={historyError} isSubmitting={isSubmitting} onRefresh={() => void refreshHistory()} onSelect={(item) => { setSelectedHistory(item); setActiveTaskId(null); }} />
      </Box>
    </Stack>
  );
}
