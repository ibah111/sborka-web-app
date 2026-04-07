"use client";

import React from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import { server } from "../config";

type Status = "checking" | "ok" | "fail";

const HEALTHCHECK_URL = "/api/healthcheck";
const INTERVAL_MS = 15_000;
const TIMEOUT_MS = 5_000;

export interface HealthStatusProps {
  onLastCheck?: (at: Date) => void;
}

export default function HealthStatus({ onLastCheck }: HealthStatusProps) {
  const [status, setStatus] = React.useState<Status>("checking");
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    async function run() {
      if (abortRef.current) abortRef.current.abort();
      const aborter = new AbortController();
      abortRef.current = aborter;
      const timeoutId = setTimeout(() => aborter.abort(), TIMEOUT_MS);

      try {
        const res = await fetch(HEALTHCHECK_URL, { signal: aborter.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          setStatus("ok");
        } else {
          setStatus("fail");
          console.warn("[Healthcheck] failed", res.status);
        }
        onLastCheck?.(new Date());
      } catch (err) {
        clearTimeout(timeoutId);
        setStatus("fail");
        console.warn("[Healthcheck] failed", err);
        onLastCheck?.(new Date());
      } finally {
        if (abortRef.current === aborter) abortRef.current = null;
      }
    }

    run();
    intervalRef.current = setInterval(() => {
      setStatus("checking");
      run();
    }, INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [onLastCheck]);

  if (status === "checking") {
    return (
      <Chip
        icon={<CircularProgress size={14} color="inherit" />}
        label={`${server} проверяем...`}
        size="small"
        variant="outlined"
        sx={{
          "& .MuiChip-icon": {
            marginLeft: 0.5,
            marginRight: -0.5,
          },
        }}
      />
    );
  }

  if (status === "ok") {
    return (
      <Chip
        icon={
          <Box component="span" sx={{ fontSize: 14, lineHeight: 1 }} role="img" aria-hidden>
            ✓
          </Box>
        }
        label={`${server} отвечает`}
        size="small"
        color="success"
        variant="filled"
        sx={{
          "& .MuiChip-icon": {
            marginLeft: 0.5,
            marginRight: -0.5,
          },
        }}
      />
    );
  }

  return (
    <Chip
      icon={
        <Box component="span" sx={{ fontSize: 14, lineHeight: 1 }} role="img" aria-hidden>
          ⚠
        </Box>
      }
      label={`${server} не отвечает`}
      size="small"
      color="warning"
      variant="filled"
      sx={{
        "& .MuiChip-icon": {
          marginLeft: 0.5,
          marginRight: -0.5,
        },
      }}
    />
  );
}
