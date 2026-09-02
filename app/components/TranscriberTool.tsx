"use client";

import React from "react";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Slider from "@mui/material/Slider";
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
  type SpeakerMetadata,
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
  speakerNames: Record<string, SpeakerMetadata>;
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

const modelQuality = ["tiny", "base", "small", "medium", "large-v2", "large-v3"];

function transcriptParagraphs(text: string) {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line, index) => {
    const match = line.match(/^\[([^\]]+)]\s*(.*)$/);
    return { speaker: match?.[1] ?? "Текст", text: match?.[2] ?? line, index };
  });
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
  const [speakerNamesDraft, setSpeakerNamesDraft] = React.useState<Record<string, SpeakerMetadata>>({});
  const [speakerNamesSaving, setSpeakerNamesSaving] = React.useState(false);
  const [speakerNamesError, setSpeakerNamesError] = React.useState<string | null>(null);
  const [editingSpeaker, setEditingSpeaker] = React.useState<string | null>(null);

  const activeProcess = activeTaskId ? processes[activeTaskId] ?? null : null;
  const shownStatus: ToolStatus = selectedHistory ? "viewing" : activeProcess?.status ?? "idle";
  const statusChip = getStatusChipProps(shownStatus);
  const transcriptText = selectedHistory?.transcript_text ?? activeProcess?.transcript ?? "";
  const displayedTranscriptText = applySpeakerNames(transcriptText, speakerNamesDraft);
  const shownSpeakerNames = selectedHistory?.speaker_names ?? activeProcess?.speakerNames ?? {};
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
          speakerNames: payload.speaker_names ?? current.speakerNames,
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
                speakerNames: {},
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
      speakerNames: {},
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

  const resultVisible = Boolean(selectedHistory || activeProcess);
  const qualityIndex = Math.max(0, modelQuality.indexOf(selectedModel));
  const downloadTranscript = () => {
    if (!displayedTranscriptText) return;
    const url = URL.createObjectURL(new Blob([displayedTranscriptText], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${(selectedHistory?.original_filename ?? activeProcess?.fileName ?? "transcript").replace(/\.[^.]+$/, "")}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const queue = Object.values(processes);
  const sidePanel = resultVisible && queue.length > 0 ? <Paper elevation={0} sx={{ width: "100%", maxWidth: 334, bgcolor: "#f6f6f7", borderRadius: "32px", p: "12px 8px 8px", boxShadow: "0 2px 12px rgba(16,18,21,.08)", alignSelf: "start" }}>
    <Typography sx={{ height: 36, display: "grid", placeItems: "center", fontSize: 20, fontWeight: 500 }}>Очередь</Typography>
    <Stack spacing="2px" sx={{ maxHeight: 502, overflowY: "auto" }}>{queue.map((process) => <Box component="button" key={process.taskId} onClick={() => { setActiveTaskId(process.taskId); setSelectedHistory(null); }} sx={{ border: activeTaskId === process.taskId && !selectedHistory ? "2px solid #101215" : "0.5px solid rgba(0,0,0,.04)", bgcolor: "#fff", borderRadius: "20px", p: "10px 12px", minHeight: 92, textAlign: "left", font: "inherit", cursor: "pointer" }}>
      <Typography noWrap sx={{ fontWeight: 500 }}>{process.fileName}</Typography>
      <Typography sx={{ color: "rgba(16,18,21,.55)", fontSize: 12, mb: 1 }}>{getStatusChipProps(process.status).label} · {Math.round(process.progress)}%</Typography>
      <LinearProgress variant="determinate" value={process.progress} sx={{ height: 4, borderRadius: 2, bgcolor: "#e4e4e7", "& .MuiLinearProgress-bar": { bgcolor: "#101215" } }} />
    </Box>)}</Stack>
  </Paper> : <TranscriberHistoryPanel items={transcriptions} selectedTranscriptId={selectedHistory?.id ?? activeProcess?.transcriptionId ?? null} loading={historyLoading} loadingError={historyError} isSubmitting={isSubmitting} onRefresh={() => void refreshHistory()} onSelect={(item) => { setSelectedHistory(item); setActiveTaskId(null); }} />;

  return <Box>
    <Typography sx={{ color: "rgba(16,18,21,.48)", fontSize: 13, mb: 3 }}>Сервисы&nbsp;&nbsp;/&nbsp;&nbsp;<Box component="span" sx={{ color: "#101215" }}>Транскрибатор</Box></Typography>
    <Box sx={{ position: "relative" }}>
      <Box sx={{ width: "100%", maxWidth: resultVisible ? 780 : 560, mx: "auto" }}>
        {!resultVisible ? <Stack spacing={3}>
          <Box sx={{ textAlign: "center", mb: 1 }}><Typography component="h1" sx={{ fontSize: { xs: 34, md: 48 }, lineHeight: 1.05, fontWeight: 500, letterSpacing: "-.04em" }}>Транскрибатор</Typography><Typography sx={{ mt: 1.5, color: "rgba(16,18,21,.56)", fontSize: 16 }}>Загрузите аудио или видео — мы превратим речь в аккуратный текст</Typography></Box>
          <input ref={fileInputRef} type="file" multiple hidden onChange={(event) => { chooseFiles(event.target.files); event.currentTarget.value = ""; }} />
          {selectedFiles.length === 0 ? <Box onClick={() => fileInputRef.current?.click()} onDragEnter={(event) => { event.preventDefault(); setIsDragActive(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { event.preventDefault(); setIsDragActive(false); }} onDrop={(event) => { event.preventDefault(); setIsDragActive(false); chooseFiles(event.dataTransfer.files); }} sx={{ height: 360, border: "1px dashed", borderColor: isDragActive ? "#101215" : "rgba(16,18,21,.22)", borderRadius: "32px", bgcolor: isDragActive ? "#f2f2f4" : "#f6f6f7", display: "grid", placeItems: "center", cursor: "pointer", transition: ".2s" }}><Stack alignItems="center" spacing={1.5}><Box component="img" src="/transcriber-ui/icons/upload_black_icon.svg" alt="" sx={{ width: 48, height: 48 }} /><Typography sx={{ fontSize: 20, fontWeight: 500 }}>Перетащите файлы сюда</Typography><Typography sx={{ color: "rgba(16,18,21,.5)", fontSize: 14 }}>или нажмите, чтобы выбрать</Typography><Typography sx={{ color: "rgba(16,18,21,.35)", fontSize: 12 }}>Аудио и видео любых форматов</Typography></Stack></Box> : <Paper elevation={0} sx={{ height: 500, bgcolor: "#f6f6f7", borderRadius: "32px", p: "12px 8px 8px", boxShadow: "0 2px 12px rgba(16,18,21,.08)", display: "flex", flexDirection: "column" }}>
            <Box sx={{ flex: 1, overflowY: "auto" }}>{selectedFiles.map((file) => { const video = file.type.startsWith("video/") || /\.(mp4|mov|mkv|webm|avi)$/i.test(file.name); return <Box key={`${file.name}:${file.size}:${file.lastModified}`} sx={{ minHeight: 64, display: "grid", gridTemplateColumns: "44px minmax(0,1fr) 36px", alignItems: "center", gap: 1.5, bgcolor: "#fff", borderRadius: "18px", px: 1.5, mb: "2px" }}><Box component="img" src={`/transcriber-ui/icons/${video ? "video_icon.svg" : "audio_icon.svg"}`} alt="" sx={{ width: 40, height: 40 }} /><Box sx={{ minWidth: 0 }}><Typography noWrap sx={{ fontSize: 15, fontWeight: 500 }}>{file.name}</Typography><Typography sx={{ fontSize: 12, color: "rgba(16,18,21,.45)" }}>{formatBytes(file.size)}</Typography></Box><IconButton aria-label={`Удалить ${file.name}`} onClick={() => setSelectedFiles((current) => current.filter((item) => item !== file))}><Box component="img" src="/transcriber-ui/icons/trash_icon.svg" alt="" sx={{ width: 20, height: 20 }} /></IconButton></Box>; })}</Box>
            <Box sx={{ flexShrink: 0, bgcolor: "rgba(255,255,255,.72)", borderRadius: "24px", p: 2, backdropFilter: "blur(16px)" }}><Stack direction="row" justifyContent="space-between"><Typography sx={{ fontWeight: 500 }}>Добавлено файлов</Typography><Typography>{selectedFiles.length}</Typography></Stack><Button fullWidth onClick={() => fileInputRef.current?.click()} sx={{ mt: 1, color: "#101215", textTransform: "none" }}>+ Добавить ещё</Button></Box>
          </Paper>}
          {selectedFiles.length > 0 && <><Box><Stack direction="row" justifyContent="space-between"><Typography sx={{ fontSize: 15, fontWeight: 500 }}>Качество распознавания</Typography><Typography sx={{ fontSize: 13, color: "rgba(16,18,21,.5)" }}>{selectedModel}</Typography></Stack><Slider min={0} max={modelQuality.length - 1} step={1} value={qualityIndex} onChange={(_, value) => { const candidate = modelQuality[value as number]; if (models.includes(candidate)) setSelectedModel(candidate); }} sx={{ color: "#101215", "& .MuiSlider-thumb": { width: 18, height: 18 }, "& .MuiSlider-rail": { opacity: .15 } }} /></Box>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 1.5 }}>
              <Paper elevation={0} onClick={() => setEnableDiarization((value) => !value)} sx={{ borderRadius: "24px", p: 2, minHeight: 170, cursor: "pointer", bgcolor: enableDiarization ? "#e4e4e7" : "#f6f6f7", backgroundImage: "url('/transcriber-ui/images/speakers_stone.png')", backgroundBlendMode: "luminosity", backgroundSize: "110px", backgroundPosition: "right bottom", backgroundRepeat: "no-repeat" }}><Typography sx={{ fontWeight: 500 }}>Спикеры</Typography><Typography sx={{ mt: .5, fontSize: 12, color: "rgba(16,18,21,.5)" }}>{enableDiarization ? "Разделение включено" : "Разделить голоса"}</Typography><Switch size="small" checked={enableDiarization} readOnly sx={{ mt: 2 }} /></Paper>
              <Paper elevation={0} sx={{ borderRadius: "24px", p: 2, minHeight: 170, bgcolor: "#f6f6f7", backgroundImage: "url('/transcriber-ui/images/language_stone.png')", backgroundBlendMode: "luminosity", backgroundSize: "110px", backgroundPosition: "right bottom", backgroundRepeat: "no-repeat" }}><Typography sx={{ fontWeight: 500 }}>Язык</Typography><Typography sx={{ mt: .5, fontSize: 12, color: "rgba(16,18,21,.5)" }}>Определится автоматически</Typography></Paper>
              <Paper elevation={0} sx={{ borderRadius: "24px", p: 2, minHeight: 170, bgcolor: "#f6f6f7", backgroundImage: "url('/transcriber-ui/images/ai_feature_stone.png')", backgroundBlendMode: "luminosity", backgroundSize: "110px", backgroundPosition: "right bottom", backgroundRepeat: "no-repeat" }}><Typography sx={{ fontWeight: 500 }}>AI-обработка</Typography><Typography sx={{ mt: .5, fontSize: 12, color: "rgba(16,18,21,.5)" }}>Скоро</Typography></Paper>
            </Box>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}><TextField select size="small" label="Устройство Whisper" value={selectedDevice} onChange={(event) => setSelectedDevice(event.target.value)}>{devices.map((device) => <MenuItem key={device} value={device}>{device}</MenuItem>)}</TextField><TextField select size="small" label="Устройство диаризации" value={selectedDiarizationDevice} disabled={!enableDiarization} onChange={(event) => setSelectedDiarizationDevice(event.target.value)}>{DEFAULT_DIARIZATION_DEVICES.map((device) => <MenuItem key={device} value={device}>{device}</MenuItem>)}</TextField></Box>
            <Stack direction="row" spacing={1.5}><Button startIcon={<ArrowBackRoundedIcon />} onClick={() => setSelectedFiles([])} sx={{ flex: 1, height: 52, borderRadius: "18px", color: "#101215", bgcolor: "#f6f6f7", textTransform: "none" }}>Назад</Button><Button endIcon={<ArrowForwardRoundedIcon />} disabled={isSubmitting} onClick={() => void submitSelected()} sx={{ flex: 2, height: 52, borderRadius: "18px", color: "#fff", bgcolor: "#101215", textTransform: "none", "&:hover": { bgcolor: "#27292d" } }}>{isSubmitting ? "Загрузка…" : `Транскрибировать · ${selectedFiles.length}`}</Button></Stack>
          </>}
        </Stack> : <Stack spacing={2}>
          <Paper elevation={0} sx={{ bgcolor: "#f6f6f7", borderRadius: "32px", boxShadow: "0 2px 12px rgba(16,18,21,.08)", overflow: "hidden" }}>
            <Box sx={{ p: 2.5, bgcolor: "rgba(255,255,255,.72)" }}><Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}><Box sx={{ minWidth: 0 }}><Typography noWrap sx={{ fontSize: 18, fontWeight: 500 }}>{selectedHistory?.original_filename ?? activeProcess?.fileName}</Typography><Typography sx={{ fontSize: 12, color: "rgba(16,18,21,.48)" }}>{progressPercent}% · {statusChip.label}</Typography></Box><Chip size="small" label={`${progressPercent}%`} sx={{ bgcolor: "#101215", color: "#fff" }} /></Stack><LinearProgress variant="determinate" value={progressPercent} sx={{ mt: 1.5, height: 3, bgcolor: "#dedee2", "& .MuiLinearProgress-bar": { bgcolor: "#101215" } }} /></Box>
            {activeProcess?.error && <Alert severity="error" sx={{ m: 2 }}>{activeProcess.error}</Alert>}
            <Box sx={{ height: { xs: 440, md: 560 }, overflowY: "auto", px: { xs: 2, md: 5 }, py: 3 }}><Stack spacing={1.5}>{transcriptText ? transcriptParagraphs(transcriptText).map((part) => { const metadata = shownSpeakerNames[part.speaker]; const isMain = metadata?.main_speaker === true; const editKey = `${part.index}:${part.speaker}`; const isEditing = selectedHistory && editingSpeaker === editKey; return <Box key={`${part.index}-${part.speaker}`} sx={{ alignSelf: isMain ? "flex-end" : "flex-start", maxWidth: "82%" }}><Typography onDoubleClick={() => selectedHistory && metadata && setEditingSpeaker(editKey)} title={selectedHistory && metadata ? "Дважды нажмите, чтобы изменить спикера" : undefined} sx={{ px: 1, mb: .5, fontSize: 11, color: "rgba(16,18,21,.45)", cursor: selectedHistory && metadata ? "pointer" : "default", userSelect: "none", textAlign: isMain ? "right" : "left" }}>{metadata?.name ?? part.speaker}{isMain ? " · главный" : ""}</Typography>{isEditing && <Box sx={{ mb: 1, p: 1.5, bgcolor: "#fff", border: "1px solid rgba(16,18,21,.12)", borderRadius: "16px", minWidth: 260 }}><TextField autoFocus fullWidth size="small" label="Имя спикера" value={speakerNamesDraft[part.speaker]?.name ?? ""} onChange={(event) => setSpeakerNamesDraft((current) => ({ ...current, [part.speaker]: { ...current[part.speaker], name: event.target.value } }))} /><Stack direction="row" spacing={1} sx={{ mt: 1 }}><Button size="small" disabled={isMain} onClick={() => setSpeakerNamesDraft((current) => Object.fromEntries(Object.entries(current).map(([speaker, value]) => [speaker, { ...value, main_speaker: speaker === part.speaker }]))) } sx={{ color: "#101215", textTransform: "none" }}>{isMain ? "Главный спикер" : "Сделать главным"}</Button><Button size="small" disabled={speakerNamesSaving} onClick={async () => { await saveSpeakerNames(); setEditingSpeaker(null); }} sx={{ color: "#101215", textTransform: "none" }}>{speakerNamesSaving ? "Сохранение…" : "Сохранить"}</Button></Stack>{speakerNamesError && <Typography sx={{ mt: 1, color: "error.main", fontSize: 12 }}>{speakerNamesError}</Typography>}</Box>}<Box sx={{ bgcolor: isMain ? "#ddd2ff" : "#fff", borderRadius: isMain ? "22px 22px 5px 22px" : "22px 22px 22px 5px", px: 2, py: 1.25, fontSize: 15, lineHeight: 1.5 }}>{part.text}</Box></Box>; }) : <Box sx={{ py: 12, textAlign: "center" }}><Typography sx={{ color: "rgba(16,18,21,.45)" }}>Текст появится по мере обработки</Typography>{visibleLogs.at(-1) && <Typography sx={{ mt: 1, fontSize: 12, color: "rgba(16,18,21,.35)" }}>{visibleLogs.at(-1)?.message}</Typography>}</Box>}</Stack></Box>
            <Stack direction="row" justifyContent="center" spacing={1} sx={{ p: 1.5, bgcolor: "rgba(255,255,255,.72)" }}><IconButton aria-label="Закрыть результат" onClick={() => { setSelectedHistory(null); setActiveTaskId(null); }}><Box component="img" src="/transcriber-ui/icons/trash_icon.svg" alt="" sx={{ width: 20 }} /></IconButton><Button startIcon={<DownloadRoundedIcon />} disabled={!displayedTranscriptText} onClick={downloadTranscript} sx={{ color: "#101215", textTransform: "none" }}>Скачать</Button></Stack>
          </Paper>
          <Button startIcon={<ArrowBackRoundedIcon />} onClick={() => { setSelectedHistory(null); setActiveTaskId(null); }} sx={{ alignSelf: "center", color: "#101215", textTransform: "none" }}>Вернуться на главную</Button>
        </Stack>}
      </Box>
      <Box sx={{ mt: { xs: 4, xl: 0 }, display: { xs: "flex", xl: "block" }, justifyContent: "center", position: { xl: "fixed" }, right: { xl: 24 }, top: { xl: 96 }, width: { xs: "100%", xl: 334 }, zIndex: 5 }}>{sidePanel}</Box>
    </Box>
  </Box>;
}
