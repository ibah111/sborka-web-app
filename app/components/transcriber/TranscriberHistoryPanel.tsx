"use client";

import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { formatDateTime, type TranscriptRecord } from "./transcriber-types";

interface Props { items: TranscriptRecord[]; selectedTranscriptId: number | null; loading: boolean; loadingError: string | null; isSubmitting: boolean; onRefresh: () => void; onSelect: (item: TranscriptRecord) => void; }

export default function TranscriberHistoryPanel({ items, selectedTranscriptId, loading, loadingError, isSubmitting, onRefresh, onSelect }: Props) {
  return <Paper elevation={0} sx={{ width: "100%", maxWidth: 334, bgcolor: "#f6f6f7", border: "0.5px solid rgba(4,2,10,.04)", boxShadow: "0 2px 12px rgba(16,18,21,.08)", borderRadius: "32px", p: "12px 8px 8px", alignSelf: "start" }}>
    <Box sx={{ height: 36, position: "relative", display: "grid", placeItems: "center" }}>
      <Typography sx={{ fontSize: 20, lineHeight: "24px", fontWeight: 500 }}>История</Typography>
      <IconButton aria-label="Обновить историю" onClick={onRefresh} disabled={loading} size="small" sx={{ position: "absolute", right: 4 }}><RefreshRoundedIcon fontSize="small" /></IconButton>
    </Box>
    <Box sx={{ maxHeight: 502, overflowY: "auto", overscrollBehavior: "contain", display: "flex", flexDirection: "column", gap: "2px" }}>
      {loading ? <Box sx={{ py: 6, textAlign: "center" }}><CircularProgress size={24} /></Box> : loadingError ? <Typography sx={{ p: 2, color: "error.main", fontSize: 14 }}>{loadingError}</Typography> : items.length === 0 ? <Typography sx={{ p: 2, color: "rgba(16,18,21,.55)", fontSize: 14 }}>История пока пуста</Typography> : items.map((item) => {
        const selected = item.id === selectedTranscriptId;
        return <Box key={item.id} component="button" disabled={isSubmitting} onClick={() => onSelect(item)} sx={{ border: selected ? "2px solid #101215" : "0.5px solid rgba(0,0,0,.04)", font: "inherit", textAlign: "left", width: "100%", minHeight: 124, bgcolor: "#fff", borderRadius: "20px", p: "8px 12px", cursor: "pointer", display: "flex", flexDirection: "column", gap: "4px" }}>
          <Typography noWrap sx={{ fontSize: 16, lineHeight: "24px", fontWeight: 500 }}>{item.original_filename}</Typography>
          <Typography sx={{ fontSize: 12, lineHeight: "16px", color: "rgba(16,18,21,.55)" }}>{formatDateTime(item.created_at)}</Typography>
          <Typography sx={{ fontSize: 14, lineHeight: "20px", display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 3, overflow: "hidden" }}>{item.transcript_text || "Текст отсутствует."}</Typography>
        </Box>;
      })}
    </Box>
  </Paper>;
}
