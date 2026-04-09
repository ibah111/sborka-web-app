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
          bgcolor: "grey.100",
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
          bgcolor: "#eef3f8",
          backgroundImage:
            "radial-gradient(circle at top left, rgba(25,118,210,0.1), transparent 32%), radial-gradient(circle at bottom right, rgba(15,23,42,0.08), transparent 28%)",
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
            maxWidth: 1480,
            mx: "auto",
            px: { xs: 2, md: 3 },
            py: 3,
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
                  xs: "1fr",
                  lg: "280px minmax(0, 1fr)",
                },
                gap: 3,
                alignItems: "start",
              }}
            >
              <WorkspaceSidebar />
              <Box sx={{ minWidth: 0 }}>{children}</Box>
            </Box>
          </Stack>
        </Box>
      </Box>
    </WorkspaceSessionContext.Provider>
  );
}
