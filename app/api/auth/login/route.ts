import { NextRequest, NextResponse } from "next/server";
import { getCookieStore } from "@/app/lib/auth-service";
import type { AuthActionResponse, LoginRequestBody } from "@/app/lib/auth";
import {
  authServiceRequest,
  extractAuthTokens,
  extractAuthUser,
  hasServiceFailure,
  parseAuthServiceMessage,
  setAuthCookies,
} from "@/app/lib/auth-service";

function isValidLoginBody(body: unknown): body is LoginRequestBody {
  return (
    typeof body === "object" &&
    body !== null &&
    typeof (body as LoginRequestBody).email === "string" &&
    (body as LoginRequestBody).email.trim().length > 0 &&
    typeof (body as LoginRequestBody).password === "string" &&
    (body as LoginRequestBody).password.trim().length > 0
  );
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!isValidLoginBody(body)) {
    return NextResponse.json<AuthActionResponse>(
      {
        success: false,
        message: "Укажите email и password.",
      },
      { status: 400 },
    );
  }

  try {
    const response = await authServiceRequest("/api/v1/login", {
      method: "POST",
      body,
    });

    if (!response.ok || hasServiceFailure(response.payload)) {
      return NextResponse.json<AuthActionResponse>(
        {
          success: false,
          message: parseAuthServiceMessage(
            response.payload,
            "Не удалось выполнить вход.",
          ),
        },
        { status: response.status >= 400 ? response.status : 401 },
      );
    }

    const tokens = extractAuthTokens(response.payload);
    if (!tokens) {
      return NextResponse.json<AuthActionResponse>(
        {
          success: false,
          message: "Auth service не вернул access_token и refresh_token.",
        },
        { status: 502 },
      );
    }

    const cookieStore = await getCookieStore();
    setAuthCookies(cookieStore, tokens);

    return NextResponse.json<AuthActionResponse>({
      success: true,
      message: parseAuthServiceMessage(response.payload, "Вход выполнен."),
      user: extractAuthUser(response.payload),
    });
  } catch {
    return NextResponse.json<AuthActionResponse>(
      {
        success: false,
        message: "Не удалось связаться с auth service.",
      },
      { status: 502 },
    );
  }
}
