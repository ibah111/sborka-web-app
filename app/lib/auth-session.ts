import "server-only";

import type { AuthUser } from "@/app/lib/auth";
import {
  authServiceRequest,
  clearAuthCookies,
  extractAuthTokens,
  extractAuthUser,
  getCookieStore,
  hasServiceFailure,
  parseAuthServiceMessage,
  readAuthCookies,
  setAuthCookies,
} from "@/app/lib/auth-service";

interface ValidationResult {
  ok: boolean;
  status: number;
  user: AuthUser | null;
  message: string;
}

export interface AuthenticatedSessionResult {
  ok: boolean;
  status: number;
  user: AuthUser | null;
  accessToken: string | null;
  refreshed: boolean;
  reason?: string;
  message: string;
}

async function validateAccessToken(accessToken: string): Promise<ValidationResult> {
  try {
    const response = await authServiceRequest("/api/v1/token/validate", {
      method: "POST",
      accessToken,
    });

    if (!response.ok || hasServiceFailure(response.payload)) {
      return {
        ok: false,
        status: response.status,
        user: null,
        message: parseAuthServiceMessage(
          response.payload,
          "Access token не прошёл проверку.",
        ),
      };
    }

    return {
      ok: true,
      status: response.status,
      user: extractAuthUser(response.payload),
      message: parseAuthServiceMessage(response.payload, "Сессия активна."),
    };
  } catch {
    return {
      ok: false,
      status: 502,
      user: null,
      message: "Не удалось связаться с auth service.",
    };
  }
}

export async function resolveAuthenticatedSession(): Promise<AuthenticatedSessionResult> {
  const cookieStore = await getCookieStore();
  const { accessToken, refreshToken } = readAuthCookies(cookieStore);

  if (!accessToken && !refreshToken) {
    return {
      ok: false,
      status: 401,
      user: null,
      accessToken: null,
      refreshed: false,
      reason: "NO_TOKENS",
      message: "Токены не найдены.",
    };
  }

  if (accessToken) {
    const validation = await validateAccessToken(accessToken);

    if (validation.ok) {
      return {
        ok: true,
        status: 200,
        user: validation.user,
        accessToken,
        refreshed: false,
        message: validation.message,
      };
    }

    if (validation.status !== 401 || !refreshToken) {
      clearAuthCookies(cookieStore);
      return {
        ok: false,
        status: validation.status >= 400 ? validation.status : 401,
        user: null,
        accessToken: null,
        refreshed: false,
        reason: "ACCESS_TOKEN_INVALID",
        message: validation.message,
      };
    }
  }

  if (!refreshToken) {
    clearAuthCookies(cookieStore);
    return {
      ok: false,
      status: 401,
      user: null,
      accessToken: null,
      refreshed: false,
      reason: "REFRESH_TOKEN_MISSING",
      message: "Refresh token отсутствует.",
    };
  }

  try {
    const refreshResponse = await authServiceRequest("/api/v1/token/refresh", {
      method: "POST",
      body: {
        refresh_token: refreshToken,
      },
      accessToken,
    });

    if (!refreshResponse.ok || hasServiceFailure(refreshResponse.payload)) {
      clearAuthCookies(cookieStore);
      return {
        ok: false,
        status: refreshResponse.status >= 400 ? refreshResponse.status : 401,
        user: null,
        accessToken: null,
        refreshed: false,
        reason: "REFRESH_FAILED",
        message: parseAuthServiceMessage(
          refreshResponse.payload,
          "Не удалось обновить токены.",
        ),
      };
    }

    const tokens = extractAuthTokens(refreshResponse.payload);
    if (!tokens) {
      clearAuthCookies(cookieStore);
      return {
        ok: false,
        status: 502,
        user: null,
        accessToken: null,
        refreshed: false,
        reason: "REFRESH_INVALID_RESPONSE",
        message: "Auth service не вернул обновлённые токены.",
      };
    }

    setAuthCookies(cookieStore, tokens);

    const refreshedUser = extractAuthUser(refreshResponse.payload);
    if (refreshedUser) {
      return {
        ok: true,
        status: 200,
        user: refreshedUser,
        accessToken: tokens.access_token,
        refreshed: true,
        message: parseAuthServiceMessage(
          refreshResponse.payload,
          "Сессия обновлена.",
        ),
      };
    }

    const refreshedValidation = await validateAccessToken(tokens.access_token);
    if (refreshedValidation.ok) {
      return {
        ok: true,
        status: 200,
        user: refreshedValidation.user,
        accessToken: tokens.access_token,
        refreshed: true,
        message: refreshedValidation.message,
      };
    }

    return {
      ok: true,
      status: 200,
      user: null,
      accessToken: tokens.access_token,
      refreshed: true,
      message: "Сессия обновлена.",
    };
  } catch {
    clearAuthCookies(cookieStore);
    return {
      ok: false,
      status: 502,
      user: null,
      accessToken: null,
      refreshed: false,
      reason: "REFRESH_FAILED",
      message: "Не удалось связаться с auth service.",
    };
  }
}
