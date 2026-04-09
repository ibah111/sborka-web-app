"use client";

import React, { startTransition } from "react";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import GraphicEqRoundedIcon from "@mui/icons-material/GraphicEqRounded";
import SubtitlesRoundedIcon from "@mui/icons-material/SubtitlesRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import TranscriberHistoryPanel from "@/app/components/transcriber/TranscriberHistoryPanel";
import {
  buildTranscriptFromSegments,
  buildWsUrl,
  DEFAULT_DEVICES,
  DEFAULT_MODELS,
  extractErrorMessage,
  formatBytes,
  formatDateTime,
  getStatusChipProps,
  waitForSocketReady,
  type DevicesResponse,
  type LogEntry,
  type ModelsResponse,
  type ToolStatus,
  type TranscriptListResponse,
  type TranscriptRecord,
  type TranscribeRouteResponse,
  type TranscriberSocketEvent,
} from "@/app/components/transcriber/transcriber-types";

export default function TranscriberTool() {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const transcriptInputRef = React.useRef<HTMLTextAreaElement | null>(null);
  const logsContainerRef = React.useRef<HTMLDivElement | null>(null);
  const websocketRef = React.useRef<WebSocket | null>(null);
  const segmentMapRef = React.useRef<Map<number, string>>(new Map());
  const currentTaskIdRef = React.useRef<string | null>(null);
  const uploadFinishedRef = React.useRef(false);

  const [isDragActive, setIsDragActive] = React.useState(false);
  const [status, setStatus] = React.useState<ToolStatus>("idle");
  const [progressPercent, setProgressPercent] = React.useState(0);
  const [selectedFileName, setSelectedFileName] = React.useState<string | null>(null);
  const [selectedFileSize, setSelectedFileSize] = React.useState<number | null>(null);
  const [models, setModels] = React.useState<string[]>(DEFAULT_MODELS);
  const [devices, setDevices] = React.useState<string[]>(DEFAULT_DEVICES);
  const [selectedModel, setSelectedModel] = React.useState("small");
  const [selectedDevice, setSelectedDevice] = React.useState("cpu");
  const [transcriptText, setTranscriptText] = React.useState("");
  const [logs, setLogs] = React.useState<LogEntry[]>([]);
  const [transcriptions, setTranscriptions] = React.useState<TranscriptRecord[]>([]);
  const [selectedTranscriptId, setSelectedTranscriptId] = React.useState<number | null>(null);
  const [historyLoading, setHistoryLoading] = React.useState(true);
  const [historyError, setHistoryError] = React.useState<string | null>(null);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const statusChip = React.useMemo(() => getStatusChipProps(status), [status]);

  const closeSocket = React.useCallback(() => {
    const socket = websocketRef.current;

    if (!socket) {
      return;
    }

    socket.onopen = null;
    socket.onmessage = null;
    socket.onerror = null;
    socket.onclose = null;

    if (
      socket.readyState === WebSocket.OPEN ||
      socket.readyState === WebSocket.CONNECTING
    ) {
      socket.close();
    }

    websocketRef.current = null;
  }, []);

  const appendLog = React.useCallback(
    (level: string, message: string, logger?: string) => {
      const timestamp = new Date().toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      setLogs((currentLogs) => {
        const nextLogs = [
          ...currentLogs,
          {
            id: `${Date.now()}-${Math.random()}`,
            level,
            message,
            logger,
            at: timestamp,
          },
        ];

        return nextLogs.slice(-120);
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
        {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        },
      );

      const payload = (await response
        .json()
        .catch(() => null)) as TranscriptListResponse | null;

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(payload, "Не удалось загрузить историю транскрибаций."),
        );
      }

      setTranscriptions(Array.isArray(payload?.items) ? payload.items : []);
    } catch (error) {
      setHistoryError(
        error instanceof Error
          ? error.message
          : "Не удалось загрузить историю транскрибаций.",
      );
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let ignore = false;

    async function loadCapabilities() {
      try {
        const [modelsResponse, devicesResponse] = await Promise.all([
          fetch("/api/transcriber/models", {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
          }),
          fetch("/api/transcriber/devices", {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
          }),
        ]);

        const modelsPayload = (await modelsResponse
          .json()
          .catch(() => null)) as ModelsResponse | null;
        const devicesPayload = (await devicesResponse
          .json()
          .catch(() => null)) as DevicesResponse | null;

        if (
          !ignore &&
          Array.isArray(modelsPayload?.whisper_models) &&
          modelsPayload.whisper_models.length > 0
        ) {
          setModels(modelsPayload.whisper_models);
        }

        if (
          !ignore &&
          Array.isArray(devicesPayload?.whisper_devices) &&
          devicesPayload.whisper_devices.length > 0
        ) {
          setDevices(devicesPayload.whisper_devices);
        }
      } catch {
        // Fallback lists are already available locally.
      }
    }

    void loadCapabilities();
    void refreshHistory();

    return () => {
      ignore = true;
      closeSocket();
    };
  }, [closeSocket, refreshHistory]);

  React.useEffect(() => {
    if (transcriptInputRef.current) {
      transcriptInputRef.current.scrollTop = transcriptInputRef.current.scrollHeight;
    }
  }, [transcriptText]);

  React.useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleSocketMessage = React.useCallback(
    (rawEvent: MessageEvent<string>) => {
      let payload: TranscriberSocketEvent | null = null;

      try {
        payload = JSON.parse(rawEvent.data) as TranscriberSocketEvent;
      } catch {
        appendLog("INFO", rawEvent.data);
        return;
      }

      if (!payload || payload.task_id !== currentTaskIdRef.current) {
        return;
      }

      if (payload.type === "transcribe_progress") {
        appendLog(
          payload.level ?? "INFO",
          payload.message ?? "Сообщение прогресса",
          payload.logger,
        );
        return;
      }

      if (payload.type === "transcribe_progress_chunk") {
        setStatus("transcribing");

        if (typeof payload.progress_percent === "number") {
          setProgressPercent(Math.max(0, Math.min(100, payload.progress_percent)));
        }

        if (
          typeof payload.segment_index === "number" &&
          typeof payload.segment_text === "string" &&
          payload.segment_text.trim().length > 0
        ) {
          segmentMapRef.current.set(payload.segment_index, payload.segment_text);
          setTranscriptText(buildTranscriptFromSegments(segmentMapRef.current));
        }

        if (typeof payload.progress_percent === "number") {
          appendLog(
            "INFO",
            `Прогресс ${payload.progress_percent}%${
              typeof payload.segment_index === "number"
                ? `, сегмент #${payload.segment_index}`
                : ""
            }`,
            "transcriber.progress",
          );
        }

        return;
      }

      setStatus("completed");
      setProgressPercent(100);
      appendLog(
        "INFO",
        `Транскрибация завершена${
          payload.original_filename ? `: ${payload.original_filename}` : ""
        }`,
        "transcriber.completed",
      );

      if (typeof payload.transcription_id === "number") {
        setSelectedTranscriptId(payload.transcription_id);
      }

      if (uploadFinishedRef.current) {
        window.setTimeout(() => closeSocket(), 1200);
      }
    },
    [appendLog, closeSocket],
  );

  const openSocket = React.useCallback(
    (taskId: string) => {
      closeSocket();

      const socket = new WebSocket(buildWsUrl(taskId));
      websocketRef.current = socket;

      socket.onopen = () => {
        appendLog("INFO", `WebSocket подключён для задачи ${taskId}`, "transcriber.ws");
      };

      socket.onmessage = (event) => {
        handleSocketMessage(event);
      };

      socket.onerror = () => {
        appendLog("WARN", "WebSocket сообщил об ошибке соединения.", "transcriber.ws");
      };

      socket.onclose = () => {
        websocketRef.current = null;

        if (!uploadFinishedRef.current && currentTaskIdRef.current === taskId) {
          appendLog(
            "WARN",
            "WebSocket закрыт до завершения транскрибации.",
            "transcriber.ws",
          );
        } else {
          appendLog("INFO", "WebSocket закрыт.", "transcriber.ws");
        }
      };

      return socket;
    },
    [appendLog, closeSocket, handleSocketMessage],
  );

  const resetForNewRun = React.useCallback((file: File, taskId: string) => {
    currentTaskIdRef.current = taskId;
    uploadFinishedRef.current = false;
    segmentMapRef.current = new Map();
    setSelectedTranscriptId(null);
    setTranscriptText("");
    setLogs([]);
    setUploadError(null);
    setProgressPercent(0);
    setStatus("connecting");
    setSelectedFileName(file.name);
    setSelectedFileSize(file.size);
  }, []);

  const runTranscription = React.useCallback(
    async (file: File) => {
      if (isSubmitting) {
        return;
      }

      const taskId = crypto.randomUUID();

      resetForNewRun(file, taskId);
      setIsSubmitting(true);

      appendLog("INFO", `Файл ${file.name} отправлен на обработку.`, "transcriber.client");

      try {
        const socket = openSocket(taskId);
        await waitForSocketReady(socket);

        const formData = new FormData();
        formData.append("file", file, file.name);
        formData.append("task_id", taskId);
        formData.append("whisper_model", selectedModel);
        formData.append("whisper_device", selectedDevice);

        const response = await fetch("/api/transcriber/transcribe", {
          method: "POST",
          credentials: "same-origin",
          body: formData,
        });

        const payload = (await response
          .json()
          .catch(() => null)) as TranscribeRouteResponse | { detail?: string } | null;

        if (!response.ok) {
          throw new Error(
            extractErrorMessage(payload, "Не удалось выполнить транскрибацию."),
          );
        }

        const result = payload as TranscribeRouteResponse;
        uploadFinishedRef.current = true;

        setTranscriptText(result.transcriptText ?? "");
        setProgressPercent(100);
        setStatus("completed");

        if (typeof result.transcriptionId === "number") {
          setSelectedTranscriptId(result.transcriptionId);
        }

        appendLog(
          "INFO",
          "Текст успешно получен от transcriber service.",
          "transcriber.client",
        );

        startTransition(() => {
          void refreshHistory();
        });

        window.setTimeout(() => closeSocket(), 1500);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Не удалось выполнить транскрибацию.";

        uploadFinishedRef.current = true;
        setUploadError(message);
        setStatus("error");
        appendLog("ERROR", message, "transcriber.client");
        closeSocket();
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      appendLog,
      closeSocket,
      isSubmitting,
      openSocket,
      refreshHistory,
      resetForNewRun,
      selectedDevice,
      selectedModel,
    ],
  );

  const handleFile = React.useCallback(
    async (file: File | null) => {
      if (!file) {
        return;
      }

      const isSupportedExtension = /\.(mp3|mp4)$/i.test(file.name);
      if (!isSupportedExtension) {
        const message = "Поддерживаются только файлы MP3 и MP4.";
        setUploadError(message);
        setStatus("error");
        appendLog("ERROR", message, "transcriber.client");
        return;
      }

      await runTranscription(file);
    },
    [appendLog, runTranscription],
  );

  const handleSelectHistoryItem = React.useCallback(
    (item: TranscriptRecord) => {
      if (isSubmitting) {
        return;
      }

      closeSocket();
      currentTaskIdRef.current = null;
      uploadFinishedRef.current = true;
      segmentMapRef.current = new Map();

      setSelectedTranscriptId(item.id);
      setSelectedFileName(item.original_filename);
      setSelectedFileSize(null);
      setUploadError(null);
      setStatus("viewing");
      setProgressPercent(100);
      setTranscriptText(item.transcript_text);
      setLogs([
        {
          id: `${item.id}-view`,
          level: "INFO",
          message: `Открыта сохранённая транскрибация от ${formatDateTime(item.created_at)}.`,
          logger: "history",
          at: new Date().toLocaleTimeString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
        },
      ]);
    },
    [closeSocket, isSubmitting],
  );

  const handleBrowseClick = React.useCallback(() => {
    if (!isSubmitting) {
      fileInputRef.current?.click();
    }
  }, [isSubmitting]);

  return (
    <Stack spacing={3}>
      <Paper
        variant="outlined"
        sx={{
          borderRadius: 4,
          p: { xs: 3, md: 4 },
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(25,118,210,0.08) 100%)",
        }}
      >
        <Stack spacing={2.5}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: { xs: "flex-start", md: "center" },
              flexDirection: { xs: "column", md: "row" },
              gap: 2,
            }}
          >
            <Box>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                <GraphicEqRoundedIcon color="primary" />
                <Typography variant="h4" component="h1" fontWeight={700}>
                  Transcriber
                </Typography>
              </Stack>
              <Typography variant="body1" color="text.secondary">
                Загружайте MP3 или MP4, наблюдайте потоковую транскрибацию через
                WebSocket и открывайте прошлые расшифровки из истории справа.
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip label={statusChip.label} color={statusChip.color} />
              {selectedFileName && (
                <Chip
                  icon={<DescriptionRoundedIcon />}
                  label={selectedFileName}
                  variant="outlined"
                />
              )}
            </Stack>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(2, minmax(0, 220px)) auto",
              },
              gap: 2,
              alignItems: "center",
            }}
          >
            <TextField
              select
              label="Whisper model"
              value={selectedModel}
              onChange={(event) => setSelectedModel(event.target.value)}
              disabled={isSubmitting}
              fullWidth
            >
              {models.map((model) => (
                <MenuItem key={model} value={model}>
                  {model}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Device"
              value={selectedDevice}
              onChange={(event) => setSelectedDevice(event.target.value)}
              disabled={isSubmitting}
              fullWidth
            >
              {devices.map((device) => (
                <MenuItem key={device} value={device}>
                  {device}
                </MenuItem>
              ))}
            </TextField>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: { xs: "flex-start", md: "flex-end" },
              }}
            >
              <Button
                variant="outlined"
                onClick={() => void refreshHistory()}
                disabled={historyLoading}
              >
                Обновить историю
              </Button>
            </Box>
          </Box>
        </Stack>
      </Paper>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            xl: "minmax(0, 1.6fr) minmax(320px, 0.8fr)",
          },
          gap: 3,
          alignItems: "start",
        }}
      >
        <Stack spacing={3}>
          <Paper variant="outlined" sx={{ borderRadius: 4, p: { xs: 2.5, md: 3 } }}>
            <Stack spacing={2.5}>
              <Box
                onDragOver={(event) => {
                  event.preventDefault();
                  if (!isSubmitting) {
                    setIsDragActive(true);
                  }
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setIsDragActive(false);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDragActive(false);

                  if (isSubmitting) {
                    return;
                  }

                  const file = event.dataTransfer.files?.[0] ?? null;
                  void handleFile(file);
                }}
                onClick={handleBrowseClick}
                sx={{
                  minHeight: 260,
                  borderRadius: 4,
                  border: "2px dashed",
                  borderColor: isDragActive ? "primary.main" : "divider",
                  backgroundColor: isDragActive
                    ? "rgba(25,118,210,0.08)"
                    : "rgba(15,23,42,0.02)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  px: 3,
                  cursor: isSubmitting ? "progress" : "pointer",
                  transition: "all 180ms ease",
                }}
              >
                <Stack spacing={2} alignItems="center" sx={{ maxWidth: 520 }}>
                  <CloudUploadRoundedIcon
                    color={isDragActive ? "primary" : "action"}
                    sx={{ fontSize: 48 }}
                  />
                  <Box>
                    <Typography variant="h5" fontWeight={700} gutterBottom>
                      Перетащите MP3 или MP4 сюда
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      Или нажмите, чтобы открыть системное окно выбора файла.
                    </Typography>
                  </Box>
                  <Stack
                    direction="row"
                    spacing={1}
                    flexWrap="wrap"
                    useFlexGap
                    justifyContent="center"
                  >
                    <Chip label="Drag and drop" variant="outlined" />
                    <Chip label="Потоковый текст" variant="outlined" />
                    <Chip label="WebSocket логи" variant="outlined" />
                  </Stack>
                  <Button
                    variant="contained"
                    startIcon={
                      isSubmitting ? (
                        <CircularProgress size={18} color="inherit" />
                      ) : (
                        <UploadFileRoundedIcon />
                      )
                    }
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Транскрибация..." : "Выбрать файл"}
                  </Button>
                </Stack>
              </Box>

              <input
                ref={fileInputRef}
                type="file"
                accept=".mp3,.mp4,audio/mpeg,video/mp4"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  event.currentTarget.value = "";
                  void handleFile(file);
                }}
              />

              {(selectedFileName || isSubmitting || progressPercent > 0) && (
                <Stack spacing={1.25}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 1,
                    }}
                  >
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {selectedFileName && (
                        <Chip
                          icon={<DescriptionRoundedIcon />}
                          label={
                            selectedFileSize
                              ? `${selectedFileName} • ${formatBytes(selectedFileSize)}`
                              : selectedFileName
                          }
                          variant="outlined"
                        />
                      )}
                      {currentTaskIdRef.current && (
                        <Chip label={`task_id: ${currentTaskIdRef.current}`} variant="outlined" />
                      )}
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {progressPercent}% завершено
                    </Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={progressPercent} />
                </Stack>
              )}

              {uploadError && <Alert severity="error">{uploadError}</Alert>}
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ borderRadius: 4, p: { xs: 2.5, md: 3 } }}>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <SubtitlesRoundedIcon color="primary" />
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    Текст транскрибации
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Во время обработки сюда подставляется распознанный текст.
                    При открытии записи из истории это поле показывает
                    сохранённую расшифровку.
                  </Typography>
                </Box>
              </Stack>

              <TextField
                value={transcriptText}
                multiline
                minRows={14}
                maxRows={22}
                fullWidth
                placeholder="Здесь появится текст после начала транскрибации или после выбора записи из истории."
                inputRef={transcriptInputRef}
                InputProps={{
                  readOnly: true,
                  sx: {
                    alignItems: "stretch",
                    fontFamily: "monospace",
                    fontSize: 14,
                  },
                }}
              />
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ borderRadius: 4, p: { xs: 2.5, md: 3 } }}>
            <Stack spacing={1.5}>
              <Typography variant="subtitle1" fontWeight={700}>
                Логи прогресса
              </Typography>
              <Box
                ref={logsContainerRef}
                sx={{
                  minHeight: 120,
                  maxHeight: 220,
                  overflowY: "auto",
                  borderRadius: 3,
                  bgcolor: "rgba(15,23,42,0.03)",
                  px: 2,
                  py: 1.5,
                  fontFamily: "monospace",
                  fontSize: 12,
                  lineHeight: 1.6,
                  color: "rgba(15,23,42,0.76)",
                }}
              >
                {logs.length === 0 ? (
                  <Typography variant="caption" color="text.secondary">
                    После старта транскрибации здесь появятся логовые события и
                    структурированный прогресс из WebSocket.
                  </Typography>
                ) : (
                  logs.map((entry) => (
                    <Box key={entry.id} sx={{ mb: 0.75 }}>
                      <Box component="span" sx={{ color: "text.secondary" }}>
                        [{entry.at}] {entry.level}
                      </Box>
                      {entry.logger ? ` ${entry.logger}` : ""}: {entry.message}
                    </Box>
                  ))
                )}
              </Box>
            </Stack>
          </Paper>
        </Stack>

        <TranscriberHistoryPanel
          items={transcriptions}
          selectedTranscriptId={selectedTranscriptId}
          loading={historyLoading}
          loadingError={historyError}
          isSubmitting={isSubmitting}
          onRefresh={() => void refreshHistory()}
          onSelect={handleSelectHistoryItem}
        />
      </Box>
    </Stack>
  );
}
