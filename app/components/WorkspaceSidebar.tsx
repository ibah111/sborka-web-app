"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import GraphicEqRoundedIcon from "@mui/icons-material/GraphicEqRounded";
import type { SvgIconComponent } from "@mui/icons-material";
import {
  workspaceServices,
  type WorkspaceServiceId,
} from "@/app/lib/workspace-services";

const iconByService: Record<WorkspaceServiceId, SvgIconComponent> = {
  overview: DashboardRoundedIcon,
  transcriber: GraphicEqRoundedIcon,
};

function isActivePath(currentPathname: string, href: string): boolean {
  if (href === "/") {
    return currentPathname === "/";
  }

  return currentPathname === href || currentPathname.startsWith(`${href}/`);
}

export default function WorkspaceSidebar() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 4,
        p: 2,
        position: "sticky",
        top: 24,
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(248,250,252,0.98) 100%)",
      }}
    >
      <Stack spacing={2}>
        <Box>
          <Typography variant="overline" color="text.secondary">
            Навигация
          </Typography>
          <Typography variant="h6" fontWeight={700}>
            Сервисы
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Панель остаётся на месте при переходе между инструментами.
          </Typography>
        </Box>

        <List disablePadding sx={{ display: "grid", gap: 1 }}>
          {workspaceServices.map((item) => {
            const Icon = iconByService[item.id];
            const active = isActivePath(pathname, item.href);

            return (
              <ListItemButton
                key={item.id}
                selected={active}
                onClick={() => router.push(item.href)}
                sx={{
                  borderRadius: 3,
                  alignItems: "flex-start",
                  border: "1px solid",
                  borderColor: active ? "primary.main" : "divider",
                  backgroundColor: active ? "rgba(25, 118, 210, 0.08)" : "transparent",
                  py: 1.5,
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, pt: 0.25 }}>
                  <Icon color={active ? "primary" : "action"} />
                </ListItemIcon>
                <ListItemText
                  primary={item.title}
                  secondary={item.tagline}
                  primaryTypographyProps={{ fontWeight: 600 }}
                  secondaryTypographyProps={{
                    sx: {
                      display: "block",
                      mt: 0.5,
                      lineHeight: 1.35,
                    },
                  }}
                />
              </ListItemButton>
            );
          })}
        </List>

        <Box
          sx={{
            borderRadius: 3,
            bgcolor: "rgba(15, 23, 42, 0.04)",
            p: 1.5,
          }}
        >
          <Typography variant="body2" fontWeight={600} gutterBottom>
            Сейчас доступно
          </Typography>
          <Chip label="Transcriber" color="primary" size="small" sx={{ mr: 1, mb: 1 }} />
          <Chip label="История транскрипций" variant="outlined" size="small" sx={{ mb: 1 }} />
        </Box>
      </Stack>
    </Paper>
  );
}
