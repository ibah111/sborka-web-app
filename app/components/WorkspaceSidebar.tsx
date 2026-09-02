"use client";

import { usePathname, useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Typography from "@mui/material/Typography";

const items = [
  { href: "/", label: "Главная", icon: "/transcriber-ui/icons/main_black_icon.svg" },
  { href: "/transcriber", label: "Транскрибатор", icon: "/transcriber-ui/icons/soundwave_black_icon.svg" },
];

export default function WorkspaceSidebar() {
  const pathname = usePathname(); const router = useRouter();
  return <Box component="nav" sx={{ display: "flex", flexDirection: { xs: "row", lg: "column" }, gap: 0.5, mb: { xs: 2, lg: 0 }, position: { lg: "sticky" }, zIndex: 10, top: { lg: 96 }, width: { lg: 190 } }}>
    {items.map((item) => { const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href); return <ButtonBase key={item.href} onClick={() => router.push(item.href)} sx={{ height: 48, px: 1.5, borderRadius: 2, justifyContent: "flex-start", gap: 1.5, bgcolor: active ? "#f6f6f7" : "transparent" }}><Box component="img" src={item.icon} alt="" sx={{ width: 24, height: 24 }} /><Typography sx={{ fontSize: 16, fontWeight: 500 }}>{item.label}</Typography></ButtonBase>; })}
  </Box>;
}
