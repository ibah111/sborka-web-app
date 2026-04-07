import { NextResponse } from "next/server";
import type { AuthUser, SessionResponse } from "@/app/lib/auth";
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

function authenticatedResponse(user: AuthUser | null, refreshed = false) {
  return NextResponse.json<SessionResponse>({
    authenticated: true,
    user,
    refreshed,
  });
}

function unauthorizedResponse(
  reason: string,
  error: string,
  status = 401,
) {
  return NextResponse.json<SessionResponse>(
    {
      authenticated: false,
      user: null,
      reason,
      error,
    },
    { status },
  );
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

export async function GET() {
  const cookieStore = await getCookieStore();
  const { accessToken, refreshToken } = readAuthCookies(cookieStore);

  if (!accessToken && !refreshToken) {
    return unauthorizedResponse("NO_TOKENS", "Токены не найдены.");
  }

  if (accessToken) {
    const validation = await validateAccessToken(accessToken);

    if (validation.ok) {
      return authenticatedResponse(validation.user);
    }

    if (validation.status !== 401 || !refreshToken) {
      clearAuthCookies(cookieStore);
      return unauthorizedResponse(
        "ACCESS_TOKEN_INVALID",
        validation.message,
        validation.status >= 400 ? validation.status : 401,
      );
    }
  }

  if (!refreshToken) {
    clearAuthCookies(cookieStore);
    return unauthorizedResponse(
      "REFRESH_TOKEN_MISSING",
      "Refresh token отсутствует.",
    );
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
      return unauthorizedResponse(
        "REFRESH_FAILED",
        parseAuthServiceMessage(
          refreshResponse.payload,
          "Не удалось обновить токены.",
        ),
        refreshResponse.status >= 400 ? refreshResponse.status : 401,
      );
    }

    const tokens = extractAuthTokens(refreshResponse.payload);
    if (!tokens) {
      clearAuthCookies(cookieStore);
      return unauthorizedResponse(
        "REFRESH_INVALID_RESPONSE",
        "Auth service не вернул обновлённые токены.",
        502,
      );
    }

    setAuthCookies(cookieStore, tokens);

    const userFromRefresh = extractAuthUser(refreshResponse.payload);
    if (userFromRefresh) {
      return authenticatedResponse(userFromRefresh, true);
    }

    const refreshedValidation = await validateAccessToken(tokens.access_token);
    if (refreshedValidation.ok) {
      return authenticatedResponse(refreshedValidation.user, true);
    }

    return authenticatedResponse(null, true);
  } catch {
    clearAuthCookies(cookieStore);
    return unauthorizedResponse(
      "REFRESH_FAILED",
      "Не удалось связаться с auth service.",
      502,
    );
  }
}

