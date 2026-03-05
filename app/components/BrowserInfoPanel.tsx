"use client";

import React, { useEffect, useRef, useState } from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import {
  collectBrowserInfo,
  type BrowserInfo,
} from "../lib/browserInfo";

export default function BrowserInfoPanel() {
  const [info, setInfo] = useState<BrowserInfo | null>(null);
  const hasLogged = useRef(false);

  useEffect(() => {
    function update() {
      const data = collectBrowserInfo();
      if (!data) return;
      if (!hasLogged.current) {
        hasLogged.current = true;
        console.log("[BrowserInfo]", data);
      }
      setInfo(data);
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  if (!info) return null;

  return (
    <Card variant="outlined" sx={{ borderRadius: 2, boxShadow: 1 }}>
      <CardContent>
        <Typography variant="h6" component="h2" gutterBottom color="text.primary">
          Browser Info
        </Typography>
        <Box
          component="pre"
          sx={{
            maxHeight: "60vh",
            overflow: "auto",
            p: 2,
            borderRadius: 1,
            bgcolor: "grey.100",
            fontFamily: "monospace",
            fontSize: "0.875rem",
            color: "text.secondary",
          }}
        >
          {JSON.stringify(info, null, 2)}
        </Box>
      </CardContent>
    </Card>
  );
}
