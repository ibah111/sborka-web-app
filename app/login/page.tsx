"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Stack from "@mui/material/Stack";
import Alert from "@mui/material/Alert";
import InputAdornment from "@mui/material/InputAdornment";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { axiosInstance } from "../api/base-request";
import { storage } from "../lib/storage";

interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    access_token: string;
    refresh_token: string;
  };
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await axiosInstance.post<LoginResponse>("/api/v1/login", {
        email,
        password,
      });

      if (!response.data.success) {
        throw new Error(response.data.message || "Login failed");
      }

      const { access_token, refresh_token } = response.data.data;

      // Сохраняем токены в httpOnly cookie через внутренний API
      await storage.httpOnlyCookie.set("access_token", access_token, {
        maxAge: 15 * 60,
        sameSite: "lax",
      });

      await storage.httpOnlyCookie.set("refresh_token", refresh_token, {
        maxAge: 30 * 24 * 60 * 60,
        sameSite: "lax",
      });

      router.replace("/");
    } catch (err: unknown) {
      const message =
        (err as any)?.response?.data?.message?.message ||
        (err as Error).message ||
        "Ошибка входа";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "grey.100",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          width: "100%",
          maxWidth: 420,
          p: 4,
          borderRadius: 3,
        }}
      >
        <Stack spacing={3}>
          <Box>
            <Typography variant="h5" component="h1" fontWeight={600} gutterBottom>
              Вход в систему
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Введите email и пароль, чтобы продолжить.
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" variant="outlined">
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                required
                autoComplete="email"
              />

              <TextField
                label="Пароль"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
                required
                autoComplete="current-password"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Checkbox
                        checked={showPassword}
                        onChange={(e) => setShowPassword(e.target.checked)}
                        icon={<VisibilityOff fontSize="small" />}
                        checkedIcon={<Visibility fontSize="small" />}
                        inputProps={{ "aria-label": "Показать пароль" }}
                      />
                    </InputAdornment>
                  ),
                }}
              />

              <Stack direction="row" spacing={1.5}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  size="large"
                  disabled={loading}
                  fullWidth
                >
                  {loading ? "Вход..." : "Войти"}
                </Button>
                <Button
                  type="button"
                  variant="outlined"
                  color="primary"
                  size="large"
                  disabled={loading}
                  fullWidth
                  onClick={() => router.push("/register")}
                >
                  Регистрация
                </Button>
              </Stack>
            </Stack>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}

