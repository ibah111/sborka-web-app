"use client";

import React from "react";
import CssBaseline from "@mui/material/CssBaseline";
import useMediaQuery from "@mui/material/useMediaQuery";
import { createTheme, ThemeProvider } from "@mui/material/styles";

type AppThemeMode = "light" | "dark";

interface AppThemeModeContextValue {
  mode: AppThemeMode;
  toggleMode: () => void;
}

const AppThemeModeContext = React.createContext<AppThemeModeContextValue | null>(
  null,
);

const THEME_MODE_STORAGE_KEY = "sborka-web-theme-mode";

export function useAppThemeMode() {
  const context = React.useContext(AppThemeModeContext);

  if (!context) {
    throw new Error("useAppThemeMode must be used within AppThemeProvider");
  }

  return context;
}

export default function AppThemeProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)", {
    noSsr: true,
  });
  const [storedMode, setStoredMode] = React.useState<AppThemeMode | null>(null);
  const mode = storedMode ?? (prefersDarkMode ? "dark" : "light");

  React.useEffect(() => {
    const savedMode = window.localStorage.getItem(THEME_MODE_STORAGE_KEY);

    if (savedMode === "dark" || savedMode === "light") {
      setStoredMode(savedMode);
    }
  }, []);

  const toggleMode = React.useCallback(() => {
    setStoredMode((currentMode) => {
      const nextMode = (currentMode ?? mode) === "dark" ? "light" : "dark";
      window.localStorage.setItem(THEME_MODE_STORAGE_KEY, nextMode);
      return nextMode;
    });
  }, [mode]);

  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: "#1976d2",
          },
          background:
            mode === "dark"
              ? {
                  default: "#0b1120",
                  paper: "#111827",
                }
              : {
                  default: "#eef3f8",
                  paper: "#ffffff",
                },
        },
        components: {
          MuiCssBaseline: {
            styleOverrides: {
              body: {
                minHeight: "100vh",
              },
            },
          },
        },
      }),
    [mode],
  );

  return (
    <AppThemeModeContext.Provider value={{ mode, toggleMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        {children}
      </ThemeProvider>
    </AppThemeModeContext.Provider>
  );
}
