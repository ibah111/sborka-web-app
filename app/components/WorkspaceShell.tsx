"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import type { AuthUser, SessionResponse } from "@/app/lib/auth";
import CollapsibleHeader from "@/app/components/CollapsibleHeader";
import WorkspaceSidebar from "@/app/components/WorkspaceSidebar";

interface WorkspaceSessionContextValue {
  user: AuthUser | null;
  userLabel: string;
  refreshSession: () => Promise<void>;
}

const WorkspaceSessionContext =
  React.createContext<WorkspaceSessionContextValue | null>(null);

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

export function useWorkspaceSession() {
  const context = React.useContext(WorkspaceSessionContext);

  if (!context) {
    throw new Error("useWorkspaceSession must be used within WorkspaceShell");
  }

  return context;
}

export default function WorkspaceShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = React.useState(true);
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [loggingOut, setLoggingOut] = React.useState(false);
  const [sessionError, setSessionError] = React.useState<string | null>(null);

  const checkSession = React.useCallback(async () => {
    setCheckingAuth(true);
    setSessionError(null);

    try {
      const response = await fetch("/api/auth/session", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });

      const payload = (await response
        .json()
        .catch(() => null)) as SessionResponse | null;

      if (response.status === 401 || !payload?.authenticated) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
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
          bgcolor: "#fff",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <WorkspaceSessionContext.Provider
      value={{
        user,
        userLabel: getUserLabel(user),
        refreshSession: checkSession,
      }}
    >
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: "#fff",
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
            width: "100%",
            px: { xs: 2, md: 3 },
            pt: "100px",
            pb: 4,
          }}
        >
          <Stack spacing={3}>
            {sessionError && (
              <Alert
                severity="error"
                action={
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() => void checkSession()}
                  >
                    Повторить
                  </Button>
                }
              >
                {sessionError}
              </Alert>
            )}

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "minmax(0, 1fr)",
                  lg: "220px minmax(0, 1fr)",
                  xl: "334px minmax(0, 1fr) 334px",
                },
                columnGap: { lg: 3 },
                alignItems: "start",
              }}
            >
              <WorkspaceSidebar />
              <Box sx={{ minWidth: 0, width: "100%", gridColumn: { xs: 1, lg: 2 } }}>{children}</Box>
            </Box>
          </Stack>
        </Box>
      </Box>
    </WorkspaceSessionContext.Provider>
  );
}
