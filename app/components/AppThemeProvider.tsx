"use client";

import { createTheme, ThemeProvider } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: { main: "#101215", contrastText: "#ffffff" },
    secondary: { main: "#52545a", contrastText: "#ffffff" },
    info: { main: "#6b6d72", contrastText: "#ffffff" },
    success: { main: "#52545a", contrastText: "#ffffff" },
    warning: { main: "#6b6d72", contrastText: "#ffffff" },
    error: { main: "#3f4146", contrastText: "#ffffff" },
  },
  typography: { fontFamily: '"Inter Tight", Arial, sans-serif' },
  shape: { borderRadius: 12 },
});

export default function AppThemeProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
