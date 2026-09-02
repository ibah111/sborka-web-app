"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";

interface CollapsibleHeaderProps { userLabel?: string; onLogout?: () => void | Promise<void>; loggingOut?: boolean; }

export default function CollapsibleHeader({ onLogout, loggingOut = false }: CollapsibleHeaderProps) {
  return <Box component="header" sx={{ position: "fixed", inset: "0 0 auto 0", zIndex: 1200, height: 84, px: { xs: 2, md: 3 }, display: "flex", alignItems: "center", justifyContent: "space-between", bgcolor: "rgba(255,255,255,.96)", backdropFilter: "blur(12px)" }}>
    <Box component="img" src="/transcriber-ui/images/sborka_logo.svg" alt="Sborka Web" sx={{ width: 160, height: 28 }} />
    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
      <Box sx={{ width: 40, height: 40, border: "2px solid #101215", borderRadius: "50%", display: "grid", placeItems: "center" }}><Box component="img" src="/transcriber-ui/icons/user_black_icon.svg" alt="" sx={{ width: 24, height: 24 }} /></Box>
      {onLogout && <Button onClick={() => void onLogout()} disabled={loggingOut} sx={{ color: "#101215", textTransform: "none", fontSize: 16, px: 0 }}>{loggingOut ? "Выход..." : "Выйти"}</Button>}
    </Box>
  </Box>;
}
