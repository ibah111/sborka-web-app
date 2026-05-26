import { Metadata } from "next";
import React from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v13-appRouter";
import AppThemeProvider from "@/app/components/AppThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sborka Web",
  description: "Sborka Web home page",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>
        <AppRouterCacheProvider>
          <AppThemeProvider>{children}</AppThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
