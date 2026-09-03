"use client";

import React from "react";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { extractErrorMessage, type TranscribeRouteResponse, type TranscriberProgressEvent } from "./transcriber/transcriber-types";

function responseFilename(header: string | null) {
  const encoded = header?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const plain = header?.match(/filename="?([^";]+)"?/i)?.[1];
  try { return decodeURIComponent(encoded ?? plain ?? "video.mp4"); } catch { return plain ?? "video.mp4"; }
}

export default function VideoDownloaderTool() {
  const [url, setUrl] = React.useState("");
  const [transcribe, setTranscribe] = React.useState(false);
  const [diarization, setDiarization] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [result, setResult] = React.useState("");
  const [error, setError] = React.useState("");

  const submit = async () => {
    if (!url.trim() || loading) return;
    setLoading(true); setError(""); setResult(""); setProgress(0);
    const taskId = crypto.randomUUID();
    const body = new FormData();
    body.append("url", url.trim());
    body.append("transcribe", String(transcribe));
    body.append("enable_diarization", String(diarization));
    body.append("task_id", taskId);
    try {
      const response = await fetch("/api/transcriber/ytdl", { method: "POST", body });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(extractErrorMessage(payload, "Не удалось скачать видео."));
      }
      if (!transcribe) {
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = objectUrl;
        anchor.download = responseFilename(response.headers.get("content-disposition"));
        anchor.click(); URL.revokeObjectURL(objectUrl); setProgress(100); setLoading(false); return;
      }
      const session = await response.json() as TranscribeRouteResponse;
      const source = new EventSource(`/api/transcriber/events/${encodeURIComponent(session.id)}`);
      source.onmessage = (event) => {
        const payload = JSON.parse(event.data) as TranscriberProgressEvent;
        if (payload.type === "transcribe_progress_chunk") setProgress(payload.progress_percent ?? 0);
        if (payload.type === "transcribe_failed") { setError(payload.detail ?? "Ошибка транскрибации."); setLoading(false); source.close(); }
        if (payload.type === "transcribe_completed") { setResult(payload.transcript_text ?? ""); setProgress(100); setLoading(false); source.close(); }
      };
      source.onerror = () => undefined;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Неизвестная ошибка."); setLoading(false);
    }
  };

  return <Box sx={{ maxWidth: 680, mx: "auto" }}>
    <Typography sx={{ color: "rgba(16,18,21,.48)", fontSize: 13, mb: 3 }}>Сервисы&nbsp;&nbsp;/&nbsp;&nbsp;<Box component="span" sx={{ color: "#101215" }}>Загрузчик видео</Box></Typography>
    <Stack spacing={3}>
      <Box textAlign="center"><Typography component="h1" sx={{ fontSize: { xs: 34, md: 48 }, fontWeight: 500, letterSpacing: "-.04em" }}>Загрузчик видео</Typography><Typography sx={{ mt: 1, color: "rgba(16,18,21,.56)" }}>YouTube, Instagram и TikTok — скачайте видео или сразу получите текст</Typography></Box>
      <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: "32px", bgcolor: "#f6f6f7" }}>
        <Stack spacing={2.5}>
          <TextField fullWidth label="Ссылка на видео" placeholder="https://..." value={url} onChange={(event) => setUrl(event.target.value)} disabled={loading} />
          <Paper elevation={0} onClick={() => !loading && setTranscribe((value) => !value)} sx={{ p: 2, borderRadius: "20px", bgcolor: transcribe ? "#e4e4e7" : "#fff", cursor: "pointer" }}><Stack direction="row" justifyContent="space-between" alignItems="center"><Box><Typography fontWeight={500}>Транскрибировать после скачивания</Typography><Typography fontSize={12} color="rgba(16,18,21,.5)">Видео сразу попадёт в очередь Whisper</Typography></Box><Switch checked={transcribe} readOnly /></Stack></Paper>
          {transcribe && <Paper elevation={0} onClick={() => !loading && setDiarization((value) => !value)} sx={{ p: 2, borderRadius: "20px", bgcolor: diarization ? "#e4e4e7" : "#fff", cursor: "pointer" }}><Stack direction="row" justifyContent="space-between" alignItems="center"><Box><Typography fontWeight={500}>Разделить спикеров</Typography><Typography fontSize={12} color="rgba(16,18,21,.5)">Диаризация голосов в итоговом тексте</Typography></Box><Switch checked={diarization} readOnly /></Stack></Paper>}
          {loading && <LinearProgress variant={transcribe && progress ? "determinate" : "indeterminate"} value={progress} sx={{ bgcolor: "#ddd", "& .MuiLinearProgress-bar": { bgcolor: "#101215" } }} />}
          {error && <Typography color="error.main">{error}</Typography>}
          <Button startIcon={<DownloadRoundedIcon />} onClick={() => void submit()} disabled={loading || !url.trim()} sx={{ height: 52, borderRadius: "18px", bgcolor: "#101215", color: "#fff", textTransform: "none", "&:hover": { bgcolor: "#27292d" } }}>{loading ? "Обработка…" : transcribe ? "Скачать и транскрибировать" : "Скачать видео"}</Button>
        </Stack>
      </Paper>
      {result && <Paper elevation={0} sx={{ p: 3, borderRadius: "28px", bgcolor: "#f6f6f7", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{result}</Paper>}
    </Stack>
  </Box>;
}
