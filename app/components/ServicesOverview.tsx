"use client";

import React from "react";
import { useRouter } from "next/navigation";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import GraphicEqRoundedIcon from "@mui/icons-material/GraphicEqRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { publishedWorkspaceServices } from "@/app/lib/workspace-services";
import { useWorkspaceSession } from "@/app/components/WorkspaceShell";

export default function ServicesOverview() {
  const router = useRouter();
  const { userLabel } = useWorkspaceSession();

  return (
    <Stack spacing={3}>
      <Paper
        variant="outlined"
        sx={{
          borderRadius: 4,
          p: { xs: 3, md: 4 },
          overflow: "hidden",
          position: "relative",
          background:
            "linear-gradient(135deg, rgba(25,118,210,0.12) 0%, rgba(255,255,255,0.98) 54%, rgba(15,23,42,0.05) 100%)",
        }}
      >
        <Stack spacing={2} sx={{ maxWidth: 720 }}>
          <Chip
            icon={<AutoAwesomeRoundedIcon />}
            label="Рабочее пространство"
            color="primary"
            variant="outlined"
            sx={{ width: "fit-content" }}
          />
          <Box>
            <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
              Сервисы для {userLabel}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Здесь собраны инструменты, доступные после авторизации. Сейчас в
              работу выведен `Transcriber`: он принимает MP3/MP4, показывает
              живой текст во время обработки и сохраняет историю всех
              транскрибаций пользователя.
            </Typography>
          </Box>
        </Stack>
      </Paper>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            xl: "minmax(0, 1.35fr) minmax(280px, 0.65fr)",
          },
          gap: 3,
        }}
      >
        <Stack spacing={3}>
          {publishedWorkspaceServices.map((service) => (
            <Paper
              key={service.id}
              variant="outlined"
              sx={{
                borderRadius: 4,
                p: { xs: 3, md: 4 },
              }}
            >
              <Stack spacing={2.5}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: { xs: "flex-start", md: "center" },
                    justifyContent: "space-between",
                    gap: 2,
                    flexDirection: { xs: "column", md: "row" },
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <GraphicEqRoundedIcon color="primary" />
                    <Box>
                      <Typography variant="h5" fontWeight={700}>
                        {service.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {service.tagline}
                      </Typography>
                    </Box>
                  </Stack>
                  <Chip label="Доступен" color="success" />
                </Box>

                <Typography variant="body1" color="text.secondary">
                  {service.description}
                </Typography>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip label="Drag and drop" variant="outlined" />
                  <Chip label="WebSocket progress" variant="outlined" />
                  <Chip label="История пользователя" variant="outlined" />
                </Stack>

                <Box>
                  <Button
                    variant="contained"
                    endIcon={<ArrowForwardRoundedIcon />}
                    onClick={() => router.push(service.href)}
                  >
                    Открыть инструмент
                  </Button>
                </Box>
              </Stack>
            </Paper>
          ))}
        </Stack>

        <Paper
          variant="outlined"
          sx={{
            borderRadius: 4,
            p: 3,
            alignSelf: "start",
          }}
        >
          <Stack spacing={2}>
            <Typography variant="h6" fontWeight={700}>
              Как это устроено
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Выбор инструмента доступен и с главной карточки, и через левую
              панель. При переходе на страницу `Transcriber` боковая навигация
              сохраняется, поэтому можно быстро возвращаться к каталогу.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              На экране инструмента будут доступны загрузка файла, потоковый
              текст транскрибации, служебные логи прогресса и список уже
              сохранённых расшифровок пользователя.
            </Typography>
          </Stack>
        </Paper>
      </Box>
    </Stack>
  );
}
