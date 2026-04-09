"use client";

import React from "react";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  formatDateTime,
  type TranscriptRecord,
} from "@/app/components/transcriber/transcriber-types";

interface TranscriberHistoryPanelProps {
  items: TranscriptRecord[];
  selectedTranscriptId: number | null;
  loading: boolean;
  loadingError: string | null;
  isSubmitting: boolean;
  onRefresh: () => void;
  onSelect: (item: TranscriptRecord) => void;
}

export default function TranscriberHistoryPanel({
  items,
  selectedTranscriptId,
  loading,
  loadingError,
  isSubmitting,
  onRefresh,
  onSelect,
}: TranscriberHistoryPanelProps) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 4, p: { xs: 2.5, md: 3 } }}>
      <Stack spacing={2}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <HistoryRoundedIcon color="primary" />
            <Box>
              <Typography variant="h6" fontWeight={700}>
                История транскрибаций
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Последние сохранённые записи текущего пользователя.
              </Typography>
            </Box>
          </Stack>
          <Button
            size="small"
            variant="text"
            startIcon={<RefreshRoundedIcon />}
            onClick={onRefresh}
            disabled={loading}
          >
            Обновить
          </Button>
        </Box>

        <Divider />

        {loadingError && <Alert severity="error">{loadingError}</Alert>}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : items.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            В истории пока нет сохранённых транскрибаций.
          </Typography>
        ) : (
          <Stack spacing={1.25}>
            {items.map((item) => {
              const selected = item.id === selectedTranscriptId;

              return (
                <Paper
                  key={item.id}
                  variant="outlined"
                  onClick={() => onSelect(item)}
                  sx={{
                    borderRadius: 3,
                    p: 2,
                    cursor: isSubmitting ? "default" : "pointer",
                    borderColor: selected ? "primary.main" : "divider",
                    bgcolor: selected ? "rgba(25,118,210,0.08)" : "transparent",
                    transition: "border-color 160ms ease, background-color 160ms ease",
                    opacity: isSubmitting ? 0.7 : 1,
                  }}
                >
                  <Stack spacing={1}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 1,
                      }}
                    >
                      <Typography variant="subtitle2" fontWeight={700}>
                        {item.original_filename}
                      </Typography>
                      {selected && (
                        <TaskAltRoundedIcon color="primary" fontSize="small" />
                      )}
                    </Box>

                    <Typography variant="caption" color="text.secondary">
                      {formatDateTime(item.created_at)} • {item.whisper_model} •{" "}
                      {item.whisper_device}
                    </Typography>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        display: "-webkit-box",
                        WebkitBoxOrient: "vertical",
                        WebkitLineClamp: 3,
                        overflow: "hidden",
                      }}
                    >
                      {item.transcript_text || "Текст отсутствует."}
                    </Typography>
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
