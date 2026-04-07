"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import CollapsibleHeader from "./components/CollapsibleHeader";
import BrowserInfoPanel from "./components/BrowserInfoPanel";
import type { AuthUser, SessionResponse } from "./lib/auth";

function getUserLabel(user: AuthUser | null): string {
  if (!user) {
    return "пользователь";
  }

  if (typeof user.fio === "string" && user.fio.trim().length > 0) {
    return user.fio;
  }

  if (typeof user.email === "string" && user.email.trim().length > 0) {
    return user.email;
  }

  if (typeof user.user_id === "number" || typeof user.user_id === "string") {
    return `user #${user.user_id}`;
  }

  return "пользователь";
}

export default function Home() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = React.useState(true);
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [loggingOut, setLoggingOut] = React.useState(false);
  const [sessionError, setSessionError] = React.useState<string | null>(null);

  const checkSession = React.useCallback(async () => {
    setCheckingAuth(true);
    setSessionError(null);

    try {
      const res = await fetch("/api/auth/session", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });
      const payload = (await res.json().catch(() => null)) as SessionResponse | null;

      if (res.status === 401 || !payload?.authenticated) {
        router.replace("/login");
        return;
      }

      if (!res.ok) {
        setSessionError(payload?.error || "Не удалось проверить сессию.");
        return;
      }

      setUser(payload.user ?? null);
    } catch {
      setSessionError("Не удалось проверить сессию.");
    } finally {
      setCheckingAuth(false);
    }
  }, [router]);

  React.useEffect(() => {
    void checkSession();
  }, [checkSession]);

  const handleLogout = React.useCallback(async () => {
    setLoggingOut(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } finally {
      router.replace("/login");
      router.refresh();
      setLoggingOut(false);
    }
  }, [router]);

  if (checkingAuth) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "grey.100",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "grey.100",
      }}
    >
      <CollapsibleHeader
        userLabel={getUserLabel(user)}
        onLogout={handleLogout}
        loggingOut={loggingOut}
      />
      <Box
        component="main"
        sx={{
          maxWidth: 1200,
          mx: "auto",
          p: 3,
        }}
      >
        {sessionError && (
          <Alert
            severity="error"
            sx={{ mb: 3 }}
            action={
              <Button color="inherit" size="small" onClick={() => void checkSession()}>
                Повторить
              </Button>
            }
          >
            {sessionError}
          </Alert>
        )}

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper
              variant="outlined"
              sx={{
                borderRadius: 2,
                boxShadow: 1,
                p: 4,
                minHeight: 200,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
              }}
            >
              <Typography variant="h5" component="h1" gutterBottom fontWeight={600}>
                Привет, {getUserLabel(user)}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {user?.email
                  ? `Вы авторизованы через auth service как ${user.email}.`
                  : "Сессия активна. Авторизация подключена через внешний auth service."}
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <BrowserInfoPanel />
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}
