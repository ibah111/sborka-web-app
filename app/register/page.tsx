"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Alert from "@mui/material/Alert";
import Checkbox from "@mui/material/Checkbox";
import InputAdornment from "@mui/material/InputAdornment";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { axiosInstance } from "../api/base-request";

interface RegisterResponse {
  success: boolean;
  message: string;
}

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const response = await axiosInstance.post<RegisterResponse>("/api/v1/register", {
        email,
        password,
      });

      if (!response.data.success) {
        throw new Error(response.data.message || "Registration failed");
      }

      setSuccessMessage("Регистрация прошла успешно. Теперь вы можете войти.");

      // Небольшая пауза и редирект на страницу логина
      setTimeout(() => {
        router.replace("/login");
      }, 1200);
    } catch (err: unknown) {
      const message =
        (err as any)?.response?.data?.message?.message ||
        (err as Error).message ||
        "Ошибка регистрации";
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
              Регистрация
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Введите email и пароль для создания аккаунта.
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" variant="outlined">
              {error}
            </Alert>
          )}

          {successMessage && (
            <Alert severity="success" variant="outlined">
              {successMessage}
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
                autoComplete="new-password"
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
                  {loading ? "Регистрация..." : "Отправить"}
                </Button>
                <Button
                  type="button"
                  variant="outlined"
                  color="primary"
                  size="large"
                  disabled={loading}
                  fullWidth
                  onClick={() => router.push("/login")}
                >
                  Войти
                </Button>
              </Stack>
            </Stack>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}

