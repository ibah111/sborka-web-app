import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { axiosInstance } from "../../base-request";
import type { AxiosError } from "axios";

const ACCESS_TOKEN_COOKIE = "access_token";
const REFRESH_TOKEN_COOKIE = "refresh_token";

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 минут
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 дней

interface LoginTokens {
  access_token: string;
  refresh_token: string;
}

interface ValidateSuccessResponse {
  success: true;
  message: string;
  data: {
    user_id: number;
    email: string;
    jti?: string;
  };
}

interface CommonErrorResponse {
  success: false;
  message: {
    error: string;
    message: string;
    statusCode: number;
    timestamp: string;
    path: string;
  };
}

type ValidateResponse = ValidateSuccessResponse | CommonErrorResponse;

export async function GET() {
  const cookieStore = await cookies();

  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value ?? null;

  // Нет access токена
  if (!accessToken) {
    // Нет и refresh токена — не авторизован
    if (!refreshToken) {
      return NextResponse.json(
        { authenticated: false, reason: "NO_TOKENS" },
        { status: 401 },
      );
    }

    // Пытаемся обновить токены по refresh токену
    return await refreshTokensAndRespond(refreshToken, cookieStore);
  }

  // Есть access токен — валидируем
  try {
    const res = await axiosInstance.post<ValidateResponse>(
      "/api/v1/token/validate",
      null,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!res.data.success) {
      throw new Error("Token not valid");
    }

    return NextResponse.json(
      {
        authenticated: true,
        user: res.data.data,
      },
      { status: 200 },
    );
  } catch (err) {
    const error = err as AxiosError<CommonErrorResponse>;

    // Если access токен невалиден — пробуем обновить по refresh
    if (error.response?.status === 401 && refreshToken) {
      return await refreshTokensAndRespond(refreshToken, cookieStore);
    }

    // В остальных случаях — неавторизован
    return NextResponse.json(
      {
        authenticated: false,
        reason: "ACCESS_TOKEN_INVALID",
        error: error.response?.data?.message?.message ?? "Unauthorized",
      },
      { status: 401 },
    );
  }
}

async function refreshTokensAndRespond(
  refreshToken: string,
  cookieStore: Awaited<ReturnType<typeof cookies>>,
) {
  try {
    const res = await axiosInstance.post<{
      success: boolean;
      message: string;
      data: LoginTokens;
    }>("/api/v1/token/refresh", {
      refresh_token: refreshToken,
    });

    if (!res.data.success) {
      throw new Error("Failed to refresh tokens");
    }

    const { access_token, refresh_token } = res.data.data;

    // Обновляем куки с токенами
    cookieStore.set(ACCESS_TOKEN_COOKIE, access_token, {
      httpOnly: true,
      path: "/",
      maxAge: ACCESS_TOKEN_TTL_SECONDS,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    cookieStore.set(REFRESH_TOKEN_COOKIE, refresh_token, {
      httpOnly: true,
      path: "/",
      maxAge: REFRESH_TOKEN_TTL_SECONDS,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return NextResponse.json(
      {
        authenticated: true,
      },
      { status: 200 },
    );
  } catch (err) {
    const error = err as AxiosError<CommonErrorResponse>;

    // При ошибке обновления токенов — чистим куки и требуем логин
    cookieStore.delete(ACCESS_TOKEN_COOKIE);
    cookieStore.delete(REFRESH_TOKEN_COOKIE);

    return NextResponse.json(
      {
        authenticated: false,
        reason: "REFRESH_FAILED",
        error: error.response?.data?.message?.message ?? "Unauthorized",
      },
      { status: 401 },
    );
  }
}

