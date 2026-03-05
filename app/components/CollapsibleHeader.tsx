"use client";

import React, { useCallback, useState } from "react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Collapse from "@mui/material/Collapse";
import Box from "@mui/material/Box";
import HealthStatus from "./HealthStatus";

const APP_NAME = "Sborka Web";

function formatLastCheck(at: Date): string {
  return at.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function CollapsibleHeader() {
  const [open, setOpen] = useState(false);
  const [lastCheckAt, setLastCheckAt] = useState<Date | null>(null);

  const handleMouseEnter = useCallback(() => setOpen(true), []);
  const handleMouseLeave = useCallback(() => setOpen(false), []);

  return (
    <AppBar
      position="static"
      color="default"
      elevation={1}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      sx={{ cursor: "default" }}
    >
      <Toolbar sx={{ flexWrap: "wrap" }}>
        <Typography variant="h6" component="span" sx={{ flexGrow: 1 }}>
          {APP_NAME}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <HealthStatus onLastCheck={setLastCheckAt} />
        </Box>
      </Toolbar>
      <Collapse in={open}>
        <Box
          sx={{
            px: 2,
            pb: 2,
            pt: 0,
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Healthcheck: каждые 15 сек
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Последняя проверка:{" "}
            {lastCheckAt ? formatLastCheck(lastCheckAt) : "—"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Env: {process.env.NODE_ENV ?? "—"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Build: —
          </Typography>
        </Box>
      </Collapse>
    </AppBar>
  );
}
