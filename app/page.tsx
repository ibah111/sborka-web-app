"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import CollapsibleHeader from "./components/CollapsibleHeader";
import BrowserInfoPanel from "./components/BrowserInfoPanel";

export default function Home() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      try {
        const res = await fetch("/api/auth/session", {
          method: "GET",
          credentials: "same-origin",
        });

        if (!res.ok) {
          router.replace("/login");
          return;
        }

        if (isMounted) {
          setCheckingAuth(false);
        }
      } catch {
        router.replace("/login");
      }
    }

    checkSession();

    return () => {
      isMounted = false;
    };
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
      <CollapsibleHeader />
      <Box
        component="main"
        sx={{
          maxWidth: 1200,
          mx: "auto",
          p: 3,
        }}
      >
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
                Привет, Артём
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Краткое описание приложения. Dashboard-lite.
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
